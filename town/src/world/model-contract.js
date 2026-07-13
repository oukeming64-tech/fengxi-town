(function () {
  const T = window.MorningTown;

  T.modelContract = {
    version: "model-contract-v0.1.0-resident-cognition",
    residentCount: 30,
    modelRole: "枫溪镇模拟器和镇档案管理员的辅助层",
    currentMode: "resident-cognition-loop-local-audited",
    allowedInputs: [
      "日期、季节、天气、任务和公开事件",
      "居民随机英文姓名、槽位 id、地点、健康、体力、金币、背包和最近行动",
      "本地生成的居民 scratch、公开 memory stream 和 perception packet",
      "规范化世界规则摘要",
      "完整行动层活动 ID 字典、地点风险、劳动点和可见文案规则",
      "天气、作物、库存、设施、加工熟练度、市场、动态招标、寄售、合同、现金流和公开风险摘要",
      "压缩后的关系和风险摘要",
      "最新本地周快照压力、债务周结算和共同体阶段评价摘要"
    ],
    forbiddenInputs: [
      "现实姓名",
      "现实隐私",
      "现实敏感事件",
      "可一对一识别现实人物的材料",
      "未压缩的关系流水账",
      "API key 或本地环境变量"
    ],
    immutableState: [
      "金币",
      "健康",
      "体力",
      "库存",
      "加工批次",
      "设施等级",
      "设施状态",
      "加工熟练度",
      "作物数量",
      "市场行情",
      "动态招标状态",
      "寄售争议",
      "合同状态",
      "账务透明度",
      "周快照事实账本",
      "共同体阶段评价等级",
      "关系数值",
      "派系数值"
    ],
    forbiddenWords: [
      "\u73ed\u7ea7",
      "\u540c\u5b66",
      "\u73ed\u4e3b\u4efb",
      "\u5bfc\u5e08",
      "\u8bfe\u7a0b",
      "\u0045\u004d\u0042\u0041",
      "\u4f01\u4e1a",
      "\u91d1\u878d",
      "\u9879\u76ee",
      "\u4f9b\u5e94\u94fe",
      "\u804c\u4f4d",
      "\u66dd\u5149",
      "\u8d21\u732e",
      "\u751f\u6001"
    ],
    polishSchema: {
      logs: [{ id: "string", text: "string" }],
      reportSections: [{ index: 0, title: "string", body: "string", list: ["string"] }]
    },
    shadowSchema: {
      logs: [{ id: "string", text: "string" }],
      reportSections: [{ index: 0, title: "string", body: "string", list: ["string"] }],
      shadow: {
        conversations: [{
          id: "string",
          title: "string",
          place: "string",
          residentIds: ["v01", "v02"],
          evidenceLogIds: ["log-1"],
          lines: [{ speakerId: "v01", text: "string" }],
          note: "string"
        }],
        weeklyReport: {
          weekId: "week-01",
          immutableState: true,
          title: "string",
          range: "string",
          sections: [{ title: "string", body: "string" }],
          hooks: ["string"]
        },
        riskNotes: [{
          type: "fatigue | conflict | weather | contract | facility | accounting | none",
          residentIds: ["v01"],
          summary: "string"
        }]
      }
    },
    interactionSchema: {
      conversations: [{
        id: "string",
        title: "string",
        place: "string",
        residentIds: ["v01", "v02"],
        evidenceLogIds: ["log-1"],
        lines: [{ speakerId: "v01", text: "string" }],
        note: "string"
      }],
      riskNotes: [{
        type: "fatigue | conflict | weather | contract | facility | accounting | none",
        residentIds: ["v01"],
        summary: "string"
      }]
    },
    futureBatchPlanSchema: {
      plans: [{
        residentId: "v01",
        publicGoal: "string",
        slots: { morning: "activityId", afternoon: "activityId", evening: "activityId" },
        intention: "string",
        dialogueHint: "string",
        riskFlag: "fatigue | conflict | weather | contract | none"
      }],
      townNotes: ["string"]
    },
    actionControlSchema: {
      day: 1,
      plans: [{
        residentId: "v01",
        slots: ["YF-03", "TC-07", "TC-03"],
        interactionIntent: {
          targetResidentId: "v02",
          mode: "talk | wait | avoid | help | gift | appreciate",
          slot: "morning | afternoon | evening",
          evidenceMemoryIds: ["mem-log-1"]
        },
        reflectionNote: "string"
      }]
    },
    futureActionPlanSchema: {
      weatherPressure: "string",
      keyScenes: [{
        zoneId: "townCenter",
        activityIds: ["TC-01"],
        visibleSummary: "string"
      }],
      residents: [{
        residentId: "v01",
        mainActivityId: "YF-01",
        sideActivityId: "AC-07",
        visibleLine: "string",
        publicResult: "string",
        riskFlag: "fatigue | injury | weather | contract | conflict | none"
      }],
      tomorrowHooks: ["string"]
    },
    actionLayerRules: [
      "模型默认在行动控制链路里提出下一天居民候选活动日程，但不能写入最终事实状态",
      "模型必须只使用输入 actionLayer.activities 里存在的 activityId",
      "行动控制输出保持紧凑，只返回 residentId、清晨/午后/夜里三个 activityId、可选互动意图和可选公开反思候选",
      "interactionIntent 只能使用 talk、wait、avoid、help、gift、appreciate，必须绑定已存在的 evidenceMemoryIds",
      "本地 action-policy 必须重新校验体力、健康、地点风险和季节条件",
      "本地 resident-cognition guard 必须重新校验目标居民、地点、聊天冷却和证据记忆可见性",
      "本地审核可以采纳、拒绝、降级或改写模型候选，并记录公开审计摘要",
      "观察者可见文本只能写动作、对话、地点和公开结果，不显示底层动机",
      "内部行动理由只能用于审计和调试"
    ],
    stateLayerRules: [
      "本地状态账本按天气、市场、作物、加工、合同、居民行动、劳动结果、社交、账本和事件顺序结算",
      "模型可以读取公开状态摘要来润色日报，但不能改作物、设施、加工熟练度、市场、招标、寄售、库存、合同、现金流或风险数值",
      "合同库包含高金农业、城市餐厅、学校午餐、合作社、节日摊和寄售货架等渠道",
      "开局季节由观察者设置，作物和天气概率必须随季节变化",
      "动态招标、寄售争议、应收应付和设施升级由本地账本结算"
    ],
    shadowModeRules: [
      "模型可以生成候选会话、候选互动周报和风险提示，但只能引用本地日志、居民 id、地点和公开摘要",
      "候选会话必须通过本地 residentId、logId 和禁用词校验后才显示在页面",
      "通过证据校验并被页面采纳的候选会话可以进入当前六十天周期的本地对话归档，用于阶段回顾中的数量、主题和代表片段汇总",
      "默认推进链路先请求行动候选，本地审核结算后调用独立互动接口，只生成候选会话和风险提示，不再把行动、润色、周报塞进同一个长输出",
      "互动周报必须绑定本地周快照 weekId；模型只能润色或生成候选周报文本，不能改现金、债务、关系、设施、合同或居民行动事实",
      "对话归档和阶段对话汇总不能修改阶段等级、关系数值或事实账本，也不能从普通文字推测感谢、好感、回避或敌意",
      "候选会话的采纳、丢弃和重生成不属于当前模型输出可执行操作，页面只展示通过证据 guard 的候选文本",
      "key 只由本机桥接服务读取或接收，前端不持久化明文 key"
    ],
    cognitionRules: [
      "residentScratch、memoryNode 和 perceptionPacket 都由本地规则生成，模型不能自造居民 id、memory id、log id 或地点 id",
      "memory stream 只包含公开日志、公开关系互动、周快照和风险摘要，不输入现实姓名或未压缩私密材料",
      "reflectionNote 只是候选公开摘要，必须绑定真实日志或已存在记忆节点后才可能进入长期记忆",
      "gift 和 appreciate 可以成为本地审核后的候选行动与候选会话来源，但不能直接改关系数值或事实账本"
    ],
    weeklyTimelineRules: [
      "周报时间线由本地规则按 7 天生成 weekId、起止日、日志引用、账本快照和本地周报段落",
      "每条周记录 immutableState=true，后续模型输出只能作为候选文本附着展示",
      "债务利息从借债后满 30 天开始进入计息窗口；初始债务的 interestStartDay 为第 31 天",
      "共同体阶段评价从第 60 天开始，每 60 天由本地规则生成一次 A-E 等级",
      "劳动公平读取本周期本地劳动台账中的工作量分布、重活分布、休息机会和持续负担，不把同一批低体力或低健康事实重复扣分",
      "每次阶段评价完成后只自动弹出一次，并可从时间线重新查看；重置世界后重新计算",
      "阶段回顾中的关系亮点只读取本地关系账本及其互动证据；普通对话文字不参与关系判断",
      "阶段回顾中的模型对话摘要只汇总本周期已通过证据校验的会话，没有可用会话时显示明确的本地回退说明"
    ],
    audit: {
      normalizedAt: "2026-07-04",
      source: "local-world-rules",
      correction: "residentCount 固定为 30；v0.1.0 进入 Resident Cognition Loop，模型基于本地 scratch、公开记忆和感知包提出候选行动与互动意图，本地规则审核后才执行并继续锁定事实账本"
    }
  };
}());
