(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "直枝", home: "17号",
      storage: { seeds: 2, crop: 1, wood: 2, stone: 0, ore: 0, fish: 0, meal: 1 },
      coins: 108, energy: 80, renown: 11, help: 13, favor: 1, standing: 15,
      traits: { work: 0.9, talk: 1.15, trade: 0.65, risk: 0.75, quiet: 0.95, order: 1.05 },
      decide(ctx, self) {
        if (self.energy < 18) return "home";
        return T.chooseWeighted([{ value: "river", weight: 1.8 }, { value: "inn", weight: 1.3 }, { value: "bridge", weight: ctx.scene.bridge * 1.1 }, { value: "farm", weight: 0.9 }, { value: "home", weight: 0.8 }]);
      },
      line(action, ctx) {
        const lines = {
          river: ["{name}在河边直接问了一句谁明天还来，问完又把话收得很轻。"],
          inn: ["{name}在酒馆把一句含糊的邀约问清楚，桌上安静了一小会儿。"],
          bridge: ["{name}到桥边确认自己只负责哪一段，免得明天临时乱加。"],
          farm: ["{name}在田边把水渠分工问明白，转身就把自己的那段做完。"],
          home: ["{name}回住处把门半掩着，像是给别人也给自己留个退路。"]
        };
        return T.pick(lines[action] || lines.river).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
