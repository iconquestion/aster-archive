# Aster Archive 整体架构说明

## 文档目的

本文件用于描述 `Aster Archive` 的整体系统架构、请求路径、目录职责与部署关系。

它不再承担开发进度记录的作用，重点是回答以下问题：

- 这个项目由哪些部分组成
- 页面请求和 API 请求分别如何流转
- Nginx、Node、静态资源与特殊关卡分别扮演什么角色
- 测试为什么有时走 Nginx，有时绕过 Nginx

## 架构总览

当前项目是一个以 Node.js 为核心服务层、以 `public/` 为主要内容层的 Web 解谜游戏站点。

整体可以概括为四层：

1. 浏览器客户端  
   玩家访问首页、各关卡页面，并在需要时向后端接口发起请求。

2. Nginx 入口层  
   负责域名收口、HTTP 到 HTTPS 跳转、裸域到 `www` 的规范化，以及将主站流量转发给本机 Node 服务。

3. Node.js 应用层  
   使用 Express 提供静态资源、普通 API、部分特殊关卡逻辑，并单独启动 HTTPS 与 HTTP/2 服务。

4. 内容与测试层  
   `public/` 存放各关卡页面与静态资源，`src/` 存放后端关卡实现，`test/` 用于验证关键 API 行为。

## 目录职责

### `public/`

前端内容根目录，主要包括：

- 首页：`public/index.html`
- 起始说明页：`public/00-letsstart/index.html`
- 各关卡页面：`public/{关卡号-随机串}/index.html`
- 公共脚本：`public/js/`
- 字体与其他静态资源：`public/fonts/`、`public/css/` 等

这一层承载游戏的页面内容与大部分线索表现形式。很多关卡本质上就是一个独立的小网站页面，因此每一关目录通常可以被视为一个相对独立的内容单元。

### `src/`

Node 服务端代码目录。

- `src/index.js` 是应用入口
- `src/04.js`、`src/05.js`、`src/06.js` 等文件分别承载对应关卡的后端逻辑
- 当前已有独立后端逻辑的关卡主要集中在需要 HTTP 特性、鉴权、Cookie、WebSocket、Range、HTTP/2 等能力的部分

### `test/`

测试目录，当前以 `test/test.js` 为主。

测试目标主要是验证关键后端关卡是否仍然满足预期行为，例如：

- 自定义响应头
- 特定 HTTP 方法
- Cookie 登录
- WebSocket 连接
- Trailer
- Range 分段响应

## Node 应用层架构

### 入口服务

项目入口为 [src/index.js](./src/index.js)。

Node 进程同时启动三类服务：

- `8080`：HTTP 服务，供 Nginx 在本机回源
- `8443`：HTTPS 服务，对外提供绕过 Nginx 的特殊能力
- `9443`：独立 HTTP/2 服务，服务特定关卡

### Express 的职责

Express 应用承担以下职责：

- 提供 `public/` 下的静态资源
- 提供 `/bootstrap/` 静态资源映射
- 提供 `/api/status` 健康检查
- 提供各关卡的普通 API
- 处理基础中间件，例如 JSON、表单、Cookie 与基础 CORS

当前已注册的后端关卡路由包括：

- `/api/04`
- `/api/05`
- `/api/06`
- `/api/07`
- `/api/12`
- `/api/14`
- `/api/15`
- `/api/16`
- `/api/17`
- `/api/18`
- `/api/20`
- `/api/22`

### 特殊协议与特殊能力

并不是所有关卡都能完全放进标准的 “Nginx -> Express 普通路由” 流程里。

当前存在几个特殊点：

- 15 关使用 WebSocket  
  `src/15.js` 通过 `handleUpgrade` 接管升级请求。

- 17 关依赖 HTTP Trailer  
  这一关需要客户端直接访问 Node 的 `8443` 端口，因为该能力需要绕过当前主站 Nginx 入口。

- 21 关依赖独立 HTTP/2 服务  
  `9443` 端口由 Node 直接提供，仅处理特定路径，并用于 HTTP/2 相关玩法。

### 日志与稳定性

Node 层使用 Winston 记录日志，日志目录为 `logs/`，包括：

- `logs/info.log`
- `logs/error.log`

应用中还处理了以下错误场景：

- Express 统一错误处理中间件
- HTTP / HTTPS / HTTP2 server error
- `uncaughtException`
- `unhandledRejection`

## Nginx 架构

当前 Nginx 的职责不是直接承载业务逻辑，而是作为主站入口层，完成域名规范化与反向代理。

请求流可以概括为：

