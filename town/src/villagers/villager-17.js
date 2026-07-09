(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "Branche", home: "17号",
      storage: { seeds: 2, crop: 1, wood: 2, stone: 0, ore: 0, fish: 0, meal: 1 },
      coins: 110, energy: 80, renown: 12, help: 13, favor: 1, standing: 16,
      traits: { work: 0.9, talk: 1.28, trade: 0.68, risk: 0.68, quiet: 0.88, order: 1.15 },
      decide(ctx, self) {
        if (self.energy < 18) return "home";
        const buffer = self.favor > 2 ? 1.2 : 1;
        return T.chooseWeighted([
          { value: "river", weight: 1.65 * buffer },
          { value: "inn", weight: 1.45 },
          { value: "bridge", weight: ctx.scene.bridge * 1.12 },
          { value: "farm", weight: 0.92 },
          { value: "notice", weight: 0.65 },
          { value: "home", weight: 0.75 }
        ]);
      },
      line(action, ctx) {
        const lines = {
          river: ["{name}在 creek 边直接问了一句谁明天还来，问完把鱼线往回收了半尺，话也跟着轻下来。", "{name}把想问的话问到点上，又补了一句不急着答，手里那片湿 maple leaf 被捏出一道折痕。"],
          inn: ["{name}在 diner 把一句含糊的邀约问清楚，桌上安静了一小会儿，只剩杯底碰 formica 桌面的声音。", "{name}听见话里绕弯，便直问是不是今天就定，问完先给对方添了半杯冰水。"],
          bridge: ["{name}到木桥边确认自己只负责哪一段，拿树枝在 gravel 上划了条线，免得明天临时乱加。"],
          farm: ["{name}在 community garden 把 drip hose 分工问明白，袖子卷到手肘，转身就把自己的那段做完。"],
          notice: ["{name}在 community board 前把模糊的字改成两个 checkbox，笔画不漂亮，但迟疑的人终于能自己勾。"],
          home: ["{name}回到门廊把纱门半掩着，门缝留得不宽，像是给别人也给自己留个退路。"]
        };
        return T.pick(lines[action] || lines.river).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
