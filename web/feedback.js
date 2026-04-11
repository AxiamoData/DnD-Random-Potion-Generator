// AUTH_CLIENT, authGetSession from auth.js

document.addEventListener('DOMContentLoaded', () => {
  const feedbackOverlay = document.getElementById('feedback-overlay');
  const feedbackText    = document.getElementById('feedback-text');
  const feedbackStatus  = document.getElementById('feedback-status');

  const openFeedback  = () => feedbackOverlay.classList.replace('hidden', 'flex');
  const closeFeedback = () => {
    feedbackOverlay.classList.replace('flex', 'hidden');
    feedbackText.value = '';
    feedbackStatus.classList.add('hidden');
    document.getElementById('feedback-submit').disabled = false;
  };

  document.getElementById('feedback-btn').addEventListener('click', openFeedback);
  document.getElementById('feedback-close').addEventListener('click', closeFeedback);
  feedbackOverlay.addEventListener('click', (e) => { if (e.target === feedbackOverlay) closeFeedback(); });

  document.getElementById('feedback-submit').addEventListener('click', async () => {
    const message = feedbackText.value.trim();
    if (!message) return;

    const submitBtn = document.getElementById('feedback-submit');
    submitBtn.disabled = true;

    try {
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
    } catch {
      feedbackStatus.textContent = 'Error al enviar. Inténtalo de nuevo.';
      feedbackStatus.className = 'font-label text-[11px] text-center text-error';
      feedbackStatus.classList.remove('hidden');
      submitBtn.disabled = false;
    }
  });
});
