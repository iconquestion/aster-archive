/**
 * 构件：第 16 关请求来源路由
 * 作用：读取 Referer URL 中的年份并返回对应的展台反馈。
 * 数据结构：无持久状态。
 * 控制：由 Express 应用装配模块挂载到 /api/16。
 */
const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.set('Cache-Control', 'no-store');

  const source = URL.parse(req.get('Referer') ?? '');
  const years = source?.searchParams.getAll('timepoint') ?? [];
  if (
    !source ||
    !['http:', 'https:'].includes(source.protocol) ||
    years.length !== 1 ||
    !/^[0-9]{4}$/.test(years[0])
  ) {
    return res.status(400).json({
      message: 'I cannot understand.',
    });
  }

  const year = Number(years[0]);
  if (year < 2077) {
    return res.json({ message: `你好，来自${years[0]}的原始人...` });
  }
  if (year > 2077) {
    return res.json({ message: '太过超前，无法查看' });
  }

  return res.json({ message: 'Welcome to 2077 Cyberpunk! 17-c8v1n5r2ya' });
});

module.exports = router;
