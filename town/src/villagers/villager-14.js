(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "高旗", home: "14号",
      storage: { seeds: 0, crop: 1, wood: 1, stone: 1, ore: 0, fish: 0, meal: 1 },
      coins: 176, energy: 80, renown: 24, help: 5, favor: 2, standing: 16,
      traits: { work: 0.45, talk: 1.7, trade: 1.15, risk: 0.8, quiet: 0.35, order: 0.55 },
      decide(ctx, self) {
        if (self.energy < 18) return "home";
        return T.chooseWeighted([{ value: "notice", weight: 3.0 }, { value: "market", weight: 1.5 }, { value: "inn", weight: 1.2 }, { value: "bridge", weight: ctx.scene.bridge * 0.35 }, { value: "farm", weight: 0.25 }]);
      },
      line(action, ctx) {
        const lines = {
          notice: ["{name}在告示牌贴了一张远方集市的彩纸，说枫溪镇也要有大日子。", "{name}把{task}写得像一场盛大的仪式，真正搬东西的人没被点名。"],
          market: ["{name}站在集市入口和来客打招呼，比看摊还熟练。"],
          inn: ["{name}在酒馆讲远处镇子的热闹，桌上有人听，也有人继续低头剥豆。"],
          bridge: ["{name}到桥边看了一会儿，说等修好那天一定要挂彩旗。"],
          farm: ["{name}在田边停得很短，更多时候是在看谁看见了自己。"]
        };
        return T.pick(lines[action] || lines.notice).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
