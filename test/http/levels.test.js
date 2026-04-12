const express = require('express');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const {
  createTestApp,
  getDailyPassword,
  getTestRuntime,
} = require('../helpers/createTestApp');
const { constants: level25Constants } = require('../../src/25');
const {
  createLevel26Router,
  getSessionFilePath,
  constants: level26Constants,
} = require('../../src/26');

describe('Config', () => {
  test('loads env and required local fixtures', () => {
    const { config } = getTestRuntime();
    const dailyPassword = getDailyPassword();

    expect(config.httpPort).toEqual(expect.any(Number));
    expect(config.httpsPort).toEqual(expect.any(Number));
    expect(config.http2Port).toEqual(expect.any(Number));
    expect(typeof config.appOrigin).toBe('string');
    expect(dailyPassword).toMatch(/^\d{4}$/);
  });
});

describe('Levels 01-14', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  // 01-03 为静态资源线索测试，验证文案提示与 HTML/CSS 元数据中的下一关路径。
  test('01 ties the entrance story to the hidden 02 clue in HTML comments', async () => {
    const res = await request(app).get('/01-k3f9x2m7qd/');

    expect(res.status).toBe(200);
    expect(res.text).toContain('你决定试试看找到它的入口');
    expect(res.text).toContain('02-v8n2c4z1pa');
  });

  test('02 points from the iron gate appearance to the CSS payload clue', async () => {
    const pageRes = await request(app).get('/02-v8n2c4z1pa/');
    const cssRes = await request(app).get('/css/02.css');

    expect(pageRes.status).toBe(200);
    expect(pageRes.text).toContain('那个年代独有的审美风格');
    expect(pageRes.text).toContain('/css/02.css');

    expect(cssRes.status).toBe(200);
    expect(cssRes.text).toContain('font-family');
    expect(cssRes.text).toContain('03-r5t9m1x8wb');
  });

  test('03 maps the leader head hint to the 04 clue in head metadata', async () => {
    const res = await request(app).get('/03-r5t9m1x8wb/');

    expect(res.status).toBe(200);
    expect(res.text).toContain('领导人Benjamin');
    expect(res.text).toContain('<head>');
    expect(res.text).toContain('04-q7d2s9l4vc');
  });

  // 04-09 主要覆盖普通 HTTP 接口与静态文件线索读取。
  test('04 returns the next clue in the X-Archive-Next header', async () => {
    const res = await request(app).get('/api/04');

    expect(res.status).toBe(200);
    expect(res.headers['x-archive-next']).toBe('05-x1p8z3n6kf');
  });

  test('05 differentiates between GET and POST challenge branches', async () => {
    const getRes = await request(app).get('/api/05');
    const postRes = await request(app).post('/api/05');

    expect(getRes.status).toBe(400);
    expect(getRes.body.message).toContain('YOU SHALL NOT PASS!!!');
    expect(getRes.body.message).toContain('门似乎并不是很想让你过去');

    expect(postRes.status).toBe(200);
    expect(postRes.body.message).toContain('06-m4v7q2c9ta');
  });

  test('06 keeps the public staff flow on the page but hides the clue behind manager level', async () => {
    const pageRes = await request(app).get('/06-m4v7q2c9ta/');
    const staffRes = await request(app).get(
      '/api/06?level=staff&fingerprint=test'
    );
    const managerRes = await request(app).get('/api/06?level=manager');

    expect(pageRes.status).toBe(200);
    expect(pageRes.text).toContain('指纹即可自动制作独一无二的工作卡片');
    expect(pageRes.text).toContain('/api/06?level=staff&fingerprint=');

    expect(staffRes.status).toBe(200);
    expect(staffRes.body.message).toContain('Welcome to Aster Archive');
    expect(staffRes.body.message).not.toContain('07-z9k3d6w1rx');

    expect(managerRes.status).toBe(200);
    expect(managerRes.body.message).toContain('Welcome, manager!');
    expect(managerRes.body.message).toContain('07-z9k3d6w1rx');
  });

  test('07 expands the map beyond visible buttons and reveals the manager office clue', async () => {
    const pageRes = await request(app).get('/07-z9k3d6w1rx/');
    const defaultRes = await request(app).get(
      '/api/07?location=visit_anywhere_else'
    );
    const managerRes = await request(app).get(
      '/api/07?location=visit_manager_office'
    );

    expect(pageRes.status).toBe(200);
    expect(pageRes.text).toContain('主览大厅');
    expect(pageRes.text).toContain('公共档案区');
    expect(pageRes.text).toContain('展示长廊');
    expect(pageRes.text).toContain('更多区域正在开发中');

    expect(defaultRes.status).toBe(200);
    expect(defaultRes.body.message).toContain('管理办公室');

    expect(managerRes.status).toBe(200);
    expect(managerRes.body.message).toContain('08-c2x8m5q9nv');
  });

  test('08 exposes both the restricted stack path and the 09 clue', async () => {
    const pageRes = await request(app).get('/08-c2x8m5q9nv/');
    const robotsRes = await request(app).get('/08-c2x8m5q9nv/robots.txt');
    const noteRes = await request(app).get(
      '/08-c2x8m5q9nv/stack/restricted/914/2013-12-31.txt'
    );

    expect(pageRes.status).toBe(200);
    expect(pageRes.text).toContain('独立的网站的根目录');
    expect(pageRes.text).toContain('serveIndex');

    expect(robotsRes.status).toBe(200);
    expect(robotsRes.text).toContain('/stack');

    expect(noteRes.status).toBe(200);
    expect(noteRes.text).toContain('09-t7p1z4k8ds');
  });

  test('09 keeps the 10 clue in the legacy countdown script', async () => {
    const res = await request(app).get('/js/09.countdown.v1.js');

    expect(res.status).toBe(200);
    expect(res.text).toContain('10-w3n9c6v2mq');
  });

  test('10 reconstructs the flag from the custom date hash instead of DOM ids', async () => {
    const res = await request(app).get('/10-w3n9c6v2mq/');

    expect(res.status).toBe(200);
    expect(res.text).toContain('hashDate');
    expect(res.text).toContain('hashToChar');
    expect(res.text).toContain('result = []');

    const photoDates = Array.from(
      res.text.matchAll(/<div id="[^"]+">\s*<p>(\d{4}\/\d{2}\/\d{2})<\/p>/g)
    ).map((match) => match[1]);

    expect(photoDates).toHaveLength(10);

    const alphabet = 'abcdefghijklmnopqrstuvwxyz1234567890';
    const hashDate = (str) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) | 0;
      }
      return hash;
    };
    const hashToChar = (hash) => {
      hash ^= hash >>> 16;
      hash ^= hash << 5;
      return alphabet[Math.abs(hash) % alphabet.length];
    };

    const flag = photoDates
      .map((date) => ({
        date,
        ch: hashToChar(hashDate(date)),
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((item) => item.ch)
      .join('');

    expect(flag).toBe('zcwl17ouoa');
  });

  test.skip('11 skips the multi-step decoding challenge', () => {});

  // 12-14 涉及表单、Cookie 和认证头，适合保留为进程内集成测试。
  test('12 logs in and reads room 13 with the issued auth cookie', async () => {
    const agent = request.agent(app);
    const dailyPassword = getDailyPassword();

    const loginRes = await agent.post('/api/12/login').type('form').send({
      username: 'admin',
      password: dailyPassword,
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.message).toBe('登录成功');
    expect(loginRes.headers['set-cookie'][0]).toContain('bibilabu=');

    const roomRes = await agent.get('/api/12/get_room_info?room_id=13');

    expect(roomRes.status).toBe(200);
    expect(roomRes.body.message).toBe('13-k9c3x6n2tw');
  });

  test('13 exposes the hidden draft page through sitemap.xml', async () => {
    const sitemapRes = await request(app).get('/13-k9c3x6n2tw/sitemap.xml');
    const draftRes = await request(app).get(
      '/13-k9c3x6n2tw/gallery/__draft__k9a2.html'
    );

    expect(sitemapRes.status).toBe(200);
    expect(sitemapRes.text).toContain('gallery/__draft__k9a2');

    expect(draftRes.status).toBe(200);
    expect(draftRes.text).toContain('14-p5v8d1q7mz');
  });

  test('14 accepts admin basic auth and returns the 15 clue', async () => {
    const basicToken = Buffer.from('admin:admin').toString('base64');
    const res = await request(app)
      .post('/api/14/login')
      .set('Authorization', `Basic ${basicToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('15-x2m9k4c6ra');
  });
});

describe('Levels 16-25', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  test('16 accepts the future timepoint with the simulated HTTP/3 header', async () => {
    const res = await request(app)
      .get('/api/16?timepoint=2077')
      .set('X-Forwarded-Http3', 'h3');

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('17-c8v1n5r2ya');
  });

  test('18 reconstructs the hidden text from multiple range chunks', async () => {
    const chunks = [];

    for (let start = 80; start <= 143; start += 16) {
      const end = start + 15;
      const expectedEnd = Math.min(end, 137);
      const res = await request(app)
        .get('/api/18')
        .set('Range', `bytes=${start}-${end}`);

      expect(res.status).toBe(206);
      expect(res.body.message).toEqual(expect.any(String));
      expect(res.headers['content-range']).toBe(
        `bytes ${start}-${expectedEnd}/138`
      );
      expect(res.headers['content-type']).toContain('application/json');
      expect(res.headers['x-puzzle-range-format']).toBe('json');

      chunks.push(res.body.message);
    }

    expect(chunks.join('')).toContain('19-h9m4q2z8xc');
  });

  test.skip('19 skips the font mapping / visual comparison challenge', () => {});

  test('20 validates both the correct guess flow and empty input handling', async () => {
    const correctRes = await request(app)
      .post('/api/20')
      .send({ guess: 't8d0v9c2c4' });

    expect(correctRes.status).toBe(200);
    expect(correctRes.body.isCorrect).toBe(true);
    expect(correctRes.body.exact).toBe(10);
    expect(correctRes.body.message).toContain('t8d0v9c2c4');

    const emptyRes = await request(app).post('/api/20').send({});

    expect(emptyRes.status).toBe(400);
    expect(emptyRes.body.message).toBe('请输入要猜测的 flag。');
  });

  test.skip('21 skips the HTTP/2 Early Hints challenge', () => {});

  test('22 returns different content for English and default language branches', async () => {
    const englishRes = await request(app)
      .get('/api/22')
      .set('Accept-Language', 'en-US,en;q=0.9');
    const defaultRes = await request(app).get('/api/22');

    expect(englishRes.status).toBe(200);
    expect(englishRes.body.message).toContain('23-f6y5v4v0k0');

    expect(defaultRes.status).toBe(200);
    expect(defaultRes.body.message).toContain('国际宾客厅');
    expect(defaultRes.body.message).not.toContain('23-f6y5v4v0k0');
  });

  test.skip('23 skips the browser anti-debug / localStorage challenge', () => {});

  test('24 exposes the 25 clue inside feed.xml', async () => {
    const res = await request(app).get('/24-n2w0c9l1t8/feed.xml');

    expect(res.status).toBe(200);
    expect(res.text).toContain('25-v5f2b5h0e9');
  });

  test('25 serves the terminal page and the scoped service worker asset', async () => {
    const pageRes = await request(app).get('/25-v5f2b5h0e9/');
    const swRes = await request(app).get('/25-v5f2b5h0e9/sw.js');

    expect(pageRes.status).toBe(200);
    expect(pageRes.text).toContain('运维恢复终端');
    expect(pageRes.text).toContain(
      "navigator.serviceWorker.register('./sw.js'"
    );

    expect(swRes.status).toBe(200);
    expect(swRes.text).toContain("const CACHE_NAME = 'level-25-terminal-v1'");
  });

  test('25 stores per-session state behind a shared admin/admin login', async () => {
    const agentA = request.agent(app);
    const agentB = request.agent(app);

    const loginA = await agentA.post('/api/25/login').send({
      username: 'admin',
      password: 'admin',
    });
    const loginB = await agentB.post('/api/25/login').send({
      username: 'admin',
      password: 'admin',
    });

    expect(loginA.status).toBe(200);
    expect(loginA.headers['set-cookie'][0]).toContain(
      `${level25Constants.SESSION_COOKIE_NAME}=`
    );
    expect(loginB.status).toBe(200);

    await agentA.post('/api/25/commit').send({
      new_value: 'edge-node-7',
    });
    await agentB.post('/api/25/commit').send({
      new_value: 'edge-node-8',
    });

    const stateA = await agentA.get('/api/25/state');
    const stateB = await agentB.get('/api/25/state');

    expect(stateA.status).toBe(200);
    expect(stateA.body.field).toBe(level25Constants.DEFAULT_FIELD);
    expect(stateA.body.current_value).toBe('edge-node-7');

    expect(stateB.status).toBe(200);
    expect(stateB.body.current_value).toBe('edge-node-8');
  });

  test('25 recovery overwrites the stored value with the snapshot payload', async () => {
    const agent = request.agent(app);

    await agent.post('/api/25/login').send({
      username: 'admin',
      password: 'admin',
    });

    const templateRes = await agent.get('/api/25/snapshot-template');

    expect(templateRes.status).toBe(200);
    expect(templateRes.body.snapshot_id).toBe(level25Constants.NEXT_LEVEL_FLAG);

    const recoverRes = await agent.post('/api/25/recover').send({
      field: level25Constants.DEFAULT_FIELD,
      old_value: level25Constants.DEFAULT_VALUE,
      new_value: 'edge-node-9',
      modified_at: '2026-04-07T12:34:56.000Z',
      snapshot_id: level25Constants.NEXT_LEVEL_FLAG,
    });

    expect(recoverRes.status).toBe(200);
    expect(recoverRes.body.snapshot_id).toBe(level25Constants.NEXT_LEVEL_FLAG);
    expect(recoverRes.body.current_value).toBe('edge-node-9');

    const stateRes = await agent.get('/api/25/state');

    expect(stateRes.status).toBe(200);
    expect(stateRes.body.current_value).toBe('edge-node-9');
  });
});

describe('Level 26', () => {
  let app;
  const tempDirs = [];

  beforeAll(() => {
    app = createTestApp();
  });

  afterEach(() => {
    for (const tempDir of tempDirs.splice(0)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('26 board api returns the puzzle state payload', async () => {
    const agent = request.agent(app);
    const res = await agent.get('/api/26/board');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.board.width).toBe(10);
    expect(res.body.board.height).toBe(10);
    expect(Array.isArray(res.body.board.tiles)).toBe(true);
    expect(res.body.inventory).toEqual(
      expect.objectContaining({
        straight: expect.any(Number),
        elbow: expect.any(Number),
        tee: expect.any(Number),
      })
    );
  });

  test('26 new board only exposes locked preset pipes', async () => {
    const agent = request.agent(app);
    const boardRes = await agent.get('/api/26/board');

    expect(boardRes.status).toBe(200);
    expect(boardRes.body.success).toBe(true);

    const editablePresetPipe = boardRes.body.board.tiles.find(
      (tile) => tile.tileType === 'pipe' && tile.locked === false
    );

    expect(editablePresetPipe).toBeUndefined();
  });

  test('26 patch still accepts absolute rotations for player placed pipes', async () => {
    const agent = request.agent(app);
    const boardRes = await agent.get('/api/26/board');

    expect(boardRes.status).toBe(200);
    expect(boardRes.body.success).toBe(true);

    const placeableType = Object.entries(boardRes.body.inventory).find(
      ([, count]) => count > 0
    )?.[0];
    const emptyTile = boardRes.body.board.tiles.find(
      (tile) => tile.tileType === 'empty'
    );

    expect(placeableType).toBeDefined();
    expect(emptyTile).toBeDefined();

    const putRes = await agent
      .put(`/api/26/tiles/${emptyTile.x}/${emptyTile.y}`)
      .send({ pipeType: placeableType, rotation: 0 });

    expect(putRes.status).toBe(200);
    expect(putRes.body.success).toBe(true);

    const patchRes = await agent
      .patch(`/api/26/tiles/${emptyTile.x}/${emptyTile.y}`)
      .send({ rotation: 270 });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.success).toBe(true);
  });

  test('26 reset creates a new board while keeping the same session uuid', async () => {
    const storageDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'iconquestion-level26-test-')
    );
    tempDirs.push(storageDir);
    let nowMs = Date.parse('2026-04-12T00:00:00.000Z');
    const now = () => new Date(nowMs);
    let randomByteCalls = 0;
    const randomBytes = (size) => {
      randomByteCalls += 1;
      return Buffer.alloc(size, randomByteCalls);
    };

    const sequence = [
      1, 0, 0, 0, 1, 2, 0, 1, 2, 0, 2, 1, 0, 0, 1, 3, 0, 1, 2, 0, 1, 2, 1, 0, 3,
      2, 0, 1, 0, 1, 0, 1,
    ];
    let randomIndex = 0;
    const randomInt = (max) => {
      const value = sequence[randomIndex] ?? 0;
      randomIndex += 1;
      return value % max;
    };

    const testApp = express();
    testApp.use(express.json());
    testApp.use(cookieParser());
    testApp.use(
      '/api/26',
      createLevel26Router({
        storageDir,
        now,
        randomBytes,
        randomInt,
      })
    );

    const agent = request.agent(testApp);
    const boardRes = await agent.get('/api/26/board');
    const firstCookie = boardRes.headers['set-cookie'][0];
    const firstSessionId = /relay_pipe_sid=([^;]+)/.exec(firstCookie)?.[1];

    expect(boardRes.status).toBe(200);
    expect(firstSessionId).toMatch(/^[a-f0-9]{32}$/);

    nowMs += 1000;

    const resetRes = await agent.post('/api/26/reset');
    const resetCookie = resetRes.headers['set-cookie'][0];
    const resetSessionId = /relay_pipe_sid=([^;]+)/.exec(resetCookie)?.[1];

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);
    expect(resetRes.body.message).toBe('操作成功');
    expect(resetSessionId).toBe(firstSessionId);

    const nextBoardRes = await agent.get('/api/26/board');

    expect(nextBoardRes.status).toBe(200);
    expect(nextBoardRes.body.board).not.toEqual(boardRes.body.board);
  });

  test('26 flag api only returns the next flag after the solved session is verified by cookie', async () => {
    const storageDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'iconquestion-level26-flag-test-')
    );
    tempDirs.push(storageDir);
    const testApp = express();
    testApp.use(express.json());
    testApp.use(cookieParser());
    testApp.use(
      '/api/26',
      createLevel26Router({
        storageDir,
      })
    );

    const agent = request.agent(testApp);
    const boardRes = await agent.get('/api/26/board');
    const sessionCookie = boardRes.headers['set-cookie'][0];
    const sessionId = new RegExp(
      `${level26Constants.SESSION_COOKIE_NAME}=([^;]+)`
    ).exec(sessionCookie)?.[1];

    expect(boardRes.status).toBe(200);
    expect(sessionId).toMatch(/^[a-f0-9]{32}$/);

    const unsolvedFlagRes = await agent.get('/api/26/flag');

    expect(unsolvedFlagRes.status).toBe(403);
    expect(unsolvedFlagRes.body.success).toBe(false);

    // 直接修改会话文件，验证 /flag 的权限边界只依赖当前 cookie 对应的解谜状态。
    const sessionFile = getSessionFilePath(storageDir, sessionId);
    const serializedState = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
    serializedState.solved = true;
    fs.writeFileSync(
      sessionFile,
      JSON.stringify(serializedState, null, 2),
      'utf8'
    );

    const solvedFlagRes = await agent.get('/api/26/flag');

    expect(solvedFlagRes.status).toBe(200);
    expect(solvedFlagRes.body.success).toBe(true);
    expect(solvedFlagRes.body.message).toBe(level26Constants.NEXT_LEVEL_FLAG);
  });
});
