function addCounters(target, source) {
  Object.entries(source || {}).forEach(([key, value]) => {
    target[key] = (target[key] || 0) + Number(value || 0);
  });
  return target;
}

function returnedResidentIds(output) {
  return new Set((output.actionPlan?.plans || [])
    .map((plan) => plan.residentId)
    .filter(Boolean));
}

function missingResidentIds(output, requestedIds) {
  const returned = returnedResidentIds(output);
  return requestedIds.filter((id) => !returned.has(id));
}

function acceptedSlotPlans(output) {
  return Number(output.actionAudit?.accepted?.slotPlans || 0);
}

function expectedSlotPlans(requestedIds) {
  return requestedIds.length * 3;
}

function slotCoverageError(summary) {
  if (!summary.expectedSlotPlans) return "";
  if (summary.acceptedSlotPlans >= summary.expectedSlotPlans) return "";
  return "model_action_shard_incomplete_slots";
}

module.exports = {
  addCounters,
  returnedResidentIds,
  missingResidentIds,
  acceptedSlotPlans,
  expectedSlotPlans,
  slotCoverageError
};
