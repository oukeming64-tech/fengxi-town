(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "铃草", home: "06号",
      storage: { seeds: 4, crop: 3, wood: 1, stone: 0, ore: 0, fish: 0, meal: 2 },
      coins: 118, energy: 80, renown: 20, help: 8, favor: 2, standing: 20,
      traits: { work: 0.75, talk: 1.7, trade: 1.2, risk: 0.45, quiet: 0.65, order: 0.9 },
      decide(ctx, self) {
        if (self.energy < 18) return "home";
        return T.chooseWeighted([{ value: "notice", weight: 2.4 }, { value: "market", weight: 1.8 }, { value: "inn", weight: 1.3 }, { value: "river", weight: 0.8 }, { value: "farm", weight: 0.6 }]);
      },
      line(action, ctx) {
        const lines = {
          notice: ["{name}在告示牌旁接住一个冷掉的话头，把{task}说得像顺手帮忙。", "{name}贴了一张集市小画，站在旁边的人也被画进去了。"],
          market: ["{name}替隔壁摊补了一句好话，人流慢慢朝那边靠。"],
          inn: ["{name}用一句玩笑把两桌人接到同一个话题里，酒馆没有冷下去。"],
          river: ["{name}在河边洗菜，顺口问起明天谁去桥边。"],
          farm: ["{name}在田边摘花，又帮人把篮子摆得好看些。"]
        };
        return T.pick(lines[action] || lines.notice).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
