// =====================
// Supabase data
// AUTH_CLIENT, SUPABASE_URL, SUPABASE_KEY are defined in auth.js (loaded first)
// =====================

async function loadCustomTexts() {
  if (!AUTH_CLIENT) return;
  try {
    const { data, error } = await AUTH_CLIENT.from('custom_texts').select('category, text');
    if (error) return;
    for (const { category, text } of data) {
      if (POTION_DATA[category]) POTION_DATA[category].push(text);
    }
  } catch {
    // sin conexión — datos estáticos
  }
}

async function submitCustomText(category, text, userId) {
  if (!AUTH_CLIENT) return false;
  try {
    const { error } = await AUTH_CLIENT.from('custom_texts').insert({ category, text, user_id: userId });
    return !error;
  } catch {
    return false;
  }
}

// =====================
const QUALITY_META = {
  "Tosca -- 8d4 + 8.":    { pct: "10%",  label: "Tosca" },
  "Simple -- 6d4 + 6.":   { pct: "25%",  label: "Simple" },
  "Refinada -- 4d4 + 4.": { pct: "45%",  label: "Refinada" },
  "Pura -- 2d4 + 2.":     { pct: "65%",  label: "Pura" },
  "Exquisita -- 1d4 + 1.":{ pct: "85%",  label: "Exquisita" },
  "Perfecta.":             { pct: "100%", label: "Perfecta ✦" },
};

const POTENCY_RARITY = {
  "Menor -- 1d4 + 1.":     "Artefacto Común",
  "Común -- 2d4 + 2.":     "Artefacto Poco Común",
  "Mayor -- 4d4 + 4.":     "Artefacto Inusual",
  "Poderosa -- 6d4 + 6.":  "Artefacto Raro",
  "Superior -- 8d4 + 8.":  "Artefacto Muy Raro",
  "Suprema -- 10d4 + 20.": "Artefacto Legendario",
};

const MAX_CHARS = {
  mainEffects:  140,
  sideEffects:   70,
  containers:    60,
  labels:        90,
  appearance:    20,
  appearance2:   40,
  tasteAndSmell: 40,
  textures:      30,
  duration:      20,
};

function formatCustomText(text) {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return capitalized.endsWith('.') ? capitalized : capitalized + '.';
}

function randomFrom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generatePotion() {
  const quality = randomFrom(POTION_DATA.quality);
  const isPerfect = quality === "Perfecta.";
  const isBad = quality === "Tosca -- 8d4 + 8.";
  const sideEffect = isPerfect
    ? "¡Las pociones perfectas no tienen efectos secundarios!"
    : randomFrom(POTION_DATA.sideEffects);
  const sideEffect2 = isBad
    ? randomFrom(POTION_DATA.sideEffects.filter(s => s !== sideEffect))
    : null;
  return {
    title:      randomFrom(POTION_DATA.titles),
    mainEffect: randomFrom(POTION_DATA.mainEffects),
    sideEffect,
    sideEffect2,
    container:  randomFrom(POTION_DATA.containers),
    label:      randomFrom(POTION_DATA.labels),
    appearance: randomFrom(POTION_DATA.appearance) + " con " + randomFrom(POTION_DATA.appearance2),
    taste:      randomFrom(POTION_DATA.tasteAndSmell),
    smell:      randomFrom(POTION_DATA.tasteAndSmell),
    texture:    randomFrom(POTION_DATA.textures),
    potency:    randomFrom(POTION_DATA.potency),
    quality,
    duration:   randomFrom(POTION_DATA.duration),
    isPerfect,
    isBad,
  };
}

