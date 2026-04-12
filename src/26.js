const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const BOARD_SIZE = 10;
const SESSION_COOKIE_NAME = 'relay_pipe_sid';
const STORAGE_DIR = path.join('/tmp', 'iconquestion-level26-sessions');
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const COOKIE_MAX_AGE_MS = SESSION_TTL_MS;
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

function ensureStorageDir(storageDir) {
  fs.mkdirSync(storageDir, { recursive: true });
}

function sanitizeSessionId(sessionId) {
  return /^[a-f0-9]{32}$/.test(sessionId) ? sessionId : null;
}

function getSessionFilePath(storageDir, sessionId) {
  return path.join(storageDir, `${sessionId}.json`);
}

function cleanupStaleSessions({
  storageDir,
  nowMs = Date.now(),
  ttlMs = SESSION_TTL_MS,
}) {
  ensureStorageDir(storageDir);

  for (const entry of fs.readdirSync(storageDir)) {
    if (!entry.endsWith('.json')) {
      continue;
    }

    const filePath = path.join(storageDir, entry);

    try {
      const stats = fs.statSync(filePath);
      if (nowMs - stats.mtimeMs > ttlMs) {
        fs.unlinkSync(filePath);
      }
    } catch (_err) {
      // 机会性清理，不阻断正常请求。
    }
  }
}

function randomChoice(items, randomInt) {
  return items[randomInt(items.length)];
}

function sampleDistinct(items, count, randomInt) {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    const temp = next[index];
    next[index] = next[swapIndex];
    next[swapIndex] = temp;
  }

  return next.slice(0, count);
}

function createEmptyGrid() {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => ({ tileType: 'empty' }))
  );
}

function cloneCells(cells) {
  return cells.map((row) => row.map((tile) => ({ ...tile })));
}

function setCell(cells, x, y, value) {
  cells[y][x] = { ...value };
}

function getCell(cells, x, y) {
  return cells[y][x];
}

function keyOf(x, y) {
  return `${x},${y}`;
}

function parseKey(key) {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}

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

function isValidPipeType(pipeType) {
  return PIPE_TYPES.includes(pipeType);
}

function isValidRotation(rotation) {
  return Number.isInteger(rotation) && ROTATIONS.includes(rotation);
}

