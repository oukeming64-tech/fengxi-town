(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  const { clamp, addLedgerEntry } = T.townLedgerCore;

  const version = "town-debt-ledger-v0.0.8-local-weekly";

  function ensureDebtLedger(state) {
    state.ledger = state.ledger || {};
    const existing = state.ledger.debt || {};
    const borrowedDay = Number(existing.borrowedDay || 1);
    const principal = Number(existing.principalYsc ?? state.ledger.debtYsc ?? 15000);
    state.ledger.debt = {
      borrowedDay,
      interestStartDay: Number(existing.interestStartDay || borrowedDay + 30),
      principalYsc: Math.max(0, Math.round(principal)),
      baseInterestRate: Number(existing.baseInterestRate || 0.04),
      currentInterestRate: Number(existing.currentInterestRate || existing.baseInterestRate || 0.04),
      overdueWeeks: Number(existing.overdueWeeks || 0),
      scheduledPaymentYsc: Number(existing.scheduledPaymentYsc || 0),
      paidThisWeekYsc: Number(existing.paidThisWeekYsc || 0),
      interestAccruedYsc: Number(existing.interestAccruedYsc || 0),
      totalPaidYsc: Number(existing.totalPaidYsc || 0),
      debtPressure: existing.debtPressure || "未起息",
      goldkinLeverage: Number(existing.goldkinLeverage || state.ledger.reputationAssets?.goldkinDependency || 20),
      history: Array.isArray(existing.history) ? existing.history : []
    };
    state.ledger.debtYsc = state.ledger.debt.principalYsc;
    return state.ledger.debt;
  }

  function debtPressureFor(debt, unpaid, endDay) {
    if (endDay < debt.interestStartDay) return "未起息";
    if (unpaid > 0 && debt.overdueWeeks >= 3) return "高压逾期";
    if (unpaid > 0) return "逾期";
    if (debt.principalYsc > 12000) return "紧张";
    if (debt.principalYsc > 0) return "可承受";
    return "已结清";
  }

  function settleWeeklyDebt(state, options = {}) {
    if (!state?.ledger) return null;
    const debt = ensureDebtLedger(state);
    const startDay = Number(options.startDay || Math.max(1, (options.endDay || state.day || 1) - 6));
    const endDay = Number(options.endDay || state.day || 1);
    const weekNumber = Number(options.weekNumber || Math.ceil(endDay / 7));

    if (endDay < debt.interestStartDay || debt.principalYsc <= 0) {
      const dormant = {
        weekNumber,
        startDay,
        endDay,
        status: debt.principalYsc <= 0 ? "closed" : "not_due",
        interestEligible: false,
        interestStartDay: debt.interestStartDay,
        baseInterestRate: debt.baseInterestRate,
        currentInterestRate: debt.currentInterestRate,
        scheduledPaymentYsc: 0,
        paidThisWeekYsc: 0,
        interestAccruedYsc: 0,
        unpaidYsc: 0,
        remainingDebtYsc: debt.principalYsc,
        overdueWeeks: debt.overdueWeeks,
        debtPressure: debt.debtPressure,
        goldkinLeverage: debt.goldkinLeverage,
        note: debt.principalYsc <= 0
          ? "债务已经结清。"
          : `借债后的第 30 天尚未届满，第 ${debt.interestStartDay} 天起才开始计息。`
      };
      debt.scheduledPaymentYsc = 0;
      debt.paidThisWeekYsc = 0;
      debt.interestAccruedYsc = 0;
      debt.history.push(dormant);
      return dormant;
    }

    const rate = Math.min(0.1, debt.baseInterestRate + debt.overdueWeeks * 0.01);
    const interest = Math.max(0, Math.round(debt.principalYsc * rate));
    const scheduledPrincipal = Math.min(debt.principalYsc, Math.max(300, Math.round(debt.principalYsc * 0.02)));
    const scheduled = interest + scheduledPrincipal;
    const reserve = 1200;
    const availableForDebt = Math.max(0, Math.round((state.ledger.cashYsc || 0) - reserve));
    const paid = Math.min(scheduled, availableForDebt);
    const unpaid = scheduled - paid;
    const paidInterest = Math.min(paid, interest);
    const paidPrincipal = Math.max(0, paid - paidInterest);
    const unpaidInterest = Math.max(0, interest - paidInterest);

    if (paid > 0) {
      addLedgerEntry(state, {
        day: endDay,
        type: "expense",
        account: "债务偿还",
        source: "高金采购站",
        detail: `第 ${weekNumber} 周债务偿还，含利息 ${paidInterest} YSC，本金 ${paidPrincipal} YSC`,
        amountYsc: paid
      });
    }

    debt.principalYsc = Math.max(0, debt.principalYsc + unpaidInterest - paidPrincipal);
    debt.overdueWeeks = unpaid > 0 ? debt.overdueWeeks + 1 : 0;
    debt.currentInterestRate = Math.min(0.1, debt.baseInterestRate + debt.overdueWeeks * 0.01);
    debt.scheduledPaymentYsc = scheduled;
    debt.paidThisWeekYsc = paid;
    debt.interestAccruedYsc = interest;
    debt.totalPaidYsc += paid;
    debt.debtPressure = debtPressureFor(debt, unpaid, endDay);
    debt.goldkinLeverage = clamp(Math.round(20 + debt.principalYsc / 700 + debt.overdueWeeks * 8), 0, 100);
    state.ledger.debtYsc = debt.principalYsc;
    state.ledger.reputationAssets.goldkinDependency = clamp(
      Math.max(state.ledger.reputationAssets.goldkinDependency || 0, debt.goldkinLeverage),
      0,
      100
    );

    const record = {
      weekNumber,
      startDay,
      endDay,
      status: unpaid > 0 ? "overdue" : "paid",
      interestEligible: true,
      interestStartDay: debt.interestStartDay,
      baseInterestRate: debt.baseInterestRate,
      currentInterestRate: rate,
      nextInterestRate: debt.currentInterestRate,
      scheduledPaymentYsc: scheduled,
      paidThisWeekYsc: paid,
      interestAccruedYsc: interest,
      paidInterestYsc: paidInterest,
      paidPrincipalYsc: paidPrincipal,
      unpaidYsc: unpaid,
      remainingDebtYsc: debt.principalYsc,
      overdueWeeks: debt.overdueWeeks,
      debtPressure: debt.debtPressure,
      goldkinLeverage: debt.goldkinLeverage,
      note: unpaid > 0
        ? `本周债务应还 ${scheduled} YSC，只还 ${paid} YSC，未还部分进入逾期。`
        : `本周债务应还 ${scheduled} YSC，已按本地账本完成。`
    };
    debt.history.push(record);
    return record;
  }

  T.townDebtLedger = {
    version,
    ensureDebtLedger,
    settleWeeklyDebt,
    debtPressureFor
  };
}());
