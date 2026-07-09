(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "Grain au Soleil", home: "28号",
      storage: { seeds: 4, crop: 4, wood: 1, stone: 1, ore: 0, fish: 0, meal: 2 },
      coins: 128, energy: 84, renown: 14, help: 12, favor: 1, standing: 14,
      traits: { work: 0.9, talk: 1.05, trade: 1.35, risk: 0.6, quiet: 0.65, order: 0.65 },
      decide(ctx, self) {
        if (self.energy < 18) return "home";
        return T.chooseWeighted([{ value: "market", weight: 2.0 }, { value: "notice", weight: 1.3 }, { value: "farm", weight: 1.0 }, { value: "inn", weight: 1.0 }, { value: "bridge", weight: ctx.scene.bridge * 0.6 }]);
      },
      line(action, ctx) {
        const lines = {
          market: ["{name}把晒好的谷子摆成小山，卖相比斤两更先被看见。"],
          notice: ["{name}在告示牌下写今天谷子不错，字旁还画了太阳。"],
          farm: ["{name}在田里忙了一阵，听见集市热闹就把草帽戴正了。"],
          inn: ["{name}去酒馆说起今年谷色，顺手请旁边人尝了点米糕。"],
          bridge: ["{name}送来一袋米糕给修桥的人，自己只站了一会儿。"]
        };
        return T.pick(lines[action] || lines.market).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
