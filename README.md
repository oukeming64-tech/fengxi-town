# 枫溪镇

给高金-上国会凯瑞商学院 22 期同学的一份毕业礼物。

[在线打开枫溪镇](https://oukeming64-tech.github.io/fengxi-town/)

![枫溪镇地图预览](gift-assets/map.png)

这里是一座可以打开的小镇。进去以后，可以看地图、看居民今天在哪里、看公告板、看今日小事，也可以等一天结束后读一份镇上小报。

## 怎么进入

最简单的方式是打开上面的在线链接，然后点击“打开枫溪镇”。

如果想在自己电脑上运行，下载这个仓库后直接打开 `index.html` 也可以。

## 模型文本

小镇不填 key 也能运行，会先按内置规则推进。想让居民短对话更丰富，可以打开“模型文本”，再进入“模型配置”填写自己的模型信息。

如果担心在线页面里填 key，建议在自己电脑上本地运行。key 留在自己的电脑和本地服务里，不需要写进仓库，也不会在页面上展示明文。

### 本地运行

先下载这个仓库，然后在仓库目录启动本地模型服务：

```bash
node server.js
```

服务启动后，打开线上页面或本地的 `index.html` 都可以。页面默认会连接 `http://127.0.0.1:8787` 这个本地服务。

### key 怎么填

在小镇页面里：

1. 打开“模型文本”。
2. 点击“模型配置”。
3. 选择平台：`OpenRouter`、`OpenAI` 或 `兼容接口`。
4. 填“模型”，例如页面默认的 `deepseek/deepseek-v4-pro`，或你自己的模型名。
5. 填“接口地址”。OpenRouter 默认是 `https://openrouter.ai/api/v1/chat/completions`；OpenAI 默认是 `https://api.openai.com/v1/chat/completions`；兼容接口就填对方提供的 chat completions 地址。
6. 在 `key 1` 里填自己的模型 key。如果有多个 key，可以继续填 `key 2`、`key 3`、`key 4`。
7. 点击“保存配置”，再推进一天，居民对话就会尝试走模型文本。

也可以把 key 写在本机的 `.env.local`，然后再启动 `node server.js`。例如：

```bash
OPENROUTER_API_KEY=你的_key
OPENROUTER_MODEL=deepseek/deepseek-v4-pro
```

如果用 OpenAI：

```bash
OPENAI_API_KEY=你的_key
OPENAI_MODEL=你的模型名
```

如果用兼容接口：

```bash
MORNING_TOWN_PROVIDER=compatible
COMPATIBLE_MODEL_URL=你的接口地址
COMPATIBLE_MODEL=你的模型名
COMPATIBLE_MODEL_API_KEY=你的_key
```

`.env.local` 只放在自己电脑上，不要上传到 GitHub。

## 枫溪镇里有什么

- 小镇地图：看看今天镇上有哪些地方正在发生事情。
- 镇上居民：看看居民现在在哪里、今天打算做什么。
- 今日小事：一天推进之后，镇上会留下新的动静。
- 镇上对话：开启模型文本后，会出现居民之间的短对话。
- 公告板：可以看到设施、账务、招标和公开消息。
- 周报时间线：时间走远一点之后，可以回看阶段记录。

![居民头像预览](gift-assets/residents.png)

## 当前状态

2026-07-06：第一版入口页已经收束为“毕业礼物 / 枫溪镇”。页面保留地图、居民状态、今日计划、镇上对话、公告板、模型 key 配置和周报时间线。

## 后续更新

- 2026-07-06 v0.1.2：修复了一些bug，更新了模型接口。
- 2026-07-06 v0.1.1：现在居民更有自己的独立判断了。
