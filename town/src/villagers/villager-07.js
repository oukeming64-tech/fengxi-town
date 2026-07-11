(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "账本", home: "07号",
      storage: { seeds: 2, crop: 2, wood: 2, stone: 2, ore: 1, fish: 0, meal: 1 },
      coins: 188, energy: 76, renown: 11, help: 8, favor: 0, standing: 15,
      traits: { work: 0.32, talk: 1.45, trade: 2.0, risk: 0.45, quiet: 0.8, order: 0.62 },
      decide(ctx, self) {
        if (self.energy < 18) return "home";
        const crowdPull = 1 + self.renown * 0.015 + self.standing * 0.012;
        return T.chooseWeighted([
          { value: "market", weight: 3.6 * crowdPull },
          { value: "inn", weight: 2.4 * crowdPull },
          { value: "notice", weight: 2.0 * crowdPull },
          { value: "home", weight: 1.1 },
          { value: "farm", weight: 0.2 },
          { value: "mine", weight: 0.15 },
          { value: "bridge", weight: ctx.scene.bridge * 0.1 }
        ]);
      },
      line(action, ctx) {
        const lines = {
          market: ["{name}只数白色摊棚下摆了多少只筐，没掀开盖布看菜叶。摊主把“今年最好”说了两遍，他便在账页上画了个大圈。", "{name}听见合作社的人报出“今天收了四十箱”，立刻点头；至于箱底几颗碰伤的番茄，他像是没看见。"],
          inn: ["{name}在主街小餐馆听人保证明早能叫来十个帮手，咖啡还没凉，就把名字写进招工单，没问谁真正会修围栏。", "{name}听邻桌把一桩小买卖说得热热闹闹，只记下“铺满三排货架”，没追问东西能不能卖出去。"],
          notice: ["{name}把告示上“三天完成三十件”描得又粗又黑，下面那行验收标准却被风掀到背面。", "{name}在镇政厅门口听完一段响亮的许诺，先替人鼓掌，回头才发现清单上没有谁负责搬货。"],
          farm: ["{name}站在社区菜园边数完十二垄苗，把锄头递给路过的人，说自己回去整理数字。"],
          mine: ["{name}在旧采石场门口问今天能装满几车，听见数字够大就回头了，连一块矿石也没弯腰查看。"],
          bridge: ["{name}给木桥修缮单添了“二十块木板”，随后把手套塞回口袋，等别人把木板搬来。"],
          river: ["{name}在溪边只数起了几只鱼篓，听人说“今晚准能装满”就记成收获，自己没下水碰绳。"],
          home: ["{name}把需要亲手搬箱子的清单压在前廊花盆下，转身去找一个愿意顺手代办的人。"]
        };
        return T.pick(lines[action] || lines.market).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
