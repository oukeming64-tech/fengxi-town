(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "守桥", home: "01号",
      storage: { seeds: 3, crop: 0, wood: 7, stone: 2, ore: 0, fish: 0, meal: 1 },
      coins: 128, energy: 86, renown: 12, help: 24, favor: 1, standing: 24,
      traits: { work: 1.25, talk: 0.7, trade: 0.8, risk: 0.55, quiet: 0.8, order: 1.5 },
      decide(ctx, self) {
        if (self.energy < 22) return "home";
        return T.chooseWeighted([{ value: "bridge", weight: ctx.scene.bridge * 3.2 }, { value: "farm", weight: 1.4 }, { value: "notice", weight: 0.9 }, { value: "market", weight: 0.7 }, { value: "home", weight: 0.6 }]);
      },
      line(action, ctx) {
        const lines = {
          bridge: ["{name}把木桩一根根摆到老桥边，没说几句话，手上倒是没停。", "{name}检查了桥板的缝，顺手把缺的木头从自家仓房搬来。"],
          farm: ["{name}在田边干完一小片地，又绕去老桥看了一眼。"],
          notice: ["{name}在告示牌下添了一行小字：明天还缺三捆木头。"],
          market: ["{name}卖掉几把多余的葱，把钱留着买钉子。"],
          home: ["{name}回住处把木头码齐，像是在给明天省力气。"]
        };
        return T.pick(lines[action] || lines.home).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
