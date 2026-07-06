(function () {
  const T = window.MorningTown;

  function sortedVillagers(engine) {
    return [...engine.state.villagers]
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  function renderVillagers(panel, engine, options = {}) {
    const current = options.current || null;
    panel.innerHTML = sortedVillagers(engine)
      .map((villager) => `
        <article class="villager-row${current && current.id === villager.id ? " is-selected" : ""}" data-villager-id="${T.escapeHtml(villager.id)}" tabindex="0">
          <img class="villager-row-avatar" src="${T.escapeHtml(villager.avatar || T.residentAvatarPath(villager.id))}" alt="">
          <div class="villager-main">
            <div class="villager-name">
              <span>${T.escapeHtml(villager.name)}</span>
            </div>
            <div class="villager-meta">${T.escapeHtml(engine.zoneName(villager.zone))}</div>
            <div class="storage-line">计划：${T.escapeHtml(villager.todayPlan?.slots?.[0]?.shortTitle || "清晨待定")}</div>
            <div class="storage-line">背包：${T.escapeHtml(T.storageSummary(villager.storage))}</div>
          </div>
          <div class="villager-stats" aria-label="${T.escapeHtml(villager.name)} 状态">
            <span>健康 ${villager.health}</span>
            <span>体力 ${villager.energy}</span>
            <span>金币 ${villager.coins}</span>
            <span class="meter"><span class="meter-fill" style="width: ${T.clamp(villager.energy, 0, 100)}%"></span></span>
          </div>
        </article>
      `).join("");
  }

  function renderLogs(panel, engine) {
    const logs = engine.state.displayLogs.length ? engine.state.displayLogs : engine.state.allLogs.slice(-24);
    if (!logs.length) {
      panel.innerHTML = `<div class="empty">还没有小事。选择推进天数后点“推进”，镇上会自己动起来。</div>`;
      return;
    }
    panel.innerHTML = logs.slice(-32).map((log) => `
      <article class="log-entry ${log.kind}">
        <div class="log-head">
          <span>第 ${log.day} 天</span>
          <span>${T.escapeHtml(log.slot)}</span>
          <span>${T.escapeHtml(log.place)}</span>
        </div>
        <p class="log-text">${T.escapeHtml(log.text)}</p>
        ${log.deltas?.length ? `<div class="log-delta">${log.deltas.map((item) => `<span class="delta">${T.escapeHtml(item)}</span>`).join("")}</div>` : ""}
      </article>
    `).join("");
  }

  function renderReport(panel, engine) {
    const report = engine.state.lastReport;
    if (!report) {
      panel.innerHTML = `<div class="empty">今天还没有小报。过完一天后，这里会出现镇上小报。</div>`;
      return;
    }
    panel.innerHTML = `
      <section class="report-section">
        <h3>第 ${report.day} 天 · ${T.escapeHtml(report.scene)}</h3>
        <p>小报只根据今天看得见的行动和对话写成。</p>
      </section>
      ${report.sections.map((section) => `
        <section class="report-section">
          <h3>${T.escapeHtml(section.title)}</h3>
          ${section.list ? `<ul>${section.list.map((item) => `<li>${T.escapeHtml(item)}</li>`).join("")}</ul>` : `<p>${T.escapeHtml(section.body)}</p>`}
        </section>
      `).join("")}
    `;
  }

  T.dailyPanels = {
    version: "daily-panels-v0.1.0-local",
    renderVillagers,
    renderLogs,
    renderReport
  };
}());
