# Solutions

本文档为关卡题解，说明每一关的当前实现、解法和设计目标。

## 01

### 设计目标

让玩家学习查看页面源代码。

### 文案与知识点的结合

这一关的剧情关键词是入口。玩家要找建筑群的入口，而在 Web 里，这一关真正的入口信息藏在页面源码里。

### 解题步骤

1. 打开 `01-k3f9x2m7qd/index.html` 的源码。
2. 在 HTML 注释里可以直接看到：

```html
<!-- 02-v8n2c4z1pa -->
```

### 答案

`02-v8n2c4z1pa`

## 02

### 设计目标

让玩家学习查看引用的资源文件内容。

### 文案与知识点的结合

这一关写的是铁门、铁锁、年代感的外观。对应到前端里，最贴近外观的就是 CSS。

### 解题步骤

1. 这一关 HTML 里引用了 `/css/02.css`。
2. 打开这个 CSS 文件：

```css
.archive {
  font-family: 'Courier New', Courier, '03-r5t9m1x8wb', monospace;
}
```

3. `font-family` 里夹带了flag。

### 答案

`03-r5t9m1x8wb`

## 03

### 设计目标

让玩家学习查看 `<head>` 区域中的元数据。

### 文案与知识点的结合

文案里特别写了这座楼以领导人 Benjamin 的名字命名。领导人对应英文 `head`，正好引导玩家想到 HTML 里的 `<head>`。

### 解题步骤

1. 打开 `public/03-r5t9m1x8wb/index.html`。
2. 在 `<head>` 里可以看到：

```html
<meta name="version" content="04-q7d2s9l4vc" />
```

### 答案

`04-q7d2s9l4vc`

## 04

### 设计目标

让玩家学习观察 HTTP 响应头。

### 文案与知识点的结合

这一关的核心意象是回音和钟声。页面里真正显示出来的正文内容并不重要，关键是敲一下钟之后服务器回了什么额外信息。对应到 HTTP，就是除了响应体之外，还要看响应头这种附带回声。

### 实现方式

后端在 `src/04.js` 中对 `GET /api/04` 设置了自定义响应头 `X-Archive-Next`。

### 解题步骤

1. 点击页面按钮，请求 `/api/04`。
2. 使用浏览器开发人员工具或第三方工具查看响应头。

`GET https://www.iconquestion.com/api/04`

响应头（关键部分）：

```http
X-Archive-Next: 05-x1p8z3n6kf
Content-Type: application/json; charset=utf-8
```

### 答案

`05-x1p8z3n6kf`

## 05

### 设计目标

让玩家学习使用不同的 HTTP Method。

### 文案与知识点的结合

剧情里你面对的是一扇门，按钮写的是"推一下门"，提示写的是"推不开就拉拉试试"。现实里的推 / 拉对应到 HTTP 里的换一种请求方式。前端默认是 `GET`，而真正能打开门的是 `POST`。

### 实现方式

前端按钮默认调用的是 `fetch("/api/05")`，也就是 `GET`。但后端在 `src/05.js` 中把真正答案放在 `POST /api/05`。

### 解题步骤

1. 查看JS代码

```js
get_json_response('knock', 'responseMsg', '/api/05');
```

`get_json_response` 默认不传 `fetch_attrs`，所以这是一个 `GET` 请求。

2. 将 HTTP Method 改为 `POST` ，再次发送。

`https://www.iconquestion.com/api/05`

错误请求示例：

```http
GET /api/05 HTTP/1.1
Host: www.iconquestion.com
```

错误响应：

```json
{ "message": "YOU SHALL NOT PASS!!!\n门似乎并不是很想让你过去。" }
```

正确请求示例：

```http
POST /api/05 HTTP/1.1
Host: www.iconquestion.com
Content-Length: 0
```

也可以直接用 `curl`：

```bash
curl -X POST https://www.iconquestion.com/api/05
```

正确响应：

```json
{ "message": "Welcome back, my master. \nThe password is 06-m4v7q2c9ta." }
```

### 答案

`06-m4v7q2c9ta`

## 06

### 设计目标

让玩家学习猜测和修改query查询参数，而不是完全相信前端给的默认值，培养探索思维。

### 文案与知识点的结合

