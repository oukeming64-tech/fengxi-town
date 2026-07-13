(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  const actionAnimations = {
    idle: { label: "停留", cueClass: "cue-idle", tone: "quiet", sprite: { col: 2, row: 2 } },
    water: { label: "浇水", cueClass: "cue-water", tone: "farm", sprite: { col: 0, row: 0 } },
    field: { label: "野外", cueClass: "cue-field", tone: "farm", sprite: { col: 1, row: 0 } },
    repair: { label: "维修", cueClass: "cue-repair", tone: "repair", sprite: { col: 2, row: 0 } },
    carry: { label: "搬运", cueClass: "cue-carry", tone: "repair", sprite: { col: 3, row: 0 } },
    trade: { label: "采购", cueClass: "cue-trade", tone: "trade", sprite: { col: 0, row: 1 } },
    sell: { label: "售卖", cueClass: "cue-sell", tone: "trade", sprite: { col: 1, row: 1 } },
    notice: { label: "公告", cueClass: "cue-notice", tone: "notice", sprite: { col: 2, row: 1 } },
    audit: { label: "查账", cueClass: "cue-audit", tone: "notice", sprite: { col: 3, row: 1 } },
    chat: { label: "闲聊", cueClass: "cue-chat", tone: "social", sprite: { col: 0, row: 2 } },
    rest: { label: "归家", cueClass: "cue-rest", tone: "home", sprite: { col: 1, row: 2 } }
  };

  T.townStageActionData = {
    actionAnimations,
    residentSpriteAtlas: {
      columns: 6,
      rows: 5,
      residents: 30,
      source: "04_AI班级小镇/assets/runtime/resident-sprites/resident-sprite-sheet-v0.1.5.png",
      generatedWith: "imagegen-chroma-key-preserved-resident-grid"
    },
    actionCueAtlas: {
      columns: 4,
      rows: 3,
      source: "04_AI班级小镇/assets/runtime/action-cues/action-cue-atlas-v0.1.4.png",
      generatedWith: "imagegen-built-in-chroma-key"
    },
    desktopOnly: true
  };
}());
