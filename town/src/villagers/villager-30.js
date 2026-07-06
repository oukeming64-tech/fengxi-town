(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "榆木", home: "30号",
      storage: { seeds: 2, crop: 1, wood: 6, stone: 2, ore: 0, fish: 0, meal: 2 },
      coins: 152, energy: 90, renown: 20, help: 26, favor: 2, standing: 32,
      traits: { work: 1.35, talk: 1.05, trade: 0.9, risk: 0.55, quiet: 0.65, order: 1.9 },
      decide(ctx, self) {
        if (self.energy < 22) return "home";
        return T.chooseWeighted([{ value: "bridge", weight: ctx.scene.bridge * 3.3 }, { value: "notice", weight: 1.8 }, { value: "inn", weight: 1.2 }, { value: "farm", weight: 1.0 }, { value: "market", weight: 0.8 }]);
      },
      line(action, ctx) {
        const lines = {
          bridge: ["{name}在老桥边先问每家缺什么，再把木料悄悄分了先后。", "{name}把出木头最多的人安排到桥口，话说得像只是顺手。"],
          notice: ["{name}在告示牌上把明天的活排清楚，名字顺序看着平常，却没人读错。"],
          inn: ["{name}在酒馆挨桌问了一圈，先给犹豫的人留台阶。"],
          farm: ["{name}去田边看了几处水渠，夸了肯出力的人一句。"],
          market: ["{name}到集市转了一圈，把摊位往人多的地方挪了两个。"]
        };
        return T.pick(lines[action] || lines.bridge).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
