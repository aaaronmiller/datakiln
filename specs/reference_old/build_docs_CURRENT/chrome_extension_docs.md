chrome extension

// content.js - Enhanced with better error handling and signal confirmation console.log('AI Chat Capture content script loaded');

function getProviderData(url) { const map = [ { rx: /chat.openai.com/, service: "openai", selectors: [ '[data-testid="conversation-turn-list"]', '.main .flex.flex-col.items-center .flex.flex-col.gap-2', '.chat-container', '[class^="react-scroll-to-bottom--"]' ] }, { rx: /perplexity.ai/, service: "perplexity", selectors: [ '[data-testid="Conversation"]', '.main-chat-container' ] }, { rx: /claude.ai/, service: "claude", selectors: [ 'main[data-testid="chat-interface"]', '[class^="ThreadView_messageList__"]', '.conversation-main' ] }, { rx: /gemini.google.com/, service: "gemini", selectors: [ '[data-testid="conversation-history"]', '#conversation-container', '.chatbot-container', '[id^="conversation-container"]' ] }, { rx: /grok.x.ai/, service: "grok", selectors: [ '[data-testid="grok-chat"]', '.conversation-thread', 'main[role="main"]' ] }, { rx: /kimi/, service: "kimi", selectors: [ 'main[data-kimi-conversation="true"]', '.kimi-chat-container', '.conversation-page' ] }, { rx: /deepseek/, service: "deepseek", selectors: [ '.conversation-container', '.deepseek-conversation', '.chat-main' ] }, { rx: /ernie/, service: "ernie", selectors: [ 'main.conversation', '.ernie-chat-main', '[data-testid="ernie-conversation"]' ] } ];

for (const entry of map) { if (entry.rx.test(url)) return entry; }

return { service: location.hostname.split('.')[0] || 'unknown', selectors: ['.main-chat-container', 'main', 'body'] }; }

