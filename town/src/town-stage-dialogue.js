(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  const version = "town-stage-dialogue-v0.2.3-layered-local";
  const importantTypes = new Set(["exclusion", "mediation", "alliance", "conflict"]);
  const motifs = Object.freeze({
    ambient: ["morning-greeting", "passing-greeting", "brief-greeting", "later-greeting"],
    exchange: ["work-handoff", "work-order", "work-check", "work-space", "work-backup", "work-return"],
    yesterday: ["yesterday-open", "yesterday-check", "yesterday-offer"],
    exclusion: ["exclusion-restart", "exclusion-order", "exclusion-hear-out"],
    mediation: ["mediation-open", "mediation-steps", "mediation-listen"],
    alliance: ["alliance-split", "alliance-checkpoint", "alliance-backup"],
    conflict: ["conflict-clarify", "conflict-listen", "conflict-reset"]
  });

  function firstName(value) {
    return String(value || "").trim().split(/\s+/u).filter(Boolean)[0] || "";
  }

  function pairKey(events) {
    return events.map((event) => String(event.residentId || "")).sort().join("|");
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean).map(String))];
  }

  function hash(value) {
    return [...String(value || "")].reduce((sum, character) => (
      ((sum * 31) + character.charCodeAt(0)) >>> 0
    ), 7);
  }

  function activity(event) {
    return String(event?.activityTitle || "手边这件事").trim() || "手边这件事";
  }

  function speakerLine(event, text) {
    return {
      speakerId: event.residentId,
      speakerName: event.residentName || event.residentId,
      text
    };
  }

  function replyWord(event) {
    return ({
      practical: "行",
      orderly: "好",
      sociable: "成啊",
      observant: "我留意着",
      bargaining: "先说好",
      daring: "成"
    })[event?.voiceProfileId] || "行";
  }

  function relationFor(events, options) {
    const key = pairKey(events);
    const day = Number(options.day || 1);
    const slot = String(options.slot || "");
    return (options.relationshipEvents || []).find((event) => {
      if (!event?.id || pairKey((event.residentIds || []).map((residentId) => ({ residentId }))) !== key) return false;
      if (Number(event.day) !== day || (event.slot && slot && event.slot !== slot)) return false;
      return importantTypes.has(event.type) || event.important === true;
    }) || null;
  }

  function priorFactFor(events, options) {
    const day = Number(options.day || 1);
    const ids = new Set(events.map((event) => event.residentId));
    return (options.priorLogs || []).find((log) => (
      log?.id && Number(log.day) === day - 1 && ids.has(log.residentId) && log.activityTitle
    )) || null;
  }

  function availableMotif(type, events, options) {
    const key = pairKey(events);
    const day = Number(options.day || 1);
    const used = new Set((options.previousEncounters || [])
      .filter((encounter) => {
        const samePair = pairKey((encounter.residentIds || []).map((residentId) => ({ residentId }))) === key;
        const historyDay = Number(encounter.day);
        return samePair && (!Number.isFinite(historyDay) || Math.abs(day - historyDay) <= 1);
      })
      .map((encounter) => encounter.motif)
      .filter(Boolean));
    const choices = (motifs[type] || motifs.exchange).filter((motif) => !used.has(motif));
    const pool = choices.length ? choices : (motifs[type] || motifs.exchange).map((motif, index) => `${motif}-${day}-${index + 1}`);
    return pool[(hash(`${day}|${options.slot}|${type}`) + Number(options.encounterIndex || 0)) % pool.length];
  }

  function ambientLines(events, motif) {
    const [speaker, target] = events;
    const name = firstName(target.residentName) || target.residentId;
    const text = {
      "morning-greeting": `早啊，${name}。`,
      "passing-greeting": `${name}，正好碰见你了。`,
      "brief-greeting": `${name}，忙你的，我就打个招呼。`,
      "later-greeting": `${name}，晚点见。`
    }[motif] || `${name}，碰上了就问声好。`;
    return [speakerLine(speaker, text)];
  }

  function exchangeLines(events, motif) {
    const [speaker, target] = events;
    const name = firstName(target.residentName) || target.residentId;
    const speakerActivity = activity(speaker);
    const targetActivity = activity(target);
    const sameActivity = speakerActivity === targetActivity;
    const targetPart = sameActivity ? "那一段" : targetActivity;
    const targetOwn = sameActivity ? "这一段" : targetActivity;
    const workPair = sameActivity ? `${speakerActivity}的前后两段` : `${speakerActivity}和${targetActivity}`;
    const backupWork = sameActivity ? "我顾前面，你顾后面" : `我顾${speakerActivity}，你顾${targetActivity}`;
    const okay = replyWord(target);
    const templates = {
      "work-handoff": [
        `${name}，我先忙${speakerActivity}。你忙完${targetPart}，来搭把手。`,
        `${okay}。我忙完${targetOwn}就过去。`
      ],
      "work-order": [
        `${name}，${workPair}别挤在一块。你先忙你的，我随后跟上。`,
        `${okay}。轮到${sameActivity ? "我" : speakerActivity}时叫我。`
      ],
      "work-check": [
        `${name}，你做${targetActivity}的时候喊我一声，我想再看一眼。`,
        `${okay}。你那边${speakerActivity}没收完，我就先不催。`
      ],
      "work-space": [
        `${name}，${speakerActivity}这边给我留点地方，东西先别挪。`,
        `${okay}。我做${targetActivity}，不碰你那一边。`
      ],
      "work-backup": [
        `${name}，${backupWork}。哪边先卡住就喊一声。`,
        `${okay}。先各忙各的，碰上难处再搭手。`
      ],
      "work-return": [
        `${name}，我先忙完${speakerActivity}，再来看看${targetPart}。`,
        `${okay}。我这边慢一点，不赶你的工。`
      ]
    };
    const texts = templates[motif] || [
      `${name}，我先顾${speakerActivity}，一会儿再找你。`,
      `${okay}。我在${targetActivity}这边等着。`
    ];
    return [speakerLine(speaker, texts[0]), speakerLine(target, texts[1])];
  }

  function yesterdayLines(events, prior, motif) {
    const priorResident = events.find((event) => event.residentId === prior.residentId) || events[0];
    const other = events.find((event) => event.residentId !== priorResident.residentId) || events[1];
    const name = firstName(priorResident.residentName) || priorResident.residentId;
    const priorActivity = String(prior.activityTitle || "那件事");
    const currentActivity = activity(priorResident);
    const templates = {
      "yesterday-open": [
        `${name}，昨天的${priorActivity}后来怎么样了？`,
        `我还没敢说稳。今天先做${currentActivity}，手边收住了再去看一遍。`
      ],
      "yesterday-check": [
        `${name}，昨天那项${priorActivity}，今天还要回头看吗？`,
        `要。我先把${currentActivity}做完，再过去。`
      ],
      "yesterday-offer": [
        `${name}，昨天你忙的${priorActivity}，要不要我跟着再看一眼？`,
        `先不用。我做完${currentActivity}，再来找你。`
      ]
    };
    const texts = templates[motif] || [
      `${name}，昨天的${priorActivity}还惦记着吗？`,
      `惦记着。我先做完${currentActivity}，再回去看。`
    ];
    return [speakerLine(other, texts[0]), speakerLine(priorResident, texts[1])];
  }

  function importantLines(events, relation, motif) {
    const actor = events.find((event) => event.residentId === relation.actorId) || events[0];
    const target = events.find((event) => event.residentId === relation.targetId) || events.find((event) => event !== actor) || events[1];
    const name = firstName(target.residentName) || target.residentId;
    const subject = String(relation.activityTitle || activity(actor));
    const templates = {
      "exclusion-restart": [`${name}，${subject}那件事，我刚才没接你的话。现在说清楚。`, "那就把先后顺序讲明白，别再把我搁在后面。"],
      "exclusion-order": [`${name}，刚才谈${subject}时，我把你的意见压下去了。我们重说一次。`, "可以。先说谁做什么，再说谁接手。"],
      "exclusion-hear-out": [`${name}，${subject}先别散。我刚才没让你把话说完。`, "那你先听完，再决定这事怎么排。"],
      "mediation-open": [`${name}，${subject}这件事，咱们把没说清的地方摊开。`, "行，先把各自要做的事讲明白。"],
      "mediation-steps": [`${name}，${subject}别一口气说到底。我们先对第一步。`, "好，第一步说定，再往后走。"],
      "mediation-listen": [`${name}，说到${subject}，这回我先听你讲完。`, "那我从刚才卡住的地方说。"],
      "alliance-split": [`${name}，${subject}照刚才分的做。我盯我这一段。`, "好，我做我的那一段，收尾时再碰头。"],
      "alliance-checkpoint": [`${name}，${subject}先各走一段，做到一半碰个头。`, "行，有变化就提前喊我。"],
      "alliance-backup": [`${name}，${subject}我先顶前面，你把后面接住。`, "成。你那边卡住，我就往前补。"],
      "conflict-clarify": [`${name}，${subject}刚才那句话听着不对，我们在这儿说清楚。`, "好，别替我下结论，先听我把话说完。"],
      "conflict-listen": [`${name}，说到${subject}，我刚才语气重了。你接着说。`, "我会说完，但你也得把你的打算讲明白。"],
      "conflict-reset": [`${name}，${subject}先停一下。咱们别隔着气做决定。`, "行，先把争的到底是哪一步说清楚。"]
    };
    const texts = templates[motif] || [`${name}，${subject}这件事要说清楚。`, "好，你先把打算讲明白。"];
    return [speakerLine(actor, texts[0]), speakerLine(target, texts[1])];
  }

  function baseEncounter(events, options, details) {
    const day = Number(options.day || 1);
    const key = pairKey(events);
    const x = events.reduce((sum, event) => sum + Number(event.x || 50), 0) / events.length;
    const y = events.reduce((sum, event) => sum + Number(event.y || 50), 0) / events.length;
    return {
      id: `local-dialogue-d${day}-${String(options.slot || "day")}-${key}-${details.motif}`,
      day,
      slot: options.slot || events[0]?.slot || "",
      dialogueType: details.dialogueType,
      motif: details.motif,
      archiveEligible: details.dialogueType === "important",
      title: details.title || "镇上的短交流",
      residentIds: events.map((event) => event.residentId),
      evidenceLogIds: unique(details.evidenceLogIds || []),
      hotspotId: String(events[0]?.hotspotId || ""),
      hotspotLabel: String(events[0]?.hotspotLabel || ""),
      x,
      y,
      lines: details.lines,
      source: "local-fact-dialogue"
    };
  }

  function buildEncounter(events, options, relation = null) {
    const currentEvidence = unique(events.map((event) => event.evidenceLogId));
    if (relation) {
      const type = importantTypes.has(relation.type) ? relation.type : "mediation";
      const motif = availableMotif(type, events, options);
      return baseEncounter(events, options, {
        dialogueType: "important",
        motif,
        title: `${relation.activityTitle || "这件事"} · ${relation.label || "需要说清"}`,
        evidenceLogIds: [relation.id, ...(relation.sourceLogIds || []), ...currentEvidence],
        lines: importantLines(events, relation, motif)
      });
    }
    const prior = currentEvidence.length === events.length ? priorFactFor(events, options) : null;
    if (prior) {
      const motif = availableMotif("yesterday", events, options);
      return baseEncounter(events, options, {
        dialogueType: "exchange",
        motif,
        evidenceLogIds: [...currentEvidence, prior.id],
        lines: yesterdayLines(events, prior, motif)
      });
    }
    if (currentEvidence.length === events.length) {
      const motif = availableMotif("exchange", events, options);
      return baseEncounter(events, options, {
        dialogueType: "exchange",
        motif,
        evidenceLogIds: currentEvidence,
        lines: exchangeLines(events, motif)
      });
    }
    const motif = availableMotif("ambient", events, options);
    return baseEncounter(events, options, {
      dialogueType: "ambient",
      motif,
      evidenceLogIds: [],
      lines: ambientLines(events, motif)
    });
  }

  function candidatePairs(events, options) {
    const groups = new Map();
    events.filter((event) => event?.residentId && event.hotspotId && !String(event.hotspotId).startsWith("home-"))
      .forEach((event) => {
        if (!groups.has(event.hotspotId)) groups.set(event.hotspotId, []);
        groups.get(event.hotspotId).push(event);
      });
    const pairs = [];
    [...groups.keys()].sort().forEach((hotspotId) => {
      const group = [...groups.get(hotspotId)].sort((left, right) => String(left.residentId).localeCompare(String(right.residentId)));
      const used = new Set();
      (options.relationshipEvents || []).forEach((relation) => {
        const pair = (relation?.residentIds || []).map((id) => group.find((event) => event.residentId === id)).filter(Boolean);
        if (pair.length !== 2 || pair.some((event) => used.has(event.residentId))) return;
        if (relationFor(pair, options)?.id !== relation.id) return;
        pairs.push({ events: pair, relation });
        pair.forEach((event) => used.add(event.residentId));
      });
      const remaining = group.filter((event) => !used.has(event.residentId));
      for (let index = 0; index + 1 < remaining.length; index += 2) {
        pairs.push({ events: remaining.slice(index, index + 2), relation: null });
      }
    });
    return pairs;
  }

  function makeEncounters(events, options = {}) {
    const limit = Math.max(0, Number(options.maxEncounters ?? 4));
    return candidatePairs(Array.isArray(events) ? events : [], options)
      .slice(0, limit)
      .map((candidate, encounterIndex) => buildEncounter(candidate.events, { ...options, encounterIndex }, candidate.relation));
  }

  T.townStageDialogue = {
    version,
    firstName,
    makeEncounters
  };
}());
