(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "Drapeau", home: "14号",
      storage: { seeds: 0, crop: 1, wood: 1, stone: 1, ore: 0, fish: 0, meal: 1 },
      coins: 182, energy: 80, renown: 25, help: 4, favor: 2, standing: 15,
      traits: { work: 0.42, talk: 1.78, trade: 1.2, risk: 0.82, quiet: 0.32, order: 0.5 },
      decide(ctx, self) {
        if (self.energy < 18) return "home";
        const stagePull = 1 + self.renown * 0.018;
        return T.chooseWeighted([
          { value: "notice", weight: 3.0 * stagePull },
          { value: "market", weight: 1.55 * stagePull },
          { value: "inn", weight: 1.1 },
          { value: "bridge", weight: ctx.scene.bridge * 0.32 },
          { value: "farm", weight: 0.22 },
          { value: "home", weight: 0.25 }
        ]);
      },
      line(action, ctx) {
        const lines = {
          notice: ["{name}在社区公告栏贴了一张外镇县集会的彩纸，纸边还卷着，他说枫溪镇也该有个游行日。", "{name}把{task}写得像一场镇政厅典礼，马克笔划得很大，真正搬折叠椅的几个人反倒挤在角落里。"],
          market: ["{name}站在农夫市集入口和来客打招呼，袖口抬得比摊棚小旗还高，看摊这件事倒像顺带的。", "{name}举着一张外镇灯会的海报，讲得像那些小串灯今晚就会照到主街的砖路上。"],
          inn: ["{name}在小餐馆吧台讲远处镇子的热闹，桌上有人听得点头，也有人低头把纸巾撕成一小堆。"],
          bridge: ["{name}到木桥边看了一会儿，说等修好那天一定要挂三角旗，手却一直没从夹克口袋里伸出来。", "{name}被问今天能搬几块木料，便指向桥头说先把气势立起来，脚边那块木板还没挪窝。"],
          farm: ["{name}在社区菜园停得很短，鞋底连覆土木屑都没沾上，更多时候是在看谁抬头看见了自己。"],
          home: ["{name}回到前屋翻出旧彩纸，挑最大的一张压到桌面上，压纸的镇庆纪念杯比纸还沉。"]
        };
        return T.pick(lines[action] || lines.notice).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
