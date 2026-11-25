const { talkAims } = require("./conversation-aims");
const { draftProblem } = require("./settled-dialogue-quality");

function dialogueMessages(input) {
  return [
    { role: "system", content: [
      "写发生在枫溪镇的几段当面对话。来找人的是 speakers[0]，另一位是 speakers[1]。各自的 activity 和 knows 是他们此刻能谈的材料。aim 如已给定，就由这个来意开口；没给来意时，想一想这个人何必特意找对方。",
      "两人说的是自然中文。各自都可以有点私心、好奇心或幽默感，允许对方没听懂、听懂却不肯，或随口接一茬。人可以在办事的地方闲聊，并不需要向读者汇报工作。有人求主意，有人想要一个准话，有人就想找个伴；同一批相遇各有各的说法，不强演冲突。",
      "每一句都要听得出接了前面哪句话。两句已经说完就停；还有一句非接不可才让发起者接回来。有用的试探、坦白不知道、婉拒和笑话都可以留。道具、手续和价格不关这两个人此刻的事，就让它们留在背景里。不要给每场配一句交代接下来该干什么的结尾。",
      "地点、物品、行情、日期和关系只用本场给出的材料。可以反问、提议和假设；别添已经成交、谁答应了、货在何处或两人以前有过什么事。lastMeeting 为空就不编旧情。称呼用 first name。只写说出口的话。",
      "开口就说想问或想要的那一句。一人只知道价差，就可以问贵不贵；知道谁在打听，不等于知道已经有买家。材料只提到路况，就问路好不好。把未知留给对方答，别替他编一段经历。每句话尽量一口气说完。",
      "同一场给两个独立的写法。第一段可以多聊一句；第二段只写一个短问题和一句直接回应，各不超过二十个汉字。两段开口的人都是 speakers[0]，接话的人都是 speakers[1]。",
      '只返回 {"conversations":[{"id":"相遇id","lines":[{"speakerId":"居民id","text":"对白"}]}]}。同一 id 最多给两段，首选在前。'
    ].join("\n") },
    { role: "user", content: JSON.stringify(input) }
  ];
}

function sceneFor(fact, residents) {
  const evidence = [{ id: fact.id, text: fact.text, residentIds: fact.residentIds }];
  const slots = { 清晨: 1, 午后: 2, 夜里: 3 };
  const slot = slots[fact.slot];
  for (const o of fact.observations || []) {
    if (!o.text || !fact.residentIds.includes(o.residentId) || o.id !== `log-d${fact.day}-s${slot}-${o.residentId}`) continue;
    const earlierToday = (o.earlierToday || []).filter((item) => item.activity && slots[item.slot] < slot
      && item.id === `log-d${fact.day}-s${slots[item.slot]}-${o.residentId}`);
    evidence.push({ id: o.id, residentId: o.residentId, activity: o.activity, text: o.text, terms: o.terms, earlierToday });
  }
  const prior = fact.previousMeeting;
  const sharedHistory = prior?.text && /^rel-(?:d\d+-v\d{2}-v\d{2}|\d+-\d+)$/.test(prior.id)
    && prior.day > 0 && prior.day < fact.day && prior.residentIds?.length === 2
    && fact.residentIds.every((id) => prior.residentIds.includes(id));
  if (sharedHistory) evidence.push({ id: prior.id, day: prior.day, text: prior.text, residentIds: prior.residentIds });
  return {
    id: fact.id, day: fact.day, place: fact.place, time: fact.slot, activity: fact.activityTitle, interaction: fact.kind,
    aim: fact.kind === "talk" && Object.hasOwn(talkAims, fact.talkAim) ? talkAims[fact.talkAim] : undefined,
    previousDay: sharedHistory ? prior.day : null, previous: sharedHistory ? prior : null, evidence,
    speakers: fact.residentIds.map((id) => ({ id, name: residents.get(id).name, voice: residents.get(id).voiceStyle }))
  };
}

// Build a writing brief from public facts, keeping the simulation's narrative voice out of the prompt.
function observedFacts(observation) {
  const text = observation.text;
  const vocabulary = [...(observation.terms || []), "路况", "水位", "交付日", "价差", "预算", "种子", "水渠", "轨道", "水质", "播种", "到期日"];
  const result = vocabulary.filter((word) => text.includes(word));
  for (const match of text.matchAll(/还差\s*(\d+)\s*单位/g)) result.push(`欠交量 ${match[1]} 单位`);
  for (const match of text.matchAll(/(?:还有\s*(\d+)\s*天到期|(?:离到期|交货|交付)(?:还[有剩]|只剩)\s*(\d+)\s*天)/g)) {
    result.push(`距交付 ${match[1] || match[2]} 天`);
  }
  if (/今天到期|明天到期|已经过了交付日/.test(text)) result.push(text.match(/今天到期|明天到期|已经过了交付日/)[0]);
  if (text.includes("不能同时答应所有开销")) result.push("各项支出需要排先后");
  if (/行情平稳|行情没有大起伏/.test(text)) result.push("行情平稳");
  if (text.includes("还在等第一批公开交易")) result.push("尚无公开成交");
  if (/问谁还要|打听.+行情/.test(text)) result.push("正在打听需求");
  if (/价钱.+留了余地/.test(text)) result.push("报价还有商量余地");
  return [...new Set(result)];
}

