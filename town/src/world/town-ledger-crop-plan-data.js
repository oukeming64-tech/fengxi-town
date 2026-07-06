(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  const defaultSoils = {
    spring: [
      { fertility: 3, moisture: 3, weeds: 2, pests: 0, disease: 0, compaction: 2, organic: 3 },
      { fertility: 2, moisture: 3, weeds: 1, pests: 0, disease: 0, compaction: 1, organic: 3 },
      { fertility: 3, moisture: 4, weeds: 2, pests: 0, disease: 1, compaction: 2, organic: 2 },
      { fertility: 2, moisture: 2, weeds: 1, pests: 0, disease: 0, compaction: 2, organic: 2 }
    ],
    summer: [
      { fertility: 3, moisture: 2, weeds: 2, pests: 1, disease: 0, compaction: 2, organic: 2 },
      { fertility: 2, moisture: 2, weeds: 2, pests: 1, disease: 0, compaction: 1, organic: 2 },
      { fertility: 3, moisture: 3, weeds: 1, pests: 0, disease: 0, compaction: 1, organic: 3 },
      { fertility: 3, moisture: 2, weeds: 1, pests: 1, disease: 0, compaction: 2, organic: 2 }
    ],
    fall: [
      { fertility: 3, moisture: 2, weeds: 1, pests: 0, disease: 0, compaction: 1, organic: 3 },
      { fertility: 3, moisture: 2, weeds: 1, pests: 0, disease: 0, compaction: 2, organic: 3 },
      { fertility: 2, moisture: 2, weeds: 1, pests: 0, disease: 0, compaction: 1, organic: 2 },
      { fertility: 2, moisture: 3, weeds: 1, pests: 0, disease: 0, compaction: 1, organic: 2 }
    ],
    winter: [
      { fertility: 2, moisture: 5, weeds: 0, pests: 0, disease: 1, compaction: 1, organic: 3 },
      { fertility: 3, moisture: 4, weeds: 0, pests: 0, disease: 1, compaction: 1, organic: 3 },
      { fertility: 2, moisture: 2, weeds: 0, pests: 0, disease: 0, compaction: 2, organic: 2 },
      { fertility: 2, moisture: 5, weeds: 0, pests: 0, disease: 1, compaction: 1, organic: 2 }
    ]
  };

  const seasonCropPlans = {
    spring: {
      seasonKey: "spring",
      label: "春季第一批",
      note: "湿土开局，先用根茎、豆类、叶菜和大麦分散风险。",
      fields: [
        { id: "field-01", name: "北侧湿田", cropId: "maple_radish" },
        { id: "field-02", name: "溪边豆畦", cropId: "creek_pea" },
        { id: "field-03", name: "温室外叶菜畦", cropId: "cold_lettuce" },
        { id: "field-04", name: "旧谷物地", cropId: "spring_barley" }
      ]
    },
    summer: {
      seasonKey: "summer",
      label: "夏季第一批",
      note: "高温开局，果菜收益高，但灌溉和虫害风险也高。",
      fields: [
        { id: "field-01", name: "南坡番茄架", cropId: "sun_tomato" },
        { id: "field-02", name: "辣椒窄畦", cropId: "valley_pepper" },
        { id: "field-03", name: "棚边豆架", cropId: "climbing_bean" },
        { id: "field-04", name: "瓜田试作区", cropId: "honey_melon" }
      ]
    },
    fall: {
      seasonKey: "fall",
      label: "秋季第一批",
      note: "收获季重视仓储和合同，根茎、谷物、瓜类更稳。",
      fields: [
        { id: "field-01", name: "西侧土豆地", cropId: "yellow_potato" },
        { id: "field-02", name: "节日南瓜田", cropId: "golden_pumpkin" },
        { id: "field-03", name: "褐穗小麦地", cropId: "brown_wheat" },
        { id: "field-04", name: "林缘草药畦", cropId: "silver_sage" }
      ]
    },
    winter: {
      seasonKey: "winter",
      label: "冬季第一批",
      note: "冬季只做温室、洞穴和越冬试作，不强行铺开大田。",
      fields: [
        { id: "field-01", name: "菇房木架", cropId: "mist_mushroom", bedType: "indoor" },
        { id: "field-02", name: "温室叶菜槽", cropId: "greenhouse_lettuce", bedType: "greenhouse" },
        { id: "field-03", name: "越冬麦苗畦", cropId: "winter_wheat" },
        { id: "field-04", name: "旧木耳架", cropId: "wood_ear_mushroom", bedType: "indoor" }
      ]
    }
  };

  T.townLedgerCropPlanData = {
    version: "town-ledger-crop-plan-data-v0.0.6-local",
    defaultSoils,
    seasonCropPlans
  };
}());
