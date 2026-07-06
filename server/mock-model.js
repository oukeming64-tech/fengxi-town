function createMockModel({ makeCognitionIntentConversation }) {
  function makeMockActionOutput(payload) {
    const activityIds = (payload.actionLayer?.activities || [])
      .map((activity) => activity.id)
      .filter((id) => id && id !== "REST-01");
    const fallbackIds = activityIds.length ? activityIds : ["YF-03", "AC-01", "TC-03", "REST-01"];
    const pressureIds = ["YF-03", "AC-01", "CH-01", "GG-07", "TC-05", "REST-01"];
    const packetByResident = new Map((payload.cognition?.perceptionPackets || []).map((packet) => [packet.residentId, packet]));
    const allMemoryIds = (payload.cognition?.memoryStream?.nodes || []).map((node) => node.id);
    const intentModes = ["gift", "appreciate", "help", "talk", "wait", "avoid"];
    const replacementByMode = {
      gift: "TC-07",
      appreciate: "CH-06",
      help: "YF-15",
      talk: "TC-12",
      wait: "SR-12",
      avoid: "MF-06"
    };
    const plans = (payload.residents || []).slice(0, 30).map((resident, index) => {
      const tired = Number(resident.energy || 0) < 28 || Number(resident.health || 0) < 55;
      const packet = packetByResident.get(resident.id) || null;
      const targetResidentId = packet?.nearbyResidentIds?.[0] || payload.residents[(index + 1) % payload.residents.length]?.id || "";
      const evidenceMemoryIds = (packet?.retrievedMemoryIds?.length ? packet.retrievedMemoryIds : allMemoryIds).slice(0, 2);
      const mode = intentModes[index % intentModes.length];
      const first = tired ? "REST-01" : (pressureIds[index % pressureIds.length] || fallbackIds[index % fallbackIds.length]);
      const second = tired ? fallbackIds[(index * 3 + 5) % fallbackIds.length] || "AC-01" : replacementByMode[mode] || fallbackIds[(index * 3 + 5) % fallbackIds.length] || "AC-01";
      const third = tired ? "TC-03" : (fallbackIds[(index * 5 + 9) % fallbackIds.length] || "TC-03");
      return {
        residentId: resident.id,
        slots: [first, second, third],
        interactionIntent: targetResidentId && evidenceMemoryIds.length ? {
          targetResidentId,
          mode,
          slot: "afternoon",
          evidenceMemoryIds
        } : null,
        reflectionNote: targetResidentId ? `${resident.id}在镇上给${targetResidentId}留下了一句公开可见的候选记号。` : ""
      };
    });
    return {
      day: payload.actionControl?.day || 0,
      plans
    };
  }

  function makeMockOutput(payload) {
    const residents = payload.residents || [];
    const first = residents[0] || { id: "v01", name: "艾利" };
    const second = residents[1] || { id: "v02", name: "诺拉" };
    const third = residents[2] || { id: "v03", name: "米洛" };
    const logs = (payload.logs || []).slice(0, 3).map((log) => ({
      id: log.id,
      text: `${log.text.replace(/[。.!?]*$/, "")}，末了还把袖口上的草籽拍掉了。`
    }));
    const reportSections = (payload.report?.sections || []).slice(0, 2).map((section) => ({
      index: section.index,
      title: section.title,
      body: section.body ? `${section.body.replace(/[。.!?]*$/, "")}，公告板下那枚弯钉子也被人顺手敲平。` : ""
    }));
    return {
      logs,
      reportSections,
      shadow: {
        conversations: [{
          id: "mock-shadow-conv-1",
          title: "公告板下的两句话",
          place: payload.logs?.[0]?.place || "公共屋",
          residentIds: [first.id, second.id],
          evidenceLogIds: payload.logs?.[0]?.id ? [payload.logs[0].id] : [],
          lines: [
            { speakerId: first.id, text: "这张纸别贴歪了，雨一来，名字先花。" },
            { speakerId: second.id, text: "我拿根钉子补上。你别把梯子又忘在桥头。" },
            { speakerId: first.id, text: "忘不了，梯脚上还沾着昨天的泥。" }
          ],
          note: "只取公告板和桥头的公开痕迹。"
        }, {
          id: "mock-shadow-conv-2",
          title: "账页旁边",
          place: payload.logs?.[1]?.place || "会计协会办公室",
          residentIds: [second.id, third.id],
          evidenceLogIds: payload.logs?.[1]?.id ? [payload.logs[1].id] : [],
          lines: [
            { speakerId: second.id, text: "这行数字我不改，你自己看。" },
            { speakerId: third.id, text: "我看见了。铅笔灰都蹭到手背上了。" }
          ],
          note: "只写公开账页，不改账本。"
        }],
        weeklyReport: {
          weekId: payload.weekly?.weekId || "",
          immutableState: payload.weekly?.immutableState === true,
          title: `${payload.weekly?.range || "最近几天"}互动周报`,
          range: payload.weekly?.range || "",
          sections: [
            { title: "公共屋和桥头", body: "这几天人总往公告板和木桥两头跑，纸条换得勤，钉子也敲得勤。有人帮忙，有人绕开，留下来的都是看得见的脚印。" },
            { title: "账页和货架", body: "寄售货架旁的声音压低了些，账页上的铅笔印却更深。谁多拿了绳，谁少签了名，都还在纸上。" }
          ],
          hooks: ["明天公告板上那张招标纸可能会被重新排位置。"]
        },
        riskNotes: [
          { type: "conflict", residentIds: [first.id, second.id], summary: "两人围着公告板同一张纸停得久，适合继续观察，不写成结论。" }
        ]
      }
    };
  }

  function makeMockInteractionOutput(payload) {
    const residents = payload.residents || [];
    const first = residents[0] || { id: "v01", name: "艾利" };
    const second = residents[1] || { id: "v02", name: "诺拉" };
    const third = residents[2] || { id: "v03", name: "米洛" };
    const cognitionConversation = makeCognitionIntentConversation(payload);
    if (cognitionConversation) {
      return {
        conversations: [{ ...cognitionConversation, id: "mock-interaction-cognition-1" }],
        riskNotes: [
          { type: "none", residentIds: cognitionConversation.residentIds, summary: "这段候选会话只展示公开小动作，不改关系数值。" }
        ]
      };
    }
    return {
      conversations: [{
        id: "mock-interaction-conv-1",
        title: "公告板下的钉子",
        place: payload.logs?.[0]?.place || "公共屋",
        residentIds: [first.id, second.id],
        evidenceLogIds: payload.logs?.[0]?.id ? [payload.logs[0].id] : [],
        lines: [
          { speakerId: first.id, text: "这张纸压住，风一吹名字就乱了。" },
          { speakerId: second.id, text: "我有钉子。你把梯脚往左挪半步。" },
          { speakerId: first.id, text: "左边是泥，别把鞋底也钉上去。" }
        ],
        note: "只根据本地日志生成候选短会话。"
      }, {
        id: "mock-interaction-conv-2",
        title: "账页边上",
        place: payload.logs?.[1]?.place || "会计协会办公室",
        residentIds: [second.id, third.id],
        evidenceLogIds: payload.logs?.[1]?.id ? [payload.logs[1].id] : [],
        lines: [
          { speakerId: second.id, text: "这行我圈出来了，不替你改。" },
          { speakerId: third.id, text: "我看见圈了。铅笔灰蹭到袖口上了。" }
        ],
        note: "会话不改变账本，只展示可观察互动。"
      }],
      riskNotes: [
        { type: "conflict", residentIds: [first.id, second.id], summary: "两人围着同一张公告纸停留较久，只作为候选观察线索。" }
      ]
    };
  }

  return {
    makeMockActionOutput,
    makeMockOutput,
    makeMockInteractionOutput
  };
}

module.exports = {
  createMockModel
};
