// ==UserScript==
// @name         YouTube - ufret chord
// @name:ja      YouTube - ufretコード
// @name:zh-CN   YouTube - ufret和弦
// @name:zh-TW   YouTube - ufret和弦
// @name:ko      YouTube - ufret 코드
// @namespace    https://greasyfork.org/ja/users/941284-%E3%81%90%E3%82%89%E3%82%93%E3%81%B4
// @version      1.1
// @description  show ufret chords on YouTube
// @description:ja YouTubeでufretの歌詞を表示する
// @description:zh-CN 在YouTube上显示ufret的和弦谱
// @description:zh-TW 在YouTube上顯示ufret的和弦譜
// @description:ko YouTube에서 ufret 코드를 표시합니다
// @author       grmpneko
// @match        https://www.ufret.jp/*
// @match        https://*.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=ufret.jp
// @grant        unsafeWindow
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
// @grant        GM.xmlHttpRequest
// @grant        GM_registerMenuCommand
// @connect      ufret.jp
// ==/UserScript==
// ==========================================
// ユーティリティ/ファクトリ関数
// ==========================================
let w = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window, d = document, l = console.log;
let $S = s => document.querySelector(s), $SA = s => document.querySelectorAll(s);
let $C = (tag, { attrs = {}, props = {}, styles = {}, on = {} } = {}) => {//属性、プロパティ、スタイル、イベント
  const el = document.createElement(tag);
  for(const [name, value] of Object.entries(attrs)){
    if(value === false || value == null) continue;
    if(value === true){
      el.setAttribute(name, "");
    }else el.setAttribute(name, String(value));
  }
  Object.assign(el, props); Object.assign(el.style, styles);
  for(const [ev, handler] of Object.entries(on)){
    if(typeof handler === "function") el.addEventListener(ev, handler);
  }
  return el;
};

