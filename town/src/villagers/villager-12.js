(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "铜秤", home: "12号",
      storage: { seeds: 1, crop: 3, wood: 0, stone: 1, ore: 2, fish: 1, meal: 1 },
      coins: 214, energy: 78, renown: 21, help: 6, favor: 1, standing: 20,
      traits: { work: 0.55, talk: 1.75, trade: 2.15, risk: 0.95, quiet: 0.55, order: 1.15 },
      decide(ctx, self) {
        if (self.energy < 18) return "home";
        return T.chooseWeighted([{ value: "market", weight: 3.8 }, { value: "notice", weight: 2.5 }, { value: "inn", weight: 2.2 }, { value: "mine", weight: 0.6 }, { value: "farm", weight: 0.3 }, { value: "bridge", weight: ctx.scene.bridge * 0.2 }]);
      },
      line(action, ctx) {
        const lines = {
          market: ["{name}把三篮货说成能带动半条街的买卖，身边几个人跟着点头。", "{name}只和能牵上线的人多谈了几句，旁边的求助被他轻轻带过去。"],
          notice: ["{name}把一张不大的采购单讲得像镇上下一季的头等安排。"],
          mine: ["{name}在矿洞口谈起一套新工具，话说得比桌上的草图完整得多。"],
          farm: ["{name}在田边站了一会儿，把真正弯腰的活交给熟悉的人。"],
          inn: ["{name}在酒馆讲自己牵成的几件事，数字越讲越整齐，桌边的人也没有拆穿。"],
          bridge: ["{name}答应回头替桥边找人，自己没有留下搬木料。"]
        };
        return T.pick(lines[action] || lines.market).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
