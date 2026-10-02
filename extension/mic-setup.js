document.getElementById('grantMicBtn')?.addEventListener('click', async () => {
  const resultEl = document.getElementById('micResult');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    if (resultEl) {
      resultEl.style.color = '#10b981';
      resultEl.textContent = 'Microphone access granted! You may close this tab.';
    }
    setTimeout(() => {
      window.close();
    }, 1500);
  } catch (err) {
    if (resultEl) {
      resultEl.style.color = '#ef4444';
      resultEl.textContent = `Permission error: ${err.message}`;
    }
  }
});
