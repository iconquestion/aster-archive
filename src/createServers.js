/**
 * 构件：协议服务创建模块
 * 作用：创建并管理 HTTP、HTTPS 与独立 HTTP/2 服务。
 * 数据结构：维护 HTTP/2 session 集合，用于关闭服务时释放连接。
 * 控制：由入口模块调用，接收 Express app、关卡控制对象、配置和日志器。
 */
const fs = require('fs');
const http = require('http');
const https = require('https');
const http2 = require('http2');
const path = require('path');
const { requireExistingPath } = require('./config');

// server 层通用的 HTTP/2 安全响应封装，避免对已关闭 stream 重复写入。
function safeStreamRespond(stream, headers, body) {
  if (stream.destroyed || stream.closed) {
    return false;
  }

  stream.respond(headers);
  stream.end(body);
  return true;
}

// 创建 HTTP、HTTPS 与独立 HTTP/2 服务。
// 这里负责协议层能力和监听控制，不负责 Express 应用本身的路由定义。
function createServers({ app, level15, config, logger }) {
  // HTTP/2 关卡依赖单独的脚本资源和 TLS 配置，启动前即完成校验与读取。
  const http2AnalyticsFilePath = requireExistingPath(
    path.join(__dirname, '../public/js/21.analytics.js'),
    'HTTP/2 analytics file'
  );
  const tlsOptions = {
    key: fs.readFileSync(config.tlsKeyPath),
    cert: fs.readFileSync(config.tlsCertPath),
  };
  const http2AnalyticsFile = fs.readFileSync(http2AnalyticsFilePath);

  const httpServer = http.createServer(app);
  const httpsServer = https.createServer(tlsOptions, app);
  const http2Server = http2.createSecureServer({
    ...tlsOptions,
    allowHTTP1: false,
  });
  const http2Sessions = new Set();

  http2Server.on('session', (session) => {
    http2Sessions.add(session);
    session.on('close', () => {
      http2Sessions.delete(session);
    });
  });

  // WebSocket upgrade 不经过 Express 路由栈，需要在底层 server 显式转发。
  httpServer.on('upgrade', (req, socket, head) => {
    level15.handleUpgrade(req, socket, head, logger);
  });

  // 21 关依赖独立 HTTP/2 行为与 103 Early Hints，因此单独在 stream 层处理。
  http2Server.on('stream', (stream, headers) => {
    try {
      const method = headers[http2.constants.HTTP2_HEADER_METHOD];
      const requestPath = headers[http2.constants.HTTP2_HEADER_PATH];

      if (
        requestPath !== config.http2TargetPath &&
        requestPath !== '/api/analytics.js'
      ) {
        const body = JSON.stringify({ error: 'not found' });
        safeStreamRespond(
          stream,
          {
            [http2.constants.HTTP2_HEADER_STATUS]: 404,
            'content-type': 'application/json; charset=utf-8',
            'content-length': Buffer.byteLength(body),
          },
          body
        );
        return;
      }

      if (method !== 'GET') {
        const body = JSON.stringify({ error: 'method not allowed' });
        safeStreamRespond(
          stream,
          {
            [http2.constants.HTTP2_HEADER_STATUS]: 405,
            'content-type': 'application/json; charset=utf-8',
            'content-length': Buffer.byteLength(body),
          },
          body
        );
        return;
      }

      if (requestPath === config.http2TargetPath) {
        if (!stream.destroyed && !stream.closed) {
          stream.additionalHeaders({
            [http2.constants.HTTP2_HEADER_STATUS]: 103,
            link: '<analytics.js>; rel=preload; as=script',
          });
        }

        const randTime = Math.floor(Math.random() * 2000);
        setTimeout(() => {
          const body = JSON.stringify({
            message: '你终于跑完了一圈！用时:' + randTime + 'ms',
          });

          safeStreamRespond(
            stream,
            {
              [http2.constants.HTTP2_HEADER_STATUS]: 200,
              'content-type': 'application/json; charset=utf-8',
              'content-length': Buffer.byteLength(body),
              'Access-Control-Allow-Origin': config.appOrigin,
              'Access-Control-Allow-Methods': 'GET',
              'Access-Control-Allow-Headers':
                'Content-Type, Authorization, X-Requested-With',
            },
            body
          );
        }, randTime);
      } else {
        safeStreamRespond(
          stream,
          {
            [http2.constants.HTTP2_HEADER_STATUS]: 200,
            'content-type': 'application/javascript; charset=utf-8',
            'content-length': Buffer.byteLength(http2AnalyticsFile),
          },
          http2AnalyticsFile
        );
      }
    } catch (err) {
      logger.error(`http2 stream handler error: ${err.stack || err}`);

      const body = JSON.stringify({ error: 'internal server error' });

      safeStreamRespond(
        stream,
        {
          [http2.constants.HTTP2_HEADER_STATUS]: 500,
          'content-type': 'application/json; charset=utf-8',
          'content-length': Buffer.byteLength(body),
        },
        body
      );
    }
  });

  httpsServer.on('error', (err) => {
    logger.error(`https_server error: ${err.stack || err}`);
  });

  httpServer.on('error', (err) => {
    logger.error(`http_server error: ${err.stack || err}`);
  });

  http2Server.on('error', (err) => {
    logger.error(`http2_server error: ${err.stack || err}`);
  });

  http2Server.on('sessionError', (err) => {
    logger.error(`http2 sessionError: ${err.stack || err}`);
  });

  http2Server.on('unknownProtocol', (socket) => {
    logger.error('http2 unknownProtocol');
    socket.destroy();
  });

  function start() {
    // 各协议分别监听，便于后续测试按需选择启动或关闭。
    httpServer.listen(config.httpPort, () => {
      logger.info(`Server is running at http://localhost:${config.httpPort}`);
    });

    httpsServer.listen(config.httpsPort, () => {
      logger.info(`Server is running at https://localhost:${config.httpsPort}`);
    });

    http2Server.listen(config.http2Port, () => {
      logger.info(
        `HTTP/2 server is running at https://localhost:${config.http2Port}${config.http2TargetPath}`
      );
    });
  }

  async function stop() {
    await Promise.all([
      closeHttpServer(httpServer),
      closeHttpServer(httpsServer),
      closeHttp2Server(http2Server, http2Sessions),
      level15.close(),
    ]);
  }

  return {
    httpServer,
    httpsServer,
    http2Server,
    start,
    stop,
  };
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    if (!server.listening) {
      resolve();
      return;
    }

    server.close((err) => {
      if (err) {
        reject(err);
        return;
      }

      resolve();
    });
  });
}

async function closeHttpServer(server) {
  await closeServer(server);

  if (typeof server.closeIdleConnections === 'function') {
    server.closeIdleConnections();
  }

  if (typeof server.closeAllConnections === 'function') {
    server.closeAllConnections();
  }
}

async function closeHttp2Server(server, sessions) {
  for (const session of sessions) {
    session.close();
    setTimeout(() => {
      if (!session.closed && !session.destroyed) {
        session.destroy();
      }
    }, 1000).unref();
  }

  await closeServer(server);
}

module.exports = {
  createServers,
  closeServer,
};
