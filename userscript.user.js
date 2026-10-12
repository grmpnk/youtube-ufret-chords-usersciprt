// ==UserScript==
// @name         YouTube - ufret chord
// @name:ja      YouTube - ufretコード
// @namespace    https://greasyfork.org/ja/users/941284-%E3%81%90%E3%82%89%E3%82%93%E3%81%B4
// @version      0.2
// @description  show ufret chords on YouTube
// @description:ja  YouTubeでufretのコードを表示する
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

function toggleOverlay() {
    const old = $S("#ufret-overlay");
    if (old) { old.remove(); return; }
    const base = "https://www.ufret.jp/";
    const tabNames = ["search", "chord", "favorite", "options"];
    const pos = GM_getValue("ufret-pos", { left: Math.max(0, innerWidth - 412), top: 0 });
    const size = GM_getValue("ufret-size", { width: 412, height: Math.round(innerHeight * 0.8) });
    let current = null;
    let drag = null;
    let autoPick = false;
    let favorites = GM_getValue("ufret-fav", []);

    const overlay = $C("div", {
        attrs: { id: "ufret-overlay" },
        styles: {
            position: "fixed", left: pos.left + "px", top: pos.top + "px", width: size.width + "px", height: size.height + "px",
            minWidth: "300px", minHeight: "200px", maxWidth: "100vw", maxHeight: "100vh", resize: "both", overflow: "hidden",
            background: "#fff", color: "#000", zIndex: "2147483647", display: "flex", flexDirection: "column",
            boxShadow: "0 0 12px rgba(0,0,0,.4)", fontSize: "14px", fontFamily: "sans-serif"
        },
        on: {
            pointerup: () => GM_setValue("ufret-size", { width: overlay.offsetWidth, height: overlay.offsetHeight })
        }
    });

    const closeBtn = $C("button", {
        props: { textContent: "Close" },
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
    header.append($C("strong", { props: { textContent: "ここをドラッグで移動" } }), closeBtn);

    const input = $C("input", {
        attrs: { type: "text", placeholder: "弾きたい曲を検索" },
        props: { value: ufretSong },
        styles: { flex: "1", minWidth: "0", padding: "8px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "inherit" },
        on: { keydown: ev => { if (ev.key === "Enter") searchBtn.click(); } }
    });

    const searchBtn = $C("button", {
        props: { textContent: "検索" },
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
        props: { textContent: "保存" },
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
            props: { textContent: name },
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
        const url = btn.getAttribute("href");
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
                attrs: { href: item.url },
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
            panes.favorite.appendChild($C("div", { props: { textContent: "お気に入りはありません" }, styles: { padding: "10px", color: "#888" } }));
            return;
        }
        for (const fav of favorites) {
            const row = $C("div", {
                styles: { display: "flex", alignItems: "center", gap: "6px", padding: "4px 7px", borderBottom: "1px solid #eee" }
            });
            const openBtn = $C("button", {
                attrs: { href: fav.url },
                props: { textContent: fav.title },
                styles: { flex: "1", minWidth: "0", textAlign: "left", padding: "8px", background: "#fff", color: "#000", border: "none", cursor: "pointer", fontSize: "inherit" },
                on: { click: () => pick(openBtn) }
            });
            const watchBtn = $C("button", {
                props: { textContent: "開く" },
                styles: { background: "#2196f3", color: "#fff", border: "none", borderRadius: "4px", padding: "6px 10px", cursor: "pointer", fontSize: "inherit" },
                on: { click: () => { location.href = 'https://www.youtube.com/watch?v=' + fav.videoId; } }
            });
            const delBtn = $C("button", {
                props: { textContent: "削除" },
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

    function saveCurrent() {
        if (!current || !ufretVideoId) return;
        const frame = panes.chord.querySelector("iframe");
        if (!frame) return;
        frame.contentWindow.postMessage({ type: "ufret-get-speed" }, "https://www.ufret.jp");
    }

    ufretOnSpeed = speed => {
        if (!current || !ufretVideoId) return;
        favorites = favorites.filter(f => f.videoId !== ufretVideoId);
        favorites.push({ videoId: ufretVideoId, title: ufretSong ? current.title : ufretVideoId, url: current.url, speed });
        GM_setValue("ufret-fav", favorites);
        renderFavorites();
    };

    function doSearch(auto) {
        const v = encodeURIComponent(input.value.trim());
        if (!v) return;
        renderList(panes.search, [], "検索中...");
        showTab("search");
        GM.xmlHttpRequest({
            method: "GET",
            url: `https://www.ufret.jp/search.php?key=${v}`
        }).then(r => {
            const doc = new DOMParser().parseFromString(r.responseText, "text/html");
            const items = [];
            for (const a of doc.querySelectorAll(".c-list > li > a")) {
                items.push({ title: a.textContent.trim().replace(/\s+/g, " "), url: new URL(a.getAttribute("href"), base).href });
            }
            renderList(panes.search, items, "見つかりませんでした");
            if (auto) panes.search.querySelector("ul > li > button")?.click();
        }).catch(() => renderList(panes.search, [], "検索に失敗しました"));
    }

    overlay.append(header, bar, tabBar, panes.search, panes.chord, panes.favorite, panes.options);
    document.body.appendChild(overlay);
    renderList(panes.search, [], "");
    renderFavorites();
    showTab("search");

    const saved = favorites.find(f => f.videoId === ufretVideoId);
    if (ufretVideoId && saved) {
        Array.from(panes.favorite.querySelectorAll("button[href]")).find(b => b.getAttribute("href") === saved.url)?.click();
    } else if (ufretSong) {
        autoPick = true;
        searchBtn.click();
    }
}

function initUfretFrame() {
    const container = $S("#container");
    if (!container) return;
    const savedFav = GM_getValue("ufret-fav", []).find(f => f.url === location.href);
    let speed = Number(savedFav?.speed) || 0;
    let paused = false;
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
        props: { textContent: "スクロール速度(px/秒) " },
        styles: { display: "block", padding: "6px 10px", background: "#f5f5f5", fontSize: "14px", color: "#000" }
    });
    label.append(speedInput);
    container.before(label);

    $S("#my-chord-data")?.addEventListener("click", () => {
        paused = !paused;
        run();
    });

    addEventListener("message", e => {
        if (e.data?.type !== "ufret-get-speed") return;
        e.source.postMessage({ type: "ufret-speed", speed: readSpeed() }, e.origin);
    });

    run();
}

if (inUfretFrame) {
    GM_addStyle(`
.c-list__favorite, .l-header, .p-trial.--head, .p-detail-head , .p-set__wrap, .u-mt-8.u-text-center, .c-text__lv4.u-text-center.u-text-bold.u-mt-20,
.musical-score-item, .c-tab, .u-hide_pc, .u-mt-20.u-text-center, .p-trial, section.l-section.u-pb-25, footer, .l-breadcrumb { display: none !important; }
.c-list__text { display: flex; flex-wrap: wrap; gap: 12px; }
`)
    $S("#musical-score-header").click(); $S("#function-setting-header").click(); $S("#my-chord-data").onclick = null
    if (document.readyState === "loading") addEventListener("DOMContentLoaded", initUfretFrame);
    else initUfretFrame();
} else {
    GM_registerMenuCommand("ufretの位置とサイズをリセット", () => {
        GM_deleteValue("ufret-pos");
        GM_deleteValue("ufret-size");
    });
    addEventListener("message", e => {
        if (e.origin !== "https://www.ufret.jp" || e.data?.type !== "ufret-speed") return;
        ufretOnSpeed?.(e.data.speed);
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
            const controlBtn = $C("button", {
                attrs: {
                    id: "ufret-control-btn",
                    class: "ytSpecButtonShapeNextHost ytSpecButtonShapeNextTonal ytSpecButtonShapeNextMono ytSpecButtonShapeNextSizeM ytSpecButtonShapeNextIconButton ytSpecButtonShapeNextEnableBackdropFilterExperiment ytSpecButtonShapeNextMainstageIconSize ytSpecButtonShapeNextMainstagePadding",
                    title: "コード",
                    "aria-label": "コード"
                },
                props: { innerHTML: ufretPolicy.createHTML('<div aria-hidden="true" class="ytSpecButtonShapeNextIcon ytSpecButtonShapeNextElevatedContent">𝄞</div>') },
                on: { click: toggleOverlay }
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
        toggleOverlay();
    });
}
