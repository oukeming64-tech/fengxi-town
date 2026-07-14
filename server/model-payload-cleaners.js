const { createCognitionPayloadCleaner } = require("./model-cognition-payload-cleaner");
const { createModelStatePayloadCleaner } = require("./model-state-payload-cleaner");

const DEFAULT_WORLD_SUMMARY = {
  source: "",
  title: "",
  year: 0,
  residentCount: 0,
  currency: "",
  actionLayer: "",
  stateLayer: ""
};

function createModelPayloadCleaner({
  cleanString,
  cleanText,
  cleanList,
  safeVisibleText,
  worldSummary = DEFAULT_WORLD_SUMMARY
} = {}) {
  const safeWorldSummary = worldSummary && typeof worldSummary === "object"
    ? { ...DEFAULT_WORLD_SUMMARY, ...worldSummary }
    : DEFAULT_WORLD_SUMMARY;
  const cognitionPayloadCleaner = createCognitionPayloadCleaner({
    cleanString,
    cleanList,
    safeVisibleText
  });
  const statePayloadCleaner = createModelStatePayloadCleaner({
    cleanString,
    cleanList
  });

  function cleanPayload(payload) {
    const logs = Array.isArray(payload.logs) ? payload.logs : [];
    const report = payload.report && typeof payload.report === "object" ? payload.report : null;
    const world = payload.world && typeof payload.world === "object" ? payload.world : {};
    const contract = payload.contract && typeof payload.contract === "object" ? payload.contract : {};
    const actionLayer = payload.actionLayer && typeof payload.actionLayer === "object" ? payload.actionLayer : null;
    const stateLayer = payload.stateLayer && typeof payload.stateLayer === "object" ? payload.stateLayer : null;
    const residents = Array.isArray(payload.residents) ? payload.residents : [];
    const weekly = payload.weekly && typeof payload.weekly === "object" ? payload.weekly : {};
    const actionControl = payload.actionControl && typeof payload.actionControl === "object" ? payload.actionControl : {};
    return {
      mode: cleanString(payload.mode || "shadow", 24),
      actionControl: {
        day: Number(actionControl.day || payload.day || 0),
        slots: cleanList(actionControl.slots, 3, 20),
        request: cleanString(actionControl.request || "", 180)
      },
      world: {
        version: cleanString(world.version || safeWorldSummary.source, 80),
        title: cleanString(world.title || safeWorldSummary.title, 80),
        year: Number(world.year || safeWorldSummary.year),
        townName: cleanString(world.townName || "枫溪镇", 40),
        farmName: cleanString(world.farmName || "田地", 40),
        population: Number(world.population || safeWorldSummary.residentCount),
        currency: cleanString(world.currency || safeWorldSummary.currency, 10),
        zones: Array.isArray(world.zones) ? world.zones.slice(0, 12).map((zone) => ({
          id: cleanString(zone.id, 40),
          name: cleanString(zone.name, 40)
        })).filter((zone) => zone.id && zone.name) : []
      },
      contract: {
        version: cleanString(contract.version || "model-contract-v0.8-weekly-timeline", 80),
        residentCount: Number(contract.residentCount || safeWorldSummary.residentCount),
        currentMode: cleanString(contract.currentMode || "weekly-timeline-shadow-local-immutable", 64)
      },
      actionLayer: actionLayer ? {
        version: cleanString(actionLayer.version || safeWorldSummary.actionLayer, 80),
        sourceActivityCount: Number(actionLayer.sourceActivityCount || 0),
        mode: cleanString(actionLayer.mode || "local-rules-first", 40),
        visibilityRule: cleanString(actionLayer.visibilityRule || "", 180),
        zones: Array.isArray(actionLayer.zones) ? actionLayer.zones.slice(0, 9).map((zone) => ({
          id: cleanString(zone.id, 40),
          name: cleanString(zone.name, 40),
          risk: Number(zone.risk || 0)
        })) : [],
        sampleActivities: Array.isArray(actionLayer.sampleActivities) ? actionLayer.sampleActivities.slice(0, 18).map((activity) => ({
          id: cleanString(activity.id, 20),
          title: cleanString(activity.title, 60),
          zoneId: cleanString(activity.zoneId, 40),
          laborCost: Number(activity.laborCost || 0),
          riskLevel: Number(activity.riskLevel || 0)
        })) : [],
        activities: Array.isArray(actionLayer.activities) ? actionLayer.activities.slice(0, 140).map((activity) => ({
          id: cleanString(activity.id, 20),
          title: cleanString(activity.title, 60),
          zoneId: cleanString(activity.zoneId, 40),
          zoneName: cleanString(activity.zoneName, 40),
          laborCost: Number(activity.laborCost || 0),
          riskLevel: Number(activity.riskLevel || 0),
          skills: cleanList(activity.skills, 4, 24),
          tags: cleanList(activity.tags, 8, 24)
        })).filter((activity) => activity.id) : []
      } : null,
      stateLayer: stateLayer ? {
        version: cleanString(stateLayer.version || safeWorldSummary.stateLayer, 80),
        mode: cleanString(stateLayer.mode || "local-state-first", 40),
        weather: stateLayer.weather && typeof stateLayer.weather === "object" ? {
          label: cleanString(stateLayer.weather.label, 40),
          riskIndex: Number(stateLayer.weather.riskIndex || 0),
          summary: cleanString(stateLayer.weather.summary, 260)
        } : null,
        snapshot: statePayloadCleaner.cleanSnapshot(stateLayer.snapshot),
        visibilityRule: cleanString(stateLayer.visibilityRule || "", 180)
      } : null,
      scene: cleanString(payload.scene, 80),
      residents: residents.slice(0, 30).map((resident) => ({
        id: cleanString(resident.id, 12),
        name: cleanString(resident.name, 30),
        tag: cleanString(resident.tag, 40),
        voiceStyle: cleanString(resident.voiceStyle, 120),
        zone: cleanString(resident.zone, 40),
        health: Number(resident.health || 0),
        energy: Number(resident.energy || 0),
        coins: Number(resident.coins || 0),
        recentAction: resident.recentAction && typeof resident.recentAction === "object" ? {
          activityId: cleanString(resident.recentAction.activityId, 20),
          activityTitle: cleanString(resident.recentAction.activityTitle, 60),
          zone: cleanString(resident.recentAction.zone, 40),
          text: cleanString(resident.recentAction.text, 220)
        } : null
      })).filter((resident) => resident.id && resident.name),
      logs: logs.slice(-36).map((log) => ({
        id: cleanString(log.id, 40),
        residentId: cleanString(log.residentId, 12),
        residentIds: cleanList(log.residentIds, 4, 12),
        day: Number(log.day || 0),
        slot: cleanString(log.slot, 20),
        place: cleanString(log.place, 30),
        kind: cleanString(log.kind, 20),
        zoneId: cleanString(log.zoneId, 40),
        activityId: cleanString(log.activityId, 20),
        activityTitle: cleanString(log.activityTitle, 60),
        text: cleanString(log.text, 280)
      })).filter((log) => log.id && log.text),
      report: report ? {
        day: Number(report.day || 0),
        scene: cleanString(report.scene, 80),
        sections: Array.isArray(report.sections) ? report.sections.map((section, index) => ({
          index: Number.isInteger(section.index) ? section.index : index,
          title: cleanString(section.title, 40),
          body: cleanText(section.body, 460),
          list: Array.isArray(section.list) ? section.list.slice(0, 6).map((item) => cleanString(item, 240)) : null
        })) : []
      } : null,
      weekly: statePayloadCleaner.cleanWeeklyPayload(weekly),
      cognition: cognitionPayloadCleaner.cleanCognitionPayload(payload.cognition)
    };
  }

  return {
    cleanPayload,
    cleanSnapshot: statePayloadCleaner.cleanSnapshot,
    cleanCognitionPayload: cognitionPayloadCleaner.cleanCognitionPayload
  };
}

module.exports = {
  DEFAULT_WORLD_SUMMARY,
  createModelPayloadCleaner
};
