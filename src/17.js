const express = require('express');

const router = express.Router();

// 17关：使用 chunked 响应输出正文，并把下一关线索藏在 Trailer 头里。
router.get('/', (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Trailer', 'X-Never-Be-Apart');
  res.setHeader('Transfer-Encoding', 'chunked');

  res.write('{"message":"');
  res.write('在这个世界上，有些东西是无法用言语表达的。');
  res.write('就像这封信一样，它承载着无尽的情感和回忆......"}');

  res.addTrailers({
    'X-Never-Be-Apart': 'the-end-is-not-the-end...my-dear-18-p3t7w0j6kd...',
  });

  res.end();
});

module.exports = router;
