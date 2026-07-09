(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  const { clamp, addLedgerEntry } = T.townLedgerCore;

  function updateConsignmentDisputes(state, activitySummary, settlement) {
    state.consignmentDisputes = state.consignmentDisputes || [];
    const processedQty = (state.inventory?.lots || [])
      .filter((lot) => lot.processed || lot.family === "processed")
      .reduce((sum, lot) => sum + lot.quantity, 0);
    const preserveContract = state.contracts.some((contract) => ["active", "overdue"].includes(contract.status) && contract.marketChannel === "preserve_shop");
    const festivalPressure = state.market?.current?.activeFestival?.accountingPressure || 0;
    const pressure = festivalPressure + activitySummary.complaint + (state.ledger.accountingTransparency < 55 ? 1 : 0) + (processedQty > 0 ? 1 : 0);

    if ((processedQty > 0 || preserveContract) && pressure >= 3) {
      const fee = Math.max(0, Math.round(24 + pressure * 8 - activitySummary.receiptWork * 6));
      const dispute = {
        id: `consignment-d${state.day}-${state.consignmentDisputes.length + 1}`,
        day: state.day,
        status: fee > 0 ? "open" : "noted",
        amountYsc: fee,
        detail: "寄售货架价签、加工批次和回款日期需要复核。"
      };
      state.consignmentDisputes.push(dispute);
      if (fee > 0) {
        addLedgerEntry(state, {
          day: state.day,
          type: "expense",
          account: "寄售复核",
          source: "镇中心寄售货架",
          detail: dispute.detail,
          amountYsc: fee
        });
        state.ledger.reputationAssets.cooperativeTrust = clamp(state.ledger.reputationAssets.cooperativeTrust - 2, 0, 100);
      }
      settlement.consignmentChanges.push(`寄售货架出现复核争议：${dispute.detail}${fee > 0 ? ` 先记 ${fee} YSC 复核支出。` : ""}`);
    } else if (activitySummary.consignmentWork > 0 || activitySummary.receiptWork > 0) {
      settlement.consignmentChanges.push("寄售货架今日做了价签和批次核对，暂未形成争议。");
    }
  }

  T.townConsignmentLedger = {
    version: "town-consignment-ledger-v0.0.6-local",
    updateConsignmentDisputes
  };
}());
