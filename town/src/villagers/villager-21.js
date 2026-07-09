(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "金杯", home: "21号",
      storage: { seeds: 1, crop: 1, wood: 0, stone: 0, ore: 0, fish: 0, meal: 2 },
      coins: 168, energy: 84, renown: 31, help: 4, favor: 5, standing: 18,
      traits: { work: 0.45, talk: 1.55, trade: 1.42, risk: 0.82, quiet: 0.28, order: 0.52 },
      decide(ctx, self) {
        if (self.energy < 18) return "home";
        const audiencePull = 1 + (self.renown * 0.015) + (self.favor * 0.14);
        const chorePenalty = self.energy < 45 ? 0.55 : 1;
        return T.chooseWeighted([
          { value: "market", weight: 2.35 * audiencePull },
          { value: "notice", weight: 2.1 * audiencePull },
          { value: "inn", weight: 1.95 * audiencePull },
          { value: "farm", weight: 0.32 * chorePenalty },
          { value: "bridge", weight: ctx.scene.bridge * 0.25 * chorePenalty },
          { value: "home", weight: 0.35 }
        ]);
      },
      line(action, ctx) {
        const lines = {
          market: ["{name}在集市摊前摊开一页收益账，说去年那只联营货架翻得漂亮；真正盘货的人还在后排低头算数。", "{name}把几张旧账页压在货篮上，讲得像每个铜板都是自己亲手拨回来的。"],
          notice: ["{name}在告示牌边把自己的合伙摊写得很亮，旁边小字全留给会计桌。", "{name}把今日成绩贴在最醒目的位置，问到谁在管账时，只说镇上分工本来就要专业。"],
          inn: ["{name}在酒馆举杯讲收益曲线，讲到真正管账的人时，笑着把话题绕到下一轮。", "{name}端着杯子凑到热闹桌边，说联营摊又涨了，手里的杯沿倒先碰了三回。"],
          farm: ["{name}到田边看了一圈，说这季投入要看长线，水桶却被别人顺手接过去。"],
          bridge: ["{name}在桥边说修好以后客流会涨，木板刚抬起，就有人替他接了手。"],
          home: ["{name}回住处擦杯子，账页压在最上面，鞋底倒没沾多少泥。"]
        };
        return T.pick(lines[action] || lines.market).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
