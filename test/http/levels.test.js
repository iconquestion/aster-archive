const express = require('express');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const serveIndex = require('serve-index');
const {
  getDailyPassword,
  getTestRuntime,
} = require('../helpers/createTestApp');
const level04Router = require('../../src/04');
const level05Router = require('../../src/05');
const level06Router = require('../../src/06');
const level07Router = require('../../src/07');
const level12Router = require('../../src/12');
const level14Router = require('../../src/14');
const level16Router = require('../../src/16');
const level18Router = require('../../src/18');
const level20Router = require('../../src/20');
const level22Router = require('../../src/22');
const {
  createLevel25Router,
  constants: level25Constants,
} = require('../../src/25');

function createIsolatedLevelsApp({ level25Options } = {}) {
  const app = express();
  const publicDir = path.join(__dirname, '../../public');
  const level08Dir = path.join(publicDir, '08-c2x8m5q9nv');

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(express.static(publicDir));
  app.use(
    '/08-c2x8m5q9nv/',
    serveIndex(level08Dir, {
      icons: true,
      view: 'details',
    })
  );

  app.use('/api/04', level04Router);
  app.use('/api/05', level05Router);
  app.use('/api/06', level06Router);
  app.use('/api/07', level07Router);
  app.use('/api/12', level12Router);
  app.use('/api/14', level14Router);
  app.use('/api/16', level16Router);
  app.use('/api/18', level18Router);
  app.use('/api/20', level20Router);
  app.use('/api/22', level22Router);
  app.use('/api/25', createLevel25Router(level25Options));

  return app;
}

