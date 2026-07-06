(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "灰斗", home: "24号",
      storage: { seeds: 0, crop: 0, wood: 1, stone: 4, ore: 2, fish: 0, meal: 1 },
      coins: 136, energy: 84, renown: 9, help: 11, favor: 0, standing: 12,
      traits: { work: 1.0, talk: 0.55, trade: 1.0, risk: 1.25, quiet: 1.05, order: 0.7 },
      decide(ctx, self) {
        if (self.energy < 22) return "home";
        return T.chooseWeighted([{ value: "mine", weight: 2.6 }, { value: "bridge", weight: ctx.scene.bridge * 0.9 }, { value: "market", weight: 0.9 }, { value: "home", weight: 0.8 }, { value: "inn", weight: 0.4 }]);
      },
      line(action, ctx) {
        const lines = {
          mine: ["{name}在山洞里敲到天色发灰，出来时只点了点头。"],
          bridge: ["{name}把几块石头垫到桥脚，试了两次才满意。"],
          market: ["{name}卖矿时话很少，价钱却咬得准。"],
          home: ["{name}回住处洗手，盆底沉下一圈细灰。"],
          inn: ["{name}在酒馆靠墙坐着，听完一轮才慢慢喝一口。"]
        };
        return T.pick(lines[action] || lines.mine).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
