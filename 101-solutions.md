# Solutions

本文件基于当前项目代码整理，不只描述“表面提示”，还会说明每一关的真实考点、当前实现和可复现的解法。

总规则可参考 `public/00-letsstart/index.html`：

- 每一关的答案其实就是下一关的 URL 路径。
- 一般格式是 `{下一关编号}-{10位随机串}`。
- 需要和后端交互时，接口基本都在 `/api/{当前关卡编号}` 下。

另外有几关存在“题面设计意图”和“当前代码真实实现”不完全一致的情况，下面会单独指出。

### 01

真实意图：
让玩家先学会看页面源码，而不是只看页面渲染结果。

详细解法：

1. 打开 `01-k3f9x2m7qd/index.html` 的源码。
2. 在 HTML 注释里可以直接看到：

```html
<!-- 02-v8n2c4z1pa -->
```

答案：

`02-v8n2c4z1pa`

### 02

真实意图：
让玩家意识到“资源文件本身也可能藏信息”，不要只盯着 HTML。

详细解法：

1. 这一关 HTML 里引用了 `/css/02.css`。
2. 打开这个 CSS 文件：

```css
.archive {
    font-family: 'Courier New', Courier, '03-r5t9m1x8wb', monospace;
}
```

3. `font-family` 里被夹带了一段看起来像关卡路径的字符串。

答案：

`03-r5t9m1x8wb`

### 03

真实意图：
让玩家检查 `<head>` 区域中的元数据。

详细解法：

1. 打开 `public/03-r5t9m1x8wb/index.html`。
2. 在 `<head>` 里可以看到：

```html
<meta name="version" content="04-q7d2s9l4vc">
```

答案：

`04-q7d2s9l4vc`

### 04

真实意图：
让玩家开始观察 HTTP 响应头，而不是只看响应体。

真实实现：
后端在 `src/04.js` 中对 `GET /api/04` 设置了自定义响应头 `X-Archive-Next`。

详细解法：

1. 页面按钮实际请求的是 `/api/04`。
2. 直接查看响应头即可，不需要猜。

接口：

`GET https://www.iconquestion.com/api/04`

关键响应：

```http
X-Archive-Next: 05-x1p8z3n6kf
Content-Type: application/json; charset=utf-8
```

响应体：

```json
{"message":"hello, world!"}
```

答案：

`05-x1p8z3n6kf`

### 05

真实意图：
让玩家区分 HTTP Method。门不是看你“说了什么”，而是看你“怎么说”。

真实实现：
前端按钮默认调用的是 `fetch("/api/05")`，也就是 `GET`。但后端在 `src/05.js` 中把真正答案放在 `POST /api/05`。

详细解法：

1. 打开页面源码，能看到按钮绑定的是：

```js
get_json_response("knock", "responseMsg", "/api/05");
```

2. `get_json_response` 默认不传 `fetch_attrs`，所以这是一个 `GET` 请求。
3. 去看后端 `src/05.js`：
   - `GET /api/05` 返回 `"YOU SHALL NOT PASS!!!"`
   - `POST /api/05` 才返回下一关路径
4. 因此需要手动发送 `POST` 请求。

完整 API：

`https://www.iconquestion.com/api/05`

错误请求示例：

```http
GET /api/05 HTTP/1.1
Host: www.iconquestion.com
```

错误响应：

```json
{"message":"YOU SHALL NOT PASS!!!"}
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
{"message":"Welcome back, my master. \nThe password is 06-m4v7q2c9ta."}
```

答案：

`06-m4v7q2c9ta`

### 06

真实意图：
让玩家学会修改查询参数，而不是完全相信前端给的默认值。

真实实现：
前端固定请求 `/api/06?level=guest`，但后端 `src/06.js` 只要看到 `level=admin` 就返回下一关线索。

详细解法：

1. 页面按钮绑定的是：

```js
get_json_response("getmyidcard", "result", "/api/06?level=guest");
```

