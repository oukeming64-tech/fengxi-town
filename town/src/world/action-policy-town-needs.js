(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  const D = T.townLedgerData || {};
  const { facilityCatalog = {} } = D;
  const surplusSalesLedger = T.townSurplusSalesLedger || {};

  const repairActivityIds = new Set(["YF-07", "YF-10", "TC-10", "OM-02", "OM-08", "GG-04", "YF-12", "SR-06"]);
  const upgradeActivityIds = new Set(["AC-10", "CH-09", "SR-06", "GG-04"]);
  const saleActivityIds = new Set(["CH-08", "SR-05", "TC-05", "YF-09", "GG-05"]);
  const contractActivityIds = new Set(["TC-01", "GG-03", "GG-05", "SR-01", "SR-02", "SR-07", "AC-04"]);

  function townStateFrom(ctx) {
    return ctx.townState || ctx.state?.townState || null;
  }

  function facilitiesOf(state) {
    return Object.values(state?.facilities || {});
  }

  function facilityPressure(state) {
    const facilities = facilitiesOf(state);
    if (!facilities.length) return { lowest: 100, lowCount: 0, repairNeed: 0, greenhouseNeed: 0 };
    return facilities.reduce((summary, facility) => {
      const condition = Number(facility.condition ?? 100);
      summary.lowest = Math.min(summary.lowest, condition);
      if (condition < 68) summary.lowCount += 1;
      summary.repairNeed += Math.max(0, 86 - condition);
      if (facility.id === "greenhouse") summary.greenhouseNeed = Math.max(0, 88 - condition);
      return summary;
    }, { lowest: 100, lowCount: 0, repairNeed: 0, greenhouseNeed: 0 });
  }

  function hasUpgradeCandidate(state) {
    const cash = Number(state?.ledger?.cashYsc || 0);
    return facilitiesOf(state).some((facility) => {
      const data = facilityCatalog[facility.id] || {};
      const cost = Math.round(Number(data.upgradeCostYsc || 0) * (1 + (Number(facility.level || 1) - 1) * 0.42));
      return facility.level < facility.maxLevel && facility.condition >= 62 && cash >= cost + 600;
    });
  }

  function inventoryPressure(state) {
    if (surplusSalesLedger.inventoryPressure) return surplusSalesLedger.inventoryPressure(state);
    return { quantity: 0, urgentQuantity: 0, capacity: Number(state?.inventory?.capacity || 120) };
  }

  function openContractPressure(state) {
    return (state?.contracts || []).reduce((score, contract) => {
      if (!["active", "overdue"].includes(contract.status)) return score;
      const needed = Math.max(0, contract.quantity - contract.deliveredQuantity);
      const daysLeft = Number(contract.dueDay || 0) - Number(state.day || 1);
      if (!needed) return score;
      if (contract.status === "overdue") return score + 40 + needed * 2;
      if (daysLeft <= 1) return score + 30 + needed * 2;
      if (daysLeft <= 3) return score + 16 + needed;
      return score + 4;
    }, 0);
  }

  function readyFieldPressure(state) {
    return (state?.fields || []).reduce((score, field) => {
      if (field.status === "ready") return score + 18 + Number(field.overripeDays || 0) * 8;
      if (field.growth >= field.daysToMature - 1) return score + 6;
      return score;
    }, 0);
  }

  function scoreRepairNeed(activity, pressure) {
    if (!repairActivityIds.has(activity.id)) return 0;
    let score = Math.min(46, Math.round(pressure.repairNeed / 5));
    if (pressure.lowest < 45) score += 30;
    else if (pressure.lowest < 62) score += 18;
    if (activity.id === "YF-07") score += Math.min(24, Math.round(pressure.greenhouseNeed / 3));
    if (activity.id === "YF-10" || activity.id === "TC-10") score += pressure.lowCount * 5;
    return score;
  }

  function scoreInventoryNeed(activity, state) {
    if (!saleActivityIds.has(activity.id)) return 0;
    const pressure = inventoryPressure(state);
    let score = 0;
    if (pressure.urgentQuantity > 0) score += Math.min(36, pressure.urgentQuantity * 4);
    if (pressure.quantity > pressure.capacity * 0.5) score += 12;
    if (pressure.quantity > pressure.capacity * 0.75) score += 18;
    if (activity.id === "CH-08" || activity.id === "SR-05") score += 8;
    if (activity.id === "YF-09" && pressure.quantity > pressure.capacity * 0.45) score += 6;
    return score;
  }

  function scoreTownNeeds(activity, rawCtx = {}) {
    const state = townStateFrom(rawCtx);
    if (!state) return 0;
    let score = 0;
    const repairs = facilityPressure(state);
    const contractPressure = openContractPressure(state);

    score += scoreRepairNeed(activity, repairs);
    score += scoreInventoryNeed(activity, state);

    if (activity.id === "YF-06") score += Math.min(38, readyFieldPressure(state));
    if (contractActivityIds.has(activity.id)) score += Math.min(34, Math.round(contractPressure / 2));
    if (upgradeActivityIds.has(activity.id) && hasUpgradeCandidate(state)) {
      score += 18 + Math.min(18, Math.floor((state.day || 1) / 7));
      if (activity.id === "AC-10") score += 10;
    }

    return score;
  }

  T.actionPolicyTownNeeds = {
    version: "action-policy-town-needs-v0.1.0-local",
    facilityPressure,
    inventoryPressure,
    openContractPressure,
    readyFieldPressure,
    hasUpgradeCandidate,
    scoreTownNeeds
  };
}());
