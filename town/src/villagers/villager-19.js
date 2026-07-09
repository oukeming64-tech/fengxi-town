(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "Liseron", home: "19号",
      storage: { seeds: 3, crop: 0, wood: 2, stone: 0, ore: 0, fish: 1, meal: 2 },
      coins: 116, energy: 84, renown: 13, help: 9, favor: 1, standing: 14,
      traits: { work: 0.76, talk: 1.18, trade: 0.82, risk: 0.42, quiet: 1.22, order: 1.05 },
      decide(ctx, self) {
        if (self.energy < 18) return "home";
        const unanswered = self.favor < 2 ? 1.15 : 0.9;
        return T.chooseWeighted([
          { value: "river", weight: 1.45 },
          { value: "inn", weight: 1.2 * unanswered },
          { value: "home", weight: 1.15 },
          { value: "market", weight: 0.95 },
          { value: "notice", weight: 0.85 },
          { value: "farm", weight: 0.7 }
        ]);
      },
      line(action, ctx) {
        const lines = {
          river: ["{name}在河边绕着话问了一圈，真正想知道的事藏在第二句里，第一句只问水冷不冷。", "{name}把热茶递给洗网的人，杯口冒着白气，先问手冻不冻，再问谁刚从会堂回来。"],
          home: ["{name}回住处把窗边的小礼物收起来，纸绳解了又系，没等到回应就不再往外送。", "{name}把多泡的一杯茶倒掉，茶叶贴在碗底，没有再让人替自己传话。"],
          inn: ["{name}在酒馆听完两种说法，又找第三个人轻轻问了一遍，声音压得比炉火还低。"],
          market: ["{name}在集市把一小包茶叶换出去，换回来的不是钱，是几句明天的安排和一个没说完的眼神。"],
          notice: ["{name}在告示牌前看谁的名字被挪到前面，手指停在纸边，没有马上说破。"],
          farm: ["{name}在田边送出一把香草，草梗还带着露水，换来几句明天早上的安排。"]
        };
        return T.pick(lines[action] || lines.river).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
