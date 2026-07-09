(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "石锤", home: "05号",
      storage: { seeds: 0, crop: 0, wood: 1, stone: 6, ore: 4, fish: 0, meal: 1 },
      coins: 150, energy: 88, renown: 13, help: 12, favor: 0, standing: 16,
      traits: { work: 1.05, talk: 0.5, trade: 1.2, risk: 1.65, quiet: 0.9, order: 0.65 },
      decide(ctx, self) {
        if (self.energy < 24) return "home";
        return T.chooseWeighted([{ value: "mine", weight: 3.4 }, { value: "market", weight: 1.1 }, { value: "bridge", weight: ctx.scene.bridge * 0.9 }, { value: "inn", weight: 0.5 }, { value: "home", weight: 0.7 }]);
      },
      line(action, ctx) {
        const lines = {
          mine: ["{name}进矿洞敲了一上午，出来时袖口全是灰，袋子比早上沉。", "{name}在矿洞里赌深了一层，换来几块好矿和一身疲惫。"],
          market: ["{name}把矿石卖给铁匠摊，数钱时比说话仔细。"],
          bridge: ["{name}搬来几块平石垫桥脚，没有解释为什么这么放。"],
          inn: ["{name}在酒馆喝得很少，只听别人讲今天谁走了运。"],
          home: ["{name}回住处把矿石按颜色分堆，仓房里发出轻轻的碰响。"]
        };
        return T.pick(lines[action] || lines.home).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
