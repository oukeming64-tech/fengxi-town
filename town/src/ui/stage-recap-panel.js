(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  const axisLabels = Object.freeze({
    production: "生产与设施",
    ledgerHealth: "账本健康",
    communityTrust: "社区信任",
    laborFairness: "劳动公平",
    autonomy: "小镇自主性"
  });

  function pairCard(title, pair, kind, emptyText) {
    if (!pair) {
      return `<article class="stage-recap-pair is-empty"><span>${T.escapeHtml(title)}</span><p>${T.escapeHtml(emptyText)}</p></article>`;
    }
    const names = (pair.labels || pair.residentIds || []).join(" 与 ");
    const evidence = pair.evidence?.[0]?.summary || pair.lastInteraction?.summary || "这组关系来自本地互动账本。";
    return `
      <article class="stage-recap-pair is-${kind}" data-pair-id="${T.escapeHtml(pair.pairId || "")}">
        <span>${T.escapeHtml(title)}</span>
        <h4>${T.escapeHtml(names)}</h4>
        <div class="stage-recap-pair-metrics">
          <em>信任 ${Number(pair.trust || 0)}</em>
          <em>熟悉 ${Number(pair.familiarity || 0)}</em>
          <em>摩擦 ${Number(pair.friction || 0)}</em>
        </div>
        <p>${T.escapeHtml(evidence)}</p>
        <small>依据：${Number(pair.interactionCount || 0)} 条近期本地互动记录</small>
      </article>
    `;
  }

  function axesHtml(axes = {}) {
    return Object.entries(axisLabels).map(([key, label]) => {
      const value = Math.max(0, Math.min(100, Number(axes[key] || 0)));
      return `
        <div class="stage-recap-axis">
          <span>${T.escapeHtml(label)}</span>
          <div aria-hidden="true"><i style="width:${value}%"></i></div>
          <strong>${value}</strong>
        </div>
      `;
    }).join("");
  }

  function laborDetailHtml(detail) {
    const components = detail?.components || {};
    if (![components.workloadBalance, components.heavyWorkBalance, components.restAccess, components.sustainableWork].every(Number.isFinite)) return "";
    return `
      <p class="stage-recap-labor-note">
        <strong>劳动公平依据</strong>
        <span>分工均衡 ${components.workloadBalance} · 重活均衡 ${components.heavyWorkBalance} · 休息机会 ${components.restAccess} · 负担可持续 ${components.sustainableWork}</span>
      </p>
    `;
  }

  function pressureLabels(effects = {}) {
    const labels = [];
    if (effects.autonomyPressure === "high") labels.push("自主性压力偏高");
    else if (effects.autonomyPressure === "rebuild") labels.push("进入重建观察期");
    else labels.push("继续观察自主性");
    labels.push(effects.debtPressure === "high" ? "债务压力偏高" : "债务压力平稳");
    labels.push(effects.laborPressure === "high" ? "劳动压力偏高" : "劳动压力平稳");
    return labels;
  }

  function representativeHtml(item, villagerNameById) {
    const lines = (item.lines || []).map((line) => `
      <p><b>${T.escapeHtml(villagerNameById?.(line.speakerId) || line.speakerId)}</b><span>${T.escapeHtml(line.text)}</span></p>
    `).join("");
    return `
      <article class="stage-recap-conversation" data-conversation-id="${T.escapeHtml(item.id)}">
        <header><strong>${T.escapeHtml(item.title)}</strong><span>第 ${item.day} 天 · ${T.escapeHtml(item.place)}</span></header>
        ${lines}
      </article>
    `;
  }

  function conversationHtml(recap, villagerNameById) {
    if (!recap?.conversationCount) {
      return `
        <section class="stage-recap-section stage-recap-conversation-summary" data-conversation-count="0">
          <div class="stage-recap-section-head"><h3>模型对话回顾</h3><span>本地路径</span></div>
          <p class="stage-recap-empty">本阶段没有记录到已通过审核的模型对话。未开启外部文本时不会调用模型，也不会补写对话。</p>
        </section>
      `;
    }
    const topics = recap.topics.map((item) => `${item.label} ${item.count}`).join(" · ") || "日常碰面";
    const places = recap.topPlaces.map((item) => `${item.label} ${item.count}`).join(" · ") || "镇上各处";
    return `
      <section class="stage-recap-section stage-recap-conversation-summary" data-conversation-count="${recap.conversationCount}">
        <div class="stage-recap-section-head"><h3>模型对话回顾</h3><span>全部 ${recap.conversationCount} 段已审核对话</span></div>
        <p>覆盖 ${recap.residentCount} 位居民、${recap.pairCount} 个对话组合。话题主要是 ${T.escapeHtml(topics)}；常见地点是 ${T.escapeHtml(places)}。</p>
        <div class="stage-recap-conversations">
          ${recap.representatives.map((item) => representativeHtml(item, villagerNameById)).join("")}
        </div>
        <small>统计覆盖全部已存档对话；下方仅展示三段代表性原文。对话总结不会修改关系数值。</small>
      </section>
    `;
  }

  function render(elements, evaluation, conversationRecap, options = {}) {
    const panel = elements?.panel;
    if (!panel) return;
    const open = Boolean(options.open && evaluation);
    panel.hidden = !open;
    panel.setAttribute("aria-hidden", open ? "false" : "true");
    if (!open) return;
    const stageNumber = Math.max(1, Math.ceil(Number(evaluation.endDay || 60) / 60));
    const relationships = evaluation.relationshipHighlights || {};
    elements.eyebrow.textContent = `第 ${stageNumber} 阶段 · 第 ${evaluation.startDay}-${evaluation.endDay} 天`;
    elements.title.textContent = `${evaluation.grade} · ${evaluation.gradeName}`;
    elements.lead.textContent = `阶段平均 ${evaluation.average}/100。评价描述小镇状态，不评价具体居民，也不会结束模拟。`;
    panel.dataset.stageRecapId = evaluation.id;
    panel.dataset.grade = evaluation.grade;
    elements.content.innerHTML = `
      <section class="stage-recap-section stage-recap-score">
        <div class="stage-recap-grade" aria-label="阶段等级 ${T.escapeHtml(evaluation.grade)}"><strong>${T.escapeHtml(evaluation.grade)}</strong><span>${T.escapeHtml(evaluation.gradeName)}</span></div>
        <div class="stage-recap-axes">${axesHtml(evaluation.axes)}${laborDetailHtml(evaluation.laborFairnessDetail)}</div>
      </section>
      <section class="stage-recap-section" data-relationship-source="local-ledger">
        <div class="stage-recap-section-head"><h3>截至第 ${evaluation.endDay} 天的人际关系</h3><span>${Number(relationships.activePairCount || 0)} 组活跃关系</span></div>
        <div class="stage-recap-pairs">
          ${pairCard("最有默契的一组", relationships.mostTrusted, "trusted", "本阶段还没有足够的互动记录。")}
          ${pairCard("当前最需要磨合的一组", relationships.mostStrained, "strained", "本阶段没有形成明显紧绷关系。")}
        </div>
        <small>只读取本地关系账本；不根据普通对话文字推测感谢、好感、回避或敌意。</small>
      </section>
      ${conversationHtml(conversationRecap, options.villagerNameById)}
      <section class="stage-recap-section stage-recap-pressure">
        <div class="stage-recap-section-head"><h3>下一阶段压力</h3><span>继续生活</span></div>
        <div>${pressureLabels(evaluation.nextStageEffects).map((label) => `<span>${T.escapeHtml(label)}</span>`).join("")}</div>
      </section>
    `;
  }

  T.stageRecapPanel = {
    version: "stage-recap-panel-v0.1.8-e",
    render
  };
}());
