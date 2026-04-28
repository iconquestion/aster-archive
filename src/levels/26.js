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
const ENDPOINT_OPENINGS = Object.keys(DIRECTION_OFFSETS);

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

// 把方向组合映射回水管类型与旋转角。
function pipeFromDirections(connectedDirections) {
  return PIPE_BY_SIGNATURE[[...connectedDirections].sort().join(',')] || null;
}

// 查询某个水管在指定旋转下朝哪些方向开口。
function getPipeOpenings(pipeType, rotation) {
  return PIPE_OPENINGS[pipeType]?.[rotation] || [];
}

// 还原 keyOf 生成的坐标键。生成算法内部用字符串键存 Map / Set，出接口前再转回普通坐标对象。
function pointFromKey(cellKey) {
  const [x, y] = cellKey.split(',').map(Number);
  return { x, y };
}

// 枚举棋盘内所有坐标，供随机树选择起始格使用。
function getBoardPositions() {
  const positions = [];

  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      positions.push({ x, y });
    }
  }

  return positions;
}

// 只返回棋盘内的上下左右相邻格；生成器不会产生斜向连接。
function getNeighborPositions(point) {
  const neighbors = [];

  for (const directionOffset of Object.values(DIRECTION_OFFSETS)) {
    const neighbor = {
      x: point.x + directionOffset.dx,
      y: point.y + directionOffset.dy,
    };

    if (isInsideBoard(neighbor.x, neighbor.y)) {
      neighbors.push(neighbor);
    }
  }

  return neighbors;
}

// 找到两个相邻格之间的方向。这里显式抛错，方便定位生成器错误输入。
function getDirectionBetween(from, to) {
  for (const [direction, directionOffset] of Object.entries(
    DIRECTION_OFFSETS
  )) {
    if (
      from.x + directionOffset.dx === to.x &&
      from.y + directionOffset.dy === to.y
    ) {
      return direction;
    }
  }

  throw new Error(
    `Cells are not adjacent: from=${JSON.stringify(from)} to=${JSON.stringify(to)}`
  );
}

// connectionMap: Map<"x,y", Set<direction>>，记录答案树里每个格子连接到哪些方向。
function ensureConnectionCell(connectionMap, cellKey) {
  if (!connectionMap.has(cellKey)) {
    connectionMap.set(cellKey, new Set());
  }

  return connectionMap.get(cellKey);
}

// 在答案树中添加一条无向边。两端都要记录方向，后续才能反推水管形状。
function addConnection(connectionMap, from, to) {
  const fromKey = keyOf(from.x, from.y);
  const toKey = keyOf(to.x, to.y);
  const direction = getDirectionBetween(from, to);
  const oppositeDirection = DIRECTION_OFFSETS[direction].opposite;

  ensureConnectionCell(connectionMap, fromKey).add(direction);
  ensureConnectionCell(connectionMap, toKey).add(oppositeDirection);
}

// 深拷贝连接表，剪枝时不能破坏原始随机树，便于失败后重试。
function cloneConnectionMap(connectionMap) {
  const clonedConnectionMap = new Map();

  for (const [cellKey, directions] of connectionMap) {
    clonedConnectionMap.set(cellKey, new Set(directions));
  }

  return clonedConnectionMap;
}

// 根据当前格的连接方向，返回已经连上的相邻格 key。
function getConnectedNeighborKeys(connectionMap, cellKey) {
  const point = pointFromKey(cellKey);
  const directions = connectionMap.get(cellKey) || new Set();
  const neighborKeys = [];

  for (const direction of directions) {
    const directionOffset = DIRECTION_OFFSETS[direction];
    neighborKeys.push(
      keyOf(point.x + directionOffset.dx, point.y + directionOffset.dy)
    );
  }

  return neighborKeys;
}

// 找出仍能继续生长的树节点。最多 3 个连接是因为本关没有 cross pipe。
function getExpandableTreeCells(connectionMap) {
  const expandableCells = [];

  for (const [cellKey, directions] of connectionMap) {
    if (directions.size >= 3) {
      continue;
    }

    const point = pointFromKey(cellKey);
    const hasUnusedNeighbor = getNeighborPositions(point).some(
      (neighbor) => !connectionMap.has(keyOf(neighbor.x, neighbor.y))
    );

    if (hasUnusedNeighbor) {
      expandableCells.push(point);
    }
  }

  return expandableCells;
}

