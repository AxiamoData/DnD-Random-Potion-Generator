const SUPABASE_URL = 'https://snhowafpgqzpczonsugp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_6GWwgPEFBnSewjtnzsJqAQ_kOBOp-jx';

function formatCustomText(text) {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return capitalized.endsWith('.') ? capitalized : capitalized + '.';
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderList(category) {
  const list  = document.getElementById('library-list');
  const count = document.getElementById('library-count');
  const items = POTION_DATA[category] ?? [];

  count.textContent = `${items.length} entrada${items.length !== 1 ? 's' : ''}`;

  if (items.length === 0) {
    list.innerHTML = `<p class="px-5 py-6 text-center font-label text-sm text-on-surface-variant">No hay textos en esta categoría.</p>`;
    return;
  }

  list.innerHTML = items.map((text, i) => `
    <div class="flex gap-3 px-5 py-3 ${i % 2 === 0 ? '' : 'bg-surface-container/30'}">
      <span class="font-label text-xs text-on-surface-variant/50 w-6 shrink-0 text-center select-none">${i + 1}</span>
      <span class="text-on-surface text-sm leading-relaxed">${escapeHtml(formatCustomText(text))}</span>
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
  if (window.supabase) {
    try {
      const sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      const { data, error } = await sbClient.from('custom_texts').select('category, text').order('created_at');
      if (!error) {
        for (const { category, text } of data) {
          if (POTION_DATA[category]) POTION_DATA[category].push(text);
        }
      }
    } catch {
      // sin conexión — seguimos con datos estáticos
    }
  }

  const select = document.getElementById('library-category');
  renderList(select.value);
  select.addEventListener('change', () => renderList(select.value));
});
