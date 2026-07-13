(function () {
  const T = window.MorningTown;
  const theme = T?.townStageFestivalTheme;
  if (!theme) throw new Error("town stage festival theme must load before festival map packages");

  theme.registerMapPackage({
    id: "seed-swap-map-v1",
    festivalId: "seed_swap",
    label: "换种日地图",
    mapAsset: "./assets/runtime/festivals/seed_swap/map.png",
    mapAlt: "枫溪镇换种日节日地图",
    aspectRatio: theme.defaultMapPackage.aspectRatio,
    coordinateContract: theme.coordinateContract,
    hotspotIds: [...theme.defaultMapPackage.hotspotIds],
    routeVersion: theme.defaultMapPackage.routeVersion,
    activeZoneIds: ["yellowstoneFarm", "townCenter", "communityHall"],
    phases: ["active"]
  });

  theme.registerMapPackage({
    id: "rain-gutter-day-map-v1",
    festivalId: "rain_gutter_day",
    label: "清沟义工日地图",
    mapAsset: "./assets/runtime/festivals/rain_gutter_day/map.png",
    mapAlt: "枫溪镇清沟义工日节日地图",
    aspectRatio: theme.defaultMapPackage.aspectRatio,
    coordinateContract: theme.coordinateContract,
    hotspotIds: [...theme.defaultMapPackage.hotspotIds],
    routeVersion: theme.defaultMapPackage.routeVersion,
    activeZoneIds: ["yellowstoneFarm", "townCenter", "wetlands", "southRoad", "communityHall"],
    phases: ["active"]
  });

  theme.registerMapPackage({
    id: "harvest-festival-map-v1",
    festivalId: "harvest_festival",
    label: "丰收节地图",
    mapAsset: "./assets/runtime/festivals/harvest_festival/map.png",
    mapAlt: "枫溪镇秋季丰收节地图",
    aspectRatio: theme.defaultMapPackage.aspectRatio,
    coordinateContract: theme.coordinateContract,
    hotspotIds: [...theme.defaultMapPackage.hotspotIds],
    routeVersion: theme.defaultMapPackage.routeVersion,
    activeZoneIds: ["yellowstoneFarm", "townCenter", "communityHall", "goldkinStation"],
    phases: ["active"]
  });

  theme.registerMapPackage({
    id: "snowfall-festival-map-v1",
    festivalId: "snowfall_festival",
    label: "落雪节地图",
    mapAsset: "./assets/runtime/festivals/snowfall_festival/map.png",
    mapAlt: "枫溪镇冬季落雪节地图",
    aspectRatio: theme.defaultMapPackage.aspectRatio,
    coordinateContract: theme.coordinateContract,
    hotspotIds: [...theme.defaultMapPackage.hotspotIds],
    routeVersion: theme.defaultMapPackage.routeVersion,
    activeZoneIds: ["yellowstoneFarm", "townCenter", "communityHall", "southRoad"],
    phases: ["active"]
  });
}());
