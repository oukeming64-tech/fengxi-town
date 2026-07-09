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
          notice: ["{name}在 community board 贴了一张外镇 county fair 的彩纸，纸边还卷着，他说枫溪镇也该有个 parade day。", "{name}把{task}写得像一场 town hall ceremony，马克笔划得很大，真正搬折叠椅的几个人反倒挤在角落里。"],
          market: ["{name}站在 farmers' market 入口和来客打招呼，袖口抬得比 booth flag 还高，看 booth 这件事倒像顺带的。", "{name}举着一张外镇灯会的海报，讲得像那些 string lights 今晚就会照到 Main Street 的砖路上。"],
          inn: ["{name}在 diner 吧台讲远处镇子的热闹，桌上有人听得点头，也有人低头把纸巾撕成一小堆。"],
          bridge: ["{name}到木桥边看了一会儿，说等修好那天一定要挂 bunting，手却一直没从夹克口袋里伸出来。", "{name}被问今天能搬几块 lumber，便指向桥头说先把气势立起来，脚边那块 plank 还没挪窝。"],
          farm: ["{name}在 community garden 停得很短，鞋底连 mulch 都没沾上，更多时候是在看谁抬头看见了自己。"],
          home: ["{name}回到 front room 翻出旧彩纸，挑最大的一张压到桌面上，压纸的镇庆纪念杯比纸还沉。"]
        };
        return T.pick(lines[action] || lines.notice).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
