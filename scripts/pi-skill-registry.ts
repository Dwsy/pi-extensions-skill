#!/usr/bin/env bun
/**
 * pi-skill-registry.ts — Search, evaluate, install pi-packages from npm
 *
 * Usage:
 *   bun run pi-skill-registry.ts search [query]
 *   bun run pi-skill-registry.ts eval <package-name>
 *   bun run pi-skill-registry.ts install <package-name> [--as-skill] [--dry-run]
 *   bun run pi-skill-registry.ts discover
 *   bun run pi-skill-registry.ts list-installed
 */

const NPM_SEARCH = "https://registry.npmjs.org/-/v1/search";
const NPM_TARBALL = (name: string) =>
  `https://registry.npmjs.org/${name}/-/${name.split("/").pop()}`;
const EXT_DIR = process.env.HOME + "/.pi/agent/extensions";
const SKILL_DIR = process.env.HOME + "/.pi/agent/skills";

// ── Types ──────────────────────────────────────────────────────────

interface Pkg {
  name: string;
  version: string;
  description: string;
  keywords: string[];
  license: string;
  date: string;
  publisher: { username: string };
  links: { npm: string; repository?: string; homepage?: string; bugs?: string };
  dist?: { tarball: string; shasum?: string; integrity?: string };
}

interface Score {
  final: number;
  detail: { quality: number; popularity: number; maintenance: number };
}

interface PkgObj {
  package: Pkg;
  score: Score;
  downloads: { monthly: number; weekly: number };
  flags: { insecure: number };
}

interface EvalResult {
  name: string;
  version: string;
  total: number;
  grade: string;
  breakdown: Record<string, number>;
  downloads: { monthly: number; weekly: number };
  lastUpdate: string;
  ageDays: number;
  license: string;
  insecure: boolean;
}

// ── Colors / TUI helpers ───────────────────────────────────────────

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  white: "\x1b[37m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgRed: "\x1b[41m",
  bgBlue: "\x1b[44m",
};

function badge(score: number) {
  const g = score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : "D";
  const bg = g === "A" ? C.bgGreen : g === "B" ? C.bgBlue : g === "C" ? C.bgYellow : C.bgRed;
  return `${bg}${C.white} ${g} ${C.reset}`;
}

function gradeColor(score: number, s: string) {
  if (score >= 80) return `${C.green}${s}${C.reset}`;
  if (score >= 60) return `${C.cyan}${s}${C.reset}`;
  if (score >= 40) return `${C.yellow}${s}${C.reset}`;
  return `${C.red}${s}${C.reset}`;
}

function ageStr(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 86400000;
  if (d < 1) return "today";
  if (d < 2) return "yesterday";
  if (d < 30) return `${Math.floor(d)}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${(d / 365).toFixed(1)}y ago`;
}

function header(title: string) {
  console.log(`\n${C.bold}${C.cyan}━━━ ${title} ━━━${C.reset}\n`);
}

function pkgLine(p: PkgObj, ev: EvalResult) {
  const nameLen = 42;
  const displayName = p.package.name.length > nameLen
    ? p.package.name.slice(0, nameLen - 3) + "..."
    : p.package.name;
  const namePad = displayName.padEnd(nameLen);
  console.log(
    `  ${C.bold}📦 ${namePad}${C.reset} ${badge(ev.total)}  ${gradeColor(ev.total, ev.total.toFixed(1))}`
  );
  console.log(
    `     ${C.dim}${p.package.description || "no description"}${C.reset}`
  );
  console.log(
    `     ${C.dim}⬇ ${ev.downloads.weekly}/wk | 📅 ${ageStr(p.package.date)} | 📝 ${p.package.license || "?"} | 🔒 ${ev.insecure ? C.red + "INSECURE" + C.reset : C.green + "secure" + C.reset}${C.reset}`
  );
  console.log();
}

// ── Core logic ─────────────────────────────────────────────────────

