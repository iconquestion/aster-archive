/**
 * 构件：Express 应用装配模块
 * 作用：装配通用中间件、静态资源、普通 API 路由与全局错误处理。
 * 数据结构：无持久状态；返回 Express app 与第 15 关 WebSocket 控制对象。
 * 控制：由入口模块创建，并被 server 创建模块挂载到 HTTP/HTTPS 服务。
 */
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const serveIndex = require('serve-index');
const { requireExistingPath } = require('./config');

// Express 应用装配。
// 这里只负责中间件、静态资源和常规路由，不直接启动监听端口。
function createApp({ appOrigin, logger }) {
  const app = express();
  // 这些资源路径是项目实现的一部分，不属于外部环境配置。
  const level08Dir = requireExistingPath(
    path.join(__dirname, '../public/08-c2x8m5q9nv'),
    'Level 08 directory'
  );
  const bootstrapDir = requireExistingPath(
    path.join(__dirname, '../node_modules/bootstrap'),
    'Bootstrap directory'
  );

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(cookieParser());

  // 统一处理全站 CORS 与预检请求，避免每个关卡路由重复声明。
  app.use((req, res, next) => {
    const origin = req.headers.origin;

    if (origin === appOrigin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With'
    );

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    next();
  });

  app.use(express.static(path.join(__dirname, '../public')));

  // 08 关需要目录索引展示，因此在静态资源之外额外挂载 serve-index。
  app.use(
    '/08-c2x8m5q9nv/',
    serveIndex(level08Dir, {
      icons: true,
      view: 'details',
    })
  );

  app.use(
    '/bootstrap/',
    express.static(bootstrapDir, {
      fallthrough: false,
    })
  );

  app.get('/api/status', (_req, res) => {
    res.status(200).json({ message: 'ok' });
  });

  app.use('/api/04', require('./levels/04'));
  app.use('/api/05', require('./levels/05'));
  app.use('/api/06', require('./levels/06'));
  app.use('/api/07', require('./levels/07'));
  app.use('/api/12', require('./levels/12'));
  app.use('/api/14', require('./levels/14'));
  app.use('/api/16', require('./levels/16'));
  app.use('/api/17', require('./levels/17'));
  app.use('/api/18', require('./levels/18'));
  app.use('/api/20', require('./levels/20'));
  app.use('/api/22', require('./levels/22'));
  app.use('/api/25', require('./levels/25'));
  app.use('/api/26', require('./levels/26'));

  // 15 关同时依赖普通 HTTP 路由和后续 server 层的 WebSocket upgrade。
  const level15 = require('./levels/15');
  app.use('/api/15', level15.router);

  // 全局错误处理放在应用装配末尾，兜底记录未捕获的路由异常。
  app.use((err, _req, res, _next) => {
    logger.error(err.stack || err);
    res.status(500).json({ error: 'internal server error' });
  });

  return {
    app,
    level15,
  };
}

module.exports = {
  createApp,
};
