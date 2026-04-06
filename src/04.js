const express = require('express');

const router = express.Router();

// 04关：返回下一关线索 Header。
router.get('/', (req, res) => {
  res.setHeader('X-Archive-Next', '05-x1p8z3n6kf');
  res.json({ message: 'hello, world!' });
});

module.exports = router;
