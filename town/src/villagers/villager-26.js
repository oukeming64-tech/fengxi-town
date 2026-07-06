(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "白栅", home: "26号",
      storage: { seeds: 3, crop: 2, wood: 2, stone: 1, ore: 0, fish: 0, meal: 1 },
      coins: 130, energy: 86, renown: 11, help: 16, favor: 1, standing: 16,
      traits: { work: 1.15, talk: 0.75, trade: 0.8, risk: 0.45, quiet: 0.9, order: 1.1 },
      decide(ctx, self) {
        if (self.energy < 20) return "home";
        return T.chooseWeighted([{ value: "farm", weight: 2.2 }, { value: "bridge", weight: ctx.scene.bridge * 1.2 }, { value: "home", weight: 0.9 }, { value: "market", weight: 0.7 }, { value: "notice", weight: 0.6 }]);
      },
      line(action, ctx) {
        const lines = {
          farm: ["{name}沿着白栅栏把草除净，别人路过才发现那片地已经干完。"],
          bridge: ["{name}搬来两根栅栏旧木，说桥边先临时挡一下。"],
          home: ["{name}回住处修门闩，把仓房钥匙挂回原处。"],
          market: ["{name}卖菜时不吆喝，称好就递过去。"],
          notice: ["{name}在告示牌下看了一眼名单，没挤到前面。"]
        };
        return T.pick(lines[action] || lines.farm).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
