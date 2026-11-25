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
    const sourceLabel = conversation.source === "local-important-dialogue" ? "本地事实" : "审核对话";
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
          <span>${T.escapeHtml(`${place} · ${sourceLabel}`)}</span>
        </div>
        <div class="conversation-lines">${lines}</div>
      </article>
    `;
  }

  function localImportantConversations(engine) {
    const playback = T.townStage?.currentPlayback?.(engine) || null;
    return (playback?.stages || []).flatMap((stage) => (stage.encounters || [])
      .filter((encounter) => encounter.dialogueType === "important" && encounter.archiveEligible)
      .map((encounter) => ({
        id: encounter.id,
        title: encounter.title || "值得留意的交谈",
        place: `${encounter.hotspotLabel || "镇上"} · ${stage.label || "当日"}`,
        residentIds: encounter.residentIds || [],
        evidenceLogIds: encounter.evidenceLogIds || [],
        lines: encounter.lines || [],
        source: "local-important-dialogue"
      })));
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
    const localConversations = localImportantConversations(engine);
    const conversations = [...localConversations, ...(scene?.conversations || [])]
      .map((conversation) => renderConversation(conversation, options))
      .join("");
    const notices = (scene?.riskNotes || [])
      .map((note) => renderNotice(note, options))
      .join("");

    if (!conversations && !notices) {
      const text = llm.busy && llm.status === "撰写对白中"
        ? "正在写今天的居民对白。"
        : "推进一天后，可以在这里回看居民的交谈。";
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
    version: "conversation-panel-v0.2.3-layered-local",
    localImportantConversations,
    render
  };
}());
