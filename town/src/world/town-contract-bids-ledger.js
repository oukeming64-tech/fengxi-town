(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  const D = T.townLedgerData;
  const { cropCatalog, contractTemplates, contractCropChoices, marketChannels } = D;
  const marketLedger = T.townMarketLedger || {};
  const { addLedgerEntry } = T.townLedgerCore;

  function makeBidContract(state, bid) {
    return {
      id: `contract-${bid.id}`,
      templateId: bid.templateId,
      label: bid.label,
      buyer: bid.buyer,
      channel: bid.channel,
      marketChannel: bid.marketChannel,
      cropId: bid.cropId,
      cropName: bid.cropName,
      family: bid.family,
      minQuality: bid.minQuality,
      quantity: bid.quantity,
      deliveredQuantity: 0,
      dueDay: bid.dueDay,
      unitBasePriceYsc: bid.unitBasePriceYsc,
      channelMultiplier: bid.channelMultiplier,
      advanceYsc: bid.advanceYsc,
      advanceRemainingYsc: bid.advanceYsc,
      penaltyYsc: bid.penaltyYsc,
      paymentLagDays: bid.paymentLagDays,
      reputationOnFulfill: bid.reputationOnFulfill,
      reputationOnDefault: bid.reputationOnDefault,
      acceptedFamilies: [...bid.acceptedFamilies],
      riskNote: bid.riskNote,
      status: "active",
      dynamic: true,
      bidId: bid.id,
      acceptedDay: state.day,
      penaltyApplied: false,
      fulfilledDay: null,
      revenueYsc: 0,
      deliveryLog: []
    };
  }

  function makeDynamicBid(state, templateId, seed) {
    const template = contractTemplates[templateId];
    const cropId = contractCropChoices[state.seasonKey]?.[templateId] || "";
    const crop = cropId ? (cropCatalog[cropId] || cropCatalog.maple_radish) : null;
    const channel = marketChannels[template.marketChannel] || marketChannels.goldkin_station;
    const festival = state.market?.current?.activeFestival || null;
    const weatherLag = state.market?.current?.notes?.some((note) => /运输|冷链|封路/.test(note)) ? 1 : 0;
    const festivalPressure = festival?.demandFamilies?.some((family) => template.acceptedFamilies.includes(family)) ? 1 : 0;
    const quantity = Math.max(3, template.quantity + ((state.day + seed) % 3) - 1 + festivalPressure);
    const premium = 1 + festivalPressure * 0.08 + ((state.day + seed) % 4) * 0.015;
    return {
      id: `bid-d${state.day}-${templateId}-${seed}`,
      day: state.day,
      expiresDay: state.day + 2,
      templateId,
      label: `${template.label}临时招标`,
      buyer: template.buyer,
      channel: template.channel,
      marketChannel: channel.id,
      cropId: crop?.id || "",
      cropName: template.cropName || crop?.name || "加工品",
      family: crop?.family || "processed",
      minQuality: template.minQuality,
      quantity,
      dueDay: state.day + Math.max(3, template.dueInDays + weatherLag - festivalPressure),
      unitBasePriceYsc: Math.round((crop?.basePriceYsc || 28) * premium),
      channelMultiplier: template.channelMultiplier,
      advanceYsc: Math.round((template.advanceYsc || 0) * (festivalPressure ? 1.15 : 1)),
      penaltyYsc: Math.round(template.penaltyYsc * (festivalPressure ? 1.1 : 0.9)),
      paymentLagDays: template.paymentLagDays,
      reputationOnFulfill: template.reputationOnFulfill,
      reputationOnDefault: template.reputationOnDefault,
      acceptedFamilies: [...template.acceptedFamilies],
      riskNote: template.riskNote,
      status: "open"
    };
  }

  function bidScore(state, bid, activitySummary) {
    const trust = state.ledger.reputationAssets.cooperativeTrust || 0;
    const cash = state.ledger.cashYsc || 0;
    const openContracts = state.contracts.filter((contract) => ["active", "overdue"].includes(contract.status)).length;
    let score = bid.unitBasePriceYsc + (bid.advanceYsc || 0) / 12 + activitySummary.contractBidWork * 8 + trust / 8;
    if (bid.marketChannel === "goldkin_station" && (state.ledger.reputationAssets.goldkinDependency || 0) > 55) score -= 18;
    if (bid.marketChannel === "preserve_shop" && (state.ledger.accountingTransparency || 0) < 55) score -= 12;
    if (cash < 1200 && bid.advanceYsc > 0) score += 12;
    score -= openContracts * 5;
    return score;
  }

  function lastDynamicContractDay(state) {
    return Math.max(0, ...state.contracts
      .filter((contract) => contract.dynamic)
      .map((contract) => Number(contract.acceptedDay || contract.day || 0)));
  }

  function updateContractBids(state, weather, activitySummary, settlement) {
    state.contractBids = (state.contractBids || []).filter((bid) => bid.status === "open" && bid.expiresDay >= state.day);
    const openIds = new Set(state.contractBids.map((bid) => bid.templateId));
    const activeTemplates = new Set(state.contracts.filter((contract) => ["active", "overdue"].includes(contract.status)).map((contract) => contract.templateId));
    const daySeed = marketLedger.seasonalDay ? marketLedger.seasonalDay(state) : state.day;
    const templateIds = Object.keys(contractTemplates)
      .filter((id) => !openIds.has(id))
      .sort((a, b) => ((a.charCodeAt(0) + daySeed) % 7) - ((b.charCodeAt(0) + daySeed) % 7));

    if (state.contractBids.length < 2 && (daySeed % 3 === 0 || activitySummary.contractBidWork > 0 || state.market?.current?.activeFestival)) {
      templateIds.slice(0, 2 - state.contractBids.length).forEach((templateId, index) => {
        const bid = makeDynamicBid(state, templateId, index + state.contractBids.length + 1);
        state.contractBids.push(bid);
        settlement.bidChanges.push(`${bid.buyer}发出${bid.cropName}临时招标，${bid.quantity} 单位，第 ${bid.dueDay} 日前交付。`);
      });
    }

    const openContracts = state.contracts.filter((contract) => ["active", "overdue"].includes(contract.status)).length;
    if (activitySummary.contractBidWork <= 0 && openContracts >= 6) return;
    const acceptable = state.contractBids
      .filter((bid) => bid.status === "open" && !activeTemplates.has(bid.templateId))
      .sort((a, b) => bidScore(state, b, activitySummary) - bidScore(state, a, activitySummary));
    const selected = acceptable[0];
    if (!selected) return;
    const lastDynamicDay = lastDynamicContractDay(state);
    if (lastDynamicDay && state.day - lastDynamicDay < 5) return;
    if (openContracts >= 3 && !state.market?.current?.activeFestival) return;
    if (activitySummary.contractBidWork <= 0 && openContracts >= 4 && !state.market?.current?.activeFestival) return;

    selected.status = "accepted";
    const contract = makeBidContract(state, selected);
    state.contracts.push(contract);
    if (contract.advanceYsc > 0) {
      addLedgerEntry(state, {
        day: state.day,
        type: "income",
        account: "招标预付款",
        source: contract.buyer,
        detail: `${contract.label}预付款`,
        amountYsc: contract.advanceYsc
      });
    }
    settlement.bidChanges.push(`${contract.label}被接下，交付 ${contract.quantity} 单位${contract.cropName}，到期日第 ${contract.dueDay} 日。`);
  }

  T.townContractBidsLedger = {
    version: "town-contract-bids-ledger-v0.0.6-local",
    makeBidContract,
    makeDynamicBid,
    bidScore,
    lastDynamicContractDay,
    updateContractBids
  };
}());