剧情里这是一台员工自助领取 ID 卡片的机器，默认逻辑当然只会给普通员工流程；但文案又写了"支持自定义样式"和"不妨大胆一些"，其实是在鼓励玩家不要只照着前端按钮走，而是主动改请求参数，尝试更高权限身份。前端生成复杂指纹只是叙事包装，真正关键的知识点仍然是 query 参数可被观察和修改。

### 实现方式

前端会生成一段浏览器指纹，然后请求：

```js
/api/06?level=staff&fingerprint=...
```

但后端 `src/06.js` 真正判断的关键是 `level`，当它等于 `manager` 时才会给出下一关线索。

### 解题步骤

1. 查看JS代码

```js
/api/06?level=staff&fingerprint=...
```

前端默认把你包装成普通员工 `staff`，并附带一长串指纹信息，看起来很唬人，但真正决定结果的是 `level`。

2. 把 query 参数改成 `manager`，重新发送请求。

`GET https://www.iconquestion.com/api/06?level=manager`

响应：

```json
{
  "message": "Welcome, manager! Your office is located at No.07-z9k3d6w1rx, 7th floor."
}
```

### 答案

`07-z9k3d6w1rx`

## 07

### 设计目标

让玩家学习进一步探索页面中未给出的其他信息。

### 文案与知识点的结合

剧情里你拿到了一份地图导览，但上面只有三个可选地点，显得信息过少。标题 `Less Is More` 也是在提醒你：页面展示得越少，越应该怀疑还有隐藏分支。地图上缺失的地点，对应到 Web 里就是前端没做出来、但后端可能已经支持的参数分支。

### 实现方式

当前实现中，只要请求一个页面上未提供的位置，后端默认分支就会返回一段提示语，提示你还有管理办公室这个方向可以尝试；当你进一步请求 `visit_manager_office` 时，才会拿到下一关线索。

### 解题步骤

1. 查看页面和页面源码。

   页面上只提供了三个按钮：
   - `visit_grand_reading_hall`
   - `visit_archive_room`
   - `visit_exhibit_corridor`

   页面源码里还有一句注释：

   ```js
   // 更多区域正在开发中...
   ```

   因此这一步的关键不是只看现有按钮，而是自己手动尝试其他 `location` 参数，例如请求一个其他的任意位置。

2. 尝试修改 location ，请求一个其他的位置。

   返回：

   ```json
   {
     "message": "很抱歉，该区域当前不对外开放。建议您前往其他区域参观，以获取更多关于档案馆的公开信息。\n以下是推荐的区域：主览大厅, 公共档案区, 展示长廊，管理办公室"
   }
   ```

   这个响应已经明确把管理办公室作为新的可尝试方向暴露出来了。

3. 尝试请求管理办公室与之对应的 query 参数。玩家需要进行一定的猜测。

   后端 `src/07.js` 中对应分支是：

   ```js
   case "visit_manager_office": {
      responseMsg = "...";
   }
   ```

   `GET https://www.iconquestion.com/api/07?location=visit_manager_office`

   响应：

   ```json
   {
     "message": "这里曾经是档案的管理办公室，陈列着早已泛黄的旧文件和木制桌椅。最上面的文件是有关08-c2x8m5q9nv房间档案的展出规划资料。"
   }
   ```

### 答案

`08-c2x8m5q9nv`

## 08

### 设计目标

让玩家学习查看 `robots.txt` 并利用其中的信息挖掘隐藏目录。

### 文案与知识点的结合

剧情里你找不到入口，而墙上的残缺信息提示你换一个角度理解这片区域。Hint 明说"每一关都可以视作独立的网站根目录"，这相当于把建筑平面图转换成网站目录结构。找不到房间入口，对应到 Web 里就是去根目录下找 `robots.txt`、目录索引和隐藏路径。

### 实现方式

- 页面暗示"每一关都可以视作独立网站根目录"。
- 根目录下有 `robots.txt`。
- 服务器在 `src/index.js` 中对 `/08-c2x8m5q9nv/` 开了目录索引。

### 解题步骤

