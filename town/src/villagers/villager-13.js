(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "Persienne", home: "13号",
      storage: { seeds: 1, crop: 1, wood: 4, stone: 2, ore: 1, fish: 0, meal: 2 },
      coins: 160, energy: 84, renown: 19, help: 14, favor: 2, standing: 21,
      traits: { work: 1.02, talk: 1.38, trade: 1.18, risk: 1.12, quiet: 0.5, order: 0.88 },
      decide(ctx, self) {
        if (self.energy < 20) return "home";
        const proofPull = 1 + self.renown * 0.012;
        return T.chooseWeighted([
          { value: "market", weight: 1.9 * proofPull },
          { value: "bridge", weight: ctx.scene.bridge * 1.35 },
          { value: "inn", weight: 1.35 },
          { value: "notice", weight: 1.15 },
          { value: "mine", weight: 0.85 },
          { value: "home", weight: 0.35 }
        ]);
      },
      line(action, ctx) {
        const lines = {
          market: ["{name}拿出一只用雪松薄木片做的小风车给摊边的人试，薄木片一转，围观的人先记住了那点沙沙声。", "{name}把新做的小机关摆到周末农夫市集，讲到卡榫时手指上还沾着木屑，倒不是只会说热闹话。"],
          inn: ["{name}在小餐馆后门拆开一只坏掉的霓虹灯，电线胶皮味冒出来，他边擦手边讲这东西还能怎么改。", "{name}听见有人说不结实，没争辩，直接把零件拆开又装了一遍，最后把螺丝放到对方掌心里。"],
          notice: ["{name}把试用结果记在社区公告栏上，字旁边还画了一个歪歪的小轮架，下面很快有人问五金店还剩多少木料。"],
          bridge: ["{name}带了个省力的小轮架到木桥边，第一根木料滚过去时，抬木的人肩膀终于低了一点。", "{name}把新做的扣环挂到桥绳上，先让旁人拉两下，自己站在旁边听绳子响得顺不顺。"],
          mine: ["{name}去旧采石场找能做零件的矿石，出来先在水泥台阶上试敲两声，听见脆响才把矿放进袋子。"],
          home: ["{name}回到车库工作台，把失败的小零件排成一排，桌面被划出细痕，他挑出两个还能再试的留到台灯下。"]
        };
        return T.pick(lines[action] || lines.market).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
