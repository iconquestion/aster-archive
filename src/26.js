const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const BOARD_SIZE = 10;
const SESSION_COOKIE_NAME = 'relay_pipe_sid';
const STORAGE_DIR = path.join('/tmp', 'iconquestion-level26-sessions');
const NEXT_LEVEL_FLAG = '27-q8v6j6d6d4';

const PIPE_TYPES = ['straight', 'elbow', 'tee'];
const ROTATIONS = [0, 90, 180, 270];

const DIRECTION_OFFSETS = {
  up: { dx: 0, dy: -1, opposite: 'down' },
  right: { dx: 1, dy: 0, opposite: 'left' },
  down: { dx: 0, dy: 1, opposite: 'up' },
  left: { dx: -1, dy: 0, opposite: 'right' },
};

const PIPE_OPENINGS = {
  straight: {
    0: ['left', 'right'],
    90: ['up', 'down'],
    180: ['left', 'right'],
    270: ['up', 'down'],
  },
  elbow: {
    0: ['up', 'right'],
    90: ['right', 'down'],
    180: ['down', 'left'],
    270: ['left', 'up'],
  },
  tee: {
    0: ['up', 'right', 'down'],
    90: ['right', 'down', 'left'],
    180: ['down', 'left', 'up'],
    270: ['left', 'up', 'right'],
  },
};

const PIPE_BY_SIGNATURE = {
  'left,right': { pipeType: 'straight', rotation: 0 },
  'down,up': { pipeType: 'straight', rotation: 90 },
  'right,up': { pipeType: 'elbow', rotation: 0 },
  'down,right': { pipeType: 'elbow', rotation: 90 },
  'down,left': { pipeType: 'elbow', rotation: 180 },
  'left,up': { pipeType: 'elbow', rotation: 270 },
  'down,right,up': { pipeType: 'tee', rotation: 0 },
  'down,left,right': { pipeType: 'tee', rotation: 90 },
  'down,left,up': { pipeType: 'tee', rotation: 180 },
  'left,right,up': { pipeType: 'tee', rotation: 270 },
};

// 会话 id 只接受 32 位十六进制字符串，避免把任意 cookie 内容拼进文件路径。
function sanitizeSessionId(sessionId) {
  return /^[a-f0-9]{32}$/.test(sessionId) ? sessionId : null;
}

// 随机选出若干个不重复元素。这里通过原地洗牌副本再切片实现。
function sampleDistinct(items, count) {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = crypto.randomInt(index + 1);
    const temp = next[index];
    next[index] = next[swapIndex];
    next[swapIndex] = temp;
  }

  return next.slice(0, count);
}

// 棋盘底层始终是完整的二维数组；空格统一表示为 { tileType: 'empty' }。
function createEmptyGrid() {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => ({ tileType: 'empty' }))
  );
}

// 写操作前先深拷贝 cells，避免直接修改旧状态对象。
function cloneGrid(cells) {
  return cells.map((row) => row.map((tile) => ({ ...tile })));
}

// 把坐标转成 Set / Map 友好的字符串键。
function keyOf(x, y) {
  return `${x},${y}`;
}

// 解析并校验单个坐标。接口只接受 0-9 的整数。
function parseCoordinate(value) {
  if (!/^\d+$/.test(String(value))) {
    return null;
  }

  const coordinate = Number(value);

  if (
    !Number.isInteger(coordinate) ||
    coordinate < 0 ||
    coordinate >= BOARD_SIZE
  ) {
    return null;
  }

  return coordinate;
}

// 校验请求体里的 pipeType 是否属于本关允许的三种水管。
function isValidPipeType(pipeType) {
  return PIPE_TYPES.includes(pipeType);
}

// 校验旋转角是否是 0/90/180/270 之一。
function isValidRotation(rotation) {
  return Number.isInteger(rotation) && ROTATIONS.includes(rotation);
}

// 生成一条只沿横竖方向移动的离散路径，包含起点和终点。
function buildPath(from, to) {
  if (
    !from ||
    !to ||
    !Number.isInteger(from.x) ||
    !Number.isInteger(from.y) ||
    !Number.isInteger(to.x) ||
    !Number.isInteger(to.y)
  ) {
    throw new Error(
      `Invalid path endpoints: from=${JSON.stringify(from)} to=${JSON.stringify(to)}`
    );
  }

  const points = [];
  let currentX = from.x;
  let currentY = from.y;

  points.push({ x: currentX, y: currentY });

  while (currentX !== to.x) {
    currentX += Math.sign(to.x - currentX);
    points.push({ x: currentX, y: currentY });
  }

  while (currentY !== to.y) {
    currentY += Math.sign(to.y - currentY);
    points.push({ x: currentX, y: currentY });
  }

  return points;
}

