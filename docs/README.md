# 文档入口

维护当前行为时，只使用 `current/` 中的四份规范。它们按下列顺序处理冲突：

1. [产品与关卡意图](./current/product-game-intent.md)：项目目标、关卡学习意图、玩法边界。
2. [系统契约](./current/system-contract.md)：HTTP/API、协议、会话、持久化、配置和运行时的可实现约束。
3. [验证](./current/verification.md)：如何证明契约成立、自动化覆盖、人工验收与留白。
4. [架构](./current/architecture.md)：模块、运行时装配及其原因；它不重新定义需求。

若同一问题同时涉及产品意图与实现细节，先以产品意图决定“要什么”，再以系统契约决定“必须如何表现”。代码和测试是实现与证据，不会自动推翻当前规范。无法由资料机械解决的冲突集中在[待维护者决策](./current/owner-decisions.md)。关卡不按阶段划分，持续不定期更新。

`reference/` 是创作或排障参考，可能剧透，且不具当前规范效力：

- [关卡题解](./reference/level-solutions.md)
- [世界观设定](./reference/worldbuilding-guide.md)
- [UI 设计笔记](./reference/ui-design-guidelines.md)

`history/` 是阶段性记录，不参与当前需求或验收判断。
