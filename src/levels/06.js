/**
 * 构件：第 06 关查询参数路由
 * 作用：根据查询参数中的身份信息返回普通提示或下一关线索。
 * 数据结构：无持久状态。
 * 控制：由 Express 应用装配模块挂载到 /api/06。
 */
const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  const { level } = req.query;
  let message = '';
  switch (level) {
    case 'manager':
      message =
        'Welcome, manager! Your ID card is ready. Staff guide: 07-z9k3d6w1rx.';
      break;
    case 'staff':
      message = 'Welcome joining Aster Archive! Hope you have a great day!';
      break;
    case 'visitor':
      message = 'Welcome visiting Aster Archive! Please enjoy your tour!';
      break;
    default:
      message = 'Welcome...?';
  }
  res.json({
    message: message,
  });
});

module.exports = router;
