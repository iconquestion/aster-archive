# Aster Archive 整体架构说明

本文档仅保留理解项目实现与部署所需的核心架构信息。

## 架构总览

Aster Archive 是一个以 Node/Express 为服务端、以 `public/` 为主要内容层的 Web 解谜游戏。项目同时包含：

- 静态关卡页面与前端资源
- 需要后端参与的关卡逻辑
- 针对协议特性和关键接口行为的自动化测试
- 设计、题解与项目管理文档

运行时可视为三层：

- 浏览器客户端：访问各关卡页面，并在需要时调用接口或协议能力
- Nginx 入口层（可选）：常规情况下作为反向代理
- Node 应用层：提供静态资源、普通 API，以及少数必须绕过 Nginx 的特殊能力

## 仓库结构

- `public/`：前端页面与静态资源；多数纯前端关卡直接在这里实现
- `src/`：Node 应用入口、配置、日志、服务装配，以及后端关卡逻辑
- `test/`：接口、协议与基础运行行为测试
- `docs/`：架构、设计、题解、叙事与项目管理文档

其中，带后端逻辑的关卡主要位于 `src/levels/`；首页、起始页和各关卡页面位于 `public/` 下。

## Node 应用层

项目入口为 [src/index.js](/var/www/www.iconquestion.com/src/index.js)，Node 进程会同时启动三类服务：

- `8080`：HTTP 服务，通常供 Nginx 回源
- `8443`：HTTPS 服务，对外提供部分需要直连 Node 的能力
- `9443`：独立 HTTP/2 服务，仅用于特定关卡

Express 应用统一承担以下职责：

- 提供 `public/` 下的静态资源
- 暴露 `/api/status` 健康检查
- 提供各关卡对应的普通 API
- 装配 JSON、表单、Cookie 与基础 CORS 等通用中间件

API 默认遵循 `/api/{关卡编号}/[可选后缀]` 约定。该约定便于统一测试与路由组织，但个别关卡可因玩法需要例外。

## 特殊协议关卡

少数关卡依赖代理层不一定稳定支持的协议特性，因此必须单独处理：

- 第 15 关：WebSocket。升级请求由 `src/levels/15.js` 接管；若经过 Nginx，必须正确转发 `Upgrade` 相关头部。
- 第 17 关：HTTP Trailer。为避免代理兼容性问题，设计为客户端直接访问 Node 的 `8443` 端口。
- 第 21 关：HTTP/2 与 `103 Early Hints`。由独立的 `9443` 端口处理，用于隔离 HTTP/2 相关玩法。

这三个点是部署时最需要留意的架构约束：并非所有能力都适合经过统一反向代理出口。

## 日志

Node 层使用 Winston 写入 `logs/`，同时输出控制台日志，并按日期轮转文件。默认策略为：

- 文件模式：`logs/info-%DATE%.log`、`logs/error-%DATE%.log`
- 按天轮转，日期格式为 `YYYY-MM-DD`
- 单文件上限 `20m`
- 保留 `14d`
- 自动压缩历史日志

轮转参数可通过 `config/.env` 中的日志环境变量覆盖。

## 构建与配置

推荐使用 `Node.js 24.14.0`。

初始化步骤：

```bash
git clone https://github.com/iconquestion/aster-archive.git
npm install
cd config
cp .env.example .env
```

`config/.env` 是启动与测试共用的唯一配置入口，至少需要正确设置：

- `HTTP_PORT`
- `HTTPS_PORT`
- `HTTP2_PORT`
- `APP_ORIGIN`
- `TLS_KEY_PATH`
- `TLS_CERT_PATH`

这些变量会在启动时被严格校验；缺失、格式错误或路径不存在都会直接导致启动失败。`APP_ORIGIN` 还会影响基础 CORS 与测试结果，因此必须与实际访问入口保持一致。

第 12 关的当日四位数密码由服务端基于固定 secret 与当天日期生成，并在进程内按天缓存。

## 测试

运行测试时优先使用：

```bash
npm test
```

测试以 Jest + Supertest 为主，覆盖两类核心风险：

- 普通接口与基础运行行为是否回归
- WebSocket、Trailer 等已纳入自动化范围的协议型关卡是否仍满足预期

第 `21` 关 HTTP/2 与 `103 Early Hints` 当前按照 [SRS](../project-management/software-requirements-specification.md) 中的人工验收步骤复核，后续再由测试改进路线补足更细粒度自动化。

测试辅助代码会复用 `src/config.js` 的配置解析逻辑，并对协议类测试使用随机本地端口，避免与真实服务或其他测试用例发生冲突。

## 持续集成

项目已接入 GitHub Actions，CI 配置位于 `/.github/workflows/ci.yml`。
