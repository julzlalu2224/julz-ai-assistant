/**
 * chatbox.js — vanilla JS portfolio chatbox
 *
 * No framework. No build step. Just drop two files into your project.
 *
 * HOW TO USE:
 *   1. Copy chatbox.js and chatbox.css into your portfolio folder.
 *   2. Add to every page (before </body>):
 *
 *        <link rel="stylesheet" href="chatbox.css" />
 *        <script src="chatbox.js"></script>
 *
 *   3. Set your backend URL below (or change it before deploying).
 */

(function () {
  "use strict";

  // ── Config — change this to your deployed backend URL ───────────────────
  const API_URL = "http://localhost:3000";

  // ── Build the HTML structure ─────────────────────────────────────────────
  const wrapper = document.createElement("div");
  wrapper.className = "cb-wrapper";
  wrapper.innerHTML = `
    <div class="cb-window" id="cb-window" role="dialog" aria-label="Chat with James's AI">
      <header class="cb-header">
        <span class="cb-header-title">
          <span class="cb-dot"></span>
          Ask James's AI
        </span>
        <button class="cb-close" id="cb-close" aria-label="Close chat">✕</button>
      </header>

      <div class="cb-messages" id="cb-messages" aria-live="polite"></div>

      <div class="cb-input-row">
        <textarea
          id="cb-input"
          class="cb-input"
          placeholder="Type a message…"
          rows="1"
          maxlength="1000"
          aria-label="Your message"
        ></textarea>
        <button class="cb-send" id="cb-send" aria-label="Send message" disabled>➤</button>
      </div>
    </div>

    <button class="cb-fab" id="cb-fab" aria-label="Open chat">💬</button>
  `;
  document.body.appendChild(wrapper);

  // ── Element refs ─────────────────────────────────────────────────────────
  const window_  = document.getElementById("cb-window");
  const fab      = document.getElementById("cb-fab");
  const closeBtn = document.getElementById("cb-close");
  const messages = document.getElementById("cb-messages");
  const input    = document.getElementById("cb-input");
  const sendBtn  = document.getElementById("cb-send");

  let isStreaming = false;

  // ── Open / close ─────────────────────────────────────────────────────────
  function openChat() {
    window_.classList.add("cb-open");
    fab.setAttribute("aria-label", "Close chat");
    fab.textContent = "✕";
    input.focus();
  }

  function closeChat() {
    window_.classList.remove("cb-open");
    fab.setAttribute("aria-label", "Open chat");
    fab.textContent = "💬";
  }

  fab.addEventListener("click", () =>
    window_.classList.contains("cb-open") ? closeChat() : openChat()
  );
  closeBtn.addEventListener("click", closeChat);

  // ── Enable send button only when there is text ────────────────────────────
  input.addEventListener("input", () => {
    sendBtn.disabled = input.value.trim().length === 0 || isStreaming;
    // Auto-grow textarea up to its CSS max-height
    input.style.height = "auto";
    input.style.height = input.scrollHeight + "px";
  });

  // Send on Enter (Shift+Enter = new line)
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) sendMessage();
    }
  });

  sendBtn.addEventListener("click", sendMessage);

  // ── Add a message bubble to the chat ─────────────────────────────────────
  function addBubble(role, text = "", isError = false) {
    const bubble = document.createElement("div");
    bubble.className = `cb-bubble cb-bubble--${role}${isError ? " cb-bubble--error" : ""}`;
    bubble.textContent = text;
    messages.appendChild(bubble);
    scrollToBottom();
    return bubble;
  }

  function scrollToBottom() {
    messages.scrollTop = messages.scrollHeight;
  }

  // ── Send message and stream the reply ────────────────────────────────────
  async function sendMessage() {
    const text = input.value.trim();
    if (!text || isStreaming) return;

    // Reset input
    input.value = "";
    input.style.height = "auto";
    sendBtn.disabled = true;

    // Show user bubble
    addBubble("user", text);

    // Placeholder assistant bubble (will be filled by stream)
    const assistantBubble = addBubble("assistant", "");
    const cursor = document.createElement("span");
    cursor.className = "cb-cursor";
    assistantBubble.appendChild(cursor);

    isStreaming = true;

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!response.ok) {
        let errMsg = "Request failed.";
        try { errMsg = (await response.json()).error || errMsg; } catch (_) {}
        throw new Error(errMsg);
      }

      // Read the SSE stream chunk by chunk
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop(); // Keep any incomplete trailing chunk

        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          let payload;
          try { payload = JSON.parse(part.slice(6)); } catch (_) { continue; }

          if (payload.chunk) {
            fullText += payload.chunk;
            // Update bubble text (cursor stays at the end)
            assistantBubble.textContent = fullText;
            assistantBubble.appendChild(cursor);
            scrollToBottom();
          }

          if (payload.error) throw new Error(payload.error);
        }
      }
    } catch (err) {
      assistantBubble.textContent = "Sorry, something went wrong. Please try again.";
      assistantBubble.classList.add("cb-bubble--error");
    } finally {
      // Remove blinking cursor when done
      cursor.remove();
      isStreaming = false;
      sendBtn.disabled = input.value.trim().length === 0;
      input.focus();
    }
  }

  // ── Show the welcome message ──────────────────────────────────────────────
  addBubble(
    "assistant",
    "Hi! I'm James's AI assistant. Ask me anything about his background, skills, or projects."
  );
})();
