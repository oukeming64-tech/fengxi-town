(function () {
  const T = window.MorningTown;

  const activityData = T.activityData;
  if (!activityData) throw new Error("activity-data.js must load before activity-copy.js");

  const copyTemplates = activityData.copyTemplates;
  const demandFamilyLabels = Object.freeze({
    root: "根茎菜",
    legume: "豆类",
    leaf: "叶菜",
    grain: "谷物",
    processed: "加工食品",
    gourd: "瓜类",
    fruiting: "果菜",
    mushroom: "菌菇"
  });

  function publicDemandFamilyLabel(value) {
    return demandFamilyLabels[value] || String(value || "");
  }

  function templateFor(activity) {
    const templates = copyTemplates[activity.category] || copyTemplates.default;
    return T.pick(templates);
  }

  function objectFor(activity) {
    const title = activity.title;
    const rules = [
      [/播种|种子|化肥|报价|合同|条款|赊购|交割|验收|还款|展期|重新报价/, "报价单"],
      [/邮局|传真|电话联络|交付合同文件/, "传真纸"],
      [/取证拍照|拍照/, "照片"],
      [/浇水|灌溉|取水|水渠|防洪|水质|湿地|泥陷/, "水位记录"],
      [/巡田|除草|清沟|堆肥|采收|留种|果园|老树|试验田/, "田埂记录"],
      [/清点谷仓|库存|包装|标签/, "谷仓清单"],
      [/工具|修温室|温室|维修|设备|零件|矿车|轨道|加固|采石|取材|封锁|警示牌|事故救援|救援/, "工具清单"],
      [/查账|旧账|补贴|发票|收据|成本|预算|审计|档案|复核|认证/, "账本"],
      [/临时避难|救灾|封路抢通|防洪|事故|救援/, "物资清单"],
      [/公告|周会|日程|投票|公听会|调解|登记|备案|公示|培训/, "任务表"],
      [/节日|晚宴|餐桌/, "菜单和座位纸"],
      [/餐馆|碰头|偶遇|拜访|送礼|私下谈话|私下等待|闲聊/, "杯子"],
      [/采访|报纸|广播/, "采访纸"],
      [/路况|运货|修车|加油|物流|等货车|交付合同文件|采购县城物资/, "路单"],
      [/蘑菇|草药|砍柴|拾柴|林缘|花带|蜂箱|老路|堆肥材料|迷路|民间故事|老地图|灯光调查/, "地图边角"]
    ];
    const matched = rules.find(([pattern]) => pattern.test(title));
    return matched ? matched[1] : activity.shortTitle || title;
  }

  function qualityText(quality) {
    return T.townLedgerCore?.qualityText ? T.townLedgerCore.qualityText(quality) : quality;
  }

  function statusText(field) {
    const labels = {
      growing: "还在长",
      ready: "已经成熟",
      harvested: "已经入库",
      failed: "停产",
      rotten: "腐烂"
    };
    return labels[field?.status] || field?.status || "待看";
  }

  function fieldFor(activity, townState) {
    const fields = townState?.fields || [];
    if (!fields.length) return null;
    const ready = fields.find((field) => field.status === "ready");
    const stressed = [...fields].sort((a, b) => (b.stress || 0) - (a.stress || 0))[0];
    if (/采收|交割|包装|合同/.test(activity.title) && ready) return ready;
    if (/浇水|灌溉/.test(activity.title)) {
      return [...fields].sort((a, b) => (a.soil?.moisture || 0) - (b.soil?.moisture || 0))[0];
    }
    if (/巡田|除草|清沟|病害|虫害/.test(activity.title)) return stressed || fields[0];
    if (/堆肥|改土/.test(activity.title)) {
      return [...fields].sort((a, b) => (a.soil?.fertility || 0) - (b.soil?.fertility || 0))[0];
    }
    return fields[(Number(String(activity.id || "").replace(/\D/g, "")) || 0) % fields.length] || fields[0];
  }

  function urgentContract(townState) {
    return (townState?.contracts || [])
      .filter((contract) => ["active", "overdue"].includes(contract.status))
      .sort((a, b) => (a.dueDay - townState.day) - (b.dueDay - townState.day) || (b.quantity - b.deliveredQuantity) - (a.quantity - a.deliveredQuantity))[0] || null;
  }

  function contractForActivity(activity, townState, field = null) {
    const open = (townState?.contracts || []).filter((contract) => ["active", "overdue"].includes(contract.status));
    const by = (predicate) => open.find(predicate) || null;
    const byCrop = field ? by((contract) => contract.cropId === field.cropId) : null;
    if (activity.zoneCode === "YF" && byCrop) return byCrop;
    if (activity.zoneCode === "GG") return by((contract) => contract.marketChannel === "goldkin_station" || /高金/.test(contract.buyer)) || urgentContract(townState);
    if (activity.zoneCode === "SR") return by((contract) => contract.marketChannel === "city_cold_chain" || contract.marketChannel === "preserve_shop") || urgentContract(townState);
    if (activity.zoneCode === "CH") return by((contract) => contract.marketChannel === "festival_stall" || contract.marketChannel === "school_board") || urgentContract(townState);
    if (activity.zoneCode === "TC") return by((contract) => contract.marketChannel === "school_board" || contract.marketChannel === "festival_stall") || urgentContract(townState);
    if (activity.zoneCode === "AC") return urgentContract(townState);
    return byCrop || urgentContract(townState);
  }

  function inventoryLot(townState) {
    return (townState?.inventory?.lots || [])
      .filter((lot) => lot.quantity > 0)
      .sort((a, b) => (a.shelfLifeDays - a.ageDays) - (b.shelfLifeDays - b.ageDays) || b.quantity - a.quantity)[0] || null;
  }

  function marketText(townState) {
    const current = townState?.market?.current;
    if (current?.activeFestival) {
      const families = (current.activeFestival.demandFamilies || [])
        .slice(0, 2)
        .map(publicDemandFamilyLabel)
        .filter(Boolean)
        .join("、");
      return `${current.activeFestival.name}把${families || "摊位货"}推热了`;
    }
    return String(current?.notes?.[0] || "今日行情没有大起伏").replace(/[。，；;,.]+$/g, "");
  }

  function contractText(contract, townState) {
    if (!contract) return "还没有最急的一单";
    const remaining = Math.max(0, contract.quantity - contract.deliveredQuantity);
    const daysLeft = contract.dueDay - (townState?.day || 1);
    return `${contract.label}还差 ${remaining} 单位，离到期还有 ${daysLeft} 天`;
  }

  function accountingPressureText(ledger, contract, townState) {
    const cash = Number(ledger.cashYsc || 0);
    const cashText = cash < 1000
      ? "柜里能立刻动用的钱已经不多"
      : cash < 3000
        ? "手头的钱只够先顾最急的几件事"
        : "手头暂时还转得开，但不能同时答应所有开销";
    if (!contract) return `${cashText}，今天先把零散收据归到一起`;
    const remaining = Math.max(0, Number(contract.quantity || 0) - Number(contract.deliveredQuantity || 0));
    const daysLeft = Number(contract.dueDay || 0) - Number(townState?.day || 1);
    const dueText = daysLeft < 0 ? "已经过了交付日" : daysLeft === 0 ? "今天到期" : daysLeft === 1 ? "明天到期" : `还有 ${daysLeft} 天到期`;
    return `${cashText}，${contract.buyer || contract.label}那单${dueText}，还差 ${remaining} 单位`;
  }

  function stateAwareLine(villager, activity, ctx = {}) {
    const townState = ctx.state?.townState || ctx.townState || null;
    const weather = ctx.state?.currentWeather?.label || ctx.weather?.label || T.worldConfig?.initialState?.weather || "阴天";
    const field = fieldFor(activity, townState);
    const contract = contractForActivity(activity, townState, field);
    const lot = inventoryLot(townState);
    const ledger = townState?.ledger || {};
    const zone = activity.zoneName;
    const name = villager.name;
    const energy = Number(villager.energy || 0);
    const health = Number(villager.health || 0);
    const voice = T.residentLanguageProfile?.profileIdFor?.(villager) || "practical";

    if (activity.zoneCode === "YF") {
      if (/采收/.test(activity.title) && field) {
        return T.pick([
          `${name}先看${field.name}的${field.cropName}，牌子上写着${statusText(field)}、品质${qualityText(field.quality)}。旁边的篮子被挪到${contract?.buyer || "谷仓"}那一列。`,
          `${field.name}边的泥还没干，${name}把${field.cropName}的成熟牌扶正，先拣品质${qualityText(field.quality)}的那几行。`
        ]);
      }
      if (/加工|包装/.test(activity.title) && lot) {
        return T.pick([
          `${name}把${lot.cropName} ${lot.quantity} 单位搬到包装台，先处理快到损耗日的那批。谷仓清单旁边多了一条小记号。`,
          `${name}拆开${lot.cropName}的旧标签，按品质${qualityText(lot.quality)}重分一遍，留给${contract?.buyer || "镇中心货架"}的箱子放在最外侧。`
        ]);
      }
      if (/清点谷仓/.test(activity.title)) {
        const stock = lot ? `${lot.cropName} ${lot.quantity} 单位` : "空筐和旧标签";
        return `${name}在谷仓把${stock}重新点了一遍，账页边上写着：${contractText(contract, townState)}。`;
      }
      if (/浇水|灌溉/.test(activity.title) && field) {
        return `${name}给${field.name}的${field.cropName}补水。${weather}下，土壤水分记到 ${field.soil?.moisture ?? "-"}，今天先不让这块田继续发紧。`;
      }
      if (/巡田|除草|清沟|堆肥|留种|果园|播种/.test(activity.title) && field) {
        return `${name}沿${field.name}走了一圈，${field.cropName}现在 ${field.growth}/${field.daysToMature}，${statusText(field)}。田埂记录上又添了病虫和杂草的小格子。`;
      }
    }

    if (activity.zoneCode === "GG" || activity.zoneCode === "SR" || (activity.skills.includes("trade") && !["CH", "TC", "RW", "MF", "OM"].includes(activity.zoneCode))) {
      return T.pick([
        `${name}到${zone}把${contract?.cropName || "货架货"}的交付日问清楚。${marketText(townState)}，报价先写在路单背面。`,
        `${zone}的柜台边，${name}把${contract?.buyer || "买方"}那一单夹进报价夹：${contractText(contract, townState)}。价钱先按行情留了余地。`,
        `${name}在${zone}把货先留在身后，只把${contract?.cropName || "货架货"}的数量和路况写在一起。${marketText(townState)}。`
      ]);
    }

    if (activity.zoneCode === "CH") {
      const festival = townState?.market?.current?.activeFestival;
      if (festival) {
        return T.pick([
          `${name}在${zone}把${festival.name}的备货纸压到桌面中央，先分摊位、再分农活，免得晚上又对不上账。`,
          `${festival.name}的纸条被${name}贴到门边，谁去谷仓、谁守摊位，都写在能看见的位置。`
        ]);
      }
      if (/晚宴|餐桌/.test(activity.title)) {
        return `${name}在${zone}把菜单纸压在水杯下，先问${contract?.cropName || "明天的菜"}够不够摆桌，再把迟到的人名留到边角。`;
      }
      if (/公听会|投票|调解/.test(activity.title)) {
        return `${zone}里先念${contract?.label || "明日农活"}，${name}把“谁负责交付、谁负责留守”分成两列，声音不高但每个人都听见了。`;
      }
      if (/张贴|公告|公示/.test(activity.title)) {
        return `${name}把${contract?.buyer || "会堂"}那张单子贴到公告板左上角，旁边写清楚还差几单位、哪天到期。`;
      }
      return T.pick([
        `${name}在${zone}把任务表摊开，最先圈出${contract?.buyer || "会堂"}那一栏。椅子还没坐满，谁明天去谷仓已经写上去了。`,
        `${zone}的长桌上，${name}把${contract?.label || "明日农活"}写到最上面，旁边留了两格给迟到的人补名字。`
      ]);
    }

    if (activity.zoneCode === "MF" || activity.zoneCode === "RW" || activity.zoneCode === "OM") {
      const risk = townState?.risks?.scores?.agriculture ?? 0;
      if (activity.zoneCode === "RW") {
        return T.pick([
          `${name}在${zone}蹲下看水边的泥线，${weather}留下的水印还在。照片贴到水位记录旁，先标出哪条沟会影响明天的田。`,
          `${zone}的木桩湿了一半，${name}把水位、路面和河湾风向记在同一页。农场风险表上农业一栏是 ${risk}。`
        ]);
      }
      if (activity.zoneCode === "OM") {
        return `${name}去了${zone}，先看支架、碎石和${weather}后的路面。工具清单旁边写着农业风险 ${risk}，这趟先确认材料能不能安全运回。`;
      }
      return `${name}去了${zone}，沿林缘看风折枝和湿泥印。农场风险表上农业一栏是 ${risk}，明天要不要派人巡田就看这几处。`;
    }

    if (activity.zoneCode === "TC") {
      if (/餐馆/.test(activity.title)) {
        const cropName = contract?.cropName || "明天的菜";
        const market = marketText(townState);
        return T.pick([
          `${name}在餐馆门边听了两句，话题落到${cropName}和${market}。靠门的小黑板还留着早上的报价，粉笔只擦掉了一半。`,
          `${name}在餐馆门边问起${cropName}，又听人说到${market}。柜台旁两个空菜筐摞在一起，卖得快的那只被放在最上面。`,
          `餐馆的收音机刚播完天气，${name}把话题拉回${cropName}。${market}，几个人对着门边的送货箱又核了一遍。`,
          `${name}在餐馆靠窗的位置停了一会儿，先问${cropName}，再听完${market}。杯沿在木桌上轻轻碰了一下，话没有说得很满。`
        ]);
      }
      if (/邮局|传真|电话/.test(activity.title)) {
        return `${name}在${zone}把传真纸夹进信封，写的是${contract?.buyer || "买方"}那边的确认回话，不是农场当天账页。`;
      }
      return T.pick([
        `${name}在${zone}把${contract?.cropName || "明天要卖的菜"}问了一圈。${marketText(townState)}，摊主给的价差被记在纸边。`,
        `${zone}的柜台边，${name}先问谁还要${contract?.cropName || "货架货"}，再看路单和传真纸。今天这趟更像把消息带回农场。`
      ]);
    }

    if (activity.zoneCode === "AC" || /查账|旧账|补贴|发票|收据|成本|预算|审计|档案|复核|认证/.test(activity.title)) {
      const pressure = accountingPressureText(ledger, contract, townState);
      const openings = {
        orderly: `${name}先把最急的单子放到左边，再把能晚一天的收据移到右边。`,
        bargaining: `${name}没有从总数念起，只问哪笔钱今天非付不可。`,
        observant: `${name}把摊开的票据一张张翻到到期日那一面，停了一会儿才开口。`,
        sociable: `${name}先问桌边的人各自卡在哪一步，再把最急的单子推到中间。`,
        daring: `${name}把最急的单子拍在桌上，先指着今天必须回答的那一笔。`,
        practical: `${name}把收据按今天能办、明天再办分成两摞。`
      };
      return `${openings[voice] || openings.practical}${pressure}。`;
    }

    if (activity.category === "recovery") {
      return `${name}今天把步子放慢了。体力还剩 ${energy}，健康 ${health}，所以先在${zone}处理一件轻一点的事。`;
    }

    if (activity.skills.includes("social")) {
      return T.pick([
        `${name}在${zone}停下来说了几句，话题绕到${contract?.cropName || "明天的农活"}和${marketText(townState)}。旁边的人把空杯子挪开，让他们能靠近一点说。`,
        `${zone}里有人问起${contract?.cropName || "明天的农活"}，${name}用指节敲了敲门边的货筐，又把话题拉回今天要做的事。`,
        `${name}等${zone}里的收音机播完天气，才接着说${contract?.cropName || "明天的农活"}。${marketText(townState)}，几个人都没有急着下结论。`,
        `${zone}里有人提到${contract?.cropName || "明天的农活"}，${name}把听到的话记在旧信封背面，再抬头确认了一遍。`
      ]);
    }

    return "";
  }

  function formatLine(villager, activity, ctx = {}) {
    const stateLine = stateAwareLine(villager, activity, ctx);
    if (stateLine) return stateLine;
    const weather = ctx.state?.currentWeather?.label || ctx.weather?.label || T.worldConfig?.initialState?.weather || "阴天";
    const object = objectFor(activity);
    const template = templateFor(activity);
    return template
      .replaceAll("{name}", villager.name)
      .replaceAll("{zone}", activity.zoneName)
      .replaceAll("{object}", object)
      .replaceAll("{action}", activity.shortTitle || activity.title)
      .replaceAll("{weather}", weather)
      .replaceAll("{slot}", ctx.slot || "清晨");
  }

  T.activityCopy = {
    version: "activity-copy-v0.2.0-personalized-language",
    templateFor,
    objectFor,
    fieldFor,
    contractForActivity,
    formatLine
  };
}());
