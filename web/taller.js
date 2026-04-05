// AUTH_CLIENT, authGetSession, authSignOut, authOnChange defined in auth.js (loaded first)

const QUALITY_LABEL = {
  "Tosca -- 8d4 + 8.":     { pct: "10%",  label: "Tosca" },
  "Simple -- 6d4 + 6.":    { pct: "25%",  label: "Simple" },
  "Refinada -- 4d4 + 4.":  { pct: "45%",  label: "Refinada" },
  "Pura -- 2d4 + 2.":      { pct: "65%",  label: "Pura" },
  "Exquisita -- 1d4 + 1.": { pct: "85%",  label: "Exquisita" },
  "Perfecta.":              { pct: "100%", label: "Perfecta ✦" },
};

const POTENCY_RARITY = {
  "Menor -- 1d4 + 1.":     "Artefacto Común",
  "Común -- 2d4 + 2.":     "Artefacto Poco Común",
  "Mayor -- 4d4 + 4.":     "Artefacto Inusual",
  "Poderosa -- 6d4 + 6.":  "Artefacto Raro",
  "Superior -- 8d4 + 8.":  "Artefacto Muy Raro",
  "Suprema -- 10d4 + 20.": "Artefacto Legendario",
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

let _allTexts = [];
let _userId   = null;
let _currentAlias = '';

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

// ── Alias section ─────────────────────────────────────────────────────────────

function renderAlias(alias) {
  _currentAlias = alias;
  document.getElementById('alias-display').textContent = alias;
}

function showAliasView() {
  document.getElementById('alias-view').style.display = '';
  document.getElementById('alias-edit').style.display = 'none';
}

function showAliasEdit() {
  document.getElementById('alias-input').value = _currentAlias;
  document.getElementById('alias-view').style.display = 'none';
  document.getElementById('alias-edit').style.display = '';
  document.getElementById('alias-input').focus();
}

async function saveAlias() {
  const newAlias = document.getElementById('alias-input').value.trim();
  if (!newAlias || newAlias === _currentAlias) { showAliasView(); return; }

  const saveBtn = document.getElementById('alias-save-btn');
  saveBtn.textContent = '...';
  saveBtn.disabled = true;

  const { error } = await AUTH_CLIENT.from('profiles')
    .update({ alias: newAlias })
    .eq('user_id', _userId);

  saveBtn.textContent = 'Guardar';
  saveBtn.disabled = false;

  if (!error) {
    renderAlias(newAlias);
    showAliasView();
  }
}

async function loadAlias(session) {
  const { data } = await AUTH_CLIENT
    .from('profiles')
    .select('alias')
    .eq('user_id', session.user.id)
    .single();
  renderAlias(data?.alias ?? '—');
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

// ── Markdown export ────────────────────────────────────────────────────────────

function buildPotionMarkdown(p) {
  const qMeta     = QUALITY_LABEL[p.quality] ?? { label: p.quality };
  const mainTitle = p.mainEffect.split(".")[0];
  const rarity    = POTENCY_RARITY[p.potency] ?? p.potency;
  const ft        = t => formatText(t);

  const sideSection = p.isPerfect
    ? `## Efecto Secundario\n${p.sideEffect}`
    : p.isBad
    ? `## Efectos Secundarios\n- ${ft(p.sideEffect)}\n- ${ft(p.sideEffect2)}`
    : `## Efecto Secundario\n${ft(p.sideEffect)}`;

  return [
    `# ${p.title} de ${mainTitle}`,
    ``,
    `*${p.title} · ${rarity}*`,
    ``,
    `## Efecto Principal`,
    ft(p.mainEffect),
    ``,
    sideSection,
    ``,
    `## Detalles`,
    ``,
    `| Campo | Valor |`,
    `|-------|-------|`,
    `| Recipiente | ${ft(p.container)} |`,
    `| Etiqueta | ${ft(p.label)} |`,
    `| Apariencia | ${ft(p.appearance)} |`,
    `| Textura | ${ft(p.texture)} |`,
    `| Olor | ${ft(p.smell)} |`,
    `| Sabor | ${ft(p.taste)} |`,
    `| Potencia | ${p.potency} |`,
    `| Duración | ${ft(p.duration)} |`,
    ``,
    `## Calidad`,
    qMeta.label,
  ].join("\n");
}

// ── Modal ──────────────────────────────────────────────────────────────────────

let _modalPotion = null;

function openPotionModal(p) {
  _modalPotion = p;
  const mainTitle = p.mainEffect.split(".")[0];
  const qMeta = QUALITY_LABEL[p.quality] ?? { pct: "0%", label: p.quality };

  document.getElementById("modal-title").textContent    = `${p.title} de ${mainTitle}`;
  document.getElementById("modal-subtitle").textContent = `${p.title} · ${POTENCY_RARITY[p.potency] ?? "Artefacto"}`;
  document.getElementById("modal-main-effect").textContent = formatText(p.mainEffect);

  document.getElementById("modal-side-label").textContent   = p.isBad ? "Efectos Secundarios" : "Efecto Secundario";
  document.getElementById("modal-side-effect").textContent  = p.isPerfect ? p.sideEffect : formatText(p.sideEffect);

  const side2El = document.getElementById("modal-side-effect-2");
  if (p.sideEffect2) {
    side2El.textContent = formatText(p.sideEffect2);
    side2El.removeAttribute("hidden");
  } else {
    side2El.setAttribute("hidden", "");
  }

  document.getElementById("modal-container").textContent  = formatText(p.container);
  document.getElementById("modal-label").textContent      = formatText(p.label);
  document.getElementById("modal-appearance").textContent = formatText(p.appearance);
  document.getElementById("modal-texture").textContent    = formatText(p.texture);
  document.getElementById("modal-smell").textContent      = formatText(p.smell);
  document.getElementById("modal-taste").textContent      = formatText(p.taste);
  document.getElementById("modal-potency").textContent    = p.potency;
  document.getElementById("modal-duration").textContent   = formatText(p.duration);

  document.getElementById("modal-quality-bar").style.width    = qMeta.pct;
  document.getElementById("modal-quality-label").textContent  = qMeta.label;

  const exportBtn = document.getElementById("modal-export");
  exportBtn.textContent = "Exportar MD";
  exportBtn.disabled = false;

  const modal = document.getElementById("potion-modal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closePotionModal() {
  const modal = document.getElementById("potion-modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

// ── Potions section ────────────────────────────────────────────────────────────

function renderSavedPotions(rows) {
  const section = document.getElementById("potions-section");
  const count   = document.getElementById("potions-count");
  count.textContent = `${rows.length} poción${rows.length !== 1 ? "es" : ""}`;

  if (rows.length === 0) {
    section.innerHTML = `<p class="px-5 py-6 text-center font-label text-sm text-on-surface-variant">No tienes pociones guardadas.</p>`;
    return;
  }

  const potionMap = {};
  section.innerHTML = rows.map(({ slot_index, potion: p }) => {
    potionMap[slot_index] = p;
    const qMeta     = QUALITY_LABEL[p.quality] ?? { pct: "0%", label: p.quality };
    const mainTitle = escapeHtml(p.mainEffect.split(".")[0]);
    const rarity    = escapeHtml(POTENCY_RARITY[p.potency] ?? p.potency ?? "");
    return `
      <button class="w-full text-left flex items-center gap-3 px-4 py-3 border-b border-outline-variant/10 last:border-0 hover:bg-surface-container/50 active:bg-surface-container transition-colors" data-slot="${slot_index}">
        <span class="font-label text-[9px] text-on-surface-variant/40 w-5 shrink-0 text-right select-none">${slot_index + 1}</span>
        <div class="flex-1 space-y-1.5 min-w-0">
          <div class="font-headline text-sm text-primary leading-tight">${escapeHtml(p.title)} de ${mainTitle}</div>
          <div class="flex items-center gap-2">
            <span class="font-label text-[9px] uppercase tracking-widest text-on-surface-variant/60">${escapeHtml(qMeta.label)}</span>
            <div class="h-1 rounded-full bg-outline-variant/20 w-12 shrink-0">
              <div class="h-1 rounded-full bg-primary/50" style="width:${qMeta.pct}"></div>
            </div>
            <span class="font-label text-[9px] text-on-surface-variant/40 truncate">${rarity}</span>
          </div>
        </div>
        <span class="material-symbols-outlined text-on-surface-variant/30 shrink-0" style="font-size:16px">chevron_right</span>
      </button>
    `;
  }).join("");

  section.querySelectorAll("button[data-slot]").forEach(btn => {
    btn.addEventListener("click", () => {
      openPotionModal(potionMap[parseInt(btn.dataset.slot, 10)]);
    });
  });
}

// ── Text inline edit ──────────────────────────────────────────────────────────

function attachTextEditListeners(section) {
  section.querySelectorAll('.edit-text-btn').forEach(btn => {
    btn.addEventListener('click', () => startTextEdit(btn.closest('[data-id]')));
  });
}

function startTextEdit(row) {
  const id = row.dataset.id;
  const textSpan = row.querySelector('.text-content');
  const editBtn  = row.querySelector('.edit-text-btn');
  const entry    = _allTexts.find(t => t.id === id);
  const rawText  = entry ? entry.text : textSpan.textContent;

  textSpan.style.display = 'none';
  editBtn.style.display  = 'none';

  const input = document.createElement('input');
  input.type      = 'text';
  input.value     = rawText;
  input.className = 'flex-1 bg-surface-container-lowest border border-outline-variant/30 rounded px-2 py-0.5 text-on-surface text-sm font-body focus:outline-none focus:border-primary/50 min-w-0';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'shrink-0 text-primary hover:text-primary/70 transition-colors';
  saveBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px">check</span>';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'shrink-0 text-on-surface-variant/40 hover:text-on-surface transition-colors';
  cancelBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px">close</span>';

  row.appendChild(input);
  row.appendChild(saveBtn);
  row.appendChild(cancelBtn);
  input.focus();
  input.select();

  const cancel = () => {
    input.remove();
    saveBtn.remove();
    cancelBtn.remove();
    textSpan.style.display = '';
    editBtn.style.display  = '';
  };

  const save = async () => {
    const newText = input.value.trim();
    if (!newText || newText === rawText) { cancel(); return; }

    saveBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px">hourglass_empty</span>';
    saveBtn.disabled  = true;

    const { error } = await AUTH_CLIENT.from('custom_texts')
      .update({ text: newText })
      .eq('id', id)
      .eq('user_id', _userId);

    if (!error) {
      if (entry) entry.text = newText;
      textSpan.textContent = formatText(newText);
    }
    cancel();
  };

  saveBtn.addEventListener('click', save);
  cancelBtn.addEventListener('click', cancel);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') cancel();
  });
}

// ── Texts section ──────────────────────────────────────────────────────────────

function buildTextFilter() {
  const select = document.getElementById("texts-category");
  const categories = [...new Set(_allTexts.map(t => t.category))];
  select.innerHTML = `<option value="">Todos</option>` +
    categories.map(cat =>
      `<option value="${escapeHtml(cat)}">${escapeHtml(CATEGORY_NAME[cat] ?? cat)}</option>`
    ).join("");
}

function renderTexts(categoryFilter) {
  const section  = document.getElementById("texts-section");
  const count    = document.getElementById("texts-count");
  const filtered = categoryFilter
    ? _allTexts.filter(t => t.category === categoryFilter)
    : _allTexts;

  count.textContent = `${filtered.length} texto${filtered.length !== 1 ? "s" : ""}`;

  if (filtered.length === 0) {
    section.innerHTML = `<p class="px-5 py-6 text-center font-label text-sm text-on-surface-variant">No hay textos en esta categoría.</p>`;
    return;
  }

  const rowHtml = (t, i, extraClass = '') => `
    <div class="flex items-center gap-3 px-4 py-2.5 border-b border-outline-variant/10 last:border-0 ${i % 2 === 0 ? "" : "bg-surface-container/20"} ${extraClass}" data-id="${escapeHtml(t.id)}">
      <span class="font-label text-[9px] text-on-surface-variant/30 pt-0.5 w-4 shrink-0 text-right select-none">${i + 1}</span>
      <span class="text-content text-on-surface text-sm leading-relaxed flex-1">${escapeHtml(formatText(t.text))}</span>
      <button class="edit-text-btn shrink-0 text-on-surface-variant/20 hover:text-primary transition-colors">
        <span class="material-symbols-outlined" style="font-size:14px">edit</span>
      </button>
    </div>
  `;

  if (categoryFilter) {
    section.innerHTML = filtered.map((t, i) => rowHtml(t, i)).join("");
    attachTextEditListeners(section);
    return;
  }

  const grouped = {};
  for (const t of filtered) {
    if (!grouped[t.category]) grouped[t.category] = [];
    grouped[t.category].push(t);
  }
  section.innerHTML = Object.entries(grouped).map(([cat, items]) => `
    <div class="border-b border-outline-variant/10 last:border-0">
      <div class="px-4 py-2 bg-surface-container/40">
        <span class="font-label text-[9px] uppercase tracking-widest text-primary/60">${escapeHtml(CATEGORY_NAME[cat] ?? cat)}</span>
      </div>
      ${items.map((t, i) => rowHtml(t, i, "border-outline-variant/5")).join("")}
    </div>
  `).join("");
  attachTextEditListeners(section);
}

// ── Data & init ────────────────────────────────────────────────────────────────

async function loadData(session) {
  if (!AUTH_CLIENT) return;
  _userId = session.user.id;

  const [{ data: potions }, { data: texts }] = await Promise.all([
    AUTH_CLIENT.from("saved_potions").select("slot_index, potion").eq("user_id", session.user.id).order("slot_index"),
    AUTH_CLIENT.from("custom_texts").select("id, category, text").eq("user_id", session.user.id).order("category"),
  ]);

  await loadAlias(session);

  renderSavedPotions(potions ?? []);
  _allTexts = texts ?? [];
  buildTextFilter();
  renderTexts("");
}

async function init(session) {
  renderAuthZone(session);
  const guestSection  = document.getElementById("guest-section");
  const tallerContent = document.getElementById("taller-content");

  if (!session) {
    guestSection.style.display  = '';
    tallerContent.style.display = 'none';
    return;
  }

  guestSection.style.display  = 'none';
  tallerContent.style.display = '';
  await loadData(session);
}

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("alias-edit-btn").addEventListener("click", showAliasEdit);
  document.getElementById("alias-cancel-btn").addEventListener("click", showAliasView);
  document.getElementById("alias-save-btn").addEventListener("click", saveAlias);
  document.getElementById("alias-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveAlias();
    if (e.key === "Escape") showAliasView();
  });

  document.getElementById("modal-close").addEventListener("click", closePotionModal);
  document.getElementById("potion-modal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closePotionModal();
  });

  document.getElementById("texts-category").addEventListener("change", (e) => {
    renderTexts(e.target.value);
  });

  document.getElementById("modal-export").addEventListener("click", async () => {
    if (!_modalPotion) return;
    const btn = document.getElementById("modal-export");
    try {
      await navigator.clipboard.writeText(buildPotionMarkdown(_modalPotion));
      btn.textContent = "¡Copiado!";
      setTimeout(() => { btn.textContent = "Exportar MD"; }, 2000);
    } catch {
      btn.textContent = "Error al copiar";
      setTimeout(() => { btn.textContent = "Exportar MD"; }, 2000);
    }
  });

  // INITIAL_SESSION fires immediately on authOnChange registration and can
  // race with getSession(), overriding a valid session with null. Skip it —
  // getSession() below already handles the initial state.
  authOnChange((newSession, event) => {
    if (event === 'INITIAL_SESSION') return;
    init(newSession);
  });

  const session = await authGetSession();
  await init(session);
});
