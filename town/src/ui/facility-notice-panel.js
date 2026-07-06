(function () {
  const T = window.MorningTown;

  function htmlList(items, emptyText, renderItem, limit = 4) {
    const list = (items || []).filter(Boolean).slice(0, limit);
    if (!list.length) return `<div class="empty compact">${T.escapeHtml(emptyText)}</div>`;
    return `<ul>${list.map((item) => `<li>${renderItem(item)}</li>`).join("")}</ul>`;
  }

  function conditionMeta(condition) {
    if (condition >= 78) return { label: "状态稳", className: "is-good" };
    if (condition >= 58) return { label: "可用", className: "is-usable" };
    if (condition >= 38) return { label: "偏脆", className: "is-fragile" };
    return { label: "需维护", className: "is-alert" };
  }

  function facilityEffectText(id, effects) {
    const fx = effects || {};
    const effectMap = {
      greenhouse: `成长 +${fx.greenhouseGrowthBonus || 0}，品质 +${fx.greenhouseQualityBonus || 0}`,
      barn: `库存上限 +${fx.storageCapacityBonus || 0}`,
      processingTable: `加工槽位 +${fx.processingSlotBonus || 0}，产出 +${Math.round((fx.processingYieldBonus || 0) * 100)}%，成本 -${Math.round((fx.processingCostDiscount || 0) * 100)}%`,
      deliveryVan: `物流成本 -${Math.round((fx.logisticsDiscount || 0) * 100)}%`,
      accountingDesk: `账务透明度结算 +${fx.accountingTransparencyBonus || 0}`,
      marketStall: `寄售容量 +${fx.consignmentCapacityBonus || 0}`
    };
    return effectMap[id] || "设施效果待盘点";
  }

  function facilityUpgradeText(facility) {
    const catalog = T.townLedgerData?.facilityCatalog?.[facility.id] || {};
    if (facility.level >= facility.maxLevel) return "已到最高等级，当前重点是维护状态和公开记录。";
    const nextNote = catalog.upgradeNotes?.[facility.level] || "做一轮升级";
    const baseCost = catalog.upgradeCostYsc
      ? `，基础预算 YSC ${Math.round(catalog.upgradeCostYsc * (1 + (facility.level - 1) * 0.42))}`
      : "";
    const prefix = facility.condition < 58 ? "先维护到 58/100 以上，再做" : "下一步可做";
    return `${prefix}${nextNote}${baseCost}。`;
  }

  function ledgerLine(ledger) {
    if (!ledger) return "账本待打开。";
    return `现金 YSC ${ledger.cashYsc}，应收 YSC ${ledger.receivableYsc}，应付 YSC ${ledger.payableYsc}，账务透明度 ${ledger.accountingTransparency}/100。`;
  }

  function formatIssue(item) {
    if (typeof item === "string") return T.escapeHtml(item);
    const title = item.title || item.type || "公开记录";
    const detail = item.detail || item.note || item.summary || item.status || "";
    const day = item.day ? `第 ${item.day} 天 · ` : "";
    return `${T.escapeHtml(day)}${T.escapeHtml(title)}${detail ? `：${T.escapeHtml(detail)}` : ""}`;
  }

  function relationEntriesFromModule(source, keyNames) {
    if (!source) return [];
    return keyNames.flatMap((key) => {
      const value = source[key];
      if (Array.isArray(value)) return value;
      if (typeof value === "string") return [value];
      return [];
    });
  }

  function relationItemText(item, villagerNameById) {
    if (typeof item === "string") return item;
    const left = item.residentName || item.villagerName || item.name || villagerNameById(item.residentId || item.villagerId || item.from || item.a);
    const right = item.otherName || item.targetName || villagerNameById(item.otherId || item.targetId || item.to || item.b);
    const action = item.kind || item.type || item.action || "居民互动";
    const note = item.note || item.summary || item.text || item.detail || "";
    const pair = [left, right].filter(Boolean).join(" 与 ");
    return [pair, action, note].filter(Boolean).join("：");
  }

  function bondValues(engine) {
    const bonds = engine.state.bonds;
    if (bonds instanceof Map) return [...bonds.values()];
    if (Array.isArray(bonds)) return bonds;
    return [];
  }

  function relationBoardData(engine, villagerNameById) {
    const snapshot = engine.publicTownSnapshot ? engine.publicTownSnapshot() : null;
    const relationshipSnapshot = snapshot?.relationships || null;
    if (relationshipSnapshot) {
      const stats = relationshipSnapshot.summary || {};
      const pairLines = (relationshipSnapshot.relationships || []).slice(0, 2).map((pair) => {
        const label = pair.labels?.length ? pair.labels.join(" 与 ") : pair.pairId;
        return `${label}：${pair.tone || "普通"}`;
      });
      const summary = relationshipSnapshot.summaryLines?.length
        ? relationshipSnapshot.summaryLines.map((line, index) => {
          const text = String(line).replace("紧绷关系", "排挤/摩擦需梳理/调停");
          return index === 0 && !text.includes("关系记忆") ? `关系记忆：${text}` : text;
        })
        : [
          `关系记忆：活跃关系 ${stats.activePairCount || 0} 组，最近互动 ${stats.recentInteractionCount || 0} 条`,
          `结盟 ${stats.alliancePairCount || 0} 组，排挤/摩擦需梳理/调停 ${stats.tensePairCount || 0} 组`,
          ...pairLines
        ];
      const recent = (relationshipSnapshot.recentInteractions || [])
        .map((item) => item.summary || relationItemText(item, villagerNameById));
      return { summary, recent };
    }

    const relationSource = engine.state.relationships
      || engine.state.relationshipMemory
      || engine.state.relationMemory
      || engine.state.townState?.relationships
      || engine.state.townState?.residentRelations
      || null;
    const moduleSummary = relationEntriesFromModule(relationSource, ["summaryLines", "summaries", "publicSummary"]);
    const moduleRecent = relationEntriesFromModule(relationSource, ["recentInteractions", "interactions", "recent", "events"]);
    const bonds = bondValues(engine);
    const warm = bonds.filter((bond) => (bond.warmth || 0) >= 4).length;
    const gifts = bonds.filter((bond) => (bond.debt || 0) > 0).length;
    const rub = bonds.filter((bond) => (bond.rub || 0) >= 2 || (bond.warmth || 0) < 0).length;
    const summary = moduleSummary.length
      ? moduleSummary.map((item) => relationItemText(item, villagerNameById))
      : [
        `结盟/合作趋近 ${warm} 组`,
        `送礼或照应留下往来 ${gifts} 组`,
        `排挤/摩擦苗头 ${rub} 组，需要梳理/调停`,
        bonds.length ? `关系记忆正在累积 ${bonds.length} 组居民互动痕迹` : "关系记忆暂无公开条目"
      ];
    const logRecent = [...engine.state.displayLogs, ...engine.state.allLogs]
      .filter((log) => log.kind === "talk" || /送礼|结盟|排挤|调停|互动|谈|拜访/.test(log.text || ""))
      .slice(-8)
      .map((log) => `第 ${log.day} 天 ${log.slot} · ${log.place}：${log.text}`);
    const recent = moduleRecent.length
      ? moduleRecent.map((item) => relationItemText(item, villagerNameById))
      : logRecent;
    return { summary, recent };
  }

  function renderFacilityPanel(container, engine) {
    const snapshot = engine.publicTownSnapshot ? engine.publicTownSnapshot() : null;
    const facilitySnapshot = snapshot?.facilities || {};
    const facilities = facilitySnapshot.facilities || [];
    if (!snapshot || !facilities.length) {
      container.innerHTML = `<div class="empty compact">设施账本还没公开。</div>`;
      return;
    }

    const avgCondition = Math.round(facilities.reduce((sum, facility) => sum + facility.condition, 0) / facilities.length);
    const attentionCount = facilities.filter((facility) => facility.condition < 58).length;
    const proficiency = (facilitySnapshot.proficiency || snapshot.processing?.proficiency || []).map((item) => {
      const recipe = T.townLedgerData?.processingRecipes?.[item.id] || {};
      return {
        ...item,
        name: item.name || recipe.name || item.id
      };
    });
    const disputes = snapshot.consignmentDisputes || [];
    const openDisputes = disputes.filter((item) => item.status !== "closed");
    const bids = snapshot.contractBids || [];
    const effects = facilitySnapshot.effects || {};

    const facilityItems = facilities.map((facility) => {
      const meta = conditionMeta(facility.condition);
      return `
        <article class="facility-item ${meta.className}">
          <div class="facility-item-head">
            <div>
              <h4>${T.escapeHtml(facility.name)}</h4>
              <span>${T.escapeHtml(facility.group)} · Lv.${facility.level}/${facility.maxLevel}</span>
            </div>
            <strong>${T.escapeHtml(meta.label)}</strong>
          </div>
          <div class="condition-bar" aria-label="${T.escapeHtml(facility.name)} 状态 ${facility.condition}/100">
            <span style="width: ${T.clamp(facility.condition, 0, 100)}%"></span>
          </div>
          <p>状态 ${facility.condition}/100 · ${T.escapeHtml(facilityEffectText(facility.id, effects))}</p>
          <p><b>升级理由/效果：</b>${T.escapeHtml(facilityUpgradeText(facility))}</p>
        </article>
      `;
    }).join("");

    const proficiencyChips = proficiency.length
      ? proficiency.slice(0, 6).map((item) => `
        <span>${T.escapeHtml(item.name)} Lv.${item.level} · ${item.runs} 次</span>
      `).join("")
      : `<span>暂无加工运行记录</span>`;

    container.innerHTML = `
      <div class="facility-panel-head">
        <div>
          <h3>设施专项</h3>
          <p>等级、状态、升级理由、加工熟练度和公开账务</p>
        </div>
        <span>平均状态 ${avgCondition}/100</span>
      </div>
      <div class="facility-summary-grid">
        <span>设施 ${facilities.length} 类</span>
        <span>需维护 ${attentionCount} 类</span>
        <span>寄售争议 ${openDisputes.length} 条</span>
        <span>公开招标 ${bids.length} 条</span>
      </div>
      <div class="facility-list">${facilityItems}</div>
      <div class="facility-lower-grid">
        <section class="facility-section">
          <h4>加工熟练度</h4>
          <div class="facility-chip-list">${proficiencyChips}</div>
        </section>
        <section class="facility-section">
          <h4>寄售货架争议</h4>
          ${htmlList(disputes, "寄售货架暂未出现公开争议。", formatIssue, 3)}
        </section>
        <section class="facility-section">
          <h4>招标</h4>
          ${htmlList(bids, "暂无公开招标。", (bid) => `${T.escapeHtml(bid.buyer)} · ${T.escapeHtml(bid.cropName)} ${bid.quantity} 单位，第 ${bid.dueDay} 天交付，第 ${bid.expiresDay} 天截止`, 3)}
        </section>
        <section class="facility-section">
          <h4>账务</h4>
          <p>${T.escapeHtml(ledgerLine(snapshot.ledger))}</p>
          <div class="facility-chip-list">
            <span>高金依赖 ${snapshot.ledger.goldkinDependency}/100</span>
            <span>合作信任 ${snapshot.ledger.cooperativeTrust}/100</span>
            <span>镇上声誉 ${snapshot.ledger.townReputation}/100</span>
          </div>
        </section>
      </div>
    `;
  }

  function renderNoticeBoard(elements, engine, options = {}) {
    const { panel, content } = elements || {};
    if (!panel || !content) return;
    const open = options.open === true;
    panel.hidden = !open;
    if (!open) return;

    const snapshot = engine.publicTownSnapshot ? engine.publicTownSnapshot() : null;
    const facilities = snapshot?.facilities?.facilities || [];
    const facilityAttention = facilities
      .filter((facility) => facility.condition < 78 || facility.level < facility.maxLevel)
      .slice(0, 4);
    const bids = snapshot?.contractBids || [];
    const disputes = snapshot?.consignmentDisputes || [];
    const accountingEvents = snapshot?.accountingEvents || [];
    const villagerNameById = options.villagerNameById || ((id) => id || "");
    const relationData = relationBoardData(engine, villagerNameById);

    content.innerHTML = `
      <section class="notice-section notice-summary">
        <h4>公开数据</h4>
        <p>${snapshot ? `${T.escapeHtml(snapshot.seasonLabel)}第 ${snapshot.day} 天 · ${T.escapeHtml(snapshot.weather?.label || "天气待记")} · ${T.escapeHtml(ledgerLine(snapshot.ledger))}` : "镇上公开数据待刷新。"}</p>
      </section>
      <section class="notice-section">
        <h4>设施</h4>
        ${htmlList(facilityAttention.length ? facilityAttention : facilities, "设施暂无公开记录。", (facility) => {
          const meta = conditionMeta(facility.condition);
          return `${T.escapeHtml(facility.name)} Lv.${facility.level}/${facility.maxLevel} · ${facility.condition}/100 · ${T.escapeHtml(meta.label)} · ${T.escapeHtml(facilityEffectText(facility.id, snapshot?.facilities?.effects || {}))}`;
        }, 4)}
      </section>
      <section class="notice-section">
        <h4>招标</h4>
        ${htmlList(bids, "暂无公开招标。", (bid) => `${T.escapeHtml(bid.buyer)} 要 ${T.escapeHtml(bid.cropName)} ${bid.quantity} 单位，第 ${bid.dueDay} 天交付，第 ${bid.expiresDay} 天截止`, 4)}
      </section>
      <section class="notice-section">
        <h4>账务</h4>
        ${htmlList([...(accountingEvents || []), ...(disputes || [])], "账务和寄售货架暂无公开异动。", formatIssue, 5)}
      </section>
      <section class="notice-section">
        <h4>居民关系摘要</h4>
        ${htmlList(relationData.summary, "关系记忆暂无公开摘要。", (item) => T.escapeHtml(item), 4)}
      </section>
      <section class="notice-section">
        <h4>最近互动</h4>
        ${htmlList(relationData.recent, "还没有可公开展示的居民互动。推进一天后会出现送礼、结盟、排挤、梳理/调停等关系记忆痕迹。", (item) => T.escapeHtml(item), 5)}
      </section>
    `;
  }

  T.facilityNoticePanel = {
    renderFacilityPanel,
    renderNoticeBoard
  };
}());
