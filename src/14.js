const express = require('express');

const router = express.Router();

function attachAuthChallenge(res) {
  res.setHeader('W3-xxthxxtixxtx', '13xxix xxxlx="zako zako"');
}

// 14关：通过伪装后的认证头暗示 Basic Auth，只有用户名和密码都为 admin 才会返回下一关密码。
// 14关登录：使用 Basic Auth，要求用户名与密码均为 admin。
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
