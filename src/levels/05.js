/**
 * 构件：第 05 关 HTTP 方法路由
 * 作用：区分 GET 与 POST 行为，引导玩家使用正确请求方法获取线索。
 * 数据结构：无持久状态。
 * 控制：由 Express 应用装配模块挂载到 /api/05。
 */
const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res
    .status(400)
    .json({ message: 'YOU SHALL NOT PASS!!!\n门似乎并不是很想让你过去。' });
});

router.post('/', (req, res) => {
  res.json({
    message: 'Welcome back, my master. \nThe password is 06-m4v7q2c9ta.',
  });
});

module.exports = router;
