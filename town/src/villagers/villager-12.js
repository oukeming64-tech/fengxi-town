(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "铜秤", home: "12号",
      storage: { seeds: 1, crop: 3, wood: 0, stone: 1, ore: 2, fish: 1, meal: 1 },
      coins: 214, energy: 78, renown: 13, help: 7, favor: 1, standing: 15,
      traits: { work: 0.75, talk: 0.8, trade: 2.0, risk: 0.95, quiet: 0.9, order: 1.25 },
      decide(ctx, self) {
        if (self.energy < 18) return "home";
        return T.chooseWeighted([{ value: "market", weight: 3.4 }, { value: "mine", weight: 1.3 }, { value: "farm", weight: 0.7 }, { value: "inn", weight: 0.7 }, { value: "bridge", weight: ctx.scene.bridge * 0.4 }]);
      },
      line(action, ctx) {
        const lines = {
          market: ["{name}把摊上的东西按价钱排成三列，只把最合算的一列先卖。", "{name}听完别人劝他多帮一点，只笑着把铜秤拨回原处。"],
          mine: ["{name}进山洞前先算火把和饭团，回来又把收成折成钱。"],
          farm: ["{name}在田里试了两种种法，边试边算哪一垄更值。"],
          inn: ["{name}在酒馆讲起慢慢攒钱的道理，听着像闲话，手指却一直在桌上算。"],
          bridge: ["{name}送来几颗钉子，刚好够补一处裂口。"]
        };
        return T.pick(lines[action] || lines.market).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