// 把一段路径上的所有格子标记为“已占用”。
function markPath(occupied, path) {
  for (const point of path) {
    occupied.add(keyOf(point.x, point.y));
  }
}

// 查看某个格子四周哪些方向存在相邻路径格，用于把路径形状反推为具体水管。
function getPipeDirections(occupiedSet, x, y) {
  const directions = [];

  for (const [direction, offset] of Object.entries(DIRECTION_OFFSETS)) {
    const nextX = x + offset.dx;
    const nextY = y + offset.dy;

    if (nextX < 0 || nextX >= BOARD_SIZE || nextY < 0 || nextY >= BOARD_SIZE) {
      continue;
    }

    if (occupiedSet.has(keyOf(nextX, nextY))) {
      directions.push(direction);
    }
  }

  return directions.sort();
}

// 把方向组合映射回水管类型与旋转角。
function pipeFromDirections(directions) {
  return PIPE_BY_SIGNATURE[[...directions].sort().join(',')] || null;
}

// 查询某个水管在指定旋转下朝哪些方向开口。
function getPipeOpenings(pipeType, rotation) {
  return PIPE_OPENINGS[pipeType]?.[rotation] || [];
}

// 生成一张保证 source 能连到三个 target 的“完整答案图”。
// 本函数只负责构造答案，不负责抠图、库存和障碍格。
function createSolution() {
  const source = {
    x: 1,
    y: 2 + crypto.randomInt(6),
  };

  const topChoices = [];
  const bottomChoices = [];

  for (let y = 1; y <= 8; y += 1) {
    if (y < source.y) {
      topChoices.push(y);
    }
    if (y > source.y) {
      bottomChoices.push(y);
    }
  }

  const targetRows = [
    topChoices[crypto.randomInt(topChoices.length)],
    bottomChoices[crypto.randomInt(bottomChoices.length)],
  ];

  const remainingRows = [];
  for (let y = 1; y <= 8; y += 1) {
    if (y !== source.y && !targetRows.includes(y)) {
      remainingRows.push(y);
    }
  }
  targetRows.push(remainingRows[crypto.randomInt(remainingRows.length)]);
  targetRows.sort((a, b) => a - b);

  const targets = targetRows.map((y) => ({ x: 8, y }));

  // 这里必须保证右侧候选列至少有 3 个，否则 splitXs 长度不足，
  // 后续 buildPath 会收到 undefined 坐标，导致死循环与 OOM。
  // trunkX=3 => 候选 [4,5,6,7]
  // trunkX=4 => 候选 [5,6,7]
  // trunkX=5 => 候选仅 [6,7]，不足 3 个，因此不能取。
  const trunkX = 3 + crypto.randomInt(2);

  const splitCandidates = Array.from(
    { length: 7 - trunkX },
    (_, index) => trunkX + 1 + index
  );

  const splitXs = sampleDistinct(splitCandidates, 3).sort((a, b) => a - b);

  if (splitXs.length !== 3) {
    throw new Error(
      `Invalid split column generation: trunkX=${trunkX}, splitCandidates=${JSON.stringify(
        splitCandidates
      )}, splitXs=${JSON.stringify(splitXs)}`
    );
  }

  const occupied = new Set();
  markPath(occupied, buildPath(source, { x: trunkX, y: source.y }));

  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index];
    const splitX = splitXs[index];

    markPath(
      occupied,
      buildPath({ x: trunkX, y: source.y }, { x: splitX, y: source.y })
    );
    markPath(
      occupied,
      buildPath({ x: splitX, y: source.y }, { x: splitX, y: target.y })
    );
    markPath(occupied, buildPath({ x: splitX, y: target.y }, target));
  }

  const solutionPipes = [];

  for (const key of occupied) {
    const [x, y] = key.split(',').map(Number);

    if (x === source.x && y === source.y) {
      continue;
    }

    if (targets.some((target) => target.x === x && target.y === y)) {
      continue;
    }

    const pipe = pipeFromDirections(getPipeDirections(occupied, x, y));

    if (!pipe) {
      continue;
    }

    solutionPipes.push({
      x,
      y,
      tileType: 'pipe',
      pipeType: pipe.pipeType,
      rotation: pipe.rotation,
    });
  }

  return {
    source,
    targets,
    solutionPipes,
  };
}

