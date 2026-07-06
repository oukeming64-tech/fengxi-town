(function () {
  const T = window.MorningTown;

  const decisionLabels = {
    accepted: "采纳",
    downgraded: "降级",
    rejected: "拒绝",
    missing: "空缺计划"
  };

  function decisionLabel(value) {
    return decisionLabels[value] || "本地审核";
  }

  function countByDecision(plans) {
    return (plans || []).reduce((counts, plan) => {
      (plan.slots || []).forEach((slot) => {
        const key = slot.model?.decision || "missing";
        counts[key] = (counts[key] || 0) + 1;
      });
      return counts;
    }, {});
  }

  function summarize(control) {
    if (!control) return null;
    const plans = control.plans || [];
    const counts = countByDecision(plans);
    const slotTotal = Object.values(counts).reduce((sum, value) => sum + value, 0);
    const cognition = control.audit?.cognition || T.residentCognition?.summarizeIntents?.(control.interactionIntents || []) || null;
    return {
      day: control.day || control.audit?.day || 0,
      mode: control.audit?.mode || "resident-cognition-loop-local-audited",
      residentPlans: plans.length,
      slotPlans: slotTotal,
      accepted: counts.accepted || 0,
      downgraded: counts.downgraded || 0,
      rejected: counts.rejected || 0,
      missing: counts.missing || 0,
      cognition
    };
  }

  function publicPlanLine(plan) {
    const slots = (plan.slots || []).map((slot) => {
      const label = decisionLabel(slot.model?.decision);
      const intent = slot.model?.interactionIntent?.accepted
        ? `，${slot.model.interactionIntent.modeLabel}${slot.model.interactionIntent.targetName || slot.model.interactionIntent.targetResidentId}`
        : "";
      return `${slot.slot}：${slot.shortTitle || slot.title}（${label}${intent}）`;
    }).join("；");
    return `${plan.residentName}：${slots}`;
  }

  T.modelActionAudit = {
    version: "model-action-audit-v0.1.0-cognition-local",
    decisionLabels,
    decisionLabel,
    summarize,
    publicPlanLine
  };
}());
