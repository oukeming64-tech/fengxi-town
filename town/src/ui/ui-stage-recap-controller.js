(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  function create({ engine, el, villagerNameById, openStageDrawer }) {
    let openState = false;
    let activeEvaluationId = "";
    let returnFocus = null;

    function stageEvaluationById(id) {
      return (engine.state.stageEvaluations || []).find((item) => item.id === id) || null;
    }

    function setStageRecapBackgroundInert(value) {
      [document.querySelector(".topbar"), document.querySelector(".main-grid"), el.modelConfigPanel].forEach((node) => {
        if (!node) return;
        if (value) node.setAttribute("inert", "");
        else node.removeAttribute("inert");
      });
      document.body.classList.toggle("has-stage-recap", value);
    }

    function render() {
      const evaluation = stageEvaluationById(activeEvaluationId);
      if (!evaluation) openState = false;
      const conversationRecap = evaluation
        ? T.stageRecapData?.conversationRecapFor?.(engine.state, evaluation.id)
          || T.stageRecapData?.ensureConversationRecap?.(engine.state, evaluation)
        : null;
      T.stageRecapPanel?.render?.({
        panel: el.stageRecapPanel,
        eyebrow: el.stageRecapEyebrow,
        title: el.stageRecapTitle,
        lead: el.stageRecapLead,
        content: el.stageRecapContent
      }, evaluation, conversationRecap, {
        open: openState,
        villagerNameById
      });
      setStageRecapBackgroundInert(openState);
    }


    function acknowledge(id) {
      if (!id) return;
      const acknowledged = engine.state.acknowledgedStageEvaluationIds || (engine.state.acknowledgedStageEvaluationIds = []);
      if (!acknowledged.includes(id)) acknowledged.push(id);
    }

    function open(id) {
      const evaluation = stageEvaluationById(id);
      if (!evaluation) return false;
      returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      activeEvaluationId = evaluation.id;
      T.stageRecapData?.ensureConversationRecap?.(engine.state, evaluation);
      openState = true;
      render();
      window.setTimeout(() => el.stageRecapContinue?.focus(), 0);
      return true;
    }

    function openPending() {
      const acknowledged = new Set(engine.state.acknowledgedStageEvaluationIds || []);
      const pending = (engine.state.stageEvaluations || []).find((item) => !acknowledged.has(item.id));
      return pending ? open(pending.id) : false;
    }

    function close(options = {}) {
      if (!openState) return;
      const id = activeEvaluationId;
      if (options.acknowledge !== false) acknowledge(id);
      openState = false;
      render();
      if (options.restoreFocus !== false) window.setTimeout(() => returnFocus?.focus?.(), 0);
    }

    function showDetails() {
      close({ restoreFocus: false });
      openStageDrawer("timeline");
      window.setTimeout(() => el.weeklyTimelinePanel?.querySelector?.(`[data-stage-recap-id="${activeEvaluationId}"]`)?.focus?.(), 0);
    }

    function trapFocus(event) {
      if (!openState || event.key !== "Tab") return false;
      const focusable = [...(el.stageRecapPanel?.querySelectorAll?.("button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])") || [])]
        .filter((node) => !node.hidden);
      if (!focusable.length) return false;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
        return true;
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
        return true;
      }
      return false;
    }

    function handleKeyDown(event) {
      if (!openState) return false;
      if (event.key === "Escape") close();
      else trapFocus(event);
      return true;
    }

    return {
      render,
      open,
      openPending,
      close,
      showDetails,
      handleKeyDown,
      state: () => ({ open: openState, evaluationId: activeEvaluationId })
    };
  }

  T.uiStageRecapController = { create };
}());
