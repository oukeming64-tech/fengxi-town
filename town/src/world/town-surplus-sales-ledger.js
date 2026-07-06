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

  const version = "town-surplus-sales-ledger-v0.1.0-local";

  function contractAcceptsLot(contract, lot) {
    if (!["active", "overdue"].includes(contract.status)) return false;
    if (contract.cropId && contract.cropId !== lot.cropId) return false;
    if (!(contract.acceptedFamilies || []).includes(lot.family)) return false;
    return isQualityAtLeast(lot.quality, contract.minQuality);
  }

  function inventoryPressure(state) {
    const lots = state.inventory?.lots || [];
    return lots.reduce((total, lot) => {
      if (lot.quantity <= 0) return total;
      const daysLeft = Number(lot.shelfLifeDays || 0) - Number(lot.ageDays || 0);
      total.quantity += lot.quantity;
      if (daysLeft <= 2 || lot.condition === "discounted" || lot.condition === "aged") {
        total.urgentQuantity += lot.quantity;
      }
      return total;
    }, {
      quantity: 0,
      urgentQuantity: 0,
      capacity: Number(state.inventory?.capacity || 120)
    });
  }

  function reserveContractInventory(state) {
    const reserved = new Map();
    const lots = state.inventory?.lots || [];
    (state.contracts || [])
      .filter((contract) => ["active", "overdue"].includes(contract.status))
      .sort((a, b) => a.dueDay - b.dueDay)
      .forEach((contract) => {
        let needed = Math.max(0, contract.quantity - contract.deliveredQuantity);
        const candidates = lots
          .filter((lot) => lot.quantity > 0 && contractAcceptsLot(contract, lot))
          .sort((a, b) => qualityRank(a.quality) - qualityRank(b.quality) || b.ageDays - a.ageDays);

        candidates.forEach((lot) => {
          if (needed <= 0) return;
          const alreadyReserved = reserved.get(lot.id) || 0;
          const available = Math.max(0, lot.quantity - alreadyReserved);
          const next = Math.min(available, needed);
          if (next <= 0) return;
          reserved.set(lot.id, alreadyReserved + next);
          needed -= next;
        });
      });
    return reserved;
  }

  function chooseSaleChannel(state, lot) {
    const festival = state.market?.current?.activeFestival;
    if (festival?.demandFamilies?.includes(lot.family)) return "festival_stall";
    if (lot.processed || lot.storageType === "processed") return "preserve_shop";
    const daysLeft = Number(lot.shelfLifeDays || 0) - Number(lot.ageDays || 0);
    if (daysLeft <= 2 && ["leaf", "fruit", "mushroom"].includes(lot.storageType)) return "school_board";
    if (lot.condition === "discounted") return "goldkin_station";
    return "cooperative_pantry";
  }

  function publicChannelLabel(channelId) {
    return {
      festival_stall: "枫溪临时摊",
      preserve_shop: "枫溪货架",
      school_board: "午餐账本",
      cooperative_pantry: "合作社货架",
      goldkin_station: "高金采购",
      city_cold_chain: "外部冷链"
    }[channelId] || "公开货架";
  }

  function freshnessMultiplier(lot) {
    const daysLeft = Number(lot.shelfLifeDays || 0) - Number(lot.ageDays || 0);
    if (lot.condition === "discounted") return 0.76;
    if (lot.condition === "aged") return 0.82;
    if (daysLeft <= 0) return 0.7;
    if (daysLeft <= 1) return 0.84;
    if (daysLeft <= 2) return 0.92;
    return 1;
  }

  function channelSaleMultiplier(channelId) {
    if (channelId === "festival_stall") return 1.04;
    if (channelId === "preserve_shop") return 1.02;
    if (channelId === "goldkin_station") return 0.9;
    if (channelId === "school_board") return 0.96;
    return 0.98;
  }

  function unitSalePrice(state, channelId, lot) {
    const crop = cropCatalog[lot.cropId] || { seasons: [state.seasonKey], indoorFriendly: false };
    const marketMultiplier = marketLedger.priceMultiplierForLot
      ? marketLedger.priceMultiplierForLot(state, channelId, lot)
      : 1;
    return Math.max(1, Math.round(
      Number(lot.basePriceYsc || 1) *
      (qualityMultiplier[lot.quality] || 1) *
      marketMultiplier *
      seasonalScarcity(crop, state.seasonKey) *
      reputationMultiplier(state.ledger?.reputationAssets?.townReputation || 50) *
      Number(lot.valueModifier || 1) *
      freshnessMultiplier(lot) *
      channelSaleMultiplier(channelId)
    ));
  }

  function saleUrgency(lot) {
    const daysLeft = Number(lot.shelfLifeDays || 0) - Number(lot.ageDays || 0);
    let score = 0;
    if (daysLeft <= 0) score += 90;
    else if (daysLeft <= 1) score += 70;
    else if (daysLeft <= 2) score += 45;
    if (lot.condition === "discounted" || lot.condition === "aged") score += 30;
    if (lot.processed || lot.storageType === "processed") score += 12;
    return score + Math.min(20, lot.quantity);
  }

  function saleCapacity(state, activitySummary) {
    const pressure = inventoryPressure(state);
    const actionTokens = (
      Number(activitySummary.consignmentWork || 0) +
      Math.floor(Number(activitySummary.logistics || 0) / 2) +
      Math.floor(Number(activitySummary.contractWork || 0) / 4)
    );
    let pressureTokens = 0;
    if (pressure.urgentQuantity > 0) pressureTokens += 2;
    if (pressure.quantity > pressure.capacity * 0.55) pressureTokens += 1;
    if (pressure.quantity > pressure.capacity * 0.8) pressureTokens += 2;

    const tokens = Math.max(actionTokens, pressureTokens);
    if (tokens <= 0) return 0;
    const marketStall = state.facilities?.marketStall?.level || 1;
    return clamp(2 + tokens * 2 + Math.max(0, marketStall - 1) * 2, 0, 20);
  }

  function sellFromLot(state, lot, quantity, settlement) {
    const channelId = chooseSaleChannel(state, lot);
    const unitPrice = unitSalePrice(state, channelId, lot);
    const revenue = unitPrice * quantity;
    const channelLabel = publicChannelLabel(channelId);
    lot.quantity -= quantity;

    addLedgerEntry(state, {
      day: state.day,
      type: "income",
      account: "余货售卖",
      source: channelLabel,
      detail: `${lot.cropName}售出 ${quantity} 单位`,
      amountYsc: revenue
    });

    const record = {
      day: state.day,
      lotId: lot.id,
      cropName: lot.cropName,
      quality: lot.quality,
      channelId,
      channelLabel,
      quantity,
      unitPriceYsc: unitPrice,
      revenueYsc: revenue
    };
    settlement.surplusSales = settlement.surplusSales || [];
    settlement.surplusSales.push(record);
    settlement.inventoryChanges.push(`${channelLabel}售出 ${lot.cropName} ${quantity} 单位，品质${qualityText(lot.quality)}，收入 ${revenue} YSC。`);
    return record;
  }

  function sellSurplusInventory(state, activitySummary, settlement) {
    const capacity = saleCapacity(state, activitySummary);
    if (capacity <= 0) return [];

    const reserved = reserveContractInventory(state);
    let remaining = capacity;
    const sold = [];
    const candidates = (state.inventory?.lots || [])
      .filter((lot) => lot.quantity > (reserved.get(lot.id) || 0))
      .sort((a, b) => saleUrgency(b) - saleUrgency(a) || b.ageDays - a.ageDays);

    candidates.forEach((lot) => {
      if (remaining <= 0) return;
      const available = Math.max(0, lot.quantity - (reserved.get(lot.id) || 0));
      const quantity = Math.min(available, remaining, lot.processed ? 4 : 6);
      if (quantity <= 0) return;
      sold.push(sellFromLot(state, lot, quantity, settlement));
      remaining -= quantity;
    });

    if (sold.length) {
      const revenue = sold.reduce((sum, item) => sum + item.revenueYsc, 0);
      const quantity = sold.reduce((sum, item) => sum + item.quantity, 0);
      settlement.cashNotes.push(`余货售卖 ${quantity} 单位，入账 ${revenue} YSC。`);
      settlement.marketChanges.push(`枫溪镇今天处理余货 ${quantity} 单位，回收现金 ${revenue} YSC。`);
      state.market = state.market || {};
      state.market.surplusSalesHistory = [...(state.market.surplusSalesHistory || []), ...sold].slice(-30);
    }

    state.inventory.lots = (state.inventory?.lots || []).filter((lot) => lot.quantity > 0);
    return sold;
  }

  T.townSurplusSalesLedger = {
    version,
    contractAcceptsLot,
    inventoryPressure,
    reserveContractInventory,
    saleCapacity,
    sellSurplusInventory
  };
}());