// ==========================================
// メイン
// ==========================================
let ufretSong = "";
let ufretVideoId = "";
let ufretOnSpeed = null;
const ufretPolicy = w.trustedTypes?.createPolicy("ufret-html", { createHTML: s => s }) ?? { createHTML: s => s };
const inUfretFrame = location.hostname === "www.ufret.jp" && top !== self;
// ==========================================
// 多言語 (default: en)
// ==========================================
const I18N = {
  en: {
    reset: "Reset ufret position and size",
    drag: "Drag here to move",
    close: "Close",
    placeholder: "Search for a song to play",
    search: "Search",
    save: "Save",
    searching: "Searching...",
    notFound: "Not found",
    searchFail: "Search failed",
    noFav: "No favorites",
    open: "Open",
    del: "Del",
    chords: "Chords",
    speed: "Scroll speed (px/sec) ",
    alwaysHide: "Always hide",
    import: "Import",
    export: "Export",
    importTip: "Add codes that don't match an existing videoId",
    exportTip: "Share your codes",
    exported: "Copied to clipboard",
    exportFail: "Copy failed",
    imported: "Imported {n} item(s)",
    importFail: "Invalid data",
    pastePrompt: "Paste the exported data here"
  },
  ja: {
    reset: "ufretの位置とサイズをリセット",
    drag: "ここをドラッグで移動",
    close: "閉じる",
    placeholder: "弾きたい曲を検索",
    search: "検索",
    save: "保存",
    searching: "検索中...",
    notFound: "見つかりませんでした",
    searchFail: "検索に失敗しました",
    noFav: "お気に入りはありません",
    open: "開く",
    del: "削除",
    chords: "コード",
    speed: "スクロール速度(px/秒) ",
    alwaysHide: "常に非表示",
    import: "import",
    export: "export",
    importTip: "videoIdにマッチしていないコードを追加",
    exportTip: "コードをshareする",
    exported: "クリップボードにコピーしました",
    exportFail: "コピーに失敗しました",
    imported: "{n}件追加しました",
    importFail: "データが不正です",
    pastePrompt: "exportしたデータを貼り付けてください"
  },
  zh: {
    reset: "重置ufret的位置和大小",
    drag: "在此拖动以移动",
    close: "关闭",
    placeholder: "搜索想弹奏的歌曲",
    search: "搜索",
    save: "保存",
    searching: "搜索中...",
    notFound: "未找到",
    searchFail: "搜索失败",
    noFav: "没有收藏",
    open: "打开",
    del: "删除",
    chords: "和弦",
    speed: "滚动速度(px/秒) ",
    alwaysHide: "始终隐藏",
    import: "导入",
    export: "导出",
    importTip: "添加videoId不匹配的和弦",
    exportTip: "分享你的和弦",
    exported: "已复制到剪贴板",
    exportFail: "复制失败",
    imported: "已添加{n}项",
    importFail: "数据无效",
    pastePrompt: "请粘贴导出的数据"
  },
  zhTW: {
    reset: "重設ufret的位置和大小",
    drag: "在此拖曳以移動",
    close: "關閉",
    placeholder: "搜尋想彈奏的歌曲",
    search: "搜尋",
    save: "儲存",
    searching: "搜尋中...",
    notFound: "找不到",
    searchFail: "搜尋失敗",
    noFav: "沒有收藏",
    open: "開啟",
    del: "刪除",
    chords: "和弦",
    speed: "捲動速度(px/秒) ",
    alwaysHide: "一律隱藏",
    import: "匯入",
    export: "匯出",
    importTip: "新增videoId不相符的和弦",
    exportTip: "分享你的和弦",
    exported: "已複製到剪貼簿",
    exportFail: "複製失敗",
    imported: "已新增{n}項",
    importFail: "資料無效",
    pastePrompt: "請貼上匯出的資料"
  },
  ko: {
    reset: "ufret 위치와 크기 초기화",
    drag: "여기를 드래그하여 이동",
    close: "닫기",
    placeholder: "연주할 곡 검색",
    search: "검색",
    save: "저장",
    searching: "검색 중...",
    notFound: "찾을 수 없습니다",
    searchFail: "검색에 실패했습니다",
    noFav: "즐겨찾기가 없습니다",
    open: "열기",
    del: "삭제",
    chords: "코드",
    speed: "스크롤 속도(px/초) ",
    alwaysHide: "항상 숨기기",
    import: "가져오기",
    export: "내보내기",
    importTip: "videoId가 일치하지 않는 코드를 추가",
    exportTip: "코드를 공유하기",
    exported: "클립보드에 복사했습니다",
    exportFail: "복사에 실패했습니다",
    imported: "{n}개 추가했습니다",
    importFail: "잘못된 데이터입니다",
    pastePrompt: "내보낸 데이터를 붙여넣으세요"
  }
};
let langKey = "en";
// YouTube側ではytcfg.get('HL')から取得して保存、ufretのiframe側は保存値を参照
function refreshLang() {
  let hl = "";
  if (!inUfretFrame) {
    try { hl = w.ytcfg?.get?.("HL") || ""; } catch (e) {}
    if (hl) GM_setValue("ufret-lang", hl);
  }
  hl = String(hl || GM_getValue("ufret-lang", "") || navigator.language || "en").toLowerCase();
  if (hl.startsWith("ja")) langKey = "ja";
  else if (hl.startsWith("ko")) langKey = "ko";
  else if (hl.startsWith("zh")) langKey = /tw|hk|hant/.test(hl) ? "zhTW" : "zh";
  else langKey = "en";
}
const t = (key, n) => (I18N[langKey]?.[key] ?? I18N.en[key] ?? key).replace("{n}", n);
 
