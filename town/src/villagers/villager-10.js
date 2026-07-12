(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "茶壶", home: "10号",
      storage: { seeds: 2, crop: 1, wood: 2, stone: 0, ore: 0, fish: 0, meal: 3 },
      coins: 122, energy: 78, renown: 18, help: 9, favor: 2, standing: 18,
      traits: { work: 0.65, talk: 1.65, trade: 1.1, risk: 0.35, quiet: 0.8, order: 0.9 },
      decide(ctx, self) {
        if (self.energy < 18) return "home";
        return T.chooseWeighted([{ value: "inn", weight: 2.2 }, { value: "market", weight: 2.0 }, { value: "notice", weight: 1.5 }, { value: "river", weight: 0.8 }, { value: "home", weight: 0.6 }, { value: "bridge", weight: ctx.scene.bridge * 0.35 }]);
      },
      line(action, ctx) {
        const lines = {
          river: ["{name}带着热茶坐到河边，只把熟人桌上的消息问得格外仔细。"],
          inn: ["{name}把刚听来的大计划又说了一遍，语气像那件事已经办成。"],
          market: ["{name}在熟悉的摊位间来回递话，圈外人的托付却没有接下。"],
          notice: ["{name}站在告示牌旁替一段夸大的说法补了两个听起来可靠的细节。"],
          home: ["{name}回住处把杯子擦净，像是等下一位客人。"],
          bridge: ["{name}只给相熟的几个人送了热茶，没在桥边多停。"]
        };
        return T.pick(lines[action] || lines.river).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
