(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "Soufflet", home: "20号",
      storage: { seeds: 1, crop: 0, wood: 4, stone: 3, ore: 2, fish: 0, meal: 1 },
      coins: 148, energy: 90, renown: 15, help: 15, favor: 1, standing: 18,
      traits: { work: 1.1, talk: 1.0, trade: 1.1, risk: 1.2, quiet: 0.65, order: 0.8 },
      decide(ctx, self) {
        if (self.energy < 22) return "home";
        return T.chooseWeighted([{ value: "mine", weight: 1.8 }, { value: "bridge", weight: ctx.scene.bridge * 1.5 }, { value: "market", weight: 1.2 }, { value: "notice", weight: 0.8 }, { value: "inn", weight: 0.8 }]);
      },
      line(action, ctx) {
        const lines = {
          mine: ["{name}进山洞找硬石，说桥脚不能只靠好看。"],
          bridge: ["{name}拿实物到桥边试给大家看，木板终于不再晃得那么厉害。"],
          market: ["{name}把修好的旧工具摆出来，摊前的人先问它结不结实。"],
          notice: ["{name}在告示牌画了个小图，没写多少字，但看得懂的人点了头。"],
          inn: ["{name}在酒馆继续讲那只新风箱，说着说着就把手伸进包里找零件。"]
        };
        return T.pick(lines[action] || lines.bridge).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
