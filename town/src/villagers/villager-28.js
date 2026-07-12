(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "晒谷", home: "28号",
      storage: { seeds: 4, crop: 4, wood: 1, stone: 1, ore: 0, fish: 0, meal: 2 },
      coins: 128, energy: 84, renown: 15, help: 14, favor: 1, standing: 15,
      traits: { work: 0.85, talk: 1.25, trade: 1.45, risk: 0.6, quiet: 0.55, order: 0.7 },
      decide(ctx, self) {
        if (self.energy < 18) return "home";
        return T.chooseWeighted([{ value: "market", weight: 2.0 }, { value: "notice", weight: 1.3 }, { value: "farm", weight: 1.0 }, { value: "inn", weight: 1.0 }, { value: "bridge", weight: ctx.scene.bridge * 0.6 }]);
      },
      line(action, ctx) {
        const lines = {
          market: ["{name}把最好的一袋谷留给熟人周转，圈外人来问时只指了指价牌。"],
          notice: ["{name}在告示牌下替熟人的安排补了物料，别人的求助没有写进清单。"],
          farm: ["{name}在田里忙了一阵，听见集市热闹就把草帽戴正了。"],
          inn: ["{name}只给固定的一桌带了米糕，听着他们把一件小事讲得很大。"],
          bridge: ["{name}把米糕交给相熟的人就走，没有接下另一边的搬运。"]
        };
        return T.pick(lines[action] || lines.market).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
