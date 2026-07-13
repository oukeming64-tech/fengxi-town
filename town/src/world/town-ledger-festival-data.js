(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  const festivalCalendar = {
    spring: [
      { id: "seed_swap", name: "换种日", startDay: 3, endDay: 4, demandFamilies: ["root", "legume", "leaf"], commercialPressure: 1, accountingPressure: 0, note: "会堂换种，合作社和学校午餐都会多看新鲜菜。" },
      { id: "rain_gutter_day", name: "清沟义工日", startDay: 10, endDay: 10, demandFamilies: ["grain", "processed"], commercialPressure: 0, accountingPressure: 1, note: "雨季前查沟渠，账本会被顺手翻一遍。" }
    ],
    summer: [
      { id: "roadside_picnic", name: "南路野餐周", startDay: 6, endDay: 8, demandFamilies: ["fruiting", "gourd", "leaf"], commercialPressure: 2, accountingPressure: 0, note: "南路摊位热闹，冷链和摊贩都会抢好货。" },
      { id: "water_meeting", name: "用水协调会", startDay: 16, endDay: 16, demandFamilies: ["processed"], commercialPressure: 0, accountingPressure: 2, note: "热天用水账容易起争议。" }
    ],
    fall: [
      { id: "harvest_festival", name: "丰收节", startDay: 5, endDay: 7, demandFamilies: ["gourd", "fruiting", "grain", "processed"], commercialPressure: 2, accountingPressure: 1, note: "收成展示、共享长桌与晚宴把摊位、包装和公开致谢一起推到台前。" },
      { id: "barn_audit_day", name: "谷仓盘点日", startDay: 14, endDay: 14, demandFamilies: ["root", "grain"], commercialPressure: 1, accountingPressure: 2, note: "合作社查库存，模糊账会引来争议。" }
    ],
    winter: [
      { id: "snowfall_festival", name: "落雪节", startDay: 4, endDay: 5, demandFamilies: ["mushroom", "leaf", "processed"], commercialPressure: 1, accountingPressure: 1, note: "雪夜灯串、暖食与互赠让会堂、餐桌和温室货摊更热闹。" },
      { id: "year_end_books", name: "年末账本夜", startDay: 18, endDay: 18, demandFamilies: ["processed", "grain"], commercialPressure: 0, accountingPressure: 3, note: "会计协会要求把应收、库存和寄售说清楚。" }
    ]
  };

  T.townLedgerFestivalData = { festivalCalendar };
}());