// 把棋盘格转换为“连通判定视角”的开口信息。
// source 和 target 不是 pipe，但在通关判定里也要视作具有固定朝向的端点。
function getOpenings(tile) {
  if (!tile) {
    return [];
  }

  if (tile.tileType === 'source') {
    return ['right'];
  }

  if (tile.tileType === 'target') {
    return ['left'];
  }

  if (tile.tileType !== 'pipe') {
    return [];
  }

  return getPipeOpenings(tile.pipeType, tile.rotation);
}

// 边界判断，避免走出 10x10 棋盘。
function isInsideBoard(x, y) {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

// 从 source 出发做一次 BFS。
// 只有当前格朝向能出去，且相邻格朝向也能接回来，才算真正连通。
function isSolved(cells, source, targets) {
  const queue = [{ x: source.x, y: source.y }];
  const visited = new Set([keyOf(source.x, source.y)]);

  while (queue.length > 0) {
    const current = queue.shift();
    const openings = getOpenings(cells[current.y][current.x]);

    for (const direction of openings) {
      const offset = DIRECTION_OFFSETS[direction];
      const nextX = current.x + offset.dx;
      const nextY = current.y + offset.dy;

      if (!isInsideBoard(nextX, nextY)) {
        continue;
      }

      const nextTile = cells[nextY][nextX];
      const nextOpenings = getOpenings(nextTile);

      if (!nextOpenings.includes(offset.opposite)) {
        continue;
      }

      const key = keyOf(nextX, nextY);
      if (visited.has(key)) {
        continue;
      }

      visited.add(key);
      queue.push({ x: nextX, y: nextY });
    }
  }

  return targets.every((target) => visited.has(keyOf(target.x, target.y)));
}

// 生成玩家初始局面：
// 1. 先拿到完整答案图
// 2. 挖掉一部分答案管道作为玩家库存
// 3. 留下的答案管道标记为 locked
// 4. 再随机放一些 blocker
function createSessionState() {
  const { source, targets, solutionPipes } = createSolution();

  const cells = createEmptyGrid();
  cells[source.y][source.x] = { tileType: 'source' };

  for (const target of targets) {
    cells[target.y][target.x] = { tileType: 'target' };
  }

  const removalCount = Math.max(1, Math.floor(solutionPipes.length * 0.4));
  const missingSolutionPipes = sampleDistinct(
    solutionPipes,
    Math.min(removalCount, solutionPipes.length)
  );
  const missingKeys = new Set(
    missingSolutionPipes.map((pipe) => keyOf(pipe.x, pipe.y))
  );

  const inventory = {
    straight: 0,
    elbow: 0,
    tee: 0,
  };

  for (const pipe of missingSolutionPipes) {
    inventory[pipe.pipeType] += 1;
  }

  for (const pipe of solutionPipes) {
    if (missingKeys.has(keyOf(pipe.x, pipe.y))) {
      continue;
    }

    cells[pipe.y][pipe.x] = {
      ...pipe,
      locked: true,
    };
  }

  const occupiedKeys = new Set([
    keyOf(source.x, source.y),
    ...targets.map((target) => keyOf(target.x, target.y)),
    ...solutionPipes.map((pipe) => keyOf(pipe.x, pipe.y)),
  ]);

  const blockerCandidates = [];

  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      if (occupiedKeys.has(keyOf(x, y))) {
        continue;
      }

      blockerCandidates.push({ x, y });
    }
  }

  const blockers = sampleDistinct(blockerCandidates, 10);
  for (const blocker of blockers) {
    cells[blocker.y][blocker.x] = { tileType: 'blocker' };
  }

  const solved = isSolved(cells, source, targets);

  return {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    source,
    targets,
    cells,
    inventory,
    solved,
  };
}

// 当前会话状态本身已经足够小，直接按运行时结构落盘即可。
// 这样读写时不需要维护两套数据模型。
// 读取原始 JSON；任何读文件或 JSON 解析失败都视为“无有效存档”。
function readState(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_err) {
    return null;
  }
}

