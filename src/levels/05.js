/**
 * 构件：第 05 关 HTTP 方法路由
 * 作用：区分 GET 与 POST 行为，引导玩家使用正确请求方法获取线索。
 * 数据结构：无持久状态。
 * 控制：由 Express 应用装配模块挂载到 /api/05。
 */
const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.set('Allow', 'POST, OPTIONS').status(405).json({
    message: '门纹丝不动。',
  });
});

router.post('/', (req, res) => {
  res.json({
    message: '门打开了。门的背后贴着一张字条：06-m4v7q2c9ta',
  });
});

module.exports = router;
