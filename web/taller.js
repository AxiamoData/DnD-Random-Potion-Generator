// AUTH_CLIENT, authGetSession, authSignOut, authOnChange defined in auth.js (loaded first)

const QUALITY_LABEL = {
  "Tosca -- 8d4 + 8.":     { pct: "10%",  label: "Tosca" },
  "Simple -- 6d4 + 6.":    { pct: "25%",  label: "Simple" },
  "Refinada -- 4d4 + 4.":  { pct: "45%",  label: "Refinada" },
  "Pura -- 2d4 + 2.":      { pct: "65%",  label: "Pura" },
  "Exquisita -- 1d4 + 1.": { pct: "85%",  label: "Exquisita" },
  "Perfecta.":              { pct: "100%", label: "Perfecta ✦" },
};

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

function renderSavedPotions(rows) {
  const section = document.getElementById("potions-section");
  const count   = document.getElementById("potions-count");
  count.textContent = `${rows.length} poción${rows.length !== 1 ? "es" : ""}`;

  if (rows.length === 0) {
    section.innerHTML = `<p class="px-5 py-6 text-center font-label text-sm text-on-surface-variant">No tienes pociones guardadas.</p>`;
    return;
  }

  section.innerHTML = rows.map(({ slot_index, potion: p }) => {
    const qMeta     = QUALITY_LABEL[p.quality] ?? { pct: "0%", label: p.quality };
    const mainTitle = escapeHtml(p.mainEffect.split(".")[0]);
    const side      = p.isPerfect
      ? `<span class="text-primary/50">Sin efectos secundarios</span>`
      : escapeHtml(formatText(p.sideEffect));
    const side2 = p.sideEffect2
      ? `<br><span class="italic">${escapeHtml(formatText(p.sideEffect2))}</span>`
      : "";

    return `
      <div class="flex gap-3 px-4 py-3 border-b border-outline-variant/10 last:border-0">
        <span class="font-label text-[9px] text-on-surface-variant/40 pt-1 w-5 shrink-0 text-right select-none">${slot_index + 1}</span>
        <div class="flex-1 space-y-1.5 min-w-0">
          <div class="font-headline text-sm text-primary leading-tight">${escapeHtml(p.title)} de ${mainTitle}</div>
          <div class="flex items-center gap-2">
            <span class="font-label text-[9px] uppercase tracking-widest text-on-surface-variant/60">${escapeHtml(qMeta.label)}</span>
            <div class="flex-1 h-1 rounded-full bg-outline-variant/20 max-w-[60px]">
              <div class="h-1 rounded-full bg-primary/50" style="width:${qMeta.pct}"></div>
            </div>
          </div>
          <div class="text-on-surface-variant text-xs italic leading-relaxed">${side}${side2}</div>
        </div>
      </div>
    `;
  }).join("");
}

function renderCustomTexts(rows) {
  const section = document.getElementById("texts-section");
  const count   = document.getElementById("texts-count");
  count.textContent = `${rows.length} texto${rows.length !== 1 ? "s" : ""}`;

  if (rows.length === 0) {
    section.innerHTML = `<p class="px-5 py-6 text-center font-label text-sm text-on-surface-variant">No has añadido textos personalizados.</p>`;
    return;
  }

  const grouped = {};
  for (const { category, text } of rows) {
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(text);
  }

  section.innerHTML = Object.entries(grouped).map(([category, texts]) => `
    <div class="border-b border-outline-variant/10 last:border-0">
      <div class="px-4 py-2 bg-surface-container/40">
        <span class="font-label text-[9px] uppercase tracking-widest text-primary/60">${escapeHtml(CATEGORY_NAME[category] ?? category)}</span>
      </div>
      ${texts.map((text, i) => `
        <div class="flex gap-3 px-4 py-2.5 ${i % 2 === 0 ? "" : "bg-surface-container/20"}">
          <span class="font-label text-[9px] text-on-surface-variant/30 pt-0.5 w-4 shrink-0 text-right select-none">${i + 1}</span>
          <span class="text-on-surface text-sm leading-relaxed">${escapeHtml(formatText(text))}</span>
        </div>
      `).join("")}
    </div>
  `).join("");
}

document.addEventListener("DOMContentLoaded", async () => {
  const session = await authGetSession();
  renderAuthZone(session);

  const guestSection  = document.getElementById("guest-section");
  const tallerContent = document.getElementById("taller-content");

  if (!session) {
    guestSection.removeAttribute("hidden");
    return;
  }

  tallerContent.removeAttribute("hidden");
  if (!AUTH_CLIENT) return;

  const [{ data: potions }, { data: texts }] = await Promise.all([
    AUTH_CLIENT.from("saved_potions").select("slot_index, potion").eq("user_id", session.user.id).order("slot_index"),
    AUTH_CLIENT.from("custom_texts").select("category, text").eq("user_id", session.user.id).order("category"),
  ]);

  renderSavedPotions(potions ?? []);
  renderCustomTexts(texts  ?? []);
});
