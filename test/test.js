const https = require('https');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const dotenv = require('dotenv');

// 测试配置读取与校验
// 测试入口与应用入口保持一致，统一从 `.env` 严格加载关键参数。
function requireEnv(name) {
  const value = process.env[name];

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

// 读取必填整数配置；仅接受可解析的整数值。
function requireIntegerEnv(name) {
  const value = requireEnv(name);
  if (!/^-?\d+$/.test(value)) {
    throw new Error(
      `Environment variable ${name} must be an integer, received: ${value}`
    );
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed)) {
    throw new Error(
      `Environment variable ${name} must be an integer, received: ${value}`
    );
  }

  return parsed;
}

// 校验测试依赖的本地文件是否存在。
function requireExistingPath(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} does not exist: ${filePath}`);
  }

  return filePath;
}

// 加载测试运行所需的环境配置。
// 若 `.env` 缺失、值为空或关键文件不存在，测试应立即失败，而不是在后续用例中产生连锁噪音。
function loadTestConfig() {
  const envPath = path.join(__dirname, '../config/.env');
  const envResult = dotenv.config({ path: envPath });

  if (envResult.error) {
    throw new Error(
      `Failed to load env file at ${envPath}: ${envResult.error.message}`
    );
  }

  const appOrigin = requireEnv('APP_ORIGIN');
  const originUrl = new URL(appOrigin);
  const passwordFilePath = requireExistingPath(
    path.join(__dirname, '../public/12-d1q7m4z8pv/password.xdxdxdxd'),
    'Daily password file'
  );
  const appPort = originUrl.port
    ? Number.parseInt(originUrl.port, 10)
    : originUrl.protocol === 'https:'
      ? 443
      : 80;

  if (!Number.isInteger(appPort)) {
    throw new Error(
      `Unable to determine valid port from APP_ORIGIN: ${appOrigin}`
    );
  }

  return {
    envPath,
    appOrigin,
    host: originUrl.hostname,
    appPort,
    httpsPort: requireIntegerEnv('HTTPS_PORT'),
    passwordFilePath,
  };
}

let testConfig = null;

// 统一断言工具，用于补充更清晰的失败信息。
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message, details) {
  if (!condition) {
    const detailText = details
      ? `\nDetails: ${JSON.stringify(details, null, 2)}`
      : '';
    throw new Error(`${message}${detailText}`);
  }
}

// 统一封装 HTTPS 请求，供各关卡测试复用。
function httpRequest({ method = 'GET', route, headers = {}, body, port }) {
  if (!testConfig) {
    throw new Error('Test config has not been loaded');
  }

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: testConfig.host,
        port: port ?? testConfig.appPort,
        path: route,
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          let json;
          try {
            json = data ? JSON.parse(data) : null;
          } catch (_err) {
            json = null;
          }

          resolve({
            status: res.statusCode,
            headers: res.headers,
            trailers: res.trailers,
            bodyText: data,
            bodyJson: json,
          });
        });
      }
    );

    req.on('error', reject);

    if (body !== undefined && body !== null) {
      req.write(body);
    }

    req.end();
  });
}

// 统一封装 WebSocket 连接测试。
function testWebSocket(route) {
  if (!testConfig) {
    throw new Error('Test config has not been loaded');
  }

  return new Promise((resolve, reject) => {
    const wsPortSuffix =
      testConfig.appPort === 443 ? '' : `:${testConfig.appPort}`;
    const ws = new WebSocket(`wss://${testConfig.host}${wsPortSuffix}${route}`);
    const timer = setTimeout(() => {
      ws.terminate();
      reject(new Error('WebSocket timeout after 5s'));
    }, 5000);

    ws.on('message', (raw) => {
      clearTimeout(timer);
      try {
        const text = raw.toString();
        const payload = JSON.parse(text);
        resolve(payload);
      } catch (err) {
        reject(new Error(`WebSocket message parse failed: ${err.message}`));
      } finally {
        ws.close();
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function getChalk() {
  const mod = await import('chalk');
  return mod.default || mod;
}

// 测试主流程
// 先执行配置检查，再按顺序运行各关卡测试，并在末尾汇总结果。
async function run() {
  const chalk = await getChalk();
  const colorStatus = (status) => {
    if (status === 'PASSED') return chalk.green(status);
    if (status === 'SKIPPED') return chalk.yellow(status);
    return chalk.red(status);
  };
  const printResult = (item) => {
    const routes = Array.isArray(item.route) ? item.route : [item.route];
    console.log(`[${item.level}] ${colorStatus(item.status)}`);
    for (const route of routes) {
      console.log(`  ${route}`);
    }
    if (item.status === 'SKIPPED' && item.note) {
      console.log(chalk.yellow(`  Note: ${item.note}`));
    }
    if (item.status === 'FAILED') {
      console.error(chalk.red(`  Error: ${item.error.message}`));
      if (item.error.stack) {
        console.error(chalk.red(`  Stack: ${item.error.stack}`));
      }
    }
  };

  const routeResults = [];

  const routeCases = [
    {
      level: 'CONFIG',
      route: ['Load test env'],
      // 测试方法：加载 `.env`，并校验测试依赖的关键配置与本地文件是否存在且格式合法。
      // 成功条件：环境变量读取成功，必填项不为空，端口可解析，密码文件存在。
      // 失败条件：`.env` 缺失、变量为空、端口非法，或依赖文件不存在。
      run: async () => {
        testConfig = loadTestConfig();
      },
    },
    // 测试方法：请求 01 关静态页，检查 HTML 注释中隐藏的下一关路径。
    // 成功条件：返回 200，且正文包含 `<!-- 02-v8n2c4z1pa -->`。
    // 失败条件：请求失败、状态码不是 200，或 HTML 注释中缺少下一关线索。
    {
      level: '01',
      route: ['GET /01-k3f9x2m7qd/'],
      run: async () => {
        const res = await httpRequest({ route: '/01-k3f9x2m7qd/' });
        assert(res.status === 200, 'Expected status 200', res);
        assert(
          typeof res.bodyText === 'string' &&
            res.bodyText.includes('<!-- 02-v8n2c4z1pa -->'),
          'HTML comment does not include 02 clue',
          res.bodyText
        );
      },
    },
    // 测试方法：直接请求 02 关使用的 CSS 文件，验证样式声明中夹带的下一关线索。
    // 成功条件：返回 200，且 `font-family` 声明中包含 `03-r5t9m1x8wb`。
    // 失败条件：请求失败、状态码不是 200，或 CSS 内容未包含下一关路径。
    {
      level: '02',
      route: ['GET /css/02.css'],
      run: async () => {
        const res = await httpRequest({ route: '/css/02.css' });
        assert(res.status === 200, 'Expected status 200', res);
        assert(
          typeof res.bodyText === 'string' &&
            res.bodyText.includes('03-r5t9m1x8wb'),
          'CSS does not include 03 clue',
          res.bodyText
        );
      },
    },
    // 测试方法：请求 03 关静态页，检查 `<head>` 中的版本元数据是否暴露下一关线索。
    // 成功条件：返回 200，且存在 `<meta name="version" content="04-q7d2s9l4vc">`。
    // 失败条件：请求失败、状态码不是 200，或页面元数据缺失/错误。
    {
      level: '03',
      route: ['GET /03-r5t9m1x8wb/'],
      run: async () => {
        const res = await httpRequest({ route: '/03-r5t9m1x8wb/' });
        assert(res.status === 200, 'Expected status 200', res);
        assert(
          typeof res.bodyText === 'string' &&
            res.bodyText.includes(
              '<meta name="version" content="04-q7d2s9l4vc">'
            ),
          'Meta version tag does not include 04 clue',
          res.bodyText
        );
      },
    },
    // 测试方法：向 `/api/04` 发起 GET 请求，检查响应头中的下一关线索。
    // 成功条件：返回 200，且 `X-Archive-Next` 头精确等于 `05-x1p8z3n6kf`。
    // 失败条件：请求失败、状态码不是 200，或响应头缺失/值错误。
    {
      level: '04',
      route: ['GET /api/04'],
      run: async () => {
        const res = await httpRequest({ route: '/api/04' });
        assert(res.status === 200, 'Expected status 200', res);
        assert(
          res.headers['x-archive-next'] === '05-x1p8z3n6kf',
          'Missing or wrong X-Archive-Next header',
          res.headers
        );
      },
    },
    // 测试方法：在同一测试块内分别向 `/api/05` 发起 GET 和 POST 请求，验证方法差异对应的两种题面行为。
    // 成功条件：GET 返回 200 且消息精确等于 `YOU SHALL NOT PASS!!!`；POST 返回 200 且消息中包含 `06-m4v7q2c9ta`。
    // 失败条件：任一请求失败、状态码不正确，或 GET/POST 任一分支的响应内容不符合预期。
    {
      level: '05',
      route: ['GET /api/05', 'POST /api/05'],
      run: async () => {
        const getRes = await httpRequest({ route: '/api/05' });
        assert(getRes.status === 200, 'Expected GET status 200', getRes);
        assert(
          getRes.bodyJson &&
            getRes.bodyJson.message === 'YOU SHALL NOT PASS!!!',
          'Unexpected GET response message',
          getRes.bodyJson || getRes.bodyText
        );

        const postRes = await httpRequest({ method: 'POST', route: '/api/05' });
        assert(postRes.status === 200, 'Expected POST status 200', postRes);
        assert(
          postRes.bodyJson &&
            typeof postRes.bodyJson.message === 'string' &&
            postRes.bodyJson.message.includes('06-m4v7q2c9ta'),
          'POST response does not include next level clue',
          postRes.bodyJson || postRes.bodyText
        );
      },
    },
    // 测试方法：向 `/api/06?level=admin` 发起 GET 请求，模拟通过查询参数声明身份。
    // 成功条件：返回 200，且响应消息中包含 `Your identity: admin`。
    // 失败条件：请求失败、状态码不是 200，或响应未识别管理员身份。
    {
      level: '06',
      route: ['GET /api/06?level=admin'],
      run: async () => {
        const res = await httpRequest({ route: '/api/06?level=admin' });
        assert(res.status === 200, 'Expected status 200', res);
        assert(
          res.bodyJson &&
            typeof res.bodyJson.message === 'string' &&
            res.bodyJson.message.includes('Your identity: admin'),
          'Response does not identify admin',
          res.bodyJson || res.bodyText
        );
      },
    },
    // 测试方法：向 `/api/07?location=visit_admin_office` 发起 GET 请求，验证指定位置参数会泄露 08 关线索。
    // 成功条件：返回 200，且响应消息中包含 `c2x8m5q9nv`。
    // 失败条件：请求失败、状态码不是 200，或响应中未包含 08 关标识。
    {
      level: '07',
      route: ['GET /api/07?location=visit_admin_office'],
      run: async () => {
        const res = await httpRequest({
          route: '/api/07?location=visit_admin_office',
        });
        assert(res.status === 200, 'Expected status 200', res);
        assert(
          res.bodyJson &&
            typeof res.bodyJson.message === 'string' &&
            res.bodyJson.message.includes('c2x8m5q9nv'),
          'Response does not include 08 clue',
          res.bodyJson || res.bodyText
        );
      },
    },
    // 测试方法：先读取 08 关目录下的 `robots.txt`，确认其中暴露 `/stack` 目录，再直接请求深层文本文件验证 09 关线索。
    // 成功条件：`robots.txt` 返回 200 且包含 `/stack`；深层文本文件返回 200 且正文包含 `09-t7p1z4k8ds`。
    // 失败条件：任一请求失败、状态码不正确、`robots.txt` 未暴露关键目录，或深层文本中未出现下一关路径。
    {
      level: '08',
      route: [
        'GET /08-c2x8m5q9nv/robots.txt',
        'GET /08-c2x8m5q9nv/stack/restricted/914/2013-12-31.txt',
      ],
      run: async () => {
        const robotsRes = await httpRequest({
          route: '/08-c2x8m5q9nv/robots.txt',
        });
        assert(
          robotsRes.status === 200,
          'Expected robots.txt status 200',
          robotsRes
        );
        assert(
          typeof robotsRes.bodyText === 'string' &&
            robotsRes.bodyText.includes('/stack'),
          'robots.txt does not expose /stack',
          robotsRes.bodyText
        );

        const noteRes = await httpRequest({
          route: '/08-c2x8m5q9nv/stack/restricted/914/2013-12-31.txt',
        });
        assert(
          noteRes.status === 200,
          'Expected archive note status 200',
          noteRes
        );
        assert(
          typeof noteRes.bodyText === 'string' &&
            noteRes.bodyText.includes('09-t7p1z4k8ds'),
          'Restricted archive note does not include 09 clue',
          noteRes.bodyText
        );
      },
    },
    // 测试方法：请求倒计时脚本的旧版本文件，验证许可证注释中是否保留了 10 关线索。
    // 成功条件：返回 200，且脚本文本包含 `10-w3n9c6v2mq`。
    // 失败条件：请求失败、状态码不是 200，或旧版脚本未包含下一关路径。
    {
      level: '09',
      route: ['GET /js/09.countdown.v1.js'],
      run: async () => {
        const res = await httpRequest({ route: '/js/09.countdown.v1.js' });
        assert(res.status === 200, 'Expected status 200', res);
        assert(
          typeof res.bodyText === 'string' &&
            res.bodyText.includes('10-w3n9c6v2mq'),
          'Legacy countdown script does not include 10 clue',
          res.bodyText
        );
      },
    },
    // 占位符：10 关涉及页面脚本补全与结果推导，当前不纳入自动测试，仅在报告中显式标记为跳过。
    {
      level: '10',
      route: ['SKIPPED /10-w3n9c6v2mq/'],
      skip: true,
      note: 'Algorithm reconstruction challenge intentionally skipped.',
      run: async () => {},
    },
    // 占位符：11 关涉及多层编码链路解码，当前不纳入自动测试，仅在报告中显式标记为跳过。
    {
      level: '11',
      route: ['SKIPPED /11-zcwl17ouoa/'],
      skip: true,
      note: 'Multi-step decoding challenge intentionally skipped.',
      run: async () => {},
    },
    // 测试方法：先读取每日密码文件并调用 `/api/12/login` 获取认证 Cookie，再在同一测试块内携带该 Cookie 请求 `/api/12/get_room_info?room_id=13`。
    // 成功条件：登录请求返回 200 且消息为 `登录成功`，同时返回 `bibilabu=` 开头的 Cookie；房间信息请求返回 200 且消息精确等于 `13-k9c3x6n2tw`。
    // 失败条件：密码文件读取失败、登录或房间请求失败、状态码不正确、未拿到预期 Cookie，或房间信息与预期不一致。
    {
      level: '12',
      route: ['POST /api/12/login', 'GET /api/12/get_room_info?room_id=13'],
      run: async () => {
        const dailyPassword = fs
          .readFileSync(testConfig.passwordFilePath, 'utf8')
          .trim();
        const formData = new URLSearchParams({
          username: 'admin',
          password: dailyPassword,
        }).toString();

        const res = await httpRequest({
          method: 'POST',
          route: '/api/12/login',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(formData),
          },
          body: formData,
        });

        assert(res.status === 200, 'Expected status 200', res);
        assert(
          res.bodyJson && res.bodyJson.message === '登录成功',
          'Login failed unexpectedly',
          res.bodyJson || res.bodyText
        );

        const setCookie = res.headers['set-cookie'];
        assert(
          Array.isArray(setCookie) && setCookie.length > 0,
          'Expected Set-Cookie header',
          res.headers
        );

        const authCookie = setCookie[0].split(';')[0];
        assert(authCookie.startsWith('bibilabu='), 'Unexpected cookie name', {
          authCookie,
          setCookie,
        });

        const roomRes = await httpRequest({
          route: '/api/12/get_room_info?room_id=13',
          headers: {
            Cookie: authCookie,
          },
        });
        assert(
          roomRes.status === 200,
          'Expected room info status 200',
          roomRes
        );
        assert(
          roomRes.bodyJson && roomRes.bodyJson.message === '13-k9c3x6n2tw',
          'Unexpected room info response',
          roomRes.bodyJson || roomRes.bodyText
        );
      },
    },
    // 测试方法：先请求 `sitemap.xml`，确认隐藏草稿页已被列出，再访问草稿页并检查 HTML 注释中的下一关线索。
    // 成功条件：`sitemap.xml` 返回 200 且包含 `gallery/__draft__k9a2`；草稿页返回 200 且正文包含 `14-p5v8d1q7mz`。
    // 失败条件：任一请求失败、状态码不正确、站点地图未列出隐藏页，或草稿页注释中缺少下一关路径。
    {
      level: '13',
      route: [
        'GET /13-k9c3x6n2tw/sitemap.xml',
        'GET /13-k9c3x6n2tw/gallery/__draft__k9a2.html',
      ],
      run: async () => {
        const sitemapRes = await httpRequest({
          route: '/13-k9c3x6n2tw/sitemap.xml',
        });
        assert(
          sitemapRes.status === 200,
          'Expected sitemap status 200',
          sitemapRes
        );
        assert(
          typeof sitemapRes.bodyText === 'string' &&
            sitemapRes.bodyText.includes('gallery/__draft__k9a2'),
          'Sitemap does not list hidden draft page',
          sitemapRes.bodyText
        );

        const draftRes = await httpRequest({
          route: '/13-k9c3x6n2tw/gallery/__draft__k9a2.html',
        });
        assert(
          draftRes.status === 200,
          'Expected draft page status 200',
          draftRes
        );
        assert(
          typeof draftRes.bodyText === 'string' &&
            draftRes.bodyText.includes('14-p5v8d1q7mz'),
          'Draft page does not include 14 clue',
          draftRes.bodyText
        );
      },
    },
    // 测试方法：构造 `admin:admin` 的 Basic Auth，向 `/api/14/login` 发起 POST 请求。
    // 成功条件：返回 200，且响应消息中包含 `15-x2m9k4c6ra`。
    // 失败条件：请求失败、状态码不是 200，或响应中未包含下一关线索。
    {
      level: '14',
      route: ['POST /api/14/login'],
      run: async () => {
        const basicToken = Buffer.from('admin:admin').toString('base64');
        const res = await httpRequest({
          method: 'POST',
          route: '/api/14/login',
          headers: {
            Authorization: `Basic ${basicToken}`,
          },
        });
        assert(res.status === 200, 'Expected status 200', res);
        assert(
          res.bodyJson &&
            typeof res.bodyJson.message === 'string' &&
            res.bodyJson.message.includes('15-x2m9k4c6ra'),
          'Response does not include next level clue',
          res.bodyJson || res.bodyText
        );
      },
    },
    // 测试方法：连接 `/api/15/challenge` WebSocket 端点，检查连接建立后的首条消息。
    // 成功条件：成功建立连接，且首条消息中包含 `WebSocket connected`。
    // 失败条件：连接失败、超时、消息不是合法 JSON，或首条消息内容不符合预期。
    {
      level: '15',
      route: ['WS /api/15/challenge'],
      run: async () => {
        const payload = await testWebSocket('/api/15/challenge');
        assert(
          payload &&
            typeof payload.message === 'string' &&
            payload.message.includes('WebSocket connected'),
          'Unexpected WebSocket message',
          payload
        );
      },
    },
    // 测试方法：向 `/api/16?timepoint=2077` 发起 GET 请求，并带上 `X-Forwarded-Http3: h3` 头模拟题面要求。
    // 成功条件：返回 200，且响应消息中包含 `17-c8v1n5r2ya`。
    // 失败条件：请求失败、状态码不是 200，或响应中未包含 17 关线索。
    {
      level: '16',
      route: ['GET /api/16?timepoint=2077'],
      run: async () => {
        const res = await httpRequest({
          route: '/api/16?timepoint=2077',
          headers: {
            'X-Forwarded-Http3': 'h3',
          },
        });

        assert(res.status === 200, 'Expected status 200', res);
        assert(
          res.bodyJson &&
            typeof res.bodyJson.message === 'string' &&
            res.bodyJson.message.includes('17-c8v1n5r2ya'),
          'Response does not include 17 clue',
          res.bodyJson || res.bodyText
        );
      },
    },
    // 测试方法：通过独立 HTTPS 端口请求 `/api/17`，检查 Trailer 声明头及响应结束后的 Trailer 内容。
    // 成功条件：返回 200，`Trailer` 头声明了 `X-Never-Be-Apart`，且对应 Trailer 值中包含 `18-p3t7w0j6kd`。
    // 失败条件：请求失败、状态码不是 200、缺少 Trailer 声明头，或最终 Trailer 中未包含下一关线索。
    {
      level: '17',
      route: ['GET /api/17'],
      run: async () => {
        const res = await httpRequest({
          route: '/api/17',
          port: testConfig.httpsPort,
        });
        assert(res.status === 200, 'Expected status 200', res);

        const trailerHeader = res.headers['trailer'];
        assert(
          typeof trailerHeader === 'string' &&
            trailerHeader.toLowerCase().includes('x-never-be-apart'),
          'Missing Trailer declaration header',
          res.headers
        );

        const trailerValue = res.trailers && res.trailers['x-never-be-apart'];
        assert(
          typeof trailerValue === 'string' &&
            trailerValue.includes('18-p3t7w0j6kd'),
          'Missing 18 clue in trailer',
          res.trailers
        );
      },
    },
    // 测试方法：多次向 `/api/18` 发起带 `Range` 头的请求，按块读取文本并在测试端重组内容。
    // 成功条件：每个分块请求都返回 206 和字符串片段，拼接后的完整文本中包含 `19-h9m4q2z8xc`。
    // 失败条件：任一分块请求失败、状态码不是 206、分块内容异常，或最终重组结果不含下一关线索。
    {
      level: '18',
      route: ['GET /api/18 (range chunks)'],
      run: async () => {
        const chunks = [];

        for (let start = 80; start <= 143; start += 16) {
          const end = start + 15;
          const expectedEnd = Math.min(end, 137);
          const res = await httpRequest({
            route: '/api/18',
            headers: {
              Range: `bytes=${start}-${end}`,
            },
          });

          assert(res.status === 206, 'Expected status 206', {
            start,
            end,
            res,
          });
          assert(
            res.bodyJson && typeof res.bodyJson.message === 'string',
            'Expected chunk message',
            {
              start,
              end,
              body: res.bodyJson || res.bodyText,
            }
          );
          assert(
            res.headers['content-range'] ===
              `bytes ${start}-${expectedEnd}/138`,
            'Unexpected Content-Range header',
            { start, end, headers: res.headers }
          );
          assert(
            typeof res.headers['content-type'] === 'string' &&
              res.headers['content-type'].includes('application/json'),
            'Expected JSON content type for puzzle range response',
            res.headers
          );
          assert(
            res.headers['x-puzzle-range-format'] === 'json',
            'Missing puzzle range format hint',
            res.headers
          );

          chunks.push(res.bodyJson.message);
        }

        const reconstructed = chunks.join('');
        assert(
          reconstructed.includes('19-h9m4q2z8xc'),
          'Reconstructed text does not include 19 clue',
          { reconstructed }
        );
      },
    },
    // 占位符：19 关依赖字体映射与视觉对照，当前不纳入自动测试，仅在报告中显式标记为跳过。
    {
      level: '19',
      route: ['SKIPPED /19-h9m4q2z8xc/'],
      skip: true,
      note: 'Font mapping / visual comparison challenge intentionally skipped.',
      run: async () => {},
    },
    // 测试方法：在同一测试块内先向 `/api/20` 提交正确猜测，再提交空 JSON，分别验证猜中逻辑和空输入校验。
    // 成功条件：正确猜测返回 200，`isCorrect === true`，`exact === 10`，且消息中包含 `t8d0v9c2c4`；空输入返回 400，且消息精确等于 `请输入要猜测的 flag。`。
    // 失败条件：任一请求失败、状态码不正确、正确猜测未命中，或空输入未被正确拦截。
    {
      level: '20',
      route: ['POST /api/20 (correct guess)', 'POST /api/20 (empty guess)'],
      run: async () => {
        const requestBody = JSON.stringify({
          guess: 't8d0v9c2c4',
        });

        const res = await httpRequest({
          method: 'POST',
          route: '/api/20',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(requestBody),
          },
          body: requestBody,
        });

        assert(res.status === 200, 'Expected status 200', res);
        assert(
          res.bodyJson && res.bodyJson.isCorrect === true,
          'Expected correct guess result',
          res.bodyJson || res.bodyText
        );
        assert(
          res.bodyJson && res.bodyJson.exact === 10,
          'Expected exact match count to be 10',
          res.bodyJson || res.bodyText
        );
        assert(
          res.bodyJson &&
            typeof res.bodyJson.message === 'string' &&
            res.bodyJson.message.includes('t8d0v9c2c4'),
          'Response does not include next level clue',
          res.bodyJson || res.bodyText
        );

        const emptyRequestBody = JSON.stringify({});
        const emptyRes = await httpRequest({
          method: 'POST',
          route: '/api/20',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(emptyRequestBody),
          },
          body: emptyRequestBody,
        });

        assert(
          emptyRes.status === 400,
          'Expected empty guess status 400',
          emptyRes
        );
        assert(
          emptyRes.bodyJson &&
            emptyRes.bodyJson.message === '请输入要猜测的 flag。',
          'Unexpected validation message',
          emptyRes.bodyJson || emptyRes.bodyText
        );
      },
    },
    // 占位符：21 关依赖 HTTP/2 103 Early Hints，当前测试框架不处理该协议分支，仅在报告中显式标记为跳过。
    {
      level: '21',
      route: ['SKIPPED /api/21'],
      skip: true,
      note: 'HTTP/2 Early Hints challenge intentionally skipped.',
      run: async () => {},
    },
    // 测试方法：在同一测试块内分别以英文请求头和默认请求访问 `/api/22`，验证服务端语言协商分支。
    // 成功条件：英文分支返回 200 且消息中包含 `23-f6y5v4v0k0`；默认分支返回 200，消息包含 `国际宾客厅`，且不包含 `23-f6y5v4v0k0`。
    // 失败条件：任一请求失败、状态码不正确、英文分支未返回线索，或默认分支返回内容错误/泄露线索。
    {
      level: '22',
      route: [
        'GET /api/22 (english branch)',
        'GET /api/22 (default chinese branch)',
      ],
      run: async () => {
        const englishRes = await httpRequest({
          route: '/api/22',
          headers: {
            'Accept-Language': 'en-US,en;q=0.9',
          },
        });

        assert(
          englishRes.status === 200,
          'Expected English branch status 200',
          englishRes
        );
        assert(
          englishRes.bodyJson &&
            typeof englishRes.bodyJson.message === 'string' &&
            englishRes.bodyJson.message.includes('23-f6y5v4v0k0'),
          'English branch does not include 23 clue',
          englishRes.bodyJson || englishRes.bodyText
        );

        const defaultRes = await httpRequest({ route: '/api/22' });
        assert(
          defaultRes.status === 200,
          'Expected default branch status 200',
          defaultRes
        );
        assert(
          defaultRes.bodyJson &&
            typeof defaultRes.bodyJson.message === 'string' &&
            defaultRes.bodyJson.message.includes('国际宾客厅'),
          'Default branch did not return expected Chinese content',
          defaultRes.bodyJson || defaultRes.bodyText
        );
        assert(
          defaultRes.bodyJson &&
            typeof defaultRes.bodyJson.message === 'string' &&
            !defaultRes.bodyJson.message.includes('23-f6y5v4v0k0'),
          'Default branch should not expose 23 clue',
          defaultRes.bodyJson || defaultRes.bodyText
        );
      },
    },
    // 占位符：23 关依赖浏览器环境、反调试逻辑与 localStorage 行为，当前不纳入自动测试，仅在报告中显式标记为跳过。
    {
      level: '23',
      route: ['SKIPPED /23-f6y5v4v0k0/'],
      skip: true,
      note: 'Browser anti-debug / localStorage challenge intentionally skipped.',
      run: async () => {},
    },
    // 测试方法：直接请求 24 关目录下的静态 `feed.xml`，验证 RSS 文件存在且包含人工投递记录中的下一关线索。
    // 成功条件：返回 200，响应正文包含 `25-v5f2b5h0e9`。
    // 失败条件：请求失败、状态码不是 200，RSS 文件缺失，或正文中未出现flag。
    {
      level: '24',
      route: ['GET /24-n2w0c9l1t8/feed.xml'],
      run: async () => {
        const res = await httpRequest({ route: '/24-n2w0c9l1t8/feed.xml' });
        assert(res.status === 200, 'Expected status 200', res);
        assert(
          typeof res.bodyText === 'string' &&
            res.bodyText.includes('25-v5f2b5h0e9'),
          'RSS feed does not include next level clue',
          res.bodyText
        );
      },
    },
    // 占位符：25 关当前为空终点页，暂无可执行测试逻辑，仅在报告中显式标记为跳过。
    {
      level: '25',
      route: ['SKIPPED /25-v5f2b5h0e9/'],
      skip: true,
      note: 'Empty terminal page intentionally skipped.',
      run: async () => {},
    },
  ];

  try {
    for (const routeCase of routeCases) {
      const result = {
        level: routeCase.level,
        route: routeCase.route,
        status: routeCase.skip ? 'SKIPPED' : 'PASSED',
        error: null,
        note: routeCase.note || null,
      };

      try {
        if (!routeCase.skip) {
          await routeCase.run();
        }
      } catch (err) {
        result.status = 'FAILED';
        result.error = {
          message: err.message,
          stack: err.stack,
        };
      }

      routeResults.push(result);
      printResult(result);

      // 配置检查失败时，不再继续执行依赖环境配置的后续关卡测试。
      if (routeCase.level === 'CONFIG' && result.status === 'FAILED') {
        break;
      }
    }
  } catch (err) {
    console.error('Fatal run error:', err);
    process.exitCode = 1;
    return;
  }

  const levelMap = new Map();
  for (const item of routeResults) {
    if (!levelMap.has(item.level)) {
      levelMap.set(item.level, []);
    }
    levelMap.get(item.level).push(item);
  }

  // 配置检查单独汇总，便于一眼看出测试入口是否可用。
  const configSummary = {
    level: 'CONFIG',
    status:
      levelMap.has('CONFIG') &&
      levelMap.get('CONFIG').every((t) => t.status === 'PASSED')
        ? 'PASSED'
        : 'FAILED',
    tests: levelMap.get('CONFIG') || [],
  };

  // 仅汇总本次实际运行到的关卡测试结果。
  const orderedLevels = [
    '01',
    '02',
    '03',
    '04',
    '05',
    '06',
    '07',
    '08',
    '09',
    '10',
    '11',
    '12',
    '13',
    '14',
    '15',
    '16',
    '17',
    '18',
    '19',
    '20',
    '21',
    '22',
    '23',
    '24',
    '25',
  ];
  const levelSummary = orderedLevels
    .filter((level) => levelMap.has(level))
    .map((level) => {
      const tests = levelMap.get(level) || [];
      const allSkipped =
        tests.length > 0 && tests.every((t) => t.status === 'SKIPPED');
      const passed =
        tests.length > 0 &&
        tests.every((t) => t.status === 'PASSED' || t.status === 'SKIPPED');
      return {
        level,
        status: allSkipped ? 'SKIPPED' : passed ? 'PASSED' : 'FAILED',
        tests,
      };
    });

  const overallPassed =
    configSummary.status === 'PASSED' &&
    levelSummary.every((x) => x.status === 'PASSED' || x.status === 'SKIPPED');

  console.log(chalk.cyan('\n=== CONFIG CHECK ==='));
  console.log(`Config: ${colorStatus(configSummary.status)}`);

  console.log(chalk.cyan('\n=== LEVEL SUMMARY ==='));
  for (const lv of levelSummary) {
    console.log(`Level ${lv.level}: ${colorStatus(lv.status)}`);
  }

  const overallStatus = overallPassed ? 'PASSED' : 'FAILED';
  console.log(
    chalk.bold(`\n=== OVERALL STATUS: ${colorStatus(overallStatus)} ===`)
  );

  if (!overallPassed) {
    process.exitCode = 1;
  }
}

run().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exitCode = 1;
});
