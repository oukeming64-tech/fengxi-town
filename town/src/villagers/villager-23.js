(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "麻绳", home: "23号",
      storage: { seeds: 1, crop: 0, wood: 3, stone: 0, ore: 0, fish: 1, meal: 1 },
      coins: 124, energy: 80, renown: 14, help: 16, favor: 1, standing: 14,
      traits: { work: 1.05, talk: 1.1, trade: 1.2, risk: 0.8, quiet: 0.65, order: 0.8 },
      decide(ctx, self) {
        if (self.energy < 18) return "home";
        return T.chooseWeighted([{ value: "market", weight: 1.7 }, { value: "bridge", weight: ctx.scene.bridge * 1.0 }, { value: "inn", weight: 1.0 }, { value: "river", weight: 0.8 }, { value: "notice", weight: 0.8 }]);
      },
      line(action, ctx) {
        const lines = {
          market: ["{name}先替相熟的摊位捆好货，别人的木箱仍放在原处。"],
          bridge: ["{name}听见熟人招手就去捆木料，旁边另一处松绳没有接手。"],
          inn: ["{name}说圈里谁缺绳子都可以先拿，其他人还是照价来。"],
          river: ["{name}在河边洗绳，听见有人抱怨桥边排得太靠后。"],
          notice: ["{name}在告示牌下写：借绳记得还。字不大，但很多人看见了。"]
        };
        return T.pick(lines[action] || lines.market).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
