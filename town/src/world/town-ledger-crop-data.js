(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  const cropModules = [
    T.townLedgerCropRootData,
    T.townLedgerCropLeafGrainData,
    T.townLedgerCropFruitData,
    T.townLedgerCropSpecialtyData
  ];
  const cropPlanData = T.townLedgerCropPlanData;

  cropModules.forEach((moduleData, index) => {
    if (!moduleData?.cropCatalog) throw new Error(`crop catalog module ${index + 1} must load before town-ledger-crop-data.js`);
  });
  if (!cropPlanData) throw new Error("town-ledger-crop-plan-data.js must load before town-ledger-crop-data.js");

  const cropCatalog = {};
  cropModules.forEach((moduleData) => {
    Object.entries(moduleData.cropCatalog).forEach(([id, crop]) => {
      if (cropCatalog[id]) throw new Error(`duplicate crop id in crop catalog: ${id}`);
      cropCatalog[id] = crop;
    });
  });

  T.townLedgerCropData = {
    version: "town-ledger-crop-data-v0.0.6-local",
    cropCatalog,
    defaultSoils: cropPlanData.defaultSoils,
    seasonCropPlans: cropPlanData.seasonCropPlans
  };
}());