function createPathCells(from, to) {
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

function addPath(occupied, path) {
  for (const point of path) {
    occupied.add(keyOf(point.x, point.y));
  }
}

function getNeighborDirections(occupiedSet, x, y) {
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

function directionsToPipe(directions) {
  const sorted = [...directions].sort();
  const signature = sorted.join(',');

  if (signature === 'left,right') {
    return { pipeType: 'straight', rotation: 0 };
  }

  if (signature === 'down,up') {
    return { pipeType: 'straight', rotation: 90 };
  }

  if (signature === 'right,up') {
    return { pipeType: 'elbow', rotation: 0 };
  }

  if (signature === 'down,right') {
    return { pipeType: 'elbow', rotation: 90 };
  }

  if (signature === 'down,left') {
    return { pipeType: 'elbow', rotation: 180 };
  }

  if (signature === 'left,up') {
    return { pipeType: 'elbow', rotation: 270 };
  }

  if (signature === 'down,right,up') {
    return { pipeType: 'tee', rotation: 0 };
  }

  if (signature === 'down,left,right') {
    return { pipeType: 'tee', rotation: 90 };
  }

  if (signature === 'down,left,up') {
    return { pipeType: 'tee', rotation: 180 };
  }

  if (signature === 'left,right,up') {
    return { pipeType: 'tee', rotation: 270 };
  }

  return null;
}

function getPipeOpenings(pipeType, rotation) {
  return PIPE_OPENINGS[pipeType]?.[rotation] || [];
}

function rotateToDifferentValid(pipeType, rotation, randomInt) {
  const candidates = ROTATIONS.filter(
    (candidate) =>
      candidate !== rotation &&
      getPipeOpenings(pipeType, candidate).join(',') !==
        getPipeOpenings(pipeType, rotation).join(',')
  );

  return randomChoice(candidates, randomInt);
}

function createWrongPipe(correctPipe, randomInt) {
  const wrongTypes = PIPE_TYPES.filter(
    (pipeType) => pipeType !== correctPipe.pipeType
  );
  const pipeType = randomChoice(wrongTypes, randomInt);
  const rotation = randomChoice(ROTATIONS, randomInt);

  return {
    x: correctPipe.x,
    y: correctPipe.y,
    tileType: 'pipe',
    pipeType,
    rotation,
    locked: false,
  };
}

function generateLayout({ randomInt }) {
  const source = {
    x: 1,
    y: 2 + randomInt(6),
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
    randomChoice(topChoices, randomInt),
    randomChoice(bottomChoices, randomInt),
  ];

  const remainingRows = [];
  for (let y = 1; y <= 8; y += 1) {
    if (y !== source.y && !targetRows.includes(y)) {
      remainingRows.push(y);
    }
  }
  targetRows.push(randomChoice(remainingRows, randomInt));
  targetRows.sort((a, b) => a - b);

  const targets = targetRows.map((y) => ({ x: 8, y }));
  const trunkX = 3 + randomInt(3);
  const splitXs = sampleDistinct(
    Array.from({ length: 7 - trunkX }, (_, index) => trunkX + 1 + index),
    3,
    randomInt
  ).sort((a, b) => a - b);

  const occupied = new Set();
  addPath(occupied, createPathCells(source, { x: trunkX, y: source.y }));

  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index];
    const splitX = splitXs[index];

    addPath(
      occupied,
      createPathCells({ x: trunkX, y: source.y }, { x: splitX, y: source.y })
    );
    addPath(
      occupied,
      createPathCells({ x: splitX, y: source.y }, { x: splitX, y: target.y })
    );
    addPath(occupied, createPathCells({ x: splitX, y: target.y }, target));
  }

  const solutionPipes = [];

  for (const key of occupied) {
    const { x, y } = parseKey(key);

    if (x === source.x && y === source.y) {
      continue;
    }

    if (targets.some((target) => target.x === x && target.y === y)) {
      continue;
    }

    const pipe = directionsToPipe(getNeighborDirections(occupied, x, y));

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

function createInitialState({ nowIso, randomInt }) {
  const { source, targets, solutionPipes } = generateLayout({ randomInt });

  const cells = createEmptyGrid();
  setCell(cells, source.x, source.y, { tileType: 'source' });

  for (const target of targets) {
    setCell(cells, target.x, target.y, { tileType: 'target' });
  }

  const removalCount = Math.max(1, Math.floor(solutionPipes.length * 0.4));
  const missingSolutionPipes = sampleDistinct(
    solutionPipes,
    Math.min(removalCount, solutionPipes.length),
    randomInt
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

    setCell(cells, pipe.x, pipe.y, {
      ...pipe,
      locked: true,
    });
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

  const blockers = sampleDistinct(blockerCandidates, 10, randomInt);
  for (const blocker of blockers) {
    setCell(cells, blocker.x, blocker.y, { tileType: 'blocker' });
  }

  const solved = evaluateSolved(cells, source, targets).solved;

  return {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    source,
    targets,
    cells,
    inventory,
    solved,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

function serializeState(state) {
  const blockers = [];
  const pipes = [];

  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      const tile = getCell(state.cells, x, y);

      if (tile.tileType === 'blocker') {
        blockers.push({ x, y });
        continue;
      }

      if (tile.tileType === 'pipe') {
        pipes.push({
          x,
          y,
          pipeType: tile.pipeType,
          rotation: tile.rotation,
          locked: Boolean(tile.locked),
        });
      }
    }
  }

  return {
    width: state.width,
    height: state.height,
    source: state.source,
    targets: state.targets,
    blockers,
    pipes,
    inventory: state.inventory,
    solved: state.solved,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
  };
}

function deserializeState(serialized) {
  const cells = createEmptyGrid();

  setCell(cells, serialized.source.x, serialized.source.y, {
    tileType: 'source',
  });

  for (const target of serialized.targets) {
    setCell(cells, target.x, target.y, {
      tileType: 'target',
    });
  }

  for (const blocker of serialized.blockers || []) {
    setCell(cells, blocker.x, blocker.y, {
      tileType: 'blocker',
    });
  }

  for (const pipe of serialized.pipes || []) {
    setCell(cells, pipe.x, pipe.y, {
      tileType: 'pipe',
      pipeType: pipe.pipeType,
      rotation: pipe.rotation,
      locked: Boolean(pipe.locked),
    });
  }

  return {
    width: serialized.width,
    height: serialized.height,
    source: serialized.source,
    targets: serialized.targets,
    cells,
    inventory: serialized.inventory,
    solved: Boolean(serialized.solved),
    createdAt: serialized.createdAt,
    updatedAt: serialized.updatedAt,
  };
}

function readSerializedState(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (_err) {
    return null;
  }
}

function readState(filePath) {
  const serialized = readSerializedState(filePath);
  return serialized ? deserializeState(serialized) : null;
}

function writeState(filePath, state) {
  fs.writeFileSync(
    filePath,
    JSON.stringify(serializeState(state), null, 2),
    'utf8'
  );
}

function setSessionCookie(res, sessionId) {
  res.cookie(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE_MS,
  });
}

function touchSessionFile(filePath, now) {
  try {
    fs.utimesSync(filePath, now, now);
  } catch (_err) {
    // 刷新存活时间失败时不阻断请求。
  }
}

function getOrCreateSession({
  req,
  res,
  storageDir,
  now,
  randomBytes,
  randomInt,
}) {
  const sessionId = sanitizeSessionId(req.cookies?.[SESSION_COOKIE_NAME]);

  if (sessionId) {
    const filePath = getSessionFilePath(storageDir, sessionId);
    const state = readState(filePath);

    if (state) {
      setSessionCookie(res, sessionId);
      touchSessionFile(filePath, now());
      return {
        sessionId,
        filePath,
        state,
      };
    }
  }

  const nextSessionId = randomBytes(16).toString('hex');
  const filePath = getSessionFilePath(storageDir, nextSessionId);
  const nextState = createInitialState({
    nowIso: now().toISOString(),
    randomInt,
  });

  writeState(filePath, nextState);
  setSessionCookie(res, nextSessionId);

  return {
    sessionId: nextSessionId,
    filePath,
    state: nextState,
  };
}

function getTileOpenings(tile) {
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

function evaluateSolved(cells, source, targets) {
  const queue = [{ x: source.x, y: source.y }];
  const visited = new Set([keyOf(source.x, source.y)]);

  while (queue.length > 0) {
    const current = queue.shift();
    const openings = getTileOpenings(getCell(cells, current.x, current.y));

    for (const direction of openings) {
      const offset = DIRECTION_OFFSETS[direction];
      const nextX = current.x + offset.dx;
      const nextY = current.y + offset.dy;

      if (
        nextX < 0 ||
        nextX >= BOARD_SIZE ||
        nextY < 0 ||
        nextY >= BOARD_SIZE
      ) {
        continue;
      }

      const nextTile = getCell(cells, nextX, nextY);
      const nextOpenings = getTileOpenings(nextTile);

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

  const connectedTargets = targets.filter((target) =>
    visited.has(keyOf(target.x, target.y))
  ).length;

  return {
    solved: connectedTargets === targets.length,
    connectedTargets,
  };
}

function serializeTiles(cells) {
  const tiles = [];

  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      tiles.push({
        x,
        y,
        ...getCell(cells, x, y),
      });
    }
  }

  return tiles;
}

function createBoardPayload(state) {
  return {
    success: true,
    message: 'ok',
    solved: state.solved,
    board: {
      width: state.width,
      height: state.height,
      source: state.source,
      targets: state.targets,
      tiles: serializeTiles(state.cells),
    },
    inventory: state.inventory,
  };
}

function sendBadRequest(res, message) {
  return res.status(400).json({
    success: false,
    message,
    solved: false,
  });
}

function sendOperationResult(res, success, message, solved) {
  return res.status(200).json({
    success,
    message,
    solved,
  });
}

function buildNextState(session, cells, inventory, nowIso) {
  const solved = evaluateSolved(
    cells,
    session.state.source,
    session.state.targets
  ).solved;

  return {
    ...session.state,
    cells,
    inventory,
    solved,
    updatedAt: nowIso,
  };
}

function persistState(filePath, state) {
  writeState(filePath, state);
}

function resetSessionState(nowIso, randomInt) {
  return createInitialState({
    nowIso,
    randomInt,
  });
}

// /flag 只接受已存在且已完成解密的会话，不为未完成玩家隐式创建新局。
function getExistingSession({ req, res, storageDir, now }) {
  const sessionId = sanitizeSessionId(req.cookies?.[SESSION_COOKIE_NAME]);

  if (!sessionId) {
    return null;
  }

  const filePath = getSessionFilePath(storageDir, sessionId);
  const state = readState(filePath);

  if (!state) {
    return null;
  }

  setSessionCookie(res, sessionId);
  touchSessionFile(filePath, now());

  return {
    sessionId,
    filePath,
    state,
  };
}

function createLevel26Router({
  storageDir = STORAGE_DIR,
  now = () => new Date(),
  randomBytes = crypto.randomBytes,
  randomInt = crypto.randomInt,
  ttlMs = SESSION_TTL_MS,
} = {}) {
  ensureStorageDir(storageDir);

  const router = express.Router();

  router.use((_req, _res, next) => {
    cleanupStaleSessions({
      storageDir,
      nowMs: now().getTime(),
      ttlMs,
    });
    next();
  });

  router.get('/board', (req, res) => {
    const session = getOrCreateSession({
      req,
      res,
      storageDir,
      now,
      randomBytes,
      randomInt,
    });

    return res.status(200).json(createBoardPayload(session.state));
  });

  router.get('/flag', (req, res) => {
    const session = getExistingSession({
      req,
      res,
      storageDir,
      now,
    });

    if (!session || !session.state.solved) {
      return res.status(403).json({
        success: false,
        message: '尚未完成解密',
      });
    }

    // 下一关入口只在当前会话确认为 solved 后返回。
    return res.status(200).json({
      success: true,
      message: NEXT_LEVEL_FLAG,
    });
  });

  router.post('/reset', (req, res) => {
    const session = getOrCreateSession({
      req,
      res,
      storageDir,
      now,
      randomBytes,
      randomInt,
    });

    const nextState = resetSessionState(now().toISOString(), randomInt);

    persistState(session.filePath, nextState);

    return sendOperationResult(res, true, '操作成功', nextState.solved);
  });

  router.put('/tiles/:x/:y', (req, res) => {
    const x = parseCoordinate(req.params.x);
    const y = parseCoordinate(req.params.y);

    if (x === null || y === null) {
      return sendBadRequest(res, '坐标不合法');
    }

    const pipeType = String(req.body?.pipeType || '').trim();
    const rotation = req.body?.rotation;

    if (!isValidPipeType(pipeType)) {
      return sendBadRequest(res, '水管类型不合法');
    }

    if (!isValidRotation(rotation)) {
      return sendBadRequest(res, '方向不合法');
    }

    const session = getOrCreateSession({
      req,
      res,
      storageDir,
      now,
      randomBytes,
      randomInt,
    });
    const targetTile = getCell(session.state.cells, x, y);

    if (targetTile.tileType === 'blocker') {
      return sendOperationResult(
        res,
        false,
        '该格不可操作',
        session.state.solved
      );
    }

    if (targetTile.locked) {
      return sendOperationResult(
        res,
        false,
        '该格为只读设施',
        session.state.solved
      );
    }

    if (targetTile.tileType !== 'empty') {
      return sendOperationResult(
        res,
        false,
        '目标格不是空位',
        session.state.solved
      );
    }

    if ((session.state.inventory[pipeType] || 0) <= 0) {
      return sendOperationResult(res, false, '库存不足', session.state.solved);
    }

    const cells = cloneCells(session.state.cells);
    const inventory = {
      ...session.state.inventory,
      [pipeType]: session.state.inventory[pipeType] - 1,
    };

    setCell(cells, x, y, {
      tileType: 'pipe',
      pipeType,
      rotation,
      locked: false,
    });

    const nextState = buildNextState(
      session,
      cells,
      inventory,
      now().toISOString()
    );

    persistState(session.filePath, nextState);

    return sendOperationResult(res, true, '操作成功', nextState.solved);
  });

  router.patch('/tiles/:x/:y', (req, res) => {
    const x = parseCoordinate(req.params.x);
    const y = parseCoordinate(req.params.y);

    if (x === null || y === null) {
      return sendBadRequest(res, '坐标不合法');
    }

    if (Object.hasOwn(req.body || {}, 'pipeType')) {
      return sendBadRequest(res, 'PATCH 只允许修改方向');
    }

    const rotation = req.body?.rotation;

    if (!isValidRotation(rotation)) {
      return sendBadRequest(res, '方向不合法');
    }

    const session = getOrCreateSession({
      req,
      res,
      storageDir,
      now,
      randomBytes,
      randomInt,
    });
    const targetTile = getCell(session.state.cells, x, y);

    if (targetTile.tileType === 'blocker') {
      return sendOperationResult(
        res,
        false,
        '该格不可操作',
        session.state.solved
      );
    }

    if (targetTile.locked) {
      return sendOperationResult(
        res,
        false,
        '该格为只读设施',
        session.state.solved
      );
    }

    if (targetTile.tileType !== 'pipe') {
      return sendOperationResult(
        res,
        false,
        '目标格为空',
        session.state.solved
      );
    }

    const cells = cloneCells(session.state.cells);
    setCell(cells, x, y, {
      ...getCell(cells, x, y),
      rotation,
    });

    const nextState = buildNextState(
      session,
      cells,
      { ...session.state.inventory },
      now().toISOString()
    );

    persistState(session.filePath, nextState);

    return sendOperationResult(res, true, '操作成功', nextState.solved);
  });

  router.delete('/tiles/:x/:y', (req, res) => {
    const x = parseCoordinate(req.params.x);
    const y = parseCoordinate(req.params.y);

    if (x === null || y === null) {
      return sendBadRequest(res, '坐标不合法');
    }

    const session = getOrCreateSession({
      req,
      res,
      storageDir,
      now,
      randomBytes,
      randomInt,
    });
    const targetTile = getCell(session.state.cells, x, y);

    if (targetTile.tileType === 'blocker') {
      return sendOperationResult(
        res,
        false,
        '该格不可操作',
        session.state.solved
      );
    }

    if (targetTile.locked) {
      return sendOperationResult(
        res,
        false,
        '该格为只读设施',
        session.state.solved
      );
    }

    if (targetTile.tileType !== 'pipe') {
      return sendOperationResult(
        res,
        false,
        '目标格为空',
        session.state.solved
      );
    }

    const cells = cloneCells(session.state.cells);
    const inventory = {
      ...session.state.inventory,
      [targetTile.pipeType]:
        (session.state.inventory[targetTile.pipeType] || 0) + 1,
    };

    setCell(cells, x, y, { tileType: 'empty' });

    const nextState = buildNextState(
      session,
      cells,
      inventory,
      now().toISOString()
    );

    persistState(session.filePath, nextState);

    return sendOperationResult(res, true, '操作成功', nextState.solved);
  });

  return router;
}

const router = createLevel26Router();

module.exports = router;
module.exports.createLevel26Router = createLevel26Router;
module.exports.cleanupStaleSessions = cleanupStaleSessions;
module.exports.serializeState = serializeState;
module.exports.deserializeState = deserializeState;
module.exports.constants = {
  BOARD_SIZE,
  SESSION_COOKIE_NAME,
  STORAGE_DIR,
  SESSION_TTL_MS,
  COOKIE_MAX_AGE_MS,
  NEXT_LEVEL_FLAG,
  PIPE_TYPES,
  ROTATIONS,
};
