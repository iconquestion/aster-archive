# Design Notes

本文档记录当前低风险关卡页面在第一轮 Bootstrap 化改造中使用的设计依据与结构约定。

目标不是建立完整设计系统，而是给后续页面改造提供一套一致、可复用、低风险的视觉规则。

## 设计目标

- 在不改变谜题逻辑的前提下，提高页面的基本观感与可读性
- 统一低风险关卡的阅读宽度、留白、按钮风格和提示区样式
- 让移动端和桌面端都能稳定展示
- 尽量只改展示层，不改脚本依赖的 DOM id、name 和请求行为

## 基础资源

低风险关卡统一引入以下样式资源：

- `/bootstrap/dist/css/bootstrap.css`
- `/css/challenge-theme.css`

其中：

- Bootstrap 负责基础排版、表单、按钮、栅格和通用工具类
- `challenge-theme.css` 负责题面气质、卡片外观、结果区、提示区等项目级统一细节

## 页面结构约定

低风险关卡默认采用统一的题面外壳：

```html
<body class="challenge-page">
  <main class="page-shell container py-5">
    <div class="row justify-content-center">
      <div class="col-12 col-lg-9 col-xl-8">
        <section class="card puzzle-card shadow-sm">
          <div class="card-body p-4 p-md-5 puzzle-copy">
            <!-- 页面内容 -->
          </div>
        </section>
      </div>
    </div>
  </main>
</body>
```

这套结构的依据：

- `challenge-page`：给整页提供统一背景和最小高度
- `page-shell container py-5`：统一上下留白和正文宽度
- `row justify-content-center` + `col-12 col-lg-9 col-xl-8`：让内容在桌面端保持适中的阅读宽度，在移动端全宽
- `card puzzle-card shadow-sm`：建立统一题面卡片观感
- `card-body p-4 p-md-5 puzzle-copy`：统一正文内边距和文本基调

## 标题与段落规则

### 标题

一级标题统一使用：

```html
<h1 class="display-6 fw-bold mb-3">...</h1>
```

依据：

- `display-6`：让关卡标题足够醒目，但不夸张
- `fw-bold`：保证识别度
- `mb-3`：和正文保持固定起始间距

次级标题一般使用：

```html
<h2 class="h4 fw-semibold mb-3">...</h2>
<h3 class="h5 fw-semibold mb-3">...</h3>
```

### 段落

普通正文段落默认使用 `<p>`，并按语义逐段保留，不合并成长段。

常用写法：

```html
<p class="text-secondary mb-2">...</p>
<p class="text-secondary mb-0">...</p>
```

依据：

- `text-secondary`：降低正文对标题和按钮的抢占感，让题面更柔和
- `mb-2`：用于连续叙述段落，保持紧凑但不拥挤
- `mb-0`：用于某一组内容里的最后一段，避免多余底部间距

在 `challenge-theme.css` 中，`.puzzle-copy p, li, cite` 统一设置了：

- `color: #495057`
- `line-height: 1.8`

这意味着文本的“可读性”主要由 `.puzzle-copy` 控制，而 Bootstrap 类负责局部节奏和层级。

## 按钮与操作区规则

### 单按钮页面

单按钮页面一般写成：

```html
<div class="action-stack mt-4">
  <div class="action-row">
    <button id="..." class="btn btn-primary" type="button">...</button>
  </div>
  <p id="..." class="result-panel"></p>
</div>
```

依据：

- `action-stack`：把“按钮区”和“结果区”做成垂直分组
- `mt-4`：让交互区和叙述正文明确分开
- `btn btn-primary`：主操作按钮统一视觉语义

### 多按钮页面

多按钮选择场景统一使用：

```html
<div class="action-row">
  <button class="btn btn-outline-primary" type="button">...</button>
  <button class="btn btn-outline-primary" type="button">...</button>
</div>
```

依据：

- `action-row`：使用 `flex + wrap + gap`，保证按钮在窄屏下自动换行
- `btn-outline-primary`：适合并列选项，避免多个实心主按钮抢焦点
- 如果页面只有一个核心入口，优先用 `btn-primary`

### 链接入口

关卡入口链接如果需要强化成行动按钮，使用：

```html
<a class="btn btn-primary btn-link-entry" href="...">...</a>
```

其中 `btn-link-entry` 只负责给入口按钮一个更稳定的最小宽度。

## 结果区规则

结果区统一使用 `.result-panel`。

文本结果常用：

```html
<p id="result" class="result-panel"></p>
```

代码或保留换行的结果常用：

```html
<pre id="result" class="result-panel inline-code-block"></pre>
```

设计依据：

- 结果区在页面初始时就占位，减少点击前后布局跳动
- `min-height` 保证空状态不突兀
- `white-space: pre-wrap` 兼容普通文本结果中的换行
- `pre.result-panel` 额外开启 `overflow: auto`，适合代码块或长输出

