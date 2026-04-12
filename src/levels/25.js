const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SESSION_COOKIE_NAME = 'ops_terminal_sid';
const DEFAULT_FIELD = 'relay_target';
const DEFAULT_VALUE = 'edge-node-1';
const NEXT_LEVEL_FLAG = '26-h7m2q9x4pl';
const STORAGE_DIR = path.join('/tmp', 'iconquestion-level25-sessions');
const STALE_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function ensureStorageDir(storageDir) {
  fs.mkdirSync(storageDir, { recursive: true });
}

function createInitialState(nowIso) {
  return {
    field: DEFAULT_FIELD,
    current_value: DEFAULT_VALUE,
    updated_at: nowIso,
  };
}

function sanitizeSessionId(sessionId) {
  return /^[a-f0-9]{32}$/.test(sessionId) ? sessionId : null;
}

function getSessionFilePath(storageDir, sessionId) {
  return path.join(storageDir, `${sessionId}.json`);
}

function writeState(filePath, state) {
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf8');
}

function readState(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (_err) {
    return null;
  }
}

function cleanupStaleSessions({
  storageDir,
  nowMs = Date.now(),
  ttlMs = STALE_SESSION_TTL_MS,
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
      // 清理逻辑只做机会性回收，不因单个脏文件影响正常请求。
    }
  }
}

function getSessionContext(req, storageDir) {
  const sessionId = sanitizeSessionId(req.cookies?.[SESSION_COOKIE_NAME]);

  if (!sessionId) {
    return null;
  }

  const filePath = getSessionFilePath(storageDir, sessionId);
  const state = readState(filePath);

  if (!state) {
    return null;
  }

  return {
    sessionId,
    filePath,
    state,
  };
}

function createLevel25Router({
  storageDir = STORAGE_DIR,
  now = () => new Date(),
  randomBytes = crypto.randomBytes,
  ttlMs = STALE_SESSION_TTL_MS,
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

  router.post('/login', (req, res) => {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '').trim();

    if (username !== 'admin' || password !== 'admin') {
      return res.status(401).json({
        message: '账号或密码错误。',
      });
    }

    const sessionId = randomBytes(16).toString('hex');
    const state = createInitialState(now().toISOString());

    writeState(getSessionFilePath(storageDir, sessionId), state);

    res.cookie(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
    });

    return res.json({
      message: '登录成功',
      ...state,
    });
  });

  router.get('/state', (req, res) => {
    const session = getSessionContext(req, storageDir);

    if (!session) {
      return res.status(401).json({
        message: '会话已失效，请重新登录。',
      });
    }

    return res.json(session.state);
  });

  router.get('/snapshot-template', (req, res) => {
    const session = getSessionContext(req, storageDir);

    if (!session) {
      return res.status(401).json({
        message: '会话已失效，请重新登录。',
      });
    }

    return res.json({
      field: session.state.field,
      snapshot_id: NEXT_LEVEL_FLAG,
    });
  });

  router.post('/commit', (req, res) => {
    const session = getSessionContext(req, storageDir);

    if (!session) {
      return res.status(401).json({
        message: '会话已失效，请重新登录。',
      });
    }

    const newValue = String(req.body?.new_value || '').trim();

    if (!newValue) {
      return res.status(400).json({
        message: '请输入新的 relay target。',
      });
    }

    const nextState = {
      ...session.state,
      current_value: newValue,
      updated_at: now().toISOString(),
    };

    writeState(session.filePath, nextState);

    return res.json({
      message: '配置已同步',
      ...nextState,
    });
  });

  router.post('/recover', (req, res) => {
    const session = getSessionContext(req, storageDir);

    if (!session) {
      return res.status(401).json({
        message: '会话已失效，请重新登录。',
      });
    }

    const field = String(req.body?.field || '').trim() || DEFAULT_FIELD;
    const oldValue = String(req.body?.old_value || '').trim();
    const newValue = String(req.body?.new_value || '').trim();
    const modifiedAt = String(req.body?.modified_at || '').trim();
    const snapshotId = String(req.body?.snapshot_id || '').trim();

    if (!oldValue || !newValue || !modifiedAt || !snapshotId) {
      return res.status(400).json({
        message: '恢复提交缺少必要字段。',
      });
    }

    const nextState = {
      ...session.state,
      field,
      current_value: newValue,
      updated_at: now().toISOString(),
      last_recovery: {
        old_value: oldValue,
        new_value: newValue,
        modified_at: modifiedAt,
        snapshot_id: snapshotId,
      },
    };

    writeState(session.filePath, nextState);

    return res.json({
      message: '离线快照恢复成功',
      field: nextState.field,
      current_value: nextState.current_value,
      updated_at: nextState.updated_at,
      snapshot_id: snapshotId,
    });
  });

  return router;
}

const router = createLevel25Router();

module.exports = router;
module.exports.createLevel25Router = createLevel25Router;
module.exports.cleanupStaleSessions = cleanupStaleSessions;
module.exports.constants = {
  DEFAULT_FIELD,
  DEFAULT_VALUE,
  NEXT_LEVEL_FLAG,
  SESSION_COOKIE_NAME,
  STORAGE_DIR,
  STALE_SESSION_TTL_MS,
};
