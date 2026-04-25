/**
 * 构件：第 26 关水管谜题会话路由
 * 作用：生成水管棋盘、维护玩家放置状态，并校验 source 到 targets 的连通性。
 * 数据结构：使用 10x10 cells 二维数组表示棋盘，使用 Cookie 关联 /tmp 下的会话文件。
 * 控制：由 Express 应用装配模块挂载到 /api/26，并导出工厂函数和算法函数供测试使用。
 */
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
  // shuffledItems 是用于洗牌的副本，避免改动调用方传入的原数组。
  const shuffledItems = [...items];

  for (
    let currentIndex = shuffledItems.length - 1;
    currentIndex > 0;
    currentIndex -= 1
  ) {
    // randomIndex 是当前轮次要与 currentIndex 交换的位置，用于 Fisher-Yates 洗牌。
    const randomIndex = crypto.randomInt(currentIndex + 1);
    const currentItem = shuffledItems[currentIndex];
    shuffledItems[currentIndex] = shuffledItems[randomIndex];
    shuffledItems[randomIndex] = currentItem;
  }

  return shuffledItems.slice(0, count);
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

  // pathPoints 按访问顺序记录整条路径上的离散格子。
  const pathPoints = [];
  let pathX = from.x;
  let pathY = from.y;

  pathPoints.push({ x: pathX, y: pathY });

  while (pathX !== to.x) {
    pathX += Math.sign(to.x - pathX);
    pathPoints.push({ x: pathX, y: pathY });
  }

  while (pathY !== to.y) {
    pathY += Math.sign(to.y - pathY);
    pathPoints.push({ x: pathX, y: pathY });
  }

  return pathPoints;
}

// 把一段路径上的所有格子标记为“已占用”。
function markPath(occupiedCells, pathPoints) {
  for (const point of pathPoints) {
    occupiedCells.add(keyOf(point.x, point.y));
  }
}

// 查看某个格子四周哪些方向存在相邻路径格，用于把路径形状反推为具体水管。
function getPipeDirections(occupiedCells, x, y) {
  // connectedDirections 收集当前格与哪些相邻方向连通，后面会据此反推水管类型。
  const connectedDirections = [];

  for (const [direction, directionOffset] of Object.entries(
    DIRECTION_OFFSETS
  )) {
    const neighborX = x + directionOffset.dx;
    const neighborY = y + directionOffset.dy;

    if (
      neighborX < 0 ||
      neighborX >= BOARD_SIZE ||
      neighborY < 0 ||
      neighborY >= BOARD_SIZE
    ) {
      continue;
    }

    if (occupiedCells.has(keyOf(neighborX, neighborY))) {
      connectedDirections.push(direction);
    }
  }

  return connectedDirections.sort();
}

// 把方向组合映射回水管类型与旋转角。
function pipeFromDirections(connectedDirections) {
  return PIPE_BY_SIGNATURE[[...connectedDirections].sort().join(',')] || null;
}

// 查询某个水管在指定旋转下朝哪些方向开口。
function getPipeOpenings(pipeType, rotation) {
  return PIPE_OPENINGS[pipeType]?.[rotation] || [];
}

