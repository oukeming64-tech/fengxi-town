(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "常坐", home: "15号",
      storage: { seeds: 1, crop: 1, wood: 2, stone: 1, ore: 0, fish: 1, meal: 2 },
      coins: 142, energy: 84, renown: 15, help: 14, favor: 2, standing: 17,
      traits: { work: 0.88, talk: 1.28, trade: 1.08, risk: 0.72, quiet: 0.72, order: 0.86 },
      decide(ctx, self) {
        if (self.energy < 18) return "home";
        const closePull = 1 + self.favor * 0.14 + self.renown * 0.01;
        return T.chooseWeighted([
          { value: "inn", weight: 1.85 * closePull },
          { value: "market", weight: 1.55 },
          { value: "bridge", weight: ctx.scene.bridge * 1.15 },
          { value: "notice", weight: 1.05 * closePull },
          { value: "farm", weight: 0.75 },
          { value: "home", weight: 0.35 }
        ]);
      },
      line(action, ctx) {
        const lines = {
          inn: ["{name}又坐到熟人旁边，话不多，但凳子几乎没换过地方。", "{name}把多带的一碗汤推到桌边，像早就知道会有人少带饭。"],
          market: ["{name}把摊位往熟人旁边挪了一点，像只是为了借阴凉。", "{name}在集市来回走了两趟，每次都刚好停在有人需要递篮子的时候。"],
          bridge: ["{name}抱着木板在桥边等人一起登记，站得很稳。", "{name}没有急着开口，只是把自己的木板放到同一堆里。"],
          notice: ["{name}在告示牌下看谁先写名，自己晚了一步才跟上。"],
          farm: ["{name}帮旁边的人扶了一下水桶，动作小，但出现得及时。"],
          home: ["{name}回住处把明天要带的东西摆到门边，像是怕错过谁的一声招呼。"]
        };
        return T.pick(lines[action] || lines.inn).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
