const express = require("express");
const http = require("http");
const https = require("https");
const http2 = require("http2");
const path = require("path");
const fs = require("fs");
const winston = require("winston");
const cookieParser = require("cookie-parser");
const serveIndex = require("serve-index");
const dotenv = require("dotenv");

// Aster Archive 服务主入口。
// 该文件负责加载运行配置，并启动 HTTP、HTTPS 与独立 HTTP/2 服务。
// 某些依赖特殊协议能力的关卡也在此处统一接入。

// 配置加载与校验
// 启动时严格读取并校验关键环境变量。
// 任何必填配置缺失、格式错误或路径不存在时，都应立即终止启动，避免服务在错误配置下继续运行。
const envPath = path.join(__dirname, "../config/.env");
const envResult = dotenv.config({ path: envPath });

if (envResult.error) {
    throw new Error(`Failed to load env file at ${envPath}: ${envResult.error.message}`);
}

// 读取必填字符串配置；缺失或空值时直接抛错。
function requireEnv(name) {
    const value = process.env[name];

    if (typeof value !== "string" || value.trim() === "") {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value.trim();
}

// 读取必填整数配置；仅接受可解析的整数值。
function requireIntegerEnv(name) {
    const value = requireEnv(name);
    const parsed = Number.parseInt(value, 10);

    if (!Number.isInteger(parsed)) {
        throw new Error(`Environment variable ${name} must be an integer, received: ${value}`);
    }

    return parsed;
}

// 读取必填路径配置；要求路径在启动时已存在。
function requireExistingPathEnv(name) {
    const value = requireEnv(name);

    if (!fs.existsSync(value)) {
        throw new Error(`Path configured by ${name} does not exist: ${value}`);
    }

    return value;
}

// 服务实例初始化
// 普通 HTTP/HTTPS 请求复用同一个 Express 应用。
// HTTP/2 相关玩法需要更细粒度地控制底层响应行为，因此单独创建独立服务。
const app = express();

const HTTP_PORT = requireIntegerEnv("HTTP_PORT");
const HTTPS_PORT = requireIntegerEnv("HTTPS_PORT");
const HTTP2_PORT = requireIntegerEnv("HTTP2_PORT");
const APP_ORIGIN = requireEnv("APP_ORIGIN");
const TLS_KEY_PATH = requireExistingPathEnv("TLS_KEY_PATH");
const TLS_CERT_PATH = requireExistingPathEnv("TLS_CERT_PATH");
const LEVEL08_DIR = requireExistingPathEnv("LEVEL08_DIR");
const BOOTSTRAP_DIST_DIR = requireExistingPathEnv("BOOTSTRAP_DIST_DIR");
const HTTP2_TARGET_PATH = "/api/21";
const HTTP2_ANALYTICS_FILE_PATH = path.join(__dirname, "../public/js/21.analytics.js");

if (!fs.existsSync(HTTP2_ANALYTICS_FILE_PATH)) {
    throw new Error(`Required HTTP/2 analytics file does not exist: ${HTTP2_ANALYTICS_FILE_PATH}`);
}

// TLS 配置在启动阶段同步读取。
// 如果证书文件不可用，应在服务监听前直接失败，而不是带着不完整状态继续运行。
const tlsOptions = {
    key: fs.readFileSync(TLS_KEY_PATH),
    cert: fs.readFileSync(TLS_CERT_PATH)
};
const http2AnalyticsFile = fs.readFileSync(HTTP2_ANALYTICS_FILE_PATH);

const http_server = http.createServer(app);
const https_server = https.createServer(tlsOptions, app);

const http2_server = http2.createSecureServer({
    ...tlsOptions,
    allowHTTP1: false
});

// 日志初始化
// 运行日志与错误日志分别落盘，便于排查线上问题；同时保留控制台输出，方便开发与部署时观察启动状态。
const logsDir = path.join(__dirname, "../logs");
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const logFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
        return `${timestamp} [${level}] ${stack || message}`;
    })
);

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

function safeStreamRespond(stream, headers, body) {
    if (stream.destroyed || stream.closed) {
        return false;
    }

    stream.respond(headers);
    stream.end(body);
    return true;
}

// 基础中间件
// 统一处理表单、JSON、Cookie，以及站点级别的跨域响应头。
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// 当前仅对配置中允许的来源返回 CORS 许可。
// 对预检请求直接返回 204，避免进入后续业务逻辑。
app.use((req, res, next) => {
    const origin = req.headers.origin;

    if (origin === APP_ORIGIN) {
        res.setHeader("Access-Control-Allow-Origin", origin);
    }

    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");

    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }

    next();
});

// 静态资源与特殊目录
// `public/` 提供站点页面与公共资源。
// 其中 08 关依赖目录索引展示，因此单独挂载 `serve-index`。
app.use(express.static(path.join(__dirname, "../public")));

app.use(
    "/08-c2x8m5q9nv/",
    serveIndex(LEVEL08_DIR, {
        icons: true,
        view: "details"
    })
);