1. 访问 robots.txt。

   `https://www.iconquestion.com/08-c2x8m5q9nv/robots.txt`

   内容是：

   ```txt
   User-agent: *
   Disallow: /exhibition
   Disallow: /infra
   Disallow: /reading_room
   Disallow: /stack
   Disallow: /staff
   ```

   其中最值得继续看的是 `/stack`，因为它最像档案馆里的库房区域。

   因为这一关目录启用了索引，可以继续浏览目录，最终会找到：

   `/08-c2x8m5q9nv/stack/restricted/914/2013-12-31.txt`

2. 遍历目录，寻找线索。

   在`/08-c2x8m5q9nv/stack/restricted/914/2013-12-31.txt`，文件末尾写着：

   ```txt
   请立即前往档案馆医务室，并告知值班医师你已"接触09-t7p1z4k8ds"。
   ```

### 答案

`09-t7p1z4k8ds`

## 09

### 设计目标

让玩家学习根据静态资源的命名规律，主动尝试旧版本文件，从历史版本中寻找线索。

### 实现方式

页面加载的是 `/js/09.countdown.v2.js`，但真正线索在 `/js/09.countdown.v1.js` 的注释里。

### 解题步骤

1. 查看页面源码。

   不难发现下面的内容：

   ```html
   <script src="/js/09.countdown.v2.js"></script>
   ```

   根据版本号很自然可以猜测旧版本 `v1` 的存在。

2. 尝试访问 v1 版本的 JS 文件。

   `https://www.iconquestion.com/js/09.countdown.v1.js`

   在许可证注释中有一行被故意替换：

   ```txt
   provides the Work (and each Contributor provides its 10-w3n9c6v2mq)
   ```

### 答案

`10-w3n9c6v2mq`

## 10

### 设计目标

让玩家学习阅读残缺的 JavaScript 代码，补全逻辑并根据程序运行规则还原答案。

### 实现方式

虽然页面正文描述成"按日期一键排序"，但脚本故意被损坏了一部分。只要把缺失逻辑补全，就能得到下一关。

### 解题步骤

1. 查看页面源码，可以发现每张"照片"都对应一个 DOM id 和一个日期。

2. 结合现有代码推断真实逻辑。
   - 对日期字符串做 `hashDate`

   - 再通过 `hashToChar` 映射成一个字符

   - 把 `{ date, ch }` 放进数组

   - 最后按日期排序，而不是按原始 DOM 顺序

   - 排序后把字符拼起来

3. 将页面中的残缺代码补全。

   将页面中的残缺代码补全后，等价逻辑如下：

   ```js
   const hash = hashDate(rawDate);
   const ch = hashToChar(hash);

   result.push({
     date: rawDate,
     ch: ch,
   });

   const flag = result
     .sort((a, b) => new Date(a.date) - new Date(b.date))
     .map((x) => x.ch)
     .join('');

   console.log('FLAG:', '11-' + flag);
   ```

   也就是说，`div` 的 `id` 只是干扰项，真正参与计算的是每张照片上方的日期文本。先用页面给出的自定义哈希算法把日期映射成字符，再按日期先后重新排序，才能得到正确结果。

4. 运行脚本。

   最终结果就是：

   `11-zcwl17ouoa`

### 答案

`11-zcwl17ouoa`

## 11

### 设计目标

让玩家学习处理多层编码与文本变换，并借助现成工具按顺序还原原始内容。

### 实现方式

页面里给了一长串"社会主义核心价值观编码"文本。当前实现对应的解法就是按既定的解码链路依次处理。

PoC:

https://sym233.github.io/core-values-encoder/

https://cyberchef.org/#recipe=From_Hex('Auto')From_Base64('A-Za-z0-9%2B/%3D',true,false)ROT13(true,true,false,13)Reverse('Character')&input=NjE1NzRkMzQ2MjU0NTIzNjRlMzI1MTc4NjM1MzMwNzk0ZDUzMzE2ZDY0NDczNTM1NjM3NzNkM2Q

### 解题步骤

1. 先把页面展示的"核心价值观编码"还原为一串十六进制文本。

2. 再按上面的 PoC 链路继续处理。

   由于玩家无法拿到 PoC，需要凭借经验进行猜测和尝试，故此关具有一定难度。但本站鼓励玩家使用 LLM 等其他方式进行解谜，而非硬核技术攻关。
   - From Hex
   - From Base64
   - ROT13
   - Reverse

   得到的最终结果是：
   `flags-12-d1q7m4z8pv`

