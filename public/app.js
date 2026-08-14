(function () {
  const chatEl = document.getElementById('chat');
  const emptyStateEl = document.getElementById('empty-state');
  const formEl = document.getElementById('composer');
  const inputEl = document.getElementById('input');
  const sendBtn = document.getElementById('send-btn');
  const resetBtn = document.getElementById('reset-btn');

  /** @type {{role: 'user'|'assistant', content: string}[]} */
  let history = [];
  let sending = false;

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Minimal, safe render: escape everything, then re-enable **bold** only.
  function renderContent(text) {
    const escaped = escapeHtml(text);
    return escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }

  function autoResize() {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 160) + 'px';
  }

  function scrollToBottom() {
    chatEl.scrollTop = chatEl.scrollHeight;
  }

  function addMessageBubble(role) {
    emptyStateEl.classList.add('hidden');
    const wrap = document.createElement('div');
    wrap.className = `msg ${role}`;
    const roleLabel = document.createElement('div');
    roleLabel.className = 'role';
    roleLabel.textContent = role === 'user' ? 'You' : '1stPrinci';
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    wrap.appendChild(roleLabel);
    wrap.appendChild(bubble);
    chatEl.appendChild(wrap);
    scrollToBottom();
    return bubble;
  }

  function showError(message) {
    const banner = document.createElement('div');
    banner.className = 'error-banner';
    banner.textContent = message;
    chatEl.appendChild(banner);
    scrollToBottom();
  }

  function setSending(isSending) {
    sending = isSending;
    sendBtn.disabled = isSending;
    inputEl.disabled = isSending;
  }

  async function sendMessage(text) {
    history.push({ role: 'user', content: text });
    const userBubble = addMessageBubble('user');
    userBubble.textContent = text;

    const assistantBubble = addMessageBubble('assistant');
    assistantBubble.textContent = '';
    let assistantText = '';

    setSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok || !res.body) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6);
          if (payload === '[DONE]') continue;

          let parsed;
          try {
            parsed = JSON.parse(payload);
          } catch {
            continue;
          }

          if (parsed.error) {
            throw new Error(parsed.error);
          }
          if (typeof parsed.delta === 'string') {
            assistantText += parsed.delta;
            assistantBubble.innerHTML = renderContent(assistantText);
            scrollToBottom();
          }
        }
      }

      if (assistantText.trim().length > 0) {
        history.push({ role: 'assistant', content: assistantText });
      } else {
        throw new Error('No response received.');
      }
    } catch (err) {
      showError(err.message || 'Something went wrong talking to 1stPrinci.');
      history.pop(); // drop the user message we couldn't get a reply to, so retry is clean
      if (assistantText.length === 0) {
        assistantBubble.closest('.msg').remove();
      }
    } finally {
      setSending(false);
      inputEl.focus();
    }
  }

  formEl.addEventListener('submit', (e) => {
    e.preventDefault();
    if (sending) return;
    const text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = '';
    autoResize();
    sendMessage(text);
  });

  inputEl.addEventListener('input', autoResize);

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      formEl.requestSubmit();
    }
  });

  document.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      inputEl.value = chip.dataset.prompt || '';
      autoResize();
      inputEl.focus();
    });
  });

  resetBtn.addEventListener('click', () => {
    history = [];
    chatEl.innerHTML = '';
    emptyStateEl.classList.remove('hidden');
    inputEl.value = '';
    autoResize();
    inputEl.focus();
  });

  autoResize();
})();
