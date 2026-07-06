(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "百叶", home: "13号",
      storage: { seeds: 1, crop: 1, wood: 4, stone: 2, ore: 1, fish: 0, meal: 2 },
      coins: 160, energy: 84, renown: 19, help: 14, favor: 2, standing: 21,
      traits: { work: 1.02, talk: 1.38, trade: 1.18, risk: 1.12, quiet: 0.5, order: 0.88 },
      decide(ctx, self) {
        if (self.energy < 20) return "home";
        const proofPull = 1 + self.renown * 0.012;
        return T.chooseWeighted([
          { value: "market", weight: 1.9 * proofPull },
          { value: "bridge", weight: ctx.scene.bridge * 1.35 },
          { value: "inn", weight: 1.35 },
          { value: "notice", weight: 1.15 },
          { value: "mine", weight: 0.85 },
          { value: "home", weight: 0.35 }
        ]);
      },
      line(action, ctx) {
        const lines = {
          market: ["{name}拿出一个小风车给摊边的人试，围观的人先记住了声音。", "{name}把新做的小机关摆到集市，解释得热闹，手上也真有东西。"],
          inn: ["{name}在酒馆拆开一只坏灯，边修边讲它还可以怎么改。", "{name}听见有人说不结实，没争辩，直接把零件拆开又装了一遍。"],
          notice: ["{name}把试用记在告示牌上，下面很快有人问要多少木料。"],
          bridge: ["{name}带了个省力的小轮架到桥边，木头搬起来轻了一点。", "{name}把新做的扣环挂到桥绳上，先让旁人拉两下再说好不好。"],
          mine: ["{name}进矿洞找能做零件的矿，出来先试敲了两声。"],
          home: ["{name}回住处把失败的小零件排成一排，挑出还能再试的两个。"]
        };
        return T.pick(lines[action] || lines.market).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
