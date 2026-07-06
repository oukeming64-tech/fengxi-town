(function () {
  const T = window.MorningTown;

  T.worldConfig = {
    version: "world-rules-v0.1-normalized",
    source: "枫溪镇规则",
    normalizedAt: "2026-07-04",
    corrections: [
      {
        field: "population.residents",
        sourceValue: 43,
        normalizedValue: 30,
        reason: "用户确认人数应为 30 人"
      }
    ],
    title: "枫溪镇",
    year: 2006,
    townName: "枫溪镇",
    townEnglishName: "Maple Creek",
    farmName: "田地",
    currency: { code: "YSC", name: "枫溪币", approximateUsd: 1 },
    population: {
      residents: 30,
      externalCharacters: "按事件临时出现"
    },
    technology: ["纸质账本", "固定电话", "传真机", "县城广播", "地方报纸", "早期电子邮件"],
    institutions: [
      {
        id: "goldkin",
        name: "高金农业",
        role: "种子、设备、贷款和大宗采购合同",
        risk: "合同依赖、压价、单一化种植"
      },
      {
        id: "accountingAssociation",
        name: "国家农业会计协会",
        role: "账务、审计、补贴、合规和风险管理",
        risk: "审计压力、流程摩擦、人际矛盾"
      }
    ],
    zones: [
      { id: "yellowstoneFarm", name: "田地", className: "yellowstone-farm", note: "老田、谷仓、温室和小溪边", resource: "土地、作物、仓储", risk: "疲劳、虫害、资金压力" },
      { id: "townCenter", name: "街口", className: "town-center", note: "商店、诊所、公告栏和餐馆", resource: "商店、诊所、公告栏、餐馆", risk: "流言、价格垄断" },
      { id: "mapleForest", name: "枫溪森林", className: "maple-forest", note: "木材、蘑菇、草药和雾中小路", resource: "木材、蘑菇、草药", risk: "迷路、暴雨、野兽传闻" },
      { id: "oldMine", name: "山坡", className: "old-mine", note: "旧设备、山洞口和石坡", resource: "石材、石料、旧设备", risk: "塌方、受伤、禁入" },
      { id: "southRoad", name: "南路口", className: "south-road", note: "县城方向、物流和城市订单", resource: "物流、城市订单", risk: "延误、运费、天气封路" },
      { id: "wetlands", name: "河湾湿地", className: "wetlands", note: "鱼、芦苇、湿地作物和水质", resource: "鱼、芦苇、湿地作物", risk: "洪水、蚊虫、泥陷" },
      { id: "communityHall", name: "公共屋", className: "community-hall", note: "节日、会议、投票和公听会", resource: "节日、会议、投票", risk: "派系冲突" },
      { id: "goldkinStation", name: "高金采购站", className: "goldkin-station", note: "大宗交易、贷款和采购合同", resource: "大宗交易、贷款", risk: "合同依赖" },
      { id: "accountingOffice", name: "会计协会办公室", className: "accounting-office", note: "账本、审计、补贴和合规培训", resource: "账本、审计、补贴", risk: "官僚压力" }
    ],
    seasons: {
      spring: { label: "春季", field: "开垦、播种和修复刚开始，田地的旧账和湿土都等着人处理。" },
      summer: { label: "夏季", field: "灌溉、市场和劳动压力一起升温，高金采购站也变得更活跃。" },
      fall: { label: "秋季", field: "收获、结算和合同续签压到门口，账本比天气更难躲。" },
      winter: { label: "冬季", field: "农活慢下来，审计、维修、节庆和明年的计划浮上桌面。" }
    },
    initialState: {
      date: "2006 年春 1 日",
      weather: "阴天",
      soil: "偏湿",
      broadcast: "县城预计春季降雨偏多，夏季可能偏干。",
      cashYsc: 5000,
      debtYsc: 15000,
      accountingTransparency: 45,
      townReputation: 50,
      goldkinDependency: 20,
      cooperativeTrust: 35
    },
    styleRules: [
      "温馨但不幼稚",
      "表层是田地小镇生活，底层是资源配置、组织行为、信任和制度",
      "冲突必须有现实原因，不使用纯粹恶人",
      "民间传说可以存在，但默认不明确证实超自然",
      "每个 NPC 都应该既有优点也有盲区",
      "决策后必须记录后果"
    ]
  };
}());
