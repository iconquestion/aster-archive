# 贡献指南

感谢你关注 Aster Archive。欢迎修复影响游玩的错误，改善页面体验、测试和文档，也欢迎提出新的关卡思路。

## 先讨论还是直接提交

小修可以直接发 PR。明确可复现的问题可以开 Issue，玩法建议和较大的改动计划优先在 Discussions 讨论。也可以发邮件联系维护者。 [Issues](https://github.com/iconquestion/aster-archive/issues) · [Discussions](https://github.com/iconquestion/aster-archive/discussions) · [邮件](mailto:mojavenight@qq.com)

涉及玩法、题面、接口、部署、仓库结构、公开范围或授权的改动，请先说明影响。批量改版或统一格式前也请先讨论。提议新关时，写清玩家要观察什么、和已有玩法有什么区别、预期难度，以及是否依赖后端或特殊协议。 [产品与关卡意图](./docs/product-game-intent.md)

## 提交改动

- 一个 PR 聚焦一个问题。说明改动涉及的关卡或模块，以及它对原有题面、线索和解法的影响。
- 先按 README 启动项目，再按改动范围选择自动化测试和手工验证。涉及接口、协议、部署或验证步骤的改动，请同步更新相应文档。 [本地运行](./README.md#本地运行) · [维护指南](./docs/maintenance.md) · [系统契约](./docs/system-contract.md)
- 在 Issue、Discussion 和 PR 的公开描述中，尽量避免直接写出答案、隐藏路径或关键线索。需要讨论解法时，请标明剧透。 [行为准则](./CODE_OF_CONDUCT.md) · [关卡题解（含剧透）](./docs/reference/level-solutions.md)
- 涉及实际服务、部署环境或用户数据的安全问题，请按安全策略私下报告。 [安全策略](./SECURITY.md)

## 贡献授权

提交贡献即表示同意按仓库现有授权发布。代码使用 AGPL-3.0，非代码内容使用 CC BY-NC-SA 4.0。 [代码许可](./LICENSE) · [非代码内容许可](./LICENSE-CC-BY-NC-SA-4.0)
