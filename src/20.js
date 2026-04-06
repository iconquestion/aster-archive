const express = require('express');

const router = express.Router();

const CORRECT_FLAG = 't8d0v9c2c4';

// 20关：实现类似猜密码的反馈机制，返回猜测中完全匹配和部分匹配的字符数量。
function countMatches(guess, target) {
  const exactIndices = new Set();
  let exact = 0;

  for (let i = 0; i < Math.min(guess.length, target.length); i += 1) {
    if (guess[i] === target[i]) {
      exact += 1;
      exactIndices.add(i);
    }
  }

  const guessFreq = new Map();
  const targetFreq = new Map();

  for (let i = 0; i < guess.length; i += 1) {
    if (!exactIndices.has(i)) {
      const ch = guess[i];
      guessFreq.set(ch, (guessFreq.get(ch) || 0) + 1);
    }
  }

  for (let i = 0; i < target.length; i += 1) {
    if (!exactIndices.has(i)) {
      const ch = target[i];
      targetFreq.set(ch, (targetFreq.get(ch) || 0) + 1);
    }
  }

  let partial = 0;
  for (const [ch, count] of guessFreq.entries()) {
    partial += Math.min(count, targetFreq.get(ch) || 0);
  }

  return { exact, partial };
}

// 20关提交：接收 guess 参数，猜中后直接返回结果，否则仅反馈接近程度。
router.post('/', (req, res) => {
  const guess = String(req.body?.guess || '').trim();
  if (!guess) {
    return res.status(400).json({
      message: '请输入要猜测的 flag。',
    });
  }

  const { exact, partial } = countMatches(guess, CORRECT_FLAG);

  if (exact === CORRECT_FLAG.length && guess.length === CORRECT_FLAG.length) {
    return res.json({
      message: `猜对了！下一关是 ${CORRECT_FLAG}`,
      exact,
      partial,
      isCorrect: true,
    });
  }

  return res.json({
    message: `完全正确 ${exact} 个，大致正确 ${partial} 个。`,
    exact,
    partial,
    isCorrect: false,
  });
});

module.exports = router;
