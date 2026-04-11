// =====================
// Supabase data
// AUTH_CLIENT, SUPABASE_URL, SUPABASE_KEY are defined in auth.js (loaded first)
// =====================

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const ALLOWED_CATEGORIES = new Set(['mainEffects','sideEffects','containers','labels','appearance','appearance2','tasteAndSmell','textures','duration']);

async function loadCustomTexts() {
  if (!AUTH_CLIENT) return;
  try {
    const { data, error } = await AUTH_CLIENT.from('custom_texts').select('category, text');
    if (error) return;
    for (const { category, text } of data) {
      if (ALLOWED_CATEGORIES.has(category) && POTION_DATA[category]) POTION_DATA[category].push(text);
    }
  } catch {
    // sin conexión — datos estáticos
  }
}

// =====================
// Changelog
// =====================
const CHANGELOG_VERSION = '2026-04-11';
const CHANGELOG_ITEMS = [
  'Animación del frasco: el líquido interior se mueve con un oleaje continuo.',
  'Botones de Mi Taller: alias aleatorio con icono de dado 3D; botones solo-icono sin texto.',
  'Onboarding: los visitantes sin sesión ven un modal de bienvenida la primera vez que entran.',
];

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

function formatCustomText(text) {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return capitalized.endsWith('.') ? capitalized : capitalized + '.';
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
  updateSaveFullState();
}

function updateSaveFullState() {
  const btn = document.getElementById('save-btn');
  if (!btn || btn.disabled) return;
  const full = _slots.every(s => s !== null);
  btn.title = full
    ? 'Ranuras llenas — borra una poción para guardar más'
    : 'Guardar poción en ranura';
  const icon = btn.querySelector('.material-symbols-outlined');
  if (icon && full) {
    icon.textContent = 'inventory';
    icon.style.fontVariationSettings = '';
  }
}

function setSaveBtnIcon(saved) {
  const icon = document.getElementById('save-btn').querySelector('.material-symbols-outlined');
  icon.textContent = saved ? 'bookmark_added' : 'bookmark_add';
  icon.style.fontVariationSettings = saved ? "'FILL' 1" : '';
}

async function savePotion() {
  if (!window._lastPotion) return;
  const idx = _slots.findIndex(s => s === null);
  if (idx === -1) {
    showSavePopup(-1, null, 4000);
    return;
  }

  const session = await authGetSession();
  if (session && AUTH_CLIENT) {
    try {
      const { error } = await AUTH_CLIENT.from('saved_potions').upsert(
        { user_id: session.user.id, slot_index: idx, potion: window._lastPotion },
        { onConflict: 'user_id,slot_index' }
      );
      if (error) throw error;
    } catch {
      showSavePopup(-1, null, 4000);
      document.getElementById('save-popup-icon').textContent = 'error';
      document.getElementById('save-popup-msg').textContent = 'Error al guardar';
      document.getElementById('save-popup-sub').textContent = 'Comprueba tu conexión e inténtalo de nuevo.';
      return;
    }
  } else {
    const local = getLocalSlots();
    local[idx] = window._lastPotion;
    localStorage.setItem(SLOTS_KEY, JSON.stringify(local));
  }

  await refreshSlots();
  showSavePopup(idx, window._lastPotion);
  setSaveBtnIcon(true);
}

function loadPotion(idx) {
  if (!_slots[idx]) return;
  window._lastPotion = _slots[idx];
  renderPotion(_slots[idx]);
  document.getElementById('save-btn').disabled = false;
  document.getElementById('copy-btn').disabled = false;
  setSaveBtnIcon(true);
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
        <span class="font-label text-[10px] leading-tight text-center px-0.5">${escapeHtml(effectLabel)}</span>
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
        <button id="slot-del-${i}" data-slot="${i}" style="display:none" class="absolute -top-2 -right-2 z-10 w-5 h-5 rounded-full bg-error flex items-center justify-center hover:bg-error/70 active:scale-90 transition-all">
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

function showSavePopup(idx, potion, duration = 2200) {
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
  }, duration);
}

