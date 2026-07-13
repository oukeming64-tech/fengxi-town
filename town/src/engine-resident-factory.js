(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  function create({
    namePool,
    genderTargets,
    genderPlan,
    startingPositions,
    activityRules,
    actionRunner,
    placeName,
    zoneName
  }) {
    function normalizeGender(value) {
      return value === "female" ? "female" : "male";
    }

    function genderCounts(list) {
      return list.reduce((counts, item) => {
        const gender = normalizeGender(item.gender || item);
        counts[gender] = (counts[gender] || 0) + 1;
        return counts;
      }, { male: 0, female: 0 });
    }

    function validateGenderPlan() {
      const counts = genderCounts(genderPlan);
      if (genderPlan.length !== T.villagerFactories.length || counts.male !== genderTargets.male || counts.female !== genderTargets.female) {
        throw new Error(`Expected ${genderTargets.male} male and ${genderTargets.female} female resident slots, got ${counts.male} male and ${counts.female} female across ${genderPlan.length} slots.`);
      }
    }

    function makeName(used, gender) {
      const firstPool = namePool.first[normalizeGender(gender)] || namePool.first.male;
      for (let i = 0; i < 200; i += 1) {
        const name = `${T.pick(firstPool)} ${T.pick(namePool.last)}`;
        if (!used.has(name)) {
          used.add(name);
          return name;
        }
      }
      const fallback = `${T.pick(firstPool)} ${T.pick(namePool.last)} ${T.randomInt(10, 99)}`;
      used.add(fallback);
      return fallback;
    }

    function buildVillagers() {
      validateGenderPlan();
      const used = new Set();
      return T.villagerFactories.map((factory, index) => {
        const gender = normalizeGender(genderPlan[index]);
        const villager = factory(makeName(used, gender));
        villager.id = `v${String(index + 1).padStart(2, "0")}`;
        villager.gender = gender;
        villager.avatar = T.residentAvatarPath(villager.id);
        const start = startingPositions[index % startingPositions.length];
        actionRunner.assignPlace(villager, start.action, start.zone);
        villager.recentAction = {
          day: 1,
          slot: "清晨",
          place: placeName(start.action),
          zone: zoneName(villager.zone),
          activityId: activityRules.fallbackActivity?.id || "REST-01",
          activityTitle: activityRules.fallbackActivity?.title || "回小屋休息",
          text: `${villager.name}在${zoneName(villager.zone)}收拾今天要用的东西。`,
          deltas: [],
          kind: "quiet"
        };
        return villager;
      });
    }

    return { genderCounts, buildVillagers };
  }

  T.engineResidentFactory = { create };
}());