async function npmSearch(keyword: string, size = 50, from = 0): Promise<PkgObj[]> {
  const text = keyword ? `keywords:pi-package+${encodeURIComponent(keyword)}` : "keywords:pi-package";
  const url = `${NPM_SEARCH}?text=${text}&size=${size}&from=${from}`;
  const res = await fetch(url, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`npm search HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json() as { total: number; objects: PkgObj[] };
  return data.objects;
}

async function npmInfo(name: string): Promise<PkgObj> {
  const url = `https://registry.npmjs.org/${encodeURIComponent(name)}`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`npm info HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json() as {
    name: string;
    "dist-tags": { latest: string };
    versions: Record<string, {
      description?: string;
      keywords?: string[];
      license?: string;
      dist: { tarball: string; shasum?: string; integrity?: string };
    }>;
    publisher?: { username: string; email?: string };
    time: Record<string, string>;
    links?: Record<string, string>;
  };
  const latest = data["dist-tags"]?.latest || "0.0.0";
  const v = data.versions[latest] || {};
  return {
    package: {
      name: data.name,
      version: latest,
      description: v.description || "",
      keywords: v.keywords || [],
      license: v.license || "",
      date: data.time[latest] || "",
      publisher: { username: data.publisher?.username || "unknown" },
      links: {
        npm: `https://www.npmjs.com/package/${data.name}`,
        repository: data.links?.repository,
        homepage: data.links?.homepage,
        bugs: data.links?.bugs,
      },
      dist: v.dist,
    },
    score: { final: 50, detail: { quality: 0.5, popularity: 0.5, maintenance: 0.5 } },
    downloads: { monthly: 0, weekly: 0 },
    flags: { insecure: 0 },
  };
}

async function npmDownloads(name: string): Promise<{ monthly: number; weekly: number }> {
  try {
    const url = `https://api.npmjs.org/downloads/point/last-month/${encodeURIComponent(name)}`;
    const res = await fetch(url);
    if (!res.ok) return { monthly: 0, weekly: 0 };
    const d = await res.json() as { downloads: number };
    return { monthly: d.downloads, weekly: Math.round(d.downloads / 4.3) };
  } catch {
    return { monthly: 0, weekly: 0 };
  }
}

function evaluate(pkg: PkgObj, query = ""): EvalResult {
  const ageDays = Math.max(0, (Date.now() - new Date(pkg.package.date).getTime()) / 86400000);

  const npmScore = Math.min(pkg.score.final / 100, 1) * 20;
  const dlMonthly = pkg.downloads.monthly || 0;
  const dlScore = Math.min(Math.log10(Math.max(dlMonthly, 1)) / 5, 1) * 20;
  const maintScore = Math.max(0, 1 - ageDays / 90) * 20;
  const hasRepo = pkg.package.links.repository ? 7 : 0;
  const hasDesc = (pkg.package.description?.length || 0) > 10 ? 8 : 0;
  const hasLicense = pkg.package.license ? 5 : 0;
  const relevant = query && pkg.package.keywords.some(
    k => k.toLowerCase().includes(query.toLowerCase())
  ) ? 15 : (query ? 0 : 15);
  const secure = pkg.flags.insecure === 0 ? 10 : 0;

  const total = npmScore + dlScore + maintScore + hasRepo + hasDesc + hasLicense + relevant + secure;
  const grade = total >= 80 ? "A" : total >= 60 ? "B" : total >= 40 ? "C" : "D";

  return {
    name: pkg.package.name,
    version: pkg.package.version,
    total: Math.round(total * 10) / 10,
    grade,
    breakdown: {
      "npm quality": Math.round(npmScore * 10) / 10,
      downloads: Math.round(dlScore * 10) / 10,
      maintenance: Math.round(maintScore * 10) / 10,
      metadata: Math.round((hasRepo + hasDesc + hasLicense) * 10) / 10,
      relevance: Math.round(relevant * 10) / 10,
      security: secure,
    },
    downloads: { monthly: dlMonthly, weekly: pkg.downloads.weekly || Math.round(dlMonthly / 4.3) },
    lastUpdate: pkg.package.date,
    ageDays: Math.floor(ageDays),
    license: pkg.package.license || "unknown",
    insecure: pkg.flags.insecure > 0,
  };
}