// 持久化当前状态到会话文件。
function writeState(filePath, state) {
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf8');
}

// 读取已有会话；没有的话就创建新会话和初始棋盘。
function loadSession({ req, res, storageDir }) {
  const sessionId = sanitizeSessionId(req.cookies?.[SESSION_COOKIE_NAME]);

  if (sessionId) {
    const filePath = path.join(storageDir, `${sessionId}.json`);
    const state = readState(filePath);

    if (state) {
      res.cookie(SESSION_COOKIE_NAME, sessionId, {
        httpOnly: true,
        sameSite: 'lax',
      });
      return {
        sessionId,
        filePath,
        state,
      };
    }
  }

  const nextSessionId = crypto.randomBytes(16).toString('hex');
  const filePath = path.join(storageDir, `${nextSessionId}.json`);
  const nextState = createSessionState();

  writeState(filePath, nextState);
  res.cookie(SESSION_COOKIE_NAME, nextSessionId, {
    httpOnly: true,
    sameSite: 'lax',
  });

  return {
    sessionId: nextSessionId,
    filePath,
    state: nextState,
  };
}

// 把二维棋盘展开成前端更容易消费的 tiles 数组。
function serializeTiles(cells) {
  const tiles = [];

  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      tiles.push({
        x,
        y,
        ...cells[y][x],
      });
    }
  }

  return tiles;
}

// 三个写接口共享同一套“不可操作/只读”判定，避免规则描述在不同分支里漂移。
function getTileError(tile, solved, expectedType) {
  if (tile.tileType === 'blocker') {
    return {
      success: false,
      message: '该格不可操作',
      solved,
    };
  }

  if (tile.locked) {
    return {
      success: false,
      message: '该格为只读设施',
      solved,
    };
  }

  if (tile.tileType !== expectedType) {
    return {
      success: false,
      message: expectedType === 'empty' ? '目标格不是空位' : '目标格为空',
      solved,
    };
  }

  return null;
}

