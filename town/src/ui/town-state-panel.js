(function () {
  const T = window.MorningTown;

  function render(panel, engine) {
    const snapshot = engine.publicTownSnapshot ? engine.publicTownSnapshot() : null;
    if (!snapshot) {
      panel.innerHTML = `<div class="empty compact">账本还没打开。</div>`;
      return;
    }

    const weather = snapshot.weather?.summary || `${snapshot.seasonLabel}第 ${snapshot.day} 日待开始。`;
    const fields = snapshot.fields.slice(0, 4).map((field) => `
      <span>${T.escapeHtml(field.cropName)} ${T.escapeHtml(field.progress)} · ${T.escapeHtml(field.quality)}</span>
    `).join("");
    const contracts = snapshot.contracts.slice(0, 4).map((contract) => `
      <span>${T.escapeHtml(contract.buyer)} ${T.escapeHtml(contract.delivered)} · 第 ${contract.dueDay} 日</span>
    `).join("");
    const market = snapshot.market?.festival
      ? `${snapshot.market.festival.name} · ${snapshot.market.festival.note}`
      : snapshot.market?.notes?.[0] || "行情平稳。";
    const facilities = snapshot.facilities?.facilities?.slice(0, 4).map((facility) => `
      <span>${T.escapeHtml(facility.name)} Lv.${facility.level} · ${facility.condition}/100</span>
    `).join("") || `<span>设施待盘点</span>`;
    const bids = snapshot.contractBids?.length
      ? snapshot.contractBids.slice(0, 3).map((bid) => `<span>${T.escapeHtml(bid.buyer)} ${T.escapeHtml(bid.cropName)} · 第 ${bid.dueDay} 日</span>`).join("")
      : `<span>暂无公开招标</span>`;

    panel.innerHTML = `
      <div class="town-state-head">
        <h3>农场状态</h3>
        <span>${T.escapeHtml(snapshot.seasonLabel)} · Day ${snapshot.day}</span>
      </div>
      <p class="town-state-weather">${T.escapeHtml(weather)}</p>
      <div class="town-state-grid">
        <div>
          <strong>作物</strong>
          <div class="state-chip-list">${fields}</div>
        </div>
        <div>
          <strong>合同</strong>
          <div class="state-chip-list">${contracts}</div>
        </div>
        <div>
          <strong>市场</strong>
          <div class="state-chip-list">
            <span>${T.escapeHtml(market)}</span>
          </div>
        </div>
        <div>
          <strong>设施</strong>
          <div class="state-chip-list">${facilities}</div>
        </div>
        <div>
          <strong>招标</strong>
          <div class="state-chip-list">${bids}</div>
        </div>
        <div>
          <strong>账本</strong>
          <div class="state-chip-list">
            <span>现金 YSC ${snapshot.ledger.cashYsc}</span>
            <span>账务 ${snapshot.ledger.accountingTransparency}/100</span>
            <span>高金依赖 ${snapshot.ledger.goldkinDependency}/100</span>
          </div>
        </div>
      </div>
    `;
  }

  T.townStatePanel = {
    version: "town-state-panel-v0.1.0-local",
    render
  };
}());