### 答案

`12-d1q7m4z8pv`

## 12

### 设计目标

让玩家学习发现隐藏入口、爆破简单口令，并在拿到会话后继续访问受保护接口。

### 实现方式

- 隐藏管理入口需要在"搭载最新 AI 系统!"那行点击 5 次解锁。

- 登录成功会下发一个名为 `bibilabu` 的 Cookie。

- 查询房间信息必须带 Cookie，且 `room_id=13`。13 意为下一关的编号。

### 解题步骤

1. 查看页面里的隐藏逻辑。

   点击"搭载最新 AI 系统!" 5 次后，`adminEntryUnlocked = true`，才会显示"管理员入口"。

2. 显示入口后，找到登录接口。

   `POST https://www.iconquestion.com/api/12/login`

   表单参数：

   ```txt
   username=admin
   password={四位数字密码}
   ```

   这一关的关键是不要被"管理员登录"吓住，因为题目真正想让玩家尝试的是四位数爆破。

3. 查看当前实现中的密码生成机制。

   当前实现会在服务端代码中，基于固定 secret 和当天日期生成一个当日有效的四位数字密码。

   这个密码：
   - 每天轮换一次
   - 同一天内保持稳定
   - 保留前导 `0`，因此应视为四位数字字符串而不是普通数字
   - 在服务进程内按天缓存，因此高频爆破时不会为每次请求重复计算哈希

   因此这一关的设计思路就是对管理员密码进行四位数爆破。

4. 观察爆破出正确密码后的返回结果。

   ```json
   { "message": "登录成功" }
   ```

   同时设置 Cookie，例如：

   ```http
   Set-Cookie: bibilabu=<当日四位密码>; Path=/api/12/get_room_info; HttpOnly; ...
   ```

5. 继续请求受保护接口。

   `GET https://www.iconquestion.com/api/12/get_room_info?room_id=13`

   并携带刚才的 Cookie。

6. 查看正确响应。

   ```json
   { "message": "13-k9c3x6n2tw" }
   ```

### 答案

`13-k9c3x6n2tw`

## 13

### 设计目标

让玩家学习查看 `sitemap.xml`，并从站点中未直接链接的页面里继续挖掘线索。

### 实现方式

主页只给了 `gallery/` 入口，但 `sitemap.xml` 中还列出了一个没有在页面中直接暴露的草稿页。

### 解题步骤

1. 访问 `sitemap.xml`。

   `https://www.iconquestion.com/13-k9c3x6n2tw/sitemap.xml`

2. 在里面寻找不寻常的条目。

   `/13-k9c3x6n2tw/gallery/__draft__k9a2`

3. 打开这个隐藏页面并查看 HTML 注释。

   ```txt
   好像是14-p5v8d1q7mz
   ```

### 答案

`14-p5v8d1q7mz`

## 14

### 设计目标

让玩家学习除了在 body 内放置认证信息（如 application/x-www-form-urlencoded ）之外的其他认证方式。不要被页面表单迷惑，而是去猜测观察后端真正要求的认证方式。

### 实现方式

页面上给了一个不能正常输入的表单，但接口响应里又明显在暗示这并不是普通表单提交，而是另一种认证方式。

### 解题步骤

1. 观察页面中的 form 和对应的 API。

   页面里的 form 是障眼法，而且输入框还是 `disabled`。

2. 尝试提交一次表单，查看响应。

   由于认证方法不匹配，响应并不会带来真正的进展，说明题目的关键不在于正常填写表单。

3. 改为尝试 Basic Auth。

   这一关明显在引导玩家去尝试表单之外的认证方式，根据响应中提供的被混淆的头部 `W3-xxthxxtixxtx` ，最常见、也最符合题目语境的就是 WWW-Authentication Basic Auth。

4. 用 WWW-Authentication Basic Auth 尝试发送一次请求。

   ```http
   POST /api/14/login HTTP/1.1
   Host: www.iconquestion.com
   Authorization: Basic YWRtaW46YWRtaW4=
   Content-Length: 0
   ```

   或：

   ```bash
   curl -X POST \
     -H 'Authorization: Basic YWRtaW46YWRtaW4=' \
     https://www.iconquestion.com/api/14/login
   ```

   后端逻辑给出了非常明显的用户名和密码提示，玩家可以轻易猜测凭据。

   凭据正确的响应：

   ```json
   {
     "message": "Welcome, admin! The password for the next room is 15-x2m9k4c6ra."
   }
   ```

