# Aster Archive 整体架构说明

本文档用于描述 Aster Archive 的整体系统架构。

## 架构总览

该项目以 Node 为核心后端服务层、以 `public/` 为主要前端内容层，为用户提供**纯前端**或**前后端结合**服务。

整体可以概括为三层（或四层）：

- 浏览器客户端  
  玩家访问首页、各关卡页面，并在需要时向后端接口发起请求。

- Nginx 入口层（可选的）

- Node 应用层  
  使用 Express 提供静态资源、普通 API、部分特殊关卡逻辑，并单独启动 HTTPS 与 HTTP/2 服务。

- 内容与测试层  
  `public/` 存放各关卡页面与静态资源，`src/` 存放后端关卡实现，`test/` 用于验证关键 API 行为。

## 目录架构

### `public/`

前端内容根目录，主要包括：

- 首页：`public/index.html`

- 起始说明页：`public/00-letsstart/index.html`

- 各关卡页面：`public/{关卡号-随机串}/index.html`

- 公共脚本：`public/js/`

- 字体与其他静态资源：`public/fonts/`、`public/css/` 等

每一关目录可以被视为一个独立的内容单元。

### `src/`

Node 服务端代码目录。

- 应用入口：`src/index.js`

- 每一关具体后端逻辑：`src/{关卡编号}.js`

部分关卡需要利用一些特性，因此结构可能不同于上述内容。

### `test/`

测试脚本存放目录。

测试目标主要是验证关键后端关卡是否仍然满足预期行为，例如：

- 自定义响应头

- 特定 HTTP 方法

- Cookie 登录

- WebSocket 连接

- Trailer

- Range 分段响应

## Node 应用层架构

### 入口服务

项目入口为 [src/index.js](./src/index.js)

Node 进程同时启动三类服务：

- `8080`：HTTP 服务，供 Nginx 在本机回源

- `8443`：HTTPS 服务，对外提供绕过 Nginx 的特殊能力

- `9443`：独立 HTTP/2 服务，服务特定关卡

### Express

Express 应用承担以下职责：

- 提供 `public/` 下的静态资源

- 提供 `/bootstrap/` 到 `node_modules/bootstrap/` 的静态资源映射

- 提供 `/api/status` 健康检查

- 提供各关卡的普通 API

- 处理基础中间件，例如 JSON、表单、Cookie 与基础 CORS

### 特殊结构

当前存在几个较为特殊的关卡，需要独立设计：

- 15 关 —— WebSocket  
  `src/15.js` 通过 `handleUpgrade` 接管升级请求。若使用 Nginx 中间件，需留意传递 Upgrade 头。

- 17 关 —— HTTP Trailer  
  HTTP Trailer 在低版本 Nginx 的 proxy_pass 场景中不受支持，因此设计时让客户端直接访问 Node 的 `8443` 端口。新版本 Nginx 中此特性的支持情况需要进一步确认。

- 21 关 —— HTTP/2 和 103 Early Hints 响应头  
  设计时让客户端直接访问 Node 的 `9443` 端口，仅处理特定路径，用于 HTTP/2 相关玩法。新版本 Nginx 中此特性的支持情况需要进一步确认。

### 日志

Node 层使用 Winston 记录日志，日志目录为 `logs/`。

当前日志能力包括：

- 控制台输出，便于本地开发和容器日志收集

- 按级别拆分日志文件

- 日志轮转

默认会生成以下文件模式：

- `logs/info-%DATE%.log`

- `logs/error-%DATE%.log`

默认轮转策略为：

- 按天轮转，日期格式为 `YYYY-MM-DD`

- 单文件大小上限为 `20m`

- 保留 `14d` 历史日志

- 旧日志自动压缩

日志轮转相关参数可通过 `config/.env` 中的环境变量覆盖：

- `LOG_ROTATE_DATE_PATTERN`

- `LOG_ROTATE_MAX_FILES`

- `LOG_ROTATE_MAX_SIZE`

- `LOG_ROTATE_ZIPPED_ARCHIVE`

### API 结构

Node 提供的 API 结构统一为：

`/api/{关卡编号}/[可选后缀]`

某些关卡可能有额外的后缀。

假设第 07 关使用 login 后缀，则实际效果为

`/api/07/login/`

某些关卡可能有迫于无奈而不遵循此规则的设计，但大部分关卡均遵循此设计。

## 构建项目

### 初始化项目

#### 将项目 Clone 到本地

```bash
git clone https://github.com/iconquestion/aster-archive.git
```

#### 安装 npm 依赖

```bash
npm install
```

#### 环境变量配置

应用启动与测试都会固定读取 `config/.env`，因此可以先复制 `config` 下的 `.env.example`：

```bash
cd config
cp .env.example .env
```

然后按实际部署环境修改以下变量：

- `HTTP_PORT`：Node HTTP 服务端口，默认占位值为 `8080`

- `HTTPS_PORT`：Node HTTPS 服务端口，默认占位值为 `8443`

- `HTTP2_PORT`：独立 HTTP/2 服务端口，默认占位值为 `9443`

- `APP_ORIGIN`：站点对外访问源地址，同时用于基础 CORS 校验与测试脚本，例如 `https://localhost:8443`

- `TLS_KEY_PATH`：TLS 私钥文件绝对路径，例如 `/absolute/path/to/tls/key.pem`

- `TLS_CERT_PATH`：TLS 证书文件绝对路径，例如 `/absolute/path/to/tls/cert.pem`

注意：

- `src/index.js` 与 `test/test.js` 会在启动时严格校验这些变量，缺失、空值、格式错误或路径不存在都会直接报错退出

- `APP_ORIGIN` 应与实际访问入口保持一致，否则部分跨域响应和测试会失败

- `TLS_KEY_PATH`、`TLS_CERT_PATH` 都要求指向启动时已经存在的路径

#### 特殊关卡配置

添加一个自动生成密码的 cron 任务（12关），参考配置如下

```bash
crontab -e

0 0 * * * shuf -i 0-9999 -n 1 > /var/www/www.iconquestion.com/public/12-d1q7m4z8pv/password.xdxdxdxd
```

### 启动项目

```bash
npm start
```

### 测试项目

```bash
npm test
```

项目当前使用 Jest 作为主测试框架，并配合 Supertest 覆盖 HTTP 接口行为。

测试结构大致分为：

- `test/http/`：验证普通 HTTP 接口和状态接口

- `test/protocol/`：验证 WebSocket upgrade、HTTPS Trailer、HTTP/2 等协议能力

- `test/helpers/`：统一装配测试运行时、静默 logger 与随机端口 server

- `test/index.test.js`、`test/logger.test.js`：验证入口层与日志初始化等基础行为

测试辅助代码会统一复用 `src/config.js` 的配置读取逻辑，避免线上启动与测试环境出现两套配置解析方式。

其中协议类测试会绑定随机本地端口，避免测试之间因固定端口冲突而互相影响。

### 持续集成与代码风格

项目已接入 GitHub Actions，CI 配置位于 `/.github/workflows/ci.yml`。

当前持续集成主要执行：

- 安装依赖

- 运行 `npm run lint`

- 准备 `config/.env`

- 准备测试所需的每日密码文件

- 运行 `npm test`

代码质量与风格方面，项目已接入 ESLint 与 Prettier：

- `ESLint` 负责潜在错误与可疑逻辑检查

- `Prettier` 负责统一格式化输出

可使用以下命令：

- `npm run lint`

- `npm run lint:fix`

- `npm run format`

- `npm run format:check`
