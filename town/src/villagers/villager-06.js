(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "Campanule", home: "06号",
      storage: { seeds: 4, crop: 2, wood: 1, stone: 0, ore: 0, fish: 0, meal: 2 },
      coins: 124, energy: 82, renown: 22, help: 9, favor: 3, standing: 21,
      traits: { work: 0.72, talk: 1.78, trade: 1.12, risk: 0.48, quiet: 0.58, order: 1.0 },
      decide(ctx, self) {
        if (self.energy < 18) return "home";
        const roomWarmth = 1 + self.favor * 0.12 + self.renown * 0.015;
        return T.chooseWeighted([
          { value: "notice", weight: 2.3 * roomWarmth },
          { value: "inn", weight: 1.8 * roomWarmth },
          { value: "market", weight: 1.45 },
          { value: "river", weight: 0.65 },
          { value: "farm", weight: 0.55 }
        ]);
      },
      line(action, ctx) {
        const lines = {
          notice: ["{name}在社区公告栏前把卷起的传单抹平，先问谁还没吃午饭，再把{task}拆成两句大家都接得上的话。", "{name}把镇政厅门口的两张通知换了个顺序，又顺手按紧歪掉的图钉，旁边的人这才知道先从哪件事说起。"],
          market: ["{name}替隔壁农夫市集的小摊补了一句好话，说完没有停在摊前，倒把主街路口那只挡脚的空木箱挪开了。", "{name}把白色摊棚边一张折叠椅往后让了半尺，来晚的人也能站进热闹里。"],
          inn: ["{name}用一句不轻不重的玩笑把小餐馆里两张卡座接到一起，咖啡杯碰了一下，那点冷场就散了。", "{name}听见桌上突然安静，便低头给人续了半杯咖啡，把话转到明天谁先去镇政厅。"],
          river: ["{name}在小溪边冲洗一篮生菜，叶子卡在铁皮水槽边，她顺口问起明天谁去木桥，像真的只是怕排水口被堵住。"],
          farm: ["{name}在社区菜园摘下几朵快败的小花，又把别人的帆布袋理顺，乱糟糟的小径慢慢有了站脚的地方。"],
          home: ["{name}回到前廊，把门边那张折叠椅擦了一遍，椅面还没干，像是已经给晚点来的闲话留了位置。"]
        };
        return T.pick(lines[action] || lines.notice).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