### 答案

`15-x2m9k4c6ra`

## 15

### 设计目标

让玩家学习 WebSocket 相关知识，并根据服务端的交互反馈一步步推进状态。

### 实现方式

页面不是普通的一次性 HTTP 提交，而是要求玩家建立 WebSocket 连接，并在交互过程中根据反馈不断调整动作。

为了降低难度，页面中已经设计好了 WebSocket 相关代码，玩家只需要进行操作即可。

### 解题步骤

如只希望通关，则玩家只需按照常规逻辑进行游玩，不需要任何前后端知识。

唯一的难点在于，网页并未提供 GUI 游戏显示界面，玩家需要使用其他方法记忆当前状态。

为了控制难度，迷宫生成大小固定 5x5，玩家可以轻易通关。

如果希望深入探究 WebSocket 知识，或者假定网页未给出任何现成的 WebSocket 代码，则玩家需要按照下面的步骤进行分析解题。

1. 先查看页面前端写死的地址，并尝试建立 WS 连接。

   ```js
   const wsUrl = `${wsProtocol}//${location.host}/api/15/challenge`;
   ```

2. 建立连接后，先观察服务端返回的提示消息。

   ```json
   { "message": "WebSocket connected. Please send { action: 'init' }" }
   ```

3. 按提示先发送初始化消息。

   ```json
   { "action": "init" }
   ```

4. 服务器返回地图尺寸。

   ```json
   { "x": 5, "y": 5 }
   ```

5. 之后开始发送移动指令。

   ```json
   {"action":"move","direction":"up"}
   {"action":"move","direction":"right"}
   ```

6. 每次发送移动指令后，观察普通响应中的状态反馈。
   - 撞墙：`{"wall":1,"win":false}`
   - 走通：`{"wall":0,"win":false}`

7. 到达终点后，查看服务端返回内容。

   ```json
   {"wall":0,"win":true,"flag":"16-7kq2m9x4bz","maze":[...]}
   ```

这一关的关键是理解服务端会根据移动结果持续反馈状态。拿到地图尺寸后，可以手工试探，也可以按撞墙反馈逐步搜索可行路径，直到到达终点。

### 答案

`16-7kq2m9x4bz`

## 16

### 设计目标

让玩家学习根据接口分支条件修改请求参数和请求头，而不是只按页面默认方式访问接口。

### 实现方式

页面和题面明显同时在提示两件事：一是关注 HTTP/3，二是关注时间点。也就是说，这一关的思路就是同时从请求头和 query 参数两边入手。

### 解题步骤

1. 先根据题面提示，尝试给请求加上和 HTTP/3 相关的请求头。

   ```http
   X-Forwarded-Http3: h3
   ```

2. 再修改时间点参数。

   如果传入当前年份或过去年份，接口只会返回类似"在遥远的过去..."的提示，这说明真正的方向是把 `timepoint` 改成未来年份。

3. 尝试传入一个明显属于未来的年份。

   `GET https://www.iconquestion.com/api/16?timepoint=2077`

4. 查看响应内容。

   ```json
   {
     "message": "Welcome to 2077 Cyberpunk! 17-c8v1n5r2ya 由于HTTP/3支持原因 未找到合适的solution 本关日后将重新设计 您可以跳过"
   }
   ```

### 答案

`17-c8v1n5r2ya`

## 17

### 设计目标

让玩家学习观察 HTTP Trailer，理解有些信息既不在普通响应头里，也不在响应体里。

### 实现方式

题目真正的线索不在页面正文里，也不在普通响应体里，而是在响应完成时额外追加的 Trailer 中。

### 解题步骤

1. 先确认页面实际请求的地址。

   `https://www.iconquestion.com:8443/api/17`

   注意这里是 `8443`。

2. 先查看普通响应头。

   ```http
   Trailer: X-Never-Be-Apart
   ```

   这说明真正的重要信息会在响应结束前以 Trailer 的形式追加，而不是放在常规响应头中。

