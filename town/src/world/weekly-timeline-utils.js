(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  const version = "weekly-timeline-utils-v0.0.8-local";

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value || null));
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.keys(value).forEach((key) => deepFreeze(value[key]));
    return value;
  }

  function number(value) {
    return Math.round(Number(value || 0));
  }

  function ledgerSummary(snapshot) {
    const ledger = snapshot?.ledger || {};
    const debt = ledger.debt || {};
    return {
      cashYsc: number(ledger.cashYsc),
      receivableYsc: number(ledger.receivableYsc),
      payableYsc: number(ledger.payableYsc),
      debtYsc: number(ledger.debtYsc),
      debtPrincipalYsc: number(debt.principalYsc ?? ledger.debtYsc),
      overdueWeeks: number(debt.overdueWeeks),
      currentInterestRate: Number(debt.currentInterestRate || debt.baseInterestRate || 0),
      nextInterestDay: number(debt.interestStartDay),
      accountingTransparency: number(ledger.accountingTransparency),
      goldkinDependency: number(ledger.goldkinDependency),
      cooperativeTrust: number(ledger.cooperativeTrust),
      townReputation: number(ledger.townReputation)
    };
  }

  function ledgerDelta(start, end) {
    const left = start?.ledger || {};
    const right = end?.ledger || {};
    return {
      cashYsc: number(right.cashYsc) - number(left.cashYsc),
      receivableYsc: number(right.receivableYsc) - number(left.receivableYsc),
      payableYsc: number(right.payableYsc) - number(left.payableYsc),
      debtYsc: number(right.debtYsc) - number(left.debtYsc),
      accountingTransparency: number(right.accountingTransparency) - number(left.accountingTransparency),
      goldkinDependency: number(right.goldkinDependency) - number(left.goldkinDependency),
      cooperativeTrust: number(right.cooperativeTrust) - number(left.cooperativeTrust),
      townReputation: number(right.townReputation) - number(left.townReputation)
    };
  }

  function signed(value) {
    const rounded = number(value);
    return `${rounded >= 0 ? "+" : ""}${rounded}`;
  }

  function pressureFromRisks(risks) {
    const scores = risks?.scores || {};
    return Object.keys(scores)
      .map((key) => ({ key, value: number(scores[key]) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
  }

  function pressureLabel(key) {
    return {
      agriculture: "田地",
      inventory: "库存",
      contracts: "合同",
      finance: "账本",
      labor: "劳动",
      accounting: "账务"
    }[key] || key;
  }

  T.weeklyTimelineUtils = {
    version,
    deepClone,
    deepFreeze,
    number,
    ledgerSummary,
    ledgerDelta,
    signed,
    pressureFromRisks,
    pressureLabel
  };
}());
