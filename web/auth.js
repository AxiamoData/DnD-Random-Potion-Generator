// =====================
// Supabase Auth — shared module
// Loaded before app.js in index.html and in login.html
// =====================
const SUPABASE_URL = 'https://snhowafpgqzpczonsugp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_6GWwgPEFBnSewjtnzsJqAQ_kOBOp-jx';

const AUTH_CLIENT = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

async function authSignIn(email, password) {
  return AUTH_CLIENT.auth.signInWithPassword({ email, password });
}

async function authSignUp(email, password) {
  return AUTH_CLIENT.auth.signUp({ email, password });
}

async function authSignOut() {
  if (AUTH_CLIENT) await AUTH_CLIENT.auth.signOut();
  window.location.href = 'login.html';
}

async function authGetSession() {
  if (!AUTH_CLIENT) return null;
  const { data } = await AUTH_CLIENT.auth.getSession();
  return data.session ?? null;
}

function authOnChange(cb) {
  if (!AUTH_CLIENT) return;
  AUTH_CLIENT.auth.onAuthStateChange((_event, session) => cb(session));
}
