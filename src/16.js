const express = require('express');

const router = express.Router();

function isHttp3(req) {
  return req.get('X-Forwarded-Http3') === 'h3';
}

// 16关：根据查询参数 timepoint 判断是否来到未来，并借助请求头模拟 HTTP/3 场景返回下一关线索。
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

  const h3 = isHttp3(req);
  res.json({
    message:
      'Welcome to 2077 Cyberpunk! 17-c8v1n5r2ya 由于HTTP/3支持原因 未找到合适的solution 本关日后将重新设计 您可以跳过',
  });
});

module.exports = router;
