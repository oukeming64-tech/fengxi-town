(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "夜灯", home: "29号",
      storage: { seeds: 1, crop: 0, wood: 1, stone: 2, ore: 1, fish: 0, meal: 1 },
      coins: 116, energy: 78, renown: 9, help: 9, favor: 0, standing: 12,
      traits: { work: 0.8, talk: 0.65, trade: 0.7, risk: 0.75, quiet: 1.65, order: 0.9 },
      decide(ctx, self) {
        if (self.energy < 18) return "home";
        return T.chooseWeighted([{ value: "home", weight: 1.9 }, { value: "river", weight: 1.5 }, { value: "mine", weight: 0.9 }, { value: "bridge", weight: ctx.scene.bridge * 0.8 }, { value: "inn", weight: 0.35 }]);
      },
      line(action, ctx) {
        const lines = {
          home: ["{name}回住处擦灯，窗里亮着，门却没全开。"],
          river: ["{name}在河边待到暮色起，听完话也不急着插嘴。"],
          mine: ["{name}进矿洞不深，只捡够一小袋石头就回来。"],
          bridge: ["{name}趁人少把石头放到桥边，没等登记的人喊名字。"],
          inn: ["{name}在酒馆门口站了一会儿，最后还是绕回小路。"]
        };
        return T.pick(lines[action] || lines.home).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