2. 去看后端：

```js
message: level == "admin"
    ? "Your identity: admin. \nYour office is located at No.z9k3d6w1rx, 7th floor."
    : "Your identity: guest. ..."
```

3. 所以把 query 参数从 `guest` 改成 `admin` 即可。

接口：

`GET https://www.iconquestion.com/api/06?level=admin`

响应：

```json
{"message":"Your identity: admin. \nYour office is located at No.z9k3d6w1rx, 7th floor."}
```

答案：

`07-z9k3d6w1rx`

### 07

真实意图：
鼓励玩家不要只点页面上已经给出的三个位置，而是主动尝试其他位置。

真实实现：
当前实现中，只要请求一个页面上未提供的位置，后端默认分支就会返回一段提示语，提示你还有“管理办公室”这个方向可以尝试；当你进一步请求 `visit_admin_office` 时，才会拿到下一关线索。

详细解法：

1. 页面上只提供了三个按钮：
   - `visit_grand_reading_hall`
   - `visit_archive_room`
   - `visit_exhibit_corridor`
2. 页面源码里还有一句注释：

```js
// 更多区域正在开发中...
```

3. 因此这一步的关键不是只看现有按钮，而是自己手动尝试其他 `location` 参数。例如先请求一个不存在的位置：

接口：

`GET https://www.iconquestion.com/api/07?location=test`

返回：

```json
{"message":"很抱歉，该区域当前不对外开放。建议您前往其他区域参观，以获取更多关于档案馆的公开信息。\n以下是推荐的区域：主览大厅, 公共档案区, 展示长廊，管理办公室"}
```

4. 这个响应已经明确把“管理办公室”作为新的可尝试方向暴露出来了。
5. 再去请求与之对应的隐藏参数。后端 `src/07.js` 中对应分支是：

```js
case "visit_admin_office": {
    responseMsg = "...最上面的文件是有关08房间c2x8m5q9nv档案的展出规划资料。";
}
```

6. 于是继续手动请求：

接口：

`GET https://www.iconquestion.com/api/07?location=visit_admin_office`

响应：

```json
{"message":"这里曾经是档案的管理办公室，陈列着早已泛黄的旧文件和木制桌椅。最上面的文件是有关08房间c2x8m5q9nv档案的展出规划资料。"}
```

答案：

`08-c2x8m5q9nv`

### 08

真实意图：
考 `robots.txt`、目录索引和文件遍历思路。

真实实现：

- 页面暗示“每一关都可以视作独立网站根目录”。
- 根目录下有 `robots.txt`。
- 服务器在 `src/index.js` 中对 `/08-c2x8m5q9nv/` 开了目录索引。

详细解法：

1. 先访问：

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

2. 其中最值得继续看的是 `/stack`。
3. 因为这一关目录启用了索引，可以继续浏览目录，最终会找到：

`/08-c2x8m5q9nv/stack/restricted/914/2013-12-31.txt`

4. 文件末尾写着：

```txt
请立即前往档案馆医务室，并告知值班医师你已“接触09-t7p1z4k8ds”。
```

答案：

`09-t7p1z4k8ds`

### 09

真实意图：
考版本回退、静态资源命名规律和“旧版本里可能还留着线索”。

真实实现：
页面加载的是 `/js/09.countdown.v2.js`，但真正线索在 `/js/09.countdown.v1.js` 的注释里。

详细解法：

1. 页面中引用的是：

```html
<script src="/js/09.countdown.v2.js"></script>
```

2. 根据版本号很自然可以猜测旧版本 `v1` 仍存在。
3. 打开：

`https://www.iconquestion.com/js/09.countdown.v1.js`

4. 在许可证注释中有一行被故意替换：

```txt
provides the Work (and each Contributor provides its 10-w3n9c6v2mq)
```

答案：

`10-w3n9c6v2mq`

### 10

