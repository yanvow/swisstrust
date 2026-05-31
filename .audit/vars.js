const fs = require("fs"), path = require("path");
function walk(d) {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    return e.isDirectory() ? walk(p) : p.endsWith(".tsx") ? [p] : [];
  });
}
// vars defined in styles.css + globals.css
const defText = fs.readFileSync("public/styles.css", "utf8") + fs.readFileSync("app/globals.css", "utf8");
const defined = new Set((defText.match(/--[a-zA-Z0-9-]+(?=\s*:)/g) || []).map((s) => s.trim()));
const miss = new Map();
for (const f of walk("app")) {
  const src = fs.readFileSync(f, "utf8");
  // var(--x) references
  for (const m of src.matchAll(/var\((--[a-zA-Z0-9-]+)/g)) {
    const v = m[1];
    if (!defined.has(v)) {
      if (!miss.has(v)) miss.set(v, new Set());
      miss.get(v).add(f.replace(/\\/g, "/").replace(/^app\//, ""));
    }
  }
}
console.log("defined vars: " + [...defined].sort().join(" "));
console.log("\n=== var(--x) references with NO definition ===");
if (miss.size === 0) console.log("  (none — all referenced CSS vars are defined)");
for (const [v, files] of miss) console.log("  " + v.padEnd(16) + " :: " + [...files].join(", "));
