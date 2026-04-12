const express = require('express');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');

const router = express.Router();
const COOKIE_NAME = 'bibilabu';
const DEFAULT_SECRET = 'level-12-daily-password-v1';
const DEFAULT_TIME_ZONE = 'Asia/Shanghai';
const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: DEFAULT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

let cachedDateKey = '';
let cachedPassword = '';

router.use(cookieParser());

function getDateKey(now = new Date()) {
  return dateFormatter.format(now);
}

function buildLevel12DailyPassword(dateKey) {
  const digest = crypto
    .createHash('sha256')
    .update(`${DEFAULT_SECRET}:${dateKey}`)
    .digest();
  const passwordNumber = digest.readUInt32BE(0) % 10000;

  return String(passwordNumber).padStart(4, '0');
}

function getLevel12DailyPassword({ now = new Date() } = {}) {
  const dateKey = getDateKey(now);

  if (dateKey !== cachedDateKey) {
    cachedDateKey = dateKey;
    cachedPassword = buildLevel12DailyPassword(dateKey);
  }

  return cachedPassword;
}

function isFourDigitPassword(value) {
  return /^\d{4}$/.test(value);
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

  if (
    !isFourDigitPassword(password) ||
    password !== getLevel12DailyPassword()
  ) {
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

  if (
    !isFourDigitPassword(cookieValue) ||
    cookieValue !== getLevel12DailyPassword()
  ) {
    return res.status(401).json({
      message: '未授权的访问',
    });
  }

  return res.json({
    message: '13-k9c3x6n2tw',
  });
});

module.exports = router;
module.exports.getLevel12DailyPassword = getLevel12DailyPassword;