/**
 * 随机生长一棵不自交的连接树。
 *
 * 树结构天然保证 source 到任意 target 只有一条明确路径；
 * 每个格最多 3 个连接，确保后续都能转换成 straight / elbow / tee。
 */
function growRandomConnectionTree(targetCellCount) {
  const startPosition = sampleDistinct(getBoardPositions(), 1)[0];
  const connectionMap = new Map();

  ensureConnectionCell(connectionMap, keyOf(startPosition.x, startPosition.y));

  while (connectionMap.size < targetCellCount) {
    const expandableCells = getExpandableTreeCells(connectionMap);

    if (expandableCells.length === 0) {
      break;
    }

    const from = sampleDistinct(expandableCells, 1)[0];
    const availableNeighbors = getNeighborPositions(from).filter(
      (neighbor) => !connectionMap.has(keyOf(neighbor.x, neighbor.y))
    );
    const to = sampleDistinct(availableNeighbors, 1)[0];

    addConnection(connectionMap, from, to);
  }

  return connectionMap;
}

// 叶子节点只有一个连接，最适合作为 source / target 端点。
function getLeafKeys(connectionMap) {
  return Array.from(connectionMap.entries())
    .filter(([, directions]) => directions.size === 1)
    .map(([cellKey]) => cellKey);
}

/**
 * 剪掉没有通往 source / target 的枝条。
 *
 * 随机树为了自由度会长出多余叶子；这些叶子如果保留，会需要“一端封口”的水管类型，
 * 而本关只有 straight / elbow / tee，所以必须把非端点叶子逐层剪掉。
 */
function pruneConnectionTree(connectionMap, endpointKeys) {
  const prunedConnectionMap = cloneConnectionMap(connectionMap);
  const endpointKeySet = new Set(endpointKeys);
  const pendingLeafKeys = getLeafKeys(prunedConnectionMap).filter(
    (cellKey) => !endpointKeySet.has(cellKey)
  );

  for (
    let pendingIndex = 0;
    pendingIndex < pendingLeafKeys.length;
    pendingIndex += 1
  ) {
    const leafKey = pendingLeafKeys[pendingIndex];

    if (endpointKeySet.has(leafKey) || !prunedConnectionMap.has(leafKey)) {
      continue;
    }

    const leafDirections = prunedConnectionMap.get(leafKey);
    if (leafDirections.size !== 1) {
      continue;
    }

    const [neighborKey] = getConnectedNeighborKeys(
      prunedConnectionMap,
      leafKey
    );
    const [leafDirection] = leafDirections;
    const oppositeDirection = DIRECTION_OFFSETS[leafDirection].opposite;

    prunedConnectionMap.delete(leafKey);

    if (!neighborKey || !prunedConnectionMap.has(neighborKey)) {
      continue;
    }

    const neighborDirections = prunedConnectionMap.get(neighborKey);
    neighborDirections.delete(oppositeDirection);

    if (neighborDirections.size === 1 && !endpointKeySet.has(neighborKey)) {
      pendingLeafKeys.push(neighborKey);
    }
  }

  return prunedConnectionMap;
}

// 把剪枝后的答案树转换成具体水管。端点格由 source / target 表示，不需要 pipe tile。
function createPipeTilesFromConnectionTree(connectionMap, endpointKeys) {
  const endpointKeySet = new Set(endpointKeys);
  const solutionPipeTiles = [];

  for (const [cellKey, directions] of connectionMap) {
    if (endpointKeySet.has(cellKey)) {
      continue;
    }

    const pipeShape = pipeFromDirections([...directions]);

    if (!pipeShape) {
      return null;
    }

    const { x, y } = pointFromKey(cellKey);
    solutionPipeTiles.push({
      x,
      y,
      tileType: 'pipe',
      pipeType: pipeShape.pipeType,
      rotation: pipeShape.rotation,
    });
  }

  return solutionPipeTiles;
}

