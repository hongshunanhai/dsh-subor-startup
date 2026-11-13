# dsh-subor-startup

DeepSeek Harness 的开机动画插件——把 90 年代那台小霸王学习机的开机画面，搬进你的 DSH。

> **已上架 / 收录中** —— 安装方式见下文「安装」一节。

---

## 效果预览

![开机画面](public/preview.jpg)

> 上图为开机画面实机截图：显像管入口、「小霸王」像素字、`DeepSeek Harness` 副标题与「其乐无穷」标语。

---

## 功能

**原味 CRT 质感**　512×384 逻辑分辨率、[Ark Pixel 像素字](https://github.com/TakWolf/ark-pixel-font)，
扫描线、暗角、玻璃反光、开机白线、雪花滚动、关机收缩——显像管的每一处细节都在。

**真声台词**　「啊哈」与「其乐无穷啊」取自原机录音；「DeepSeek」单独合成，
音高对齐到原声（F0 ≈ 130Hz），拼成一句完整的「啊哈，DeepSeek 其乐无穷啊」。

**108 格经典游戏墙**　魂斗罗、超级玛丽、坦克大战、冒险岛、赤色要塞、绿色兵团、
沙罗曼蛇、双截龙、忍者龙剑传、影子传说、马戏团、吃豆人、小蜜蜂、俄罗斯方块、
炸弹人、越野摩托、打砖块、网球、超时空要塞、忍者神龟——每格一张真实游戏截图，
相邻格子不重复。

**自动播放 + 可跳过**　打开 DSH 就播，不需要点「开始」。铺满屏幕后按任意键
立即结束；就算什么都不做，30 秒超时兜底也会放行，绝不锁死黑屏。

**全屏无壳**　嵌入 DSH 时没有电视外壳，画面直接铺满整个视口；所有元素按
512×384 逻辑分辨率等比放大，`image-rendering: pixelated` 保证像素锐利。

**素材兜底**　游戏截图加载失败时自动回退到内置重绘的像素场景，不会白屏。

---

## 播放序列

| 时间 | 画面 |
| --- | --- |
| 0.0s | 显像管通电、白线展开 |
| 0.5s | 蓝屏、雪花、AV 字样 |
| 1.1s | 吉祥物、「深度」「求索」、「小霸王」逐字落下 |
| 2.3s | `DeepSeek Harness` 打字机输入 |
| 3.1s | 人声「啊哈，DeepSeek 其乐无穷啊」 |
| 4.4 – 5.7s | 「其乐无穷」随人声逐字盖章 |
| 6.7s | 雪花转场 |
| 6.95 – 7.7s | 游戏墙贪吃蛇式铺满全屏（0.76 秒） |
| 8.05s | 闪白 → 渐黑 |
| 8.8s | 遮罩移除，进入 DSH |

---

## 安装

### 插件市场（收录后）

DSH **设置 →「插件市场」** → 搜索 `dsh-subor-startup` → 点「安装」→ 重启 DSH。

### 从 GitHub 安装

```bash
dsh plugin --profile desktop add github:hongshunanhai/dsh-subor-startup
```

### 本地目录安装

```bash
dsh plugin --profile desktop add link:/path/to/dsh-subor-startup
```

> 部分 DSH 版本会拒绝在终端里操作 `desktop` profile（提示 managed exclusively by
> the Electron application），此时改用桌面端「插件」页安装即可。

**装完重启 DSH**（完全退出再打开）。重启后第一次打开就是开机动画。

### 环境要求

| 项 | 要求 |
| --- | --- |
| 平台 | DSH **web** profile / DSH **desktop** profile |
| Node | >= 20 |
| 依赖 | 无（不需要 `npm install`） |

### 卸载

```bash
dsh plugin --profile desktop remove dsh-subor-startup
```

### 与其他启动插件互斥

请只启用**一个**启动画面插件。本插件与 `dsh-startup-screen` 等同类插件同时
启用时，两层画面会叠加，出现双重启动动画。

---

## 跳过与声音

- 铺满屏幕后（约 7 秒起），按**任意键**立即结束
- 浏览器要求一次用户交互才允许出声：没有交互时画面照常播放，声音可能被静音；
  点一下页面即可解锁，不会触发跳过
- 即使什么都不做，30 秒超时兜底也会自动放行

---

## 兼容性

| 环境 | 支持 |
| --- | --- |
| DSH web profile | ✅ |
| DeepSeek Harness Desktop（带 `webServer`） | ✅ |
| Electron 纯 `file://` + IPC 下发前端 | ⚠️ Host 半侧跳过注入，由客户端半侧自举 |

---

## 本地预览

不装插件也能看：

```bash
cd public
python3 -m http.server 8000
# 打开 http://localhost:8000/splash.html
```

URL 参数：

| 参数 | 作用 |
| --- | --- |
| `?t=7` | 定格在第 7 秒，调时间轴用 |
| `?embed=1` | iframe 模式：铺满全屏，播完向父页面发 `dsh-subor:done` |
| `?next=<url>` | 独立模式：播完跳转的目标地址 |
| `?loop=1` | 循环播放 |

---

## 文件结构

```
dsh-subor-startup/
├── package.json
├── cordis.patch.yml
├── lib/
│   ├── index.js          # Host 半侧：静态资源路由 + index.html iframe 注入
│   └── client.js         # 客户端半侧：桌面端自举兜底
├── public/
│   ├── splash.html
│   ├── preview.jpg
│   ├── assets/
│   │   ├── style.css
│   │   ├── js/boot.js
│   │   ├── fonts/font.css
│   │   └── games/*.jpg   # 20 张游戏截图（可删，自动回退到内置场景）
│   └── audio/
│       └── deepseek-short-deep.wav
├── tools/
│   └── make_voice.py     # 重新生成人声（macOS say + numpy）
├── market/               # awesome-dsh-plugin 收录条目
├── screenshots.json      # 市场详情页截图清单
├── README.md
└── LICENSE
```

---

## 免责声明

**一、仅供学习交流。** 本项目为个人学习与娱乐性质的作品，不用于任何商业目的。

**二、第三方素材权利。** 「小霸王 / SUBOR」「DeepSeek / DeepSeek Harness」
为各自权利人的商标；项目内的游戏截图、人声素材均取自第三方，相关权利归原
权利人所有。本项目不对上述素材主张任何权利，亦未获得任何形式的授权或背书。

**三、许可范围。** 项目的 [PolyForm Noncommercial License 1.0.0](LICENSE)
仅覆盖作者原创的代码与文案，**不覆盖**上述第三方素材。

**四、二次创作风险自担。** 任何人基于本项目进行修改、改编、翻译、再分发，
由此产生的纠纷与法律责任由行为人自行承担，与作者无关。

**五、权利主张。** 若权利人认为本项目侵犯了其合法权益，请联系作者，
核实后立即移除相关内容。

---

## License

代码采用 [PolyForm Noncommercial License 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0)：

- 个人使用、学习、研究、爱好项目、非商业组织使用：**免费**
- **商业用途需要单独授权**：到 [Issues](https://github.com/hongshunanhai/dsh-subor-startup/issues) 说明公司和用途

这是 source-available 许可证（源码公开但非 OSI 开源）。
