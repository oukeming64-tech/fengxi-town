(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  const modules = [
    T.townLedgerContractData,
    T.townLedgerMarketData,
    T.townLedgerFestivalData,
    T.townLedgerProcessingData
  ];
  if (modules.some((item) => !item)) throw new Error("town ledger economy data modules must load before the bundle");

  T.townLedgerEconomyData = Object.assign({
    version: "town-ledger-economy-data-v0.0.6-local"
  }, ...modules);
}());