function renderPotion(p) {
  const card = document.getElementById("potion-card");
  const mainEffect = formatCustomText(p.mainEffect);
  const mainTitle = mainEffect.split(".")[0];

  document.getElementById("potion-name").textContent = `${p.title} de ${mainTitle}`;
  document.getElementById("potion-subtitle").textContent =
    `${p.title} · ${POTENCY_RARITY[p.potency] ?? "Artefacto"}`;

  document.getElementById("potion-main-effect").textContent = mainEffect;

  const sideRow = document.getElementById('side-effect-row');
  sideRow.querySelector('label').textContent = p.isBad ? 'Efectos Secundarios' : 'Efecto Secundario';

  const sideEl = document.getElementById("potion-side-effect");
  sideEl.textContent = p.isPerfect ? p.sideEffect : formatCustomText(p.sideEffect);
  sideEl.className = p.isPerfect
    ? "text-base italic perfect-side"
    : "text-on-surface-variant text-base italic";

  let side2El = document.getElementById('potion-side-effect-2');
  if (p.isBad && p.sideEffect2) {
    if (!side2El) {
      side2El = document.createElement('p');
      side2El.id = 'potion-side-effect-2';
      sideRow.appendChild(side2El);
    }
    side2El.className = 'text-on-surface-variant text-base italic';
    side2El.textContent = formatCustomText(p.sideEffect2);
  } else if (side2El) {
    side2El.remove();
  }

  document.getElementById("potion-container").textContent  = formatCustomText(p.container);
  document.getElementById("potion-label").textContent      = formatCustomText(p.label);
  document.getElementById("potion-appearance").textContent = formatCustomText(p.appearance);
  document.getElementById("potion-texture").textContent    = formatCustomText(p.texture);

  document.getElementById("potion-smell").textContent    = formatCustomText(p.smell);
  document.getElementById("potion-taste").textContent    = formatCustomText(p.taste);
  document.getElementById("potion-potency").textContent  = p.potency;
  document.getElementById("potion-duration").textContent = formatCustomText(p.duration);

  const qMeta = QUALITY_META[p.quality] ?? { pct: "0%", label: p.quality };
  document.getElementById("potion-quality-bar").style.width = qMeta.pct;
  document.getElementById("potion-quality-label").textContent = qMeta.label;

  card.removeAttribute("hidden");
  card.classList.remove("appear");
  void card.offsetWidth;
  card.classList.add("appear");
}

// =====================
// Saved Slots (auth-aware, in-memory cache)
// =====================
const SLOTS_KEY = 'minerva_saved_potions';
const SLOTS_MIGRATED_KEY = 'minerva_slots_migrated';
const NUM_SLOTS = 10;
let _slots = Array(NUM_SLOTS).fill(null);

function getLocalSlots() {
  try {
    return JSON.parse(localStorage.getItem(SLOTS_KEY)) || Array(NUM_SLOTS).fill(null);
  } catch {
    return Array(NUM_SLOTS).fill(null);
  }
}

async function refreshSlots() {
  const session = await authGetSession();
  if (session && AUTH_CLIENT) {
    const { data } = await AUTH_CLIENT
      .from('saved_potions')
      .select('slot_index, potion')
      .eq('user_id', session.user.id);
    _slots = Array(NUM_SLOTS).fill(null);
    for (const row of (data ?? [])) _slots[row.slot_index] = row.potion;
  } else {
    _slots = getLocalSlots();
  }
  renderSlots();
}

async function savePotion() {
  if (!window._lastPotion) return;
  const idx = _slots.findIndex(s => s === null);
  if (idx === -1) {
    showSavePopup(-1, null);
    return;
  }

  const session = await authGetSession();
  if (session && AUTH_CLIENT) {
    await AUTH_CLIENT.from('saved_potions').upsert(
      { user_id: session.user.id, slot_index: idx, potion: window._lastPotion },
      { onConflict: 'user_id,slot_index' }
    );
  } else {
    const local = getLocalSlots();
    local[idx] = window._lastPotion;
    localStorage.setItem(SLOTS_KEY, JSON.stringify(local));
  }

  await refreshSlots();
  showSavePopup(idx, window._lastPotion);
}

