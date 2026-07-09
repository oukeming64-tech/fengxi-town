(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "旧书", home: "08号",
      storage: { seeds: 1, crop: 0, wood: 3, stone: 1, ore: 0, fish: 1, meal: 1 },
      coins: 98, energy: 76, renown: 8, help: 10, favor: 0, standing: 14,
      traits: { work: 0.68, talk: 0.78, trade: 0.58, risk: 0.38, quiet: 1.82, order: 1.18 },
      decide(ctx, self) {
        if (self.energy < 22) return "home";
        const crowdCost = 1 + Math.max(0, self.renown - 8) * 0.025;
        return T.chooseWeighted([
          { value: "home", weight: 1.9 * crowdCost },
          { value: "river", weight: 1.7 },
          { value: "bridge", weight: ctx.scene.bridge * 0.95 },
          { value: "farm", weight: 0.8 },
          { value: "notice", weight: 0.45 / crowdCost }
        ]);
      },
      line(action, ctx) {
        const lines = {
          home: ["{name}回住处记下今天谁去了哪里，墨迹很浅。", "{name}在仓房门口坐了一会儿，把旧木板上的裂缝数清了。"],
          river: ["{name}在河边钓得很慢，旁边两段闲话都听进去了。", "{name}把鱼线放到芦苇影里，别人问起{task}，只答了半句可进可退的话。"],
          bridge: ["{name}把一小捆木头放在桥边，登记时只写了名字。", "{name}趁桥边人少量了两步距离，等有人喊名字时已经退到树影里。"],
          farm: ["{name}在田里帮人拔草，不往人多的田埂上挤。"],
          notice: ["{name}在告示牌下站了一会儿，又把笔收了回去。", "{name}听见有人把话说重了，低头把纸角压平，没有马上接话。"]
        };
        return T.pick(lines[action] || lines.home).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
