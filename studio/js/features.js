function isLocalHomologationHost() {
  return [
    "localhost",
    "127.0.0.1",
    "::1"
  ].includes(globalThis.location?.hostname);
}

function isStudioProductionHost() {
  return [
    "dozedev.pt",
    "www.dozedev.pt"
  ].includes(globalThis.location?.hostname);
}

function isLocalFeatureEnabled(key) {
  if (!isLocalHomologationHost()) return false;

  const params = new URLSearchParams(globalThis.location?.search || "");
  if (params.get(key) === "true") return true;

  return globalThis.localStorage?.getItem(`DOZEDEV_FEATURE_${key}`) === "true";
}

export const FEATURES = {
  clientFoundationV2:
    isStudioProductionHost() ||
    isLocalFeatureEnabled("clientFoundationV2")
};