function loadPotion(idx) {
  if (!_slots[idx]) return;
  window._lastPotion = _slots[idx];
  renderPotion(_slots[idx]);
  document.getElementById('save-btn').disabled = false;
}

function buildPotionMarkdown(p) {
  const qMeta    = QUALITY_META[p.quality] ?? { label: p.quality };
  const mainTitle = p.mainEffect.split('.')[0];
  const rarity    = POTENCY_RARITY[p.potency] ?? p.potency;
  const ft        = t => formatCustomText(t);

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
  ].join('\n');
}

async function exportPotion(idx) {
  const p = _slots[idx];
  if (!p) return;
  const btn = document.getElementById(`slot-exp-${idx}`);
  try {
    await navigator.clipboard.writeText(buildPotionMarkdown(p));
    btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:13px">check</span><span class="font-label text-[9px] uppercase tracking-wide">Copiado</span>`;
    setTimeout(() => {
      btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:13px">ios_share</span><span class="font-label text-[9px] uppercase tracking-wide">Exportar</span>`;
    }, 2000);
  } catch {
    // clipboard not available
  }
}

async function deletePotion(idx) {
  const session = await authGetSession();
  if (session && AUTH_CLIENT) {
    await AUTH_CLIENT.from('saved_potions')
      .delete()
      .eq('user_id', session.user.id)
      .eq('slot_index', idx);
  } else {
    const local = getLocalSlots();
    local[idx] = null;
    localStorage.setItem(SLOTS_KEY, JSON.stringify(local));
  }
  await refreshSlots();
}

async function migrateLocalSlots(userId) {
  if (!AUTH_CLIENT) return;
  if (localStorage.getItem(SLOTS_MIGRATED_KEY)) return;
  const local = getLocalSlots();
  const rows = local
    .map((potion, slot_index) => potion ? { user_id: userId, slot_index, potion } : null)
    .filter(Boolean);
  if (rows.length > 0) {
    await AUTH_CLIENT.from('saved_potions').upsert(rows, { onConflict: 'user_id,slot_index' });
  }
  localStorage.setItem(SLOTS_MIGRATED_KEY, '1');
}

function renderSlots() {
  for (let i = 0; i < NUM_SLOTS; i++) {
    const btn = document.getElementById(`slot-btn-${i}`);
    const del = document.getElementById(`slot-del-${i}`);
    if (!btn) continue;
    const p = _slots[i];

    const exp = document.getElementById(`slot-exp-${i}`);
    if (p) {
      const effectLabel = p.mainEffect.split('.')[0];
      btn.className = 'slot-tile w-full flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 rounded-lg border border-primary/50 bg-primary/10 text-primary hover:bg-primary/20 transition-all active:scale-95 min-h-[72px] cursor-pointer';
      btn.innerHTML = `
        <span class="material-symbols-outlined text-xl" style="font-variation-settings:'FILL' 1">bookmark_added</span>
        <span class="font-label text-[10px] uppercase tracking-wide opacity-60">${i + 1}</span>
        <span class="font-label text-[10px] leading-tight text-center px-0.5">${effectLabel}</span>
      `;
      del.style.display = '';
      exp.style.display = '';
    } else {
      btn.className = 'slot-tile w-full flex flex-col items-center justify-center gap-0.5 py-2.5 rounded-lg border border-outline-variant/15 text-on-surface-variant/30 hover:border-outline-variant/40 hover:text-on-surface-variant/50 transition-all active:scale-95 min-h-[72px] cursor-pointer';
      btn.innerHTML = `
        <span class="material-symbols-outlined text-xl">bookmark</span>
        <span class="font-label text-[10px] uppercase tracking-wide">${i + 1}</span>
      `;
      del.style.display = 'none';
      exp.style.display = 'none';
    }
  }
}