// hidden=true: オーバーレイを作成するが表示しない(doSearchなどは実行される)
function toggleOverlay(hidden = false) {
  refreshLang();
  const old = $S("#ufret-overlay");
  if (old) {
    if (old.style.display === "none") old.style.display = "flex";
    else old.remove();
    return;
  }
  const base = "https://www.ufret.jp/";
  const tabNames = ["search", "chord", "favorite", "options"];
  const tabLabels = { search: "list" };
  const pos = GM_getValue("ufret-pos", { left: Math.max(0, innerWidth - 412), top: 0 });
  const size = GM_getValue("ufret-size", { width: 412, height: innerHeight });
  let current = null;
  let drag = null;
  let autoPick = false;
  let favorites = GM_getValue("ufret-fav", []);
 
  const overlay = $C("div", {
    attrs: { id: "ufret-overlay" },
    styles: {
      position: "fixed", left: pos.left + "px", top: pos.top + "px", width: size.width + "px", height: size.height + "px",
      minWidth: "300px", minHeight: "200px", maxWidth: "100vw", maxHeight: "100vh", resize: "both", overflow: "hidden",
      background: "#fff", color: "#000", zIndex: "2147483647", display: hidden ? "none" : "flex", flexDirection: "column",
      boxShadow: "0 0 12px rgba(0,0,0,.4)", fontSize: "14px", fontFamily: "sans-serif"
    },
    on: {
      pointerup: () => GM_setValue("ufret-size", { width: overlay.offsetWidth, height: overlay.offsetHeight })
    }
  });
 
  const closeBtn = $C("button", {
    props: { textContent: t("close") },
    styles: { background: "#f0513c", color: "#fff", border: "none", borderRadius: "4px", padding: "6px 10px", cursor: "pointer" },
    on: { click: () => overlay.remove() }
  });
 
  const header = $C("div", {
    styles: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 7px", background: "#f5f5f5", cursor: "move", touchAction: "none", userSelect: "none" },
    on: {
      pointerdown: ev => {
        if (ev.target === closeBtn) return;
        header.setPointerCapture(ev.pointerId);
        drag = { x: ev.clientX - overlay.offsetLeft, y: ev.clientY - overlay.offsetTop };
      },
      pointermove: ev => {
        if (!drag) return;
        overlay.style.left = Math.max(0, ev.clientX - drag.x) + "px";
        overlay.style.top = Math.max(0, ev.clientY - drag.y) + "px";
      },
      pointerup: () => {
        if (!drag) return;
        drag = null;
        GM_setValue("ufret-pos", { left: overlay.offsetLeft, top: overlay.offsetTop });
      }
    }
  });
  header.append($C("strong", { props: { textContent: t("drag") } }), closeBtn);
 
  const input = $C("input", {
    attrs: { type: "text", placeholder: t("placeholder") },
    props: { value: ufretSong },
    styles: { flex: "1", minWidth: "0", padding: "8px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "inherit" },
    on: { keydown: ev => { if (ev.key === "Enter") searchBtn.click(); } }
  });
  const searchBtn = $C("button", {
    props: { textContent: t("search") },
    styles: { background: "#2196f3", color: "#fff", border: "none", borderRadius: "4px", padding: "9px 10px", cursor: "pointer" },
    on: {
      click: () => {
        const auto = autoPick;
        autoPick = false;
        doSearch(auto);
      }
    }
  });
  const saveBtn = $C("button", {
    props: { textContent: t("save") },
    styles: { background: "#4caf50", color: "#fff", border: "none", borderRadius: "4px", padding: "9px 10px", cursor: "pointer" },
    on: { click: saveCurrent }
  });
  const bar = $C("div", {
    styles: { display: "flex", gap: "8px", padding: "8px 7px", borderBottom: "1px solid #eee" }
  });
  bar.append(input, searchBtn, saveBtn);
 
  const tabBar = $C("div", {
    styles: { display: "flex", gap: "6px", padding: "8px 7px", borderBottom: "1px solid #eee" }
  });
  const panes = {};
  const tabBtns = {};
  for (const name of tabNames) {
    tabBtns[name] = $C("button", {
      props: { textContent: tabLabels[name] ?? name },
      styles: { background: "#fff", border: "1px solid transparent", borderRadius: "4px", padding: "6px 10px", cursor: "pointer", fontSize: "inherit" },
      on: { click: () => showTab(name) }
    });
    panes[name] = $C("div", {
      styles: { display: "none", flex: "1", minHeight: "0" }
    });
    tabBar.appendChild(tabBtns[name]);
  }
 
  function showTab(name) {
    for (const n of tabNames) {
      panes[n].style.display = n === name ? "block" : "none";
      panes[n].style.overflow = n === "search" || n === "chord" ? "hidden" : "auto";
      tabBtns[n].style.fontWeight = n === name ? "bold" : "normal";
      tabBtns[n].style.borderColor = n === name ? "#ccc" : "transparent";
    }
  }
 
  function pick(btn) {
    const url = btn.dataset.url;
    current = { title: btn.textContent, url };
    panes.chord.textContent = "";
    panes.chord.appendChild($C("iframe", {
      attrs: { src: url },
      styles: { width: "100%", height: "100%", border: "none" }
    }));
    showTab("chord");
  }
 
  function renderList(container, items, emptyText) {
    container.textContent = "";
    if (!items.length) {
      container.appendChild($C("div", { props: { textContent: emptyText }, styles: { padding: "10px", color: "#888" } }));
      return;
    }
    const ul = $C("ul", { attrs: { class: "c-list" }, styles: { listStyle: "none", margin: "0", padding: "0" } });
    for (const item of items) {
      const li = $C("li");
      const btn = $C("button", {
        attrs: { "data-url": item.url },
        props: { textContent: item.title },
        styles: { display: "block", width: "100%", textAlign: "left", padding: "10px", background: "#fff", color: "#000", border: "none", borderBottom: "1px solid #eee", cursor: "pointer", fontSize: "inherit" },
        on: { click: () => pick(btn) }
      });
      li.appendChild(btn);
      ul.appendChild(li);
    }
    container.appendChild(ul);
  }
 
  function renderFavorites() {
    panes.favorite.textContent = "";
    if (!favorites.length) {
      panes.favorite.appendChild($C("div", { props: { textContent: t("noFav") }, styles: { padding: "10px", color: "#888" } }));
      return;
    }
    for (const fav of favorites) {
      const row = $C("div", {
        styles: { display: "flex", alignItems: "center", gap: "6px", padding: "4px 7px", borderBottom: "1px solid #eee" }
      });
      const openBtn = $C("button", {
        attrs: { "data-url": fav.url },
        props: { textContent: fav.title },
        styles: { flex: "1", minWidth: "0", textAlign: "left", padding: "8px", background: "#fff", color: "#000", border: "none", cursor: "pointer", fontSize: "inherit" },
        on: { click: () => pick(openBtn) }
      });
      const watchBtn = $C("button", {
        props: { textContent: t("open") },
        styles: { background: "#2196f3", color: "#fff", border: "none", borderRadius: "4px", padding: "6px 10px", cursor: "pointer", fontSize: "inherit" },
        on: { click: () => { location.href = 'https://www.youtube.com/watch?v=' + fav.videoId; } }
      });
      const delBtn = $C("button", {
        props: { textContent: t("del") },
        styles: { background: "#f0513c", color: "#fff", border: "none", borderRadius: "4px", padding: "6px 10px", cursor: "pointer", fontSize: "inherit" },
        on: {
          click: () => {
            favorites = favorites.filter(f => f !== fav);
            GM_setValue("ufret-fav", favorites);
            renderFavorites();
          }
        }
      });
      row.append(openBtn, watchBtn, delBtn);
      panes.favorite.appendChild(row);
    }
  }
 
  // ---------- options tab ----------
  const status = $C("div", { styles: { padding: "4px 0", color: "#555", minHeight: "1.2em" } });
  let statusTimer = 0;
  function setStatus(text) {
    status.textContent = text;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { status.textContent = ""; }, 3000);
  }
 
  const hideCheck = $C("input", {
    attrs: { type: "checkbox", id: "ufret-always-hide" },
    props: { checked: !!GM_getValue("ufret-hide", false) },
    styles: { margin: "0 6px 0 0" },
    on: { change: () => GM_setValue("ufret-hide", hideCheck.checked) }
  });
  const hideLabel = $C("label", {
    attrs: { for: "ufret-always-hide" },
    styles: { display: "flex", alignItems: "center", cursor: "pointer" }
  });
  hideLabel.append(hideCheck, document.createTextNode(t("alwaysHide")));
 
  function copyText(text) {
    return navigator.clipboard.writeText(text).catch(() => {
      const ta = $C("textarea", { props: { value: text }, styles: { position: "fixed", opacity: "0" } });
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      if (!ok) throw new Error("copy failed");
    });
  }
 
  function exportFav() {
    copyText(JSON.stringify(GM_getValue("ufret-fav", [])))
      .then(() => setStatus(t("exported")))
      .catch(() => setStatus(t("exportFail")));
  }
 
  async function importFav() {
    const parse = s => { try { const a = JSON.parse(s); return Array.isArray(a) ? a : null; } catch (e) { return null; } };
    let arr = null;
    try { arr = parse(await navigator.clipboard.readText()); } catch (e) {}
    if (!arr) {
      const p = prompt(t("pastePrompt"), "");
      if (p == null) return;
      arr = parse(p);
    }
    if (!arr) { setStatus(t("importFail")); return; }
    favorites = GM_getValue("ufret-fav", []);
    let n = 0;
    for (const f of arr) {
      if (!f || typeof f.videoId !== "string" || typeof f.url !== "string" || !f.url.startsWith(base)) continue;
      if (favorites.some(x => x.videoId === f.videoId)) continue; // videoIdがマッチするものは追加しない
      favorites.push({ videoId: f.videoId, title: String(f.title || f.videoId), url: f.url, speed: Number(f.speed) || 0, chordKey: Number.isFinite(Number(f.chordKey)) && f.chordKey !== null ? Number(f.chordKey) : null });
      n++;
    }
    if (n) {
      GM_setValue("ufret-fav", favorites);
      renderFavorites();
    }
    setStatus(t("imported", n));
  }
 
  const ioBtnStyle = { background: "#2196f3", color: "#fff", border: "none", borderRadius: "4px", padding: "8px 14px", cursor: "pointer", fontSize: "inherit" };
  const importBtn = $C("button", {
    attrs: { title: t("importTip") },
    props: { textContent: t("import") },
    styles: ioBtnStyle,
    on: { click: importFav }
  });
  const exportBtn = $C("button", {
    attrs: { title: t("exportTip") },
    props: { textContent: t("export") },
    styles: ioBtnStyle,
    on: { click: exportFav }
  });
  const ioRow = $C("div", { styles: { display: "flex", flexDirection: "row", gap: "8px", marginTop: "10px" } });
  ioRow.append(importBtn, exportBtn);
 
  const optionsBox = $C("div", { styles: { padding: "10px" } });
  optionsBox.append(hideLabel, ioRow, status);
  panes.options.appendChild(optionsBox);
 
  function saveCurrent() {
    if (!current || !ufretVideoId) return;
    const frame = panes.chord.querySelector("iframe");
    if (!frame) return;
    frame.contentWindow.postMessage({ type: "ufret-get-speed" }, "https://www.ufret.jp");
  }
 
  ufretOnSpeed = (speed, chordKey) => {
    if (!current || !ufretVideoId) return;
    favorites = favorites.filter(f => f.videoId !== ufretVideoId);
    favorites.push({ videoId: ufretVideoId, title: ufretSong ? current.title : ufretVideoId, url: current.url, speed, chordKey });
    GM_setValue("ufret-fav", favorites);
    renderFavorites();
  };
 
  function doSearch(auto) {
    const v = encodeURIComponent(input.value.trim());
    if (!v) return;
    renderList(panes.search, [], t("searching"));
    showTab("search");
    GM.xmlHttpRequest({
      method: "GET",
      url: `https://www.ufret.jp/search.php?key=${v}`
    }).then(r => {
      const doc = new DOMParser().parseFromString(ufretPolicy.createHTML(r.responseText), "text/html");
      const items = [];
      for (const a of doc.querySelectorAll(".c-list > li > a")) {
        items.push({ title: a.textContent.trim().replace(/\s+/g, " "), url: new URL(a.getAttribute("href"), base).href });
      }
      renderList(panes.search, items, t("notFound"));
      if (auto) panes.search.querySelector("ul > li > button")?.click();
    }).catch(() => renderList(panes.search, [], t("searchFail")));
  }
 
  overlay.append(header, bar, tabBar, panes.search, panes.chord, panes.favorite, panes.options);
  document.body.appendChild(overlay);
  renderList(panes.search, [], "");
  renderFavorites();
  showTab("search");
 
  const saved = favorites.find(f => f.videoId === ufretVideoId);
  if (ufretVideoId && saved) {
    Array.from(panes.favorite.querySelectorAll("button[data-url]")).find(b => b.dataset.url === saved.url)?.click();
  } else if (ufretSong) {
    autoPick = true;
    searchBtn.click();
  }
}
 