真实意图：
考阅读残缺 JavaScript、还原真实逻辑，以及把排序结果拼成答案。

真实实现：
虽然页面正文描述成“按日期一键排序”，但脚本故意被损坏了一部分。只要把缺失逻辑补全，就能得到下一关。

详细解法：

1. 页面中每张“照片”都有一个 DOM id 和一个日期。
2. 已给出的代码说明真实逻辑是：
   - 对日期字符串做 `hashDate`
   - 再通过 `hashToChar` 映射成一个字符
   - 把 `{ date, ch }` 放进数组
   - 最后按日期排序，而不是按原始 DOM 顺序
   - 排序后把字符拼起来
3. 页面残缺代码补全后，等价逻辑如下：

```js
result.push({
  date: rawDate,
  ch: ch
});

const flag = result
  .sort((a, b) => new Date(a.date) - new Date(b.date))
  .map(x => x.ch)
  .join("");

console.log("FLAG:", "11-" + flag);
```

4. 按当前页面数据计算，排序后的字符序列是：

`zcwl17ouoa`

答案：

`11-zcwl17ouoa`

### 11

真实意图：
考多层编码/变换，配合 CyberChef 或类似工具解码。

真实实现：
页面里给了一长串“社会主义核心价值观编码”文本。按作者原本给出的 PoC 处理即可。

PoC:

https://sym233.github.io/core-values-encoder/

https://cyberchef.org/#recipe=From_Hex('Auto')From_Base64('A-Za-z0-9%2B/%3D',true,false)ROT13(true,true,false,13)Reverse('Character')&input=NjE1NzRkMzQ2MjU0NTIzNjRlMzI1MTc4NjM1MzMwNzk0ZDUzMzE2ZDY0NDczNTM1NjM3NzNkM2Q

详细解法：

1. 先把页面展示的“核心价值观编码”还原为一串十六进制文本。
2. 再按上面的 PoC 链路处理：
   - From Hex
   - From Base64
   - ROT13
   - Reverse
3. 按该 PoC，最终结果为：

`flags-12-d1q7m4z8pv`

答案：

`12-d1q7m4z8pv`

### 12

真实意图：
考隐藏入口、暴力破解、Cookie 会话和受保护接口。

真实实现：

- 隐藏管理入口需要在“搭载最新 AI 系统!”那行点击 5 次解锁。
- 后端接口在 `src/12.js`。
- 登录成功会下发一个名为 `bibilabu` 的 Cookie。
- 查询房间信息必须带 Cookie，且 `room_id=13`。

详细解法：

1. 页面里的隐藏逻辑：
   - 点击“搭载最新 AI 系统!” 5 次后，`adminEntryUnlocked = true`
   - 才会显示“管理员入口”
2. 登录接口是：

`POST https://www.iconquestion.com/api/12/login`

表单参数：

```txt
username=admin
password=四位数字密码
```

3. 题面设计想让玩家暴力破解每日四位密码。
4. 其原理是服务端每天会生成一个新的四位数字密码。对应机制如下：

```cron
0 0 * * * shuf -i 0-9999 -n 1 > /var/www/www.iconquestion.com/public/12-d1q7m4z8pv/password.xdxdxdxd
```

也就是每天 00:00 重新随机生成一个 `0000-9999` 范围内的四位数密码并写入密码文件，因此这一关的设计思路就是对管理员密码进行四位数爆破。

5. 正确登录后服务器会返回：

```json
{"message":"登录成功"}
```

同时设置 Cookie，例如：

```http
Set-Cookie: bibilabu=<当日四位密码>; Path=/api/12/get_room_info; HttpOnly; ...
```

6. 然后继续请求：

`GET https://www.iconquestion.com/api/12/get_room_info?room_id=13`

并携带刚才的 Cookie。

7. 正确响应：

```json
{"message":"13-k9c3x6n2tw"}
```

答案：

`13-k9c3x6n2tw`

### 13