async function installPkg(name: string, asSkill = false, dryRun = false) {
  const info = await npmInfo(name);
  const tarball = info.package.dist?.tarball;
  if (!tarball) {
    console.error(`${C.red}✗ No tarball found for ${name}${C.reset}`);
    return;
  }

  const targetDir = asSkill
    ? `${SKILL_DIR}/${name.replace("@", "").replace("/", "-")}`
    : `${EXT_DIR}/${name.replace("@", "").replace("/", "-")}`;

  console.log(`\n${C.bold}📦 Installing ${name}@${info.package.version}${C.reset}`);
  console.log(`   ${C.dim}Target: ${targetDir}${C.reset}`);
  console.log(`   ${C.dim}Tarball: ${tarball}${C.reset}`);

  if (dryRun) {
    console.log(`${C.yellow}⏎ Dry run — no files written${C.reset}`);
    return;
  }

  // Download and extract
  const tmpTar = `/tmp/pi-pkg-${Date.now()}.tgz`;
  const res = await fetch(tarball);
  if (!res.ok) throw new Error(`Download HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  await Bun.write(tmpTar, buf);

  // Extract
  const { $ } = await import("bun");
  await $`mkdir -p ${targetDir}`.quiet();
  await $`tar xzf ${tmpTar} -C ${targetDir} --strip-components=1`.quiet();
  await Bun.file(tmpTar).exists() ? await $`rm ${tmpTar}`.quiet() : null;

  // If it's a skill, check for SKILL.md
  if (asSkill) {
    const hasSkillMd = await Bun.file(`${targetDir}/SKILL.md`).exists();
    if (!hasSkillMd) {
      console.log(`${C.yellow}⚠ No SKILL.md found — this package may not be a skill${C.reset}`);
    }
  }

  // If it's an extension, check for index.ts/index.js
  if (!asSkill) {
    const hasIndex = await Bun.file(`${targetDir}/index.ts`).exists()
      || await Bun.file(`${targetDir}/index.js`).exists()
      || await Bun.file(`${targetDir}/dist/index.js`).exists();
    if (!hasIndex) {
      console.log(`${C.yellow}⚠ No entry point found — this package may not be a pi extension${C.reset}`);
    }
    // Install deps if package.json exists
    const hasPkgJson = await Bun.file(`${targetDir}/package.json`).exists();
    if (hasPkgJson) {
      console.log(`   ${C.dim}Installing dependencies...${C.reset}`);
      try {
        await $`cd ${targetDir} && bun install`.quiet();
      } catch {
        console.log(`${C.yellow}⚠ bun install failed — may need manual dependency setup${C.reset}`);
      }
    }
  }

  console.log(`${C.green}✓ Installed to ${targetDir}${C.reset}`);
}

// ── Commands ───────────────────────────────────────────────────────

async function cmdSearch(query = "", size = 50, from = 0) {
  header(`Searching pi-packages${query ? ` for "${query}"` : ""}`);
  const pkgs = await npmSearch(query, size, from);
  if (!pkgs.length) {
    console.log(`${C.yellow}No results found.${C.reset}`);
    return;
  }

  console.log(`${C.dim}Found ${pkgs.length} packages${C.reset}\n`);

  // Fetch downloads in parallel
  const withDownloads = await Promise.all(
    pkgs.map(async p => {
      const dl = await npmDownloads(p.package.name);
      return { ...p, downloads: { ...p.downloads, ...dl } };
    })
  );

  // Evaluate and sort
  const evaluated = withDownloads
    .map(p => ({ pkg: p, ev: evaluate(p, query) }))
    .sort((a, b) => b.ev.total - a.ev.total);

  for (const { pkg, ev } of evaluated) {
    pkgLine(pkg, ev);
  }
}

async function cmdEval(name: string) {
  header(`Evaluating ${name}`);
  const info = await npmInfo(name);
  const dl = await npmDownloads(name);
  const pkg = { ...info, downloads: { ...info.downloads, ...dl } };
  const ev = evaluate(pkg);

  console.log(`  ${C.bold}Package:${C.reset}   ${ev.name}@${ev.version}`);
  console.log(`  ${C.bold}Grade:${C.reset}      ${badge(ev.total)}  ${gradeColor(ev.total, ev.total.toFixed(1))}/100`);
  console.log(`  ${C.bold}Description:${C.reset} ${pkg.package.description || "none"}`);
  console.log(`  ${C.bold}License:${C.reset}     ${ev.license}`);
  console.log(`  ${C.bold}Last update:${C.reset} ${ageStr(ev.lastUpdate)} (${ev.ageDays} days)`);
  console.log(`  ${C.bold}Downloads:${C.reset}   ${ev.downloads.monthly.toLocaleString()}/mo, ${ev.downloads.weekly.toLocaleString()}/wk`);
  console.log(`  ${C.bold}Security:${C.reset}    ${ev.insecure ? C.red + "⚠ FLAGGED" + C.reset : C.green + "✓ clean" + C.reset}`);
  console.log();

  console.log(`  ${C.bold}Score Breakdown:${C.reset}`);
  for (const [k, v] of Object.entries(ev.breakdown)) {
    const bar = "█".repeat(Math.round(v / 2)) + "░".repeat(Math.max(0, 50 - Math.round(v / 2)));
    console.log(`    ${k.padEnd(14)} ${gradeColor(v * 5, bar)} ${v.toFixed(1)}`);
  }

  if (pkg.package.links.repository) {
    console.log(`\n  ${C.bold}Repository:${C.reset}  ${pkg.package.links.repository}`);
  }
  console.log(`  ${C.bold}npm page:${C.reset}    ${pkg.package.links.npm}`);
}

async function cmdInstall(name: string, flags: { asSkill?: boolean; dryRun?: boolean }) {
  await installPkg(name, flags.asSkill ?? false, flags.dryRun ?? false);
}

async function cmdDiscover() {
  const readline = await import("readline");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const question = (q: string) => new Promise<string>(r => rl.question(q, r));

  try {
    const query = await question(`${C.bold}Search query (empty = all):${C.reset} `);
    const count = await question(`${C.bold}How many results? (default 25):${C.reset} `);
    const size = parseInt(count) || 25;

    header("Fetching packages...");
    const pkgs = await npmSearch(query || "", size, 0);

    const withDownloads = await Promise.all(
      pkgs.map(async p => {
        const dl = await npmDownloads(p.package.name);
        return { ...p, downloads: { ...p.downloads, ...dl } };
      })
    );

    const evaluated = withDownloads
      .map(p => ({ pkg: p, ev: evaluate(p, query) }))
      .sort((a, b) => b.ev.total - a.ev.total);

    console.log(`\n${C.bold}Results:${C.reset}\n`);
    evaluated.forEach(({ pkg, ev }, i) => {
      const idx = `${(i + 1).toString().padStart(2)}.`;
      console.log(`  ${C.bold}${idx} ${pkg.package.name.padEnd(38)}${badge(ev.total)} ${ev.total.toFixed(1)}`);
      console.log(`     ${C.dim}${pkg.package.description || ""}${C.reset}`);
    });

    console.log();
    const choice = await question(`${C.bold}Install # (or empty to skip):${C.reset} `);
    const idx = parseInt(choice) - 1;
    if (idx >= 0 && idx < evaluated.length) {
      const target = evaluated[idx].pkg.package.name;
      const mode = await question(`${C.bold}Install as (1=extension, 2=skill):${C.reset} `);
      const asSkill = mode.trim() === "2";
      await cmdInstall(target, { asSkill });
    } else {
      console.log(`${C.dim}Skipped.${C.reset}`);
    }
  } finally {
    rl.close();
  }
}