function initUfretFrame() {
  refreshLang();
  const container = $S("#container");
  if (!container) return;
  const savedFav = GM_getValue("ufret-fav", []).find(f => f.url === location.href);
  let speed = 20;
  if (savedFav && Number.isFinite(Number(savedFav.speed))) speed = Number(savedFav.speed);
  let paused = true; // #my-chord-data をクリックするとスクロール開始/停止
  let last = 0;
  let rest = 0;
  let raf = 0;
 
  function tick(t) {
    if (last) {
      rest += speed * (t - last) / 1000;
      const step = Math.trunc(rest);
      if (step) {
        scrollBy(0, step);
        rest -= step;
      }
    }
    last = t;
    raf = speed > 0 && !paused ? requestAnimationFrame(tick) : 0;
  }
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }
  function run() {
    stop();
    last = 0;
    rest = 0;
    raf = speed > 0 && !paused ? requestAnimationFrame(tick) : 0;
  }
  function readSpeed() {
    return Math.max(0, Number(speedInput.value) || 0);
  }
  function readKey() {
    const n = parseInt($SA("#scrollbar-value > span")[1]?.textContent, 10);
    return Number.isNaN(n) ? null : n;
  }
  // 保存したchordKeyになるまでminus/plusをclick
  function applyKey(target) {
    let tries = 0;
    const iv = setInterval(() => {
      if (++tries > 100) { clearInterval(iv); return; }
      const cur = readKey();
      const minus = $S('[data-group="scroll-capo"]>div>div>.scroll-button--minus>span');
      const plus = $S('[data-group="scroll-capo"]>div>div>.scroll-button--plus>span');
      if (cur === null || !minus || !plus) return;
      if (cur === target) { clearInterval(iv); return; }
      (cur > target ? minus : plus).click();
    }, 100);
  }
 
  const speedInput = $C("input", {
    attrs: { type: "number", min: "0", step: "1" },
    props: { value: speed },
    styles: { width: "80px", padding: "4px", border: "1px solid #ccc", borderRadius: "4px" },
    on: {
      focus: stop,
      blur: () => {
        speed = readSpeed();
        speedInput.value = speed;
        run();
      },
      keydown: ev => { if (ev.key === "Enter") speedInput.blur(); }
    }
  });
  const label = $C("label", {
    props: { textContent: I18N[langKey].speed },
    styles: { display: "block", padding: "6px 10px", background: "#f5f5f5", fontSize: "14px", color: "#000" }
  });
  label.append(speedInput);
  container.before(label);
 
  addEventListener("message", e => {
    if (e.data?.type !== "ufret-get-speed") return;
    e.source.postMessage({ type: "ufret-speed", speed: readSpeed(), chordKey: readKey() }, e.origin);
  });
  if (savedFav && savedFav.chordKey != null && Number.isFinite(Number(savedFav.chordKey))) applyKey(Number(savedFav.chordKey));
 
  const chordData = $S("#my-chord-data");
  if (chordData) {
    chordData.onclick = null;
    chordData.addEventListener("click", ev => {
      ev.preventDefault();
      paused = !paused;
      if (paused) stop();
      else run();
    });
  }
}
 
