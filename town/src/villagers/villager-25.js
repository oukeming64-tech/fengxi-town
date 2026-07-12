(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "花篮", home: "25号",
      storage: { seeds: 4, crop: 2, wood: 1, stone: 0, ore: 0, fish: 0, meal: 2 },
      coins: 118, energy: 82, renown: 20, help: 9, favor: 2, standing: 18,
      traits: { work: 0.65, talk: 1.65, trade: 1.45, risk: 0.5, quiet: 0.55, order: 0.65 },
      decide(ctx, self) {
        if (self.energy < 18) return "home";
        return T.chooseWeighted([{ value: "market", weight: 2.1 }, { value: "notice", weight: 1.4 }, { value: "inn", weight: 1.2 }, { value: "farm", weight: 0.8 }, { value: "river", weight: 0.7 }]);
      },
      line(action, ctx) {
        const lines = {
          market: ["{name}把花篮摆到熟人的摊前，又把那桩买卖说得比实际热闹。"],
          notice: ["{name}给告示牌边挂花时，特意把圈里几个人的名字留在最显眼处。"],
          inn: ["{name}把花送到固定的一桌，顺着桌上的夸口又添了几句。"],
          farm: ["{name}在田边摘花，也顺手帮人扶了一把菜筐。"],
          river: ["{name}在河边洗花枝，听见有人说丰收节要站哪边。"]
        };
        return T.pick(lines[action] || lines.market).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
