const request = require('supertest');
const {
  createTestApp,
  getDailyPassword,
  getTestRuntime,
} = require('../helpers/createTestApp');
const { constants: level25Constants } = require('../../src/25');

describe('Config', () => {
  test('loads env and required local fixtures', () => {
    const { config, passwordFilePath } = getTestRuntime();

    expect(config.httpPort).toEqual(expect.any(Number));
    expect(config.httpsPort).toEqual(expect.any(Number));
    expect(config.http2Port).toEqual(expect.any(Number));
    expect(typeof config.appOrigin).toBe('string');
    expect(passwordFilePath).toContain('password.xdxdxdxd');
  });
});

describe('Levels 01-14', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  // 01-03 为静态资源线索测试，验证隐藏在 HTML/CSS 元数据中的下一关路径。
  test('01 exposes the 02 clue in HTML comments', async () => {
    const res = await request(app).get('/01-k3f9x2m7qd/');

    expect(res.status).toBe(200);
    expect(res.text).toContain('<!-- 02-v8n2c4z1pa -->');
  });

  test('02 exposes the 03 clue in the CSS payload', async () => {
    const res = await request(app).get('/css/02.css');

    expect(res.status).toBe(200);
    expect(res.text).toContain('03-r5t9m1x8wb');
  });

  test('03 exposes the 04 clue in page metadata', async () => {
    const res = await request(app).get('/03-r5t9m1x8wb/');

    expect(res.status).toBe(200);
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

    expect(getRes.status).toBe(200);
    expect(getRes.body.message).toBe('YOU SHALL NOT PASS!!!');

    expect(postRes.status).toBe(200);
    expect(postRes.body.message).toContain('06-m4v7q2c9ta');
  });

  test('06 identifies the admin query parameter', async () => {
    const res = await request(app).get('/api/06?level=admin');

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Your identity: admin');
  });

  test('07 reveals the 08 clue for the admin office location', async () => {
    const res = await request(app).get('/api/07?location=visit_admin_office');

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('c2x8m5q9nv');
  });

  test('08 exposes both the restricted stack path and the 09 clue', async () => {
    const robotsRes = await request(app).get('/08-c2x8m5q9nv/robots.txt');
    const noteRes = await request(app).get(
      '/08-c2x8m5q9nv/stack/restricted/914/2013-12-31.txt'
    );

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

  test.skip('10 skips the algorithm reconstruction challenge', () => {});

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
