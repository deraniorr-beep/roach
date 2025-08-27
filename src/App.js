// App.js — Combined: daily reset, New Chat, streaming + fallback, flashcards/quiz, quiz fix
import React, { useEffect, useRef, useState } from "react";

/* ---------------- Styles ---------------- */
const STYLE = `
:root{--bg1:#07071a;--bg2:#07102a;--accent1:#6e44ff;--accent2:#47b6ff;--fg:#e8eaff;--muted:#9fb3ff;--ok:#2fd38e}
*{box-sizing:border-box}
body{margin:0;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;background:linear-gradient(180deg,var(--bg1),var(--bg2));color:var(--fg)}
.app{min-height:100vh}
.top{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.08)}
.brand{display:flex;gap:12px;align-items:center}
.logo{width:44px;height:44px;border-radius:10px;background:linear-gradient(135deg,var(--accent1),var(--accent2));display:grid;place-items:center;font-weight:800}
.title{margin:0}
.subtitle{margin:0;font-size:12px;color:var(--muted)}
.container{display:grid;grid-template-columns:360px 1fr;gap:16px;padding:16px}
.sidebar{background:rgba(255,255,255,0.03);padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,0.06)}
.chatPanel{background:rgba(255,255,255,0.03);padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,0.06);display:flex;flex-direction:column;height:76vh}
.messages{flex:1;overflow:auto;padding:8px;display:flex;flex-direction:column;gap:16px}
.msg{max-width:85%;padding:12px 14px;border-radius:14px;line-height:1.45}
.msg.user{align-self:flex-end;background:linear-gradient(180deg,#2b2250,#241a3f)}
.msg.assistant{align-self:flex-start;background:linear-gradient(180deg,#0e1830,#0b1225)}
.time{font-size:11px;color:var(--muted);margin-top:6px}
.typing{align-self:flex-start;display:flex;gap:6px}
.dot{width:8px;height:8px;border-radius:50%;background:#9fb3ff;opacity:.6;animation:blink 1.2s infinite}
.dot:nth-child(2){animation-delay:.2s}.dot:nth-child(3){animation-delay:.4s}
@keyframes blink{0%,80%,100%{opacity:.3}40%{opacity:.9}}
.inputRow{display:flex;gap:8px;margin-top:12px}
.input{flex:1;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:transparent;color:var(--fg)}
.btn{padding:10px 12px;border-radius:10px;border:0;background:linear-gradient(135deg,var(--accent1),var(--accent2));color:white;cursor:pointer;font-weight:700}
.small{font-size:12px;color:var(--muted)}
.card{background:rgba(255,255,255,0.03);padding:10px;border-radius:12px;border:1px solid rgba(255,255,255,0.06);margin-bottom:12px}
.tabs{display:flex;gap:8px;margin-bottom:8px}
.tab{padding:8px 10px;border-radius:8px;background:rgba(255,255,255,0.04);cursor:pointer}
.tab.active{background:linear-gradient(135deg,#23184d,#133156)}
.fc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-top:8px}
.flipCard{perspective:1000px;width:100%;height:146px;cursor:pointer}
.flipInner{position:relative;width:100%;height:100%;text-align:center;transition:transform .6s;transform-style:preserve-3d}
.flipCard.flipped .flipInner{transform:rotateY(180deg)}
.flipFront,.flipBack{position:absolute;width:100%;height:100%;backface-visibility:hidden;border-radius:12px;display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box}
.flipFront{background:linear-gradient(180deg,#13142a,#0f1020);color:var(--fg);border:1px solid rgba(255,255,255,0.06)}
.flipBack{background:linear-gradient(180deg,#0f1230,#0b1530);color:#dff6ff;transform:rotateY(180deg);border:1px solid rgba(255,255,255,0.06)}
.quiz-item{padding:12px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);margin-bottom:10px}
.option{padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.08);cursor:pointer;margin-top:6px;background:transparent}
.option.correct{border-color:var(--ok)}
.option.wrong{border-color:#ff6b6b}
.notice{background:rgba(255,100,100,0.06);padding:8px;border-radius:8px;border:1px solid rgba(255,100,100,0.08);color:#ffb7b7;margin-bottom:8px}
@media (max-width:900px){.container{grid-template-columns:1fr}}
`;

