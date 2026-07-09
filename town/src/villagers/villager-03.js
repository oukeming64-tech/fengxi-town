(function () {
  const T = window.MorningTown;
  T.registerVillager(function (name) {
    return T.makeVillager({
      name, tag: "Nasse", home: "03号",
      storage: { seeds: 1, crop: 0, wood: 1, stone: 1, ore: 0, fish: 5, meal: 1 },
      coins: 116, energy: 82, renown: 14, help: 9, favor: 1, standing: 17,
      traits: { work: 0.75, talk: 0.9, trade: 0.9, risk: 0.65, quiet: 1.55, order: 0.75 },
      decide(ctx, self) {
        if (self.energy < 18) return "home";
        return T.chooseWeighted([{ value: "river", weight: 3.3 }, { value: "market", weight: 1.2 }, { value: "inn", weight: 0.9 }, { value: "farm", weight: 0.55 }, { value: "home", weight: 0.8 }]);
      },
      line(action, ctx) {
        const lines = {
          river: ["{name}把鱼线放得很远，半天没说话，鱼篓却慢慢沉了。", "{name}坐在河边补网，听见的闲话比钓到的鱼还多一点。"],
          market: ["{name}把鱼摆在湿布上卖，不吆喝，识货的人自己会停下。"],
          inn: ["{name}带了两条鱼去酒馆，换来一碗热汤和几句晚风里的话。"],
          farm: ["{name}给田边水渠清了淤泥，像是顺手。"],
          home: ["{name}回住处腌鱼，屋外挂了一串细小的银光。"]
        };
        return T.pick(lines[action] || lines.home).replace("{name}", name).replace("{task}", ctx.scene.task);
      }
    });
  });
}());