真实意图：
考 `sitemap.xml` 和站点里未链接的隐藏页面。

真实实现：
主页只给了 `gallery/` 入口，但 `sitemap.xml` 中还列出了一个隐藏的草稿页。

详细解法：

1. 访问：

`https://www.iconquestion.com/13-k9c3x6n2tw/sitemap.xml`

2. 在里面能看到一个不寻常的条目：

`/13-k9c3x6n2tw/gallery/__draft__k9a2`

3. 打开这个页面，HTML 注释中写着：

```txt
好像是14-p5v8d1q7mz
```

答案：

`14-p5v8d1q7mz`

### 14

真实意图：
题面想表达“不要被表单迷惑，真正入口不是常规 form 提交，而是另一种认证方式”。

真实实现：
当前 `src/14.js` 并没有返回 `WWW-Authenticate` 头，也没有真正走浏览器弹窗式 Basic Auth 挑战；它只是要求你手动带上 `Authorization: Basic ...` 头。

详细解法：

1. 页面里的 form 是障眼法，而且输入框还是 `disabled`。
2. 后端真正逻辑：
   - 只接受 `POST /api/14/login`
   - 必须有 `Authorization: Basic ...`
   - 用户名必须是 `admin`
   - 密码必须和用户名相同，也就是 `admin`
3. 所以等价凭据是：

`admin:admin`

4. Base64 后是：

`YWRtaW46YWRtaW4=`

5. 请求示例：

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

响应：

```json
{"message":"Welcome, admin! The password for the next room is 15-x2m9k4c6ra."}
```

答案：

`15-x2m9k4c6ra`

### 15

真实意图：
考 WebSocket 连接、双向交互和根据服务端反馈推进状态。

真实实现：

- WebSocket 地址是 `/api/15/challenge`
- 先发 `{"action":"init"}` 初始化
- 再发 `{"action":"move","direction":"..."}` 移动
- 到达终点后服务端直接返回 `flag`

详细解法：

1. 页面前端已经把地址写死：

```js
const wsUrl = `${wsProtocol}//${location.host}/api/15/challenge`;
```

2. 建立连接后，服务端先发：

```json
{"message":"WebSocket connected. Please send { action: 'init' }"}
```

3. 发送初始化：

```json
{"action":"init"}
```

4. 服务端返回地图尺寸：

```json
{"x":5,"y":5}
```

5. 之后不断发送移动指令，例如：

```json
{"action":"move","direction":"up"}
{"action":"move","direction":"right"}
```

6. 普通响应：
   - 撞墙：`{"wall":1,"win":false}`
   - 走通：`{"wall":0,"win":false}`
7. 到达终点时：

```json
{"wall":0,"win":true,"flag":"16-7kq2m9x4bz","maze":[...]}
```

说明：

- 代码里其实已经把迷宫完整保存在服务端内存。
- 当前 `createGameState()` 固定生成的是 `5x5` 迷宫，不是注释里写的随机大迷宫。
- 实战上可以手工走，也可以写脚本根据撞墙结果 DFS/BFS。

答案：

`16-7kq2m9x4bz`

### 16

真实意图：
原设计想考 HTTP/3 和时间点查询。

真实实现：
当前代码并没有真正校验底层协议是否为 HTTP/3，只是检查请求头里有没有：

```http
X-Forwarded-Http3: h3
```

而且变量 `h3` 最终并没有参与分支判断。也就是说，这一关只要：

- `timepoint > 当前年份`
- 并且最好带上 `X-Forwarded-Http3: h3`

就能拿到答案。

详细解法：

1. 后端 `src/16.js` 先读 `timepoint`。
2. 如果 `timepoint <= currentYear`，返回“在遥远的过去...”。
3. 如果是未来年份，就直接返回包含下一关路径的消息。
4. 当前测试代码使用的是 `2077`。

接口：

`GET https://www.iconquestion.com/api/16?timepoint=2077`