/* ---------------- LocalStorage + Daily Reset ---------------- */
const LS = {
  API_KEY: "ai_tutor_key",
  API_BASE: "ai_tutor_base",
  API_MODEL: "ai_tutor_model",
  HISTORY: "ai_tutor_history",
  LAST_DATE: "ai_tutor_last_date",
};
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}
function ensureDailyReset() {
  const last = localStorage.getItem(LS.LAST_DATE);
  const now = todayStr();
  if (last !== now) {
    localStorage.setItem(LS.LAST_DATE, now);
    localStorage.setItem(LS.HISTORY, "[]"); // wipe chat daily
  }
}
function saveSettings(key, base, model) {
  localStorage.setItem(LS.API_KEY, key || "");
  localStorage.setItem(LS.API_BASE, base || "");
  localStorage.setItem(LS.API_MODEL, model || "");
}
function readSettings() {
  return {
    key: localStorage.getItem(LS.API_KEY) || "",
    base: localStorage.getItem(LS.API_BASE) || "https://api.openai.com/v1",
    model: localStorage.getItem(LS.API_MODEL) || "gpt-4o-mini",
  };
}
function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(LS.HISTORY) || "[]");
  } catch {
    return [];
  }
}
function saveHistory(h) {
  localStorage.setItem(LS.HISTORY, JSON.stringify(h));
}

