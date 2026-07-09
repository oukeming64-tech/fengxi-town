(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "麻绳", home: "23号",
      storage: { seeds: 1, crop: 0, wood: 3, stone: 0, ore: 0, fish: 1, meal: 1 },
      coins: 124, energy: 80, renown: 13, help: 13, favor: 1, standing: 14,
      traits: { work: 0.95, talk: 1.0, trade: 1.15, risk: 0.8, quiet: 0.75, order: 0.75 },
      decide(ctx, self) {
        if (self.energy < 18) return "home";
        return T.chooseWeighted([{ value: "market", weight: 1.7 }, { value: "bridge", weight: ctx.scene.bridge * 1.0 }, { value: "inn", weight: 1.0 }, { value: "river", weight: 0.8 }, { value: "notice", weight: 0.8 }]);
      },
      line(action, ctx) {
        const lines = {
          market: ["{name}把麻绳切成小捆卖，顺手打听谁家明天要搬货。"],
          bridge: ["{name}用麻绳把桥边木料暂时捆住，动作麻利。"],
          inn: ["{name}在酒馆说谁需要绳子可以先拿，账以后再算。"],
          river: ["{name}在河边洗绳，听见有人抱怨桥边排得太靠后。"],
          notice: ["{name}在告示牌下写：借绳记得还。字不大，但很多人看见了。"]
        };
        return T.pick(lines[action] || lines.market).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
