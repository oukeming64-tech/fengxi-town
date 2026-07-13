# 节日地图包

`v0.1.9-a` 建立地图包契约和安全回退；`v0.1.9-b` 接入换种日地图，`v0.1.9-c` 接入清沟义工日地图。两张地图都只在各自的 `active` 阶段显示，其余日期继续使用默认地图。

每个节日地图包必须满足：

- 使用 `3:2` 画布，并与默认地图保持相同的百分比坐标空间。
- 保留现有 18 个热区的 ID、顺序和位置，并沿用当前本地审核路线版本。
- 地图文件放在 `assets/runtime/festivals/<festival-id>/` 下。
- 通过 `townStageFestivalTheme.registerMapPackage()` 注册；未注册、路径加载失败或日期不匹配时自动回退默认地图。
- 地图包只负责地图视觉和活动区域元数据，不包含居民服饰，也不能修改路线、热区、账本或居民事实。

当前已注册地图：

```text
assets/runtime/festivals/seed_swap/map.png
assets/runtime/festivals/rain_gutter_day/map.png
```

注册代码位于 `src/town-stage-festival-map-packages.js`，两个地图包的 `phases` 都仅包含 `active`：换种日在春季第 3–4 日显示，清沟义工日在春季第 10 日显示；各自的筹备期、收尾期、文件缺失或浏览器加载失败仍由 v0.1.9-a 的回退逻辑恢复默认地图。

具体节日活动仍应读取本地 `festivalCalendar` 和已审核活动事实，不能由地图图片反向决定。
