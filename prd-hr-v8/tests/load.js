// loads the framework in Node + helper to turn fixture JSON ("D:yyyy-mm-dd" strings) into Date objects
const path = require("path"), root = path.join(__dirname, "..");
["js/core/core.js", "js/data/schema.js", "js/data/providers.js", "js/services/core-services.js", "js/services/import-service.js", "js/services/seed-service.js", "js/services/hr-workflows.js", "js/legacy-adapter.js"].forEach((f) => require(path.join(root, f)));
const NS = globalThis.PRDHR;
NS.fixture = (file) => { const wb = JSON.parse(require("fs").readFileSync(file, "utf8")); for (const s of wb.sheets) s.rows = s.rows.map((r) => r.map((c) => (typeof c === "string" && /^D:\d{4}-\d\d-\d\d$/.test(c) ? new Date(+c.slice(2, 6), +c.slice(7, 9) - 1, +c.slice(10, 12)) : c))); return wb; };
module.exports = NS;
