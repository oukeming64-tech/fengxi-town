(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  const facilityAnchors = {
    greenhouse: { hotspotId: "greenhouse-door", activityIds: ["YF-07", "YF-10", "YF-13", "YF-14"] },
    barn: { hotspotId: "barn-table", activityIds: ["YF-08", "YF-11", "YF-16"], offsetX: -1.8 },
    processingTable: { hotspotId: "barn-table", activityIds: ["YF-09", "CH-04"], offsetX: 2.2, offsetY: 2 },
    deliveryVan: { hotspotId: "old-truck", activityIds: ["SR-01", "SR-03", "SR-04", "SR-06", "SR-07", "SR-08", "SR-09", "SR-10"] },
    accountingDesk: { hotspotId: "accounting-desk", activityPrefixes: ["AC-"] },
    marketStall: { hotspotId: "consignment-rack", activityIds: ["CH-08", "GG-05", "GG-06", "SR-05"] }
  };

  function isActive(anchor, events) {
    return events.some((event) => {
      const activityId = String(event.activityId || "");
      if ((anchor.activityIds || []).includes(activityId)) return true;
      if ((anchor.activityPrefixes || []).some((prefix) => activityId.startsWith(prefix))) return true;
      return event.hotspotId === anchor.hotspotId && !(anchor.activityIds || anchor.activityPrefixes);
    });
  }

  function statusFor(facility, anchor, context) {
    const condition = Number(facility.condition || 0);
    const effectiveLevel = Number(facility.effectiveLevel ?? facility.level ?? 0);
    const day = Number(context.day || 0);
    const upgradedToday = day > 0 && Number(facility.upgradedDay || 0) === day;
    if (effectiveLevel <= 0) {
      return { key: "stopped", label: "停工", detail: `状态 ${condition}/100 · 等待维护` };
    }
    if (upgradedToday) {
      return { key: "upgrading", label: "升级中", detail: `Lv.${facility.level}/${facility.maxLevel} · 当日升级` };
    }
    if (condition < 58) {
      return { key: "damaged", label: "受损", detail: `状态 ${condition}/100 · 效率受限` };
    }
    const activeCount = context.events.filter((event) => {
      return isActive(anchor, [event]);
    }).length;
    if (activeCount) {
      return { key: "busy", label: "忙碌", detail: `${activeCount} 位居民正在使用` };
    }
    return null;
  }

  function feedbackFor(snapshot, options = {}) {
    const facilities = snapshot?.facilities?.facilities || [];
    const events = options.activeStage?.events || [];
    const day = Number(options.day || snapshot?.day || 0);
    return facilities.map((facility) => {
      const anchor = facilityAnchors[facility.id];
      const hotspot = anchor ? T.townStage?.byId?.get(anchor.hotspotId) : null;
      if (!anchor || !hotspot) return null;
      const status = statusFor(facility, anchor, { day, events });
      if (!status) return null;
      return {
        facilityId: facility.id,
        facilityName: facility.name,
        hotspotId: anchor.hotspotId,
        x: T.clamp(hotspot.x + Number(anchor.offsetX || 0), 2, 98),
        y: T.clamp(hotspot.y + Number(anchor.offsetY || 0), 2, 98),
        source: "local-facility-ledger",
        ...status
      };
    }).filter(Boolean);
  }

  T.townStageFacilityFeedback = {
    version: "town-stage-facility-feedback-v0.1.6-local",
    facilityAnchors,
    feedbackFor
  };
}());
