#!/usr/bin/env node
/**
 * KaiExtract Automated Version Bump & Deployment Pipeline
 * 
 * Versioning Rules:
 *  - Increment 0.0.1 (e.g. v0.1.0 -> v0.1.1 ... -> v0.1.9)
 *  - On .9 patch, roll to next minor (v0.1.9 -> v0.2.0)
 *  - On .9.9 minor/patch, roll to next major (v0.9.9 -> v1.0.0)
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const FRONTEND_DIR = path.join(ROOT_DIR, "frontend");
const VERSION_FILE = path.join(FRONTEND_DIR, "src", "version.js");
const PKG_FILE = path.join(FRONTEND_DIR, "package.json");

function getNextVersion(currentVersion) {
  const clean = currentVersion.replace(/^v/, "").trim();
  let [major, minor, patch] = clean.split(".").map(Number);
  
  if (isNaN(major) || isNaN(minor) || isNaN(patch)) {
    return "v0.1.0";
  }

  if (patch < 9) {
    patch += 1;
  } else {
    patch = 0;
    if (minor < 9) {
      minor += 1;
    } else {
      minor = 0;
      major += 1;
    }
  }

  return `v${major}.${minor}.${patch}`;
}

function run(cmd, cwd = ROOT_DIR) {
  console.log(`\n🚀 [CMD] ${cmd}`);
  execSync(cmd, { cwd, stdio: "inherit" });
}

async function main() {
  console.log("=====================================================");
  console.log("📦 KaiExtract Automated Deploy & Version Bump Engine");
  console.log("=====================================================");

  // 1. Read current version
  let currentVersion = "v0.1.0";
  if (fs.existsSync(VERSION_FILE)) {
    const content = fs.readFileSync(VERSION_FILE, "utf-8");
    const match = content.match(/APP_VERSION\s*=\s*["']([^"']+)["']/);
    if (match) {
      currentVersion = match[1];
    }
  }

  const args = process.argv.slice(2);
  const noBump = args.includes("--no-bump");
  const customVerArg = args.find(a => a.startsWith("--version="));
  
  let nextVersion = currentVersion;
  if (customVerArg) {
    nextVersion = customVerArg.split("=")[1];
    if (!nextVersion.startsWith("v")) nextVersion = "v" + nextVersion;
  } else if (!noBump) {
    nextVersion = getNextVersion(currentVersion);
  }

  console.log(`📌 Current Version: ${currentVersion}`);
  console.log(`🎯 Target Version:  ${nextVersion}`);

  // 2. Update version files
  fs.writeFileSync(VERSION_FILE, `export const APP_VERSION = "${nextVersion}";\n`);
  
  if (fs.existsSync(PKG_FILE)) {
    const pkg = JSON.parse(fs.readFileSync(PKG_FILE, "utf-8"));
    pkg.version = nextVersion.replace(/^v/, "");
    fs.writeFileSync(PKG_FILE, JSON.stringify(pkg, null, 2) + "\n");
  }
  console.log(`✅ Updated version files to ${nextVersion}`);

  // 3. Build frontend
  console.log("\n🔨 Building production bundle with Vite...");
  run("npm run build", FRONTEND_DIR);

  // 4. Git commit & push to dev
  console.log("\n🌿 Committing to dev branch...");
  run("git add .");
  try {
    run(`git commit -m "release: ${nextVersion} - automated version bump & deploy"`);
  } catch (e) {
    console.log("No local changes to commit in dev.");
  }
  run("git push origin dev");

  // 5. Merge into main and push
  console.log("\n🌳 Merging dev into main...");
  run("git checkout main");
  run("git pull origin main");
  run(`git merge dev -m "Merge release ${nextVersion} into main"`);
  run("git push origin main");

  // 6. Deploy to gh-pages
  console.log("\n🚀 Deploying bundle to gh-pages...");
  run("git checkout gh-pages");
  run("git pull origin gh-pages");
  run("cp frontend/dist/index.html ./index.html");
  run("cp -r frontend/dist/assets/* ./assets/");
  run("cp frontend/dist/KaiExtract-svg-logo.svg ./KaiExtract-svg-logo.svg || true");
  run("touch .nojekyll");
  run("git add index.html assets/ KaiExtract-svg-logo.svg .nojekyll");
  try {
    run(`git commit -m "deploy: release ${nextVersion} to GitHub Pages"`);
  } catch (e) {
    console.log("No changes on gh-pages to commit.");
  }
  run("git push origin gh-pages");

  // 7. Return to dev
  console.log("\n🔄 Returning to dev branch...");
  run("git checkout dev");

  console.log("\n=====================================================");
  console.log(`🎉 Successfully deployed ${nextVersion}!`);
  console.log("🌐 Live URL: https://fabiotginnovox.github.io/kaiextract/");
  console.log("=====================================================");
}

main().catch(err => {
  console.error("\n❌ Deploy failed:", err);
  process.exit(1);
});
