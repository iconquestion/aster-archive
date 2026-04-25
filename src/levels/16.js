/**
 * 构件：第 16 关 HTTP/3 模拟路由
 * 作用：根据时间点参数和转发头模拟未来协议场景并返回线索。
 * 数据结构：无持久状态；使用请求头和查询参数作为判定输入。
 * 控制：由 Express 应用装配模块挂载到 /api/16。
 */
const express = require('express');

const router = express.Router();

function isHttp3(req) {
  return req.get('X-Forwarded-Http3') === 'h3';
}

router.get('/', (req, res) => {
  res.header('X-Forwarded-Http3', isHttp3(req));

  const timepoint = Number(req.query.timepoint);
  if (timepoint === undefined || timepoint === null || isNaN(timepoint)) {
    return res.status(400).json({
      message: 'I cannot understand.',
    });
  }

  const currentYear = new Date().getFullYear();
  if (timepoint <= currentYear) {
    return res.json({
      message: '在遥远的过去...',
    });
  }

  res.json({
    message:
      'Welcome to 2077 Cyberpunk! 17-c8v1n5r2ya 由于HTTP/3支持原因 未找到合适的solution 本关日后将重新设计 您可以跳过',
  });
});

module.exports = router;
