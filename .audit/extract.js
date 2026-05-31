const fs = require("fs"), path = require("path");
function walk(d) {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    return e.isDirectory() ? walk(p) : p.endsWith(".tsx") ? [p] : [];
  });
}
const defined = new Set(fs.readFileSync(".audit/css_defined.txt", "utf8").split("\n").filter(Boolean));
const legacy = new Set(fs.readFileSync(".audit/legacy_defined.txt", "utf8").split("\n").filter(Boolean));
const legacyOnly = new Set([...legacy].filter((c) => !defined.has(c)));
const used = new Map();
const allClassish = new Set();
const reStr = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|`([^`\\]*(?:\\.[^`\\]*)*)`/g;
for (const f of walk("app")) {
  const src = fs.readFileSync(f, "utf8");
  let m;
  while ((m = reStr.exec(src))) {
    const s = m[1] ?? m[2] ?? m[3] ?? "";
    for (const tokRaw of s.split(/[\s${}()[\],]+/)) {
      const tok = tokRaw.trim();
      if (/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(tok)) {
        if (tok.includes("-") || tok.includes("__")) allClassish.add(tok);
        if (defined.has(tok) || legacy.has(tok)) {
          if (!used.has(tok)) used.set(tok, new Set());
          used.get(tok).add(f.replace(/\\/g, "/").replace(/^app\//, ""));
        }
      }
    }
  }
}
const broken = [...used.keys()].filter((c) => legacyOnly.has(c)).sort();
console.log("=== BROKEN: defined ONLY in legacy <style>, still used by React ===");
for (const c of broken) console.log("  " + c.padEnd(24) + " :: " + [...used.get(c)].join(", "));
console.log("\nbroken count: " + broken.length);

const tw = /^(text|bg|border|rounded|shadow|flex|grid|gap|p[xytrbl]?|m[xytrbl]?|w|h|min|max|space|inset|top|left|right|bottom|z|opacity|font|leading|tracking|items|justify|self|order|col|row|object|overflow|whitespace|cursor|transition|duration|ease|translate|scale|rotate|origin|ring|divide|placeholder|hover|focus|active|disabled|group|peer|sm|md|lg|xl|aspect|backdrop|fill|stroke|sr|pointer|select|resize|list|align|underline|uppercase|lowercase|capitalize|truncate|line|antialiased|tabular)(-|$|:)/;
const orphanNoDef = [...allClassish].filter((c) => !defined.has(c) && !legacy.has(c) && !tw.test(c)).sort();
console.log("\n=== hyphenated tokens used but defined NOWHERE (review for typos / non-tailwind) ===");
for (const c of orphanNoDef) console.log("  " + c);
console.log("\nnowhere-defined count: " + orphanNoDef.length);