// 生成一张保证 source 能连到三个 target 的“完整答案图”。
// 本函数只负责构造答案，不负责抠图、库存和障碍格。
function generateSolution() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const targetCellCount = 24 + crypto.randomInt(18);
    const connectionMap = growRandomConnectionTree(targetCellCount);
    const leafKeys = getLeafKeys(connectionMap);

    if (leafKeys.length < 4) {
      continue;
    }

    const endpointKeys = sampleDistinct(leafKeys, 4);
    const prunedConnectionMap = pruneConnectionTree(
      connectionMap,
      endpointKeys
    );
    const remainingLeafKeys = getLeafKeys(prunedConnectionMap);
    const keepsOnlyChosenEndpoints =
      remainingLeafKeys.length === endpointKeys.length &&
      endpointKeys.every((endpointKey) =>
        remainingLeafKeys.includes(endpointKey)
      );

    if (!keepsOnlyChosenEndpoints) {
      continue;
    }

    const solutionPipeTiles = createPipeTilesFromConnectionTree(
      prunedConnectionMap,
      endpointKeys
    );

    if (!solutionPipeTiles || solutionPipeTiles.length < 8) {
      continue;
    }

    const [sourceKey, ...targetKeys] = endpointKeys;

    return {
      source: pointFromKey(sourceKey),
      targets: targetKeys.map(pointFromKey),
      solutionPipes: solutionPipeTiles,
    };
  }

  throw new Error('Unable to generate a solvable level 26 pipe tree.');
}

