(function () {
  const town = {
    version: {
      code: "v0.1.9-e",
      name: "枫溪镇",
      status: "经典节日与居民参与"
    },
    assets: {
      townMap: "./assets/concept/map.png",
      residentSpriteSheet: "./assets/runtime/resident-sprites/resident-sprite-sheet-v0.1.5.png",
      residentAvatarDir: "./assets/runtime/residents",
      actionCueAtlas: "./assets/runtime/action-cues/action-cue-atlas-v0.1.4.png",
      actionCueDir: "./assets/runtime/action-cues",
      noticeBoard: "./assets/runtime/props/notice-board.png"
    },
    villagerFactories: []
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function shuffle(list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function chooseWeighted(entries) {
    const total = entries.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
    let cursor = Math.random() * total;
    for (const item of entries) {
      cursor -= Math.max(0, item.weight);
      if (cursor <= 0) return item.value;
    }
    return entries[entries.length - 1].value;
  }

  function storageSummary(storage) {
    const labels = [
      ["seeds", "种"],
      ["crop", "菜"],
      ["wood", "木"],
      ["stone", "石"],
      ["ore", "矿"],
      ["fish", "鱼"],
      ["meal", "饭"]
    ];
    return labels
      .filter(([key]) => storage[key] > 0)
      .map(([key, label]) => `${label}${storage[key]}`)
      .join(" ") || "空";
  }

  function residentAvatarPath(id) {
    const number = Number(String(id || "").replace(/\D/g, "")) || 1;
    return `${town.assets.residentAvatarDir}/v${String(number).padStart(2, "0")}.png`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function makeVillager(config) {
    return {
      id: "",
      name: "",
      home: "",
      tag: "",
      gender: "male",
      location: "home",
      health: 100,
      coins: 120,
      energy: 80,
      renown: 10,
      help: 10,
      favor: 0,
      standing: 10,
      distance: 0,
      storage: { seeds: 0, crop: 0, wood: 0, stone: 0, ore: 0, fish: 0, meal: 0 },
      traits: { work: 1, talk: 1, trade: 1, risk: 1, quiet: 1, order: 1 },
      decide() {
        return "home";
      },
      line() {
        return `${this.name}在住处整理了一会儿仓房。`;
      },
      ...config
    };
  }

  function registerVillager(factory) {
    town.villagerFactories.push(factory);
  }

  town.clamp = clamp;
  town.randomInt = randomInt;
  town.pick = pick;
  town.shuffle = shuffle;
  town.chooseWeighted = chooseWeighted;
  town.storageSummary = storageSummary;
  town.residentAvatarPath = residentAvatarPath;
  town.escapeHtml = escapeHtml;
  town.makeVillager = makeVillager;
  town.registerVillager = registerVillager;
  window.MorningTown = town;
}());