- `80(www)` -> `443(www)`
- `80(@)` -> `443(www)`
- `443(@)` -> `443(www)`
- `443(www)` -> 反向代理到 `127.0.0.1:8080`

其中：

- `@` 表示裸域 `iconquestion.com`
- `www` 表示 `www.iconquestion.com`

对应的 Nginx 配置如下：

```nginx
# 80(www) -> 443(www)
# 80(@) -> 443(www)
server {
    listen 80;
    listen [::]:80;
    server_name iconquestion.com www.iconquestion.com;

    return 301 https://www.iconquestion.com$request_uri;
}

# 443(@) -> 443(www)
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name iconquestion.com;

    ssl_certificate /etc/letsencrypt/live/iconquestion.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/iconquestion.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    return 301 https://www.iconquestion.com$request_uri;
}

# 443(www)
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    listen 443 quic reuseport;

    server_name www.iconquestion.com;

    root /var/www/www.iconquestion.com/public;
    index index.html index.htm index.nginx-debian.html;

    ssl_certificate /etc/letsencrypt/live/iconquestion.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/iconquestion.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://127.0.0.1:8080/;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Nginx 在当前架构中的定位

Nginx 主要负责四件事：

1. 将所有入口统一到 `https://www.iconquestion.com`
2. 处理证书与 TLS 终止
3. 将主站请求统一代理到本机 `8080`
4. 为 WebSocket 升级保留必要请求头

换句话说，主站对外看起来是一个标准 HTTPS 网站，但实际页面返回与业务逻辑处理仍主要由 Node 完成。

## 典型请求路径

### 普通页面请求

例如访问首页或某一关静态页面时：

1. 浏览器访问 `https://www.iconquestion.com/...`
2. Nginx 接收 `443(www)` 请求
3. Nginx 代理到 `http://127.0.0.1:8080/`
4. Express 从 `public/` 返回对应页面或静态资源

### 普通 API 请求

例如 `/api/12/login`：

1. 浏览器访问 `https://www.iconquestion.com/api/12/login`
2. Nginx 将请求转发到 Node `8080`
3. Express 将请求分发给 `src/12.js`
4. Node 返回 JSON、Cookie 或相关响应头

### WebSocket 请求

例如 `/api/15/challenge`：

1. 浏览器访问 `wss://www.iconquestion.com/api/15/challenge`
2. Nginx 将升级请求转发到 `8080`
3. Node 的 `http_server.on("upgrade")` 接管该请求
4. `src/15.js` 完成 WebSocket 逻辑

### 绕过 Nginx 的特殊请求

例如 17 关：

1. 客户端直接访问 `https://www.iconquestion.com:8443/api/17`
2. 请求不经过主站 `443(www)` 的 Nginx 反代入口
3. 直接到达 Node HTTPS 服务
4. 保留该关卡所需的 Trailer 能力

### 独立 HTTP/2 请求

例如 21 关：

1. 客户端直接访问 `https://www.iconquestion.com:9443/api/21`
2. 请求直接到达 Node 的独立 HTTP/2 服务
3. 由 `http2.createSecureServer(...)` 处理
4. 返回该关卡需要的 HTTP/2 特性响应

## 测试策略与架构关系

测试文件为 [test/test.js](./test/test.js)。

整体原则是：

- 大多数测试默认走正式主站入口 `https://www.iconquestion.com`
- 也就是默认经过 Nginx，再回源到 Node
- 只有依赖特殊协议或特殊响应行为的关卡，才会绕过主站入口

目前比较明确的特殊情况包括：

- 17 关测试直接访问 `8443`
  原因是需要验证 Trailer，不能经过当前主站反代路径

这意味着测试本身也反映了线上架构设计：  
普通玩法验证主站链路，特殊玩法验证直连 Node 的能力。

## 当前架构特点

### 优点

- 结构清晰，主站入口统一
- 静态内容与动态逻辑分层明确
- 每一关可以独立演化，适合解谜站点逐关扩展
- 可以按关卡需要引入不同协议特性，而不必强迫所有关卡共用同一种实现路径

### 当前代价

- 架构存在多入口端口：`443`、`8443`、`9443`
- 部分特殊关卡必须让玩家绕过主站入口理解“真实协议差异”
- 运维与文档需要明确说明每个端口和协议的用途，否则后续维护容易混淆

## 一句话总结

`Aster Archive` 当前采用的是“主站统一入口 + Node 统一内容与业务处理 + 少量特殊关卡直连特定协议端口”的架构。

这套架构既保证了大部分页面与 API 的统一访问体验，也为少数依赖 HTTP 特性的关卡保留了足够的设计空间。