// =====================
// Auth UI
// =====================
async function fetchAlias(userId) {
  try {
    const { data } = await AUTH_CLIENT.from('profiles')
      .select('alias')
      .eq('user_id', userId)
      .maybeSingle();
    return data?.alias ?? null;
  } catch {
    return null;
  }
}

function renderAuthZone(session) {
  const zone = document.getElementById('auth-zone');
  if (!zone) return;
  if (session) {
    const initial = session.user.email[0].toUpperCase();
    zone.innerHTML = `
      <div class="flex items-center gap-1.5">
        <div class="flex items-center gap-1.5 rounded-lg px-2 py-1 bg-surface-container border border-outline-variant/20">
          <div class="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <span class="font-label text-[9px] font-bold text-on-primary">${initial}</span>
          </div>
          <span id="auth-alias" class="font-label text-[11px] text-on-surface-variant/80 hidden sm:block truncate max-w-[100px]"></span>
        </div>
        <button id="signout-btn" class="p-1.5 rounded-lg text-on-surface-variant/50 hover:text-error hover:bg-error/10 transition-colors flex items-center" aria-label="Cerrar sesión">
          <span class="material-symbols-outlined" style="font-size:16px">logout</span>
        </button>
      </div>
    `;
    document.getElementById('signout-btn').addEventListener('click', authSignOut);
    fetchAlias(session.user.id).then(alias => {
      const el = document.getElementById('auth-alias');
      if (el && alias) el.textContent = alias;
    });
  } else {
    zone.innerHTML = `
      <a href="login.html" class="flex items-center gap-1.5 font-label text-[11px] font-medium uppercase tracking-widest text-primary border border-primary/40 rounded-lg px-3 py-1.5 hover:bg-primary/10 active:bg-primary/20 transition-colors">
        <span class="material-symbols-outlined" style="font-size:14px">login</span>Entrar
      </a>
    `;
  }
}

// =====================
// Init
// =====================
function parseOnboardingMd(md) {
  return md.split('\n').map(line => {
    if (line.startsWith('# '))
      return `<h2 class="font-headline text-primary text-lg leading-snug mb-3">${line.slice(2)}</h2>`;
    if (line.startsWith('## '))
      return `<p class="font-label text-[10px] uppercase tracking-widest text-primary/80 mt-6 mb-3">${line.slice(3)}</p>`;
    if (line.startsWith('- ')) {
      const t = line.slice(2).replace(/\*\*(.+?)\*\*/g, '<strong class="text-on-surface">$1</strong>');
      return `<div class="flex gap-2 text-sm text-on-surface-variant/80 leading-relaxed"><span class="text-primary/50 shrink-0 mt-0.5">·</span><span>${t}</span></div>`;
    }
    if (line.trim())
      return `<p class="text-sm text-on-surface-variant/70 leading-relaxed">${line.trim()}</p>`;
    return '';
  }).join('');
}

async function showOnboarding() {
  const overlay = document.getElementById('onboarding-overlay');
  if (!overlay) return;
  try {
    const res  = await fetch('onboarding.md');
    const text = await res.text();
    document.getElementById('onboarding-content').innerHTML = parseOnboardingMd(text);
  } catch {
    return;
  }
  overlay.classList.remove('hidden');
  overlay.classList.add('flex');

  const close = () => {
    localStorage.setItem('minerva_onboarding_seen', '1');
    overlay.classList.add('hidden');
    overlay.classList.remove('flex');
  };
  document.getElementById('onboarding-close').addEventListener('click', close);
  document.getElementById('onboarding-cta').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
}