if (inUfretFrame) {
  GM_addStyle(`
    .c-list__favorite, .l-header, .p-trial.--head, .p-detail-head , .p-set__wrap, .u-mt-8.u-text-center, .c-text__lv4.u-text-center.u-text-bold.u-mt-20,
    .musical-score-item, .c-tab, .u-hide_pc, .u-mt-20.u-text-center, .p-trial, section.l-section.u-pb-25, footer, .l-breadcrumb { display: none !important; }
    .c-list__text { display: flex; flex-wrap: wrap; gap: 12px; }
  `)
  $S("#musical-score-header").click(); $S("#function-setting-header").click();$S("#my-chord-data").onclick = null
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", initUfretFrame);
  else initUfretFrame();
} else {
  refreshLang();
  GM_registerMenuCommand(t("reset"), () => {
    GM_deleteValue("ufret-pos");
    GM_deleteValue("ufret-size");
  });
  addEventListener("message", e => {
    if (e.origin !== "https://www.ufret.jp" || e.data?.type !== "ufret-speed") return;
    ufretOnSpeed?.(e.data.speed, e.data.chordKey);
  });
  addEventListener("yt-navigate-finish", e => {
    ufretSong = "";
    ufretVideoId = "";
    const pageType = e?.detail?.pageType;
    let attempts = 0;
    const iv = setInterval(() => {
      if (++attempts > 50) { clearInterval(iv); return; }
      const controlContainer = $S("#menu>ytd-menu-renderer.style-scope.ytd-watch-metadata");
      if (!controlContainer) return;
      clearInterval(iv);
      if ($S("#ufret-control-btn")) return;
      refreshLang();
      const controlBtn = $C("button", {
        attrs: {
          id: "ufret-control-btn",
          class: "ytSpecButtonShapeNextHost ytSpecButtonShapeNextTonal ytSpecButtonShapeNextMono ytSpecButtonShapeNextSizeM ytSpecButtonShapeNextIconButton ytSpecButtonShapeNextEnableBackdropFilterExperiment ytSpecButtonShapeNextMainstageIconSize ytSpecButtonShapeNextMainstagePadding",
          title: t("chords"),
          "aria-label": t("chords")
        },
        props: { innerHTML: ufretPolicy.createHTML('<div aria-hidden="true" class="ytSpecButtonShapeNextIcon ytSpecButtonShapeNextElevatedContent">𝄞</div>') },
        on: { click: () => toggleOverlay() } // 常にtoggle (非表示中なら表示、表示中なら閉じる)
      });
      controlContainer.appendChild(controlBtn);
    }, 200);
    if (pageType !== "watch") return;
    const res = e?.detail?.response?.response;
    const videoId = res?.currentVideoEndpoint?.watchEndpoint?.videoId ?? new URLSearchParams(location.search).get("v") ?? "";
    let song = "";
    for (const i of res?.engagementPanels ?? []) {
      const items = (i?.engagementPanelSectionListRenderer?.content?.structuredDescriptionContentRenderer?.items ?? []).filter(x => x && x.horizontalCardListRenderer).map(x => x.horizontalCardListRenderer);
      if (items.length === 1) {
        const title = items[0]?.cards?.[0]?.videoAttributeViewModel?.title;
        if (title) { song = title; break; }
      }
    }
    ufretSong = song;
    ufretVideoId = videoId;
    if (!song && !GM_getValue("ufret-fav", []).some(f => f.videoId === videoId)) return;
    $S("#ufret-overlay")?.remove();
    // "Always hide" が有効でもオーバーレイは作成し(doSearchは実行)、表示だけしない
    toggleOverlay(!!GM_getValue("ufret-hide", false));
  });
}

GM_addStyle(`
#ufret-control-btn > div {
    line-height: normal;
}
`)
