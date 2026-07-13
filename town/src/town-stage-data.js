(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  const hotspotData = T.townStageHotspotData;
  const actionData = T.townStageActionData;
  if (!hotspotData || !actionData) throw new Error("town stage data modules must load before town-stage-data");

  T.townStageData = {
    version: "town-stage-data-v0.1.5-local",
    ...hotspotData,
    ...actionData
  };
}());
