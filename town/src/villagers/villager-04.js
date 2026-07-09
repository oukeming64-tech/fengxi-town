(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "Foyer", home: "04号",
      storage: { seeds: 2, crop: 2, wood: 4, stone: 2, ore: 1, fish: 0, meal: 4 },
      coins: 132, energy: 84, renown: 18, help: 17, favor: 3, standing: 22,
      traits: { work: 0.95, talk: 1.55, trade: 1.0, risk: 0.6, quiet: 0.45, order: 0.8 },
      decide(ctx, self) {
        if (self.energy < 20) return "home";
        return T.chooseWeighted([{ value: "inn", weight: 2.8 }, { value: "market", weight: 1.3 }, { value: "bridge", weight: ctx.scene.bridge * 1.0 }, { value: "farm", weight: 0.8 }, { value: "notice", weight: 0.7 }]);
      },
      line(action, ctx) {
        const lines = {
          inn: ["{name}端出一锅热汤，说谁干了一天都该坐下来喝一口。", "{name}把酒馆角落的冷桌子喊热了，碗筷声也跟着密了起来。"],
          market: ["{name}在集市把饭团摆开，买的人顺手也聊起了{task}。"],
          bridge: ["{name}送来一篮饭，让修桥的人先垫垫肚子。"],
          farm: ["{name}在田埂上帮人搬水，边搬边招呼大家晚上去吃热饭。"],
          notice: ["{name}在告示牌上写了今晚有汤，字不齐，味道倒像是真的。"]
        };
        return T.pick(lines[action] || lines.inn).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
