(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  const version = "town-ledger-v0.0.6-relationship-memory-local";

  const sourceRefs = [
    "枫溪镇规则 §3.3 每日结算顺序",
    "枫溪镇规则 §6 种植系统",
    "枫溪镇规则 §7 贸易、货币与账务系统",
    "枫溪镇规则 §10.2 事件触发规则",
    "枫溪镇行动规则 §18.1 每日行动生成流程",
    "枫溪镇行动规则 §19.16 系统结算"
  ];

  const seasonLabels = {
    spring: "春季",
    summer: "夏季",
    fall: "秋季",
    winter: "冬季"
  };

  const qualityOrder = ["C", "B", "A", "S"];
  const qualityLabels = { C: "普通", B: "良好", A: "优质", S: "精品" };
  const qualityMultiplier = { C: 0.8, B: 1, A: 1.25, S: 1.6 };

  const cropData = T.townLedgerCropData;
  if (!cropData) throw new Error("town-ledger-crop-data.js must load before town-ledger-data.js");
  const { cropCatalog, defaultSoils, seasonCropPlans } = cropData;

  const economyData = T.townLedgerEconomyData;
  if (!economyData) throw new Error("town-ledger-economy-data.js must load before town-ledger-data.js");
  const {
    contractTemplates,
    contractCropChoices,
    marketChannels,
    familyMarketProfiles,
    festivalCalendar,
    processingRecipes
  } = economyData;

  const facilityData = T.townLedgerFacilityData;
  if (!facilityData) throw new Error("town-ledger-facility-data.js must load before town-ledger-data.js");
  const { facilityCatalog } = facilityData;

  const weatherCompatData = T.townLedgerWeatherCompatData;
  if (!weatherCompatData) throw new Error("town-ledger-weather-compat-data.js must load before town-ledger-data.js");
  const { weatherProfiles, fallbackWeatherBySeason } = weatherCompatData;

  T.townLedgerData = {
    version,
    sourceRefs,
    seasonLabels,
    qualityOrder,
    qualityLabels,
    qualityMultiplier,
    cropCatalog,
    defaultSoils,
    seasonCropPlans,
    contractTemplates,
    contractCropChoices,
    marketChannels,
    familyMarketProfiles,
    festivalCalendar,
    processingRecipes,
    facilityCatalog,
    weatherProfiles,
    fallbackWeatherBySeason
  };
}());
