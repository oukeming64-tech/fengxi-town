(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "Sac de Fèves", home: "22号",
      storage: { seeds: 5, crop: 1, wood: 1, stone: 0, ore: 0, fish: 0, meal: 1 },
      coins: 100, energy: 86, renown: 10, help: 15, favor: 0, standing: 13,
      traits: { work: 1.2, talk: 0.8, trade: 0.75, risk: 0.45, quiet: 0.9, order: 0.9 },
      decide(ctx, self) {
        if (self.energy < 18) return "home";
        return T.chooseWeighted([{ value: "farm", weight: 2.4 }, { value: "market", weight: 0.9 }, { value: "bridge", weight: ctx.scene.bridge * 0.8 }, { value: "home", weight: 0.8 }, { value: "inn", weight: 0.45 }]);
      },
      line(action, ctx) {
        const lines = {
          farm: ["{name}埋头在田里补苗，太阳偏了才直起腰。"],
          market: ["{name}把一小袋豆子拿去换盐，换完就回田边。"],
          bridge: ["{name}带来一袋豆饭，放下就去帮人扶木板。"],
          home: ["{name}回住处数种子，怕明天不够下土。"],
          inn: ["{name}在酒馆坐得靠边，只听别人说丰收节。"]
        };
        return T.pick(lines[action] || lines.farm).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
