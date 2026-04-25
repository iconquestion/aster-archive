/**
 * 构件：Node 进程入口模块
 * 作用：串联配置、日志、Express 应用和协议服务，并注册优雅退出处理。
 * 数据结构：维护关闭流程中的停止状态、退出码与 shutdown Promise。
 * 控制：由 Node 直接执行或测试调用，负责启动与停止整个服务进程。
 */
const { loadConfig } = require('./config');
const { createLogger } = require('./logger');
const { createApp } = require('./app');
const { createServers } = require('./createServers');

// 进程入口只负责装配配置、应用和 server，再交给 server 层启动监听。
function main({
  processRef = process,
  exit = (code) => processRef.exit(code),
} = {}) {
  const config = loadConfig();
  const logger = createLogger({
    logsDir: config.logsDir,
    logRotateDatePattern: config.logRotateDatePattern,
    logRotateMaxFiles: config.logRotateMaxFiles,
    logRotateMaxSize: config.logRotateMaxSize,
    logRotateZippedArchive: config.logRotateZippedArchive,
  });
  const { app, level15 } = createApp({
    appOrigin: config.appOrigin,
    logger,
  });
  const servers = createServers({
    app,
    level15,
    config,
    logger,
  });

  registerShutdownHandlers({
    logger,
    servers,
    processRef,
    exit,
  });

  servers.start();

  return {
    config,
    logger,
    servers,
  };
}

function registerShutdownHandlers({
  logger,
  servers,
  processRef = process,
  exit = (code) => processRef.exit(code),
}) {
  let isStopping = false;
  let exitCode = 0;
  let shutdownPromise = null;

  async function shutdown(reason, requestedExitCode) {
    if (requestedExitCode !== 0) {
      exitCode = 1;
    }

    if (isStopping) {
      return shutdownPromise;
    }

    isStopping = true;
    logger.info(`received ${reason}, starting graceful shutdown`);

    shutdownPromise = Promise.resolve()
      .then(() => {
        return servers.stop();
      })
      .then(() => {
        logger.info('graceful shutdown completed');
      })
      .catch((err) => {
        exitCode = 1;
        logger.error(`graceful shutdown failed: ${err.stack || err}`);
      })
      .finally(() => {
        exit(exitCode);
      });

    return shutdownPromise;
  }

  processRef.on('SIGINT', () => {
    void shutdown('SIGINT', 0);
  });

  processRef.on('SIGTERM', () => {
    void shutdown('SIGTERM', 0);
  });

  processRef.on('uncaughtException', (err) => {
    logger.error(`uncaughtException: ${err.stack || err}`);
    void shutdown('uncaughtException', 1);
  });

  processRef.on('unhandledRejection', (reason) => {
    logger.error(
      `unhandledRejection: ${reason && reason.stack ? reason.stack : reason}`
    );
    void shutdown('unhandledRejection', 1);
  });

  return {
    shutdown,
  };
}

if (require.main === module) {
  main();
}

module.exports = {
  main,
  registerShutdownHandlers,
};
