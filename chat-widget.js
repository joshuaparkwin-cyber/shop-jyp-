(function () {
  // ── 스타일 주입 ──
  const style = document.createElement('style');
  style.textContent = `
    .chat-btn {
      position: fixed;
      bottom: 28px;
      right: 28px;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: #111;
      color: #fff;
      border: none;
      font-size: 22px;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(0,0,0,0.18);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }
    .chat-btn:hover { background: #333; }

    .chat-panel {
      position: fixed;
      bottom: 92px;
      right: 28px;
      width: 340px;
      height: 480px;
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.13);
      display: flex;
      flex-direction: column;
      z-index: 9998;
      overflow: hidden;
    }

    .chat-header {
      background: #111;
      color: #fff;
      padding: 16px 20px;
      font-size: 14px;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .chat-header-sub {
      font-size: 11px;
      font-weight: 400;
      color: #aaa;
      margin-top: 2px;
    }

    .chat-close {
      background: none;
      border: none;
      color: #fff;
      font-size: 18px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .chat-bubble {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 13px;
      line-height: 1.6;
      word-break: break-word;
    }

    .chat-bubble.user {
      background: #111;
      color: #fff;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
    }

    .chat-bubble.bot {
      background: #f3f3f3;
      color: #333;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
    }

    .chat-bubble.typing {
      color: #aaa;
      font-style: italic;
    }

    .chat-input-row {
      display: flex;
      gap: 8px;
      padding: 12px 14px;
      border-top: 1px solid #ebebeb;
    }

    .chat-input {
      flex: 1;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 9px 12px;
      font-size: 13px;
      font-family: inherit;
      outline: none;
      resize: none;
    }

    .chat-input:focus { border-color: #999; }

    .chat-send {
      background: #111;
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 9px 14px;
      font-size: 13px;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.2s;
    }

    .chat-send:hover { background: #333; }
    .chat-send:disabled { background: #ccc; cursor: not-allowed; }
  `;
  document.head.appendChild(style);

  // ── HTML 주입 ──
  const btn = document.createElement('button');
  btn.className = 'chat-btn';
  btn.innerHTML = '💬';
  btn.title = 'AI 상담';

  const panel = document.createElement('div');
  panel.className = 'chat-panel';
  panel.style.display = 'none';
  panel.innerHTML = `
    <div class="chat-header">
      <div>
        <div>AI 상담원</div>
        <div class="chat-header-sub">궁금한 점을 물어보세요</div>
      </div>
      <button class="chat-close" id="chat-close-btn">✕</button>
    </div>
    <div class="chat-messages" id="chat-messages">
      <div class="chat-bubble bot">안녕하세요! SHOP AI 상담원입니다. 무엇이든 물어보세요 😊</div>
    </div>
    <div class="chat-input-row">
      <input class="chat-input" id="chat-input" placeholder="메시지를 입력하세요..." />
      <button class="chat-send" id="chat-send-btn">전송</button>
    </div>
  `;

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  // ── 대화 기록 ──
  const history = [];

  // ── 이벤트 ──
  btn.addEventListener('click', () => {
    panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
    if (panel.style.display === 'flex') {
      document.getElementById('chat-input').focus();
    }
  });

  document.getElementById('chat-close-btn').addEventListener('click', () => {
    panel.style.display = 'none';
  });

  document.getElementById('chat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  document.getElementById('chat-send-btn').addEventListener('click', sendMessage);

  function addBubble(text, role) {
    const messagesEl = document.getElementById('chat-messages');
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${role}`;
    bubble.textContent = text;
    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return bubble;
  }

  async function sendMessage() {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send-btn');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    addBubble(text, 'user');
    history.push({ role: 'user', content: text });

    sendBtn.disabled = true;
    const typingBubble = addBubble('입력 중...', 'bot typing');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history })
      });
      const data = await res.json();
      typingBubble.remove();
      addBubble(data.reply, 'bot');
      history.push({ role: 'assistant', content: data.reply });
    } catch (e) {
      typingBubble.remove();
      addBubble('오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 'bot');
    }

    sendBtn.disabled = false;
    input.focus();
  }
})();
