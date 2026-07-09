(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "Vieux Four", home: "18号",
      storage: { seeds: 2, crop: 2, wood: 5, stone: 1, ore: 0, fish: 1, meal: 5 },
      coins: 134, energy: 90, renown: 18, help: 18, favor: 3, standing: 19,
      traits: { work: 0.95, talk: 1.72, trade: 1.22, risk: 1.15, quiet: 0.34, order: 0.58 },
      decide(ctx, self) {
        if (self.energy < 20) return "home";
        const heat = 1 + self.favor * 0.12 + self.renown * 0.015;
        return T.chooseWeighted([
          { value: "inn", weight: 2.45 * heat },
          { value: "market", weight: 1.55 * heat },
          { value: "notice", weight: 1.1 },
          { value: "bridge", weight: ctx.scene.bridge * 1.18 },
          { value: "farm", weight: 0.95 },
          { value: "home", weight: 0.3 }
        ]);
      },
      line(action, ctx) {
        const lines = {
          inn: ["{name}拍着小餐馆的长桌说来者都是邻居，碗里的辣豆炖肉晃到桌沿，吧台那边一下热了。", "{name}把两张卡座旁的小桌并到一起，桌脚刮过地面，三句闲话就把卖鱼的和缺木料的人介绍上了。"],
          farm: ["{name}帮人扛了两袋园艺土，肩上沾着灰，讲种法时还是绕回了晚上谁带玉米面包。"],
          bridge: ["{name}搬木料搬得很实在，一边搬一边喊晚上前廊有热辣豆炖肉，喊到最后嗓子都有点哑。", "{name}看木桥边气氛低了，立刻说谁出一把力晚上就多一勺辣豆炖肉，木屑还粘在袖口上。"],
          market: ["{name}在农夫市集请人尝了一口炖豆子，勺子还没放回锅里，摊前已经围出一圈。", "{name}听说两家都缺工具，马上拍板让他们傍晚到小餐馆碰头，像那张靠窗的桌子本来就是给他们留的。"],
          notice: ["{name}在社区公告栏上写今晚前廊有自带菜晚餐，字大得从街对面也看得见，最后一笔记号笔蹭到鞋面上。"],
          home: ["{name}回到后门先把野餐长桌擦出来，桌角那道旧酱汁印也擦了两遍，像是认定今晚还会来一院子人。"]
        };
        return T.pick(lines[action] || lines.inn).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
