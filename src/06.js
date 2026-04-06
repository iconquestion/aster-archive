const express = require('express');

const router = express.Router();

// 06关：通过查询参数 level 区分身份并返回提示。
router.get('/', (req, res) => {
  const { level } = req.query;
  res.json({
    message:
      level == 'admin'
        ? 'Your identity: admin. \nYour office is located at No.z9k3d6w1rx, 7th floor.'
        : 'Your identity: guest. \nWelcome to visit here. Hope you have a great day!',
  });
});

module.exports = router;