3. 再查看响应体本身。

   ```json
   {
     "message": "在这个世界上，有些东西是无法用言语表达的。就像这封信一样，它承载着无尽的情感和回忆......"
   }
   ```

4. 继续读取 Trailer。

   ```http
   X-Never-Be-Apart: the-end-is-not-the-end...my-dear-18-p3t7w0j6kd...
   ```

### 答案

`18-p3t7w0j6kd`

## 18

### 设计目标

让玩家学习使用 `Range` 请求，并把多次分片返回的内容重新拼接起来。

### 实现方式

不带 `Range` 请求头时，接口只会返回一句提示；而一旦使用 `Range`，就可以按字节范围分段读取隐藏内容。

### 解题步骤

1. 先直接请求 `/api/18`。

   ```json
   { "message": "What's the dog doing? :P" }
   ```

2. 再观察响应头。

   ```http
   Accept-Ranges: bytes
   ```

   这说明接口支持按字节范围读取隐藏内容。

3. 尝试读取一段。

   如果读取的一段长度过大，则后端会提示：

   ```json
   { "message": "Too greedy..." }
   ```

   那么我们每次只能取一小段，所以需要分片请求。

4. 继续尝试读取，直到读取到有效信息。

   ```http
   GET /api/18 HTTP/1.1
   Host: www.iconquestion.com
   Range: bytes=80-95
   ```

   响应：

   ```json
   { "message": "ddonoteat19-h9m4" }
   ```

5. 再继续请求下一段。

   ```http
   Range: bytes=96-111
   ```

   响应：

   ```json
   { "message": "q2z8xcpleaseplea" }
   ```

6. 把两段中的有效内容拼起来。

   `19-h9m4q2z8xc`

### 答案

`19-h9m4q2z8xc`

## 19

### 设计目标

让玩家学习观察"页面实际显示效果"和"源码原文"之间的差异，并根据自定义字体的映射关系做逆推。

### 实现方式

页面引用了一套自定义字体，而正文又选用了公开可查的诗歌文本，因此这一关真正要做的是把页面显示效果和原文逐字符对照。

### 解题步骤

1. 打开这一关的页面源码并查看正文末尾。

   ```html
   <p>Your dearest zjqo-20-h2w8s5d9yg.</p>
   ```

   这一关不能只看源码，还要把"源码中的明文诗句"和"页面上使用 `/fonts/19.ttf` 后的实际显示效果"逐字符对照起来。

   由于整首诗原文是公开文本，只要观察几组对应字符，就能推出这套字体做的是"字符替换"。

2. 将 `Your dearest` 后面那串字符按同样规则逆映射。

   ```txt
   flag-20-x2k8t5m9qw
   ```

   题面里的 `Hint: Attention is all you need.` 指的就是要仔细观察页面显示和源码文本之间的差异。

### 答案

`20-x2k8t5m9qw`

## 20

### 设计目标

让玩家学习根据接口返回的反馈信息逐步缩小范围，并通过反复试探确定正确答案。

### 实现方式

- 页面会向 `POST /api/20` 发送 JSON：

  ```json
  { "guess": "..." }
  ```

- 每次提交后，接口都会返回和 Wordle 类似的反馈。

### 解题步骤

1. 查看页面可知这是一个纯输入型题目，真正的交互发生在接口 `/api/20`。

   页面会返回两类反馈：
   - 位置和字符都正确的数量 `exact`

   - 字符存在但位置不对的数量 `partial`

2. 利用这些反馈不断调整猜测。

   通过持续试探，可以逐步把正确字符串收敛到：

   ```txt
   t8d0v9c2c4
   ```

3. 然后向接口提交这个结果。

   ```json
   { "guess": "t8d0v9c2c4" }
   ```

4. 查看成功响应。

   ```json
   {
     "message": "猜对了！下一关是 t8d0v9c2c4",
     "exact": 10,
     "partial": 0,
     "isCorrect": true
   }
   ```

### 答案

`21-t8d0v9c2c4`

## 21

### 设计目标

让玩家学习观察 HTTP/2 中的 `103 Early Hints`，并顺着服务端提前暴露出的资源继续挖掘线索。

### 实现方式