// 把棋盘格转换为“连通判定视角”的开口信息。
// source 和 target 不是 pipe；它们允许从任意方向接入，避免端点位置限制生成形状。
function getOpenings(tile) {
  if (!tile) {
    return [];
  }

  if (tile.tileType === 'source' || tile.tileType === 'target') {
    return ENDPOINT_OPENINGS;
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

// 统一组装 GET /board 响应里的 board 字段，避免路由里混入棋盘展开细节。
function serializeBoard(state) {
  return {
    width: state.width,
    height: state.height,
    source: state.source,
    targets: state.targets,
    tiles: serializeTiles(state.cells),
  };
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

// 读取二维棋盘里的目标格。调用方先通过 parseTilePosition 校验坐标，所以这里不再重复边界判断。
function getTileAt(cells, tilePosition) {
  return cells[tilePosition.y][tilePosition.x];
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

// 统一构造失败响应体。HTTP 状态码由路由决定，业务失败和参数失败共用这份 JSON 形状。
function createFailureResponse(message, solved = false) {
  return {
    success: false,
    message,
    solved,
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

// PUT 请求体必须显式给出 pipeType 和 rotation；这里不做会话读取，避免非法请求创建新存档。
function parsePutTileBody(body) {
  const pipeType = String(body?.pipeType || '').trim();
  const rotation = body?.rotation;

  if (!isValidPipeType(pipeType)) {
    return {
      error: createFailureResponse('水管类型不合法'),
    };
  }

  if (!isValidRotation(rotation)) {
    return {
      error: createFailureResponse('方向不合法'),
    };
  }

  return {
    value: {
      pipeType,
      rotation,
    },
  };
}

// PATCH 只接受 rotation；多余字段由路由自然忽略，以保持现有 API 设计。
function parsePatchTileBody(body) {
  const rotation = body?.rotation;

  if (!isValidRotation(rotation)) {
    return {
      error: createFailureResponse('方向不合法'),
    };
  }

  return {
    value: {
      rotation,
    },
  };
}

/**
 * 根据一份已修改的 cells / inventory 生成下一版会话状态。
 *
 * 本函数只负责把棋盘变更收束成完整状态，并重新计算 solved；
 * 它不校验 HTTP 输入，也不落盘，方便维护者单独定位“规则变化”和“持久化变化”。
 */
function createNextGameState(state, nextCells, nextInventory) {
  return {
    ...state,
    cells: nextCells,
    inventory: nextInventory,
    solved: isSolved(nextCells, state.source, state.targets),
  };
}

/**
 * 在空格放置玩家水管。
 *
 * 业务约束：
 * - 只能放到 empty；
 * - blocker / locked 优先返回它们自己的错误消息；
 * - 库存不足是业务失败，保持 200 响应由路由处理。
 */
function placePlayerPipe(state, tilePosition, pipeType, rotation) {
  const targetTile = getTileAt(state.cells, tilePosition);
  const tileError = getTileError(targetTile, state.solved, 'empty');

  if (tileError) {
    return { error: tileError };
  }

  if ((state.inventory[pipeType] || 0) <= 0) {
    return {
      error: createFailureResponse('库存不足', state.solved),
    };
  }

  const nextCells = cloneGrid(state.cells);
  const nextInventory = {
    ...state.inventory,
    [pipeType]: state.inventory[pipeType] - 1,
  };

  nextCells[tilePosition.y][tilePosition.x] = {
    tileType: 'pipe',
    pipeType,
    rotation,
    locked: false,
  };

  return {
    state: createNextGameState(state, nextCells, nextInventory),
  };
}

/**
 * 旋转已有玩家水管。
 *
 * PATCH 不允许创建水管，也不改变库存；这样前端误传 pipeType 或 locked 字段时，
 * 后端仍只执行“旋转”这一件事。
 */
function rotatePlayerPipe(state, tilePosition, rotation) {
  const targetTile = getTileAt(state.cells, tilePosition);
  const tileError = getTileError(targetTile, state.solved, 'pipe');

  if (tileError) {
    return { error: tileError };
  }

  const nextCells = cloneGrid(state.cells);
  nextCells[tilePosition.y][tilePosition.x] = {
    ...nextCells[tilePosition.y][tilePosition.x],
    rotation,
  };

  return {
    state: createNextGameState(state, nextCells, { ...state.inventory }),
  };
}

/**
 * 删除已有玩家水管，并把对应型号返还到库存。
 *
 * locked 管道是谜题固定设施，不能删除；该规则由 getTileError 统一保证。
 */
function removePlayerPipe(state, tilePosition) {
  const targetTile = getTileAt(state.cells, tilePosition);
  const tileError = getTileError(targetTile, state.solved, 'pipe');

  if (tileError) {
    return { error: tileError };
  }

  const nextCells = cloneGrid(state.cells);
  const nextInventory = {
    ...state.inventory,
    [targetTile.pipeType]: (state.inventory[targetTile.pipeType] || 0) + 1,
  };

  nextCells[tilePosition.y][tilePosition.x] = { tileType: 'empty' };

  return {
    state: createNextGameState(state, nextCells, nextInventory),
  };
}

// 写接口的成功路径都需要落盘后返回相同响应；集中处理能减少遗漏 save 的风险。
function saveTileActionAndRespond(res, session, nextState) {
  saveGameStateFile(session.filePath, nextState);

  return res
    .status(200)
    .json(createTileActionSuccessResponse(nextState.solved));
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
      board: serializeBoard(session.state),
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
      return res.status(400).json(createFailureResponse('坐标不合法'));
    }

    const parsedBody = parsePutTileBody(req.body);
    if (parsedBody.error) {
      return res.status(400).json(parsedBody.error);
    }

    const session = loadGameState({
      req,
      res,
      storageDir,
    });
    const result = placePlayerPipe(
      session.state,
      tilePosition,
      parsedBody.value.pipeType,
      parsedBody.value.rotation
    );

    if (result.error) {
      return res.status(200).json(result.error);
    }

    return saveTileActionAndRespond(res, session, result.state);
  });

  // PATCH 只读取已有 pipe 的 rotation，其余字段一律忽略。
  router.patch('/tiles/:x/:y', (req, res) => {
    const tilePosition = parseTilePosition(req.params);

    if (!tilePosition) {
      return res.status(400).json(createFailureResponse('坐标不合法'));
    }

    const parsedBody = parsePatchTileBody(req.body);
    if (parsedBody.error) {
      return res.status(400).json(parsedBody.error);
    }

    const session = loadGameState({
      req,
      res,
      storageDir,
    });
    const result = rotatePlayerPipe(
      session.state,
      tilePosition,
      parsedBody.value.rotation
    );

    if (result.error) {
      return res.status(200).json(result.error);
    }

    return saveTileActionAndRespond(res, session, result.state);
  });

  // DELETE 删除已有 pipe，并把对应型号返还回库存。
  router.delete('/tiles/:x/:y', (req, res) => {
    const tilePosition = parseTilePosition(req.params);

    if (!tilePosition) {
      return res.status(400).json(createFailureResponse('坐标不合法'));
    }

    const session = loadGameState({
      req,
      res,
      storageDir,
    });
    const result = removePlayerPipe(session.state, tilePosition);

    if (result.error) {
      return res.status(200).json(result.error);
    }

    return saveTileActionAndRespond(res, session, result.state);
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
