(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  const fieldLedger = T.townCropFieldLedger || {};
  const inventoryLedger = T.townCropInventoryLedger || {};

  const version = "town-crop-ledger-v0.0.6-local-facade";

  T.townCropLedger = {
    version,
    updateCrops: fieldLedger.updateCrops,
    harvestReadyCrops: fieldLedger.harvestReadyCrops,
    processInventory: inventoryLedger.processInventory
  };
}());