// 生成一张保证 source 能连到三个 target 的“完整答案图”。
// 本函数只负责构造答案，不负责抠图、库存和障碍格。
function generateSolution() {
  const sourcePosition = {
    x: 1,
    y: 2 + crypto.randomInt(6),
  };

  // upperTargetRowChoices / lowerTargetRowChoices 分别保存 source 上方、下方可放 target 的候选行。
  const upperTargetRowChoices = [];
  const lowerTargetRowChoices = [];

  for (let y = 1; y <= 8; y += 1) {
    if (y < sourcePosition.y) {
      upperTargetRowChoices.push(y);
    }
    if (y > sourcePosition.y) {
      lowerTargetRowChoices.push(y);
    }
  }

  // targetRows 先确保至少选到 source 上下两侧各一个目标行。
  const targetRows = [
    upperTargetRowChoices[crypto.randomInt(upperTargetRowChoices.length)],
    lowerTargetRowChoices[crypto.randomInt(lowerTargetRowChoices.length)],
  ];

  // remainingTargetRowChoices 用于补足第三个目标，且保证不与 source 和已有 target 重合。
  const remainingTargetRowChoices = [];
  for (let y = 1; y <= 8; y += 1) {
    if (y !== sourcePosition.y && !targetRows.includes(y)) {
      remainingTargetRowChoices.push(y);
    }
  }
  targetRows.push(
    remainingTargetRowChoices[
      crypto.randomInt(remainingTargetRowChoices.length)
    ]
  );
  targetRows.sort((a, b) => a - b);

  const targetPositions = targetRows.map((y) => ({ x: 8, y }));

  // 这里必须保证右侧候选列至少有 3 个，否则 branchColumns 长度不足，
  // 后续 buildPath 会收到 undefined 坐标，导致死循环与 OOM。
  // trunkColumn=3 => 候选 [4,5,6,7]
  // trunkColumn=4 => 候选 [5,6,7]
  // trunkColumn=5 => 候选仅 [6,7]，不足 3 个，因此不能取。
  const trunkColumn = 3 + crypto.randomInt(2);

  // branchColumnCandidates 是主干右侧可作为分叉列的所有候选 x。
  const branchColumnCandidates = Array.from(
    { length: 7 - trunkColumn },
    (_, index) => trunkColumn + 1 + index
  );

  // branchColumns 是三个目标各自对应的分叉列，排序后让路径从左到右更稳定。
  const branchColumns = sampleDistinct(branchColumnCandidates, 3).sort(
    (a, b) => a - b
  );

  if (branchColumns.length !== 3) {
    throw new Error(
      `Invalid split column generation: trunkColumn=${trunkColumn}, branchColumnCandidates=${JSON.stringify(
        branchColumnCandidates
      )}, branchColumns=${JSON.stringify(branchColumns)}`
    );
  }

  // occupiedPathCells 先只记录“答案路径经过了哪些格子”，后面再反推这些格子对应的水管形状。
  const occupiedPathCells = new Set();
  markPath(
    occupiedPathCells,
    buildPath(sourcePosition, { x: trunkColumn, y: sourcePosition.y })
  );

  for (
    let targetIndex = 0;
    targetIndex < targetPositions.length;
    targetIndex += 1
  ) {
    const targetPosition = targetPositions[targetIndex];
    const branchColumn = branchColumns[targetIndex];

    markPath(
      occupiedPathCells,
      buildPath(
        { x: trunkColumn, y: sourcePosition.y },
        { x: branchColumn, y: sourcePosition.y }
      )
    );
    markPath(
      occupiedPathCells,
      buildPath(
        { x: branchColumn, y: sourcePosition.y },
        { x: branchColumn, y: targetPosition.y }
      )
    );
    markPath(
      occupiedPathCells,
      buildPath({ x: branchColumn, y: targetPosition.y }, targetPosition)
    );
  }

  const solutionPipeTiles = [];

  for (const cellKey of occupiedPathCells) {
    const [x, y] = cellKey.split(',').map(Number);

    if (x === sourcePosition.x && y === sourcePosition.y) {
      continue;
    }

    if (
      targetPositions.some(
        (targetPosition) => targetPosition.x === x && targetPosition.y === y
      )
    ) {
      continue;
    }

    const pipeShape = pipeFromDirections(
      getPipeDirections(occupiedPathCells, x, y)
    );

    if (!pipeShape) {
      continue;
    }

    solutionPipeTiles.push({
      x,
      y,
      tileType: 'pipe',
      pipeType: pipeShape.pipeType,
      rotation: pipeShape.rotation,
    });
  }

  return {
    source: sourcePosition,
    targets: targetPositions,
    solutionPipes: solutionPipeTiles,
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
  // pendingCells 是 BFS 待扩展的格子队列。
  const pendingCells = [{ x: source.x, y: source.y }];
  // reachableCells 记录已经确认可达的格子，避免重复搜索和环路。
  const reachableCells = new Set([keyOf(source.x, source.y)]);

  while (pendingCells.length > 0) {
    const currentCell = pendingCells.shift();
    const currentOpenings = getOpenings(cells[currentCell.y][currentCell.x]);

    for (const direction of currentOpenings) {
      const directionOffset = DIRECTION_OFFSETS[direction];
      const neighborX = currentCell.x + directionOffset.dx;
      const neighborY = currentCell.y + directionOffset.dy;

      if (!isInsideBoard(neighborX, neighborY)) {
        continue;
      }

      const neighborTile = cells[neighborY][neighborX];
      const neighborOpenings = getOpenings(neighborTile);

      if (!neighborOpenings.includes(directionOffset.opposite)) {
        continue;
      }

      const neighborKey = keyOf(neighborX, neighborY);
      if (reachableCells.has(neighborKey)) {
        continue;
      }

      reachableCells.add(neighborKey);
      pendingCells.push({ x: neighborX, y: neighborY });
    }
  }

  return targets.every((target) =>
    reachableCells.has(keyOf(target.x, target.y))
  );
}

// 生成玩家初始局面：
// 1. 先拿到完整答案图
// 2. 挖掉一部分答案管道作为玩家库存
// 3. 留下的答案管道标记为 locked
// 4. 再随机放一些 blocker
function generateNewGame() {
  const { source, targets, solutionPipes } = generateSolution();

  const boardCells = createEmptyGrid();
  boardCells[source.y][source.x] = { tileType: 'source' };

  for (const target of targets) {
    boardCells[target.y][target.x] = { tileType: 'target' };
  }

  // removedPipeCount 决定这一局要从完整答案里挖掉多少段水管交给玩家自己摆放。
  const removedPipeCount = Math.max(1, Math.floor(solutionPipes.length * 0.4));
  // removedSolutionPipes 是被挖掉的答案水管，同时也是玩家初始库存来源。
  const removedSolutionPipes = sampleDistinct(
    solutionPipes,
    Math.min(removedPipeCount, solutionPipes.length)
  );
  // removedPipeKeys 让后面判断“这根答案水管是否被移除”时可以 O(1) 查询。
  const removedPipeKeys = new Set(
    removedSolutionPipes.map((pipe) => keyOf(pipe.x, pipe.y))
  );

  // inventory 统计玩家当前还能放置多少根各型号水管。
  const inventory = {
    straight: 0,
    elbow: 0,
    tee: 0,
  };

  for (const pipe of removedSolutionPipes) {
    inventory[pipe.pipeType] += 1;
  }

  for (const pipe of solutionPipes) {
    if (removedPipeKeys.has(keyOf(pipe.x, pipe.y))) {
      continue;
    }

    boardCells[pipe.y][pipe.x] = {
      ...pipe,
      locked: true,
    };
  }

  // occupiedKeys 统一记录所有已被 source / target / 固定答案占据的位置，避免 blocker 覆盖它们。
  const occupiedCellKeys = new Set([
    keyOf(source.x, source.y),
    ...targets.map((target) => keyOf(target.x, target.y)),
    ...solutionPipes.map((pipe) => keyOf(pipe.x, pipe.y)),
  ]);

  // blockerCandidates 是允许随机放置障碍物的空白候选格。
  const blockerCandidates = [];

  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      if (occupiedCellKeys.has(keyOf(x, y))) {
        continue;
      }

      blockerCandidates.push({ x, y });
    }
  }

  const blockerTiles = sampleDistinct(blockerCandidates, 10);
  for (const blockerTile of blockerTiles) {
    boardCells[blockerTile.y][blockerTile.x] = { tileType: 'blocker' };
  }

  const solved = isSolved(boardCells, source, targets);

  return {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    source,
    targets,
    cells: boardCells,
    inventory,
    solved,
  };
}

