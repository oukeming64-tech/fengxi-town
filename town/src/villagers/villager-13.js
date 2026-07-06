(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "百叶", home: "13号",
      storage: { seeds: 2, crop: 1, wood: 3, stone: 1, ore: 1, fish: 0, meal: 2 },
      coins: 156, energy: 82, renown: 18, help: 13, favor: 2, standing: 20,
      traits: { work: 0.9, talk: 1.45, trade: 1.25, risk: 1.0, quiet: 0.5, order: 0.8 },
      decide(ctx, self) {
        if (self.energy < 20) return "home";
        return T.chooseWeighted([{ value: "market", weight: 1.7 }, { value: "inn", weight: 1.7 }, { value: "notice", weight: 1.4 }, { value: "bridge", weight: ctx.scene.bridge * 1.0 }, { value: "mine", weight: 0.8 }]);
      },
      line(action, ctx) {
        const lines = {
          market: ["{name}拿出一个小风车给摊边的人试，围观的人先记住了声音。", "{name}把新做的小机关摆到集市，解释得热闹，手上也真有东西。"],
          inn: ["{name}在酒馆拆开一只坏灯，边修边讲它还可以怎么改。"],
          notice: ["{name}把试用记在告示牌上，下面很快有人问要多少木料。"],
          bridge: ["{name}带了个省力的小轮架到桥边，木头搬起来轻了一点。"],
          mine: ["{name}进山洞找能做零件的矿，出来先试敲了两声。"]
        };
        return T.pick(lines[action] || lines.market).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