async function cmdListInstalled() {
  header("Installed Extensions");
  try {
    const { $ } = await import("bun");
    const extOut = await $`ls -1 ${EXT_DIR}`.quiet().text();
    const all = extOut.trim().split("\n").filter(Boolean);
    // Filter: only directories or .ts/.js files that look like extensions
    const exts: string[] = [];
    for (const e of all) {
      // Skip non-extension artifacts
      if (e === "node_modules" || e === "dist" || e === ".DS_Store") continue;
      if (e.endsWith(".html") || e.endsWith(".zip") || e.endsWith(".md") || e.endsWith(".lock")) continue;
      if (e === "CHANGELOG.md" || e === "README.md" || e === "shared") continue;
      exts.push(e);
    }
    if (exts.length) {
      for (const e of exts) {
        const pkgJson = `${EXT_DIR}/${e}/package.json`;
        let version = "";
        if (await Bun.file(pkgJson).exists()) {
          const pj = JSON.parse(await Bun.file(pkgJson).text());
          version = ` v${pj.version || "?"}`;
        }
        console.log(`  📦 ${e}${C.dim}${version}${C.reset}`);
      }
    } else {
      console.log(`  ${C.dim}(none)${C.reset}`);
    }
  } catch {
    console.log(`  ${C.dim}(none)${C.reset}`);
  }

  header("Installed Skills");
  try {
    const { $ } = await import("bun");
    const skillOut = await $`ls -1 ${SKILL_DIR}`.quiet().text();
    const skills = skillOut.trim().split("\n").filter(Boolean);
    if (skills.length) {
      for (const s of skills) {
        console.log(`  📖 ${s}`);
      }
    } else {
      console.log(`  ${C.dim}(none)${C.reset}`);
    }
  } catch {
    console.log(`  ${C.dim}(none)${C.reset}`);
  }
}

