// AUTH_CLIENT, authGetSession, authSignOut, authOnChange from auth.js

const CATEGORY_NAME = {
  mainEffects:   "Efecto Principal",
  sideEffects:   "Efecto Secundario",
  containers:    "Recipiente",
  labels:        "Etiqueta",
  appearance:    "Color",
  appearance2:   "Apariencia",
  tasteAndSmell: "Sabor / Olor",
  textures:      "Textura",
  duration:      "Duración",
};

let _session     = null;
let _myFollowIds = new Set();
let _profiles    = [];

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatText(text) {
  const t = text.trim();
  if (!t) return t;
  const c = t.charAt(0).toUpperCase() + t.slice(1);
  return c.endsWith(".") ? c : c + ".";
}

// ── Auth zone ──────────────────────────────────────────────────────────────────

function renderAuthZone(session) {
  const zone = document.getElementById("auth-zone");
  if (!zone) return;
  if (session) {
    zone.innerHTML = `
      <span class="font-label text-[10px] text-on-surface-variant hidden sm:block truncate max-w-[130px]">${escapeHtml(session.user.email)}</span>
      <button id="signout-btn" class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/50 hover:text-error transition-colors px-2 py-1 flex items-center gap-1">
        <span class="material-symbols-outlined" style="font-size:14px">logout</span>Salir
      </button>
    `;
    document.getElementById("signout-btn").addEventListener("click", authSignOut);
  } else {
    zone.innerHTML = `
      <a href="login.html" class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/50 hover:text-primary transition-colors flex items-center gap-1">
        <span class="material-symbols-outlined" style="font-size:14px">login</span>Iniciar sesión
      </a>
    `;
  }
}

// ── Marketplace data ───────────────────────────────────────────────────────────

async function loadMarketplace() {
  if (!AUTH_CLIENT) return;

  const list = document.getElementById("marketplace-list");
  list.innerHTML = `<p class="px-5 py-8 text-center font-label text-sm text-on-surface-variant/50">Cargando alquimistas...</p>`;

  const followsQuery = _session
    ? AUTH_CLIENT.from("follows").select("following_id").eq("follower_id", _session.user.id)
    : Promise.resolve({ data: [] });

  const [profilesRes, textsRes, followsRes] = await Promise.all([
    AUTH_CLIENT.from("profiles").select("user_id, alias"),
    AUTH_CLIENT.from("custom_texts").select("user_id"),
    followsQuery,
  ]);

  const textCountMap = {};
  for (const { user_id } of textsRes.data ?? []) {
    textCountMap[user_id] = (textCountMap[user_id] ?? 0) + 1;
  }

  _myFollowIds = new Set((followsRes.data ?? []).map(f => f.following_id));

  _profiles = (profilesRes.data ?? [])
    .filter(p => (textCountMap[p.user_id] ?? 0) > 0)
    .filter(p => !_session || p.user_id !== _session.user.id)
    .map(p => ({ ...p, textCount: textCountMap[p.user_id] ?? 0 }))
    .sort((a, b) => a.alias.localeCompare(b.alias));

  renderMarketplace();
}

// ── Marketplace render ─────────────────────────────────────────────────────────

function followBtnClass(isFollowing) {
  return isFollowing
    ? "follow-btn shrink-0 font-label text-[9px] uppercase tracking-widest border rounded-lg px-2.5 py-1 transition-colors text-on-surface-variant/50 border-outline-variant/30 hover:text-error hover:border-error/30"
    : "follow-btn shrink-0 font-label text-[9px] uppercase tracking-widest border rounded-lg px-2.5 py-1 transition-colors text-primary border-primary/30 hover:bg-primary/10";
}

let _searchQuery = "";

function renderMarketplace() {
  const list  = document.getElementById("marketplace-list");
  const count = document.getElementById("marketplace-count");

  const filtered = _searchQuery
    ? _profiles.filter(p => p.alias.toLowerCase().includes(_searchQuery))
    : _profiles;

  count.textContent = `${filtered.length} alquimista${filtered.length !== 1 ? "s" : ""}`;

  if (filtered.length === 0) {
    list.innerHTML = _profiles.length === 0
      ? `<p class="px-5 py-8 text-center font-label text-sm text-on-surface-variant/50">Aún no hay alquimistas con textos publicados.</p>`
      : `<p class="px-5 py-8 text-center font-label text-sm text-on-surface-variant/50">Sin resultados para "${escapeHtml(_searchQuery)}".</p>`;
    return;
  }

  list.innerHTML = filtered.map((p, i) => {
    const isFollowing   = _myFollowIds.has(p.user_id);
    const followControl = _session
      ? `<button class="${followBtnClass(isFollowing)}" data-uid="${escapeHtml(p.user_id)}" data-following="${isFollowing ? "1" : "0"}">${isFollowing ? "Siguiendo" : "Seguir"}</button>`
      : `<a href="login.html" class="shrink-0 font-label text-[9px] uppercase tracking-widest text-on-surface-variant/30 border border-outline-variant/20 rounded-lg px-2.5 py-1 hover:text-primary hover:border-primary/30 transition-colors">Seguir</a>`;

    return `
      <div class="border-b border-outline-variant/10 last:border-0" data-uid="${escapeHtml(p.user_id)}">
        <div class="flex items-center gap-3 px-5 py-4 ${i % 2 === 0 ? "" : "bg-surface-container/20"}">
          <button class="expand-btn flex-1 text-left min-w-0 flex items-center gap-3">
            <span class="expand-icon material-symbols-outlined text-on-surface-variant/30 shrink-0 transition-transform duration-200" style="font-size:16px">expand_more</span>
            <div class="min-w-0">
              <span class="font-headline text-base text-primary block leading-tight">${escapeHtml(p.alias)}</span>
              <span class="font-label text-[10px] text-on-surface-variant/50">${p.textCount} texto${p.textCount !== 1 ? "s" : ""}</span>
            </div>
          </button>
          ${followControl}
        </div>
        <div class="texts-panel hidden flex-col gap-0"></div>
      </div>
    `;
  }).join("");

  list.querySelectorAll(".expand-btn").forEach(btn => {
    btn.addEventListener("click", () => toggleExpand(btn.closest("[data-uid]")));
  });

  list.querySelectorAll(".follow-btn").forEach(btn => {
    btn.addEventListener("click", () => toggleFollow(btn.dataset.uid, btn));
  });
}

