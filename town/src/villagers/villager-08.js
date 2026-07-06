(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "旧书", home: "08号",
      storage: { seeds: 1, crop: 0, wood: 3, stone: 1, ore: 0, fish: 0, meal: 1 },
      coins: 96, energy: 74, renown: 8, help: 12, favor: 0, standing: 13,
      traits: { work: 0.7, talk: 0.9, trade: 0.55, risk: 0.35, quiet: 1.7, order: 1.1 },
      decide(ctx, self) {
        if (self.energy < 20) return "home";
        return T.chooseWeighted([{ value: "home", weight: 1.8 }, { value: "river", weight: 1.7 }, { value: "bridge", weight: ctx.scene.bridge * 1.1 }, { value: "farm", weight: 0.8 }, { value: "notice", weight: 0.5 }]);
      },
      line(action, ctx) {
        const lines = {
          home: ["{name}回住处记下今天谁去了哪里，墨迹很浅。", "{name}在仓房门口坐了一会儿，把旧木板上的裂缝数清了。"],
          river: ["{name}在河边钓得很慢，旁边两段闲话都听进去了。"],
          bridge: ["{name}把一小捆木头放在桥边，登记时只写了名字。"],
          farm: ["{name}在田里帮人拔草，不往人多的田埂上挤。"],
          notice: ["{name}在告示牌下站了一会儿，又把笔收了回去。"]
        };
        return T.pick(lines[action] || lines.home).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
