const fs = require("fs");
const path = require("path");

function loadLocalEnvFiles({ cwd = process.cwd(), appDir }) {
  const files = [
    path.join(cwd, ".env.local"),
    path.join(cwd, ".env"),
    path.join(appDir, ".env.local"),
    path.join(appDir, ".env")
  ];
  const seen = new Set();
  files.forEach((file) => {
    if (seen.has(file) || !fs.existsSync(file)) return;
    seen.add(file);
    const text = fs.readFileSync(file, "utf8");
    text.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) return;
      const name = match[1];
      if (process.env[name] !== undefined) return;
      let value = match[2].trim();
      if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      } else {
        value = value.replace(/\s+#.*$/, "");
      }
      process.env[name] = value.replace(/\\n/g, "\n");
    });
  });
}

module.exports = {
  loadLocalEnvFiles
};
