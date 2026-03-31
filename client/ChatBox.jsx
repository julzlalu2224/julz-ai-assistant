/**
 * ChatBox.jsx
 *
 * Drop this component anywhere in your React portfolio.
 *
 * Usage:
 *   import ChatBox from "./ChatBox";
 *   <ChatBox />
 *
 * Set VITE_API_URL in your frontend .env:
 *   VITE_API_URL=http://localhost:3000
 */

import { useState, useRef, useEffect } from "react";
import "./ChatBox.css";

// ── Safe markdown → HTML renderer ────────────────────────────────────────────
function renderMarkdown(text) {
  // 1. Escape HTML to prevent XSS
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // 2. Convert markdown to HTML
  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")  // **bold**
    .replace(/\*(?!\*)(.+?)\*(?!\*)/g, "<em>$1</em>")  // *italic*
    .replace(/^[\-\*] (.+)/gm, "<li>$1</li>")          // - bullet
    .replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>")         // wrap in <ul>
    .replace(/\n/g, "<br>");                            // newlines
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// ── Chat message shape: { role: "user" | "assistant", text: string } ────────

export default function ChatBox() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi! I'm James's AI assistant. Ask me anything about his background, skills, or projects.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || isStreaming) return;

    // Add user message immediately
    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setIsStreaming(true);

    // Add an empty assistant message that will be filled by the stream
    setMessages((prev) => [...prev, { role: "assistant", text: "" }]);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || "Request failed");
      }

      // Read the SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop(); // Keep incomplete trailing chunk

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = JSON.parse(line.slice(6));

          if (payload.chunk) {
            // Append streamed text to the last assistant message
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                text: updated[updated.length - 1].text + payload.chunk,
              };
              return updated;
            });
          }

          if (payload.error) {
            throw new Error(payload.error);
          }
        }
      }
    } catch (err) {
      console.error("[ChatBox] fetch error:", err);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          text: "Sorry, something went wrong. Please try again.",
          isError: true,
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="cb-wrapper">
      {/* ── Chat window ─────────────────────────────────────── */}
      {isOpen && (
        <div className="cb-window">
          <header className="cb-header">
            <span className="cb-header-title">
              <span className="cb-dot" />
              Ask James's AI
            </span>
            <button
              className="cb-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              ✕
            </button>
          </header>

          <div className="cb-messages">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`cb-bubble cb-bubble--${msg.role}${msg.isError ? " cb-bubble--error" : ""}`}
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(msg.text) +
                    (isStreaming && i === messages.length - 1 && msg.role === "assistant"
                      ? '<span class="cb-cursor"></span>'
                      : "")
                }}
              />
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="cb-input-row">
            <textarea
              ref={inputRef}
              className="cb-input"
              placeholder="Type a message…"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              maxLength={1000}
            />
            <button
              className="cb-send"
              onClick={sendMessage}
              disabled={isStreaming || !input.trim()}
              aria-label="Send message"
            >
              {isStreaming ? "…" : "➤"}
            </button>
          </div>
        </div>
      )}

      {/* ── Floating toggle button ───────────────────────────── */}
      <button
        className="cb-fab"
        onClick={() => setIsOpen((o) => !o)}
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? "✕" : "💬"}
      </button>
    </div>
  );
}
