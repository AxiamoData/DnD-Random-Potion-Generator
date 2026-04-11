// AUTH_CLIENT, authGetSession, authSignOut, authOnChange defined in auth.js (loaded first)

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

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const ALIAS_NAMES = [
  'Aitor Tilla','Aitor Tuga','Churum Bell','Cindy Entes',
  'Isidro Gamos Alcura','Kenny Bell','Solomeo Paredes','Cere Cillas',
  'Mane Cillas','Elsa Cerdota','Elsa Murai','Jonhny Mentero',
  'Susana Horia','Toby Ciao',
];

async function isAliasTaken(alias) {
  const { data } = await AUTH_CLIENT.from('profiles')
    .select('user_id')
    .eq('alias', alias)
    .neq('user_id', _userId)
    .maybeSingle();
  return data !== null;
}

async function pickRandomAlias() {
  const base = randomFrom(ALIAS_NAMES);
  if (!(await isAliasTaken(base))) return base;
  let n = 2;
  while (await isAliasTaken(`${base}${n}`)) n++;
  return `${base}${n}`;
}

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

let _allTexts     = [];
let _userId       = null;
let _currentAlias = '';
let _follows      = [];

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

  const taken = await isAliasTaken(newAlias);
  if (taken) {
    const fb = document.getElementById('alias-feedback');
    fb.textContent = 'Ese alias ya está en uso. Prueba otro.';
    fb.className = 'font-label text-[11px] text-error mt-1';
    saveBtn.textContent = 'Guardar';
    saveBtn.disabled = false;
    return;
  }

  const { error } = await AUTH_CLIENT.from('profiles')
    .update({ alias: newAlias })
    .eq('user_id', _userId);

  saveBtn.textContent = 'Guardar';
  saveBtn.disabled = false;

  if (!error) {
    document.getElementById('alias-feedback').textContent = '';
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
  const zone = document.getElementById("auth-zone");
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
    document.getElementById("signout-btn").addEventListener("click", authSignOut);
    fetchAlias(session.user.id).then(alias => {
      const el = document.getElementById("auth-alias");
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

// ── Custom text form ──────────────────────────────────────────────────────────

function updateCustomTextPlaceholder() {
  const category = document.getElementById('custom-category').value;
  const examples = window.POTION_DATA?.[category];
  const input = document.getElementById('custom-text-input');
  if (examples && examples.length > 0) {
    input.placeholder = `Ej: ${randomFrom(examples)}`;
  }
}

function updateCharCounter() {
  const category = document.getElementById('custom-category').value;
  const input    = document.getElementById('custom-text-input');
  const counter  = document.getElementById('custom-text-counter');
  const ring     = document.getElementById('custom-text-counter-ring');
  const max      = MAX_CHARS[category] ?? 100;
  const used     = input.value.length;
  const remaining = max - used;
  const circumference = 75.40;

  ring.style.strokeDashoffset = circumference * (1 - used / max);
  counter.textContent = remaining;

  const ratio = remaining / max;
  const color = ratio <= 0.07 ? '#ffb4ab' : ratio <= 0.2 ? '#eac079' : '#d2c5b2';
  ring.style.stroke  = color;
  counter.style.fill = color;
}

function initCustomTextForm() {
  const submitBtn = document.getElementById('custom-text-submit');
  if (submitBtn.dataset.formInit) return;
  submitBtn.dataset.formInit = '1';

  updateCustomTextPlaceholder();
  updateCharCounter();

  document.getElementById('custom-category').addEventListener('change', () => {
    updateCustomTextPlaceholder();
    updateCharCounter();
  });

  document.getElementById('custom-text-input').addEventListener('input', updateCharCounter);

  submitBtn.addEventListener('click', async () => {
    const session = await authGetSession();
    if (!session) return;

    const category  = document.getElementById('custom-category').value;
    const rawText   = document.getElementById('custom-text-input').value;
    const feedback  = document.getElementById('custom-text-feedback');

    if (!rawText.trim()) return;

    const text   = rawText.trim();
    const maxLen = MAX_CHARS[category] ?? 100;

    if (text.length > maxLen) {
      feedback.textContent = `Texto demasiado largo. Máximo ${maxLen} caracteres (tienes ${text.length}).`;
      feedback.className = 'font-label text-sm text-center text-error';
      setTimeout(() => { feedback.textContent = ''; }, 4000);
      return;
    }

    submitBtn.disabled = true;
    feedback.textContent = 'Guardando...';
    feedback.className = 'font-label text-[11px] text-center text-on-surface-variant';

    try {
      const { data, error } = await AUTH_CLIENT.from('custom_texts')
        .insert({ category, text, user_id: _userId })
        .select('id, category, text')
        .single();

      if (!error && data) {
        _allTexts.push(data);
        buildTextFilter();
        renderTexts(document.getElementById('texts-category').value);
        document.getElementById('custom-text-input').value = '';
        feedback.textContent = '¡Texto añadido!';
        feedback.className = 'font-label text-[11px] text-center text-primary';
      } else {
        feedback.textContent = 'Error al guardar. Inténtalo de nuevo.';
        feedback.className = 'font-label text-[11px] text-center text-error';
      }
    } finally {
      submitBtn.disabled = false;
      setTimeout(() => { feedback.textContent = ''; }, 3000);
    }
  });
}

// ── Text inline edit ──────────────────────────────────────────────────────────

function attachTextEditListeners(section) {
  section.querySelectorAll('.edit-text-btn').forEach(btn => {
    btn.addEventListener('click', () => startTextEdit(btn.closest('[data-id]')));
  });
  section.querySelectorAll('.delete-text-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteText(btn.closest('[data-id]')));
  });
}

async function deleteText(row) {
  const id     = row.dataset.id;
  const delBtn = row.querySelector('.delete-text-btn');
  if (delBtn.disabled) return;

  delBtn.disabled = true;
  delBtn.style.opacity = '0.4';

  const { error } = await AUTH_CLIENT.from('custom_texts')
    .delete()
    .eq('id', id)
    .eq('user_id', _userId);

  if (!error) {
    _allTexts = _allTexts.filter(t => t.id !== id);
    row.remove();
    const currentFilter = document.getElementById('texts-category').value;
    const visible = currentFilter ? _allTexts.filter(t => t.category === currentFilter) : _allTexts;
    document.getElementById('texts-count').textContent = `${visible.length} texto${visible.length !== 1 ? "s" : ""}`;
  } else {
    delBtn.disabled = false;
    delBtn.style.opacity = '';
  }
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
      <span class="font-label text-xs text-on-surface-variant/50 w-5 shrink-0 text-center select-none">${i + 1}</span>
      <span class="text-content text-on-surface text-sm leading-relaxed flex-1">${escapeHtml(formatText(t.text))}</span>
      <button class="edit-text-btn shrink-0 text-on-surface-variant/20 hover:text-primary transition-colors">
        <span class="material-symbols-outlined" style="font-size:18px">edit</span>
      </button>
      <button class="delete-text-btn shrink-0 text-on-surface-variant/20 hover:text-error transition-colors">
        <span class="material-symbols-outlined" style="font-size:18px">delete</span>
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

// ── Follows section ────────────────────────────────────────────────────────────

async function loadFollows() {
  const { data: followRows } = await AUTH_CLIENT
    .from("follows")
    .select("id, following_id, active")
    .eq("follower_id", _userId)
    .order("created_at");

  if (!followRows || followRows.length === 0) {
    _follows = [];
    renderFollows();
    return;
  }

  const ids = followRows.map(f => f.following_id);
  const { data: profilesData } = await AUTH_CLIENT
    .from("profiles")
    .select("user_id, alias")
    .in("user_id", ids);

  const aliasMap = Object.fromEntries((profilesData ?? []).map(p => [p.user_id, p.alias]));
  _follows = followRows.map(f => ({ ...f, alias: aliasMap[f.following_id] ?? "—" }));
  renderFollows();
}

function renderFollows() {
  const section = document.getElementById("follows-section");
  const count   = document.getElementById("follows-count");

  count.textContent = `${_follows.length} alquimista${_follows.length !== 1 ? "s" : ""}`;

  if (_follows.length === 0) {
    section.innerHTML = `
      <div class="px-5 py-6 text-center space-y-2">
        <p class="font-label text-sm text-on-surface-variant">Aún no sigues a ningún alquimista.</p>
        <a href="biblioteca.html" class="font-label text-[10px] uppercase tracking-widest text-primary hover:opacity-80 transition-opacity">Visitar La Gran Biblioteca →</a>
      </div>`;
    return;
  }

  section.innerHTML = _follows.map((f, i) => `
    <div class="flex items-center gap-3 px-4 py-3 border-b border-outline-variant/10 last:border-0 ${i % 2 === 0 ? "" : "bg-surface-container/20"}" data-follow-id="${escapeHtml(f.id)}">
      <span class="flex-1 font-headline text-sm text-on-surface leading-tight min-w-0 truncate">${escapeHtml(f.alias)}</span>
      <button class="follow-active-btn shrink-0 flex items-center gap-1 font-label text-[9px] uppercase tracking-widest border rounded-lg px-2 py-1 transition-colors ${f.active ? "text-primary border-primary/30" : "text-on-surface-variant/30 border-outline-variant/20"}" data-active="${f.active ? "1" : "0"}">
        <span class="material-symbols-outlined" style="font-size:14px">${f.active ? "toggle_on" : "toggle_off"}</span>
        ${f.active ? "Activo" : "Inactivo"}
      </button>
      <button class="unfollow-btn shrink-0 text-on-surface-variant/20 hover:text-error transition-colors" title="Dejar de seguir">
        <span class="material-symbols-outlined" style="font-size:20px">person_remove</span>
      </button>
    </div>
  `).join("");

  section.querySelectorAll(".follow-active-btn").forEach(btn => {
    btn.addEventListener("click", () => toggleFollowActive(btn.closest("[data-follow-id]"), btn));
  });
  section.querySelectorAll(".unfollow-btn").forEach(btn => {
    btn.addEventListener("click", () => unfollowUser(btn.closest("[data-follow-id]")));
  });
}

async function toggleFollowActive(row, btn) {
  const newActive = btn.dataset.active !== "1";
  btn.disabled = true;
  btn.style.opacity = "0.5";

  const { error } = await AUTH_CLIENT.from("follows")
    .update({ active: newActive })
    .eq("id", row.dataset.followId)
    .eq("follower_id", _userId);

  btn.disabled = false;
  btn.style.opacity = "";

  if (!error) {
    btn.dataset.active = newActive ? "1" : "0";
    const entry = _follows.find(f => f.id === row.dataset.followId);
    if (entry) entry.active = newActive;
    btn.className = `follow-active-btn shrink-0 flex items-center gap-1 font-label text-[9px] uppercase tracking-widest border rounded-lg px-2 py-1 transition-colors ${newActive ? "text-primary border-primary/30" : "text-on-surface-variant/30 border-outline-variant/20"}`;
    btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px">${newActive ? "toggle_on" : "toggle_off"}</span>${newActive ? "Activo" : "Inactivo"}`;
  }
}

async function unfollowUser(row) {
  const unfollowBtn = row.querySelector(".unfollow-btn");
  unfollowBtn.disabled = true;
  unfollowBtn.style.opacity = "0.4";

  const { error } = await AUTH_CLIENT.from("follows")
    .delete()
    .eq("id", row.dataset.followId)
    .eq("follower_id", _userId);

  if (!error) {
    _follows = _follows.filter(f => f.id !== row.dataset.followId);
    row.remove();
    const count = document.getElementById("follows-count");
    count.textContent = `${_follows.length} alquimista${_follows.length !== 1 ? "s" : ""}`;
    if (_follows.length === 0) renderFollows();
  } else {
    unfollowBtn.disabled = false;
    unfollowBtn.style.opacity = "";
  }
}

// ── Data & init ────────────────────────────────────────────────────────────────

async function loadData(session) {
  if (!AUTH_CLIENT) return;
  _userId = session.user.id;

  const { data: texts } = await AUTH_CLIENT
    .from("custom_texts")
    .select("id, category, text")
    .eq("user_id", session.user.id)
    .order("created_at");

  await Promise.all([loadAlias(session), loadFollows()]);

  _allTexts = texts ?? [];
  buildTextFilter();
  renderTexts("");
  initCustomTextForm();
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
  document.getElementById("alias-cancel-btn").addEventListener("click", () => {
    document.getElementById('alias-feedback').textContent = '';
    showAliasView();
  });
  document.getElementById("alias-save-btn").addEventListener("click", saveAlias);

  async function rollAlias(btn) {
    btn.disabled = true;
    const alias = await pickRandomAlias();
    document.getElementById('alias-view').style.display = 'none';
    document.getElementById('alias-edit').style.display = '';
    document.getElementById('alias-input').value = alias;
    document.getElementById('alias-feedback').textContent = '';
    document.getElementById('alias-input').focus();
    btn.disabled = false;
  }

  document.getElementById('alias-roll-view-btn').addEventListener('click', () =>
    rollAlias(document.getElementById('alias-roll-view-btn'))
  );
  document.getElementById('alias-roll-edit-btn').addEventListener('click', () =>
    rollAlias(document.getElementById('alias-roll-edit-btn'))
  );
  document.getElementById("alias-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveAlias();
    if (e.key === "Escape") showAliasView();
  });

  document.getElementById("texts-category").addEventListener("change", (e) => {
    renderTexts(e.target.value);
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

  initTextToggle('base-texts-btn', 'minerva_use_base_texts');
  initTextToggle('own-texts-btn',  'minerva_use_own_texts');
});

function initTextToggle(btnId, storageKey) {
  const btn = document.getElementById(btnId);
  if (!btn) return;

  function render(active) {
    btn.dataset.active = active ? '1' : '0';
    btn.className = `shrink-0 flex items-center gap-1 font-label text-[9px] uppercase tracking-widest border rounded-lg px-2 py-1 transition-colors ${active ? 'text-primary border-primary/30' : 'text-on-surface-variant/50 border-outline-variant/30'}`;
    btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px">${active ? 'toggle_on' : 'toggle_off'}</span>${active ? 'Activo' : 'Inactivo'}`;
  }

  render(localStorage.getItem(storageKey) !== 'false');

  btn.addEventListener('click', () => {
    const next = btn.dataset.active !== '1';
    localStorage.setItem(storageKey, next ? 'true' : 'false');
    render(next);
  });
}
