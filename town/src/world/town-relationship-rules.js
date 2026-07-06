(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  const version = "town-relationship-rules-v0.0.1-local";
  const maxPairMemories = 8;
  const maxRecentInteractions = 36;
  const defaultTrust = 42;

  const typeLabels = {
    help: "帮忙",
    gift: "送礼",
    alliance: "结盟",
    exclusion: "排挤",
    mediation: "梳理/调停"
  };

  const typeEffects = {
    help: { familiarity: 6, trust: 5, friction: -1, exclusion: -1, favorDebt: 2 },
    gift: { familiarity: 5, trust: 3, friction: -1, exclusion: -1, favorDebt: 1 },
    alliance: { familiarity: 4, trust: 4, friction: 0, exclusion: -1, favorDebt: 0 },
    exclusion: { familiarity: 2, trust: -5, friction: 6, exclusion: 7, favorDebt: 0 },
    mediation: { familiarity: 3, trust: 3, friction: -5, exclusion: -4, favorDebt: 0 }
  };

  function clamp(value, min, max) {
    if (T.clamp) return T.clamp(value, min, max);
    return Math.max(min, Math.min(max, value));
  }

  function stableHash(value) {
    const text = String(value || "");
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }

  function pairKey(aId, bId) {
    return [aId, bId].sort().join(":");
  }

  function emptyFavorDebt(ids) {
    const debt = {};
    ids.forEach((id) => {
      debt[id] = 0;
    });
    return debt;
  }

  function ensurePair(ledger, aId, bId) {
    const ids = [aId, bId].sort();
    const key = ids.join(":");
    if (!ledger.pairs[key]) {
      ledger.pairs[key] = {
        pairId: key,
        residentIds: ids,
        residentLabels: {},
        familiarity: 0,
        trust: defaultTrust,
        friction: 0,
        favorDebt: emptyFavorDebt(ids),
        exclusion: 0,
        lastInteraction: null,
        allianceTags: [],
        recentMemories: []
      };
    }
    const pair = ledger.pairs[key];
    pair.residentLabels = pair.residentLabels || {};
    pair.favorDebt = pair.favorDebt || emptyFavorDebt(ids);
    pair.allianceTags = Array.isArray(pair.allianceTags) ? pair.allianceTags : [];
    pair.recentMemories = Array.isArray(pair.recentMemories) ? pair.recentMemories : [];
    ids.forEach((id) => {
      if (typeof pair.favorDebt[id] !== "number") pair.favorDebt[id] = 0;
    });
    return pair;
  }

  function residentName(resident, fallbackId) {
    return resident?.name || resident?.displayName || fallbackId;
  }

  function cleanPlace(value, fallback = "小路") {
    return String(value || fallback).split(" · ")[0] || fallback;
  }

  T.townRelationshipRules = {
    version,
    maxPairMemories,
    maxRecentInteractions,
    defaultTrust,
    typeLabels,
    typeEffects,
    clamp,
    stableHash,
    pairKey,
    emptyFavorDebt,
    ensurePair,
    residentName,
    cleanPlace
  };
}());
