(function () {
  const T = window.MorningTown;
  const location = window.location;
  const direct = /^https?:$/.test(location?.protocol) && !/^(?:localhost|127(?:\.\d+){3}|\[::1\])$/.test(location.hostname);

  async function request(operation, endpoint, payload) {
    if (direct) {
      const url = new URL("./assets/resident-ai.mjs?v=0.3.0", document.baseURI);
      const browser = await import(url.href);
      return browser.requestModel(operation, payload);
    }
    const response = await fetch(endpoint, payload === undefined ? undefined : {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "model_request_failed");
    return result;
  }

  T.modelTransport = { direct, request };
}());
