(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "Cercle", home: "27号",
      storage: { seeds: 0, crop: 0, wood: 1, stone: 0, ore: 0, fish: 0, meal: 3 },
      coins: 126, energy: 96, renown: 18, help: 5, favor: 6, standing: 12,
      traits: { work: 0.54, talk: 1.72, trade: 0.82, risk: 0.78, quiet: 0.35, order: 0.5 },
      decide(ctx, self) {
        if (self.energy < 16) return "home";
        const audiencePull = 1 + (self.favor * 0.18) + (self.renown * 0.018);
        const sunnyPull = ctx.weather?.type === "sunny" ? 1.35 : 1;
        return T.chooseWeighted([
          { value: "river", weight: 2.4 * sunnyPull },
          { value: "market", weight: 1.9 * audiencePull },
          { value: "inn", weight: 1.75 * audiencePull },
          { value: "notice", weight: 1.5 },
          { value: "bridge", weight: ctx.scene.bridge * 0.45 },
          { value: "farm", weight: 0.35 },
          { value: "home", weight: 0.2 }
        ]);
      },
      line(action, ctx) {
        const lines = {
          river: ["{name}沿着河湾跑了三圈，停下第一句先问旁边的人忙不忙，汗顺着下巴滴到衣领上。", "{name}把晨跑路线绕到人多的浅滩，喘匀后说自己其实也很懂配速，脚尖还在原地小跳。"],
          market: ["{name}在集市摊前慢跑停步，问摊主忙不忙，又说自己对买卖节奏很有心得，手里的菜篮只接过半边。", "{name}帮人递了半篮菜，话头很快拐到自己跑步拿过镇上好成绩。"],
          inn: ["{name}在酒馆门口做拉伸，听见有人聊账本，就说自己在算配速这件事上也算有成就。", "{name}端着水杯凑到热闹桌边，先问大家忙不忙，再讲今天跑了多远，杯里的水一口没少。"],
          notice: ["{name}在告示牌旁贴了晨跑路线，纸上弯弯绕绕一圈，旁边又补了一句：有空的人可以一起练。", "{name}看见有人读告示，立刻问人家忙不忙，说自己对这类安排也挺专业。"],
          bridge: ["{name}绕老桥跑了两趟，最后只搬了一根木条，却把桥面坡度讲得很认真，连哪一步容易绊脚都指出来。"],
          farm: ["{name}从田埂边跑过，问正在浇水的人忙不忙，脚步没停，建议倒是留了三条。"],
          home: ["{name}回住处擦鞋，把鞋带重新系了两遍，鞋尖朝着门口，像是在等下一次有人问起晨跑。"]
        };
        return T.pick(lines[action] || lines.river).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
