(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  const version = "resident-language-profile-v0.2.0-local";
  const profiles = Object.freeze({
    practical: Object.freeze({
      promptStyle: "短句，先说要做什么，再补必要原因；少寒暄，不替别人总结情绪。",
      giftAction: (actor, target, item) => `${actor}干完手边的活，把${item}放到${target}手边，没有特意等一句回话。`
    }),
    orderly: Object.freeze({
      promptStyle: "说清顺序、位置和下一步；语气克制，避免连续罗列完整账目。",
      giftAction: (actor, target, item) => `${actor}把${item}收整好，说明是从今天的活里留下的，再递给${target}。`
    }),
    sociable: Object.freeze({
      promptStyle: "先回应对方，再说自己的事；句子稍活一些，但不空泛热闹。",
      giftAction: (actor, target, item) => `${actor}先问了${target}今天累不累，才把${item}递过去。`
    }),
    observant: Object.freeze({
      promptStyle: "少直接下结论，多提眼前看到的小变化；留一点话外余地。",
      giftAction: (actor, target, item) => `${actor}等旁边没人催了，才把${item}轻轻推到${target}面前。`
    }),
    bargaining: Object.freeze({
      promptStyle: "会追问差别和条件，但不用完整数字压人；让关心落在取舍上。",
      giftAction: (actor, target, item) => `${actor}把${item}递给${target}，这回没有顺势问价，也没有提回礼。`
    }),
    daring: Object.freeze({
      promptStyle: "直接说风险和决定，句子利落；不绕圈，也不夸大危险。",
      giftAction: (actor, target, item) => `${actor}把${item}往${target}手里一放，只说了一句先拿着。`
    })
  });

  function number(value, fallback = 1) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function profileIdFor(resident) {
    const traits = resident?.traits || {};
    const ranked = [
      ["observant", number(traits.quiet) + (1 - Math.min(1, number(traits.talk))) * 0.35],
      ["orderly", number(traits.order)],
      ["sociable", number(traits.talk)],
      ["bargaining", number(traits.trade)],
      ["daring", number(traits.risk)],
      ["practical", number(traits.work)]
    ].sort((a, b) => b[1] - a[1]);
    return ranked[0]?.[0] || "practical";
  }

  function profileFor(resident) {
    const id = profileIdFor(resident);
    return { id, ...profiles[id] };
  }

  function giftItemFor(resident, log = {}) {
    const text = `${log.activityId || ""} ${log.activityTitle || ""} ${log.place || ""}`;
    const storage = resident?.storage || {};
    if (/鱼|湿地|河|RW-/.test(text)) return "收网时留出的一小条鱼";
    if (/采收|留种|田|农场|谷仓|YF-/.test(text)) {
      if (number(storage.seeds, 0) > 0) return "清点后留下的一小包种子";
      if (number(storage.crop, 0) > 0) return "刚分好的一把菜";
      return "谷仓里挑出的一个干净布袋";
    }
    if (/餐馆|晚宴|会堂|节日|TC-|CH-/.test(text) && number(storage.meal, 0) > 0) {
      return "散场前留好的一份热饭";
    }
    if (/桥|维修|工具|OM-/.test(text) && number(storage.wood, 0) > 0) {
      return "修整工具时削平的一枚木楔";
    }
    if (number(storage.meal, 0) > 0) return "自家多做的一份饭";
    if (number(storage.seeds, 0) > 0) return "装在小布袋里的几粒留种";
    return "今天收工时留好的一件小东西";
  }

  function giftSummary(actor, target, item) {
    return profileFor(actor).giftAction(
      T.townRelationshipRules?.residentName?.(actor, actor?.id) || actor?.name || "有人",
      T.townRelationshipRules?.residentName?.(target, target?.id) || target?.name || "对方",
      item
    );
  }

  T.residentLanguageProfile = {
    version,
    profileIdFor,
    profileFor,
    giftItemFor,
    giftSummary
  };
}());
