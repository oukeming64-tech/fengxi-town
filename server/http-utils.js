function createHttpUtils({ maxBodyBytes }) {
  function sendJson(res, statusCode, body) {
    res.writeHead(statusCode, {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    res.end(JSON.stringify(body));
  }

  function readBody(req) {
    return new Promise((resolve, reject) => {
      let size = 0;
      let raw = "";
      req.setEncoding("utf8");
      req.on("data", (chunk) => {
        size += Buffer.byteLength(chunk);
        if (size > maxBodyBytes) {
          reject(new Error("body_too_large"));
          req.destroy();
          return;
        }
        raw += chunk;
      });
      req.on("end", () => {
        try {
          resolve(raw ? JSON.parse(raw) : {});
        } catch (error) {
          reject(new Error("invalid_json"));
        }
      });
      req.on("error", reject);
    });
  }

  return {
    sendJson,
    readBody
  };
}

module.exports = {
  createHttpUtils
};
