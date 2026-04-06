const fs = require("fs");
const path = require("path");
const winston = require("winston");

// 日志初始化收口到独立模块，便于入口与测试复用同一套 logger 配置。
function createLogger(logsDir) {
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

    return winston.createLogger({
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
}

module.exports = {
    createLogger,
};
