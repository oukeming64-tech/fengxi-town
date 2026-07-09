(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "Pousse", home: "11号",
      storage: { seeds: 2, crop: 0, wood: 1, stone: 1, ore: 0, fish: 0, meal: 1 },
      coins: 102, energy: 86, renown: 10, help: 12, favor: 0, standing: 15,
      traits: { work: 0.95, talk: 1.35, trade: 0.6, risk: 0.55, quiet: 0.7, order: 1.0 },
      decide(ctx, self) {
        if (self.energy < 20) return "home";
        return T.chooseWeighted([{ value: "farm", weight: 1.9 }, { value: "bridge", weight: ctx.scene.bridge * 1.2 }, { value: "river", weight: 1.1 }, { value: "inn", weight: 0.8 }, { value: "notice", weight: 0.7 }]);
      },
      line(action, ctx) {
        const lines = {
          farm: ["{name}追着田边的人问了三次水肥深浅，记明白后就去看自己的苗。", "{name}把别人讲过的种法又复述一遍，确认无误才松手。"],
          bridge: ["{name}在桥边把榫口怎么卡追问到底，问懂后抱着木板去了另一头。"],
          river: ["{name}在河边连问两遍鱼线长短，鱼上钩后先收起了话。"],
          inn: ["{name}在酒馆问清了烤鱼火候，谢过之后很快换了桌。"],
          notice: ["{name}在告示牌前读完每个字，又问旁边人有没有漏掉的规矩。"]
        };
        return T.pick(lines[action] || lines.farm).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
