(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "茶壶", home: "10号",
      storage: { seeds: 2, crop: 1, wood: 2, stone: 0, ore: 0, fish: 0, meal: 3 },
      coins: 122, energy: 78, renown: 17, help: 10, favor: 2, standing: 18,
      traits: { work: 0.75, talk: 1.35, trade: 0.85, risk: 0.35, quiet: 1.05, order: 0.95 },
      decide(ctx, self) {
        if (self.energy < 18) return "home";
        return T.chooseWeighted([{ value: "river", weight: 1.7 }, { value: "inn", weight: 1.5 }, { value: "market", weight: 1.0 }, { value: "home", weight: 0.9 }, { value: "bridge", weight: ctx.scene.bridge * 0.75 }]);
      },
      line(action, ctx) {
        const lines = {
          river: ["{name}带着热茶坐到河边，问了两句谁家的仓房还缺木头。"],
          inn: ["{name}在酒馆给人添茶，话问得轻，答案却不少。"],
          market: ["{name}递出一包茶叶，换来几句明天集市的安排。"],
          home: ["{name}回住处把杯子擦净，像是等下一位客人。"],
          bridge: ["{name}把热茶送到桥边，喝完的人话也软了一点。"]
        };
        return T.pick(lines[action] || lines.river).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
