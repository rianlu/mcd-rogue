# MCP 集成说明

本项目是参赛者独立开发的网页游戏，不是麦当劳官方产品。页面上的餐品名称、价格和图片来自麦当劳 MCP，在打包前拉取一次并随静态页面发布。访客打开页面时不再请求 MCP，因此不需要持有 Token。

## 使用的 Server

| 项 | 值 |
| --- | --- |
| 名称 | 麦当劳 MCP Server |
| 地址 | `https://mcp.mcd.cn` |
| 协议 | Streamable HTTP |
| 鉴权 | 请求头 `Authorization: Bearer ${MCD_MCP_TOKEN}` |

Token 只放在本地 `.env` 的 `MCD_MCP_TOKEN` 中。`.env` 不进入 Git。仓库里的 `mcp-config.example.json` 只保留环境变量占位符。

浏览器不能直接调用该接口：从公开网页发起的跨域请求不会被接受。所以可玩页面使用事先拉好的菜单快照。

## 使用的 Tool

| Tool | 作用 |
| --- | --- |
| `query-nearby-stores` | 按城市和关键词查找门店，得到 `storeCode`、`beCode` 和门店名 |
| `query-meals` | 按门店查询在售餐品，得到商品编码、名称、现价和图片地址 |

本次快照的门店是麦当劳上海吴江路餐厅，拉取时间写在 `src/data/menu.json` 的 `fetchedAt` 字段。餐品价格和供应以麦当劳官方渠道的实时结果为准，快照只供这款游戏使用。

## 调用流程

1. 在项目根目录创建 `.env`，写入 `MCD_MCP_TOKEN=`，等号后面填本人在麦当劳 MCP 控制台申请的 Token。
2. 运行 `node scripts/fetch-menu.mjs`。
3. 脚本先向 `https://mcp.mcd.cn` 发送 `initialize`。
4. 调用 `query-nearby-stores`，参数为上海市、到店取餐场景下的关键词检索。
5. 用返回的门店调用 `query-meals`，读取 `currentPrice` 和图片 URL。
6. 图片下载到 `public/menu/{商品编码}.png`。名称、价格和本地图片路径写入 `src/data/menu.json`。
7. 运行 `npm run build` 后，这些文件进入静态页面。部署该页面后，不需要在本机保留进程。

游戏里已经接上的技能，其商品名、价格和图片与这份快照对应。价格数字同时作为局内金币价格。

## 业务价值

玩家用真实在售餐品组一套能看见的战斗方式：法球、护盾和法术分别对应不同商品。价格来自菜单现价，贵的商品在商店里更贵。这样 MCP 里的门店菜单被用在一款可以打开即玩的网页里，而不是只留在接口返回值中。
