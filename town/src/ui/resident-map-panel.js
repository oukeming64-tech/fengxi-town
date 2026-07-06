(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  function dotPosition(villager, index, total) {
    const seed = Number(String(villager.id || "").replace(/\D/g, "")) || index + 1;
    const cols = Math.min(5, Math.max(1, Math.ceil(Math.sqrt(total))));
    const rows = Math.max(1, Math.ceil(total / cols));
    const col = index % cols;
    const row = Math.floor(index / cols);
    const jitterX = ((seed * 13) % 7) - 3;
    const jitterY = ((seed * 17) % 7) - 3;
    const x = cols === 1 ? 50 : 14 + (col * 72) / (cols - 1);
    const y = rows === 1 ? 62 : 42 + (row * 42) / (rows - 1);
    return {
      x: T.clamp(Math.round(x + jitterX), 16, 84),
      y: T.clamp(Math.round(y + jitterY), 38, 86)
    };
  }

  function mapTokenPosition(villager, index, total, zone) {
    const local = dotPosition(villager, index, total);
    const bounds = zone.mapBounds || { left: 8, top: 8, width: 24, height: 24 };
    return {
      x: Math.round((bounds.left + (bounds.width * local.x) / 100) * 100) / 100,
      y: Math.round((bounds.top + (bounds.height * local.y) / 100) * 100) / 100
    };
  }

  function renderMap(container, engine, options = {}) {
    if (!container) return;
    const current = options.current || null;
    const noticeBoardOpen = Boolean(options.noticeBoardOpen);
    const noticeBoardAsset = options.noticeBoardAsset || T.assets.noticeBoard || "./assets/runtime/props/notice-board.png";
    const byZone = new Map(engine.zones.map((zone) => [zone.id, []]));
    engine.state.villagers.forEach((villager) => {
      const zoneId = byZone.has(villager.zone) ? villager.zone : "townCenter";
      byZone.get(zoneId).push(villager);
    });

    const labels = engine.zones.map((zone) => {
      const residents = byZone.get(zone.id) || [];
      const bounds = zone.mapBounds || { labelLeft: 10, labelTop: 10 };
      return `
        <div class="zone-marker" style="left: ${bounds.labelLeft}%; top: ${bounds.labelTop}%;">
          <span class="map-name">${T.escapeHtml(zone.name)}</span>
          <span class="map-count">${residents.length}</span>
        </div>
      `;
    }).join("");

    const tokens = engine.zones.map((zone) => {
      const residents = byZone.get(zone.id)
        .sort((a, b) => a.id.localeCompare(b.id));
      return residents.map((villager, index) => {
        const pos = mapTokenPosition(villager, index, residents.length, zone);
        const selected = current && current.id === villager.id ? " is-selected" : "";
        return `
          <button type="button" class="resident-token ${villager.recentAction?.kind || "quiet"}${selected}" data-villager-id="${T.escapeHtml(villager.id)}" style="left: ${pos.x}%; top: ${pos.y}%;" title="${T.escapeHtml(villager.name)} · ${T.escapeHtml(villager.recentAction?.place || engine.placeName(villager.location))}" aria-label="${T.escapeHtml(villager.name)}，${T.escapeHtml(zone.name)}">
            <img src="${T.escapeHtml(villager.avatar || T.residentAvatarPath(villager.id))}" alt="">
          </button>
        `;
      }).join("");
    }).join("");
    const boardLabel = noticeBoardOpen ? "公告板已打开" : "打开公告板：设施、招标、账务与居民互动";

    container.innerHTML = `
      <div class="map-visual" aria-label="枫溪镇像素地图">
        <img class="map-image" src="${T.escapeHtml(T.assets.townMap)}" alt="枫溪镇地图">
        <div class="map-shade" aria-hidden="true"></div>
        <div class="zone-marker-layer">${labels}</div>
        <div class="resident-token-layer">${tokens}</div>
        <div class="map-hotspot-layer">
          <button type="button" class="notice-board-hotspot${noticeBoardOpen ? " is-open" : ""}" data-notice-board="true" style="left: 52%; top: 61%;" aria-label="${T.escapeHtml(boardLabel)}" title="${T.escapeHtml(boardLabel)}">
            <img src="${T.escapeHtml(noticeBoardAsset)}" alt="">
            <span>公告板</span>
          </button>
        </div>
      </div>
    `;
  }

  function renderResidentCard(container, engine, options = {}) {
    if (!container) return;
    const villager = options.villager || null;
    if (!villager) {
      container.innerHTML = `<div class="empty compact">镇上还没有居民。</div>`;
      return;
    }

    const recent = villager.recentAction || {};
    const planItems = (villager.todayPlan?.slots || []).map((plan) => `
      <li>
        <span>${T.escapeHtml(plan.slot)}</span>
        <strong>${T.escapeHtml(plan.shortTitle)}</strong>
        <em>${T.escapeHtml(plan.zoneName)}</em>
      </li>
    `).join("");

    container.className = `resident-card ${recent.kind || "quiet"}`;
    container.innerHTML = `
      <div class="resident-card-head">
        <span class="resident-avatar"><img src="${T.escapeHtml(villager.avatar || T.residentAvatarPath(villager.id))}" alt=""></span>
        <div>
          <h3>${T.escapeHtml(villager.name)}</h3>
          <p>${T.escapeHtml(recent.zone || engine.zoneName(villager.zone))}</p>
        </div>
      </div>
      <div class="resident-facts">
        <span>地点 ${T.escapeHtml(recent.place || engine.placeName(villager.location))}</span>
        <span>背包 ${T.escapeHtml(T.storageSummary(villager.storage))}</span>
        <span>健康 ${villager.health}</span>
        <span>体力 ${villager.energy}</span>
        <span>金币 ${villager.coins}</span>
      </div>
      <p class="resident-action">${T.escapeHtml(recent.text || `${villager.name}今天还没留下新的行动。`)}</p>
      <div class="resident-plan">
        <div class="resident-plan-title">今日计划</div>
        <ol>${planItems}</ol>
      </div>
      <div class="resident-bars" aria-label="${T.escapeHtml(villager.name)} 的基础状态">
        <span style="--value: ${T.clamp(villager.health, 0, 100)}%;">健康</span>
        <span style="--value: ${T.clamp(villager.energy, 0, 100)}%;">体力</span>
        <span style="--value: ${T.clamp(villager.coins / 3, 0, 100)}%;">金币</span>
      </div>
    `;
  }

  T.residentMapPanel = {
    renderMap,
    renderResidentCard
  };
}());