- 页面会请求 `https://www.iconquestion.com:9443/api/21`。

- 当请求 `/api/21` 时，服务端会先发一个 `103 Early Hints`，内容是：

  ```http
  Link: <analytics.js>; rel=preload; as=script
  ```

- 随后才在一个 `0-2000ms` 的随机延迟后返回"你跑完了一圈，用时 xxx ms"。

- 同一个服务还额外提供了 `/api/analytics.js`。

### 解题步骤

1. 先请求：

   `https://www.iconquestion.com:9443/api/21`

   这一步最重要的信息不是最终那个"用时多少毫秒"的正文，而是提前发出的 `103 Early Hints`。它告诉客户端还有一个脚本资源 `analytics.js` 值得优先加载。

2. 顺着这个提示继续请求 `analytics.js`。

   ```txt
   GET https://www.iconquestion.com:9443/api/analytics.js
   ```

3. 查看返回的脚本内容。

   ```js
   script.src = 'https://www.googletagmanager.com/gtag/js?id=22-j4l4a7u8n2';
   gtag('config', '22-j4l4a7u8n2');
   ```

4. 从脚本内容中提取下一关路径 `22-j4l4a7u8n2`。

### 答案

`22-j4l4a7u8n2`

## 22

### 设计目标

让玩家学习观察语言协商相关的请求头，并通过修改 `Accept-Language` 触发不同的服务端分支。

### 实现方式

- 页面点击按钮后会调用：

  ```txt
  GET /api/22
  ```

- 页面上的提示"国际人，国际化(话)"，明显在引导玩家从语言环境入手。

### 解题步骤

1. 查看页面交互，确认按钮实际请求的是 `/api/22`，且没有额外参数。

   题面中的"国际化(话)"提示，说明关键在请求头里的语言环境。

2. 把请求头改成英文环境。

   ```http
   Accept-Language: en-US,en;q=0.9
   ```

3. 查看英文分支返回的介绍文本。

   ```txt
   ... provides multilingual service at 23-f6y5v4v0k0 hours ...
   ```

4. 从返回文本中提取下一关路径 `23-f6y5v4v0k0`。

### 答案

`23-f6y5v4v0k0`

## 23

### 设计目标

让玩家学习绕过前端反调试干扰，并在页面恢复正常执行后直接从 `localStorage` 中获取结果。

### 实现方式

- 页面使用了几种低门槛前端反调试手段：
  - 阻止 `F12`、`Ctrl/Cmd + Shift + I/J/C`、`Ctrl/Cmd + U`

  - 阻止右键菜单

  - 通过 `window.outerWidth/outerHeight` 与 `innerWidth/innerHeight` 的差值检测 DevTools 停靠

  - 通过对象 getter 配合控制台输出做探针检测

- 一旦判断开发者工具已打开，页面会在控制台持续输出完整警告文案，显示从 `10` 到 `1` 的倒计时，然后强制刷新页面，并且立即清空 localStorage。

- 页面脚本在正常执行一段时间后，会把解密结果写入 `localStorage["top_secret"]`。

### 解题步骤

1. 先观察页面中的前端反调试行为。

   ```txt
   [Security Office] 检测到开发者工具已打开（...），界面将在 10 秒后强制刷新。
   [Security Office] 检测到开发者工具已打开（...），界面将在 9 秒后强制刷新。
   [Security Office] 检测到开发者工具已打开（...），界面将在 8 秒后强制刷新。
   ...
   ```

   这说明如果直接打开开发者工具，页面会先把本地存储清空，因此需要先绕过这段前端限制。

2. 在本地临时屏蔽这段反调试代码后，再重新加载页面。

   更推荐的做法不是直接硬逆向整段混淆脚本，而是先把这些会拦截快捷键、检测 DevTools、清空 `localStorage` 的逻辑本地替换掉，让页面继续正常执行。

3. 等待页面完成原本的异步写入后，查看 `localStorage`。

   从注释内容可以确认，页面会把结果写入：

   ```txt
   localStorage["top_secret"]
   ```

4. 读取其中的值。

   ```txt
   flag-24-n2w0c9l1t8
   ```

### 答案

`24-n2w0c9l1t8`

## 24

### 设计目标

