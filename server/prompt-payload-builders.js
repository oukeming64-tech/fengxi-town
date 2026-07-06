function createPromptPayloadBuilders({ compactCognition } = {}) {
  function compactActivity(activity) {
    return {
      id: activity.id,
      title: activity.title,
      zoneId: activity.zoneId,
      riskLevel: activity.riskLevel
    };
  }

  function compactResident(resident) {
    return {
      id: resident.id,
      name: resident.name,
      zone: resident.zone,
      health: resident.health,
      energy: resident.energy,
      recentAction: resident.recentAction ? {
        activityId: resident.recentAction.activityId || "",
        activityTitle: resident.recentAction.activityTitle || "",
        zone: resident.recentAction.zone || ""
      } : null
    };
  }

  function uniqueIds(values) {
    const seen = new Set();
    return values.filter((value) => {
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  }

  function compactRelationships(relationships) {
    if (!relationships) return null;
    return {
      summary: relationships.summary || "",
      summaryLines: (relationships.summaryLines || []).slice(0, 4),
      recentInteractions: (relationships.recentInteractions || []).slice(0, 6).map((item) => ({
        id: item.id,
        day: item.day,
        type: item.type,
        label: item.label,
        residentIds: item.residentIds,
        zoneId: item.zoneId,
        summary: item.summary
      })),
      tenseRelationships: (relationships.tenseRelationships || []).slice(0, 4).map((item) => ({
        residentIds: item.residentIds,
        trust: item.trust,
        friction: item.friction,
        tags: item.tags || item.allianceTags || []
      }))
    };
  }

  function compactActionCognition(cognition, residentIds) {
    const compact = typeof compactCognition === "function" ? compactCognition(cognition) : cognition;
    if (!compact) return null;
    const residents = new Set(residentIds);
    const residentScratch = (compact.residentScratch || [])
      .filter((scratch) => residents.has(scratch.residentId));
    const perceptionPackets = (compact.perceptionPackets || [])
      .filter((packet) => residents.has(packet.residentId));
    const memoryIds = new Set();
    residentScratch.forEach((scratch) => {
      (scratch.recentMemoryIds || []).forEach((id) => memoryIds.add(id));
    });
    perceptionPackets.forEach((packet) => {
      (packet.retrievedMemoryIds || []).forEach((id) => memoryIds.add(id));
    });
    const nodes = (compact.memoryStream?.nodes || [])
      .filter((node) => memoryIds.has(node.id))
      .slice(0, 32);

    return {
      ...compact,
      memoryStream: {
        ...(compact.memoryStream || {}),
        nodes
      },
      residentScratch,
      perceptionPackets,
      promptShape: {
        scopedToResidentIds: [...residents],
        memoryNodeCount: nodes.length,
        scratchCount: residentScratch.length,
        perceptionPacketCount: perceptionPackets.length
      }
    };
  }

  function compactTownStateSnapshot(snapshot) {
    if (!snapshot) return null;
    return {
      day: snapshot.day,
      seasonLabel: snapshot.seasonLabel,
      promptBrief: snapshot.promptBrief,
      ledger: snapshot.ledger ? {
        cashYsc: snapshot.ledger.cashYsc,
        debtYsc: snapshot.ledger.debtYsc,
        receivableYsc: snapshot.ledger.receivableYsc,
        payableYsc: snapshot.ledger.payableYsc,
        accountingTransparency: snapshot.ledger.accountingTransparency,
        goldkinDependency: snapshot.ledger.goldkinDependency,
        cooperativeTrust: snapshot.ledger.cooperativeTrust,
        townReputation: snapshot.ledger.townReputation
      } : null,
      facilities: {
        facilities: (snapshot.facilities?.facilities || []).slice(0, 6).map((facility) => ({
          name: facility.name,
          level: facility.level,
          condition: facility.condition,
          status: facility.status
        }))
      },
      contracts: (snapshot.contracts || []).slice(0, 6).map((contract) => ({
        label: contract.label,
        buyer: contract.buyer,
        cropName: contract.cropName,
        dueDay: contract.dueDay,
        status: contract.status
      })),
      risks: snapshot.risks ? {
        scores: snapshot.risks.scores,
        notes: (snapshot.risks.notes || []).slice(0, 4)
      } : null,
      relationships: compactRelationships(snapshot.relationships)
    };
  }

  function actionControlPayload(payload) {
    const residents = (payload.residents || []).slice(0, 30);
    const requiredResidentIds = payload.requiredResidentIds || residents.map((resident) => resident.id);
    const cognition = compactActionCognition(payload.cognition, requiredResidentIds);
    return {
      mode: "action-control",
      actionControl: {
        ...(payload.actionControl || {}),
        shard: payload.actionShard || null,
        variationSeed: payload.variationSeed || ""
      },
      world: payload.world,
      contract: payload.contract,
      scene: payload.scene,
      actionLayer: payload.actionLayer ? {
        version: payload.actionLayer.version,
        mode: payload.actionLayer.mode,
        zones: payload.actionLayer.zones,
        activities: (payload.actionLayer.activities || []).map(compactActivity)
      } : null,
      stateLayer: payload.stateLayer ? {
        version: payload.stateLayer.version,
        weather: payload.stateLayer.weather,
        snapshot: compactTownStateSnapshot(payload.stateLayer.snapshot)
      } : null,
      weekly: {
        weekId: payload.weekly?.weekId || "",
        range: payload.weekly?.range || "",
        ledgerDelta: payload.weekly?.ledgerDelta || null,
        debtSettlement: payload.weekly?.debtSettlement || null,
        stageEvaluations: payload.weekly?.stageEvaluations || []
      },
      residents: residents.map(compactResident),
      cognition,
      requiredResidentIds,
      rule: "Return candidate activity ids for requiredResidentIds. slots order is morning, afternoon, evening. interactionIntent and reflectionNote are optional candidates only; omit both unless evidenceMemoryIds and nearby target resident are exact. Local rules will audit before execution and fill the rest."
    };
  }

  function interactionPayload(payload) {
    const logs = (payload.logs || []).slice(-12);
    const hintIds = uniqueIds((payload.cognition?.acceptedInteractionIntents || [])
      .flatMap((intent) => [intent.residentId, intent.targetResidentId])
      .filter(Boolean));
    const involvedIds = uniqueIds([
      ...logs.map((log) => log.residentId).filter(Boolean),
      ...hintIds
    ]);
    const residents = (payload.residents || []);
    const focusedResidents = residents
      .filter((resident) => involvedIds.includes(resident.id))
      .slice(0, 8);
    const residentList = focusedResidents.length >= 2
      ? focusedResidents
      : residents.slice(0, 8);
    return {
      mode: "interaction-scenes",
      world: payload.world,
      contract: payload.contract,
      scene: payload.scene,
      residents: residentList.map(compactResident),
      stateLayer: payload.stateLayer ? {
        version: payload.stateLayer.version,
        weather: payload.stateLayer.weather,
        snapshot: payload.stateLayer.snapshot ? {
          day: payload.stateLayer.snapshot.day,
          seasonLabel: payload.stateLayer.snapshot.seasonLabel,
          ledger: payload.stateLayer.snapshot.ledger ? {
            cashYsc: payload.stateLayer.snapshot.ledger.cashYsc,
            debtYsc: payload.stateLayer.snapshot.ledger.debtYsc,
            accountingTransparency: payload.stateLayer.snapshot.ledger.accountingTransparency
          } : null,
          relationships: payload.stateLayer.snapshot.relationships ? {
            summary: payload.stateLayer.snapshot.relationships.summary,
            summaryLines: (payload.stateLayer.snapshot.relationships.summaryLines || []).slice(0, 3)
          } : null
        } : null
      } : null,
      logs,
      cognition: payload.cognition ? {
        acceptedInteractionIntents: (payload.cognition.acceptedInteractionIntents || []).slice(0, 8)
      } : null,
      weekly: {
        weekId: payload.weekly?.weekId || "",
        range: payload.weekly?.range || "",
        immutableState: payload.weekly?.immutableState === true,
        relationshipSummary: (payload.weekly?.relationshipSummary || []).slice(0, 3)
      },
      outputMustUseResidentIds: residentList.map((resident) => `${resident.id}=${resident.name}`),
      rule: "Use only supplied logs. Return compact JSON only. Do not rewrite facts."
    };
  }

  function shadowOnlyPayload(payload) {
    return {
      mode: "shadow-only",
      world: payload.world,
      contract: payload.contract,
      scene: payload.scene,
      residents: payload.residents,
      stateLayer: payload.stateLayer ? {
        version: payload.stateLayer.version,
        weather: payload.stateLayer.weather,
        snapshot: payload.stateLayer.snapshot ? {
          day: payload.stateLayer.snapshot.day,
          seasonLabel: payload.stateLayer.snapshot.seasonLabel,
          ledger: payload.stateLayer.snapshot.ledger,
          contractBids: payload.stateLayer.snapshot.contractBids,
          consignmentDisputes: payload.stateLayer.snapshot.consignmentDisputes,
          relationships: payload.stateLayer.snapshot.relationships
        } : null
      } : null,
      logs: (payload.logs || []).slice(0, 24),
      weekly: payload.weekly,
      outputMustUseResidentIds: (payload.residents || []).map((resident) => `${resident.id}=${resident.name}`)
    };
  }

  return {
    actionControlPayload,
    interactionPayload,
    shadowOnlyPayload
  };
}

module.exports = {
  createPromptPayloadBuilders
};
