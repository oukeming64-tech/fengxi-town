(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "Banc", home: "15号",
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
          inn: ["{name}又坐到熟人旁边，话不多，小餐馆卡座皮面被他坐出的一道浅痕却越来越深。", "{name}把多带的一盒辣豆炖肉推到桌边，塑料盖还冒着热气，像早就知道会有人少带饭。"],
          market: ["{name}把摊位往熟人旁边挪了一点，嘴上说借点阴凉，帆布货箱却刚好替对方挡住了过道的风。", "{name}在农夫市集来回走了两趟，每次都刚好停在有人需要递帆布袋的时候。"],
          bridge: ["{name}抱着一块木板在木桥边等人一起登记，边角硌着手掌，也没先把名字写到前面。", "{name}没有急着开口，只是把自己的木板放到同一堆里，拍了拍上面的锯末。"],
          notice: ["{name}在社区公告栏下看谁先写名，等前面的人把粗头记号笔放稳，自己才晚一步跟上。"],
          farm: ["{name}帮旁边的人扶了一下喷壶，动作很小，水却没有泼到刚冒头的番茄苗。"],
          home: ["{name}回到门廊，把明天要带的东西摆到门边，帆布袋带子绕了两圈，像是怕错过谁的一声招呼。"]
        };
        return T.pick(lines[action] || lines.inn).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