/* ---------------- LLM (JSON) ---------------- */
async function callLLMJson(prompt, history = []) {
  const settings = readSettings();
  if (!settings.key) throw new Error("No API key configured");

  const system = `
You are an expert educational AI tutor.
If asked for "flashcards", return JSON exactly:
{"format":"flashcards","cards":[{"q":"...","a":"..."}]}
If asked for "quiz", return JSON exactly:
{"format":"quiz","quiz":[{"q":"...","options":["A","B","C","D"],"correct":"A","expl":"..."}]}
`.trim();

  const messages = [
    { role: "system", content: system },
    ...history,
    { role: "user", content: prompt },
  ];
  const url = `${settings.base.replace(/\/+$/, "")}/chat/completions`;
  const body = {
    model: settings.model,
    messages,
    temperature: 0.15,
    max_tokens: 1800,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.key}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`LLM error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || "";
  try {
    return JSON.parse(text);
  } catch {
    return { type: "text", text };
  }
}

/* ---------- Streaming helper with robust fallback ---------- */
async function callLLMStream(prompt, history = [], onChunk) {
  const settings = readSettings();
  if (!settings.key) throw new Error("No API key configured");

  const system = `
You are an expert educational AI tutor. Explain step-by-step with examples and memory tips.
Keep formatting clear and readable for students.
`.trim();

  const messages = [
    { role: "system", content: system },
    ...history,
    { role: "user", content: prompt },
  ];
  const url = `${settings.base.replace(/\/+$/, "")}/chat/completions`;

  // Try streaming first
  try {
    const body = {
      model: settings.model,
      messages,
      temperature: 0.2,
      max_tokens: 1500,
      stream: true,
    };
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.key}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Streaming error ${res.status}: ${txt}`);
    }

    if (!res.body || typeof res.body.getReader !== "function") {
      throw new Error(
        "Streaming not supported by the environment; falling back."
      );
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";
      for (const part of parts) {
        if (!part.startsWith("data:")) continue;
        const payload = part.replace(/^data:\s*/, "");
        if (payload === "[DONE]") return { ok: true };
        try {
          const json = JSON.parse(payload);
          const delta = json?.choices?.[0]?.delta?.content;
          if (delta) onChunk(delta);
        } catch (err) {
          // ignore parse errors
        }
      }
    }
    return { ok: true };
  } catch (streamErr) {
    console.warn(
      "Streaming failed, falling back to non-streamed request:",
      streamErr?.message || streamErr
    );
    try {
      const body2 = {
        model: settings.model,
        messages,
        temperature: 0.2,
        max_tokens: 1500,
      };
      const res2 = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.key}`,
        },
        body: JSON.stringify(body2),
      });
      if (!res2.ok) {
        const txt = await res2.text();
        throw new Error(`Fallback failed ${res2.status}: ${txt}`);
      }
      const data = await res2.json();
      const full = data?.choices?.[0]?.message?.content || "";
      onChunk(full); // deliver in one shot
      return { ok: true, fallback: true };
    } catch (fallbackErr) {
      throw new Error(
        "Both streaming and fallback failed: " +
          (fallbackErr?.message || fallbackErr)
      );
    }
  }
}

/* ---------------- Components ---------------- */
function ChatMessage({ m }) {
  return (
    <div className={`msg ${m.role === "user" ? "user" : "assistant"}`}>
      <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
      <div className="time">{new Date(m.ts).toLocaleString()}</div>
    </div>
  );
}

function QuizItem({ item, resetSignal }) {
  const [picked, setPicked] = useState(null);
  useEffect(() => {
    setPicked(null);
  }, [resetSignal, item?.q]);
  return (
    <div className="quiz-item">
      <div style={{ fontWeight: 700 }}>{item.q}</div>
      <div style={{ marginTop: 8 }}>
        {item.options.map((o, idx) => {
          const isPicked = idx === picked;
          const correct = o === item.correct;
          const cls = isPicked
            ? correct
              ? "option correct"
              : "option wrong"
            : "option";
          return (
            <div
              key={idx}
              className={cls}
              onClick={() => setPicked(idx)}
              style={{ marginTop: 8 }}
            >
              {o}
            </div>
          );
        })}
      </div>
      {picked != null && (
        <div className="small" style={{ marginTop: 8 }}>
          Answer: <strong>{item.correct}</strong>
          <div style={{ color: "#aab", marginTop: 6 }}>{item.expl}</div>
        </div>
      )}
    </div>
  );
}

/* --------------- JSON extraction fallback --------------- */
function tryExtractJSON(text) {
  try {
    return JSON.parse(text);
  } catch {}
  const first = text.indexOf("{");
  if (first === -1) return null;
  let level = 0,
    start = -1,
    end = -1;
  for (let i = first; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") {
      if (start === -1) start = i;
      level++;
    }
    if (ch === "}") {
      level--;
      if (level === 0) {
        end = i;
        break;
      }
    }
  }
  if (start !== -1 && end !== -1) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {}
  }
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {}
  }
  return null;
}

/* ---------------- Main App ---------------- */
export default function App() {
  useEffect(() => {
    const s = document.createElement("style");
    s.innerHTML = STYLE;
    document.head.appendChild(s);
    return () => s.remove();
  }, []);
  useEffect(() => {
    ensureDailyReset();
  }, []);

  const [apiKey, setApiKey] = useState(localStorage.getItem(LS.API_KEY) || "");
  const [apiBase, setApiBase] = useState(
    localStorage.getItem(LS.API_BASE) || "https://api.openai.com/v1"
  );
  const [apiModel, setApiModel] = useState(
    localStorage.getItem(LS.API_MODEL) || "gpt-4o-mini"
  );

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(loadHistory());
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("chat");
  const [flashcards, setFlashcards] = useState([]);
  const [quiz, setQuiz] = useState([]);
  const [quizVersion, setQuizVersion] = useState(0);
  const [streaming, setStreaming] = useState(false);

  const inputRef = useRef(null);
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, flashcards, quiz, streaming]);

  function pushMessage(role, content) {
    const entry = {
      id: Date.now() + Math.random(),
      role,
      content,
      ts: Date.now(),
    };
    const next = [...messages, entry];
    setMessages(next);
    saveHistory(next);
    return entry;
  }
  function updateMessage(id, newContent) {
    setMessages((prev) => {
      const next = prev.map((m) =>
        m.id === id ? { ...m, content: newContent } : m
      );
      saveHistory(next);
      return next;
    });
  }

  function isJsonTask(prompt) {
    if (!prompt) return false;
    const p = prompt.toLowerCase();
    return (
      p.includes("flashcard") ||
      p.includes("make flashcards") ||
      p.includes("create a quiz") ||
      p.startsWith("quiz:")
    );
  }

  async function handleSend() {
    const p = input.trim();
    if (!p) return;
    setInput("");
    pushMessage("user", p);

    // JSON tasks handled without streaming
    if (isJsonTask(p)) {
      setLoading(true);
      try {
        const historyForLLM = messages
          .map((m) => ({ role: m.role, content: m.content }))
          .concat([{ role: "user", content: p }]);
        const res = await callLLMJson(p, historyForLLM);
        if (res?.format === "flashcards") {
          setFlashcards(res.cards || []);
          setView("flashcards");
          pushMessage(
            "assistant",
            `Generated ${res.cards?.length || 0} flashcards.`
          );
        } else if (res?.format === "quiz") {
          setQuiz(res.quiz || []);
          setQuizVersion((v) => v + 1);
          setView("quiz");
          pushMessage(
            "assistant",
            `Generated ${res.quiz?.length || 0} quiz items.`
          );
        } else {
          pushMessage("assistant", res?.text || "Done.");
        }
      } catch (e) {
        pushMessage("assistant", "Error: " + (e.message || e));
      }
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }

    // Normal chat: try streaming (fast feel) with fallback
    setStreaming(true);
    const placeholder = pushMessage("assistant", "");
    try {
      const historyForLLM = messages
        .map((m) => ({ role: m.role, content: m.content }))
        .concat([{ role: "user", content: p }]);
      let acc = "";
      await callLLMStream(p, historyForLLM, (chunk) => {
        acc += chunk;
        updateMessage(placeholder.id, acc);
      });
    } catch (e) {
      updateMessage(placeholder.id, "Error: " + (e.message || e));
    }
    setStreaming(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function generateFlashFromLast() {
    const lastAnswer = [...messages]
      .reverse()
      .find((m) => m.role === "assistant")?.content;
    if (!lastAnswer) {
      alert("Ask something first so I have content to study from.");
      return;
    }
    setLoading(true);
    try {
      const historyForLLM = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const prompt = `Create 8 concise flashcards (q/a) from the following content. Return JSON exactly: {"format":"flashcards","cards":[{"q":"...","a":"..."}]}\n\n${lastAnswer}`;
      const res = await callLLMJson(prompt, historyForLLM);
      let cards = [];
      if (res?.format === "flashcards") cards = res.cards || [];
      else if (res?.type === "text") {
        const parsed = tryExtractJSON(res.text);
        if (parsed?.format === "flashcards") cards = parsed.cards || [];
      }
      if (!cards.length)
        throw new Error("Failed to parse AI output for flashcards.");
      setFlashcards(cards);
      setView("flashcards");
      pushMessage(
        "assistant",
        `Generated ${cards.length} flashcards from last answer.`
      );
    } catch (e) {
      pushMessage(
        "assistant",
        "Error generating flashcards: " + (e.message || e)
      );
    }
    setLoading(false);
  }

  async function generateQuizFromLast() {
    const lastAnswer = [...messages]
      .reverse()
      .find((m) => m.role === "assistant")?.content;
    if (!lastAnswer) {
      alert("Ask something first so I have content to quiz from.");
      return;
    }
    setLoading(true);
    try {
      const historyForLLM = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const prompt = `Create 6 multiple-choice questions (4 options each) from this content. Return JSON exactly: {"format":"quiz","quiz":[{"q":"...","options":["A","B","C","D"],"correct":"A","expl":"..."}]}\n\n${lastAnswer}`;
      const res = await callLLMJson(prompt, historyForLLM);
      let qz = [];
      if (res?.format === "quiz") qz = res.quiz || [];
      else if (res?.type === "text") {
        const parsed = tryExtractJSON(res.text);
        if (parsed?.format === "quiz") qz = parsed.quiz || [];
      }
      if (!qz.length) throw new Error("Failed to parse AI output for quiz.");
      setQuiz(qz);
      setQuizVersion((v) => v + 1);
      setView("quiz");
      pushMessage(
        "assistant",
        `Generated ${qz.length} quiz items from last answer.`
      );
    } catch (e) {
      pushMessage("assistant", "Error generating quiz: " + (e.message || e));
    }
    setLoading(false);
  }

  function newChat() {
    if (!window.confirm("Start a new chat? Current chat will be cleared."))
      return;
    setMessages([]);
    saveHistory([]);
    setFlashcards([]);
    setQuiz([]);
    setQuizVersion((v) => v + 1);
    setView("chat");
    localStorage.setItem(LS.LAST_DATE, todayStr());
  }

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <div className="logo">AI</div>
          <div>
            <h2 className="title">ChatTutor — AI Educational Assistant</h2>
            <div className="subtitle">
              Daily fresh chat. Streamed answers. Flashcards & quizzes on
              demand.
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn" onClick={newChat}>
            New Chat
          </button>
          <button className="btn" onClick={() => window.print()}>
            Print
          </button>
        </div>
      </header>

      <main className="container">
        <aside className="sidebar">
          <div className="card">
            <h4 style={{ margin: 0 }}>AI Settings</h4>
            <div style={{ marginTop: 8 }}>
              <input
                className="input"
                placeholder="OpenAI API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <input
                className="input"
                placeholder="API base"
                value={apiBase}
                onChange={(e) => setApiBase(e.target.value)}
                style={{ marginTop: 8 }}
              />
              <input
                className="input"
                placeholder="Model"
                value={apiModel}
                onChange={(e) => setApiModel(e.target.value)}
                style={{ marginTop: 8 }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  className="btn"
                  onClick={() => {
                    localStorage.setItem(LS.API_KEY, apiKey.trim());
                    localStorage.setItem(LS.API_BASE, apiBase.trim());
                    localStorage.setItem(LS.API_MODEL, apiModel.trim());
                    alert("Saved.");
                  }}
                >
                  Save
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    setApiKey("");
                    setApiBase("https://api.openai.com/v1");
                    setApiModel("gpt-4o-mini");
                    localStorage.removeItem(LS.API_KEY);
                    localStorage.removeItem(LS.API_BASE);
                    localStorage.removeItem(LS.API_MODEL);
                    alert("Reset");
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <h4 style={{ margin: 0 }}>Generate from last answer</h4>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginTop: 8,
              }}
            >
              <button className="btn" onClick={generateFlashFromLast}>
                Flashcards
              </button>
              <button className="btn" onClick={generateQuizFromLast}>
                Quiz
              </button>
            </div>
            <div className="small" style={{ marginTop: 8 }}>
              Tip: ask a topic first, then create materials.
            </div>
          </div>
        </aside>

        <section>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <div className="tabs">
              <div
                className={`tab ${view === "chat" ? "active" : ""}`}
                onClick={() => setView("chat")}
              >
                Chat
              </div>
              <div
                className={`tab ${view === "flashcards" ? "active" : ""}`}
                onClick={() => setView("flashcards")}
              >
                Flashcards
              </div>
              <div
                className={`tab ${view === "quiz" ? "active" : ""}`}
                onClick={() => setView("quiz")}
              >
                Quiz
              </div>
            </div>
            <div className="small">
              {streaming || loading ? "Working..." : "Ready"}
            </div>
          </div>

          {view === "chat" && (
            <div className="chatPanel">
              <div className="messages">
                {messages.map((m) => (
                  <ChatMessage key={m.id} m={m} />
                ))}
                {streaming && (
                  <div className="typing">
                    <div className="dot"></div>
                    <div className="dot"></div>
                    <div className="dot"></div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              <div className="inputRow">
                <textarea
                  ref={inputRef}
                  className="input"
                  style={{ minHeight: 56, maxHeight: 180, resize: "vertical" }}
                  placeholder='Ask anything, e.g., "Explain mitosis"'
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <button
                  className="btn"
                  onClick={handleSend}
                  disabled={loading || streaming}
                >
                  {loading || streaming ? "…" : "Send"}
                </button>
              </div>
            </div>
          )}

          {view === "flashcards" && (
            <div>
              {!flashcards.length && (
                <div className="small">
                  No flashcards yet — ask the chat and click “Flashcards”.
                </div>
              )}
              {!!flashcards.length && (
                <div className="fc-grid">
                  {flashcards.map((c, i) => (
                    <div
                      key={i}
                      className="flipCard"
                      tabIndex={0}
                      onClick={(e) =>
                        e.currentTarget.classList.toggle("flipped")
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.currentTarget.classList.toggle("flipped");
                        }
                      }}
                    >
                      <div className="flipInner">
                        <div className="flipFront">
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontWeight: 700, marginBottom: 6 }}>
                              {c.q}
                            </div>
                            <div
                              className="small"
                              style={{ color: "var(--muted)" }}
                            >
                              Tap to flip
                            </div>
                          </div>
                        </div>
                        <div className="flipBack">
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontWeight: 700, marginBottom: 6 }}>
                              Answer
                            </div>
                            <div style={{ color: "#dff6ff" }}>{c.a}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {view === "quiz" && (
            <div>
              {!quiz.length && (
                <div className="small">
                  No quiz yet — ask the chat and click “Quiz”.
                </div>
              )}
              {!!quiz.length &&
                quiz.map((it, idx) => (
                  <QuizItem
                    key={`v${quizVersion}-${idx}-${it.q}`}
                    item={it}
                    resetSignal={quizVersion}
                  />
                ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
