const { loadConfig } = require('../../src/config');
const { createApp } = require('../../src/app');
const { createServers } = require('../../src/createServers');
const { getLevel12DailyPassword } = require('../../src/12');

let cachedRuntime = null;

// 测试环境使用静默 logger，避免断言输出被运行日志淹没。
function createSilentLogger() {
  return {
    info() {},
    error() {},
    warn() {},
    debug() {},
  };
}

// 复用一份测试运行时配置，避免每个测试文件重复加载 .env。
function getTestRuntime() {
  if (cachedRuntime) {
    return cachedRuntime;
  }

  const config = loadConfig();

  cachedRuntime = {
    config,
    logger: createSilentLogger(),
  };

  return cachedRuntime;
}

// 统一创建测试用 Express app，避免每个用例重复装配配置与 logger。
function createTestApp() {
  const { config, logger } = getTestRuntime();
  const { app } = createApp({
    appOrigin: config.appOrigin,
    logger,
  });

  return app;
}

// 协议类测试需要真实 server 才能覆盖 WebSocket upgrade、HTTPS trailer、HTTP/2 等行为。
async function createStartedTestServers() {
  const { config, logger } = getTestRuntime();
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

  const httpPort = await listenOnRandomPort(servers.httpServer);
  const httpsPort = await listenOnRandomPort(servers.httpsServer);
  const http2Port = await listenOnRandomPort(servers.http2Server);

  return {
    app,
    config,
    logger,
    servers,
    httpPort,
    httpsPort,
    http2Port,
    close: async () => {
      await servers.stop();
    },
  };
}

function getDailyPassword() {
  return getLevel12DailyPassword();
}

// 统一绑定到随机本地端口，避免测试之间争抢固定端口。
function listenOnRandomPort(server) {
  return new Promise((resolve, reject) => {
    const onError = (err) => {
      server.off('listening', onListening);
      reject(err);
    };
    const onListening = () => {
      server.off('error', onError);
      const address = server.address();
      resolve(address.port);
    };

    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(0, '127.0.0.1');
  });
}

module.exports = {
  createTestApp,
  createStartedTestServers,
  getDailyPassword,
  getTestRuntime,
};
