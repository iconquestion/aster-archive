const https = require("https");
const path = require("path");
const fs = require("fs");
const WebSocket = require("ws");

const HOST = "www.iconquestion.com";
const PORT = 443;
const BASE_URL = `https://${HOST}`;

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message, details) {
    if (!condition) {
        const detailText = details ? `\nDetails: ${JSON.stringify(details, null, 2)}` : "";
        throw new Error(`${message}${detailText}`);
    }
}

function httpRequest({ method = "GET", route, headers = {}, body, port = PORT }) {
    return new Promise((resolve, reject) => {
        const req = https.request(
            {
                hostname: HOST,
                port,
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

function testWebSocket(route) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(`wss://${HOST}${route}`);
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

async function run() {
    const chalk = await getChalk();
    const colorStatus = (status) => (status === "PASSED" ? chalk.green(status) : chalk.red(status));

    const dailyPassword = fs
        .readFileSync(path.join(__dirname, "../public/12-d1q7m4z8pv/password.xdxdxdxd"), "utf8")
        .trim();

    const routeResults = [];
    let authCookie = "";

    const routeCases = [
        {
            level: "04",
            route: "GET /api/04",
            run: async () => {
                const res = await httpRequest({ route: "/api/04" });
                assert(res.status === 200, "Expected status 200", res);
                assert(res.headers["x-archive-next"] === "05-x1p8z3n6kf", "Missing or wrong X-Archive-Next header", res.headers);
            },
        },
        {
            level: "05",
            route: "GET /api/05",
            run: async () => {
                const res = await httpRequest({ route: "/api/05" });
                assert(res.status === 200, "Expected status 200", res);
                assert(res.bodyJson && res.bodyJson.message === "YOU SHALL NOT PASS!!!", "Unexpected response message", res.bodyJson || res.bodyText);
            },
        },
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
        {
            level: "12",
            route: "POST /api/12/login",
            run: async () => {
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
        {
            level: "17",
            route: "GET /api/17",
            run: async () => {
                const res = await httpRequest({
                    route: "/api/17",
                    port: 8443,
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

    const orderedLevels = ["04", "05", "06", "07", "12", "14", "15", "16", "17", "18"];
    const levelSummary = orderedLevels.map((level) => {
        const tests = levelMap.get(level) || [];
        const passed = tests.length > 0 && tests.every((t) => t.status === "PASSED");
        return {
            level,
            status: passed ? "PASSED" : "FAILED",
            tests,
        };
    });

    const overallPassed = levelSummary.every((x) => x.status === "PASSED");

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