// Spoken numbers may use either script. Keep quantities paired with their units.
const digits = "零一二三四五六七八九";
function normalizeNumber(raw) {
  if (/^\d/.test(raw)) return String(Number(raw));
  const text = raw.replace(/两/g, "二").replace(/〇/g, "零");
  if (!/[十百千万]/.test(text)) return String(Number([...text].map((c) => digits.indexOf(c)).join("")));
  let total = 0, section = 0, digit = 0;
  for (const c of text) {
    if (c === "万") {
      total += (section + digit || 1) * 10000;
      section = digit = 0;
    } else if ("十百千".includes(c)) {
      section += (digit || 1) * ({ 十: 10, 百: 100, 千: 1000 })[c];
      digit = 0;
    } else digit = digits.indexOf(c);
  }
  return String(total + section + digit);
}

function quantities(text) {
  const compact = text.replace(/\s/g, "").replace(/％/g, "%");
  const matches = compact.matchAll(/(\d+(?:\.\d+)?|[零〇一二两三四五六七八九十百千万]+)(个季度|季度|单位|公斤|小时|分钟|元|块钱|天|周|斤|吨|袋|筐|箱|倍|%)|\d+(?:\.\d+)?/g);
  return [...matches].map(([raw, count, unit]) => count
    ? normalizeNumber(count) + unit.replace("个季度", "季度").replace("块钱", "元")
    : normalizeNumber(raw));
}

function words(text) {
  return text.normalize("NFKC").replace(/[\p{P}\p{Z}\s]/gu, "").toLowerCase();
}

function repeatsLine(text, recentLines) {
  const current = words(text);
  if (current.length < 8) return false;
  return recentLines.some((line) => {
    const past = words(line);
    const shorter = current.length < past.length ? current : past;
    const longer = current.length < past.length ? past : current;
    return shorter.length >= 8 && shorter.length >= longer.length * 0.8 && longer.includes(shorter);
  });
}

const stockReport = /(?:记|写|抄|标)(?:下|到|在|进|上)?(?:了|的)?(?:纸[的上]?[边角]|[便纸]条(?:的)?边(?:上)?|路单背面|旧信封背面)|(?:把|将)?(?:这点|这些|这个|这条|这份)?(?:消息|情况|信息|价差|行情)(?:先|再|给)?(?:带|捎|拿)回(?:到)?(?:农场|去)(?:再说|吧|就行)?/u;

function draftProblem(draft, scene, recentLines) {
  if (draft.evidenceId && !scene.evidence.some((e) => e.id === draft.evidenceId)) return "invalid_evidence";
  if (draft.anchor && (typeof draft.anchor !== "string" || !scene.evidence.some((e) => e.text.includes(draft.anchor)))) return "invalid_evidence";
  if (!Array.isArray(draft.lines) || ![2, 3].includes(draft.lines.length)) return "turn_count";
  if (!draft.lines.every((line, i) => line?.speakerId === scene.speakers[i % 2].id
    && typeof line.text === "string" && line.text.trim() && line.text.length <= 110)) return "speaker_or_text";
  const lines = draft.lines.map((line) => line.text.trim());
  // A previous conversation is a source of phrasing to avoid, never a source of new world facts.
  const evidence = scene.evidence.map((e) => e.text).join(" ");
  const established = new Set(quantities(evidence));
  const speech = lines.join(" ");
  if (["铅笔", "粉笔", "供应商", "订金", "包装规格"].some((detail) => speech.includes(detail) && !evidence.includes(detail))) return "unobserved_detail";
  if (lines.filter((line) => /写在纸上|备注在|夹进报价夹|翻到背面|记到本子上/.test(line)).length >= 2) return "procedural_exchange";
  const roadCondition = /(?:路况|路面)[^。！？]{0,16}(?:没变|畅通|封了|更差|还糟|更糟|一天一个样)/u;
  if (roadCondition.test(speech) && !roadCondition.test(evidence)) return "unobserved_detail";
  const damage = /颠坏|摔坏|压坏|撞坏|挤烂|摔烂/gu;
  if ([...speech.matchAll(damage)].some(([word]) => !evidence.includes(word))) return "unobserved_result";
  if (quantities(speech).some((quantity) => !established.has(quantity))) return "unsupported_quantity";
  const completedTrade = /(?:已经|刚刚|刚|总算|终于)(?:把[^，。！？]{0,10})?(成交|卖出|卖完|发货|收款|签下)/g;
  for (const [, result] of speech.matchAll(completedTrade)) {
    if (!evidence.includes(result) || /尚无公开成交|还在等第一批公开交易/.test(evidence) && result === "成交") return "unobserved_result";
  }
  if ((speech.match(/[“「]([^”」]+)[”」]/g) || []).some((quote) => !evidence.includes(quote.slice(1, -1)))) return "unsupported_quote";
  if (/(昨天|昨日|昨晚)/.test(speech) && !/(昨天|昨日|昨晚)/.test(evidence) && scene.previousDay !== scene.day - 1) return "unsupported_history";
  if (/(上次|上回)/.test(speech) && !/(上次|上回)/.test(evidence) && !scene.previousDay) return "unsupported_history";
  if (/(上周|上星期|前几天|前些天)/.test(speech) && !/(上周|上星期|前几天|前些天)/.test(evidence)) return "unsupported_history";
  const knownNames = new Set((scene.speakers.map((p) => p.name).join(" ") + " " + evidence).match(/\b[A-Z][a-z]+\b/g));
  if ((speech.match(/\b[A-Z][a-z]+\b/g) || []).some((name) => !knownNames.has(name))) return "unknown_name";
  for (const [i, line] of lines.entries()) {
    if (stockReport.test(line)) return "stock_report";
    if (repeatsLine(line, recentLines) || repeatsLine(line, lines.slice(0, i))) return "repeated_line";
    if (words(line).length >= 12 && words(evidence).includes(words(line))) return "copied_log";
  }
  return "";
}

module.exports = { draftProblem };
