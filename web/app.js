// =====================
// Supabase
// =====================
const SUPABASE_URL = 'https://snhowafpgqzpczonsugp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_6GWwgPEFBnSewjtnzsJqAQ_kOBOp-jx';
let supabase;

async function loadCustomTexts() {
  try {
    const { data, error } = await supabase.from('custom_texts').select('category, text');
    if (error) return;
    for (const { category, text } of data) {
      if (POTION_DATA[category]) POTION_DATA[category].push(text);
    }
  } catch {
    // sin conexión — seguimos con datos estáticos
  }
}

async function submitCustomText(category, text) {
  try {
    const { error } = await supabase.from('custom_texts').insert({ category, text });
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

function randomFrom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generatePotion() {
  const quality = randomFrom(POTION_DATA.quality);
  const isPerfect = quality === "Perfecta.";
  return {
    title:      randomFrom(POTION_DATA.titles),
    mainEffect: randomFrom(POTION_DATA.mainEffects),
    sideEffect: isPerfect ? "¡Las pociones perfectas no tienen efectos secundarios!" : randomFrom(POTION_DATA.sideEffects),
    container:  randomFrom(POTION_DATA.containers),
    label:      randomFrom(POTION_DATA.labels),
    appearance: randomFrom(POTION_DATA.appearance) + " con " + randomFrom(POTION_DATA.appearance2),
    taste:      randomFrom(POTION_DATA.tasteAndSmell),
    smell:      randomFrom(POTION_DATA.tasteAndSmell),
    texture:    randomFrom(POTION_DATA.textures),
    potency:    randomFrom(POTION_DATA.potency),
    quality:    quality,
    duration:   randomFrom(POTION_DATA.duration),
    isPerfect:  isPerfect,
  };
}

function renderPotion(p) {
  const card = document.getElementById("potion-card");
  const mainTitle = p.mainEffect.split(".")[0];

  document.getElementById("potion-name").textContent = `${p.title} de ${mainTitle}`;
  document.getElementById("potion-subtitle").textContent =
    `${p.title} · ${POTENCY_RARITY[p.potency] ?? "Artefacto"}`;

  document.getElementById("potion-main-effect").textContent = p.mainEffect;

  const sideEl = document.getElementById("potion-side-effect");
  sideEl.textContent = p.sideEffect;
  sideEl.className = p.isPerfect
    ? "text-sm italic perfect-side"
    : "text-on-surface-variant text-sm italic";

  document.getElementById("potion-container").textContent  = p.container;
  document.getElementById("potion-label").textContent      = p.label;
  document.getElementById("potion-appearance").textContent = p.appearance;
  document.getElementById("potion-texture").textContent    = p.texture;

  document.getElementById("potion-smell").textContent    = p.smell;
  document.getElementById("potion-taste").textContent    = p.taste;
  document.getElementById("potion-potency").textContent  = p.potency;
  document.getElementById("potion-duration").textContent = p.duration;

  const qMeta = QUALITY_META[p.quality] ?? { pct: "0%", label: p.quality };
  document.getElementById("potion-quality-bar").style.width = qMeta.pct;
  document.getElementById("potion-quality-label").textContent = qMeta.label;

  card.removeAttribute("hidden");
  card.classList.remove("appear");
  void card.offsetWidth;
  card.classList.add("appear");
}

// =====================
// Saved Slots
// =====================
const SLOTS_KEY = 'minerva_saved_potions';
const NUM_SLOTS = 10;

function getSlots() {
  try {
    return JSON.parse(localStorage.getItem(SLOTS_KEY)) || Array(NUM_SLOTS).fill(null);
  } catch {
    return Array(NUM_SLOTS).fill(null);
  }
}

function setSlots(slots) {
  localStorage.setItem(SLOTS_KEY, JSON.stringify(slots));
}

function savePotion() {
  if (!window._lastPotion) return;
  const slots = getSlots();
  const idx = slots.findIndex(s => s === null);
  if (idx === -1) {
    showSavePopup(-1, null);
    return;
  }
  slots[idx] = window._lastPotion;
  setSlots(slots);
  renderSlots();
  showSavePopup(idx, window._lastPotion);
}

function loadPotion(idx) {
  const slots = getSlots();
  if (!slots[idx]) return;
  window._lastPotion = slots[idx];
  renderPotion(slots[idx]);
  document.getElementById('save-btn').disabled = false;
}

function deletePotion(idx) {
  const slots = getSlots();
  slots[idx] = null;
  setSlots(slots);
  renderSlots();
}

function renderSlots() {
  const slots = getSlots();
  for (let i = 0; i < NUM_SLOTS; i++) {
    const btn = document.getElementById(`slot-btn-${i}`);
    const del = document.getElementById(`slot-del-${i}`);
    if (!btn) continue;
    const p = slots[i];

    if (p) {
      const effectLabel = p.mainEffect.split('.')[0];
      btn.className = 'slot-tile w-full flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 rounded-lg border border-primary/50 bg-primary/10 text-primary hover:bg-primary/20 transition-all active:scale-95 min-h-[72px] cursor-pointer';
      btn.innerHTML = `
        <span class="material-symbols-outlined text-lg" style="font-variation-settings:'FILL' 1">bookmark_added</span>
        <span class="font-label text-[9px] uppercase tracking-wide opacity-60">${i + 1}</span>
        <span class="font-label text-[8px] leading-tight text-center px-0.5">${effectLabel}</span>
      `;
      del.classList.remove('hidden');
    } else {
      btn.className = 'slot-tile w-full flex flex-col items-center justify-center gap-0.5 py-2.5 rounded-lg border border-outline-variant/15 text-on-surface-variant/30 hover:border-outline-variant/40 hover:text-on-surface-variant/50 transition-all active:scale-95 min-h-[72px] cursor-pointer';
      btn.innerHTML = `
        <span class="material-symbols-outlined text-lg">bookmark</span>
        <span class="font-label text-[9px] uppercase tracking-wide">${i + 1}</span>
      `;
      del.classList.add('hidden');
    }
  }
}

function initSlots() {
  const grid = document.getElementById('slots-grid');
  let html = '';
  for (let i = 0; i < NUM_SLOTS; i++) {
    html += `
      <div class="flex flex-col gap-1">
        <button id="slot-btn-${i}" data-slot="${i}"></button>
        <button id="slot-del-${i}" data-slot="${i}" class="hidden w-full flex items-center justify-center gap-0.5 py-1 rounded text-error/50 hover:text-error transition-all">
          <span class="material-symbols-outlined" style="font-size:13px">delete</span>
          <span class="font-label text-[9px] uppercase tracking-wide">Borrar</span>
        </button>
      </div>
    `;
  }
  grid.innerHTML = html;

  for (let i = 0; i < NUM_SLOTS; i++) {
    document.getElementById(`slot-btn-${i}`).addEventListener('click', () => loadPotion(i));
    document.getElementById(`slot-del-${i}`).addEventListener('click', () => deletePotion(i));
  }

  renderSlots();
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

document.addEventListener("DOMContentLoaded", async () => {
  if (window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    await loadCustomTexts();
  }

  initSlots();

  document.getElementById("generate-btn").addEventListener("click", () => {
    const p = generatePotion();
    window._lastPotion = p;
    renderPotion(p);
    document.getElementById('save-btn').disabled = false;
  });

  document.getElementById("save-btn").addEventListener("click", savePotion);

  // Custom text form
  document.getElementById("custom-text-toggle").addEventListener("click", () => {
    const form = document.getElementById("custom-text-form");
    const chevron = document.getElementById("custom-text-chevron");
    const isHidden = form.hasAttribute("hidden");
    form.toggleAttribute("hidden", !isHidden);
    chevron.style.transform = isHidden ? "rotate(180deg)" : "";
  });

  document.getElementById("custom-text-submit").addEventListener("click", async () => {
    const category = document.getElementById("custom-category").value;
    const text = document.getElementById("custom-text-input").value.trim();
    const feedback = document.getElementById("custom-text-feedback");
    const submitBtn = document.getElementById("custom-text-submit");

    if (!text) return;

    submitBtn.disabled = true;
    feedback.textContent = "Guardando...";
    feedback.className = "font-label text-[11px] text-center text-on-surface-variant";

    const ok = await submitCustomText(category, text);

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
