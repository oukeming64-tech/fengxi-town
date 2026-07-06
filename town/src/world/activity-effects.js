(function () {
  const T = window.MorningTown;

  function storageFor(activity) {
    const text = `${activity.title} ${activity.outputs}`;
    if (/播种|赊购|接种子/.test(text)) return { seeds: activity.id === "YF-01" ? -1 : 2 };
    if (/采收|作物|叶菜|湿地作物/.test(text)) return { crop: activity.laborCost >= 3 ? 3 : 1 };
    if (/木材|柴|木料/.test(text)) return { wood: activity.laborCost >= 3 ? 3 : 1 };
    if (/石材|砂砾|采石/.test(text)) return { stone: 2 };
    if (/零件|金属|矿/.test(text)) return { ore: 1, stone: 1 };
    if (/钓鱼|蟹笼|食物/.test(text)) return { fish: 2 };
    if (/餐馆|晚宴/.test(text)) return { meal: -1 };
    return {};
  }

  function effectFor(activity) {
    const labor = activity.laborCost || 0;
    const storage = storageFor(activity);
    const tradeGain = activity.skills.includes("trade") ? 7 + labor * 2 : 0;
    const fieldGain = activity.zoneCode === "YF" || activity.zoneCode === "RW" || activity.zoneCode === "MF" ? labor * 2 : 0;
    const publicGain = activity.zoneCode === "CH" || activity.tags.includes("social") ? 2 : 0;
    const accountingGain = activity.skills.includes("accounting") ? 3 : 0;

    return {
      kind: activity.kind,
      health: activity.legacyAction === "home" ? 5 : -Math.max(0, Math.floor((activity.riskLevel + labor - 2) / 2)),
      energy: activity.legacyAction === "home" ? 18 : -(5 + labor * 6 + Math.max(0, activity.riskLevel - 2) * 2),
      coins: tradeGain + fieldGain - (activity.id === "TC-02" || activity.id === "SR-06" || activity.id === "GG-02" ? 8 : 0),
      renown: publicGain + (activity.tags.includes("risk") ? 2 : 0),
      help: activity.kind === "work" ? 3 + labor * 2 : 1,
      favor: activity.tags.includes("social") ? 1 : 0,
      standing: accountingGain + publicGain,
      distance: activity.legacyAction === "home" || activity.tags.includes("quiet") ? -1 : 0,
      storage
    };
  }

  T.activityEffects = {
    version: "activity-effects-v0.2-local",
    storageFor,
    effectFor
  };
}());
