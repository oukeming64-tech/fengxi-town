(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "旧炉", home: "18号",
      storage: { seeds: 2, crop: 2, wood: 5, stone: 1, ore: 0, fish: 0, meal: 5 },
      coins: 126, energy: 88, renown: 16, help: 20, favor: 3, standing: 20,
      traits: { work: 1.0, talk: 1.45, trade: 0.85, risk: 0.7, quiet: 0.45, order: 0.75 },
      decide(ctx, self) {
        if (self.energy < 20) return "home";
        return T.chooseWeighted([{ value: "inn", weight: 2.5 }, { value: "farm", weight: 1.2 }, { value: "bridge", weight: ctx.scene.bridge * 1.2 }, { value: "market", weight: 1.0 }, { value: "notice", weight: 0.7 }]);
      },
      line(action, ctx) {
        const lines = {
          inn: ["{name}拍着桌子说来者都是邻人，酒馆一下热了。"],
          farm: ["{name}帮人扛了两袋肥，讲种法时还是绕回了吃饭喝汤。"],
          bridge: ["{name}搬木头搬得很实在，一边搬一边喊晚上住处有热饭。"],
          market: ["{name}在集市请人尝了一口炖菜，摊前很快围出一圈。"],
          notice: ["{name}在告示牌上写今晚住处开灶，字大得远处也看得见。"]
        };
        return T.pick(lines[action] || lines.inn).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
