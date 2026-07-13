(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  function clamp(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  function create(residentIds = [], startDay = 1) {
    const residents = {};
    residentIds.forEach((id) => {
      residents[id] = { slots: 0, workload: 0, heavySlots: 0, restSlots: 0 };
    });
    return {
      version: "stage-labor-fairness-v0.1.8-e",
      startDay: Math.max(1, Number(startDay) || 1),
      endDay: null,
      sampledDays: 0,
      lowEnergyResidentDays: 0,
      unhealthyResidentDays: 0,
      residents
    };
  }

  function residentRecord(ledger, residentId) {
    if (!ledger?.residents || !residentId) return null;
    ledger.residents[residentId] = ledger.residents[residentId]
      || { slots: 0, workload: 0, heavySlots: 0, restSlots: 0 };
    return ledger.residents[residentId];
  }

  function isRest(plan) {
    const activity = plan?.activity || {};
    return plan?.legacyAction === "home"
      || activity.id === "REST-01"
      || activity.category === "recovery";
  }

  function recordAction(ledger, villager, plan) {
    const record = residentRecord(ledger, villager?.id);
    if (!record) return;
    const laborCost = clamp(plan?.activity?.laborCost, 0, 5);
    record.slots += 1;
    record.workload += laborCost;
    if (laborCost >= 3) record.heavySlots += 1;
    if (isRest(plan)) record.restSlots += 1;
  }

  function recordDay(ledger, villagers, day) {
    if (!ledger) return;
    ledger.sampledDays += 1;
    ledger.endDay = Math.max(ledger.startDay, Number(day) || ledger.startDay);
    ledger.lowEnergyResidentDays += (villagers || []).filter((resident) => Number(resident.energy || 0) < 35).length;
    ledger.unhealthyResidentDays += (villagers || []).filter((resident) => Number(resident.health || 0) < 65).length;
  }

  function gini(values) {
    const sorted = (values || []).map((value) => Math.max(0, Number(value) || 0)).sort((a, b) => a - b);
    const total = sorted.reduce((sum, value) => sum + value, 0);
    if (!sorted.length || total === 0) return 0;
    const weighted = sorted.reduce((sum, value, index) => sum + (2 * (index + 1) - sorted.length - 1) * value, 0);
    return clamp(weighted / (sorted.length * total), 0, 1);
  }

  function average(values) {
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  }

  function summarize(ledger) {
    const records = Object.values(ledger?.residents || {});
    const residentCount = records.length;
    const sampledDays = Math.max(0, Number(ledger?.sampledDays) || 0);
    const residentDays = Math.max(1, residentCount * sampledDays);
    const expectedRestSlots = Math.max(1, sampledDays / 5);
    const lowEnergyRate = clamp((Number(ledger?.lowEnergyResidentDays) || 0) / residentDays, 0, 1);
    const unhealthyRate = clamp((Number(ledger?.unhealthyResidentDays) || 0) / residentDays, 0, 1);
    const components = {
      workloadBalance: Math.round(100 - gini(records.map((item) => item.workload)) * 100),
      heavyWorkBalance: Math.round(100 - gini(records.map((item) => item.heavySlots)) * 100),
      restAccess: Math.round(average(records.map((item) => Math.min(1, item.restSlots / expectedRestSlots))) * 100),
      sustainableWork: Math.round(clamp(100 - lowEnergyRate * 70 - unhealthyRate * 30))
    };
    const score = Math.round(
      components.workloadBalance * 0.35
      + components.heavyWorkBalance * 0.25
      + components.restAccess * 0.2
      + components.sustainableWork * 0.2
    );
    return Object.freeze({
      source: "local-stage-labor-ledger",
      startDay: Number(ledger?.startDay) || 1,
      endDay: Number(ledger?.endDay) || Number(ledger?.startDay) || 1,
      sampledDays,
      residentCount,
      totalSlots: records.reduce((sum, item) => sum + item.slots, 0),
      lowEnergyRate: Math.round(lowEnergyRate * 100),
      unhealthyRate: Math.round(unhealthyRate * 100),
      components: Object.freeze(components),
      score: clamp(score)
    });
  }

  T.stageLaborFairness = {
    version: "stage-labor-fairness-v0.1.8-e",
    create,
    recordAction,
    recordDay,
    summarize,
    gini
  };
}());
