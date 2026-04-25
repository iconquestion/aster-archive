/**
 * 构件：日志创建模块
 * 作用：创建统一的 Winston logger，支持控制台输出与按日期轮转文件。
 * 数据结构：使用 Winston transport 集合描述 info/error 日志输出目标。
 * 控制：由入口模块调用，生成的 logger 被应用层和服务层共享。
 */
const fs = require('fs');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

// 日志初始化收口到独立模块，便于入口与测试复用同一套 logger 配置。
function createLogger({
  logsDir,
  logRotateDatePattern = 'YYYY-MM-DD',
  logRotateMaxFiles = '14d',
  logRotateMaxSize = '20m',
  logRotateZippedArchive = true,
}) {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
      return `${timestamp} [${level}] ${stack || message}`;
    })
  );

  return winston.createLogger({
    level: 'info',
    format: logFormat,
    transports: [
      new DailyRotateFile({
        dirname: logsDir,
        filename: 'info-%DATE%.log',
        level: 'info',
        datePattern: logRotateDatePattern,
        maxFiles: logRotateMaxFiles,
        maxSize: logRotateMaxSize,
        zippedArchive: logRotateZippedArchive,
        format: winston.format((info) => {
          return info.level === 'info' ? info : false;
        })(),
      }),
      new DailyRotateFile({
        dirname: logsDir,
        filename: 'error-%DATE%.log',
        level: 'error',
        datePattern: logRotateDatePattern,
        maxFiles: logRotateMaxFiles,
        maxSize: logRotateMaxSize,
        zippedArchive: logRotateZippedArchive,
      }),
      new winston.transports.Console(),
    ],
  });
}

module.exports = {
  createLogger,
};