document.addEventListener("DOMContentLoaded", async () => {
  const WHATS_NEW_KEY = 'minerva_whats_new_seen';

  initSlots();

  if (AUTH_CLIENT) {
    loadCustomTexts(); // async, non-blocking — enriches POTION_DATA in background

    const session = await authGetSession();
    renderAuthZone(session);

    if (session) {
      if (localStorage.getItem(WHATS_NEW_KEY) !== CHANGELOG_VERSION) {
        const overlay = document.getElementById('whats-new-overlay');
        const content = document.getElementById('whats-new-content');
        content.innerHTML = CHANGELOG_ITEMS.map(item => `<p>• ${item}</p>`).join('');
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');

        const closeWhatsNew = () => {
          localStorage.setItem(WHATS_NEW_KEY, CHANGELOG_VERSION);
          overlay.classList.add('hidden');
          overlay.classList.remove('flex');
        };
        document.getElementById('whats-new-close').addEventListener('click', closeWhatsNew);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeWhatsNew(); });
      }
    } else {
      if (!localStorage.getItem('minerva_onboarding_seen')) showOnboarding();
    }

    authOnChange(async (session) => {
      renderAuthZone(session);
      await refreshSlots();
    });
  }

  await refreshSlots();

  document.getElementById("generate-btn").addEventListener("click", () => {
    const p = generatePotion();
    window._lastPotion = p;
    renderPotion(p);
    document.getElementById('save-btn').disabled = false;
    document.getElementById('copy-btn').disabled = false;
    setSaveBtnIcon(false);
    const btn = document.getElementById('generate-btn');
    btn.classList.remove('brewing');
    void btn.offsetWidth;
    btn.classList.add('brewing');
    btn.addEventListener('animationend', () => btn.classList.remove('brewing'), { once: true });
  });

  document.getElementById("save-btn").addEventListener("click", savePotion);

  document.getElementById("copy-btn").addEventListener("click", async () => {
    if (!window._lastPotion) return;
    const btn = document.getElementById('copy-btn');
    const text = buildPotionMarkdown(window._lastPotion);
    let ok = false;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch {
        // fallback below
      }
    }

    if (!ok) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        ok = false;
      }
    }

    const icon = btn.querySelector('.material-symbols-outlined');
    icon.textContent = ok ? 'check' : 'close';
    setTimeout(() => { icon.textContent = 'content_copy'; }, 2000);
  });


  // Feedback / suggestion box
  const feedbackOverlay = document.getElementById('feedback-overlay');
  const feedbackText    = document.getElementById('feedback-text');
  const feedbackStatus  = document.getElementById('feedback-status');

  const openFeedback  = () => feedbackOverlay.classList.replace('hidden', 'flex');
  const closeFeedback = () => {
    feedbackOverlay.classList.replace('flex', 'hidden');
    feedbackText.value = '';
    feedbackStatus.classList.add('hidden');
  };

  document.getElementById('feedback-btn').addEventListener('click', openFeedback);
  document.getElementById('feedback-close').addEventListener('click', closeFeedback);
  feedbackOverlay.addEventListener('click', (e) => { if (e.target === feedbackOverlay) closeFeedback(); });

  document.getElementById('feedback-submit').addEventListener('click', async () => {
    const message = feedbackText.value.trim();
    if (!message) return;

    const submitBtn = document.getElementById('feedback-submit');
    submitBtn.disabled = true;

    const session = await authGetSession();
    const { error } = await AUTH_CLIENT.from('suggestions').insert({
      message,
      user_id: session?.user?.id ?? null,
      email:   session?.user?.email ?? null,
    });

    feedbackStatus.classList.remove('hidden');
    if (error) {
      feedbackStatus.textContent = 'Error al enviar. Inténtalo de nuevo.';
      feedbackStatus.className = 'font-label text-[11px] text-center text-error';
      submitBtn.disabled = false;
    } else {
      feedbackStatus.textContent = '¡Gracias! Tu mensaje ha llegado.';
      feedbackStatus.className = 'font-label text-[11px] text-center text-primary';
      setTimeout(closeFeedback, 1500);
    }
  });
});
