/**
 * 构件：第 18 关 Range 分段读取路由
 * 作用：限制单次 Range 读取范围，引导玩家分段拼接完整文本线索。
 * 数据结构：使用 FULL_TEXT 字符串保存完整内容，MAX_RANGE_SIZE 控制分段宽度。
 * 控制：由 Express 应用装配模块挂载到 /api/18。
 */
const express = require('express');
const router = express.Router();

// 信息全文，包含 flag
const FULL_TEXT =
  'Iamalonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglongbreaddonoteat19-h9m4q2z8xcpleasepleasepleasepleasepleaseplease';

// 一次性请求的最大 range 宽度
const MAX_RANGE_SIZE = 16;

router.get('/', (req, res) => {
  const total = FULL_TEXT.length;
  res.set('Accept-Ranges', 'bytes');

  const range = req.headers.range;
  if (!range) {
    return res.status(200).json({
      message: "What's the dog doing? :P",
    });
  }

  const match = range.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) {
    return res.status(416).json({
      message: 'Invalid range format',
    });
  }

  const [, startStr, endStr] = match;

  if (startStr === '' && endStr === '') {
    return res.status(416).json({
      message: 'Invalid range format',
    });
  }

  // 禁止 suffix range / open-ended range
  if (startStr === '' || endStr === '') {
    return res.status(416).json({
      message: 'Too greedy...',
    });
  }

  let start = parseInt(startStr, 10);
  let end = parseInt(endStr, 10);

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end < start ||
    start >= total
  ) {
    return res.status(416).json({
      message: 'Requested Range Not Satisfiable',
    });
  }

  end = Math.min(end, total - 1);

  const length = end - start + 1;
  if (length > MAX_RANGE_SIZE) {
    return res.status(416).json({
      message: `Range too large. Max ${MAX_RANGE_SIZE} chars.`,
    });
  }

  const chunk = FULL_TEXT.substring(start, end + 1);

  res.set('Content-Range', `bytes ${start}-${end}/${total}`);
  res.set('Content-Type', 'application/json; charset=utf-8');
  res.set('X-Puzzle-Range-Format', 'json');

  return res.status(206).json({
    message: chunk,
  });
});

module.exports = router;
