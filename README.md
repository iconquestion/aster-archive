# aster-archive

一个以网页本身为谜题载体的 Web 闯关游戏。

`Aster Archive` 是一个围绕前后端细节、HTTP 行为与基础 CTF 概念展开的微型解谜项目。玩家需要从页面源码、静态资源、请求响应、接口行为，甚至协议特性中寻找线索，逐步找到下一关的入口。

## 项目特色

这个项目最核心的特点，是把“网页”本身当作玩法的一部分来设计。线索不只藏在页面内容里，也可能藏在注释、资源文件、响应头、Cookie、请求方法、WebSocket、Range、Trailer 或 HTTP/2 行为里。整体难度会逐步提升，但目标不是做成纯卡人的题库，而是让玩家在闯关过程中自然接触一些真实的 Web 细节。

另外，这个项目是按“关卡”来组织的。大多数关卡都可以看作一个相对独立的小型页面或小型场景，因此既方便逐步扩展，也方便后续继续追加新的题目和方向。

## 玩法简介

玩法很简单：每一关都会给出通往下一关的线索，而答案本质上就是下一关的 URL 路径。通常格式是 `{下一关编号}-{十位随机小写字符串}`。有些关卡只需要查看源码，有些则需要打开开发者工具、观察网络请求，或者直接与后端接口交互。

游戏入口：

- 首页：`https://www.iconquestion.com/`
- 起始页：`https://www.iconquestion.com/00-letsstart`

如果你只是想直接开始玩，从起始页进入就可以；如果你想研究实现方式，最好同时结合浏览器开发者工具和仓库代码一起看。

## 这个仓库是做什么的

这个仓库既是游戏站点本身，也是这个项目的实现仓库。它包含了线上站点使用的页面、后端逻辑、部分测试脚本，以及一些用于说明项目结构和关卡实现的文档。

你可以把它当作：

- 这个游戏的源码仓库
- 一个用真实网页细节来设计谜题的实验项目
- 一个可继续扩展关卡的基础框架
- 一个记录当前实现方式的维护仓库

如果你想了解它“怎么跑起来”，或者想继续维护、扩展和部署它，这个仓库就是入口。

## 仓库里有什么

仓库内容大致分成几部分。

`public/` 存放首页、起始页、各关卡页面，以及脚本、字体、样式等静态资源。  
`src/` 存放 Node/Express 服务入口和各个需要后端能力的关卡实现。  
`test/` 用于验证关键后端关卡是否仍然符合预期。  
文档部分目前主要有 [construction.md](/var/www/www.iconquestion.com/construction.md) 和 [101-solutions.md](/var/www/www.iconquestion.com/101-solutions.md)。

其中，`construction.md` 专门负责描述整体架构、请求流和部署关系；README 这里只做概要说明，不再重复展开。

## 可以用这个仓库做什么

如果你是玩家，可以直接从这里了解项目背景，然后进入网站开始游玩。  
如果你是开发者，可以把它当作一个 Node + 静态页面结合的 Web 解谜项目参考。  
如果你是维护者，可以继续在现有结构上追加新关卡、修改题面、补充后端玩法，或者调整部署方式。  
如果你只是对设计思路感兴趣，也可以把它当作一个“如何把 Web 知识做成闯关游戏”的例子来读。

## 运行与架构

项目基于 Node.js，使用 Express 处理静态资源和部分 API。线上采用 Nginx + Node 的方式部署，少数依赖特殊协议能力的关卡会使用额外端口。

更完整的架构说明、端口设计、Nginx 转发关系与特殊关卡处理方式，请查看 [construction.md](/var/www/www.iconquestion.com/construction.md)。

如果只看本地最基础的启动方式，可以使用：

```bash
npm install
npm start
```

## License

本项目采用分离授权方式：

- 代码部分使用 `AGPL-3.0`
- 非代码内容使用 `CC BY-NC-SA 4.0`

详细说明见：

- [LICENSE](/var/www/www.iconquestion.com/LICENSE)
- [LICENSE-CONTENT](/var/www/www.iconquestion.com/LICENSE-CONTENT)

## 作者与联系方式

作者：`iconquestion`

- GitHub：`https://github.com/iconquestion/aster-archive`
- 邮箱：`mojavenight@qq.com`

如果你有建议、想法或反馈，欢迎通过 GitHub Discussion 或 Issue 联系。
