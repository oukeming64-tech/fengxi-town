(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  const participationFactors = Object.freeze({
    lead: 1,
    join: 0.75,
    light: 0.35,
    ordinary: 0
  });

  const festivalProfiles = Object.freeze({
    seed_swap: Object.freeze({
      label: "换种日",
      preparing: Object.freeze({
        base: Object.freeze({ "CH-04": 22, "TC-01": 12, "YF-13": 10, "YF-01": 8 })
      }),
      active: Object.freeze({
        base: Object.freeze({ "TC-07": 20, "TC-02": 18, "CH-08": 14, "CH-06": 12, "YF-13": 12 }),
        清晨: Object.freeze({ "YF-13": 10, "TC-01": 8, "CH-04": 8 }),
        午后: Object.freeze({ "TC-02": 12, "TC-07": 10, "CH-08": 8 }),
        夜里: Object.freeze({ "CH-06": 10, "TC-07": 8, "CH-10": 8 })
      }),
      cleanup: Object.freeze({
        base: Object.freeze({ "CH-04": 16, "YF-08": 10, "CH-11": 8 })
      })
    }),
    rain_gutter_day: Object.freeze({
      label: "清沟义工日",
      preparing: Object.freeze({
        base: Object.freeze({ "CH-04": 22, "YF-04": 12, "RW-03": 10, "CH-11": 8 })
      }),
      active: Object.freeze({
        base: Object.freeze({ "YF-04": 24, "RW-03": 22, "RW-06": 14, "CH-06": 10, "CH-04": 8 }),
        清晨: Object.freeze({ "RW-06": 10, "CH-04": 8 }),
        午后: Object.freeze({ "YF-04": 12, "RW-03": 12 }),
        夜里: Object.freeze({ "CH-06": 12, "CH-10": 8 })
      }),
      cleanup: Object.freeze({
        base: Object.freeze({ "CH-04": 16, "YF-08": 10, "CH-11": 8 })
      })
    }),
    harvest_festival: Object.freeze({
      label: "丰收节",
      preparing: Object.freeze({
        base: Object.freeze({ "CH-04": 28, "YF-09": 16, "CH-11": 12, "YF-06": 10 })
      }),
      active: Object.freeze({
        base: Object.freeze({ "CH-08": 24, "CH-06": 16, "CH-10": 12, "TC-07": 10, "YF-06": 14, "YF-09": 14 }),
        清晨: Object.freeze({ "YF-06": 12, "YF-09": 8, "CH-04": 8 }),
        午后: Object.freeze({ "CH-08": 14, "TC-07": 10, "CH-06": 8 }),
        夜里: Object.freeze({ "CH-10": 18, "CH-06": 12, "TC-07": 8 })
      }),
      cleanup: Object.freeze({
        base: Object.freeze({ "CH-04": 20, "YF-09": 14, "CH-11": 10, "AC-01": 8 })
      })
    }),
    snowfall_festival: Object.freeze({
      label: "落雪节",
      preparing: Object.freeze({
        base: Object.freeze({ "CH-04": 26, "CH-11": 14, "TC-02": 10, "CH-10": 6 })
      }),
      active: Object.freeze({
        base: Object.freeze({ "CH-10": 24, "TC-07": 18, "CH-06": 14, "CH-08": 10, "CH-04": 8 }),
        清晨: Object.freeze({ "CH-04": 12, "CH-11": 8, "TC-02": 6 }),
        午后: Object.freeze({ "TC-07": 12, "CH-08": 8, "CH-06": 8 }),
        夜里: Object.freeze({ "CH-10": 20, "TC-07": 12, "CH-06": 12 })
      }),
      cleanup: Object.freeze({
        base: Object.freeze({ "CH-04": 18, "CH-11": 12, "AC-01": 8 })
      })
    })
  });

  function stableHash(value) {
    return [...String(value || "")].reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) >>> 0, 2166136261);
  }

  function participationFor(villager, festival) {
    if (!festival?.festivalId) return "ordinary";
    const seed = `${villager?.id || "resident"}:${festival.festivalId}:${festival.startDay || 1}`;
    const bucket = stableHash(seed) % 10;
    if (bucket < 2) return "lead";
    if (bucket < 6) return "join";
    if (bucket < 8) return "light";
    return "ordinary";
  }

  function activityWeight(profile, phase, slot, activityId) {
    const phaseProfile = profile?.[phase];
    if (!phaseProfile) return 0;
    return Number(phaseProfile.base?.[activityId] || 0) + Number(phaseProfile[slot]?.[activityId] || 0);
  }

  function contextFor(villager, rawCtx = {}) {
    const townState = rawCtx.townState || rawCtx.state?.townState || {};
    const festival = T.townStageFestivalTheme?.festivalPhaseForState?.({
      day: townState.day || rawCtx.day || 1,
      seasonKey: townState.seasonKey || rawCtx.seasonKey || "spring"
    });
    const profile = festivalProfiles[festival?.festivalId] || null;
    if (!profile || festival.phase === "none") return null;
    const participation = participationFor(villager, festival);
    return Object.freeze({
      festivalId: festival.festivalId,
      festivalName: festival.festivalName,
      phase: festival.phase,
      slot: String(rawCtx.slot || "清晨"),
      participation,
      participationFactor: participationFactors[participation],
      source: "local-festival-calendar-and-audited-activity-policy",
      immutableState: true
    });
  }

  function scoreActivity(villager, activity, rawCtx = {}) {
    const festivalContext = contextFor(villager, rawCtx);
    if (!festivalContext || !activity?.id || festivalContext.participationFactor <= 0) return 0;
    const profile = festivalProfiles[festivalContext.festivalId];
    const weight = activityWeight(profile, festivalContext.phase, festivalContext.slot, activity.id);
    return Math.round(weight * festivalContext.participationFactor);
  }

  function auditFor(rawCtx = {}) {
    const townState = rawCtx.townState || rawCtx.state?.townState || {};
    const festival = T.townStageFestivalTheme?.festivalPhaseForState?.({
      day: townState.day || rawCtx.day || 1,
      seasonKey: townState.seasonKey || rawCtx.seasonKey || "spring"
    });
    const profile = festivalProfiles[festival?.festivalId] || null;
    return Object.freeze({
      festivalId: profile ? festival.festivalId : null,
      phase: profile ? festival.phase : "none",
      usesExistingActivitiesOnly: true,
      forcedResidentCount: 0,
      participationLevels: Object.freeze(Object.keys(participationFactors)),
      groupIdentityInput: false,
      source: "local-festival-calendar-and-audited-activity-policy",
      immutableState: true
    });
  }

  T.festivalResidentBehavior = {
    version: "festival-resident-behavior-v0.1.9-e",
    source: "local-festival-calendar-and-audited-activity-policy",
    festivalProfiles,
    participationFor,
    contextFor,
    scoreActivity,
    auditFor
  };
}());
