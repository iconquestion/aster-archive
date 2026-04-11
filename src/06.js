const express = require('express');

const router = express.Router();

// 06关：通过查询参数 level 区分身份并返回提示。
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
