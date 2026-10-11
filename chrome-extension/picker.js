// DataKiln element picker / recorder (injected on demand).
// Overlay highlight + click capture + shadow-DOM recorder panel.
// Messages: DATAKILN_TOGGLE_PICKER {on}, DATAKILN_STATE.
(function () {
  if (window.__datakilnPicker) {
    window.__datakilnPicker.toggle(!window.__datakilnPicker.active);
    return;
  }

  var SB = window.DataKilnSelectorBuilder;

  var state = { active: false, captured: [] };

  var hoverBox = document.createElement("div");
  hoverBox.style.cssText =
    "position:fixed;pointer-events:none;z-index:2147483646;border:2px solid #8B5CF6;border-radius:4px;background:rgba(99,102,241,0.12);box-shadow:0 0 0 1px rgba(0,0,0,.4),0 8px 24px rgba(99,102,241,.35);display:none;transition:all .05s linear;";
  var hoverTag = document.createElement("div");
  hoverTag.style.cssText =
    "position:fixed;pointer-events:none;z-index:2147483647;background:#111733;color:#E8EAF2;font:600 11px/1.4 'Segoe UI',system-ui,sans-serif;padding:3px 8px;border-radius:6px;border:1px solid rgba(255,255,255,.15);display:none;max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
  document.documentElement.appendChild(hoverBox);
  document.documentElement.appendChild(hoverTag);

  // Shadow panel
  var host = document.createElement("div");
  host.style.cssText = "position:fixed;z-index:2147483647;bottom:16px;right:16px;display:none;";
  var shadow = host.attachShadow({ mode: "open" });
  var style = document.createElement("style");
  style.textContent = `
    :host{all:initial}
    .panel{width:300px;background:#0B0F1E;color:#E8EAF2;border:1px solid rgba(255,255,255,.12);border-radius:14px;box-shadow:0 16px 48px rgba(0,0,0,.5);font:12px/1.45 'Segoe UI',system-ui,sans-serif;overflow:hidden}
    .hdr{display:flex;align-items:center;gap:8px;padding:10px 12px;background:linear-gradient(135deg,rgba(6,182,212,.15),rgba(99,102,241,.15));border-bottom:1px solid rgba(255,255,255,.08)}
    .logo{width:22px;height:22px;border-radius:7px;background:linear-gradient(135deg,#06B6D4,#6366F1);display:grid;place-items:center;color:#fff;font-weight:800;font-size:11px}
    .ttl{font-weight:700;font-size:12px;letter-spacing:.02em}
    .sub{color:#8B92B5;font-size:10px}
    .list{max-height:180px;overflow:auto;padding:6px 8px}
    .item{display:flex;align-items:center;gap:6px;padding:6px 8px;border:1px solid rgba(255,255,255,.08);border-radius:8px;background:rgba(255,255,255,.04);margin-bottom:5px}
    .sel{flex:1;min-width:0;font-family:ui-monospace,monospace;font-size:10px;color:#8B92B5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .act{background:#111733;color:#E8EAF2;border:1px solid rgba(255,255,255,.15);border-radius:6px;font-size:10px;padding:2px 4px}
    .val{width:70px;background:#111733;color:#E8EAF2;border:1px solid rgba(255,255,255,.15);border-radius:6px;font-size:10px;padding:2px 4px;display:none}
    .x{background:none;border:none;color:#8B92B5;cursor:pointer;font-size:12px;padding:0 2px}
    .x:hover{color:#fff}
    .ft{display:flex;gap:6px;padding:8px 10px;border-top:1px solid rgba(255,255,255,.08)}
    button.b{flex:1;padding:7px 0;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#E8EAF2;font-weight:600;font-size:11px;cursor:pointer}
    button.b:hover{background:rgba(255,255,255,.12)}
    button.primary{background:linear-gradient(135deg,#06B6D4,#6366F1);border:none;color:#fff}
    button.primary:hover{filter:brightness(1.1)}
    .empty{padding:14px;text-align:center;color:#5A6285;font-size:11px}
    .rec{width:7px;height:7px;border-radius:50%;background:#EF4444;box-shadow:0 0 8px #EF4444;animation:blink 1s infinite}
    @keyframes blink{50%{opacity:.35}}
  `;
  shadow.appendChild(style);
  var panel = document.createElement("div");
  panel.className = "panel";
  shadow.appendChild(panel);

  function render() {
    panel.innerHTML = `
      <div class="hdr"><div class="logo">DK</div><div style="flex:1"><div class="ttl">DataKiln Recorder <span class="rec" style="display:inline-block;margin-left:4px;vertical-align:middle"></span></div><div class="sub">click elements to capture DOM actions</div></div></div>
      <div class="list">${state.captured.length === 0 ? '<div class="empty">No actions captured yet.<br/>Click any element on the page.</div>' : ""}</div>
      <div class="ft">
        <button class="b" id="dk-clear">Clear</button>
        <button class="b" id="dk-stop">Stop</button>
        <button class="b primary" id="dk-save">Save (${state.captured.length})</button>
      </div>`;
    var list = panel.querySelector(".list");
    state.captured.forEach(function (cap, i) {
      var item = document.createElement("div");
      item.className = "item";
      item.innerHTML =
        '<select class="act">' +
        ["extract", "click", "fill", "waitForVisible"].map(function (a) {
          return '<option' + (cap.action === a ? " selected" : "") + ">" + a + "</option>";
        }).join("") +
        '</select><span class="sel" title="' + cap.selector.replace(/"/g, "&quot;") + '">' + cap.selector + "</span>" +
        '<input class="val" placeholder="value" value="' + (cap.value || "").replace(/"/g, "&quot;") + '"/>' +
        '<button class="x" title="remove">✕</button>';
      item.querySelector(".act").addEventListener("change", function (e) {
        cap.action = e.target.value;
        item.querySelector(".val").style.display = cap.action === "fill" ? "block" : "none";
        persist();
      });
      item.querySelector(".val").addEventListener("input", function (e) {
        cap.value = e.target.value;
        persist();
      });
      if (cap.action === "fill") item.querySelector(".val").style.display = "block";
      item.querySelector(".x").addEventListener("click", function () {
        state.captured.splice(i, 1);
        persist();
        render();
      });
      list.appendChild(item);
    });
    panel.querySelector("#dk-clear").addEventListener("click", function () {
      state.captured = [];
      persist();
      render();
    });
    panel.querySelector("#dk-stop").addEventListener("click", function () {
      toggle(false);
    });
    panel.querySelector("#dk-save").addEventListener("click", function () {
      persist();
      chrome.runtime.sendMessage({ type: "DATAKILN_OPEN_SAVE" });
    });
  }

  function persist() {
    try {
      chrome.storage.session.set({ datakilnCaptured: JSON.parse(JSON.stringify(state.captured)) });
    } catch (e) {
      chrome.storage.local.set({ datakilnCaptured: JSON.parse(JSON.stringify(state.captured)) });
    }
  }

  function onMove(e) {
    var t = e.target;
    if (!t || t.closest && t.closest("[data-datakiln-ui]")) { hoverBox.style.display = "none"; hoverTag.style.display = "none"; return; }
    var r = t.getBoundingClientRect();
    hoverBox.style.display = "block";
    hoverBox.style.left = r.left - 3 + "px";
    hoverBox.style.top = r.top - 3 + "px";
    hoverBox.style.width = r.width + 6 + "px";
    hoverBox.style.height = r.height + 6 + "px";
    var desc = SB.describeElement(t);
    hoverTag.style.display = "block";
    hoverTag.style.left = Math.min(r.left, window.innerWidth - 350) + "px";
    hoverTag.style.top = Math.max(r.top - 22, 2) + "px";
    hoverTag.textContent = desc.tag + " · " + desc.selector + (desc.text ? " · “" + desc.text + "”" : "");
  }

  function onClick(e) {
    if (e.target.closest && (e.target.closest("[data-datakiln-ui]") || e.target.closest("html"))) {
      if (!e.target.closest("[data-datakiln-ui]")) { /* body clicks still captured */ }
    }
    var t = e.target;
    if (t.closest && t.closest("[data-datakiln-ui]")) return;
    e.preventDefault();
    e.stopPropagation();
    var desc = SB.describeElement(t);
    state.captured.push({ selector: desc.selector, tag: desc.tag, text: desc.text, action: desc.suggested_action, value: "", url: location.href, captured_at: new Date().toISOString() });
    persist();
    render();
  }

  function onKey(e) {
    if (e.key === "Escape") toggle(false);
  }

  function toggle(on) {
    state.active = on;
    host.style.display = on ? "block" : "none";
    hoverBox.style.display = "none";
    hoverTag.style.display = "none";
    if (on) {
      document.addEventListener("mousemove", onMove, true);
      document.addEventListener("click", onClick, true);
      document.addEventListener("keydown", onKey, true);
      render();
    } else {
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKey, true);
    }
    chrome.runtime.sendMessage({ type: "DATAKILN_STATE", active: on, count: state.captured.length });
  }

  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (msg.type === "DATAKILN_TOGGLE_PICKER") {
      toggle(typeof msg.on === "boolean" ? msg.on : !state.active);
      sendResponse({ active: state.active, count: state.captured.length });
    } else if (msg.type === "DATAKILN_STATE") {
      sendResponse({ active: state.active, count: state.captured.length });
    }
  });

  host.setAttribute("data-datakiln-ui", "1");
  hoverBox.setAttribute("data-datakiln-ui", "1");
  hoverTag.setAttribute("data-datakiln-ui", "1");
  window.__datakilnPicker = { toggle: toggle, get active() { return state.active; }, get captured() { return state.captured; } };
})();