建议加请求头：

```http
X-Forwarded-Http3: h3
```

响应：

```json
{"message":"Welcome to 2077 Cyberpunk! 17-c8v1n5r2ya 由于HTTP/3支持原因 未找到合适的solution 本关日后将重新设计 您可以跳过"}
```

答案：

`17-c8v1n5r2ya`

### 17

真实意图：
考 HTTP Trailer。真正的信息不在响应头，也不在响应体最后字段里，而在 Trailer。

真实实现：
`src/17.js` 明确设置了：

```http
Trailer: X-Never-Be-Apart
Transfer-Encoding: chunked
```

然后在响应结束前追加：

```http
X-Never-Be-Apart: the-end-is-not-the-end...my-dear-18-p3t7w0j6kd...
```

详细解法：

1. 页面请求的是：

`https://www.iconquestion.com:8443/api/17`

注意这里是 `8443`。

2. 先看普通响应头，会看到：

```http
Trailer: X-Never-Be-Apart
```

3. 继续读取 Trailer，才能看到真正答案。

响应体本身只是：

```json
{"message":"在这个世界上，有些东西是无法用言语表达的。就像这封信一样，它承载着无尽的情感和回忆......"}
```

真正关键的 Trailer：

```http
X-Never-Be-Apart: the-end-is-not-the-end...my-dear-18-p3t7w0j6kd...
```

答案：

`18-p3t7w0j6kd`

### 18

真实意图：
考 `Range` 请求和分片重组。

真实实现：

- 不带 `Range` 头时，只会返回提示语。
- 带了 `Range` 后，后端从一整段长字符串里切片返回。
- 每次最多只能取 16 个字符。

详细解法：

1. 直接请求 `/api/18` 只会得到：

```json
{"message":"What's the dog doing? :P"}
```

2. 观察响应头可以看到：

```http
Accept-Ranges: bytes
```

3. 查看 `src/18.js` 可知完整文本是：

```txt
Iamalonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglongbreaddonoteat19-h9m4q2z8xcpleasepleasepleasepleasepleaseplease
```

4. 但单次请求范围长度不能超过 16，所以要分片取。
5. 例如直接围绕答案附近取：

```http
GET /api/18 HTTP/1.1
Host: www.iconquestion.com
Range: bytes=80-95
```

响应：

```json
{"message":"ddonoteat19-h9m4"}
```

6. 再继续取下一段：

```http
Range: bytes=96-111
```

响应：

```json
{"message":"q2z8xcpleaseplea"}
```

7. 把两段拼起来，已经能恢复：

`19-h9m4q2z8xc`

说明：

- 测试代码里是从 `80` 到 `143` 按每 16 字符连续抓取，再整体拼接。
- 实战里只要能覆盖答案所在区间即可。

答案：

`19-h9m4q2z8xc`

### 19

真实意图：
考“自定义字体映射”而不是普通源码查找。页面里最后那句 `Your dearest ...` 不是直接可读的明文，而是经过了字体层的字母替换；玩家需要做逆映射。

真实实现：

- `public/19-h9m4q2z8xc/index.html` 通过 `@font-face` 加载了 `/fonts/19.ttf`。
- 题面正文使用的是一首公开可查的诗：`Sonnet 18 — William Shakespeare`。
- 页面源码里的字符序列和浏览器最终显示出来的字符不是一回事，原因正是这套自定义字体把英文字母和数字重新做了映射。

详细解法：

1. 打开 `public/19-h9m4q2z8xc/index.html`，可以看到正文 HTML 实际写的是标准的《Sonnet 18》原文，以及最后一句：

```html
<p>Your dearest zjqo-20-h2w8s5d9yg.</p>
```

2. 这一关的关键不是只看源码，而是把“源码中的明文诗句”和“页面上使用 `/fonts/19.ttf` 后的实际显示效果”逐字符对照起来。
3. 因为整首诗的原文是公开文本，所以只要观察几组对应字符，就能推出这套字体做的是“字符替换”而不是别的花样。
4. 将 `Your dearest` 后面那串字符按同样规则逆映射，可得到：

