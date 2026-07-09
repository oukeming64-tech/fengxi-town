(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  const noticeLabels = {
    fatigue: "疲劳",
    conflict: "摩擦",
    weather: "天气",
    contract: "合同",
    facility: "设施",
    accounting: "账务",
    none: "日常"
  };

  function residentNameById(id, options) {
    return options.villagerNameById?.(id) || id || "";
  }

  function renderConversation(conversation, options) {
    const place = conversation.place || "镇上";
    const lines = (conversation.lines || []).map((line) => `
      <p class="conversation-line">
        <b>${T.escapeHtml(line.speakerName || residentNameById(line.speakerId, options))}</b>
        <span>${T.escapeHtml(line.text || "")}</span>
      </p>
    `).join("");

    return `
      <article class="conversation-card">
        <div class="conversation-card-head">
          <h3>${T.escapeHtml(conversation.title || "镇上对话")}</h3>
          <span>${T.escapeHtml(place)}</span>
        </div>
        <div class="conversation-lines">${lines}</div>
      </article>
    `;
  }

  function renderNotice(note, options) {
    const residentNames = (note.residentIds || [])
      .map((id) => residentNameById(id, options))
      .filter(Boolean)
      .join("、");
    const label = noticeLabels[note.type] || "留意";
    return `
      <li>
        <strong>${T.escapeHtml(label)}</strong>
        <span>${T.escapeHtml(note.summary || "")}</span>
        ${residentNames ? `<em>${T.escapeHtml(residentNames)}</em>` : ""}
      </li>
    `;
  }

  function render(panel, engine, options = {}) {
    if (!panel) return;
    const llm = T.llm || {};
    const scene = llm.shadow || null;
    const conversations = (scene?.conversations || [])
      .map((conversation) => renderConversation(conversation, options))
      .join("");
    const notices = (scene?.riskNotes || [])
      .map((note) => renderNotice(note, options))
      .join("");

    if (!conversations && !notices) {
      const text = llm.busy && llm.status === "整理对话中"
        ? "居民短对话正在整理中。"
        : "打开外部文本并推进后，这里会出现根据今日小事整理出的居民短对话。";
      const softAlert = llm.lastError ? `<p class="conversation-alert">这次没有整理出可展示对话。</p>` : "";
      panel.innerHTML = `
        <div class="empty">${T.escapeHtml(text)}</div>
        ${softAlert}
      `;
      return;
    }

    panel.innerHTML = `
      ${conversations || `<div class="empty compact">这一天还没有可展示的居民短对话。</div>`}
      ${notices ? `
        <section class="conversation-card conversation-notices">
          <div class="conversation-card-head">
            <h3>留意的事</h3>
            <span>公开线索</span>
          </div>
          <ul>${notices}</ul>
        </section>
      ` : ""}
    `;
  }

  T.conversationPanel = {
    version: "conversation-panel-v0.1.0-local",
    render
  };
}());
