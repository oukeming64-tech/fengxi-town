(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "望灯", home: "27号",
      storage: { seeds: 1, crop: 1, wood: 2, stone: 0, ore: 0, fish: 0, meal: 2 },
      coins: 114, energy: 78, renown: 20, help: 6, favor: 4, standing: 13,
      traits: { work: 0.62, talk: 1.65, trade: 0.95, risk: 0.5, quiet: 0.45, order: 0.55 },
      decide(ctx, self) {
        if (self.energy < 18) return "home";
        const seenPull = 1 + (self.favor * 0.16) + (self.renown * 0.02);
        return T.chooseWeighted([
          { value: "inn", weight: 2.1 * seenPull },
          { value: "notice", weight: 1.8 * seenPull },
          { value: "market", weight: 1.35 },
          { value: "bridge", weight: ctx.scene.bridge * 0.65 },
          { value: "farm", weight: 0.5 },
          { value: "river", weight: 0.45 },
          { value: "home", weight: 0.35 }
        ]);
      },
      line(action, ctx) {
        const lines = {
          inn: ["{name}在酒馆门口站了一会儿，等窗边那桌有人招手，才像刚好路过似的坐下。", "{name}把杯子往热闹的一桌挪近，听见有人夸菜摆得齐，话一下多起来。"],
          notice: ["{name}在告示牌下把字念给旁人听，念完先看人群里有没有人点头。", "{name}把自己的名字写在捐料后面，笔尖停了停，又往旁边多让出一点空。"],
          market: ["{name}在集市帮人递篮子，眼睛却总往有人笑的摊位那边跑。"],
          bridge: ["{name}给老桥送来两块木板，放下后没有马上走，等有人看见才拍拍手。"],
          farm: ["{name}在田边插了几根竹签，听见街口有人喊名字，水瓢还没放稳就转身。"],
          river: ["{name}在河边洗了半只篮子，看见倒影里有人经过，又把头发理了一遍。"],
          home: ["{name}回住处把门开着，屋里的灯亮得比天色还早。"]
        };
        return T.pick(lines[action] || lines.inn).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
