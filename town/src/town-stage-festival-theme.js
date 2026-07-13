(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  const SOURCE = "local-festival-calendar";
  const COORDINATE_CONTRACT = "town-map-percent-3x2-v0.1.9-a";
  const phaseLabels = Object.freeze({
    none: "平日",
    preparing: "筹备",
    active: "进行中",
    cleanup: "收尾"
  });
  const allowedPhases = new Set(["preparing", "active", "cleanup"]);
  const packageRegistry = new Map();

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }

  function stableList(values) {
    return [...new Set((values || []).map(String).filter(Boolean))];
  }

  function sameList(left, right) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }

  function knownFestivalIds() {
    const calendar = T.townLedgerData?.festivalCalendar || {};
    return new Set(Object.values(calendar).flat().map((festival) => festival.id));
  }

  const hotspotIds = stableList(T.townStageData?.mapHotspots?.map((hotspot) => hotspot.id));
  const zoneIds = stableList(T.worldConfig?.zones?.map((zone) => zone.id));
  const defaultMapPackage = deepFreeze({
    id: "default",
    festivalId: null,
    label: "枫溪镇常规地图",
    mapAsset: T.assets?.townMap || "./assets/concept/map.png",
    mapAlt: "枫溪镇 2D 小镇地图",
    aspectRatio: "3:2",
    coordinateContract: COORDINATE_CONTRACT,
    hotspotIds,
    routeVersion: T.townStageRoutes?.version || "",
    activeZoneIds: [],
    phases: [],
    source: "default-town-map",
    immutableState: true
  });

  function normalizeMapPackage(input = {}) {
    const festivalId = String(input.festivalId || "");
    if (!knownFestivalIds().has(festivalId)) throw new Error(`unknown festival map package: ${festivalId || "missing festivalId"}`);
    if (String(input.coordinateContract || "") !== COORDINATE_CONTRACT) throw new Error("festival map coordinate contract must match the default map");
    if (String(input.aspectRatio || "") !== defaultMapPackage.aspectRatio) throw new Error("festival map aspect ratio must remain 3:2");
    if (String(input.routeVersion || "") !== defaultMapPackage.routeVersion) throw new Error("festival map route contract must match the current reviewed routes");

    const packageHotspotIds = stableList(input.hotspotIds);
    if (!sameList(packageHotspotIds, defaultMapPackage.hotspotIds)) throw new Error("festival map hotspot ids and order must match the default map");

    const activeZoneIds = stableList(input.activeZoneIds);
    if (activeZoneIds.some((zoneId) => !zoneIds.includes(zoneId))) throw new Error("festival map contains an unknown active zone");

    const phases = stableList(input.phases?.length ? input.phases : ["active"]);
    if (phases.some((phase) => !allowedPhases.has(phase))) throw new Error("festival map contains an unsupported phase");

    const mapAsset = String(input.mapAsset || "");
    const assetPrefix = `./assets/runtime/festivals/${festivalId}/`;
    if (!mapAsset.startsWith(assetPrefix)) throw new Error(`festival map asset must live under ${assetPrefix}`);

    return deepFreeze({
      id: String(input.id || festivalId),
      festivalId,
      label: String(input.label || festivalId),
      mapAsset,
      mapAlt: String(input.mapAlt || `${input.label || festivalId}节日地图`),
      aspectRatio: defaultMapPackage.aspectRatio,
      coordinateContract: COORDINATE_CONTRACT,
      hotspotIds: packageHotspotIds,
      routeVersion: defaultMapPackage.routeVersion,
      activeZoneIds,
      phases,
      source: SOURCE,
      immutableState: true
    });
  }

  function registerMapPackage(input) {
    const mapPackage = normalizeMapPackage(input);
    packageRegistry.set(mapPackage.festivalId, mapPackage);
    return mapPackage;
  }

  function seasonalDay(state) {
    const sourceState = state?.townState || state || {};
    return ((Number(sourceState.day || state?.day || 1) - 1) % 30) + 1;
  }

  function festivalPhaseForState(state) {
    const sourceState = state?.townState || state || {};
    const seasonKey = String(sourceState.seasonKey || "spring");
    const day = seasonalDay(state);
    const festivals = T.townLedgerData?.festivalCalendar?.[seasonKey] || [];
    const matches = [
      ["active", (festival) => day >= festival.startDay && day <= festival.endDay],
      ["preparing", (festival) => day >= Math.max(1, festival.startDay - 2) && day < festival.startDay],
      ["cleanup", (festival) => day === festival.endDay + 1]
    ];

    for (const [phase, predicate] of matches) {
      const festival = festivals.find(predicate);
      if (!festival) continue;
      return deepFreeze({
        festivalId: festival.id,
        festivalName: festival.name,
        phase,
        phaseLabel: phaseLabels[phase],
        seasonKey,
        seasonalDay: day,
        startDay: festival.startDay,
        endDay: festival.endDay,
        source: SOURCE,
        immutableState: true
      });
    }

    return deepFreeze({
      festivalId: null,
      festivalName: "",
      phase: "none",
      phaseLabel: phaseLabels.none,
      seasonKey,
      seasonalDay: day,
      startDay: null,
      endDay: null,
      source: SOURCE,
      immutableState: true
    });
  }

  function resolveForState(state) {
    const festival = festivalPhaseForState(state);
    const installed = festival.festivalId ? packageRegistry.get(festival.festivalId) || null : null;
    const useFestivalMap = Boolean(installed && installed.phases.includes(festival.phase));
    const mapPackage = useFestivalMap ? installed : defaultMapPackage;
    let fallbackReason = "";
    if (festival.phase === "none") fallbackReason = "not-a-festival-window";
    else if (!installed) fallbackReason = "festival-map-not-installed";
    else if (!useFestivalMap) fallbackReason = "festival-phase-uses-default-map";

    return deepFreeze({
      ...festival,
      version: "town-stage-festival-theme-v0.1.9-a",
      mapPackage,
      mapAsset: mapPackage.mapAsset,
      mapAlt: mapPackage.mapAlt,
      fallbackMapAsset: defaultMapPackage.mapAsset,
      activeZoneIds: useFestivalMap ? mapPackage.activeZoneIds : [],
      isFestivalMap: useFestivalMap,
      fallbackReason
    });
  }

  T.townStageFestivalTheme = {
    version: "town-stage-festival-theme-v0.1.9-a",
    source: SOURCE,
    coordinateContract: COORDINATE_CONTRACT,
    phaseLabels,
    defaultMapPackage,
    registerMapPackage,
    registeredMapPackage(festivalId) {
      return packageRegistry.get(String(festivalId || "")) || null;
    },
    seasonalDay,
    festivalPhaseForState,
    resolveForState
  };
}());
