# Aster Archive

Aster Archive 是一个 Web 闯关游戏，风格接近小型 WebCTF。你需要从页面源码、静态资源、请求响应和协议行为中找线索。每关的 flag 指向下一关的入口。

项目仍在开发。仓库已有第 01–26 关的实现，第 27 关页面待补。

## 开始游玩

[进入 Aster Archive](https://www.iconquestion.com/)

如果卡关，可以翻阅题解。 [关卡题解（含剧透）](./docs/reference/level-solutions.md)

## 本地运行

1. 使用 Node.js `24.14.0`，在仓库根目录运行 `npm ci`。
2. 首次运行时，将 `config/.env.example` 复制为 `config/.env`，填入 `TLS_KEY_PATH` 和 `TLS_CERT_PATH`。
3. 运行 `npm start`，打开 [http://localhost:8080/](http://localhost:8080/)。

第 17、21 关的页面仍会请求线上服务。

<details>
<summary>生成本地 TLS 证书</summary>

```sh
mkdir config/.env.tls.local
openssl req -x509 -newkey rsa:2048 -nodes -days 30 -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost" -keyout config/.env.tls.local/key.pem -out config/.env.tls.local/cert.pem
```

将生成的路径填入 `config/.env`。

```dotenv
TLS_KEY_PATH=config/.env.tls.local/key.pem
TLS_CERT_PATH=config/.env.tls.local/cert.pem
```

如果 OpenSSL 找不到 `openssl.cnf`，在 `req` 后加 `-config NUL`（PowerShell）或 `-config /dev/null`（Linux/macOS）。

</details>

## 开发与文档

关卡页面和静态资源在 `public/`，服务代码在 `src/`，自动化测试在 `test/`。

```sh
npm test
npm run lint
npm run format:check
```

- [产品与关卡意图](./docs/product-game-intent.md)
- [维护指南](./docs/maintenance.md) · [系统契约](./docs/system-contract.md)
- [世界观](./docs/reference/worldbuilding-guide.md) · [UI 设计指南](./docs/reference/ui-design-guidelines.md)
- [贡献指南](./CONTRIBUTING.md)

本项目使用 AI 辅助实现和测试，设计和代码审查由作者负责。

## 许可

代码采用 [AGPL-3.0](./LICENSE)，非代码内容采用 [CC BY-NC-SA 4.0](./LICENSE-CC-BY-NC-SA-4.0)。