// 当前会话状态本身已经足够小，直接按运行时结构落盘即可。
// 这样读写时不需要维护两套数据模型。
// 读取原始 JSON；任何读文件或 JSON 解析失败都视为“无有效存档”。
function loadGameStateFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_err) {
    return null;
  }
}

// 持久化当前状态到会话文件。
function saveGameStateFile(filePath, state) {
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf8');
}

// 读取已有会话；没有的话就创建新会话和初始棋盘。
function loadGameState({ req, res, storageDir }) {
  const sessionId = sanitizeSessionId(req.cookies?.[SESSION_COOKIE_NAME]);

  if (sessionId) {
    const filePath = path.join(storageDir, `${sessionId}.json`);
    const state = loadGameStateFile(filePath);

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

  // nextSessionId 用于首次访问或旧会话失效时创建新的存档文件名。
  const nextSessionId = crypto.randomBytes(16).toString('hex');
  const filePath = path.join(storageDir, `${nextSessionId}.json`);
  const nextState = generateNewGame();

  saveGameStateFile(filePath, nextState);
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
  // tiles 是拍平成一维后的棋盘数据，方便前端逐格渲染。
  const serializedTiles = [];

  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      serializedTiles.push({
        x,
        y,
        ...cells[y][x],
      });
    }
  }

  return serializedTiles;
}

// 三个写接口共享同一套“不可操作/只读”判定，避免规则描述在不同分支里漂移。
function getTileError(tile, solved, expectedTileType) {
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

  if (tile.tileType !== expectedTileType) {
    return {
      success: false,
      message: expectedTileType === 'empty' ? '目标格不是空位' : '目标格为空',
      solved,
    };
  }

  return null;
}

// 统一解析路由里的棋盘坐标，避免三个写接口各自重复同一段校验入口。
function parseTilePosition(params) {
  const tileX = parseCoordinate(params.x);
  const tileY = parseCoordinate(params.y);

  if (tileX === null || tileY === null) {
    return null;
  }

  return { x: tileX, y: tileY };
}

// 统一返回“坐标不合法”的响应体，避免硬编码散落在多个分支中。
function createInvalidCoordinateResponse() {
  return {
    success: false,
    message: '坐标不合法',
    solved: false,
  };
}

// 写接口成功时都返回同一套结构，只是 solved 值不同。
function createTileActionSuccessResponse(solved) {
  return {
    success: true,
    message: '操作成功',
    solved,
  };
}

