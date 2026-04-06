const https = require("https");
const path = require("path");
const fs = require("fs");
const WebSocket = require("ws");
const dotenv = require("dotenv");

// 测试配置读取与校验
// 测试入口与应用入口保持一致，统一从 `.env` 严格加载关键参数。
function requireEnv(name) {
    const value = process.env[name];

    if (typeof value !== "string" || value.trim() === "") {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value.trim();
}

// 读取必填整数配置；仅接受可解析的整数值。
function requireIntegerEnv(name) {
    const value = requireEnv(name);
    const parsed = Number.parseInt(value, 10);

    if (!Number.isInteger(parsed)) {
        throw new Error(`Environment variable ${name} must be an integer, received: ${value}`);
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
    const envPath = path.join(__dirname, "../config/.env");
    const envResult = dotenv.config({ path: envPath });

    if (envResult.error) {
        throw new Error(`Failed to load env file at ${envPath}: ${envResult.error.message}`);
    }

    const appOrigin = requireEnv("APP_ORIGIN");
    const originUrl = new URL(appOrigin);
    const passwordFilePath = requireExistingPath(
        path.join(__dirname, "../public/12-d1q7m4z8pv/password.xdxdxdxd"),
        "Daily password file"
    );
    const appPort = originUrl.port
        ? Number.parseInt(originUrl.port, 10)
        : originUrl.protocol === "https:"
            ? 443
            : 80;

    if (!Number.isInteger(appPort)) {
        throw new Error(`Unable to determine valid port from APP_ORIGIN: ${appOrigin}`);
    }

    return {
        envPath,
        appOrigin,
        host: originUrl.hostname,
        appPort,
        httpsPort: requireIntegerEnv("HTTPS_PORT"),
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
        const detailText = details ? `\nDetails: ${JSON.stringify(details, null, 2)}` : "";
        throw new Error(`${message}${detailText}`);
    }
}

// 统一封装 HTTPS 请求，供各关卡测试复用。
function httpRequest({ method = "GET", route, headers = {}, body, port }) {
    if (!testConfig) {
        throw new Error("Test config has not been loaded");
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
                let data = "";
                res.on("data", (chunk) => {
                    data += chunk;
                });
                res.on("end", () => {
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

        req.on("error", reject);

        if (body !== undefined && body !== null) {
            req.write(body);
        }

        req.end();
    });
}

// 统一封装 WebSocket 连接测试。
function testWebSocket(route) {
    if (!testConfig) {
        throw new Error("Test config has not been loaded");
    }

    return new Promise((resolve, reject) => {
        const wsPortSuffix = testConfig.appPort === 443 ? "" : `:${testConfig.appPort}`;
        const ws = new WebSocket(`wss://${testConfig.host}${wsPortSuffix}${route}`);
        const timer = setTimeout(() => {
            ws.terminate();
            reject(new Error("WebSocket timeout after 5s"));
        }, 5000);

        ws.on("message", (raw) => {
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

        ws.on("error", (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

async function getChalk() {
    const mod = await import("chalk");
    return mod.default || mod;
}

// 测试主流程
// 先执行配置检查，再按顺序运行各关卡测试，并在末尾汇总结果。
async function run() {
    const chalk = await getChalk();
    const colorStatus = (status) => (status === "PASSED" ? chalk.green(status) : chalk.red(status));

    const routeResults = [];
    let authCookie = "";

    const routeCases = [
        {
            level: "CONFIG",
            route: "Load test env",
            // 测试方法：加载 `.env`，并校验测试依赖的关键配置与本地文件是否存在且格式合法。
            // 成功条件：环境变量读取成功，必填项不为空，端口可解析，密码文件存在。
            // 失败条件：`.env` 缺失、变量为空、端口非法，或依赖文件不存在。
            run: async () => {
                testConfig = loadTestConfig();
            },
        },
        // 测试方法：向 `/api/04` 发起 GET 请求，检查响应头中的下一关线索。
        // 成功条件：返回 200，且 `X-Archive-Next` 头精确等于 `05-x1p8z3n6kf`。
        // 失败条件：请求失败、状态码不是 200，或响应头缺失/值错误。
        {
            level: "04",
            route: "GET /api/04",
            run: async () => {
                const res = await httpRequest({ route: "/api/04" });
                assert(res.status === 200, "Expected status 200", res);
                assert(res.headers["x-archive-next"] === "05-x1p8z3n6kf", "Missing or wrong X-Archive-Next header", res.headers);
            },
        },
        // 测试方法：向 `/api/05` 发起 GET 请求，验证默认访问路径只返回阻拦提示。
        // 成功条件：返回 200，且响应消息精确等于 `YOU SHALL NOT PASS!!!`。
        // 失败条件：请求失败、状态码不是 200，或响应消息与预期不一致。
        {
            level: "05",
            route: "GET /api/05",
            run: async () => {
                const res = await httpRequest({ route: "/api/05" });
                assert(res.status === 200, "Expected status 200", res);
                assert(res.bodyJson && res.bodyJson.message === "YOU SHALL NOT PASS!!!", "Unexpected response message", res.bodyJson || res.bodyText);
            },
        },
        // 测试方法：向 `/api/05` 发起 POST 请求，验证正确方法可以获得下一关线索。
        // 成功条件：返回 200，且响应消息中包含 `06-m4v7q2c9ta`。
        // 失败条件：请求失败、状态码不是 200，或响应中未包含下一关线索。
        {
            level: "05",
            route: "POST /api/05",
            run: async () => {
                const res = await httpRequest({ method: "POST", route: "/api/05" });
                assert(res.status === 200, "Expected status 200", res);
                assert(
                    res.bodyJson && typeof res.bodyJson.message === "string" && res.bodyJson.message.includes("06-m4v7q2c9ta"),
                    "Response does not include next level clue",
                    res.bodyJson || res.bodyText
                );
            },
        },
        // 测试方法：向 `/api/06?level=admin` 发起 GET 请求，模拟通过查询参数声明身份。
        // 成功条件：返回 200，且响应消息中包含 `Your identity: admin`。
        // 失败条件：请求失败、状态码不是 200，或响应未识别管理员身份。
        {
            level: "06",
            route: "GET /api/06?level=admin",
            run: async () => {
                const res = await httpRequest({ route: "/api/06?level=admin" });
                assert(res.status === 200, "Expected status 200", res);
                assert(
                    res.bodyJson && typeof res.bodyJson.message === "string" && res.bodyJson.message.includes("Your identity: admin"),
                    "Response does not identify admin",
                    res.bodyJson || res.bodyText
                );
            },
        },
        // 测试方法：向 `/api/07?location=visit_admin_office` 发起 GET 请求，验证指定位置参数会泄露 08 关线索。
        // 成功条件：返回 200，且响应消息中包含 `c2x8m5q9nv`。
        // 失败条件：请求失败、状态码不是 200，或响应中未包含 08 关标识。
        {
            level: "07",
            route: "GET /api/07?location=visit_admin_office",
            run: async () => {
                const res = await httpRequest({ route: "/api/07?location=visit_admin_office" });
                assert(res.status === 200, "Expected status 200", res);
                assert(
                    res.bodyJson && typeof res.bodyJson.message === "string" && res.bodyJson.message.includes("c2x8m5q9nv"),
                    "Response does not include 08 clue",
                    res.bodyJson || res.bodyText
                );
            },
        },
        // 测试方法：读取每日密码文件后，向 `/api/12/login` 提交表单登录，并检查返回的 Cookie。
        // 成功条件：返回 200，响应消息为 `登录成功`，且存在 `bibilabu=` 开头的认证 Cookie。
        // 失败条件：密码文件读取失败、请求失败、状态码不是 200、登录消息不符，或未返回预期 Cookie。
        {
            level: "12",
            route: "POST /api/12/login",
            run: async () => {
                const dailyPassword = fs.readFileSync(testConfig.passwordFilePath, "utf8").trim();
                const formData = new URLSearchParams({
                    username: "admin",
                    password: dailyPassword,
                }).toString();

                const res = await httpRequest({
                    method: "POST",
                    route: "/api/12/login",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "Content-Length": Buffer.byteLength(formData),
                    },
                    body: formData,
                });

                assert(res.status === 200, "Expected status 200", res);
                assert(res.bodyJson && res.bodyJson.message === "登录成功", "Login failed unexpectedly", res.bodyJson || res.bodyText);

                const setCookie = res.headers["set-cookie"];
                assert(Array.isArray(setCookie) && setCookie.length > 0, "Expected Set-Cookie header", res.headers);

                authCookie = setCookie[0].split(";")[0];
                assert(authCookie.startsWith("bibilabu="), "Unexpected cookie name", { authCookie, setCookie });
            },
        },
        // 测试方法：携带上一条测试拿到的认证 Cookie，请求 `/api/12/get_room_info?room_id=13`。
        // 成功条件：返回 200，且响应消息精确等于 `13-k9c3x6n2tw`。
        // 失败条件：前置登录未产生 Cookie、请求失败、状态码不是 200，或房间信息不符合预期。
        {
            level: "12",
            route: "GET /api/12/get_room_info?room_id=13",
            run: async () => {
                assert(authCookie, "Missing auth cookie from /12/login");
                const res = await httpRequest({
                    route: "/api/12/get_room_info?room_id=13",
                    headers: {
                        Cookie: authCookie,
                    },
                });
                assert(res.status === 200, "Expected status 200", res);
                assert(
                    res.bodyJson && res.bodyJson.message === "13-k9c3x6n2tw",
                    "Unexpected room info response",
                    res.bodyJson || res.bodyText
                );
            },
        },
        // 测试方法：构造 `admin:admin` 的 Basic Auth，向 `/api/14/login` 发起 POST 请求。
        // 成功条件：返回 200，且响应消息中包含 `15-x2m9k4c6ra`。
        // 失败条件：请求失败、状态码不是 200，或响应中未包含下一关线索。
        {
            level: "14",
            route: "POST /api/14/login",
            run: async () => {
                const basicToken = Buffer.from("admin:admin").toString("base64");
                const res = await httpRequest({
                    method: "POST",
                    route: "/api/14/login",
                    headers: {
                        Authorization: `Basic ${basicToken}`,
                    },
                });
                assert(res.status === 200, "Expected status 200", res);
                assert(
                    res.bodyJson && typeof res.bodyJson.message === "string" && res.bodyJson.message.includes("15-x2m9k4c6ra"),
                    "Response does not include next level clue",
                    res.bodyJson || res.bodyText
                );
            },
        },
        // 测试方法：连接 `/api/15/challenge` WebSocket 端点，检查连接建立后的首条消息。
        // 成功条件：成功建立连接，且首条消息中包含 `WebSocket connected`。
        // 失败条件：连接失败、超时、消息不是合法 JSON，或首条消息内容不符合预期。
        {
            level: "15",
            route: "WS /api/15/challenge",
            run: async () => {
                const payload = await testWebSocket("/api/15/challenge");
                assert(
                    payload && typeof payload.message === "string" && payload.message.includes("WebSocket connected"),
                    "Unexpected WebSocket message",
                    payload
                );
            },
        },
        // 测试方法：向 `/api/16?timepoint=2077` 发起 GET 请求，并带上 `X-Forwarded-Http3: h3` 头模拟题面要求。
        // 成功条件：返回 200，且响应消息中包含 `17-c8v1n5r2ya`。
        // 失败条件：请求失败、状态码不是 200，或响应中未包含 17 关线索。
        {
            level: "16",
            route: "GET /api/16?timepoint=2077",
            run: async () => {
                const res = await httpRequest({
                    route: "/api/16?timepoint=2077",
                    headers: {
                        "X-Forwarded-Http3": "h3",
                    },
                });

                assert(res.status === 200, "Expected status 200", res);
                assert(
                    res.bodyJson && typeof res.bodyJson.message === "string" && res.bodyJson.message.includes("17-c8v1n5r2ya"),
                    "Response does not include 17 clue",
                    res.bodyJson || res.bodyText
                );
            },
        },
        // 测试方法：通过独立 HTTPS 端口请求 `/api/17`，检查 Trailer 声明头及响应结束后的 Trailer 内容。
        // 成功条件：返回 200，`Trailer` 头声明了 `X-Never-Be-Apart`，且对应 Trailer 值中包含 `18-p3t7w0j6kd`。
        // 失败条件：请求失败、状态码不是 200、缺少 Trailer 声明头，或最终 Trailer 中未包含下一关线索。
        {
            level: "17",
            route: "GET /api/17",
            run: async () => {
                const res = await httpRequest({
                    route: "/api/17",
                    port: testConfig.httpsPort,
                });
                assert(res.status === 200, "Expected status 200", res);

                const trailerHeader = res.headers["trailer"];
                assert(
                    typeof trailerHeader === "string" && trailerHeader.toLowerCase().includes("x-never-be-apart"),
                    "Missing Trailer declaration header",
                    res.headers
                );

                const trailerValue = res.trailers && res.trailers["x-never-be-apart"];
                console.log("trailerValue: " + trailerValue);
                assert(
                    typeof trailerValue === "string" && trailerValue.includes("18-p3t7w0j6kd"),
                    "Missing 18 clue in trailer",
                    res.trailers
                );
            },
        },
        // 测试方法：多次向 `/api/18` 发起带 `Range` 头的请求，按块读取文本并在测试端重组内容。
        // 成功条件：每个分块请求都返回 206 和字符串片段，拼接后的完整文本中包含 `19-h9m4q2z8xc`。
        // 失败条件：任一分块请求失败、状态码不是 206、分块内容异常，或最终重组结果不含下一关线索。
        {
            level: "18",
            route: "GET /api/18 (range chunks)",
            run: async () => {
                const chunks = [];

                for (let start = 80; start <= 143; start += 16) {
                    const end = start + 15;
                    const res = await httpRequest({
                        route: "/api/18",
                        headers: {
                            Range: `bytes=${start}-${end}`,
                        },
                    });

                    assert(res.status === 206, "Expected status 206", { start, end, res });
                    assert(res.bodyJson && typeof res.bodyJson.message === "string", "Expected chunk message", {
                        start,
                        end,
                        body: res.bodyJson || res.bodyText,
                    });

                    chunks.push(res.bodyJson.message);
                }

                const reconstructed = chunks.join("");
                assert(
                    reconstructed.includes("19-h9m4q2z8xc"),
                    "Reconstructed text does not include 19 clue",
                    { reconstructed }
                );
            },
        },
    ];

    try {
        for (const routeCase of routeCases) {
            const result = {
                level: routeCase.level,
                route: routeCase.route,
                status: "PASSED",
                error: null,
            };

            try {
                await routeCase.run();
            } catch (err) {
                result.status = "FAILED";
                result.error = {
                    message: err.message,
                    stack: err.stack,
                };
            }

            routeResults.push(result);

            // 配置检查失败时，不再继续执行依赖环境配置的后续关卡测试。
            if (routeCase.level === "CONFIG" && result.status === "FAILED") {
                break;
            }
        }
    } catch (err) {
        console.error("Fatal run error:", err);
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
        level: "CONFIG",
        status: levelMap.has("CONFIG") && levelMap.get("CONFIG").every((t) => t.status === "PASSED") ? "PASSED" : "FAILED",
        tests: levelMap.get("CONFIG") || [],
    };

    // 仅汇总本次实际运行到的关卡测试结果。
    const orderedLevels = ["04", "05", "06", "07", "12", "14", "15", "16", "17", "18"];
    const levelSummary = orderedLevels
        .filter((level) => levelMap.has(level))
        .map((level) => {
        const tests = levelMap.get(level) || [];
        const passed = tests.length > 0 && tests.every((t) => t.status === "PASSED");
        return {
            level,
            status: passed ? "PASSED" : "FAILED",
            tests,
        };
        });

    const overallPassed = configSummary.status === "PASSED" && levelSummary.every((x) => x.status === "PASSED");

    console.log(chalk.cyan("=== ROUTE RESULTS ==="));
    for (const item of routeResults) {
        console.log(`[${item.level}] ${item.route}: ${colorStatus(item.status)}`);
        if (item.status === "FAILED") {
            console.error(chalk.red(`  Error: ${item.error.message}`));
            if (item.error.stack) {
                console.error(chalk.red(`  Stack: ${item.error.stack}`));
            }
        }
    }

    console.log(chalk.cyan("\n=== CONFIG CHECK ==="));
    console.log(`Config: ${colorStatus(configSummary.status)}`);

    console.log(chalk.cyan("\n=== LEVEL SUMMARY ==="));
    for (const lv of levelSummary) {
        console.log(`Level ${lv.level}: ${colorStatus(lv.status)}`);
    }

    const overallStatus = overallPassed ? "PASSED" : "FAILED";
    console.log(chalk.bold(`\n=== OVERALL STATUS: ${colorStatus(overallStatus)} ===`));

    if (!overallPassed) {
        process.exitCode = 1;
    }
}

run().catch((err) => {
    console.error("Fatal test runner error:", err);
    process.exitCode = 1;
});
