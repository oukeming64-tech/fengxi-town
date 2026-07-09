(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  const mapHotspots = [
    {
      id: "farm-field",
      label: "老田块",
      zoneId: "yellowstoneFarm",
      kind: "farm",
      x: 15,
      y: 27,
      radius: 7,
      activityIds: ["YF-01", "YF-02", "YF-03", "YF-04", "YF-06", "YF-15"],
      animationKey: "water",
      panelTarget: "field-work",
      description: "播种、浇水、巡田和采收的主要落点。"
    },
    {
      id: "greenhouse-door",
      label: "温室门口",
      zoneId: "yellowstoneFarm",
      kind: "repair",
      x: 25,
      y: 17,
      radius: 5,
      activityIds: ["YF-07", "YF-10", "YF-13", "YF-14"],
      animationKey: "repair",
      panelTarget: "greenhouse",
      description: "温室维修、工具维护和试验田记录会落到这里。"
    },
    {
      id: "barn-table",
      label: "谷仓台",
      zoneId: "yellowstoneFarm",
      kind: "stock",
      x: 25,
      y: 35,
      radius: 5,
      activityIds: ["YF-08", "YF-09", "YF-11", "YF-16"],
      animationKey: "carry",
      panelTarget: "barn",
      description: "清点谷仓、加工包装和临时排班的本地锚点。"
    },
    {
      id: "town-market-stall",
      label: "集市摊位",
      zoneId: "townCenter",
      kind: "buy",
      x: 41,
      y: 52,
      radius: 6,
      activityIds: ["TC-02", "TC-05", "TC-10", "TC-12"],
      animationKey: "trade",
      panelTarget: "market",
      description: "杂货采购、行情打听和镇中心偶遇的公开位置。"
    },
    {
      id: "inn-door",
      label: "餐馆门口",
      zoneId: "townCenter",
      kind: "social",
      x: 51,
      y: 46,
      radius: 5,
      activityIds: ["TC-03", "TC-04", "TC-07", "TC-08", "TC-09", "CH-10"],
      animationKey: "chat",
      panelTarget: "social",
      description: "碰头、休养建议、送礼和短对话更容易在这里被看见。"
    },
    {
      id: "notice-board",
      label: "公告板",
      zoneId: "townCenter",
      kind: "notice",
      x: 52,
      y: 61,
      radius: 4,
      activityIds: ["TC-01", "TC-06", "CH-01", "CH-02", "CH-03", "CH-11"],
      animationKey: "notice",
      panelTarget: "notice-board",
      description: "公告、合同消息、周会和公示账目只读落点。"
    },
    {
      id: "old-bridge",
      label: "旧桥",
      zoneId: "communityHall",
      kind: "repair",
      x: 46,
      y: 82,
      radius: 6,
      activityIds: ["CH-12", "YF-07", "YF-12", "OM-05", "OM-11", "SR-11"],
      animationKey: "repair",
      panelTarget: "bridge",
      description: "维修、救灾协调和抢通类行动的舞台锚点。"
    },
    {
      id: "consignment-rack",
      label: "寄售货架",
      zoneId: "communityHall",
      kind: "sell",
      x: 58,
      y: 84,
      radius: 5,
      activityIds: ["CH-08", "GG-05", "GG-06", "SR-05"],
      animationKey: "sell",
      panelTarget: "consignment",
      description: "摆摊售卖、大宗交割和品质验收的可见落点。"
    },
    {
      id: "goldkin-counter",
      label: "高金柜台",
      zoneId: "goldkinStation",
      kind: "buy",
      x: 70,
      y: 84,
      radius: 6,
      activityIds: ["GG-01", "GG-02", "GG-03", "GG-04", "GG-07", "GG-08", "GG-09", "GG-10", "GG-11", "GG-12"],
      animationKey: "trade",
      panelTarget: "goldkin",
      description: "采购、贷款、合同谈判和采购站闲聊会落到柜台附近。"
    },
    {
      id: "accounting-desk",
      label: "会计桌",
      zoneId: "accountingOffice",
      kind: "notice",
      x: 86,
      y: 84,
      radius: 5,
      activityIds: ["AC-01", "AC-02", "AC-03", "AC-04", "AC-05", "AC-06", "AC-07", "AC-08", "AC-09", "AC-10", "AC-11", "AC-12"],
      animationKey: "audit",
      panelTarget: "accounting",
      description: "查账、合同审读、预算会和争议复核只显示公开事实。"
    },
    {
      id: "old-truck",
      label: "旧货车",
      zoneId: "southRoad",
      kind: "repair",
      x: 73,
      y: 70,
      radius: 6,
      activityIds: ["SR-01", "SR-03", "SR-04", "SR-06", "SR-07", "SR-08", "SR-09", "SR-10"],
      animationKey: "carry",
      panelTarget: "logistics",
      description: "南部公路、县城交付、修车和等货车的空间锚点。"
    },
    {
      id: "wetland-dock",
      label: "湿地码头",
      zoneId: "wetlands",
      kind: "farm",
      x: 21,
      y: 62,
      radius: 6,
      activityIds: ["RW-01", "RW-02", "RW-03", "RW-04", "RW-05", "RW-06", "RW-07", "RW-08", "RW-09", "RW-10", "RW-11", "RW-12"],
      animationKey: "field",
      panelTarget: "wetlands",
      description: "钓鱼、取水、水质检测、防洪巡查和湿地谈话的落点。"
    },
    {
      id: "forest-edge",
      label: "林缘小路",
      zoneId: "mapleForest",
      kind: "social",
      x: 39,
      y: 17,
      radius: 6,
      activityIds: ["MF-01", "MF-02", "MF-03", "MF-04", "MF-05", "MF-06", "MF-07", "MF-08", "MF-09", "MF-10", "MF-11", "MF-12"],
      animationKey: "field",
      panelTarget: "forest",
      description: "采集、拾柴、林缘巡查和降压散步的可见位置。"
    },
    {
      id: "mine-gate",
      label: "矿洞口",
      zoneId: "oldMine",
      kind: "repair",
      x: 73,
      y: 20,
      radius: 7,
      activityIds: ["OM-01", "OM-02", "OM-03", "OM-04", "OM-05", "OM-06", "OM-07", "OM-08", "OM-09", "OM-10", "OM-11", "OM-12"],
      animationKey: "repair",
      panelTarget: "mine",
      description: "采石、旧设备、加固支撑和事故救援在这里聚合。"
    },
    {
      id: "home-west",
      label: "西侧小屋",
      zoneId: "townCenter",
      kind: "home",
      x: 34,
      y: 63,
      radius: 4,
      activityIds: ["REST-01"],
      animationKey: "rest",
      panelTarget: "home",
      description: "夜里归家和休息恢复的共享门口。"
    },
    {
      id: "home-north",
      label: "北侧小屋",
      zoneId: "townCenter",
      kind: "home",
      x: 45,
      y: 39,
      radius: 4,
      activityIds: ["REST-01"],
      animationKey: "rest",
      panelTarget: "home",
      description: "夜里归家和休息恢复的共享门口。"
    },
    {
      id: "home-south",
      label: "南侧小屋",
      zoneId: "communityHall",
      kind: "home",
      x: 52,
      y: 91,
      radius: 4,
      activityIds: ["REST-01"],
      animationKey: "rest",
      panelTarget: "home",
      description: "夜里归家和休息恢复的共享门口。"
    },
    {
      id: "home-east",
      label: "东侧小屋",
      zoneId: "goldkinStation",
      kind: "home",
      x: 78,
      y: 91,
      radius: 4,
      activityIds: ["REST-01"],
      animationKey: "rest",
      panelTarget: "home",
      description: "夜里归家和休息恢复的共享门口。"
    }
  ];

  const actionAnimations = {
    idle: {
      label: "停留",
      cueClass: "cue-idle",
      tone: "quiet",
      sprite: { col: 2, row: 2 }
    },
    water: {
      label: "浇水",
      cueClass: "cue-water",
      tone: "farm",
      sprite: { col: 0, row: 0 }
    },
    field: {
      label: "野外",
      cueClass: "cue-field",
      tone: "farm",
      sprite: { col: 1, row: 0 }
    },
    repair: {
      label: "维修",
      cueClass: "cue-repair",
      tone: "repair",
      sprite: { col: 2, row: 0 }
    },
    carry: {
      label: "搬运",
      cueClass: "cue-carry",
      tone: "repair",
      sprite: { col: 3, row: 0 }
    },
    trade: {
      label: "采购",
      cueClass: "cue-trade",
      tone: "trade",
      sprite: { col: 0, row: 1 }
    },
    sell: {
      label: "售卖",
      cueClass: "cue-sell",
      tone: "trade",
      sprite: { col: 1, row: 1 }
    },
    notice: {
      label: "公告",
      cueClass: "cue-notice",
      tone: "notice",
      sprite: { col: 2, row: 1 }
    },
    audit: {
      label: "查账",
      cueClass: "cue-audit",
      tone: "notice",
      sprite: { col: 3, row: 1 }
    },
    chat: {
      label: "闲聊",
      cueClass: "cue-chat",
      tone: "social",
      sprite: { col: 0, row: 2 }
    },
    rest: {
      label: "归家",
      cueClass: "cue-rest",
      tone: "home",
      sprite: { col: 1, row: 2 }
    }
  };

  T.townStageData = {
    version: "town-stage-data-v0.1.4-local",
    mapHotspots,
    actionAnimations,
    actionCueAtlas: {
      columns: 4,
      rows: 3,
      source: "04_AI班级小镇/assets/runtime/action-cues/action-cue-atlas-v0.1.4.png",
      generatedWith: "imagegen-built-in-chroma-key"
    },
    desktopOnly: true
  };
}());