function writingBrief(scene) {
  const gift = scene.interaction === "gift"
    ? ["小鱼", "鱼", "种子", "布袋", "木楔", "热饭", "一把菜"].find((item) => scene.evidence[0].text.includes(item)) : undefined;
  return {
    id: scene.id, place: scene.place, time: scene.time, interaction: scene.interaction, gift, aim: scene.aim,
    speakers: scene.speakers.map((speaker) => {
      const note = scene.evidence.find((e) => e.residentId === speaker.id);
      return { ...speaker, activity: note?.activity || scene.activity, knows: observedFacts(note || scene.evidence[0]),
        earlierToday: note?.earlierToday?.map((e) => `${e.slot} · ${e.activity}`) };
    }),
    lastMeeting: scene.previous ? { day: scene.previous.day, place: scene.previous.place,
      activity: scene.previous.activity, interaction: scene.previous.kind } : null
  };
}

function earlierLogs(scene) {
  return scene.evidence.flatMap((note) => (note.earlierToday || [])
    .map((entry) => ({ ...entry, residentId: note.residentId, text: entry.activity })));
}

function citedIds(scene, lines) {
  const speech = lines.map((l) => l.text).join(" ");
  const prior = scene.previous && /昨天|昨日|昨晚|上次|上回/.test(speech) ? [scene.previous.id] : [];
  const earlier = earlierLogs(scene).filter((log) => speech.includes(log.activity)
    || (log.slot === "清晨" && /今早|早上|上午|早晨|清晨/.test(speech)) || (log.slot === "午后" && /午后|下午/.test(speech)));
  const current = scene.evidence.filter((e) => e.residentId);
  return [...new Set([scene.id, ...prior, ...earlier.map((e) => e.id), ...current.map((e) => e.id)])].slice(0, 4);
}

function mockDraft(scene) {
  const [a, b] = scene.speakers;
  return { id: scene.id, lines: [
    { speakerId: a.id, text: "你也在这儿啊。" }, { speakerId: b.id, text: "嗯。你说，我听着。" }
  ] };
}

async function writeSettledDialogue(payload, { callWithJsonFallback, guards, mockModel }) {
  const residents = guards.knownResidentMap(payload);
  const scenes = payload.logs.filter((log) => log.residentIds.length === 2 && log.residentIds[0] !== log.residentIds[1]
    && !["avoid", "wait"].includes(log.kind) && log.residentIds.every((id) => residents.has(id)))
    .slice(0, 3).map((fact) => sceneFor(fact, residents));
  const recentLines = [...(payload.recentLines || [])];
  let raw = {};
  if (scenes.length) {
    raw = mockModel ? { conversations: scenes.map(mockDraft) }
      : await callWithJsonFallback({ scenes: scenes.map(writingBrief) }, "settled-dialogue");
  }
  const drafts = Array.isArray(raw.conversations) ? raw.conversations : [];
  const accepted = { conversations: 0, riskNotes: 0, weeklySections: 0 };
  const rejected = {};
  const conversations = [];
  for (const scene of scenes) {
    for (const draft of drafts.filter((item) => item?.id === scene.id)) {
      const reason = draftProblem(draft, scene, recentLines)
        || (draft.lines.some((line) => !guards.safeVisibleText(line.text, 110)) ? "invalid_text" : "");
      if (reason) {
        rejected[reason] = (rejected[reason] || 0) + 1;
        continue;
      }
      conversations.push({ id: scene.id, title: scene.activity || scene.place, place: scene.place,
        residentIds: scene.speakers.map((p) => p.id), evidenceLogIds: citedIds(scene, draft.lines), lines: draft.lines });
      recentLines.push(...draft.lines.map((line) => line.text));
      break;
    }
  }
  const evidencePayload = { ...payload, logs: scenes.flatMap((s) => [...s.evidence, ...earlierLogs(s)]) };
  const shadow = guards.normalizeShadow({ conversations }, evidencePayload, residents, accepted);
  return { shadow, audit: { mode: "settled-dialogue", requested: scenes.length, accepted, rejected,
    model: raw.generationModel || null, mockModel, immutableState: true } };
}

module.exports = { dialogueMessages, writeSettledDialogue };
