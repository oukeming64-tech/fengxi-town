(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  const contractBidsLedger = T.townContractBidsLedger || {};
  const consignmentLedger = T.townConsignmentLedger || {};
  const contractReportLedger = T.townContractReportLedger || {};
  const contractDeliveryLedger = T.townContractDeliveryLedger || {};
  const contractAccountingLedger = T.townContractAccountingLedger || {};

  function requireFunction(moduleName, moduleApi, name) {
    return moduleApi[name] || function () {
      throw new Error(`${moduleName} must load before town-contract-ledger.js`);
    };
  }

  T.townContractLedger = {
    version: "town-contract-ledger-v0.0.6-local-facade",
    updateContractBids: requireFunction("town-contract-bids-ledger.js", contractBidsLedger, "updateContractBids"),
    updateContracts: requireFunction("town-contract-delivery-ledger.js", contractDeliveryLedger, "updateContracts"),
    applyOperatingCosts: requireFunction("town-contract-accounting-ledger.js", contractAccountingLedger, "applyOperatingCosts"),
    applyAccountingEvents: requireFunction("town-contract-accounting-ledger.js", contractAccountingLedger, "applyAccountingEvents"),
    updateConsignmentDisputes: requireFunction("town-consignment-ledger.js", consignmentLedger, "updateConsignmentDisputes"),
    computeRisks: requireFunction("town-contract-report-ledger.js", contractReportLedger, "computeRisks"),
    triggerEvents: requireFunction("town-contract-report-ledger.js", contractReportLedger, "triggerEvents"),
    makeSettlement: requireFunction("town-contract-report-ledger.js", contractReportLedger, "makeSettlement"),
    finalizeCashFlow: requireFunction("town-contract-report-ledger.js", contractReportLedger, "finalizeCashFlow"),
    makeReportSections: requireFunction("town-contract-report-ledger.js", contractReportLedger, "makeReportSections"),
    inventoryTotals: requireFunction("town-contract-report-ledger.js", contractReportLedger, "inventoryTotals")
  };
}());