让玩家意识到"订阅内容本身也是线索载体"，并学会从页面提示中联想到 RSS / Feed 这种站外于正文页面、但仍属于网站内容的一部分。

### 实现方式

- 页面 `public/24-n2w0c9l1t8/index.html` 本身没有后端交互，也没有真正的订阅功能。

- 点击"点我订阅"按钮后，只会显示：

  ```txt
  这里早就废弃了，没什么好订阅的了喔！
  ```

- 题面文字和 Hint 都在引导玩家去想"以前的订阅名单"。

- 本关真正的线索放在同目录下的：

  ```txt
  /24-n2w0c9l1t8/feed.xml
  ```

- `feed.xml` 中伪装成了一份旧档案馆内部报刊订阅源。多数条目看起来都是正常的馆内消息，只有其中一条人工投递记录的部门名单里混入了下一关路径。

### 解题步骤

1. 先观察页面上的提示文本。

   页面多次提到"订阅""内部新闻报刊""以前的订阅名单"，而按钮点击后又明确告诉你这里已经废弃，说明关键不在按钮交互本身，而在"订阅内容"相关的旧记录。

2. 尝试查看当前关卡目录下可能存在的订阅文件。

   这一关没有 API，因此更合理的方向是直接查看静态文件，例如：

   ```txt
   https://www.iconquestion.com/24-n2w0c9l1t8/feed.xml
   ```

3. 阅读 `feed.xml`。

   可以看到这是一份 RSS 订阅源，里面有多条馆内报刊记录。大部分条目只是正常的档案馆内部更新，不直接给答案。

4. 找到标题为：

   ```txt
   1798 年度专栏（上半）人工投递记录
   ```

   的那一条。

5. 查看其描述内容。

   这条记录列出了几个投递去向：

   ```txt
   阅览室、编目室、总馆办公室、25-v5f2b5h0e9 与行政办公室
   ```

   其中 `25-v5f2b5h0e9` 明显不是正常部门名称，而是符合全站规则的下一关路径。

### 答案

`25-v5f2b5h0e9`

## 25

### 设计目标

让玩家认识 Service Worker 在现代 Web 中的作用，并学会在断网场景下观察页面内的离线保护逻辑、`localStorage` 快照和恢复提交流程。

### 实现方式

- 页面 `public/25-v5f2b5h0e9/index.html` 是一个运维终端。
- 前端会注册当前目录下的 `sw.js`，保证断网后本关页面仍能继续打开。
- 后端接口在 `src/25.js` 中实现，玩家使用固定账号 `admin:admin` 登录。
- 登录成功后，后端会下发一个会话级 cookie，并用这个 cookie 对应一个独立 JSON 状态文件，因此不同玩家虽然共用账号，但状态互不干扰。
- 正常提交时，前端只提交新的 `relay_target`；断网或提交失败时，前端会把未提交更改序列化到 `localStorage`，并弹出一条离线保护提示。
- 这份本地快照里包含一个 `snapshot_id`，它就是下一关答案。

### 解题步骤

1. 打开本关页面并使用固定账号登录：
   - username: `admin`
   - password: `admin`

2. 登录后会进入运维终端，可以看到当前配置值，并可以编辑 `relay_target`。

3. 这一关的关键不在正常提交，而在"断网时系统如何保护未提交内容"。

   页面提示中已经暗示：

   > This terminal protects pending edits during unstable network conditions.

4. 打开开发者工具，将网络切换为 `Offline`，然后尝试提交修改。

5. 提交失败后，页面不会跳转，而是直接弹出一个离线保护提示框，并显示：
   - `Connection lost`
   - `Recovery snapshot saved locally.`
   - `Snapshot ID: ...`

6. 这个 `Snapshot ID` 就是下一关答案。  
   如果想进一步验证，也可以打开浏览器开发者工具中的 `Application -> Local Storage`，查看键：

   `level-25-terminal-snapshot`

   其中保存的是一份 JSON 快照，例如：

   ```json
   {
     "snapshot_id": "26-h7m2q9x4pl",
     "field": "relay_target",
     "old_value": "edge-node-1",
     "new_value": "edge-node-7",
     "modified_at": "2026-04-07T12:34:56.000Z"
   }
   ```

### 答案

`26-h7m2q9x4pl`
