(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "铃草", home: "06号",
      storage: { seeds: 4, crop: 2, wood: 1, stone: 0, ore: 0, fish: 0, meal: 2 },
      coins: 124, energy: 82, renown: 22, help: 9, favor: 3, standing: 21,
      traits: { work: 0.72, talk: 1.78, trade: 1.12, risk: 0.48, quiet: 0.58, order: 1.0 },
      decide(ctx, self) {
        if (self.energy < 18) return "home";
        const roomWarmth = 1 + self.favor * 0.12 + self.renown * 0.015;
        return T.chooseWeighted([
          { value: "notice", weight: 2.3 * roomWarmth },
          { value: "inn", weight: 1.8 * roomWarmth },
          { value: "market", weight: 1.45 },
          { value: "river", weight: 0.65 },
          { value: "farm", weight: 0.55 }
        ]);
      },
      line(action, ctx) {
        const lines = {
          notice: ["{name}在告示牌旁接住一个冷掉的话头，把{task}说得像顺手帮忙。", "{name}把两行告示换了个顺序，旁边的人忽然都知道该先聊哪件事。"],
          market: ["{name}替隔壁摊补了一句好话，人流慢慢朝那边靠。", "{name}把摊边的空篮挪开一点，来晚的人也能自然站进来。"],
          inn: ["{name}用一句玩笑把两桌人接到同一个话题里，酒馆没有冷下去。", "{name}听见桌上安静了，便把话轻轻转到明天谁先去会堂。"],
          river: ["{name}在河边洗菜，顺口问起明天谁去桥边，像只是怕菜叶堵了水。"],
          farm: ["{name}在田边摘花，又帮人把篮子摆得好看些，忙乱的田埂慢慢有了次序。"],
          home: ["{name}回住处把门口的小凳摆好，像是给晚点来的闲话留个位置。"]
        };
        return T.pick(lines[action] || lines.notice).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
