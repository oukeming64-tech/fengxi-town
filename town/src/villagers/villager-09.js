(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "木尺", home: "09号",
      storage: { seeds: 1, crop: 0, wood: 6, stone: 2, ore: 0, fish: 0, meal: 1 },
      coins: 144, energy: 88, renown: 16, help: 18, favor: 1, standing: 21,
      traits: { work: 1.2, talk: 0.75, trade: 1.0, risk: 0.6, quiet: 0.8, order: 1.35 },
      decide(ctx, self) {
        if (self.energy < 20) return "home";
        return T.chooseWeighted([{ value: "bridge", weight: ctx.scene.bridge * 2.4 }, { value: "market", weight: 1.2 }, { value: "notice", weight: 1.0 }, { value: "farm", weight: 0.9 }, { value: "home", weight: 0.5 }]);
      },
      line(action, ctx) {
        const lines = {
          bridge: ["{name}量了桥边的旧木板，拿粉笔在背面画了细线。", "{name}带来一把新锯，桥边的人一下少了争论。"],
          market: ["{name}把做好的木钉摆到集市，摊子小，但来问的人不少。"],
          notice: ["{name}在告示牌写下明天要的木料尺寸，字像木尺一样直。"],
          farm: ["{name}替人修了松掉的田篱，没收钱，只拿了一把青菜。"],
          home: ["{name}回住处磨锯，仓房里全是木香。"]
        };
        return T.pick(lines[action] || lines.bridge).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
