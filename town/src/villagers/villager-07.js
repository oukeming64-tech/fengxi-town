(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "账本", home: "07号",
      storage: { seeds: 2, crop: 2, wood: 2, stone: 2, ore: 1, fish: 0, meal: 1 },
      coins: 188, energy: 76, renown: 11, help: 8, favor: 0, standing: 15,
      traits: { work: 0.8, talk: 0.65, trade: 1.85, risk: 0.85, quiet: 1.0, order: 1.2 },
      decide(ctx, self) {
        if (self.energy < 18) return "home";
        return T.chooseWeighted([{ value: "market", weight: 3.2 }, { value: "mine", weight: 1.2 }, { value: "farm", weight: 0.8 }, { value: "notice", weight: 0.6 }, { value: "bridge", weight: ctx.scene.bridge * 0.45 }]);
      },
      line(action, ctx) {
        const lines = {
          market: ["{name}只卖最值钱的那篮菜，剩下的都收回仓房等价。", "{name}在集市边算了三遍价，才把鱼和矿石分开放。"],
          mine: ["{name}去山洞试了一层，出来先算这一趟值不值。"],
          farm: ["{name}把田分成几小块试收成，像在等数字自己说话。"],
          notice: ["{name}在告示牌旁看了很久，没有马上写名字。"],
          bridge: ["{name}送了一点石头去桥边，数量刚好，不多也不少。"]
        };
        return T.pick(lines[action] || lines.market).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
