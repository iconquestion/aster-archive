const express = require('express');

const router = express.Router();

// 05关（GET）：给出默认阻止提示。
router.get('/', (req, res) => {
  res
    .status(400)
    .json({ message: 'YOU SHALL NOT PASS!!!\n门似乎并不是很想让你过去。' });
});

// 05关（POST）：返回下一关密码线索。
router.post('/', (req, res) => {
  res.json({
    message: 'Welcome back, my master. \nThe password is 06-m4v7q2c9ta.',
  });
});

module.exports = router;
