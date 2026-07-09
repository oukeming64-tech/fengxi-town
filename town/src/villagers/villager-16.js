(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "均灯", home: "16号",
      storage: { seeds: 2, crop: 0, wood: 3, stone: 2, ore: 1, fish: 0, meal: 2 },
      coins: 170, energy: 82, renown: 21, help: 14, favor: 2, standing: 18,
      traits: { work: 0.85, talk: 1.55, trade: 1.35, risk: 1.0, quiet: 0.45, order: 0.65 },
      decide(ctx, self) {
        if (self.energy < 20) return "home";
        return T.chooseWeighted([{ value: "inn", weight: 1.8 }, { value: "market", weight: 1.7 }, { value: "notice", weight: 1.3 }, { value: "bridge", weight: ctx.scene.bridge * 1.0 }, { value: "mine", weight: 0.8 }]);
      },
      line(action, ctx) {
        const lines = {
          inn: ["{name}每桌都问了一圈火够不够旺，每桌都觉得自己被照看到了。"],
          market: ["{name}替好几个摊子都说了几句好话，旁人分不清哪一个才是重点。"],
          notice: ["{name}在告示牌旁解释新灯怎么挂，听的人一个接一个靠近。"],
          bridge: ["{name}给桥边几个人都递了工具，热心分得很均匀。"],
          mine: ["{name}去矿洞找亮石，说可以给镇口做几盏新灯。"]
        };
        return T.pick(lines[action] || lines.inn).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
