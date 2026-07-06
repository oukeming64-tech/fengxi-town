(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  const version = "town-ledger-facility-data-v0.0.6-local";

  const facilityCatalog = {
    greenhouse: {
      id: "greenhouse",
      name: "旧温室",
      group: "种植",
      maxLevel: 3,
      startingLevel: 1,
      startingCondition: 64,
      upgradeCostYsc: 360,
      maintenanceCostYsc: 42,
      upgradeNotes: ["补玻璃和通风窗", "加温床和遮阳帘", "接入简易滴灌"]
    },
    barn: {
      id: "barn",
      name: "谷仓",
      group: "库存",
      maxLevel: 3,
      startingLevel: 1,
      startingCondition: 72,
      upgradeCostYsc: 300,
      maintenanceCostYsc: 36,
      upgradeNotes: ["重做货架", "分区贴签", "加防潮垫"]
    },
    processingTable: {
      id: "processingTable",
      name: "谷仓加工台",
      group: "加工",
      maxLevel: 4,
      startingLevel: 1,
      startingCondition: 58,
      upgradeCostYsc: 280,
      maintenanceCostYsc: 34,
      upgradeNotes: ["换刀具和案板", "加封口夹具", "补标签架", "加小型烘干箱"]
    },
    deliveryVan: {
      id: "deliveryVan",
      name: "旧货车",
      group: "物流",
      maxLevel: 3,
      startingLevel: 1,
      startingCondition: 60,
      upgradeCostYsc: 420,
      maintenanceCostYsc: 48,
      upgradeNotes: ["换轮胎", "加保温箱", "整理随车单据盒"]
    },
    accountingDesk: {
      id: "accountingDesk",
      name: "会计桌",
      group: "账务",
      maxLevel: 3,
      startingLevel: 1,
      startingCondition: 55,
      upgradeCostYsc: 240,
      maintenanceCostYsc: 28,
      upgradeNotes: ["补收据夹", "分应收应付抽屉", "加公开账页板"]
    },
    marketStall: {
      id: "marketStall",
      name: "寄售货架",
      group: "售卖",
      maxLevel: 3,
      startingLevel: 1,
      startingCondition: 62,
      upgradeCostYsc: 260,
      maintenanceCostYsc: 30,
      upgradeNotes: ["补价签", "加小锁柜", "挂公开寄售单"]
    }
  };

  T.townLedgerFacilityData = {
    version,
    facilityCatalog
  };
}());
