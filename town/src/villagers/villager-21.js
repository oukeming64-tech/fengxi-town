(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "草帽", home: "21号",
      storage: { seeds: 3, crop: 2, wood: 1, stone: 1, ore: 0, fish: 0, meal: 1 },
      coins: 110, energy: 82, renown: 17, help: 8, favor: 1, standing: 14,
      traits: { work: 0.8, talk: 1.2, trade: 1.2, risk: 0.65, quiet: 0.55, order: 0.65 },
      decide(ctx, self) {
        if (self.energy < 18) return "home";
        return T.chooseWeighted([{ value: "market", weight: 1.8 }, { value: "notice", weight: 1.7 }, { value: "inn", weight: 1.2 }, { value: "farm", weight: 0.8 }, { value: "bridge", weight: ctx.scene.bridge * 0.55 }]);
      },
      line(action, ctx) {
        const lines = {
          market: ["{name}在集市露了个脸，菜卖得不多，认识的人倒多了两个。"],
          notice: ["{name}在告示牌下面跟了一句热闹话，让名字也留在今天的纸上。"],
          inn: ["{name}去酒馆凑了一桌，事情没谈深，杯子倒是碰了几回。"],
          farm: ["{name}上午浇了几垄地，听见集市热起来就把水桶放下了。"],
          bridge: ["{name}送来一块木板，站了一会儿才走。"]
        };
        return T.pick(lines[action] || lines.market).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
