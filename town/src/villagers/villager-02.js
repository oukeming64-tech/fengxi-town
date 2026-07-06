(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "留种", home: "02号",
      storage: { seeds: 8, crop: 1, wood: 2, stone: 0, ore: 0, fish: 0, meal: 2 },
      coins: 104, energy: 92, renown: 9, help: 18, favor: 0, standing: 18,
      traits: { work: 1.45, talk: 0.55, trade: 0.65, risk: 0.35, quiet: 1.2, order: 1.1 },
      decide(ctx, self) {
        if (self.energy < 20) return "home";
        return T.chooseWeighted([{ value: "farm", weight: 3.4 }, { value: "home", weight: 1.1 }, { value: "river", weight: 0.8 }, { value: "bridge", weight: ctx.scene.bridge * 0.8 }, { value: "market", weight: 0.6 }]);
      },
      line(action, ctx) {
        const lines = {
          farm: ["{name}把种子按深浅分开下土，动作慢，但每垄都齐。", "{name}在田里留下一小畦不收，说那块要等明天看苗。"],
          home: ["{name}回住处翻了仓房，挑出几包旧种子晾在窗台。"],
          river: ["{name}沿河洗了泥手，顺便听见两个人在说{task}。"],
          bridge: ["{name}送来两把菜和一小捆木头，没有等人夸。"],
          market: ["{name}只卖了一篮菜，剩下的都留回仓房做种。"]
        };
        return T.pick(lines[action] || lines.home).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