describe('Config', () => {
  // 测试方式：直接读取测试运行时配置和每日口令，不发 HTTP 请求。
  // 通过标准：关键端口配置必须是数字，应用来源地址必须存在，每日口令必须是四位数字。
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
  const app = createIsolatedLevelsApp();

  // 01-03 为静态资源线索测试，验证文案提示与 HTML/CSS 元数据中的下一关路径。
  // 测试方式：请求 01 页面，同时检查正文叙事和 HTML 注释中是否都带出下一关线索。
  // 通过标准：页面返回 200，且既有入口剧情文案，也有 02 的隐藏路径。
  test('01 ties the entrance story to the hidden 02 clue in HTML comments', async () => {
    const res = await request(app).get('/01-k3f9x2m7qd/');

    expect(res.status).toBe(200);
    expect(res.text).toContain('你决定试试看找到它的入口');
    expect(res.text).toContain('02-v8n2c4z1pa');
  });

  // 测试方式：先请求 02 页面确认它把人引到 CSS，再单独请求 CSS 文件取出真正线索。
  // 通过标准：页面能看到提示文案和 CSS 路径，CSS 文件里能找到 03 的路径。
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

  // 测试方式：请求 03 页面，验证“去 head 里找”的提示和实际 head 中的下一关内容一致。
  // 通过标准：页面返回 200，正文出现故事提示，源码里确实含有 04 的路径。
  test('03 maps the leader head hint to the 04 clue in head metadata', async () => {
    const res = await request(app).get('/03-r5t9m1x8wb/');

    expect(res.status).toBe(200);
    expect(res.text).toContain('领导人Benjamin');
    expect(res.text).toContain('<head>');
    expect(res.text).toContain('04-q7d2s9l4vc');
  });

  // 04-09 主要覆盖普通 HTTP 接口与静态文件线索读取。
  // 测试方式：直接调用 04 的 API，不看响应体，只看自定义响应头。
  // 通过标准：接口返回 200，且 `X-Archive-Next` 头里就是 05 的路径。
  test('04 returns the next clue in the X-Archive-Next header', async () => {
    const res = await request(app).get('/api/04');

    expect(res.status).toBe(200);
    expect(res.headers['x-archive-next']).toBe('05-x1p8z3n6kf');
  });

  // 测试方式：分别用 GET 和 POST 请求同一个接口，验证题目要求的请求方法分支。
  // 通过标准：GET 必须被拒绝并返回提示；POST 必须成功并带出 06 的线索。
  test('05 differentiates between GET and POST challenge branches', async () => {
    const getRes = await request(app).get('/api/05');
    const postRes = await request(app).post('/api/05');

    expect(getRes.status).toBe(400);
    expect(getRes.body.message).toContain('YOU SHALL NOT PASS!!!');
    expect(getRes.body.message).toContain('门似乎并不是很想让你过去');

    expect(postRes.status).toBe(200);
    expect(postRes.body.message).toContain('06-m4v7q2c9ta');
  });

  // 测试方式：同时覆盖页面提示、普通 staff 查询、以及 manager 查询三条路径。
  // 通过标准：页面要暴露查询格式；staff 响应只能给欢迎语，manager 响应才出现 07 线索。
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

  // 测试方式：先看页面上有哪些显式入口，再直接伪造参数访问隐藏地点。
  // 通过标准：默认分支只暗示“管理办公室”存在；命中 manager office 时返回 08 线索。
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

  // 测试方式：覆盖主页、robots.txt 和被 robots 暗示出来的深层静态文件。
  // 通过标准：主页提示站点目录能力，robots 暴露 `/stack`，目标文本文件中含有 09 线索。
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

  // 测试方式：直接请求倒计时脚本文件，验证旧脚本里是否硬编码了下一关。
  // 通过标准：脚本返回 200，内容中出现 10 的路径。
  test('09 keeps the 10 clue in the legacy countdown script', async () => {
    const res = await request(app).get('/js/09.countdown.v1.js');

    expect(res.status).toBe(200);
    expect(res.text).toContain('10-w3n9c6v2mq');
  });

  // 测试方式：请求页面源码，按页面内给出的 hash 规则重建 flag，而不是依赖页面现成结果。
  // 通过标准：先确认源码里存在解题函数，再从日期列表算出固定结果 `zcwl17ouoa`。
  test('10 reconstructs the flag from the custom date hash instead of DOM ids', async () => {
    const res = await request(app).get('/10-w3n9c6v2mq/');

    expect(res.status).toBe(200);
    expect(res.text).toContain('hashDate');
    expect(res.text).toContain('hashToChar');
    expect(res.text).toContain('result = []');

    // 先把页面里十张照片对应的日期全部抠出来，后面完全按题面脚本逻辑自行计算。
    const photoDates = Array.from(
      res.text.matchAll(/<div id="[^"]+">\s*<p>(\d{4}\/\d{2}\/\d{2})<\/p>/g)
    ).map((match) => match[1]);

    expect(photoDates).toHaveLength(10);

    // 这里复刻页面中的哈希算法，目的是证明测试验证的是“解题过程正确”，不是碰巧匹配答案。
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

    // 通过“按日期排序后逐个映射字符”还原出最终 flag。
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

  // 11 依赖多步解码流程，当前先显式标记为跳过，避免误解为漏测。
  test.skip('11 skips the multi-step decoding challenge', () => {});

  // 12-14 涉及表单、Cookie 和认证头，适合保留为进程内集成测试。
  // 测试方式：先提交登录表单拿到认证 Cookie，再带着同一会话访问 room 13。
  // 通过标准：登录必须成功且下发 cookie，随后读取房间信息时必须返回 13 线索。
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

  // 测试方式：先读 sitemap.xml 找隐藏草稿页，再请求草稿页验证真实线索。
  // 通过标准：站点地图里必须暴露草稿地址，草稿页面里必须出现 14 的路径。
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

  // 测试方式：手工构造 `admin:admin` 的 Basic Auth 头访问登录接口。
  // 通过标准：接口接受该认证并在响应体中返回 15 线索。
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
  const tempDirs = [];
  let app;

  beforeEach(() => {
    const level25StorageDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'iconquestion-level25-test-')
    );
    tempDirs.push(level25StorageDir);
    app = createIsolatedLevelsApp({
      level25Options: {
        storageDir: level25StorageDir,
      },
    });
  });

  afterEach(() => {
    for (const tempDir of tempDirs.splice(0)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // 测试方式：为请求补上未来时间点参数和模拟 HTTP/3 的头，验证双条件同时满足时的放行逻辑。
  // 通过标准：接口返回 200，响应消息带出 17 线索。
  test('16 accepts the future timepoint with the simulated HTTP/3 header', async () => {
    const res = await request(app)
      .get('/api/16?timepoint=2077')
      .set('X-Forwarded-Http3', 'h3');

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('17-c8v1n5r2ya');
  });

  // 测试方式：分段发送 Range 请求，把多个响应片段拼起来恢复完整隐藏文本。
  // 通过标准：每段都必须返回 206 和正确的 `Content-Range`，拼接后能读到 19 线索。
  test('18 reconstructs the hidden text from multiple range chunks', async () => {
    const chunks = [];

    for (let start = 80; start <= 143; start += 16) {
      // 每次取 16 字节，最后一段允许服务端按真实长度截断。
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

  // 19 需要字体映射和视觉比对，当前先显式跳过。
  test.skip('19 skips the font mapping / visual comparison challenge', () => {});

  // 测试方式：同一个接口分别验证“答案正确”与“缺少输入”两条主分支。
  // 通过标准：正确答案时返回命中信息和 exact=10；空输入时返回 400 和明确报错。
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

  // 21 依赖 HTTP/2 Early Hints 场景，当前测试环境暂不覆盖，先显式跳过。
  test.skip('21 skips the HTTP/2 Early Hints challenge', () => {});

  // 测试方式：分别用英文 Accept-Language 和默认语言请求，比较接口分支行为。
  // 通过标准：英文分支必须出现 23 线索；默认分支只返回中文提示且不能泄露线索。
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

  // 23 依赖浏览器反调试与 localStorage，当前保留为跳过状态。
  test.skip('23 skips the browser anti-debug / localStorage challenge', () => {});

  // 测试方式：直接读取 feed.xml，验证 RSS/Feed 文件是否承担了藏线索的职责。
  // 通过标准：返回 200，XML 内容中出现 25 的路径。
  test('24 exposes the 25 clue inside feed.xml', async () => {
    const res = await request(app).get('/24-n2w0c9l1t8/feed.xml');

    expect(res.status).toBe(200);
    expect(res.text).toContain('25-v5f2b5h0e9');
  });

  // 测试方式：同时请求关卡主页和同目录下的 service worker，确认提示链路完整。
  // 通过标准：主页必须展示终端和 sw 注册代码，sw 文件本身必须成功返回核心缓存脚本。
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

  // 测试方式：创建两个独立会话，用相同账号登录后分别提交不同值，验证状态是否按会话隔离。
  // 通过标准：两个会话都能登录，但各自读取 `/state` 时只能看到自己提交的值。
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

  // 测试方式：先拉取快照模板拿到合法 snapshot_id，再提交 recover 覆盖当前值。
  // 通过标准：recover 响应和随后 `/state` 查询都必须显示新值已经落盘生效。
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
