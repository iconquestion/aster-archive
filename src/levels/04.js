/**
 * 构件：第 04 关 Header 线索路由
 * 作用：返回基础响应，并通过自定义响应头提供下一关入口线索。
 * 数据结构：无持久状态。
 * 控制：由 Express 应用装配模块挂载到 /api/04。
 */
const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.setHeader('X-Archive-Next', '05-x1p8z3n6kf');
  res.json({
    message: '万事万物徒有其表，终将归于虚无。若不得看透本质，则永无解脱之时。',
  });
});

module.exports = router;