// 这里只保留存储目录注入；时间与随机数都直接在实际使用处生成。
function createLevel26Router({ storageDir = STORAGE_DIR } = {}) {
  fs.mkdirSync(storageDir, { recursive: true });

  // router 汇总本关所有 HTTP 接口。
  const router = express.Router();

  // 读取棋盘；如果玩家还没有会话，会在这里自动开新局。
  router.get('/board', (req, res) => {
    const session = loadGameState({
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

    const state = loadGameStateFile(path.join(storageDir, `${sessionId}.json`));
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
    const session = loadGameState({
      req,
      res,
      storageDir,
    });

    const nextState = generateNewGame();

    saveGameStateFile(session.filePath, nextState);

    return res.status(200).json({
      success: true,
      message: '操作成功',
      solved: nextState.solved,
    });
  });

  // PUT 表示在空格新建一段水管，因此既要校验空位，也要扣减库存。
  router.put('/tiles/:x/:y', (req, res) => {
    const tilePosition = parseTilePosition(req.params);

    if (!tilePosition) {
      return res.status(400).json(createInvalidCoordinateResponse());
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

    const session = loadGameState({
      req,
      res,
      storageDir,
    });
    // targetTile 是本次写操作命中的原始棋盘格，用于统一做可操作性校验。
    const targetTile = session.state.cells[tilePosition.y][tilePosition.x];

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

    const nextCells = cloneGrid(session.state.cells);
    // inventory 是扣除本次放置消耗后的库存快照。
    const nextInventory = {
      ...session.state.inventory,
      [pipeType]: session.state.inventory[pipeType] - 1,
    };

    nextCells[tilePosition.y][tilePosition.x] = {
      tileType: 'pipe',
      pipeType,
      rotation,
      locked: false,
    };

    const nextState = {
      ...session.state,
      cells: nextCells,
      inventory: nextInventory,
      solved: isSolved(nextCells, session.state.source, session.state.targets),
    };

    saveGameStateFile(session.filePath, nextState);

    return res
      .status(200)
      .json(createTileActionSuccessResponse(nextState.solved));
  });

  // PATCH 只读取已有 pipe 的 rotation，其余字段一律忽略。
  router.patch('/tiles/:x/:y', (req, res) => {
    const tilePosition = parseTilePosition(req.params);

    if (!tilePosition) {
      return res.status(400).json(createInvalidCoordinateResponse());
    }

    const rotation = req.body?.rotation;

    if (!isValidRotation(rotation)) {
      return res.status(400).json({
        success: false,
        message: '方向不合法',
        solved: false,
      });
    }

    const session = loadGameState({
      req,
      res,
      storageDir,
    });
    // targetTile 是当前准备旋转的那段现有水管。
    const targetTile = session.state.cells[tilePosition.y][tilePosition.x];

    const tileError = getTileError(targetTile, session.state.solved, 'pipe');
    if (tileError) {
      return res.status(200).json(tileError);
    }

    const nextCells = cloneGrid(session.state.cells);
    nextCells[tilePosition.y][tilePosition.x] = {
      ...nextCells[tilePosition.y][tilePosition.x],
      rotation,
    };

    const nextState = {
      ...session.state,
      cells: nextCells,
      inventory: { ...session.state.inventory },
      solved: isSolved(nextCells, session.state.source, session.state.targets),
    };

    saveGameStateFile(session.filePath, nextState);

    return res
      .status(200)
      .json(createTileActionSuccessResponse(nextState.solved));
  });

  // DELETE 删除已有 pipe，并把对应型号返还回库存。
  router.delete('/tiles/:x/:y', (req, res) => {
    const tilePosition = parseTilePosition(req.params);

    if (!tilePosition) {
      return res.status(400).json(createInvalidCoordinateResponse());
    }

    const session = loadGameState({
      req,
      res,
      storageDir,
    });
    // targetTile 是当前准备删除并返还库存的水管。
    const targetTile = session.state.cells[tilePosition.y][tilePosition.x];

    const tileError = getTileError(targetTile, session.state.solved, 'pipe');
    if (tileError) {
      return res.status(200).json(tileError);
    }

    const nextCells = cloneGrid(session.state.cells);
    // inventory 是返还当前水管型号后的库存快照。
    const nextInventory = {
      ...session.state.inventory,
      [targetTile.pipeType]:
        (session.state.inventory[targetTile.pipeType] || 0) + 1,
    };

    nextCells[tilePosition.y][tilePosition.x] = { tileType: 'empty' };

    const nextState = {
      ...session.state,
      cells: nextCells,
      inventory: nextInventory,
      solved: isSolved(nextCells, session.state.source, session.state.targets),
    };

    saveGameStateFile(session.filePath, nextState);

    return res
      .status(200)
      .json(createTileActionSuccessResponse(nextState.solved));
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
