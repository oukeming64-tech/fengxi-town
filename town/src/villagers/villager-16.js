(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "Écho", home: "16号",
      storage: { seeds: 2, crop: 1, wood: 3, stone: 2, ore: 0, fish: 0, meal: 2 },
      coins: 138, energy: 90, renown: 24, help: 22, favor: 4, standing: 17,
      traits: { work: 1.18, talk: 1.48, trade: 0.82, risk: 0.7, quiet: 0.32, order: 1.18 },
      decide(ctx, self) {
        if (self.energy < 20) return "home";
        const nameListPull = 1 + (self.renown * 0.012) + (self.help * 0.01);
        const chorePull = self.standing < self.help ? 1.2 : 0.95;
        return T.chooseWeighted([
          { value: "notice", weight: 2.25 * nameListPull },
          { value: "bridge", weight: ctx.scene.bridge * 1.65 * chorePull },
          { value: "farm", weight: 1.45 * chorePull },
          { value: "market", weight: 1.25 * nameListPull },
          { value: "inn", weight: 1.1 * nameListPull },
          { value: "home", weight: 0.25 }
        ]);
      },
      line(action, ctx) {
        const lines = {
          notice: ["{name}在告示牌前先应了一声，笔还没递过来，手已经伸到帮工名单最上面。", "{name}把会堂桌上的纸递得很勤，纸边擦过袖口，递完总要看看管事的人有没有点头。"],
          bridge: ["{name}在桥边谁喊都答应，木板、绳子、钉子轮着递，眼角却总往记名册那一页瞟。", "{name}帮人扶住桥梁的时候站得很正，掌心被木刺扎了一下，也先看远处的人有没有看见。"],
          farm: ["{name}跑到田里帮忙浇水，水桶还没放下，就问下一处还缺不缺人，裤脚一路湿到膝盖。"],
          market: ["{name}替几个摊子都搬了货，搬完没有马上走，等摊主把那句谢谢说完整。"],
          inn: ["{name}在酒馆替人添杯摆凳，听见有人夸今天帮手多，背一下就挺直了，杯里的水晃出半圈。"],
          home: ["{name}回住处把袖口洗干净，又把今天被记下的名字看了一遍，纸上那一点墨晕被灯照得很重。"]
        };
        return T.pick(lines[action] || lines.inn).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