// Bootstrap 资源通过固定前缀映射，避免页面直接引用磁盘路径。
app.use(
    "/bootstrap/",
    express.static(
        BOOTSTRAP_DIST_DIR,
        {
            fallthrough: false
        }
    )
);

// 健康检查接口
// 供部署层或巡检脚本确认服务进程是否正常响应。
app.get("/api/status", (_req, res) => {
    res.status(200).json({ message: "ok" });
});

// 普通关卡路由
// 大多数关卡通过常规 Express Router 接入；依赖特殊协议特性的关卡会在后续单独处理。
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

// WebSocket 关卡接入
// 15 关同时包含普通 HTTP 路由与升级请求处理逻辑。
const level15 = require("./15");
app.use("/api/15", level15.router);

// Express 只负责常规路由，WebSocket upgrade 事件需由底层 HTTP 服务显式转发。
http_server.on("upgrade", (req, socket, head) => {
    level15.handleUpgrade(req, socket, head, logger);
});

// HTTP/2 关卡处理
// 21 关依赖独立 HTTP/2 行为与 103 Early Hints，因此不走普通 Express 路由。
http2_server.on("stream", (stream, headers) => {
    try {
        const method = headers[http2.constants.HTTP2_HEADER_METHOD];
        const requestPath = headers[http2.constants.HTTP2_HEADER_PATH];
        // const authority = headers[http2.constants.HTTP2_HEADER_AUTHORITY];

        // 仅处理 21 关本体与其依赖的脚本资源。
        if (requestPath !== HTTP2_TARGET_PATH && requestPath !== "/api/analytics.js") {
            const body = JSON.stringify({ error: "not found" });
            safeStreamRespond(stream, {
                [http2.constants.HTTP2_HEADER_STATUS]: 404,
                "content-type": "application/json; charset=utf-8",
                "content-length": Buffer.byteLength(body)
            }, body);
            return;
        }

        // 当前仅允许 GET，请求方法不匹配时直接返回 405。
        if (method !== "GET") {
            const body = JSON.stringify({ error: "method not allowed" });
            safeStreamRespond(stream, {
                [http2.constants.HTTP2_HEADER_STATUS]: 405,
                "content-type": "application/json; charset=utf-8",
                "content-length": Buffer.byteLength(body)
            }, body);
            return;
        }

        if (requestPath === HTTP2_TARGET_PATH) {
            // 主关卡响应：先发送 103 Early Hints，再在随机延迟后返回正式结果。
            if (!stream.destroyed && !stream.closed) {
                stream.additionalHeaders({
                    [http2.constants.HTTP2_HEADER_STATUS]: 103,
                    link: "<analytics.js>; rel=preload; as=script"
                });
            }

            const randTime = Math.floor(Math.random() * 2000);
            setTimeout(() => {
                const body = JSON.stringify({
                    message: "你终于跑完了一圈！用时:" + randTime + "ms"
                });

                safeStreamRespond(stream, {
                    [http2.constants.HTTP2_HEADER_STATUS]: 200,
                    "content-type": "application/json; charset=utf-8",
                    "content-length": Buffer.byteLength(body),
                    "Access-Control-Allow-Origin": APP_ORIGIN,
                    "Access-Control-Allow-Methods": "GET",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With"
                }, body);

            }, randTime);
        } else {
            // 为 HTTP/2 关卡提供配套脚本资源。
            safeStreamRespond(stream, {
                [http2.constants.HTTP2_HEADER_STATUS]: 200,
                "content-type": "application/javascript; charset=utf-8",
                "content-length": Buffer.byteLength(http2AnalyticsFile),
            }, http2AnalyticsFile);
        }

    } catch (err) {
        // HTTP/2 流级别异常统一记录并返回 500，避免单个请求异常影响调试。
        logger.error(`http2 stream handler error: ${err.stack || err}`);

        const body = JSON.stringify({ error: "internal server error" });

        safeStreamRespond(stream, {
            [http2.constants.HTTP2_HEADER_STATUS]: 500,
            "content-type": "application/json; charset=utf-8",
            "content-length": Buffer.byteLength(body)
        }, body);
    }
});

// Express 全局错误处理
// 统一记录未捕获的路由异常，并向客户端返回通用错误响应。
app.use((err, _req, res, _next) => {
    logger.error(err.stack || err);
    res.status(500).json({ error: "internal server error" });
});

// 服务级与进程级异常监听
// 这些监听主要用于记录运行期异常，帮助定位网络层、协议层或未处理 Promise 等问题。
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

// 服务启动
// HTTP 主要供本机回源或代理层使用；HTTPS 与独立 HTTP/2 服务用于承载需要特殊协议能力的关卡。
http_server.listen(HTTP_PORT, () => {
    logger.info(`Server is running at http://localhost:${HTTP_PORT}`);
});

https_server.listen(HTTPS_PORT, () => {
    logger.info(`Server is running at https://localhost:${HTTPS_PORT}`);
});

http2_server.listen(HTTP2_PORT, () => {
    logger.info(`HTTP/2 server is running at https://localhost:${HTTP2_PORT}${HTTP2_TARGET_PATH}`);
});
