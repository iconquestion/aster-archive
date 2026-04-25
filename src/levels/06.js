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
  res.json({
    message:
      level == 'manager'
        ? 'Welcome, manager! Your office is located at No.07-z9k3d6w1rx, 7th floor.'
        : 'Welcome to Aster Archive. Hope you have a great day!',
  });
});

module.exports = router;
