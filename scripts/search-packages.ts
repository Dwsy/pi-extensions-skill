#!/usr/bin/env bun
/**
 * Search pi packages from npm registry
 * Usage: bun search-packages.ts [keyword]
 */

interface NpmPackage {
  name: string;
  description?: string;
  keywords?: string[];
  date: string;
  version: string;
  publisher?: { username?: string; email?: string };
  maintainers?: Array<{ username?: string; email?: string }>;
  links?: { npm?: string; repository?: string };
}

interface NpmSearchResult {
  objects: Array<{
    package: NpmPackage;
    downloads?: { monthly?: number };
  }>;
  total: number;
}

const SEARCH_API = "https://registry.npmjs.org/-/v1/search";
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// Simple file-based cache
const cacheDir = `${process.env.HOME || "/tmp"}/.cache/pi-packages`;
const cacheFile = `${cacheDir}/packages.json`;

interface CacheEntry {
  timestamp: number;
  data: NpmSearchResult;
}

function ensureCacheDir() {
  try {
    Bun.file(cacheDir).stat().catch(() => {
      Bun.spawn(["mkdir", "-p", cacheDir]);
    });
  } catch {}
}

async function loadCache(): Promise<CacheEntry | null> {
  try {
    const file = Bun.file(cacheFile);
    const stat = await file.stat().catch(() => null);
    if (!stat) return null;
    
    const age = Date.now() - stat.mtime.getTime();
    if (age > CACHE_TTL) return null;
    
    const content = await file.text();
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function saveCache(data: NpmSearchResult) {
  try {
    ensureCacheDir();
    await Bun.write(cacheFile, JSON.stringify({ timestamp: Date.now(), data }));
  } catch {}
}

async function fetchPackages(): Promise<NpmSearchResult> {
  const cached = await loadCache();
  if (cached) {
    console.error("📦 Using cached data...");
    return cached.data;
  }

  console.error("🌐 Fetching from npm registry...");
  
  const allObjects: NpmSearchResult["objects"] = [];
  let from = 0;
  const size = 250;
  
  while (true) {
    const url = `${SEARCH_API}?text=keywords:pi-package&size=${size}${from > 0 ? `&from=${from}` : ""}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data: NpmSearchResult = await response.json();
    allObjects.push(...data.objects);
    
    if (allObjects.length >= data.total || !data.objects.length) {
      break;
    }
    
    from += size;
  }
  
  const result: NpmSearchResult = { objects: allObjects, total: allObjects.length };
  await saveCache(result);
  return result;
}

function detectType(keywords: string[] = []): string {
  const kw = keywords.map(k => k.toLowerCase());
  if (kw.some(k => ["extension", "pi-extension", "extensions"].includes(k))) return "extension";
  if (kw.some(k => ["skill", "pi-skill", "skills"].includes(k))) return "skill";
  if (kw.some(k => ["theme", "pi-theme", "themes"].includes(k))) return "theme";
  if (kw.some(k => ["prompt", "pi-prompt", "prompts"].includes(k))) return "prompt";
  return "package";
}

function getAuthor(pkg: NpmPackage): string {
  if (pkg.maintainers?.[0]?.username) return pkg.maintainers[0].username;
  if (pkg.publisher?.username) return pkg.publisher.username;
  return "unknown";
}

function formatPackage(obj: NpmSearchResult["objects"][0]): string {
  const pkg = obj.package;
  const type = detectType(pkg.keywords);
  const downloads = obj.downloads?.monthly || 0;
  const author = getAuthor(pkg);
  
  return `[${type.toUpperCase()}] ${pkg.name}
    ${pkg.description?.substring(0, 80) || "No description"}${pkg.description && pkg.description.length > 80 ? "..." : ""}
    Author: ${author} | Downloads: ${downloads.toLocaleString()}/mo | v${pkg.version}
    Install: pi install npm:${pkg.name}`;
}

async function main() {
  const keyword = process.argv[2]?.toLowerCase();
  
  try {
    const result = await fetchPackages();
    
    let packages = result.objects;
    
    // Filter by keyword if provided
    if (keyword) {
      packages = packages.filter(obj => {
        const pkg = obj.package;
        const searchText = `${pkg.name} ${pkg.description || ""} ${pkg.keywords?.join(" ") || ""}`.toLowerCase();
        return searchText.includes(keyword);
      });
    }
    
    // Sort by downloads
    packages.sort((a, b) => (b.downloads?.monthly || 0) - (a.downloads?.monthly || 0));
    
    // Limit output
    const limit = keyword ? 20 : 30;
    const displayPackages = packages.slice(0, limit);
    
    if (displayPackages.length === 0) {
      console.log(`❌ No packages found${keyword ? ` for "${keyword}"` : ""}`);
      process.exit(0);
    }
    
    console.log(`📦 Found ${packages.length} pi packages${keyword ? ` matching "${keyword}"` : ""} (showing top ${displayPackages.length})\n`);
    
    for (const obj of displayPackages) {
      console.log(formatPackage(obj));
      console.log();
    }
    
    if (packages.length > limit) {
      console.log(`... and ${packages.length - limit} more. Use a more specific keyword to filter.`);
    }
    
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