// 构造 26 关路由。
// 这里只保留存储目录注入；时间与随机数都直接在实际使用处生成。
function createLevel26Router({ storageDir = STORAGE_DIR } = {}) {
  fs.mkdirSync(storageDir, { recursive: true });

  const router = express.Router();

  // 读取棋盘；如果玩家还没有会话，会在这里自动开新局。
  router.get('/board', (req, res) => {
    const session = loadSession({
      req,
      res,
      storageDir,
    });

    return res.status(200).json({
      success: true,
      message: 'ok',
      solved: session.state.solved,
      board: {
        width: session.state.width,
        height: session.state.height,
        source: session.state.source,
        targets: session.state.targets,
        tiles: serializeTiles(session.state.cells),
      },
      inventory: session.state.inventory,
    });
  });

  // 只有已经 solved 的现有会话才能读取下一关 flag。
  router.get('/flag', (req, res) => {
    const sessionId = sanitizeSessionId(req.cookies?.[SESSION_COOKIE_NAME]);
    if (!sessionId) {
      return res.status(403).json({
        success: false,
        message: '尚未完成解密',
      });
    }

    const state = readState(path.join(storageDir, `${sessionId}.json`));
    if (!state || !state.solved) {
      return res.status(403).json({
        success: false,
        message: '尚未完成解密',
      });
    }

    res.cookie(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
    });

    // 下一关入口只在当前会话确认为 solved 后返回。
    return res.status(200).json({
      success: true,
      message: NEXT_LEVEL_FLAG,
    });
  });

  // 重开一局，但沿用当前玩家的会话文件路径。
  router.post('/reset', (req, res) => {
    const session = loadSession({
      req,
      res,
      storageDir,
    });

    const nextState = createSessionState();

    writeState(session.filePath, nextState);

    return res.status(200).json({
      success: true,
      message: '操作成功',
      solved: nextState.solved,
    });
  });

  // PUT 表示在空格新建一段水管，因此既要校验空位，也要扣减库存。
  router.put('/tiles/:x/:y', (req, res) => {
    const x = parseCoordinate(req.params.x);
    const y = parseCoordinate(req.params.y);

    if (x === null || y === null) {
      return res.status(400).json({
        success: false,
        message: '坐标不合法',
        solved: false,
      });
    }

    const pipeType = String(req.body?.pipeType || '').trim();
    const rotation = req.body?.rotation;

    if (!isValidPipeType(pipeType)) {
      return res.status(400).json({
        success: false,
        message: '水管类型不合法',
        solved: false,
      });
    }

    if (!isValidRotation(rotation)) {
      return res.status(400).json({
        success: false,
        message: '方向不合法',
        solved: false,
      });
    }

    const session = loadSession({
      req,
      res,
      storageDir,
    });
    const targetTile = session.state.cells[y][x];

    const tileError = getTileError(targetTile, session.state.solved, 'empty');
    if (tileError) {
      return res.status(200).json(tileError);
    }

    if ((session.state.inventory[pipeType] || 0) <= 0) {
      return res.status(200).json({
        success: false,
        message: '库存不足',
        solved: session.state.solved,
      });
    }

    const cells = cloneGrid(session.state.cells);
    const inventory = {
      ...session.state.inventory,
      [pipeType]: session.state.inventory[pipeType] - 1,
    };

    cells[y][x] = {
      tileType: 'pipe',
      pipeType,
      rotation,
      locked: false,
    };

    const nextState = {
      ...session.state,
      cells,
      inventory,
      solved: isSolved(cells, session.state.source, session.state.targets),
    };

    writeState(session.filePath, nextState);

    return res.status(200).json({
      success: true,
      message: '操作成功',
      solved: nextState.solved,
    });
  });

  // PATCH 只读取已有 pipe 的 rotation，其余字段一律忽略。
  router.patch('/tiles/:x/:y', (req, res) => {
    const x = parseCoordinate(req.params.x);
    const y = parseCoordinate(req.params.y);

    if (x === null || y === null) {
      return res.status(400).json({
        success: false,
        message: '坐标不合法',
        solved: false,
      });
    }

    const rotation = req.body?.rotation;

    if (!isValidRotation(rotation)) {
      return res.status(400).json({
        success: false,
        message: '方向不合法',
        solved: false,
      });
    }

    const session = loadSession({
      req,
      res,
      storageDir,
    });
    const targetTile = session.state.cells[y][x];

    const tileError = getTileError(targetTile, session.state.solved, 'pipe');
    if (tileError) {
      return res.status(200).json(tileError);
    }

    const cells = cloneGrid(session.state.cells);
    cells[y][x] = {
      ...cells[y][x],
      rotation,
    };

    const nextState = {
      ...session.state,
      cells,
      inventory: { ...session.state.inventory },
      solved: isSolved(cells, session.state.source, session.state.targets),
    };

    writeState(session.filePath, nextState);

    return res.status(200).json({
      success: true,
      message: '操作成功',
      solved: nextState.solved,
    });
  });

  // DELETE 删除已有 pipe，并把对应型号返还回库存。
  router.delete('/tiles/:x/:y', (req, res) => {
    const x = parseCoordinate(req.params.x);
    const y = parseCoordinate(req.params.y);

    if (x === null || y === null) {
      return res.status(400).json({
        success: false,
        message: '坐标不合法',
        solved: false,
      });
    }

    const session = loadSession({
      req,
      res,
      storageDir,
    });
    const targetTile = session.state.cells[y][x];

    const tileError = getTileError(targetTile, session.state.solved, 'pipe');
    if (tileError) {
      return res.status(200).json(tileError);
    }

    const cells = cloneGrid(session.state.cells);
    const inventory = {
      ...session.state.inventory,
      [targetTile.pipeType]:
        (session.state.inventory[targetTile.pipeType] || 0) + 1,
    };

    cells[y][x] = { tileType: 'empty' };

    const nextState = {
      ...session.state,
      cells,
      inventory,
      solved: isSolved(cells, session.state.source, session.state.targets),
    };

    writeState(session.filePath, nextState);

    return res.status(200).json({
      success: true,
      message: '操作成功',
      solved: nextState.solved,
    });
  });

  return router;
}

const router = createLevel26Router();

module.exports = router;
module.exports.createLevel26Router = createLevel26Router;
module.exports.constants = {
  BOARD_SIZE,
  SESSION_COOKIE_NAME,
  STORAGE_DIR,
  NEXT_LEVEL_FLAG,
  PIPE_TYPES,
  ROTATIONS,
};
