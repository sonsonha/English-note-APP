(() => {
  if (window.__engnotingLoaded) return;
  window.__engnotingLoaded = true;

  // macOS: Cmd+Shift+E  |  Windows/Linux: Ctrl+Shift+E
  const isMac = navigator.platform.toUpperCase().includes('MAC');

  let currentSentence = '';
  let floatingBtn = null;
  let modal = null;
  let panel = null;
  let panelCollapsed = false;

  // ─── Build floating logo button ───────────────────────────────────────────
  function createFloatingBtn() {
    const btn = document.createElement('button');
    btn.id = 'engnoting-btn';
    btn.title = isMac ? 'Save word (⌘⇧E)' : 'Save word (Ctrl+Shift+E)';

    const img = document.createElement('img');
    img.src = chrome.runtime.getURL('icons/logo.png');
    img.alt = 'EngNoting';
    btn.appendChild(img);

    // Badge tooltip showing shortcut
    const badge = document.createElement('span');
    badge.id = 'engnoting-btn-badge';
    badge.textContent = isMac ? '⌘⇧E' : 'Ctrl⇧E';
    btn.appendChild(badge);

    document.body.appendChild(btn);

    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentSentence) openModal(currentSentence);
      hideBtn();
    });

    return btn;
  }

  // ─── Build modal ──────────────────────────────────────────────────────────
  function createModal() {
    const overlay = document.createElement('div');
    overlay.id = 'engnoting-modal-overlay';

    const box = document.createElement('div');
    box.id = 'engnoting-modal';

    box.innerHTML = `
      <div id="engnoting-modal-header">
        <div id="engnoting-modal-header-left">
          <img id="engnoting-modal-logo" src="${chrome.runtime.getURL('icons/logo.png')}" alt="EngNoting" />
          <span id="engnoting-modal-title">Click a word to save</span>
        </div>
        <button id="engnoting-modal-close" title="Close (Esc)">✕</button>
      </div>
      <div id="engnoting-modal-hint">Tap any word below to add it to your vocabulary</div>
      <div id="engnoting-sentence"></div>
      <div id="engnoting-status"></div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    box.querySelector('#engnoting-modal-close').addEventListener('click', closeModal);

    return { overlay, box };
  }

  // ─── Tokenise sentence into clickable words ───────────────────────────────
  function renderSentence(sentence, container) {
    container.innerHTML = '';
    const tokens = sentence.split(/(\s+)/);
    tokens.forEach((token) => {
      if (/^\s+$/.test(token)) {
        container.appendChild(document.createTextNode(token));
        return;
      }
      const clean = token.replace(/^[^a-zA-Z'-]+|[^a-zA-Z'-]+$/g, '');
      if (!clean) {
        container.appendChild(document.createTextNode(token));
        return;
      }
      const span = document.createElement('span');
      span.className = 'engnoting-word';
      span.textContent = token;
      span.dataset.word = clean.toLowerCase();
      span.addEventListener('click', () => onWordClick(span, clean.toLowerCase(), sentence));
      container.appendChild(span);
    });
  }

  // ─── Open / close modal ───────────────────────────────────────────────────
  function openModal(sentence) {
    const sentenceEl = modal.box.querySelector('#engnoting-sentence');
    const statusEl = modal.box.querySelector('#engnoting-status');
    renderSentence(sentence, sentenceEl);
    statusEl.textContent = '';
    statusEl.className = '';

    modal.overlay.style.display = 'flex';
    requestAnimationFrame(() => {
      modal.overlay.classList.add('engnoting-visible');
    });
  }

  function closeModal() {
    modal.overlay.classList.remove('engnoting-visible');
    setTimeout(() => {
      modal.overlay.style.display = 'none';
    }, 200);
  }

  // ─── Floating button visibility ───────────────────────────────────────────
  function showBtn(selectionRect) {
    const btnW = 52; // matches CSS width
    // Center horizontally above the selection, use fixed positioning (viewport coords)
    const viewX = selectionRect.left + (selectionRect.width - btnW) / 2;
    const viewY = selectionRect.top - btnW - 12;

    floatingBtn.style.left = `${Math.max(8, viewX)}px`;
    floatingBtn.style.top = `${Math.max(8, viewY)}px`;
    floatingBtn.style.display = 'flex';
  }

  function hideBtn() {
    floatingBtn.style.display = 'none';
  }

  // ─── Word click handler ───────────────────────────────────────────────────
  function onWordClick(span, word, sentence) {
    if (span.classList.contains('engnoting-saving') ||
        span.classList.contains('engnoting-saved') ||
        span.classList.contains('engnoting-exists')) return;

    const statusEl = modal.box.querySelector('#engnoting-status');
    span.classList.add('engnoting-saving');
    statusEl.textContent = `Saving "${word}"…`;
    statusEl.className = '';

    chrome.runtime.sendMessage({
      type: 'saveWord',
      word,
      sentence,
      pageUrl: location.href,
    }, (response) => {
      span.classList.remove('engnoting-saving');
      if (!response) {
        span.classList.add('engnoting-error');
        statusEl.textContent = 'Extension error — try reloading the page.';
        statusEl.className = 'engnoting-err';
        return;
      }
      if (response.success) {
        span.classList.add('engnoting-saved');
        statusEl.textContent = `✅ "${word}" saved to your vocabulary!`;
        statusEl.className = 'engnoting-ok';
        setTimeout(() => loadPageWords(true), 800);
      } else if (response.error === 'not_authenticated') {
        statusEl.textContent = '🔒 Please log in via the EngNoting extension icon.';
        statusEl.className = 'engnoting-err';
      } else if (response.error === 'already_saved') {
        span.classList.add('engnoting-exists');
        statusEl.textContent = `📌 "${word}" is already in your list.`;
        statusEl.className = 'engnoting-exists-msg';
      } else {
        span.classList.add('engnoting-error');
        statusEl.textContent = response.error || 'Failed to save.';
        statusEl.className = 'engnoting-err';
      }
    });
  }

  // ─── Selection listener ───────────────────────────────────────────────────
  document.addEventListener('mouseup', (e) => {
    if (e.target.closest('#engnoting-btn, #engnoting-modal-overlay, #engnoting-panel')) return;

    setTimeout(() => {
      const sel = window.getSelection();
      const text = sel ? sel.toString().trim() : '';
      if (!text || text.length < 2) {
        hideBtn();
        return;
      }
      currentSentence = text;
      try {
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        showBtn(rect);
      } catch (_) {
        hideBtn();
      }
    }, 10);
  });

  // Hide button when clicking elsewhere
  document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('#engnoting-btn, #engnoting-modal-overlay')) {
      hideBtn();
    }
  });

  // ─── Keyboard shortcut ────────────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    const isShortcut = isMac
      ? e.metaKey && e.shiftKey && e.key.toUpperCase() === 'E'
      : e.ctrlKey && e.shiftKey && e.key.toUpperCase() === 'E';

    if (isShortcut) {
      e.preventDefault();
      if (currentSentence) {
        openModal(currentSentence);
        hideBtn();
      }
      return;
    }

    if (e.key === 'Escape') {
      closeModal();
      hideBtn();
    }
  });

  // ─── Page words panel ─────────────────────────────────────────────────────
  function createPanel() {
    const el = document.createElement('div');
    el.id = 'engnoting-panel';
    el.innerHTML = `
      <div id="engnoting-panel-header">
        <span id="engnoting-panel-title">📚 Saved from this page</span>
        <span id="engnoting-panel-toggle">▲</span>
      </div>
      <div id="engnoting-panel-body"></div>
    `;
    document.body.appendChild(el);

    el.querySelector('#engnoting-panel-header').addEventListener('click', () => {
      panelCollapsed = !panelCollapsed;
      const body = el.querySelector('#engnoting-panel-body');
      const toggle = el.querySelector('#engnoting-panel-toggle');
      body.style.display = panelCollapsed ? 'none' : 'block';
      toggle.textContent = panelCollapsed ? '▼' : '▲';
    });

    return el;
  }

  function renderPanel(words) {
    panel.style.display = words.length > 0 ? 'block' : 'none';
    const body = panel.querySelector('#engnoting-panel-body');
    body.innerHTML = '';
    words.forEach((w) => {
      const item = document.createElement('div');
      item.className = 'engnoting-panel-word';
      const vi = w.vi_meaning ? `<span class="engnoting-panel-word-vi">${w.vi_meaning}</span>` : '';
      item.innerHTML = `<span class="engnoting-panel-word-text">${w.text}</span>${vi}`;
      body.appendChild(item);
    });
  }

  function loadPageWords(forceRefresh = false) {
    chrome.runtime.sendMessage({
      type: 'getWordsBySource',
      url: location.href,
    }, (response) => {
      if (response && response.success && response.words.length > 0) {
        renderPanel(response.words);
        if (forceRefresh && !panelCollapsed) {
          panel.querySelector('#engnoting-panel-body').style.display = 'block';
        }
      }
    });
  }

  // ─── Init ─────────────────────────────────────────────────────────────────
  floatingBtn = createFloatingBtn();
  modal = createModal();
  panel = createPanel();
  loadPageWords();
})();
