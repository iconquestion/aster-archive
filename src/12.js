const express = require('express');
const fs = require('fs');
const path = require('path');
const cookieParser = require('cookie-parser');

const router = express.Router();
const COOKIE_NAME = 'bibilabu';

router.use(cookieParser());

function getDailyPw() {
  const dailyPasswordFilePath = path.join(
    __dirname,
    '../public/12-d1q7m4z8pv/password.xdxdxdxd'
  );
  return fs.readFileSync(dailyPasswordFilePath, 'utf8').trim();
}

// 12关登录：校验用户名和当日密码，成功后设置授权 Cookie。
router.post('/login', (req, res) => {
  const username = req.body?.username;
  const password = req.body?.password;

  if (!username || !password) {
    return res.status(400).json({
      message: '缺少用户名或密码',
    });
  }

  if (username !== 'admin') {
    return res.status(401).json({
      message: '用户不存在',
    });
  }

  if (Number(password) !== Number(getDailyPw())) {
    return res.status(401).json({
      message: '密码错误',
    });
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 1);
  expiresAt.setHours(0, 0, 0, 0);

  res.cookie(COOKIE_NAME, password, {
    httpOnly: true,
    path: '/api/12/get_room_info',
    expires: expiresAt,
  });

  return res.json({
    message: '登录成功',
  });
});

// 12关房间信息：校验 room_id 与 Cookie 后返回下一关编号。
router.get('/get_room_info', (req, res) => {
  const cookieValue = req.cookies[COOKIE_NAME];
  const roomId = req.query?.room_id;

  if (Number(roomId) !== 13) {
    return res.json({
      message: '无此房间对应的信息，请重试',
    });
  }

  if (!cookieValue || Number(cookieValue) !== Number(getDailyPw())) {
    return res.status(401).json({
      message: '未授权的访问',
    });
  }

  return res.json({
    message: '13-k9c3x6n2tw',
  });
});

module.exports = router;
