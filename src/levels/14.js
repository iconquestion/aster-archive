/**
 * 构件：第 14 关 Basic Auth 路由
 * 作用：通过伪装认证提示引导玩家使用 Basic Auth，并校验管理员凭据。
 * 数据结构：无持久状态；使用请求 Authorization 头解析临时凭据。
 * 控制：由 Express 应用装配模块挂载到 /api/14。
 */
const express = require('express');

const router = express.Router();

function attachAuthChallenge(res) {
  res.setHeader('W3-xxthxxtixxtx', '13xxix xxxlx="zako zako"');
}

router.post('/login', (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    attachAuthChallenge(res);
    // 故意返回此提示，以避免用户直接猜出W3认证方法，但同时提醒用户并非凭据本身有误
    return res.status(401).json({
      message: '缺少用户名或密码',
    });
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString(
    'utf-8'
  );
  const [username, password] = credentials.split(':');

  if (!username || !password) {
    attachAuthChallenge(res);
    return res.status(401).json({
      message: '缺少用户名或密码',
    });
  }

  if (username !== 'admin') {
    attachAuthChallenge(res);
    return res.status(401).json({
      message: '用户不存在',
    });
  }

  if (password !== username) {
    attachAuthChallenge(res);
    return res.status(401).json({
      message: '密码与用户名不匹配',
    });
  }

  return res.json({
    message: 'Welcome, admin! The password for the next room is 15-x2m9k4c6ra.',
  });
});

module.exports = router;
