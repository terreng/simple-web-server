// Copies just the web-facing assets into src-tauri/frontend so that
// `tauri dev` / `tauri build` bundle only the UI (not the whole repo:
// node_modules, target, .git, the website, etc.).
//
// Run automatically via tauri.conf.json's beforeDevCommand/beforeBuildCommand.
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dest = path.join(root, "src-tauri", "frontend");

// Files and directories that make up the frontend.
const ENTRIES = [
    "index.html",
    "main.js",
    "style.css",
    "open_source_licenses.txt",
    "LICENSE",
    "images",
    "fonts",
];

function copyRecursive(src, dst) {
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
        fs.mkdirSync(dst, { recursive: true });
        for (const entry of fs.readdirSync(src)) {
            copyRecursive(path.join(src, entry), path.join(dst, entry));
        }
    } else {
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.copyFileSync(src, dst);
    }
}

// Start from a clean destination each run.
fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });

for (const entry of ENTRIES) {
    const src = path.join(root, entry);
    if (fs.existsSync(src)) {
        copyRecursive(src, path.join(dest, entry));
    } else {
        console.warn(`copy-frontend: skipping missing ${entry}`);
    }
}

console.log(`copy-frontend: synced ${ENTRIES.length} entries into ${dest}`);