function htmlToMarkdown(html) { let md = html .replace(/<pre[^>]>([\s\S]?)</pre>/g, (match, code) => { // Clean up code blocks const cleanCode = code .replace(/<[^>]+>/g, '') // Remove HTML tags .replace(/</g, '<') .replace(/>/g, '>') .replace(/&/g, '&'); return '\n\n' + cleanCode + '\n\n'; }) .replace(/<code[^>]>(.?)</code>/g, '$1') .replace(/<br\s*/?>/gi, '\n') .replace(/<li[^>]>(.?)</li>/gs, '- $1\n') .replace(/</ul>/g, '\n') .replace(/</ol>/g, '\n') .replace(/<b[^>]>(.?)</b>/gs, '$1') .replace(/<strong[^>]>(.?)</strong>/gs, '$1') .replace(/<em[^>]>(.?)</em>/gs, '$1') .replace(/<i[^>]>(.?)</i>/gs, '$1') .replace(/<h[1-6][^>]>(.?)</h[1-6]>/gs, '\n## $1\n') .replace(/<p[^>]>/g, '\n') .replace(/</p>/g, '\n') .replace(/<div[^>]>/g, '\n') .replace(/</div>/g, '\n') .replace(/<[^>]+>/g, '') // Remove remaining HTML tags .replace(/</g, '<') .replace(/>/g, '>') .replace(/&/g, '&') .replace(/"/g, '"') .replace(/'/g, "'") .replace(/\n{3,}/g, '\n\n') .trim();

return md; }

async function extractAndSave() { try { console.log('Starting AI chat extraction...');

const url = window.location.href;
const providerData = getProviderData(url);
let container = null;
let html = '';
let markdown = '';
let usedSelector = '';

// Try each selector until we find content
for (const sel of providerData.selectors) {
  container = document.querySelector(sel);
  if (container && container.innerText && container.innerText.length > 50) {
    html = container.outerHTML;
    markdown = htmlToMarkdown(html);
    usedSelector = sel;
    console.log(`Found content using selector: ${sel}`);
    break;
  }
}

// Fallback to body if nothing found
if (!container || markdown.length < 50) {
  container = document.body;
  html = container.outerHTML;
  markdown = htmlToMarkdown(html);
  usedSelector = "body (fallback)";
  console.log('Using body fallback');
}

const dt = new Date();
const timeStr = dt.toISOString().replace(/:/g, '-').replace(/\..+/, '');
const service = providerData.service;
const fname = `ai-session-${service}-${timeStr}.md`;

// Enhanced YAML frontmatter
const yaml = `---
date: ${dt.toISOString()} provider: ${service} session_url: ${url} chat_selector: "${usedSelector}" extraction_time: ${dt.toISOString()} word_count: ${markdown.split(/\s+/).length} char_count: ${markdown.length}
`;

// Compose final document
const result = [
  yaml,
  markdown.trim(),
  '\n\n---\n\n',
  '## Extraction Metadata\n\n',
  `- **Provider**: ${service}\n`,
  `- **URL**: ${url}\n`,
  `- **Selector Used**: \`${usedSelector}\`\n`,
  `- **Captured**: ${dt.toLocaleString()}\n`,
  `- **Content Length**: ${markdown.length} characters, ${markdown.split(/\s+/).length} words\n`
].join('');

// Create and download
const blob = new Blob([result], { type: 'text/markdown' });
const urlObj = URL.createObjectURL(blob);

console.log(`Sending download request for: ${fname}`);
chrome.runtime.sendMessage({ fname, urlObj });

// Show user feedback
const notification = document.createElement('div');
notification.style.cssText = `
  position: fixed; top: 20px; right: 20px; z-index: 10000;
  background: #4CAF50; color: white; padding: 15px; border-radius: 5px;
  font-family: system-ui; font-size: 14px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
`;
notification.textContent = `✓ AI chat captured: ${fname}`;
document.body.appendChild(notification);

setTimeout(() => notification.remove(), 3000);
} catch (error) { console.error('Extraction failed:', error);

// Show error notification
const errorNotif = document.createElement('div');
errorNotif.style.cssText = `
  position: fixed; top: 20px; right: 20px; z-index: 10000;
  background: #f44336; color: white; padding: 15px; border-radius: 5px;
  font-family: system-ui; font-size: 14px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
`;
errorNotif.textContent = `✗ Extraction failed: ${error.message}`;
document.body.appendChild(errorNotif);

setTimeout(() => errorNotif.remove(), 5000);
} }

// Message listener chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => { console.log('Content script received message:', msg);

if (msg === 'extract_ai_chat') { extractAndSave(); sendResponse({ status: 'started' }); }

return true; // Keep message channel open for async response });

// Signal that content script is ready if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', () => { console.log('AI Chat Capture ready'); }); } else { console.log('AI Chat Capture ready'); }

// background.js - Fixed version with proper content script handling chrome.action.onClicked.addListener(async (tab) => { try { // First, ensure content script is injected await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });

// Small delay to ensure script is fully loaded
setTimeout(() => {
  chrome.tabs.sendMessage(tab.id, 'extract_ai_chat', (response) => {
    if (chrome.runtime.lastError) {
      console.error('Message failed:', chrome.runtime.lastError.message);
      // Fallback: try direct script execution
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
          if (typeof extractAndSave === 'function') {
            extractAndSave();
          }
        }
      });
    }
  });
}, 100);
} catch (error) { console.error('Failed to inject content script:', error); } });

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => { if (req.fname && req.urlObj) { // Direct download to Downloads folder - our background mover will handle it chrome.downloads.download({ url: req.urlObj, filename: req.fname, saveAs: false, // No dialog - straight to Downloads conflictAction: 'uniquify' }, (downloadId) => { if (chrome.runtime.lastError) { console.error('Download failed:', chrome.runtime.lastError.message); } else { console.log('Download completed - background mover should handle it'); } }); } });

package.json { "name": "ai-vault-mover", "version": "1.0.0", "description": "Background daemon to move AI chat captures to Obsidian vault", "main": "ai-vault-mover.js", "dependencies": { "chokidar": "^3.5.3" }, "scripts": { "start": "node ai-vault-mover.js", "daemon": "node ai-vault-mover.js BACKGROUND_MODE" } }

ai-vault-mover.js #!/usr/bin/env node // ai-vault-mover.js - Background daemon for moving AI chat captures to Obsidian vault // Inspired by Ice-ninja's node launcher architecture

const fs = require('fs').promises; const path = require('path'); const os = require('os'); const chokidar = require('chokidar'); // npm install chokidar

// --- Configuration --- const APP_NAME = "ai-vault-mover"; const DOWNLOADS_DIR = path.join(os.homedir(), 'Downloads'); const VAULT_PATH = path.join(os.homedir(), 'Documents/ChetasVault/ai_transcripts'); // UPDATE THIS PATH! const FILE_PATTERN = /^ai-session-.*.md$/; const CHECK_INTERVAL = 2; // seconds const MAX_RUNTIME_HOURS = 12; // Auto-restart after this time const LOG_FILE = /tmp/${APP_NAME}.log; const PID_FILE = /tmp/${APP_NAME}.pid;

// --- Globals --- const START_TIME = Date.now(); let watcher = null;

// --- Functions ---

function log(message) { const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19); const logEntry = ${timestamp} - ${message}; console.log(logEntry);

// Append to log file try { fs.appendFile(LOG_FILE, logEntry + '\n').catch(() => {}); } catch (error) { // Silent fail for logging } }

function notify(message) { if (process.platform === 'darwin') { require('child_process').exec( osascript -e 'display notification "${message.replace(/"/g, '\\"')}" with title "${APP_NAME}"' ); } else if (process.platform === 'linux') { require('child_process').exec(notify-send "${APP_NAME}" "${message}"); } }

function calculateRuntime() { const runtime = Math.floor((Date.now() - START_TIME) / 1000); const hours = Math.floor(runtime / 3600); const minutes = Math.floor((runtime % 3600) / 60); const seconds = runtime % 60; return ${hours}h ${minutes}m ${seconds}s; }

async function cleanup(exitCode = 0) { const runtime = calculateRuntime();

if (watcher) { await watcher.close(); log('File watcher stopped'); }

try { await fs.unlink(PID_FILE); } catch (error) { // PID file might not exist }

if (exitCode === 0) { log(Clean exit completed. Session runtime: ${runtime}); } else { log(Exit with error (code ${exitCode}). Session runtime: ${runtime}); }

process.exit(exitCode); }

// Set up signal handlers process.on('SIGINT', () => cleanup(0)); process.on('SIGTERM', () => cleanup(0)); process.on('uncaughtException', (error) => { log(FATAL ERROR: ${error.message}); cleanup(1); });

async function checkIfRunning() { try { const pidData = await fs.readFile(PID_FILE, 'utf8'); const oldPid = parseInt(pidData.trim());

if (oldPid) {
  try {
    process.kill(oldPid, 0); // Check if process exists
    log(`${APP_NAME} already running (PID: ${oldPid}). Exiting.`);
    notify(`${APP_NAME} is already running`);
    process.exit(0);
  } catch (error) {
    log('Found stale PID file. Removing.');
    await fs.unlink(PID_FILE);
  }
}
} catch (error) { // PID file doesn't exist, continue } }

async function ensureVaultExists() { try { await fs.access(VAULT_PATH); log(✓ Obsidian vault path exists: ${VAULT_PATH}); } catch (error) { log(✗ FATAL: Vault path doesn't exist: ${VAULT_PATH}); log('Please update VAULT_PATH in this script to match your Obsidian vault location'); notify(${APP_NAME} failed: Vault path not found); process.exit(1); } }

async function moveFile(sourcePath, filename) { try { const targetPath = path.join(VAULT_PATH, filename);

// Check if target already exists and create unique name if needed
let finalTargetPath = targetPath;
let counter = 1;

while (true) {
  try {
    await fs.access(finalTargetPath);
    // File exists, create new name
    const ext = path.extname(filename);
    const base = path.basename(filename, ext);
    finalTargetPath = path.join(VAULT_PATH, `${base}-${counter}${ext}`);
    counter++;
  } catch (error) {
    // File doesn't exist, we can use this path
    break;
  }
}

await fs.rename(sourcePath, finalTargetPath);
log(`✓ Moved: ${filename} → ${path.basename(finalTargetPath)}`);
notify(`AI chat saved: ${path.basename(finalTargetPath)}`);

// Clean up empty directories
const sourceDir = path.dirname(sourcePath);
if (sourceDir !== DOWNLOADS_DIR) {
  try {
    const files = await fs.readdir(sourceDir);
    if (files.length === 0) {
      await fs.rmdir(sourceDir);
      log(`✓ Cleaned up empty directory: ${sourceDir}`);
    }
  } catch (cleanupError) {
    // Directory not empty or other error, ignore
  }
}
} catch (error) { log(✗ Failed to move ${filename}: ${error.message}); notify(Failed to move ${filename}); } }

async function startWatching() { await checkIfRunning(); await ensureVaultExists();

// Write PID file await fs.writeFile(PID_FILE, process.pid.toString());

log(--- Starting ${APP_NAME} (PID: ${process.pid}) ---); log(🔍 Watching Downloads: ${DOWNLOADS_DIR}); log(📁 Target Vault: ${VAULT_PATH}); log(🎯 File Pattern: ${FILE_PATTERN});

// Watch Downloads directory and common subdirectories const watchPaths = [ DOWNLOADS_DIR, path.join(DOWNLOADS_DIR, 'ChetasVault'), // Chrome might create this path.join(DOWNLOADS_DIR, 'ai-chats') // Alternative location ];

watcher = chokidar.watch(watchPaths, { ignored: /^./, persistent: true, ignoreInitial: false, // Process existing files depth: 2, // Watch subdirectories up to 2 levels deep awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 100 } });

watcher.on('add', async (filePath) => { const filename = path.basename(filePath);

if (FILE_PATTERN.test(filename)) {
  log(`📋 Detected AI chat file: ${filename}`);
  
  // Small delay to ensure file is completely written
  setTimeout(() => {
    moveFile(filePath, filename);
  }, 500);
}
});

watcher.on('error', (error) => { log(Watcher error: ${error.message}); });

notify(${APP_NAME} started - watching for AI chats);

// Runtime monitoring loop const maxLoops = MAX_RUNTIME_HOURS * 3600 / CHECK_INTERVAL; let loopCount = 0;

const monitorInterval = setInterval(() => { loopCount++;

if (loopCount >= maxLoops) {
  log(`Auto-restarting after ${MAX_RUNTIME_HOURS} hours`);
  notify(`${APP_NAME} restarting after ${MAX_RUNTIME_HOURS} hours`);
  cleanup(0);
}
}, CHECK_INTERVAL * 1000);

// Keep process alive process.on('exit', () => { clearInterval(monitorInterval); }); }

// --- Entry Point ---

// Handle background mode detection (similar to your launcher) if (process.argv[2] !== 'BACKGROUND_MODE' && (!process.stdout.isTTY || !process.env.TERM)) { log('GUI launch detected, forking to background...'); const { spawn } = require('child_process'); spawn(process.argv[0], [process.argv[1], 'BACKGROUND_MODE'], { detached: true, stdio: 'ignore' }).unref(); process.exit(0); }

// Remove background mode marker if (process.argv[2] === 'BACKGROUND_MODE') { process.argv.splice(2, 1); }

// Start the main process startWatching().catch((error) => { log(FATAL: ${error.message}); notify(${APP_NAME} failed to start); process.exit(1); });

ai_vault_launcher.sh #!/bin/bash

AI Vault Mover Launcher - Based on Ice-ninja's node launcher architecture
Manages the background daemon that moves AI chat files to Obsidian vault
set -euo pipefail

--- Configuration ---
APP_NAME="ai-vault-mover" SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)" NODE_SCRIPT="$SCRIPT_DIR/ai-vault-mover.js" MAX_STARTUP_WAIT=10 CHECK_INTERVAL=2

--- Globals ---
LOG_FILE="/tmp/${APP_NAME}-launcher.log" PID_FILE="/tmp/${APP_NAME}.pid" START_TIME=$(date +%s)

--- Functions ---
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE" }

notify() { local message="$1" if command -v osascript &>/dev/null; then osascript -e "display notification "${message//"/\"}" with title "$APP_NAME"" elif command -v notify-send &>/dev/null; then notify-send "$APP_NAME" "$message" fi }

calculate_runtime() { local end_time end_time=$(date +%s) local runtime=$((end_time - START_TIME)) local hours=$((runtime / 3600)) local minutes=$(((runtime % 3600) / 60)) local seconds=$((runtime % 60)) printf "%dh %dm %ds" "$hours" "$minutes" "$seconds" }

cleanup() { local exit_code=$? local runtime runtime=$(calculate_runtime)

if [[ $exit_code -eq 0 ]]; then log "Clean exit completed. Session runtime: $runtime" else log "Exit with error (code $exit_code). Session runtime: $runtime" fi

exit $exit_code }

trap cleanup EXIT INT TERM

check_if_running() { if [[ -f "$PID_FILE" ]]; then local old_pid old_pid=$(cat "$PID_FILE") if [[ -n "$old_pid" ]] && kill -0 "$old_pid" &>/dev/null; then log "$APP_NAME already running (PID: $old_pid)" notify "$APP_NAME is already running" exit 0 else log "Found stale PID file. Removing." rm -f "$PID_FILE" fi fi }

install_dependencies() { local package_json="$SCRIPT_DIR/package.json"

Create minimal package.json if it doesn't exist
if [[ ! -f "$package_json" ]]; then log "Creating package.json for dependencies..." cat > "$package_json" << 'EOF' { "name": "ai-vault-mover", "version": "1.0.0", "description": "Background daemon to move AI chat captures to Obsidian vault", "main": "ai-vault-mover.js", "dependencies": { "chokidar": "^3.5.3" }, "scripts": { "start": "node ai-vault-mover.js", "daemon": "node ai-vault-mover.js BACKGROUND_MODE" } } EOF fi

Install dependencies if needed
if [[ ! -d "$SCRIPT_DIR/node_modules" ]]; then log "Installing Node.js dependencies..." cd "$SCRIPT_DIR"

local pm=""
if command -v bun &>/dev/null; then 
  pm="bun"
elif command -v pnpm &>/dev/null; then 
  pm="pnpm"
elif command -v yarn &>/dev/null; then 
  pm="yarn"
elif command -v npm &>/dev/null; then 
  pm="npm"
fi

if [[ -n "$pm" ]]; then
  log "Using '$pm' to install dependencies..."
  if ! "$pm" install >>"$LOG_FILE" 2>&1; then
    log "FATAL: Dependency installation failed with '$pm'"
    notify "$APP_NAME failed: Dependency installation"
    exit 1
  fi
else
  log "FATAL: No package manager found (npm/yarn/pnpm/bun)"
  notify "$APP_NAME failed: No package manager"
  exit 1
fi
fi }

wait_for_daemon() { log "Waiting for daemon to start..." for ((i = 0; i < MAX_STARTUP_WAIT; i++)); do if [[ -f "$PID_FILE" ]]; then local pid pid=$(cat "$PID_FILE") if kill -0 "$pid" &>/dev/null; then log "Daemon started successfully (PID: $pid)" notify "$APP_NAME daemon is running" return 0 fi fi sleep 1 done

log "ERROR: Daemon failed to start within ${MAX_STARTUP_WAIT} seconds" notify "$APP_NAME failed to start" return 1 }

main() { log "--- Starting $APP_NAME launcher (PID: $$) ---"

Verify Node.js script exists
if [[ ! -f "$NODE_SCRIPT" ]]; then log "FATAL: Node.js script not found at $NODE_SCRIPT" notify "$APP_NAME failed: Script not found" exit 1 fi

Verify Node.js is installed
if ! command -v node &>/dev/null; then log "FATAL: Node.js not found. Please install Node.js" notify "$APP_NAME failed: Node.js not installed" exit 1 fi

Pre-flight checks
check_if_running install_dependencies

Start the daemon
log "Starting $APP_NAME daemon..." cd "$SCRIPT_DIR"

Launch daemon in background
nohup node "$NODE_SCRIPT" BACKGROUND_MODE >"/tmp/${APP_NAME}-daemon.log" 2>&1 & local daemon_pid=$!

Verify daemon started
sleep 2 if ! kill -0 "$daemon_pid" &>/dev/null; then log "FATAL: Daemon process failed to start. Check /tmp/${APP_NAME}-daemon.log" notify "$APP_NAME daemon failed to start" exit 1 fi

if ! wait_for_daemon; then exit 1 fi

log "Daemon is running in background. Check logs with: tail -f /tmp/${APP_NAME}.log" log "To stop: kill $(cat $PID_FILE)" }

Handle command line arguments
--- Daemon Control Functions ---
stop_daemon() { if [[ ! -f "$PID_FILE" ]]; then log "$APP_NAME is not running (no PID file)" return fi

local pid pid=$(cat "$PID_FILE")

if [[ -n "$pid" ]] && kill -0 "$pid" &>/dev/null; then log "Stopping $APP_NAME (PID: $pid)..." if kill "$pid"; then log "$APP_NAME stopped successfully." notify "$APP_NAME stopped" rm -f "$PID_FILE" else log "Failed to stop $APP_NAME (PID: $pid)." fi else log "$APP_NAME is not running (stale PID file)" rm -f "$PID_FILE" fi }

check_status() { if [[ ! -f "$PID_FILE" ]]; then log "$APP_NAME is not running" return fi

local pid pid=$(cat "$PID_FILE")

if [[ -n "$pid" ]] && kill -0 "$pid" &>/dev/null; then # Note: calculate_runtime relies on a global START_TIME # This logic would need adjustment if START_TIME isn't available # For this script's structure, we'll just show the PID. log "$APP_NAME is running (PID: $pid)" else log "$APP_NAME is not running (stale PID file)" fi }

--- Main Execution Logic ---
(Your main() function and others stay here)
Handle command line arguments
case "${1:-start}" in start) main ;; stop) stop_daemon ;; status) check_status ;; restart) stop_daemon sleep 2 main ;; *) echo "Usage: $0 {start|stop|status|restart}" exit 1 ;; esac