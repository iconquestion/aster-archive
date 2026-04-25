/**
 * 构件：运行配置模块
 * 作用：统一读取、校验并导出 Node 服务启动所需的环境配置。
 * 数据结构：使用 config 对象保存端口、来源、TLS 路径与日志轮转参数。
 * 控制：由入口模块和测试辅助逻辑调用，为应用装配与服务创建提供配置。
 */
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// 配置读取与校验。
// 仅处理环境变量和通用的路径存在性校验，不承担应用装配职责。
function requireEnv(name) {
  const value = process.env[name];

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

function requireIntegerEnv(name) {
  const value = requireEnv(name);
  if (!/^-?\d+$/.test(value)) {
    throw new Error(
      `Environment variable ${name} must be an integer, received: ${value}`
    );
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed)) {
    throw new Error(
      `Environment variable ${name} must be an integer, received: ${value}`
    );
  }

  return parsed;
}

function requireExistingPathEnv(name) {
  const value = requireEnv(name);

  if (!fs.existsSync(value)) {
    throw new Error(`Path configured by ${name} does not exist: ${value}`);
  }

  return value;
}

function requireExistingPath(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} does not exist: ${filePath}`);
  }

  return filePath;
}

function optionalEnv(name, defaultValue) {
  const value = process.env[name];

  if (typeof value !== 'string' || value.trim() === '') {
    return defaultValue;
  }

  return value.trim();
}

function optionalBooleanEnv(name, defaultValue) {
  const value = process.env[name];

  if (typeof value !== 'string' || value.trim() === '') {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  throw new Error(
    `Environment variable ${name} must be true or false, received: ${value}`
  );
}

function loadConfig() {
  // 统一从项目内的 config/.env 加载运行配置，避免入口与测试各自维护一套解析逻辑。
  const envPath = path.join(__dirname, '../config/.env');
  const envResult = dotenv.config({
    path: envPath,
    quiet: true,
  });

  if (envResult.error) {
    throw new Error(
      `Failed to load env file at ${envPath}: ${envResult.error.message}`
    );
  }

  const config = {
    envPath,
    httpPort: requireIntegerEnv('HTTP_PORT'),
    httpsPort: requireIntegerEnv('HTTPS_PORT'),
    http2Port: requireIntegerEnv('HTTP2_PORT'),
    appOrigin: requireEnv('APP_ORIGIN'),
    tlsKeyPath: requireExistingPathEnv('TLS_KEY_PATH'),
    tlsCertPath: requireExistingPathEnv('TLS_CERT_PATH'),
    http2TargetPath: '/api/21',
    logsDir: path.join(__dirname, '../logs'),
    logRotateDatePattern: optionalEnv('LOG_ROTATE_DATE_PATTERN', 'YYYY-MM-DD'),
    logRotateMaxFiles: optionalEnv('LOG_ROTATE_MAX_FILES', '14d'),
    logRotateMaxSize: optionalEnv('LOG_ROTATE_MAX_SIZE', '20m'),
    logRotateZippedArchive: optionalBooleanEnv(
      'LOG_ROTATE_ZIPPED_ARCHIVE',
      true
    ),
  };

  return config;
}

module.exports = {
  loadConfig,
  requireEnv,
  requireIntegerEnv,
  requireExistingPathEnv,
  requireExistingPath,
  optionalEnv,
  optionalBooleanEnv,
};
