const express = require("express");
const http = require("http");
const https = require("https");
const http2 = require("http2");
const path = require("path");
const fs = require("fs");
const winston = require("winston");
const cookieParser = require("cookie-parser");
const serveIndex = require("serve-index");

const app = express();

const HTTP_PORT = 8080;
const HTTPS_PORT = 8443;
const HTTP2_PORT = 9443;

const tlsOptions = {
    key: fs.readFileSync("/etc/letsencrypt/live/iconquestion.com/privkey.pem"),
    cert: fs.readFileSync("/etc/letsencrypt/live/iconquestion.com/fullchain.pem")
};

const http_server = http.createServer(app);
const https_server = https.createServer(tlsOptions, app);

// 独立的 HTTP/2 服务，不使用 express
const http2_server = http2.createSecureServer({
    ...tlsOptions,
    allowHTTP1: false
});

// 创建必要目录
const logsDir = path.join(__dirname, "../logs");
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// 创建 Winston 日志格式
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
        return `${timestamp} [${level}] ${stack || message}`;
    })
);

// 创建 Winston logger
const logger = winston.createLogger({
    level: "info",
    format: logFormat,
    transports: [
        new winston.transports.File({
            filename: path.join(logsDir, "info.log"),
            level: "info",
            format: winston.format((info) => {
                return info.level === "info" ? info : false;
            })(),
        }),
        new winston.transports.File({
            filename: path.join(logsDir, "error.log"),
            level: "error",
        }),
        new winston.transports.Console(),
    ],
});

// 添加基础中间件
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
    const origin = req.headers.origin;

    if (origin === "https://www.iconquestion.com") {
        res.setHeader("Access-Control-Allow-Origin", origin);
    }

    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");

    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }

    next();
});

// 静态页面支持
app.use(express.static(path.join(__dirname, "../public")));

const dir = "/var/www/www.iconquestion.com/public/08-c2x8m5q9nv";
app.use(
    "/08-c2x8m5q9nv/",
    serveIndex(dir, {
        icons: true,
        view: "details"
    })
);

app.use(
    "/bootstrap/",
    express.static(
        "/var/www/www.iconquestion.com/node_modules/bootstrap/dist",
        {
            fallthrough: false
        }
    )
);

// 健康检测
app.get("/api/status", (req, res) => {
    res.status(200).json({ message: "ok" });
});

// 每一关的路由
app.use("/api/04", require("./04"));
app.use("/api/05", require("./05"));
app.use("/api/06", require("./06"));
app.use("/api/07", require("./07"));
app.use("/api/12", require("./12"));
app.use("/api/14", require("./14"));
app.use("/api/16", require("./16"));
app.use("/api/17", require("./17"));
app.use("/api/18", require("./18"));
app.use("/api/20", require("./20"));
app.use("/api/22", require("./22"));

// 15 导出 { router, handleUpgrade }
const level15 = require("./15");
app.use("/api/15", level15.router);

// WebSocket upgrade 转发给 15 关
http_server.on("upgrade", (req, socket, head) => {
    level15.handleUpgrade(req, socket, head, logger);
});

// 独立 HTTP/2 服务逻辑（9443）
// 只处理 GET /api/21
http2_server.on("stream", (stream, headers) => {
    try {
        const method = headers[http2.constants.HTTP2_HEADER_METHOD];
        const requestPath = headers[http2.constants.HTTP2_HEADER_PATH];
        // const authority = headers[http2.constants.HTTP2_HEADER_AUTHORITY];

        // only allow 21
        if (requestPath !== "/api/21" && requestPath !== "/api/analytics.js") {
            const body = JSON.stringify({ error: "not found" });

            stream.respond({
                [http2.constants.HTTP2_HEADER_STATUS]: 404,
                "content-type": "application/json; charset=utf-8",
                "content-length": Buffer.byteLength(body)
            });
            stream.end(body);
            return;
        }

        // only allow GET
        if (method !== "GET") {
            const body = JSON.stringify({ error: "method not allowed" });

            stream.respond({
                [http2.constants.HTTP2_HEADER_STATUS]: 405,
                "content-type": "application/json; charset=utf-8",
                "content-length": Buffer.byteLength(body)
            });
            stream.end(body);
            return;
        }

        // ok. let's handle 21
        if (requestPath === "/api/21") {
            // serve 21's response with 103 early hints
            // add 103 early hints header
            stream.additionalHeaders({
                [http2.constants.HTTP2_HEADER_STATUS]: 103,
                link: "<analytics.js>; rel=preload; as=script"
            });

            // simulate a random delay between 0-2 seconds
            const rand_time = Math.floor(Math.random() * 2000);
            setTimeout(() => {
                const body = JSON.stringify({
                    message: "你终于跑完了一圈！用时:" + rand_time + "ms"
                });

                stream.respond({
                    [http2.constants.HTTP2_HEADER_STATUS]: 200,
                    "content-type": "application/json; charset=utf-8",
                    "content-length": Buffer.byteLength(body),
                    "Access-Control-Allow-Origin": "https://www.iconquestion.com",
                    "Access-Control-Allow-Methods": "GET",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With"
                });
                stream.end(body);

            }, rand_time);
        } else {
            // serve analytics.js
            const filePath = path.join(__dirname, "../public/js/21.analytics.js");
            const fileContent = fs.readFileSync(filePath);

            stream.respond({
                [http2.constants.HTTP2_HEADER_STATUS]: 200,
                "content-type": "application/javascript; charset=utf-8",
                "content-length": Buffer.byteLength(fileContent),
            });
            stream.end(fileContent);
        }

    } catch (err) {
        logger.error(`http2 stream handler error: ${err.stack || err}`);

        const body = JSON.stringify({ error: "internal server error" });

        stream.respond({
            [http2.constants.HTTP2_HEADER_STATUS]: 500,
            "content-type": "application/json; charset=utf-8",
            "content-length": Buffer.byteLength(body)
        });
        stream.end(body);
    }
});

// 错误处理
app.use((err, req, res, next) => {
    logger.error(err);
    res.status(500).json({ error: "internal server error" });
});

https_server.on("error", (err) => {
    logger.error(`https_server error: ${err.stack || err}`);
});

http_server.on("error", (err) => {
    logger.error(`http_server error: ${err.stack || err}`);
});

http2_server.on("error", (err) => {
    logger.error(`http2_server error: ${err.stack || err}`);
});

http2_server.on("sessionError", (err) => {
    logger.error(`http2 sessionError: ${err.stack || err}`);
});

http2_server.on("unknownProtocol", (socket) => {
    logger.error("http2 unknownProtocol");
    socket.destroy();
});

process.on("uncaughtException", (err) => {
    logger.error(`uncaughtException: ${err.stack || err}`);
});

process.on("unhandledRejection", (reason) => {
    logger.error(`unhandledRejection: ${reason && reason.stack ? reason.stack : reason}`);
});

// 服务监听
http_server.listen(HTTP_PORT, () => {
    logger.info(`Server is running at http://localhost:${HTTP_PORT}`);
});

https_server.listen(HTTPS_PORT, () => {
    logger.info(`Server is running at https://localhost:${HTTPS_PORT}`);
});

http2_server.listen(HTTP2_PORT, () => {
    logger.info(`HTTP/2 server is running at https://localhost:${HTTP2_PORT}${HTTP2_TARGET_PATH}`);
});
