const https = require("https");
const WebSocket = require("ws");
const { createStartedTestServers } = require("../helpers/createTestApp");

describe("Protocol-specific levels", () => {
    let runtime;

    beforeAll(async () => {
        runtime = await createStartedTestServers();
    });

    afterAll(async () => {
        await runtime.close();
    });

    // 15 关依赖底层 upgrade 事件，因此通过真实本地 HTTP server 验证首条 WebSocket 消息。
    test("15 accepts a WebSocket connection and returns the welcome payload", async () => {
        const payload = await new Promise((resolve, reject) => {
            const ws = new WebSocket(`ws://127.0.0.1:${runtime.httpPort}/api/15/challenge`);
            const timer = setTimeout(() => {
                ws.terminate();
                reject(new Error("WebSocket timeout after 5s"));
            }, 5000);

            ws.on("message", (raw) => {
                clearTimeout(timer);
                try {
                    resolve(JSON.parse(raw.toString()));
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

        expect(payload.message).toContain("WebSocket connected");
    });

    // 17 关把线索放在 Trailer 中，需通过真实 HTTPS 请求读取响应结束后的 trailers。
    test("17 returns the next clue in the response trailer", async () => {
        const res = await httpsRequest({
            port: runtime.httpsPort,
            path: "/api/17",
        });

        expect(res.status).toBe(200);
        expect(res.headers.trailer.toLowerCase()).toContain("x-never-be-apart");
        expect(res.trailers["x-never-be-apart"]).toContain("18-p3t7w0j6kd");
    });
});

function httpsRequest({ port, path }) {
    return new Promise((resolve, reject) => {
        const req = https.request(
            {
                hostname: "127.0.0.1",
                port,
                path,
                method: "GET",
                rejectUnauthorized: false,
            },
            (res) => {
                let data = "";
                res.on("data", (chunk) => {
                    data += chunk;
                });
                res.on("end", () => {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        trailers: res.trailers,
                        bodyText: data,
                    });
                });
            }
        );

        req.on("error", reject);
        req.end();
    });
}
