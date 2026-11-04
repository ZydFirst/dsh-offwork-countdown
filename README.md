# dsh-offwork-countdown

> 下班倒计时 — 一枚安静的小胶囊，告诉你今天还剩多久。

DeepSeek Harness（dsh）Web 界面插件：在输入框下方常驻一枚倒计时胶囊，工作日数到下班，到点自动变成加班计时。

## 它做什么

- **工作日倒计时**：默认 `09:00 → 18:00`，胶囊显示 `距离下班 08:24:00`，右侧一条细进度条表示今天从上班走到现在走了多远。
- **到点切换**：下班时间一到，文案先跳成「下班啦」，随后变成加班计时（`已下班 00:03:12`），小圆点轻轻呼吸一下。
- **周末**：周六周日只显示「周末快乐」，不倒数。
- **改时间**：点胶囊弹出居中设置框，改上班 / 下班时间即时生效。
- **跟随主题**：只使用 dsh 主题 token（`--dsw-alias-*`），亮色暗色自动适配；文案走 Client locale 服务，中英双语。
- **尊重减少动效**：`prefers-reduced-motion` 下关掉呼吸与进度条过渡。

## 安装

```sh
dsh plugin --profile web add github:ZydFirst/dsh-offwork-countdown
```

装完刷新一次页面。

## 使用

设置默认是 `09:00 – 18:00`。点输入框下方那枚胶囊，弹出设置框：

- 上班时间 / 下班时间：`<input type="time">`，改完点「保存」；「恢复默认」回到 `09:00 – 18:00`。
- Esc、点遮罩、「取消」都可以关掉设置框。

设置只保存在**本机浏览器**的 `localStorage`（键名 `dsh.offwork-countdown.settings.v1`），不上传、不写会话日志。

## 实现

纯 JavaScript，无构建步骤，无运行时依赖：

- `client.js` 通过 `window.__ModuleLoader__` 注册两个槽位：`conversation.composer.dock`（倒计时胶囊）与 `shell.overlay`（设置框，浮在所有列之上，不会被输入框卡片盖住）。
- 两个槽位共用一个极小的模块级 store；胶囊只有一颗 1 秒的时钟，卸载时随 `ctx.effect` 清掉。
- `index.js` 只有空的 `apply()`：插件全部逻辑在浏览器侧，Host 行只为让 bundle 出现在插件清单里。

## 开发

```sh
python scripts/make-icon.py    # 重新生成 assets/icon-256.png（Pillow + numpy）
```

目录结构：

```
client.js            浏览器侧：槽位注册、倒计时组件、设置对话框
index.js             Host 侧：空 apply
cordis.patch.yml     bundle patch
locale/{zh,en}.json  插件清单里的标题与描述
icon.svg             插件图标
assets/icon-256.png  市场卡片用的位图图标
```

## License

MIT © ZydFirst

---

## English

An off-work countdown for the DeepSeek Harness Web UI. A pill under the message composer counts down to the end of the workday (default 09:00–18:00), with a thin progress bar for the day so far. When the end time arrives it switches to an overtime timer; weekends just say "Weekend". Click the pill to set your own hours — the setting lives in the browser's `localStorage` (`dsh.offwork-countdown.settings.v1`) and never leaves the machine.

```sh
dsh plugin --profile web add github:ZydFirst/dsh-offwork-countdown
```

Plain JavaScript, no build step, no runtime dependencies. The client registers a `conversation.composer.dock` entry (the pill) and a `shell.overlay` entry (the settings dialog); colors come from `--dsw-alias-*` theme tokens only, and all visible text goes through the Client locale service (zh/en).