// ── CLI entry ──────────────────────────────────────────────────────

const args = process.argv.slice(2);
const cmd = args[0];

switch (cmd) {
  case "search":
    await cmdSearch(args.slice(1).join(" "));
    break;
  case "eval":
    if (!args[1]) { console.error("Usage: bun run pi-skill-registry.ts eval <package>"); process.exit(1); }
    await cmdEval(args[1]);
    break;
  case "install": {
    if (!args[1]) { console.error("Usage: bun run pi-skill-registry.ts install <package> [--as-skill] [--dry-run]"); process.exit(1); }
    const flags = { asSkill: args.includes("--as-skill"), dryRun: args.includes("--dry-run") };
    await cmdInstall(args[1], flags);
    break;
  }
  case "discover":
    await cmdDiscover();
    break;
  case "list-installed":
  case "list":
    await cmdListInstalled();
    break;
  case "help":
  case "--help":
  case "-h":
  default:
    console.log(`
${C.bold}pi-skill-registry${C.reset} — Search, evaluate & install pi-packages

${C.bold}USAGE:${C.reset}
  bun run pi-skill-registry.ts <command> [args]

${C.bold}COMMANDS:${C.reset}
  search [query]              Search npm for pi-packages
  eval <package>              Score a specific package (0-100, A-D grade)
  install <pkg> [flags]       Download and install as extension or skill
  discover                    Interactive search → select → install
  list-installed              Show installed extensions and skills
  help                        Show this help

${C.bold}FLAGS:${C.reset}
  --as-skill                  Install as skill (~/.pi/agent/skills/)
  --dry-run                   Show what would be installed without writing

${C.bold}EXAMPLES:${C.reset}
  bun run pi-skill-registry.ts search agent
  bun run pi-skill-registry.ts eval taskplane
  bun run pi-skill-registry.ts install taskplane
  bun run pi-skill-registry.ts install @codexstar/pi-pompom --as-skill
  bun run pi-skill-registry.ts discover
`);
    break;
}
