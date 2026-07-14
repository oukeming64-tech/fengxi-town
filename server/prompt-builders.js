const { createPromptPayloadBuilders } = require("./prompt-payload-builders");

const worldSummary = {
  title: "枫溪镇：田地",
  year: 2006,
  residentCount: 30,
  currency: "YSC",
  source: "world-rules-v0.1-normalized",
  actionLayer: "activity-rules-v0.2-normalized",
  stateLayer: "town-ledger-v0.0.6-relationship-memory-local",
  weeklyTimeline: "weekly-timeline-v0.0.8-local-immutable",
  modelActionControl: "resident-cognition-loop-v0.1.0-local-audited"
};

function createPromptBuilders({ forbiddenWords, compactCognition } = {}) {
  const payloadBuilders = createPromptPayloadBuilders({ compactCognition });
  const blockedWords = Array.isArray(forbiddenWords) ? forbiddenWords : [];

  function buildActionMessages(payload) {
    return [
      {
        role: "system",
        content: [
          "你是枫溪镇的候选行动控制层。你可以为输入里的重点居民提出下一天行动日程，但不能直接改任何事实状态。",
          "必须只从输入 actionLayer.activities 中选择 activityId。不要编造活动、地点、居民、现金、债务、库存、关系数值、设施等级、合同结果或评价等级。",
          "只返回一个 JSON 对象，不要解释。对象里只有 plans 字段。plans 优先使用对象行：{residentId,slots:[morningActivityId,afternoonActivityId,eveningActivityId],interactionIntent,reflectionNote}；也兼容紧凑数组行。",
          "必须覆盖输入 requiredResidentIds 中的每个居民，每人只给一行。身体太差或不确定时用 REST-01。",
          "选择时要考虑天气、体力、健康、最近周快照压力、债务/合同压力、地点风险、居民最近行动、residentScratch 和 perceptionPackets。不要让所有人挤到同一个地点。",
          "如果 cognition.groupProfiles 非空，它是本地隐藏行为上下文。保持中心与成员各自角色、圈内互助优先和圈外普通求助降权，但不能在公开摘要中说出团体标签、排外机制或内部规则，也不能因此编造关系和事件。",
          "同一 shard 内要保持行动多样性：每个时段同一个 activityId 不要超过半数居民；至少使用 3 个地点；同一组三段日程不要给太多人重复；夜里不要让大多数居民都去同一个地点。",
          "interactionIntent 可选，字段固定为 {targetResidentId,mode,slot,evidenceMemoryIds}。mode 只能是 talk、wait、avoid、help、gift、appreciate。evidenceMemoryIds 必须来自输入 cognition.memoryStream.nodes 或该居民 perceptionPacket.retrievedMemoryIds。",
          "每个 shard 最多写 2 个 interactionIntent；不要为了达数量而编造互动。只在 targetResidentId 来自 nearbyResidentIds 且 evidenceMemoryIds 存在时使用；不满足时完全省略 interactionIntent 和 reflectionNote。",
          "gift 表示公开送一件小物，appreciate 表示表达好感或感谢；它们不能直接改关系数值，只能成为本地审核后的候选行动和后续候选会话来源。",
          "reflectionNote 只给带 interactionIntent 的居民；没有 interactionIntent 的居民不要写 reflectionNote。reflectionNote 只能是一句公开可观察摘要，不能写内心独白。",
          "如果 actionControl.shard.retry.reason 以 quality_ 开头，说明上一轮覆盖完整但行动过度集中、日程重复或互动证据无效；这时必须保留全部居民，同时换成更分散的 activityId。",
          "如果 actionControl.shard.retry.quality 存在，必须服从其中的上限：slotActivityCaps 里的 activityId 在对应 slot 不得超过 limit；eveningZoneCap 里的 zoneId 在夜里不得超过 limit；scheduleCap 里的三段日程不得超过 limit。",
          "质量重试时优先只返回 residentId 和 slots；除非证据 id 精确有效，不要写 interactionIntent 或 reflectionNote。",
          "如果 actionControl.shard.retry 存在且不是 quality_，说明上一轮分片 JSON 或居民覆盖不稳定；这时优先返回最小合法 JSON，只保留 residentId 和 slots，宁可少写 interactionIntent 也不要输出自然语言。",
          "同样的居民在不同天、不同 variationSeed 下应该有不同的候选选择；不要机械复制上一轮计划。",
          "本地 action-policy 会重新审核你的候选：可能采纳、降级、拒绝或改写。你的输出只是候选。",
          "\u4e0d\u80fd\u51fa\u73b0\u8fd9\u4e9b\u8bcd\uff1a" + blockedWords.join("\u3001") + "\u3002",
          "返回严格 JSON 对象，不要 Markdown，不要额外解释。",
          "JSON schema: {\"plans\":[{\"residentId\":\"v01\",\"slots\":[\"YF-03\",\"TC-07\",\"TC-03\"],\"interactionIntent\":{\"targetResidentId\":\"v02\",\"mode\":\"gift\",\"slot\":\"afternoon\",\"evidenceMemoryIds\":[\"mem-log-1\"]},\"reflectionNote\":\"v01在街口把一件小物递给v02。\"}]}"
        ].join("\n")
      },
      {
        role: "user",
        content: JSON.stringify(payloadBuilders.actionControlPayload(payload))
      }
    ];
  }

  function buildInteractionMessages(payload) {
    const lane = payload.interactionLane || null;
    const laneInstruction = lane?.instruction
      ? `本次只负责候选视角 ${Number(lane.index || 0) + 1}：${lane.instruction}`
      : "从最值得展示的已发生互动中选择一段。";
    const conversationCountRule = lane?.required
      ? "本路只生成 1 段 conversation。只要输入日志包含足够的两人事实，就必须选择最具体的一段；只有不足两名居民时才能返回空。"
      : "只生成 0 或 1 段 conversation。找不到符合本视角且有明确证据的事件时返回空 conversations，不要拿普通公告核对硬凑。";
    return [
      {
        role: "system",
        content: [
          "你是枫溪镇的互动场景层。你只根据已经发生的本地日志，生成可展示的候选会话和风险提示。",
          laneInstruction,
          "不要润色日志，不要写日报，不要写周报，不要改任何事实状态或数值。",
          `${conversationCountRule} 只写 2 到 3 句短对话。用证据里已有的具体物件和动作，不写心理诊断。`,
          "lines[].text 只能写角色真正说出口的话；不要写舞台说明，不要用‘姓名+动作+冒号+引号’把旁白塞进台词。",
          "不要把某个物件或句式当成固定口头禅。纸条、任务表、账页、杯子等只有证据确实需要时才写；小黑板、传真纸、路单、同一种作物报价和热饭也不能连续充当对话中心。同一段里优先抓住人物之间真正发生的回应。",
          "每位居民的 voiceStyle 只约束说话节奏和关注点。让两个人听起来不同，但不能把 tag、voiceStyle 或性格标签直接说出口，也不能据此新增事实。",
          "摩擦或排挤对话必须说清被搁置的具体任务、物件或安排，不能只说‘这边的’‘另一套说法’。",
          "每段 conversation 必须使用输入里的 residentId，必须绑定 1 到 3 个 evidenceLogIds，且证据日志必须包含 conversation 任一 residentId；speakerId 必须是 conversation residentIds 里的 v01 这类 id。",
          "note 只描述公开可见的动作，不得解释候选视角，不得出现团体、圈内、圈外、中心人物、成员或“符合某种场景”等分析性措辞。",
          "如果输入 cognition.acceptedInteractionIntents 里有 gift 或 appreciate，优先围绕已发生日志写一段送小礼或表达好感的公开短会话，但不能写关系数值变化。",
          "riskNotes 最多 1 条公开可观察风险，不能把猜测写成结论。",
          "\u4e0d\u80fd\u51fa\u73b0\u8fd9\u4e9b\u8bcd\uff1a" + blockedWords.join("\u3001") + "\u3002",
          "返回严格 JSON，不要 Markdown，不要额外解释。",
          "JSON schema: {\"conversations\":[{\"id\":\"...\",\"title\":\"...\",\"place\":\"...\",\"residentIds\":[\"v01\",\"v02\"],\"evidenceLogIds\":[\"log-id\"],\"lines\":[{\"speakerId\":\"v01\",\"text\":\"...\"},{\"speakerId\":\"v02\",\"text\":\"...\"}],\"note\":\"...\"}],\"riskNotes\":[{\"type\":\"fatigue|conflict|weather|contract|facility|accounting|none\",\"residentIds\":[\"v01\"],\"summary\":\"...\"}]}"
        ].join("\n")
      },
      {
        role: "user",
        content: JSON.stringify(payloadBuilders.interactionPayload(payload))
      }
    ];
  }

  function buildMessages(payload, purpose = "full") {
    if (purpose === "action-control") return buildActionMessages(payload);
    if (purpose === "interaction-scenes") return buildInteractionMessages(payload);
    const shadowOnly = purpose === "shadow-only";
    return [
      {
        role: "system",
        content: [
          "\u4f60\u662f\u67ab\u6eaa\u9547\u7684\u6a21\u578b\u5f71\u5b50\u5c42\uff0c\u53ea\u4e3a\u672c\u5730\u89c4\u5219\u63d0\u4f9b\u6587\u672c\u5019\u9009\u3002",
          "\u4e16\u754c\u662f\u300a\u67ab\u6eaa\u9547\uff1a\u9ec4\u77f3\u519c\u573a\u300b\uff1a2006 \u5e74\u7684\u7f8e\u56fd\u5185\u9646\u5c71\u8c37\u5c0f\u9547\uff0c30 \u4f4d\u533f\u540d\u5c45\u6c11\uff0c\u4f7f\u7528 YSC \u505a\u519c\u573a\u5185\u90e8\u8bb0\u8d26\u3002",
          "\u672c\u5730\u89c4\u5219\u5df2\u7ed3\u7b97\u5929\u6c14\u3001\u4f5c\u7269\u3001\u5e93\u5b58\u3001\u8bbe\u65bd\u3001\u52a0\u5de5\u719f\u7ec3\u5ea6\u3001\u5e02\u573a\u3001\u52a8\u6001\u62db\u6807\u3001\u5bc4\u552e\u3001\u5408\u540c\u3001\u5c45\u6c11\u4e92\u52a8\u3001\u73b0\u91d1\u6d41\u548c\u98ce\u9669\u3002\u4f60\u4e0d\u80fd\u6539\u4efb\u4f55\u4e8b\u5b9e\u72b6\u6001\u6216\u6570\u503c\u3002",
          "\u4f60\u53ef\u4ee5\u505a\u4e09\u4ef6\u4e8b\uff1a1. \u6da6\u8272\u5df2\u6709\u65e5\u5fd7\u548c\u5c0f\u62a5\uff1b2. \u6839\u636e\u5df2\u6709\u5c45\u6c11\u4e92\u52a8\u751f\u6210\u5019\u9009\u4f1a\u8bdd\uff1b3. \u6839\u636e\u672c\u5730\u5df2\u9501\u5b9a\u7684\u5468\u5feb\u7167\u751f\u6210\u5019\u9009\u5468\u62a5\u6587\u672c\u3002",
          "对话要有体温：使用输入证据里的具体物件和小动作兑现情绪，例如湿鞋、木桥上的钉子、门边的菜筐或刚放下的工具。不要机械复用同一种物件，不要用空心总结或道德审判。",
          "conversation.lines[].text 只能写角色真正说出口的话，不能写舞台说明或把角色姓名和动作包在引号外。",
          "如果居民带有 voiceStyle，只把它用在句子节奏和关注点上；不要复述 tag、voiceStyle 或性格标签，不要用风格提示编造事实。",
          "\u4e0d\u7f16\u9020\u65b0\u4e8b\u5b9e\uff1a\u53ea\u80fd\u4f7f\u7528\u8f93\u5165\u91cc\u5df2\u6709\u7684\u5c45\u6c11\u3001\u5730\u70b9\u3001\u884c\u52a8\u548c\u516c\u5f00\u7ed3\u679c\u3002\u4e0d\u589e\u52a0\u91d1\u5e01\u3001\u4f53\u529b\u3001\u5173\u7cfb\u6570\u503c\u6216\u5408\u540c\u7ed3\u679c\u3002",
          "每段候选 conversation 必须绑定 1 到 3 个 evidenceLogIds，且证据日志必须包含 conversation 任一 residentId；speakerId 必须属于 conversation residentIds。",
          "周报必须使用输入 weekly.weekId；weekly.immutableState 为 true 时，你只能写候选标题、段落和下周线索，不能改现金、债务、关系、设施、合同、评价等级或居民行动事实。",
          "候选会话的采纳、丢弃和重生成不在这次输出里实现，不要返回任何 accept、discard、regenerate 或可执行操作。",
          shadowOnly ? "\u8fd9\u6b21\u53ea\u751f\u6210 shadow\uff0c\u4e0d\u8981\u8fd4\u56de logs \u6216 reportSections\u3002\u5fc5\u987b\u8fd4\u56de\u81f3\u5c11 2 \u6bb5 conversations\u30012 \u6bb5 weeklyReport.sections \u548c 2 \u6761 riskNotes\u3002\u5bf9\u8bdd\u884c\u7684 speakerId \u5fc5\u987b\u4f7f\u7528 v01 \u8fd9\u6837\u7684 residentId\u3002" : "\u4f18\u5148\u5b8c\u6210 logs \u6da6\u8272\uff0c\u4f46 shadow.conversations\u3001shadow.weeklyReport.sections \u548c shadow.riskNotes \u4e0d\u80fd\u7559\u7a7a\u3002speakerId \u5fc5\u987b\u4f7f\u7528 v01 \u8fd9\u6837\u7684 residentId\u3002",
          "\u4e0d\u80fd\u51fa\u73b0\u8fd9\u4e9b\u8bcd\uff1a" + blockedWords.join("\u3001") + "\u3002",
          "\u4e0d\u8981\u4f7f\u7528\u73b0\u4ee3\u7ec4\u7ec7\u3001\u516c\u53f8\u3001\u8bfe\u5802\u3001\u7ba1\u7406\u6216\u5546\u4e1a\u8bdd\u8bed\u3002",
          "\u8fd4\u56de\u4e25\u683c JSON\uff0c\u4e0d\u8981 Markdown\uff0c\u4e0d\u8981\u989d\u5916\u89e3\u91ca\u3002",
          shadowOnly
            ? "JSON schema: {\"conversations\":[{\"id\":\"...\",\"title\":\"...\",\"place\":\"...\",\"residentIds\":[\"v01\",\"v02\"],\"evidenceLogIds\":[\"log-id\"],\"lines\":[{\"speakerId\":\"v01\",\"text\":\"...\"},{\"speakerId\":\"v02\",\"text\":\"...\"}],\"note\":\"...\"}],\"weeklyReport\":{\"weekId\":\"week-01\",\"immutableState\":true,\"title\":\"...\",\"range\":\"...\",\"sections\":[{\"title\":\"...\",\"body\":\"...\"}],\"hooks\":[\"...\"]},\"riskNotes\":[{\"type\":\"fatigue|conflict|weather|contract|facility|accounting|none\",\"residentIds\":[\"v01\"],\"summary\":\"...\"}]}"
            : "JSON schema: {\"logs\":[{\"id\":\"...\",\"text\":\"...\"}],\"reportSections\":[{\"index\":0,\"title\":\"...\",\"body\":\"...\",\"list\":[\"...\"]}],\"shadow\":{\"conversations\":[{\"id\":\"...\",\"title\":\"...\",\"place\":\"...\",\"residentIds\":[\"v01\",\"v02\"],\"evidenceLogIds\":[\"log-id\"],\"lines\":[{\"speakerId\":\"v01\",\"text\":\"...\"},{\"speakerId\":\"v02\",\"text\":\"...\"}],\"note\":\"...\"}],\"weeklyReport\":{\"weekId\":\"week-01\",\"immutableState\":true,\"title\":\"...\",\"range\":\"...\",\"sections\":[{\"title\":\"...\",\"body\":\"...\"}],\"hooks\":[\"...\"]},\"riskNotes\":[{\"type\":\"fatigue|conflict|weather|contract|facility|accounting|none\",\"residentIds\":[\"v01\"],\"summary\":\"...\"}]}}"
        ].join("\n")
      },
      {
        role: "user",
        content: JSON.stringify(shadowOnly ? payloadBuilders.shadowOnlyPayload(payload) : payload)
      }
    ];
  }

  function modelTuning(purpose) {
    return {
      "action-control": { temperature: 0.45, maxTokens: 2600 },
      "interaction-scenes": { temperature: 0.35, maxTokens: 1400 },
      "shadow-only": { temperature: 0.78, maxTokens: 2400 },
      full: { temperature: 0.82, maxTokens: 2800 }
    }[purpose] || { temperature: 0.78, maxTokens: 2400 };
  }

  return {
    actionControlPayload: payloadBuilders.actionControlPayload,
    buildMessages,
    interactionPayload: payloadBuilders.interactionPayload,
    modelTuning
  };
}

module.exports = {
  worldSummary,
  createPromptBuilders
};