// ── Expand card ────────────────────────────────────────────────────────────────

async function toggleExpand(card) {
  const panel   = card.querySelector(".texts-panel");
  const chevron = card.querySelector(".expand-icon");
  const isOpen  = !panel.classList.contains("hidden");

  if (isOpen) {
    panel.classList.add("hidden");
    panel.classList.remove("flex");
    chevron.style.transform = "";
    return;
  }

  panel.classList.remove("hidden");
  panel.classList.add("flex");
  chevron.style.transform = "rotate(180deg)";

  if (panel.dataset.loaded) return;
  panel.dataset.loaded = "1";
  panel.innerHTML = `<p class="py-4 text-center font-label text-xs text-on-surface-variant/40">Cargando...</p>`;

  const { data: texts } = await AUTH_CLIENT
    .from("custom_texts")
    .select("text, category")
    .eq("user_id", card.dataset.uid)
    .order("created_at");

  if (!texts || texts.length === 0) {
    panel.innerHTML = `<p class="py-3 text-center font-label text-xs text-on-surface-variant/40">Sin textos.</p>`;
    return;
  }

  const grouped = {};
  for (const t of texts) {
    if (!grouped[t.category]) grouped[t.category] = [];
    grouped[t.category].push(t.text);
  }

  const cats        = Object.keys(grouped);
  const multiCat    = cats.length > 1;
  const firstCat    = cats[0];
  const panelId     = `panel-${card.dataset.uid.slice(0, 8)}`;

  const tabsHtml = multiCat ? `
    <div class="flex gap-1.5 flex-wrap px-5 pt-3 pb-2 border-b border-outline-variant/10">
      ${cats.map((cat, i) => `
        <button class="cat-tab font-label text-[9px] uppercase tracking-widest rounded-lg px-2.5 py-1 transition-colors ${i === 0 ? "bg-primary/15 text-primary" : "text-on-surface-variant/50 hover:text-on-surface"}" data-cat="${escapeHtml(cat)}">${escapeHtml(CATEGORY_NAME[cat] ?? cat)}</button>
      `).join("")}
    </div>
  ` : "";

  const textListHtml = (cat) => `
    <div class="px-5 pt-3 pb-4">
      ${grouped[cat].map(text => `
        <div class="flex items-start gap-2.5 py-1.5 border-b border-outline-variant/5 last:border-0">
          <span class="text-primary/30 text-sm mt-0.5 shrink-0 select-none">·</span>
          <span class="text-on-surface-variant text-sm leading-relaxed">${escapeHtml(formatText(text))}</span>
        </div>
      `).join("")}
    </div>
  `;

  panel.innerHTML = tabsHtml + `<div class="texts-body">${textListHtml(firstCat)}</div>`;

  if (multiCat) {
    panel.querySelectorAll(".cat-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        panel.querySelectorAll(".cat-tab").forEach(t => {
          t.className = "cat-tab font-label text-[9px] uppercase tracking-widest rounded-lg px-2.5 py-1 transition-colors text-on-surface-variant/50 hover:text-on-surface";
        });
        tab.className = "cat-tab font-label text-[9px] uppercase tracking-widest rounded-lg px-2.5 py-1 transition-colors bg-primary/15 text-primary";
        panel.querySelector(".texts-body").innerHTML = textListHtml(tab.dataset.cat);
      });
    });
  }
}

// ── Follow / unfollow ──────────────────────────────────────────────────────────

async function toggleFollow(userId, btn) {
  const isFollowing = btn.dataset.following === "1";
  btn.disabled = true;
  btn.style.opacity = "0.5";

  if (isFollowing) {
    const { error } = await AUTH_CLIENT.from("follows")
      .delete()
      .eq("follower_id", _session.user.id)
      .eq("following_id", userId);

    if (!error) {
      _myFollowIds.delete(userId);
      btn.dataset.following = "0";
      btn.textContent = "Seguir";
      btn.className   = followBtnClass(false);
    }
  } else {
    const { error } = await AUTH_CLIENT.from("follows")
      .insert({ follower_id: _session.user.id, following_id: userId, active: true });

    if (!error) {
      _myFollowIds.add(userId);
      btn.dataset.following = "1";
      btn.textContent = "Siguiendo";
      btn.className   = followBtnClass(true);
    }
  }

  btn.disabled = false;
  btn.style.opacity = "";
}

// ── Init ───────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  _session = await authGetSession();
  renderAuthZone(_session);
  await loadMarketplace();

  document.getElementById("alias-search").addEventListener("input", (e) => {
    _searchQuery = e.target.value.trim().toLowerCase();
    renderMarketplace();
  });

  authOnChange((session, event) => {
    if (event === "INITIAL_SESSION") return;
    _session = session;
    renderAuthZone(session);
    loadMarketplace();
  });
});
