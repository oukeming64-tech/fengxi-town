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
          river: ["{name}沿着 creek loop 跑了三圈，停下第一句先问旁边的人忙不忙，汗顺着下巴滴到 T-shirt 领口。", "{name}把晨跑路线绕到人多的 footbridge，喘匀后说自己其实也很懂 pacing，脚尖还在原地小跳。"],
          market: ["{name}在 farmers' market stand 前慢跑停步，问 booth owner 忙不忙，又说自己对买卖节奏很有心得，手里的 tote 只接过半边。", "{name}帮人递了半篮 tomatoes，话头很快拐到自己跑步拿过小镇好成绩。"],
          inn: ["{name}在 diner 门口做拉伸，听见有人聊账本，就说自己在算 pacing 这件事上也算有成就。", "{name}端着冰水凑到热闹桌边，先问大家忙不忙，再讲今天跑了多远，杯里的水一口没少。"],
          notice: ["{name}在 community board 旁贴了晨跑路线，纸上弯弯绕绕一圈，旁边又补了一句：有空的人可以一起练。", "{name}看见有人读 flyer，立刻问人家忙不忙，说自己对这类安排也挺专业。"],
          bridge: ["{name}绕旧木桥跑了两趟，最后只搬了一根 plank，却把桥面坡度讲得很认真，连哪一步容易绊脚都指出来。"],
          farm: ["{name}从 community garden 边跑过，问正在浇水的人忙不忙，脚步没停，建议倒是留了三条。"],
          home: ["{name}回到 front steps 擦跑鞋，把鞋带重新系了两遍，鞋尖朝着门口，像是在等下一次有人问起晨跑。"]
        };
        return T.pick(lines[action] || lines.river).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