相关类职责：

- `result-panel`：统一结果面板外观
- `inline-code-block`：去除 `pre` 默认多余底边距

## 提示区规则

提示区统一包在 `.hint-panel` 中，内部仍保留原生 `details/summary`：

```html
<div class="hint-panel mt-4">
  <details>
    <summary>Hint</summary>
    <p class="mb-0">...</p>
  </details>
</div>
```

设计依据：

- 保留原生 `details` 语义和交互，不引入额外 JS
- 通过 `.hint-panel details` 提供轻量强调，但不盖过正文和操作区
- `summary` 提高字重，方便玩家识别“提示入口”

如果 `details` 内有多段文字：

- 中间段落可用 `mb-2`
- 最后一段用 `mb-0`

## 列表与特殊内容规则

### 普通列表

正文中的 `ol` 或 `ul` 保留语义结构，不强行改成卡片列表。

常见写法：

```html
<ol class="ps-3 mb-0">
  ...
</ol>
```

依据：

- `ps-3`：轻量缩进
- `mb-0`：避免列表后多出不必要空白

### 内容列表容器

像 10 关这样的大块列表内容，会外包一层 `.list-surface`：

```html
<div id="photos" class="list-surface">...</div>
```

依据：

- 给长列表一个独立信息面板
- 提升扫描性，同时不改变内部元素顺序和 id
- `list-surface hr` 统一分隔节奏

## 响应式依据

当前低风险页的响应式策略很克制，原则如下：

- 主体宽度依赖 Bootstrap 栅格，不单独发明复杂断点
- 小屏下尽量全宽展示卡片内容
- 多按钮允许换行，不强行塞进单行
- 在 `575.98px` 以下，额外减小页面上下留白并微调卡片圆角

## 不变约束

在使用本套规则改造关卡时，以下内容默认不应修改：

- 现有 DOM id
- 现有脚本通过 `getElementById` 获取的节点
- 现有表单字段名
- 现有请求路径、请求方法和请求参数
- 现有提示文案和谜题关键文本含义

允许修改的范围主要是：

- 结构包裹层
- Bootstrap 类名
- 展示用的辅助类
- 不影响逻辑的布局标签整理

## 当前公共类清单

当前 `public/css/challenge-theme.css` 中已经定义并投入使用的项目级类：

- `challenge-page`
- `page-shell`
- `puzzle-card`
- `puzzle-copy`
- `action-stack`
- `action-row`
- `result-panel`
- `hint-panel`
- `btn-link-entry`
- `list-surface`
- `inline-code-block`

后续如果继续扩展页面设计，优先复用这些类；只有在现有类无法表达新需求时，才新增新的公共类。

## 尚未纳入本轮统一主题的页面

以下页面目前没有接入 `challenge-theme.css`，原因不是“遗漏”，而是主动暂缓。

### 尚未改造的主入口关卡

- `12-d1q7m4z8pv/index.html`
  原因：该页会在运行时动态生成大量 DOM 和交互界面，不是单纯静态题面页，需要单独设计结构，而不是直接套用当前轻页面模板。

- `14-p5v8d1q7mz/index.html`
  原因：该页存在隐藏表单、逐步显现的交互流程和嵌套 `details`，需要更谨慎地处理展示状态，避免影响题目节奏。

- `15-x2m9k4c6ra/index.html`
  原因：该页是强交互小游戏页，已经有完整的自定义布局、按钮尺寸和日志区域，直接套当前统一主题风险较高。

- `19-h9m4q2z8xc/index.html`
  原因：该页有明确的字体和阅读氛围设计，视觉本身就是题面的一部分，不适合直接并入统一卡片风格。

- `20-x2k8t5m9qw/index.html`
  原因：该页已有输入框的定制字体设定，属于适合谨慎调整的页面；如果需要改造，更适合单独微调，而不是直接套当前批量模板。

- `23-f6y5v4v0k0/index.html`
  原因：该页重点在脚本行为、控制台和安全办公室氛围，页面虽然结构简单，但不适合直接按普通轻页面统一包装。

- `25-v5f2b5h0e9/index.html`
  原因：该页已经有完整的强定制视觉，并使用了 `badge`、`modal` 等潜在冲突类名，是当前最不适合直接接入统一 Bootstrap 主题的页面。

### 不属于本轮改造范围的页面

- `public/index.html`
  原因：首页本来就已经单独做过 Bootstrap 化，不属于本轮低风险关卡批量改造对象。

- `15-x2m9k4c6ra/index2.html`
  原因：这是 15 关的备用或实验页面，不属于当前主入口统一改造范围。

- `13-k9c3x6n2tw/gallery/index.html` 及 `gallery/*.html`
  原因：这些属于图库子页面，不在本轮“关卡主入口页”统一改造范围内。
