# Aster Archive

Aster Archive 是一个以前后端交互为谜题主要载体的 Web 闯关类游戏，风格类似于 Mini 版 WebCTF，但更偏向于发掘现代 HTTP 和网页交互的特性，特别是一些有趣而小众的知识，而非传统 WebCTF 的难度向解谜。

在游戏中，玩家需要从前后端交互中挖掘信息，从页面源码、静态资源、请求响应、接口行为，甚至协议特性中寻找线索，逐步找到下一关的入口。

## 玩法简介

每一关都会给出通往下一关的 flag，而 flag 就是下一关的 URL 路径，格式为 `{下一关编号}-{十位随机小写字符串}`。

利用你的丰富知识和灵活思维，破解每一关的秘密吧！

详细玩法请参阅: [Aster Archive - Wiki](https://github.com/iconquestion/aster-archive/wiki)

## 游戏入口

https://www.iconquestion.com/

## 仓库简介

此仓库是这个项目的具体实现，包含**线上站点使用的所有页面、后端逻辑、测试脚本，以及用于说明项目结构和关卡实现的文档**。

## 仓库结构

`public/` 存放首页、起始页、各关卡页面，以及JS、字体、CSS等静态资源。

`src/` 存放 Node/Express 服务入口与通用服务模块；其中各个需要后端能力的关卡实现集中放在 `src/levels/`。

`test/` 自动化测试脚本。

`docs/architecture/` 存放系统架构说明。

`docs/design/` 存放页面设计规范。

`docs/gameplay/` 存放题解文档与玩法说明。

`docs/narrative/` 存放世界观与背景设定资料。

`docs/project-management/` 存放产品需求、软件需求规格、项目范围、里程碑、进度、风险、测试计划与测试改进路线等项目管理文档。

详细结构说明，请参阅 [系统架构说明](./docs/architecture/system-architecture.md)

## 仓库用途

如果你是玩家，可以直接从这里了解项目背景，然后进入网站开始游玩。在遇到难以解开的关卡时，可以阅读题解，获得思路！

如果你对该网站的设计架构感兴趣，欢迎对该网站进行贡献！

## 仓库构建

推荐使用 `Node.js 24.14.0` 进行本地开发与测试。

详细构建说明和方法，请参阅 [系统架构说明](./docs/architecture/system-architecture.md)

## 项目计划文档

如果你想从软件工程或项目计划角度理解这个仓库，可以进一步阅读：

- [文档索引](./docs/README.md)
- [产品需求说明](./docs/project-management/product-requirements.md)
- [软件需求规格说明书（SRS）](./docs/project-management/software-requirements-specification.md)
- [项目范围说明](./docs/project-management/project-scope.md)
- [项目里程碑](./docs/project-management/project-milestones.md)
- [项目进度记录](./docs/project-management/project-progress.md)
- [风险管理文档](./docs/project-management/risk-management.md)
- [测试计划文档](./docs/project-management/test-plan.md)
- [测试改进路线](./docs/project-management/test-improvement-roadmap.md)

## 代码检查与格式化

项目当前同时使用 `ESLint` 与 `Prettier`：

- `ESLint` 负责检查潜在错误、未使用变量与可疑代码
- `Prettier` 负责统一代码格式，不参与规则判定

可使用以下命令：

- `npm run lint`
- `npm run lint:fix`
- `npm run format`
- `npm run format:check`

为避免提交后才在 CI 中发现格式问题，仓库现在包含一个版本控制下的 Git `pre-commit` hook：

- 首次执行 `npm install` 后，会自动启用 `.githooks/pre-commit`
- 每次 `git commit` 前，会对本次暂存的常见文本文件自动执行 Prettier，并重新加入暂存区

如果你已经在本地安装过依赖，但 hook 还没启用，也可以手动执行一次：

- `npm run prepare`

## License

本项目采用分离授权方式。

代码部分使用 `AGPL-3.0`，非代码内容使用 `CC BY-NC-SA 4.0`

详情请参阅：

- [LICENSE](./LICENSE)
- [LICENSE-CC-BY-NC-SA-4.0](./LICENSE-CC-BY-NC-SA-4.0)

## 补充说明

本项目使用 AI 进行辅助构建。因此你可能会看到一些不太符合人类自然表述习惯的文本内容或代码注释。

受个人时间和精力限制，我无法在不依赖 AI 的情况下进行快速构建和功能测试。事实证明，AI 显著提高了该网站的开发效率。

在推进网站开发的同时，我会尽力减少 AIGC 带来的不适感和违和感，在开发效率和开发质量上取得平衡。

对于已完工的部分，我仍然会进行不定期检查，以改善文本的表达效果和代码质量。

如果你有任何好的建议或想法，欢迎在 Discussion 中进行留言反馈，或在 Issue 中提出你的问题！
