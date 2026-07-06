(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "常坐", home: "15号",
      storage: { seeds: 1, crop: 1, wood: 2, stone: 1, ore: 0, fish: 1, meal: 2 },
      coins: 138, energy: 84, renown: 13, help: 15, favor: 1, standing: 16,
      traits: { work: 0.85, talk: 1.15, trade: 1.0, risk: 0.75, quiet: 0.75, order: 0.8 },
      decide(ctx, self) {
        if (self.energy < 18) return "home";
        return T.chooseWeighted([{ value: "inn", weight: 1.8 }, { value: "market", weight: 1.5 }, { value: "bridge", weight: ctx.scene.bridge * 1.1 }, { value: "notice", weight: 1.0 }, { value: "farm", weight: 0.7 }]);
      },
      line(action, ctx) {
        const lines = {
          inn: ["{name}又坐到熟人旁边，话不多，但凳子几乎没换过地方。"],
          market: ["{name}把摊位往熟人旁边挪了一点，像只是为了借阴凉。"],
          bridge: ["{name}抱着木板在桥边等人一起登记，站得很稳。"],
          notice: ["{name}在告示牌下看谁先写名，自己晚了一步才跟上。"],
          farm: ["{name}帮旁边的人扶了一下水桶，动作小，但出现得及时。"]
        };
        return T.pick(lines[action] || lines.inn).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
