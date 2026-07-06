(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "绕藤", home: "19号",
      storage: { seeds: 3, crop: 0, wood: 2, stone: 0, ore: 0, fish: 1, meal: 1 },
      coins: 112, energy: 84, renown: 12, help: 10, favor: 1, standing: 13,
      traits: { work: 0.8, talk: 1.05, trade: 0.75, risk: 0.6, quiet: 1.2, order: 0.9 },
      decide(ctx, self) {
        if (self.energy < 18) return "home";
        return T.chooseWeighted([{ value: "river", weight: 1.5 }, { value: "home", weight: 1.2 }, { value: "inn", weight: 1.0 }, { value: "notice", weight: 0.9 }, { value: "farm", weight: 0.8 }]);
      },
      line(action, ctx) {
        const lines = {
          river: ["{name}在河边绕着话问了一圈，真正想知道的事藏在第二句里。"],
          home: ["{name}回住处把窗边的小礼物收起来，没等到回应就不再往外送。"],
          inn: ["{name}在酒馆听完两种说法，又找第三个人轻轻问了一遍。"],
          notice: ["{name}在告示牌前看谁的名字被挪到前面，没有马上说破。"],
          farm: ["{name}在田边送出一把香草，换来几句明天早上的安排。"]
        };
        return T.pick(lines[action] || lines.river).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
