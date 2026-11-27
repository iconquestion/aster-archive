/**
 * 构件：第 15 关 WebSocket 迷宫模块
 * 作用：提供迷宫初始化、移动判定和通关反馈，并处理 WebSocket upgrade。
 * 数据结构：使用二维数组表示迷宫，WebSocket 连接对象保存当前游戏状态。
 * 控制：HTTP 路由由 Express 应用挂载，upgrade 处理器由协议服务创建模块调用。
 */
const { randomBytes } = require('node:crypto');
const express = require('express');
const { WebSocketServer } = require('ws');

const router = express.Router();
const challengeWss = new WebSocketServer({ noServer: true, maxPayload: 4096 });

const STAGE_SIZES = [7, 13, 20];
const NEXT_LEVEL_FLAG = '16-7kq2m9x4bz';
const START = { x: 1, y: 1 };
const DIRECTIONS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};
const STEPS = Object.values(DIRECTIONS);

// 用随机深度优先搜索连接内部房间，保留最外围的一圈墙。
function generateMaze(size) {
  const rooms = [];
  for (let coordinate = 1; coordinate < size - 1; coordinate += 2) {
    rooms.push(coordinate);
  }
  // 偶数尺寸把最后一间房挪到墙圈内侧，由相邻走廊补齐空出的格子。
  rooms[rooms.length - 1] = size - 2;

  const maze = Array.from({ length: size }, () => Array(size).fill(1));
  const stack = [{ col: 0, row: 0 }];
  maze[START.y][START.x] = 0;

  while (stack.length > 0) {
    const { col, row } = stack.at(-1);
    const available = STEPS.filter(
      ({ dx, dy }) => maze[rooms[row + dy]]?.[rooms[col + dx]] === 1
    );
    if (available.length === 0) {
      stack.pop();
      continue;
    }

    const { dx, dy } = available[Math.floor(Math.random() * available.length)];
    const next = { col: col + dx, row: row + dy };
    const nextX = rooms[next.col];
    const nextY = rooms[next.row];
    for (let x = rooms[col], y = rooms[row]; x !== nextX || y !== nextY; ) {
      x += dx;
      y += dy;
      maze[y][x] = 0;
    }
    stack.push(next);
  }

  maze[START.y][START.x] = 'S';
  maze[size - 2][size - 2] = 'E';
  return maze;
}

function createStage(index) {
  return {
    index,
    maze: generateMaze(STAGE_SIZES[index]),
    location: START,
    flag: null,
  };
}

function playerView({ maze, location }) {
  const { x, y } = location;
  return {
    current_location: location,
    view: maze.slice(y - 1, y + 2).map((row) => row.slice(x - 1, x + 2)),
  };
}

function isLastStage(game) {
  return game.index === STAGE_SIZES.length - 1;
}

function completion(game) {
  return {
    win: true,
    complete: isLastStage(game),
    flag: game.flag,
    maze: game.maze,
  };
}

function stageSnapshot(game) {
  const size = game.maze.length;
  return {
    x: size,
    y: size,
    stage: game.index + 1,
    stage_count: STAGE_SIZES.length,
    ...playerView(game),
    ...(game.flag ? completion(game) : {}),
  };
}

challengeWss.on('connection', (ws) => {
  let game;
  let alive = true;
  const send = (data, callback) => ws.send(JSON.stringify(data), callback);
  const fail = (error) => send({ error });

  ws.on('pong', () => {
    alive = true;
  });
  const heartbeat = setInterval(() => {
    if (ws.readyState !== ws.OPEN) return;
    if (!alive) {
      ws.terminate();
      return;
    }
    alive = false;
    ws.ping();
  }, 25_000).unref();
  ws.once('close', () => clearInterval(heartbeat));

  send({ message: "WebSocket connected. Please send { action: 'init' }" });

  ws.on('message', (raw) => {
    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      fail('invalid json');
      return;
    }

    if (game?.flag && isLastStage(game)) return;
    const action = data?.action;
    if (action === 'init') {
      game ??= createStage(0);
      send(stageSnapshot(game));
      return;
    }

    if (action !== 'move' && action !== 'next') {
      fail('invalid action');
      return;
    }

    if (!game) {
      fail('game not initialized');
      return;
    }

    if (action === 'next') {
      if (!game.flag) {
        fail('stage not completed');
      } else if (data.flag !== game.flag) {
        fail('invalid stage flag');
      } else {
        game = createStage(game.index + 1);
        send(stageSnapshot(game));
      }
      return;
    }

    if (game.flag) {
      fail('stage completed');
      return;
    }

    const direction = data.direction;
    if (
      typeof direction !== 'string' ||
      !Object.hasOwn(DIRECTIONS, direction)
    ) {
      fail('invalid direction');
      return;
    }

    const { dx, dy } = DIRECTIONS[direction];
    const next = { x: game.location.x + dx, y: game.location.y + dy };
    const cell = game.maze[next.y][next.x];
    const success = cell !== 1;
    if (success) game.location = next;
    const win = cell === 'E';
    const result = { success, wall: success ? 0 : 1, win, ...playerView(game) };

    if (!win) {
      send(result);
      return;
    }

    const complete = isLastStage(game);
    game.flag = complete
      ? NEXT_LEVEL_FLAG
      : '15-' + randomBytes(5).toString('hex');
    send(
      { ...result, ...completion(game) },
      complete ? () => ws.close(1000, 'game-finished') : undefined
    );
  });
});

function handleUpgrade(req, socket, head, logger = console) {
  // 只允许升级 /api/15/challenge，其余路径直接拒绝。
  const requestUrl = new URL(req.url, 'http://hello.world');
  if (requestUrl.pathname !== '/api/15/challenge') {
    socket.destroy();
    return;
  }

  challengeWss.handleUpgrade(req, socket, head, (ws) => {
    ws.on('error', (err) =>
      logger.debug?.('Level 15 WebSocket: ' + err.message)
    );
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