function initSlots() {
  const grid = document.getElementById('slots-grid');
  let html = '';
  for (let i = 0; i < NUM_SLOTS; i++) {
    html += `
      <div class="relative flex flex-col gap-1">
        <button id="slot-btn-${i}" data-slot="${i}"></button>
        <button id="slot-del-${i}" data-slot="${i}" style="display:none" class="absolute top-1 left-1 z-10 w-5 h-5 rounded-full bg-error flex items-center justify-center hover:bg-error/70 active:scale-90 transition-all">
          <span class="material-symbols-outlined text-on-error" style="font-size:12px;line-height:1">close</span>
        </button>
        <button id="slot-exp-${i}" data-slot="${i}" style="display:none" class="w-full flex items-center justify-center gap-0.5 py-1 rounded text-on-surface-variant/50 hover:text-primary transition-all">
          <span class="material-symbols-outlined" style="font-size:13px">ios_share</span>
          <span class="font-label text-[9px] uppercase tracking-wide">Exportar</span>
        </button>
      </div>
    `;
  }
  grid.innerHTML = html;

  for (let i = 0; i < NUM_SLOTS; i++) {
    document.getElementById(`slot-btn-${i}`).addEventListener('click', () => loadPotion(i));
    document.getElementById(`slot-del-${i}`).addEventListener('click', () => deletePotion(i));
    document.getElementById(`slot-exp-${i}`).addEventListener('click', () => exportPotion(i));
  }
  // NOTE: refreshSlots() is called separately after initSlots()
}

function showSavePopup(idx, potion) {
  const box  = document.getElementById('save-popup-box');
  const icon = document.getElementById('save-popup-icon');
  const msg  = document.getElementById('save-popup-msg');
  const sub  = document.getElementById('save-popup-sub');

  if (idx === -1) {
    icon.textContent = 'inventory';
    msg.textContent  = '¡Ranuras llenas!';
    sub.textContent  = 'Borra una poción para guardar más.';
  } else {
    icon.textContent = 'bookmark_added';
    msg.textContent  = `¡Guardada en Ranura ${idx + 1}!`;
    sub.textContent  = potion.mainEffect.split('.')[0];
  }

  box.classList.remove('opacity-0', 'scale-95');
  box.classList.add('opacity-100', 'scale-100');

  clearTimeout(window._popupTimer);
  window._popupTimer = setTimeout(() => {
    box.classList.add('opacity-0', 'scale-95');
    box.classList.remove('opacity-100', 'scale-100');
  }, 2200);
}

// =====================
// Auth UI
// =====================
function renderAuthZone(session) {
  const zone = document.getElementById('auth-zone');
  if (!zone) return;
  if (session) {
    zone.innerHTML = `
      <span class="font-label text-[10px] text-on-surface-variant hidden sm:block truncate max-w-[130px]">${session.user.email}</span>
      <button id="signout-btn" class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/50 hover:text-error transition-colors px-2 py-1 flex items-center gap-1">
        <span class="material-symbols-outlined" style="font-size:14px">logout</span>Salir
      </button>
    `;
    document.getElementById('signout-btn').addEventListener('click', authSignOut);
  } else {
    zone.innerHTML = `
      <a href="login.html" class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/50 hover:text-primary transition-colors flex items-center gap-1">
        <span class="material-symbols-outlined" style="font-size:14px">login</span>Iniciar sesión
      </a>
    `;
  }
}

function updateCustomFormAuth(session) {
  const prompt = document.getElementById('custom-text-auth-prompt');
  const fields = document.getElementById('custom-text-form-fields');
  if (!prompt || !fields) return;
  prompt.toggleAttribute('hidden', !!session);
  fields.toggleAttribute('hidden', !session);
}

