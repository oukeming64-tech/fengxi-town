(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  const namePool = {
    first: {
      male: ["Adam", "Austin", "Bennett", "Caleb", "Cole", "Dylan", "Ethan", "Felix", "Graham", "Henry", "Isaac", "Jack", "Leo", "Miles", "Nathan", "Owen", "Peter", "Reid", "Simon", "Theo", "Victor", "Wesley", "Wyatt", "Zach"],
      female: ["Alice", "Anna", "Brooke", "Clara", "Daisy", "Elise", "Fiona", "Grace", "Hazel", "Iris", "Julia", "Kate", "Lena", "Maya", "Nora", "Olive", "Paige", "Rose", "Sophie", "Tessa", "Vera", "Willow", "Zoe"]
    },
    last: ["Miller", "Carter", "Bennett", "Cooper", "Brooks", "Hayes", "Parker", "Reed", "Morgan", "Foster", "Bell", "Ward", "Stone", "Fisher", "Wells", "Grant", "Bailey", "Hughes", "Porter", "Collins", "Gray", "Rivera", "Murphy", "Turner", "Baker", "Russell", "Coleman", "Perry", "Howard", "Sullivan"]
  };

  const genderTargets = { male: 17, female: 13 };
  const genderPlan = [
    "male", "female", "female", "male", "male", "female", "male", "female", "male", "female",
    "female", "male", "female", "male", "male", "male", "female", "male", "female", "male",
    "male", "female", "male", "male", "female", "male", "male", "female", "female", "male"
  ];

  const zones = [
    { id: "yellowstoneFarm", name: "黄石农场", className: "yellowstone-farm", note: "老田、谷仓和温室" },
    { id: "townCenter", name: "镇中心", className: "town-center", note: "商店、诊所和餐馆" },
    { id: "mapleForest", name: "枫溪森林", className: "maple-forest", note: "木材、蘑菇和草药" },
    { id: "oldMine", name: "旧矿区", className: "old-mine", note: "矿洞、石坡和旧设备" },
    { id: "southRoad", name: "南部公路", className: "south-road", note: "县城方向和物流" },
    { id: "wetlands", name: "河湾湿地", className: "wetlands", note: "鱼、芦苇和水质" },
    { id: "communityHall", name: "社区会堂", className: "community-hall", note: "节日、会议和投票" },
    { id: "goldkinStation", name: "高金采购站", className: "goldkin-station", note: "大宗交易和贷款" },
    { id: "accountingOffice", name: "会计协会办公室", className: "accounting-office", note: "账本、审计和补贴" }
  ];

  const mapBounds = {
    yellowstoneFarm: { left: 2, top: 8, width: 29, height: 32, labelLeft: 8, labelTop: 14 },
    townCenter: { left: 31, top: 34, width: 31, height: 28, labelLeft: 42, labelTop: 42 },
    mapleForest: { left: 26, top: 0, width: 33, height: 34, labelLeft: 38, labelTop: 10 },
    oldMine: { left: 59, top: 3, width: 34, height: 31, labelLeft: 73, labelTop: 13 },
    southRoad: { left: 38, top: 66, width: 58, height: 12, labelLeft: 67, labelTop: 70 },
    wetlands: { left: 1, top: 41, width: 48, height: 43, labelLeft: 17, labelTop: 60 },
    communityHall: { left: 41, top: 76, width: 21, height: 20, labelLeft: 48, labelTop: 84 },
    goldkinStation: { left: 63, top: 75, width: 18, height: 20, labelLeft: 69, labelTop: 83 },
    accountingOffice: { left: 80, top: 76, width: 18, height: 20, labelLeft: 85, labelTop: 84 }
  };

  const activityPlaces = [
    { id: "farm", name: "黄石农场", className: "farm", zone: "yellowstoneFarm" },
    { id: "mine", name: "旧矿区", className: "mine", zone: "oldMine" },
    { id: "river", name: "河湾湿地", className: "river", zone: "wetlands" },
    { id: "market", name: "镇中心", className: "market", zone: "townCenter" },
    { id: "bridge", name: "社区会堂", className: "bridge", zone: "communityHall" },
    { id: "notice", name: "社区会堂", className: "notice", zone: "communityHall" },
    { id: "inn", name: "餐馆", className: "inn", zone: "townCenter" },
    { id: "home", name: "镇上小屋", className: "home", zone: "townCenter" }
  ];

  const startingPositions = [
    { action: "farm", zone: "yellowstoneFarm" },
    { action: "home", zone: "townCenter" },
    { action: "market", zone: "townCenter" },
    { action: "bridge", zone: "communityHall" },
    { action: "river", zone: "wetlands" },
    { action: "mine", zone: "oldMine" },
    { action: "market", zone: "goldkinStation" },
    { action: "notice", zone: "accountingOffice" },
    { action: "river", zone: "mapleForest" },
    { action: "market", zone: "southRoad" }
  ];

  const scenes = {
    daily: {
      key: "daily",
      label: "日常杂活",
      task: "日常杂活",
      bridge: 0.9,
      weights: { farm: 1.1, mine: 0.9, river: 1, market: 1.1, bridge: 0.9, notice: 0.9, inn: 1, home: 0.9 }
    },
    bridge: {
      key: "bridge",
      label: "修老木桥",
      task: "修老木桥",
      bridge: 1.8,
      weights: { farm: 0.9, mine: 1.1, river: 0.8, market: 0.8, bridge: 1.9, notice: 1.2, inn: 0.9, home: 0.7 }
    },
    harvest: {
      key: "harvest",
      label: "丰收节",
      task: "丰收节",
      bridge: 0.8,
      weights: { farm: 1.2, mine: 0.6, river: 0.7, market: 1.8, bridge: 0.7, notice: 1.5, inn: 1.3, home: 0.7 }
    },
    storm: {
      key: "storm",
      label: "暴风雨准备",
      task: "暴风雨准备",
      bridge: 1.3,
      weights: { farm: 0.9, mine: 0.8, river: 0.5, market: 0.8, bridge: 1.4, notice: 1.3, inn: 1.2, home: 1.2 }
    }
  };

  const seasons = {
    spring: { label: "春季", field: "新芽刚起，黄石农场和镇中心都醒得早。" },
    summer: { label: "夏季", field: "白天更长，河湾湿地、餐馆和采购站更热。" },
    fall: { label: "秋季", field: "收成压到门口，谷仓、会堂和账本都忙。" },
    winter: { label: "冬季", field: "山路冷，办公室和会堂的灯亮得久。" }
  };

  const timeSlots = ["清晨", "午后", "夜里"];

  const actionEffects = {
    farm: { kind: "work", health: -1, energy: -15, coins: 6, renown: 1, help: 7, favor: 0, standing: 1, distance: -1, storage: { seeds: -1, crop: 3 } },
    mine: { kind: "work", health: -6, energy: -20, coins: 12, renown: 1, help: 2, favor: 0, standing: 0, distance: 0, storage: { stone: 2, ore: 2 } },
    river: { kind: "quiet", health: 1, energy: -8, coins: 5, renown: 0, help: 1, favor: 0, standing: 0, distance: -1, storage: { fish: 2 } },
    market: { kind: "talk", health: -1, energy: -12, coins: 14, renown: 7, help: 1, favor: 1, standing: 2, distance: 0, storage: { crop: -1 } },
    bridge: { kind: "work", health: -2, energy: -14, coins: -2, renown: 3, help: 10, favor: 1, standing: 3, distance: -2, storage: { wood: -1, stone: -1 } },
    notice: { kind: "talk", health: 0, energy: -6, coins: 0, renown: 9, help: 0, favor: 0, standing: 2, distance: 1, storage: {} },
    inn: { kind: "talk", health: -1, energy: -10, coins: -7, renown: 5, help: 0, favor: 3, standing: 3, distance: -1, storage: { meal: -1 } },
    home: { kind: "quiet", health: 4, energy: 18, coins: 0, renown: -1, help: 0, favor: 0, standing: 0, distance: -1, storage: {} }
  };

  const scenePlanIds = {
    daily: ["YF-03", "TC-05", "YF-08"],
    bridge: ["OM-05", "YF-07", "CH-01"],
    harvest: ["YF-06", "YF-09", "CH-08"],
    storm: ["RW-06", "YF-12", "CH-12"]
  };

  T.engineStaticData = {
    namePool,
    genderTargets,
    genderPlan,
    zones,
    mapBounds,
    activityPlaces,
    startingPositions,
    scenes,
    seasons,
    timeSlots,
    actionEffects,
    scenePlanIds
  };
}());