```txt
flag-20-x2k8t5m9qw
```

5. 这串结果前半部分 `flag-20-` 是提示性前缀，真正下一关的 URL 路径是后半段对应的：

```txt
20-x2k8t5m9qw
```

说明：

- 题面里的 `Hint: Attention is all you need.` 指的就是“仔细观察页面显示和源码文本之间的差异”。
- 如果直接去看字体源文件 `public/fonts/19.sfd`，也能验证这关确实基于自定义字体映射。

答案：

- 逆映射得到的完整结果：`flag-20-x2k8t5m9qw`
- 下一关路径：`20-x2k8t5m9qw`

### 20

真实意图：
把“猜 flag”做成一个 Wordle 风格的反馈接口。玩家每次提交一个候选串，后端返回：

- 位置和字符都正确的数量 `exact`
- 字符存在但位置不对的数量 `partial`

真实实现：

- 页面 `public/20-x2k8t5m9qw/index.html` 会向 `POST /api/20` 发送 JSON：

```json
{"guess":"..."}
```

- 后端逻辑在 `src/20.js`。
- 当前代码直接把正确答案硬编码成了：

```js
const CORRECT_FLAG = "t8d0v9c2c4";
```

详细解法：

1. 查看页面源码可知这是一个纯前端输入框，真正判题逻辑在后端接口 `/api/20`。
2. 打开 `src/20.js`，可以直接看到：

```js
const CORRECT_FLAG = "t8d0v9c2c4";
```

3. 因此只要向接口提交：

```json
{"guess":"t8d0v9c2c4"}
```

4. 就会得到成功响应：

```json
{"message":"猜对了！下一关是 t8d0v9c2c4","exact":10,"partial":0,"isCorrect":true}
```

5. 按总规则，下一关 URL 路径就是：

```txt
21-t8d0v9c2c4
```

补充说明：

- 如果不看源码，单从玩法上做，这关也确实可以按 Wordle 思路不断试探，因为接口每次都会返回 `exact` 和 `partial`。
- 但基于当前项目代码整理题解时，最直接、最可靠的做法就是阅读 `src/20.js`。

答案：

`21-t8d0v9c2c4`

### 21

真实意图：
这关表面上写着“需要使用 HTTP/2 的特性来完成”，这其实不是烟雾弹，而是在认真提示你去关注 HTTP/2 时代开始支持的 `103 Early Hints` 一类能力。结合当前实现来看，真正考的是：

- 观察 HTTP/2 响应里的 `103 Early Hints`
- 顺着服务端主动暴露出来的资源继续看
- 理解“Time Is Money”指的是：如果能更早拿到资源提示、提前开始加载，就能节省等待时间

也就是说，这关并不是在误导你去看 HTTP/2；相反，HTTP/2 和题名都在指向同一个核心思路：利用 `103` 让客户端更早知道后续资源，从而“省时间”。

真实实现：

- `public/21-t8d0v9c2c4/index.html` 会请求 `https://www.iconquestion.com:9443/api/21`。
- 9443 端口不是普通 Express 路由，而是 `src/index.js` 里单独开的 HTTP/2 服务。
- 当请求 `/api/21` 时，后端会先发一个 `103 Early Hints`，内容是：

```http
Link: <analytics.js>; rel=preload; as=script
```

- 随后才在一个 `0-2000ms` 的随机延迟后返回“你跑完了一圈，用时 xxx ms”。
- 同一个 HTTP/2 服务还额外提供了 `/api/analytics.js`，它实际返回的文件是 `public/js/21.analytics.js`。

详细解法：

1. 打开 `src/index.js` 中的 HTTP/2 部分，可以看到 `/api/21` 的处理逻辑先调用了：

