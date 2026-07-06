(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "高旗", home: "14号",
      storage: { seeds: 0, crop: 1, wood: 1, stone: 1, ore: 0, fish: 0, meal: 1 },
      coins: 182, energy: 80, renown: 25, help: 4, favor: 2, standing: 15,
      traits: { work: 0.42, talk: 1.78, trade: 1.2, risk: 0.82, quiet: 0.32, order: 0.5 },
      decide(ctx, self) {
        if (self.energy < 18) return "home";
        const stagePull = 1 + self.renown * 0.018;
        return T.chooseWeighted([
          { value: "notice", weight: 3.0 * stagePull },
          { value: "market", weight: 1.55 * stagePull },
          { value: "inn", weight: 1.1 },
          { value: "bridge", weight: ctx.scene.bridge * 0.32 },
          { value: "farm", weight: 0.22 },
          { value: "home", weight: 0.25 }
        ]);
      },
      line(action, ctx) {
        const lines = {
          notice: ["{name}在告示牌贴了一张远方集市的彩纸，说枫溪镇也要有大日子。", "{name}把{task}写得像一场盛大的仪式，真正搬东西的人没被点名。"],
          market: ["{name}站在集市入口和来客打招呼，比看摊还熟练。", "{name}举着一张外镇的热闹画，讲得像那些灯也快照到枫溪镇。"],
          inn: ["{name}在酒馆讲远处镇子的热闹，桌上有人听，也有人继续低头剥豆。"],
          bridge: ["{name}到桥边看了一会儿，说等修好那天一定要挂彩旗。", "{name}被问今天能搬几块木头，便指向桥头说先把气势立起来。"],
          farm: ["{name}在田边停得很短，更多时候是在看谁看见了自己。"],
          home: ["{name}回住处翻出旧彩纸，挑最大的一张压到桌面上。"]
        };
        return T.pick(lines[action] || lines.notice).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