// =====================
// Init
// =====================
document.addEventListener("DOMContentLoaded", async () => {
  initSlots();

  if (AUTH_CLIENT) {
    loadCustomTexts(); // async, non-blocking — enriches POTION_DATA in background

    const session = await authGetSession();
    renderAuthZone(session);
    updateCustomFormAuth(session);
    if (session) await migrateLocalSlots(session.user.id);

    authOnChange(async (session) => {
      renderAuthZone(session);
      updateCustomFormAuth(session);
      if (session) await migrateLocalSlots(session.user.id);
      await refreshSlots();
    });
  }

  await refreshSlots();

  document.getElementById("generate-btn").addEventListener("click", () => {
    const p = generatePotion();
    window._lastPotion = p;
    renderPotion(p);
    document.getElementById('save-btn').disabled = false;
  });

  document.getElementById("save-btn").addEventListener("click", savePotion);

  // Custom text form
  function updateCustomTextPlaceholder() {
    const category = document.getElementById("custom-category").value;
    const examples = POTION_DATA[category];
    const input = document.getElementById("custom-text-input");
    if (examples && examples.length > 0) {
      input.placeholder = `Ej: ${randomFrom(examples)}`;
    }
  }

  function updateCharCounter() {
    const category = document.getElementById("custom-category").value;
    const input = document.getElementById("custom-text-input");
    const counter = document.getElementById("custom-text-counter");
    const ring = document.getElementById("custom-text-counter-ring");
    const max = MAX_CHARS[category] ?? 100;
    const used = input.value.length;
    const remaining = max - used;
    const circumference = 75.40;

    ring.style.strokeDashoffset = circumference * (1 - used / max);
    counter.textContent = remaining;

    const ratio = remaining / max;
    const color = ratio <= 0.07 ? "#ffb4ab" : ratio <= 0.2 ? "#eac079" : "#d2c5b2";
    ring.style.stroke = color;
    counter.style.fill = color;
  }

  updateCustomTextPlaceholder();
  updateCharCounter();

  document.getElementById("custom-category").addEventListener("change", () => {
    updateCustomTextPlaceholder();
    updateCharCounter();
  });

  document.getElementById("custom-text-input").addEventListener("input", updateCharCounter);

  document.getElementById("custom-text-toggle").addEventListener("click", () => {
    const form = document.getElementById("custom-text-form");
    const chevron = document.getElementById("custom-text-chevron");
    const isHidden = form.hasAttribute("hidden");
    form.toggleAttribute("hidden", !isHidden);
    chevron.style.transform = isHidden ? "rotate(180deg)" : "";
  });

  document.getElementById("custom-text-submit").addEventListener("click", async () => {
    const session = await authGetSession();
    if (!session) return;

    const category = document.getElementById("custom-category").value;
    const rawText = document.getElementById("custom-text-input").value;
    const feedback = document.getElementById("custom-text-feedback");
    const submitBtn = document.getElementById("custom-text-submit");

    if (!rawText.trim()) return;

    const text = rawText.trim();
    const maxLen = MAX_CHARS[category] ?? 100;

    if (text.length > maxLen) {
      feedback.textContent = `Texto demasiado largo. Máximo ${maxLen} caracteres (tienes ${text.length}).`;
      feedback.className = "font-label text-sm text-center text-error";
      setTimeout(() => { feedback.textContent = ""; }, 4000);
      return;
    }

    submitBtn.disabled = true;
    feedback.textContent = "Guardando...";
    feedback.className = "font-label text-[11px] text-center text-on-surface-variant";

    const ok = await submitCustomText(category, text, session.user.id);

    if (ok) {
      POTION_DATA[category].push(text);
      document.getElementById("custom-text-input").value = "";
      feedback.textContent = "¡Texto añadido! Aparecerá en futuras pociones.";
      feedback.className = "font-label text-[11px] text-center text-primary";
    } else {
      feedback.textContent = "Error al guardar. Inténtalo de nuevo.";
      feedback.className = "font-label text-[11px] text-center text-error";
    }

    submitBtn.disabled = false;
    setTimeout(() => { feedback.textContent = ""; }, 3000);
  });
});