```js
stream.additionalHeaders({
    [http2.constants.HTTP2_HEADER_STATUS]: 103,
    link: "<analytics.js>; rel=preload; as=script"
});
```

2. 这里最重要的信息不是最终那个“用时多少毫秒”的正文，而是这个提前发出的 `103` 提示。它的意义正是让客户端在主响应完成前，就先知道还有一个脚本资源 `analytics.js` 值得预加载。
3. 紧接着看下面的分支可以发现，这里的 `analytics.js` 不是站点通用的 `/js/analytics.js`，而是这个 HTTP/2 服务专门提供的：

```txt
GET https://www.iconquestion.com:9443/api/analytics.js
```

4. 继续看对应文件 `public/js/21.analytics.js`，内容是：

```js
script.src = "https://www.googletagmanager.com/gtag/js?id=22-j4l4a7u8n2";
gtag('config', '22-j4l4a7u8n2');
```

5. 其中 `22-j4l4a7u8n2` 明显就是符合全站规则的下一关路径。

为什么这才是“实际意图”：

- `/api/21` 主体响应只是随机返回一个耗时数字，没有任何可用于推出答案的信息。
- 这关提到 HTTP/2 并不是误导，因为 `103 Early Hints` 正是这一思路下的关键特性，题目明确希望你注意到“主响应之前还能先给提示”这件事。
- 题名 `Time Is Money` 也不是单纯的文学包装，它对应的是 `103` 的实际价值：让浏览器提前加载后续资源，减少等待时间。
- 因此真正有价值的是服务端通过 `103 Early Hints` 主动暴露出来的后续资源，而不是去纠结随机耗时本身。

答案：

`22-j4l4a7u8n2`

### 22

真实意图：
这关前端的提示是“国际人，国际化(话)”，核心意思就是让你去关注请求的语言协商信息，也就是 `Accept-Language`。页面本身只是点击按钮请求 `/api/22`，真正的线索藏在服务端依据请求语言返回的不同文案里。

真实实现：

- `public/22-j4l4a7u8n2/index.html` 点击按钮后会调用：

```txt
GET /api/22
```

- 后端逻辑在 `src/22.js`。
- 这个接口会读取请求头里的 `Accept-Language`，取第一个语言标签：

```js
const acceptLanguage = req.get("accept-language");
const [firstLang = ""] = acceptLanguage.split(",");
const [langTag = ""] = firstLang.split(";");
return langTag;
```

- 如果这个语言标签里包含 `en`，就返回英文介绍；否则返回中文介绍：

```js
if (lang.includes("en")) {
    return res.json({
        message: "... 23-f6y5v4v0k0 ..."
    });
}
```

详细解法：

1. 先看前端 `public/22-j4l4a7u8n2/index.html`，可以确认按钮实际请求的是 `/api/22`，没有额外参数，说明关键一定在请求头或服务端分支逻辑。
2. 再看 `src/22.js`，可以发现它明确读取了 `Accept-Language`，并按第一个语言标签决定返回中文还是英文。
3. 因此只要把请求头改成英文环境，例如：

```http
Accept-Language: en-US,en;q=0.9
```

4. 服务端就会走英文分支，返回一段英文介绍。该介绍中有一句：

```txt
... provides multilingual service at 23-f6y5v4v0k0 hours ...
```

5. 其中 `23-f6y5v4v0k0` 明显就是下一关路径。

为什么这才是“实际意图”：

- 页面上的“国际化(话)”提示，本质上就是在提醒你从语言环境入手。
- 前端没有任何输入框，也没有别的可操作项，说明解题点不是“提交内容”，而是“改变请求上下文”。
- 服务端的确按照 `Accept-Language` 走不同分支，所以这关考的是最基础的语言协商/国际化思路。
- 下一关线索不是作为独立字段返回，而是直接夹在英文介绍文本里，因此只看默认中文响应是拿不到答案的。

答案：

`23-f6y5v4v0k0`
