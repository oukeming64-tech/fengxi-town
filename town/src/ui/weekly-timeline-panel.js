(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  let selectedWeekId = null;

  function htmlList(items, emptyText, renderItem, limit = 4) {
    const list = (items || []).filter(Boolean).slice(0, limit);
    if (!list.length) return `<p class="empty">${T.escapeHtml(emptyText)}</p>`;
    return `<ul>${list.map((item) => `<li>${renderItem(item)}</li>`).join("")}</ul>`;
  }

  function signedDelta(value, suffix = "") {
    const number = Math.round(Number(value || 0));
    return `${number >= 0 ? "+" : ""}${number}${suffix}`;
  }

  function selectedWeek(engine) {
    const weeks = engine.state.weeklyTimeline || [];
    if (!weeks.length) return null;
    if (!weeks.some((week) => week.weekId === selectedWeekId)) {
      selectedWeekId = weeks[weeks.length - 1].weekId;
    }
    return weeks.find((week) => week.weekId === selectedWeekId) || weeks[weeks.length - 1];
  }

  function renderLocalWeekSections(report) {
    const sections = report?.sections || {};
    const sectionDefs = [
      ["本周一句话", [report?.oneLine || "本周本地快照已生成。"]],
      ["关键互动", sections.keyInteractions || []],
      ["账本走势", sections.ledgerTrend || []],
      ["设施/合同变化", sections.facilityContractChanges || []],
      ["未解决线索", sections.unresolvedHooks || []],
      ["下周压力", sections.nextPressure || []]
    ];
    return sectionDefs.map(([title, lines]) => `
      <section class="week-detail-section">
        <h4>${T.escapeHtml(title)}</h4>
        ${htmlList(lines, "暂无公开条目。", (item) => T.escapeHtml(item), 8)}
      </section>
    `).join("");
  }

  function renderStageEvaluations(week) {
    const evaluations = week.stageEvaluations || [];
    if (!evaluations.length) return "";
    return `
      <section class="week-detail-section stage-evaluation-section">
        <h4>共同体阶段评价</h4>
        ${evaluations.map((item) => `
          <p><strong>${T.escapeHtml(item.grade)} · ${T.escapeHtml(item.gradeName)}</strong>${T.escapeHtml(`第 ${item.startDay}-${item.endDay} 天，平均 ${item.average}/100。${item.publicText}`)}</p>
        `).join("")}
      </section>
    `;
  }

  function render(panel, engine) {
    if (!panel) return;
    const weeks = engine.state.weeklyTimeline || [];
    if (!weeks.length) {
      panel.innerHTML = `<div class="empty">推进 7 天后，这里会出现第一条本地周快照。</div>`;
      return;
    }
    const week = selectedWeek(engine);
    const weekItems = weeks.map((item) => {
      const active = week && item.weekId === week.weekId ? " is-selected" : "";
      const delta = item.ledgerDelta || {};
      return `
        <button type="button" class="week-row${active}" data-week-id="${T.escapeHtml(item.weekId)}">
          <span>${T.escapeHtml(item.rangeLabel)}</span>
          <strong>${T.escapeHtml(item.localReport?.title || item.weekId)}</strong>
          <em>现金 ${signedDelta(delta.cashYsc, " YSC")} · 债务 ${signedDelta(delta.debtYsc, " YSC")}</em>
        </button>
      `;
    }).join("");

    const startLedger = week.startSnapshot?.ledger || {};
    const endLedger = week.endSnapshot?.ledger || {};
    const debt = week.debtSettlement;

    panel.innerHTML = `
      <div class="week-list" role="list">${weekItems}</div>
      <article class="week-detail">
        <div class="week-detail-head">
          <div>
            <h3>${T.escapeHtml(week.localReport?.title || week.rangeLabel)}</h3>
            <p>${T.escapeHtml(week.source)} · immutableState ${week.immutableState ? "true" : "false"}</p>
          </div>
          <span>${T.escapeHtml(week.weekId)}</span>
        </div>
        <div class="week-metrics">
          <span>现金 ${startLedger.cashYsc} -> ${endLedger.cashYsc}</span>
          <span>债务 ${startLedger.debtYsc} -> ${endLedger.debtYsc}</span>
          <span>账务 ${startLedger.accountingTransparency} -> ${endLedger.accountingTransparency}</span>
          <span>高金 ${startLedger.goldkinDependency} -> ${endLedger.goldkinDependency}</span>
          <span>日志引用 ${week.createdFrom?.logRefCount || 0}</span>
          <span>利息 ${debt?.interestAccruedYsc || 0}</span>
        </div>
        ${renderLocalWeekSections(week.localReport)}
        ${renderStageEvaluations(week)}
      </article>
    `;
  }

  function handleClick(event, rerender) {
    const target = event.target.closest("[data-week-id]");
    if (!target || selectedWeekId === target.dataset.weekId) return;
    selectedWeekId = target.dataset.weekId;
    rerender();
  }

  T.weeklyTimelinePanel = {
    render,
    handleClick
  };
}());
