/**
 * 构件：第 20 关猜测反馈路由
 * 作用：对玩家提交的 guess 返回完全匹配和部分匹配数量，猜中后给出线索。
 * 数据结构：使用 Set 记录完全匹配位置，使用 Map 统计剩余字符频次。
 * 控制：由 Express 应用装配模块挂载到 /api/20。
 */
const express = require('express');

const router = express.Router();

const CORRECT_FLAG = 't8d0v9c2c4';

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
