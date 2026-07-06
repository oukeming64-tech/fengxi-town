(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  const D = T.townLedgerData;
  const { cropCatalog, qualityMultiplier } = D;
  const marketLedger = T.townMarketLedger || {};
  const {
    clamp,
    isQualityAtLeast,
    qualityRank,
    qualityText,
    seasonalScarcity,
    reputationMultiplier,
    addLedgerEntry
  } = T.townLedgerCore;

  function contractAcceptsLot(contract, lot) {
    if (contract.status !== "active" && contract.status !== "overdue") return false;
    if (contract.cropId && contract.cropId !== lot.cropId) return false;
    if (!contract.acceptedFamilies.includes(lot.family)) return false;
    return isQualityAtLeast(lot.quality, contract.minQuality);
  }

  function unitPriceForLot(state, contract, lot) {
    const reputation = state.ledger.reputationAssets.townReputation;
    const reliability = contract.status === "overdue" ? 0.92 : 1;
    const crop = cropCatalog[lot.cropId] || {
      seasons: [state.seasonKey],
      indoorFriendly: false
    };
    const marketMultiplier = marketLedger.priceMultiplierForLot
      ? marketLedger.priceMultiplierForLot(state, contract.marketChannel, lot)
      : 1;
    return Math.max(1, Math.round(
      lot.basePriceYsc *
      qualityMultiplier[lot.quality] *
      contract.channelMultiplier *
      marketMultiplier *
      seasonalScarcity(crop, state.seasonKey) *
      reputationMultiplier(reputation) *
      reliability *
      (lot.valueModifier || 1)
    ));
  }

  function deliverFromLot(state, contract, lot, requested, settlement) {
    const quantity = Math.min(requested, lot.quantity);
    if (quantity <= 0) return 0;
    const unitPrice = unitPriceForLot(state, contract, lot);
    const gross = quantity * unitPrice;
    const advanceOffset = Math.min(contract.advanceRemainingYsc || 0, gross);
    const receivableOrCash = gross - advanceOffset;
    contract.advanceRemainingYsc = Math.max(0, (contract.advanceRemainingYsc || 0) - advanceOffset);
    lot.quantity -= quantity;
    contract.deliveredQuantity += quantity;
    contract.revenueYsc += gross;
    contract.deliveryLog.push({
      day: state.day,
      lotId: lot.id,
      quantity,
      quality: lot.quality,
      unitPriceYsc: unitPrice,
      grossYsc: gross,
      advanceOffsetYsc: advanceOffset
    });

    let settlementDetail = "";
    if (receivableOrCash > 0 && contract.paymentLagDays > 0) {
      state.ledger.accountsReceivable.push({
        id: `ar-${contract.id}-d${state.day}-${state.ledger.accountsReceivable.length + 1}`,
        day: state.day,
        dueDay: state.day + contract.paymentLagDays,
        source: contract.buyer,
        contractId: contract.id,
        amountYsc: receivableOrCash,
        detail: `${contract.label}交付应收款`
      });
      addLedgerEntry(state, {
        day: state.day,
        type: "income",
        account: "应收确认",
        source: contract.buyer,
        detail: `${contract.cropName}交付 ${quantity} 单位，${contract.paymentLagDays} 日后收款`,
        amountYsc: receivableOrCash,
        affectsCash: false
      });
      settlementDetail = `形成应收 ${receivableOrCash} YSC，第 ${state.day + contract.paymentLagDays} 日回款`;
    } else if (receivableOrCash > 0) {
      addLedgerEntry(state, {
        day: state.day,
        type: "income",
        account: "合同收入",
        source: contract.buyer,
        detail: `${contract.cropName}交付 ${quantity} 单位`,
        amountYsc: receivableOrCash
      });
      settlementDetail = `现金入账 ${receivableOrCash} YSC`;
    } else {
      settlementDetail = "本日无新增现金";
    }

    const advanceText = advanceOffset > 0 ? `，其中预付款抵扣 ${advanceOffset} YSC` : "";
    settlement.contractChanges.push(`${contract.buyer}收走 ${contract.cropName} ${quantity}/${contract.quantity} 单位，品质${qualityText(lot.quality)}，总额 ${gross} YSC${advanceText}，${settlementDetail}。`);
    return quantity;
  }

  function collectReceivables(state, settlement) {
    const remaining = [];
    state.ledger.accountsReceivable.forEach((item) => {
      if (item.dueDay <= state.day) {
        addLedgerEntry(state, {
          day: state.day,
          type: "income",
          account: "应收回款",
          source: item.source,
          detail: item.detail,
          amountYsc: item.amountYsc
        });
        settlement.contractChanges.push(`${item.source}回款 ${item.amountYsc} YSC。`);
      } else {
        remaining.push(item);
      }
    });
    state.ledger.accountsReceivable = remaining;
  }

  function updateContracts(state, settlement) {
    collectReceivables(state, settlement);
    state.contracts.forEach((contract) => {
      if (!["active", "overdue"].includes(contract.status)) return;
      let needed = contract.quantity - contract.deliveredQuantity;
      const lots = state.inventory.lots
        .filter((lot) => contractAcceptsLot(contract, lot))
        .sort((a, b) => qualityRank(a.quality) - qualityRank(b.quality) || b.ageDays - a.ageDays);

      lots.forEach((lot) => {
        if (needed <= 0) return;
        const delivered = deliverFromLot(state, contract, lot, needed, settlement);
        needed -= delivered;
      });

      if (contract.deliveredQuantity >= contract.quantity) {
        contract.status = state.day <= contract.dueDay ? "fulfilled" : "late_fulfilled";
        contract.fulfilledDay = state.day;
        state.ledger.reputationAssets.townReputation = clamp(
          state.ledger.reputationAssets.townReputation + contract.reputationOnFulfill,
          0,
          100
        );
        settlement.contractChanges.push(`${contract.label}完成，声望 ${contract.reputationOnFulfill >= 0 ? "+" : ""}${contract.reputationOnFulfill}。`);
      } else if (state.day > contract.dueDay) {
        contract.status = "overdue";
        if (!contract.penaltyApplied) {
          contract.penaltyApplied = true;
          addLedgerEntry(state, {
            day: state.day,
            type: "expense",
            account: "违约支出",
            source: contract.buyer,
            detail: `${contract.label}逾期违约惩罚`,
            amountYsc: contract.penaltyYsc
          });
          state.ledger.reputationAssets.townReputation = clamp(
            state.ledger.reputationAssets.townReputation + contract.reputationOnDefault,
            0,
            100
          );
          settlement.contractChanges.push(`${contract.label}逾期，扣除 ${contract.penaltyYsc} YSC。`);
        }
      } else if (contract.dueDay - state.day <= 1) {
        settlement.contractChanges.push(`${contract.label}将在 ${contract.dueDay - state.day} 日内到期，还差 ${needed} 单位。`);
      }
    });
    state.inventory.lots = state.inventory.lots.filter((lot) => lot.quantity > 0);
    if (!settlement.contractChanges.length) settlement.contractChanges.push("合同今日无交割，仍按到期日推进。");
  }

  T.townContractDeliveryLedger = {
    version: "town-contract-delivery-ledger-v0.0.6-local",
    contractAcceptsLot,
    unitPriceForLot,
    deliverFromLot,
    collectReceivables,
    updateContracts
  };
}());
