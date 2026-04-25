/**
 * 构件：第 15 关 WebSocket 迷宫模块
 * 作用：提供迷宫初始化、移动判定和通关反馈，并处理 WebSocket upgrade。
 * 数据结构：使用二维数组表示迷宫，WebSocket 连接对象保存当前游戏状态。
 * 控制：HTTP 路由由 Express 应用挂载，upgrade 处理器由协议服务创建模块调用。
 */
const express = require('express');
const { WebSocketServer } = require('ws');

const router = express.Router();
const challengeWss = new WebSocketServer({ noServer: true });

/**
 * 生成 perfect maze
 * 约定：
 * - 1 = 墙
 * - 0 = 路
 * - S = 起点
 * - E = 终点
 */
function generateMazeTree(rows, cols) {
  if (rows < 3 || cols < 3) {
    throw new Error('maze size must be >= 3x3');
  }

  if (rows % 2 === 0 || cols % 2 === 0) {
    throw new Error('maze rows and cols must be odd numbers');
  }

  const maze = Array.from({ length: rows }, () => Array(cols).fill(1));
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));

  const directions = [
    { dx: 0, dy: -2 },
    { dx: 0, dy: 2 },
    { dx: -2, dy: 0 },
    { dx: 2, dy: 0 },
  ];

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function inBounds(x, y) {
    return x > 0 && x < cols && y > 0 && y < rows;
  }

  function carve(x, y) {
    visited[y][x] = true;
    maze[y][x] = 0;

    const dirs = shuffle([...directions]);
    for (const { dx, dy } of dirs) {
      const nx = x + dx;
      const ny = y + dy;

      if (!inBounds(nx, ny)) continue;
      if (visited[ny][nx]) continue;

      const wallX = x + dx / 2;
      const wallY = y + dy / 2;

      maze[wallY][wallX] = 0;
      maze[ny][nx] = 0;

      carve(nx, ny);
    }
  }

  carve(1, 1);

  const startX = 0;
  const startY = 0;
  const endX = cols - 1;
  const endY = rows - 1;

  // 把起点和终点接入迷宫
  maze[0][1] = 0;
  maze[1][0] = 0;
  maze[rows - 1][cols - 2] = 0;
  maze[rows - 2][cols - 1] = 0;

  maze[startY][startX] = 'S';
  maze[endY][endX] = 'E';

  return maze;
}

function findStart(maze) {
  for (let y = 0; y < maze.length; y++) {
    for (let x = 0; x < maze[y].length; x++) {
      if (maze[y][x] === 'S') {
        return { x, y };
      }
    }
  }
  return { x: 0, y: 0 };
}

function isWall(maze, x, y) {
  const rows = maze.length;
  const cols = maze[0].length;

  if (x < 0 || x >= cols || y < 0 || y >= rows) {
    return true;
  }

  return maze[y][x] === 1;
}

function isWin(maze, x, y) {
  const rows = maze.length;
  const cols = maze[0].length;

  if (x < 0 || x >= cols || y < 0 || y >= rows) {
    return false;
  }

  return maze[y][x] === 'E';
}

function nextPosition(x, y, direction) {
  switch (direction) {
    case 'up':
      return { x, y: y - 1 };
    case 'down':
      return { x, y: y + 1 };
    case 'left':
      return { x: x - 1, y };
    case 'right':
      return { x: x + 1, y };
    default:
      return { x, y };
  }
}

function createGameState() {
  const rows = 5;
  const cols = 5;
  const maze = generateMazeTree(rows, cols);
  const start = findStart(maze);

  return {
    maze,
    rows,
    cols,
    x: start.x,
    y: start.y,
    finished: false,
    initialized: true,
  };
}

challengeWss.on('connection', (ws) => {
  ws.gameState = {
    maze: null,
    rows: 0,
    cols: 0,
    x: 0,
    y: 0,
    finished: false,
    initialized: false,
  };

  ws.send(
    JSON.stringify({
      message: "WebSocket connected. Please send { action: 'init' }",
    })
  );

  ws.on('message', (raw) => {
    let data;

    try {
      data = JSON.parse(raw.toString());
    } catch (_err) {
      ws.send(JSON.stringify({ error: 'invalid json' }));
      return;
    }

    // 1) 初始化
    if (data.action === 'init') {
      ws.gameState = createGameState();

      ws.send(
        JSON.stringify({
          x: ws.gameState.cols, // x 轴长度（宽）
          y: ws.gameState.rows, // y 轴长度（高）
        })
      );
      return;
    }

    // 2) 移动
    if (data.action !== 'move') {
      ws.send(JSON.stringify({ error: 'invalid action' }));
      return;
    }

    if (!ws.gameState.initialized || !ws.gameState.maze) {
      ws.send(JSON.stringify({ error: 'game not initialized' }));
      return;
    }

    const direction = data.direction;

    if (!['up', 'down', 'left', 'right'].includes(direction)) {
      ws.send(JSON.stringify({ error: 'invalid direction' }));
      return;
    }

    if (ws.gameState.finished) {
      ws.send(JSON.stringify({ wall: 0, win: true }));
      return;
    }

    const next = nextPosition(ws.gameState.x, ws.gameState.y, direction);

    if (isWall(ws.gameState.maze, next.x, next.y)) {
      ws.send(
        JSON.stringify({
          wall: 1,
          win: false,
        })
      );
      return;
    }

    ws.gameState.x = next.x;
    ws.gameState.y = next.y;

    const win = isWin(ws.gameState.maze, next.x, next.y);

    if (win) {
      ws.gameState.finished = true;
      // 到达终点后返回完整迷宫和下一关线索，然后关闭连接。
      ws.send(
        JSON.stringify({
          wall: 0,
          win: true,
          flag: '16-7kq2m9x4bz',
          maze: ws.gameState.maze,
        }),
        () => {
          ws.close(1000, 'game-finished');
        }
      );
      return;
    }

    ws.send(
      JSON.stringify({
        wall: 0,
        win: false,
      })
    );
  });
});

function handleUpgrade(req, socket, head, _logger = console) {
  // 只允许升级 /api/15/challenge，其余路径直接拒绝。
  const requestUrl = new URL(req.url, 'http://hello.world');
  if (requestUrl.pathname !== '/api/15/challenge') {
    socket.destroy();
    return;
  }

  challengeWss.handleUpgrade(req, socket, head, (ws) => {
    challengeWss.emit('connection', ws, req);
  });
}

function close(timeoutMs = 1000) {
  for (const client of challengeWss.clients) {
    if (
      client.readyState === client.OPEN ||
      client.readyState === client.CLOSING
    ) {
      client.close(1001, 'server-shutdown');
      setTimeout(() => {
        if (client.readyState !== client.CLOSED) {
          client.terminate();
        }
      }, timeoutMs).unref();
    }
  }

  return new Promise((resolve, reject) => {
    challengeWss.close((err) => {
      if (err) {
        reject(err);
        return;
      }

      resolve();
    });
  });
}

module.exports = {
  router,
  handleUpgrade,
  close,
};
