"use client";

import { useEffect, useRef, useState } from "react";
import { buildResearchPdf } from "../lib/pdf";

const STORAGE_KEY = "relu-research-config-v1";

const DEFAULT_MODELS = [
  "anthropic/claude-3.5-sonnet",
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "google/gemini-flash-1.5",
  "meta-llama/llama-3.1-70b-instruct",
];

function loadConfig() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveConfig(config) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export default function Page() {
  const [tab, setTab] = useState("api"); // 'api' | 'discord'
  const [openRouterKey, setOpenRouterKey] = useState("");
  const [serperKey, setSerperKey] = useState("");
  const [model, setModel] = useState(DEFAULT_MODELS[0]);

  const [discordBotToken, setDiscordBotToken] = useState("");
  const [discordChannelId, setDiscordChannelId] = useState("");
  const [applicantName, setApplicantName] = useState("");
  const [applicantEmail, setApplicantEmail] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    const cfg = loadConfig();
    if (cfg) {
      setOpenRouterKey(cfg.openRouterKey || "");
      setSerperKey(cfg.serperKey || "");
      setModel(cfg.model || DEFAULT_MODELS[0]);
      setDiscordBotToken(cfg.discordBotToken || "");
      setDiscordChannelId(cfg.discordChannelId || "");
      setApplicantName(cfg.applicantName || "");
      setApplicantEmail(cfg.applicantEmail || "");
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  function handleSaveConfig() {
    saveConfig({
      openRouterKey,
      serperKey,
      model,
      discordBotToken,
      discordChannelId,
      applicantName,
      applicantEmail,
    });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    const query = input.trim();
    if (!query || loading) return;

    if (!openRouterKey || !serperKey) {
      setMessages((m) => [
        ...m,
        { role: "user", type: "text", content: query },
        {
          role: "assistant",
          type: "error",
          content: "Please configure your OpenRouter and Serper.dev API keys in the sidebar first.",
        },
      ]);
      setInput("");
      return;
    }

    setMessages((m) => [...m, { role: "user", type: "text", content: query }]);
    setInput("");
    setLoading(true);
    setProgressStep("Searching and resolving official website…");

    try {
      setTimeout(() => setProgressStep("Crawling website pages…"), 900);
      setTimeout(() => setProgressStep("Gathering public information…"), 2200);
      setTimeout(() => setProgressStep("Running AI analysis…"), 3600);

      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: query,
          openRouterApiKey: openRouterKey,
          serperApiKey: serperKey,
          model,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Research failed.");

      setMessages((m) => [...m, { role: "assistant", type: "result", content: data.result }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", type: "error", content: err.message || "Something went wrong." },
      ]);
    } finally {
      setLoading(false);
      setProgressStep("");
    }
  }

  return (
    <div style={styles.appShell}>
      <Sidebar
        tab={tab}
        setTab={setTab}
        openRouterKey={openRouterKey}
        setOpenRouterKey={setOpenRouterKey}
        serperKey={serperKey}
        setSerperKey={setSerperKey}
        model={model}
        setModel={setModel}
        discordBotToken={discordBotToken}
        setDiscordBotToken={setDiscordBotToken}
        discordChannelId={discordChannelId}
        setDiscordChannelId={setDiscordChannelId}
        applicantName={applicantName}
        setApplicantName={setApplicantName}
        applicantEmail={applicantEmail}
        setApplicantEmail={setApplicantEmail}
        onSave={handleSaveConfig}
        savedFlash={savedFlash}
      />

      <main style={styles.main}>
        <header style={styles.header}>
          <h1 style={styles.headerTitle}>Company Research</h1>
          <span style={styles.liveBadge}>● LIVE</span>
        </header>

        <div ref={scrollRef} style={styles.chatArea} className="scrollbar">
          {messages.length === 0 && !loading && <EmptyState />}

          {messages.map((msg, i) => (
            <MessageBlock
              key={i}
              msg={msg}
              discordConfig={{ discordBotToken, discordChannelId, applicantName, applicantEmail }}
            />
          ))}

          {loading && <ProgressBlock step={progressStep} />}
        </div>

        <form onSubmit={handleSubmit} style={styles.inputBar}>
          <input
            style={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter a company name (e.g. Aurora Labs) or website URL (e.g. https://aurora.dev)…"
            disabled={loading}
          />
          <button type="submit" style={styles.researchBtn} disabled={loading}>
            {loading ? "Researching…" : "Research →"}
          </button>
        </form>
        <div style={styles.inputHint}>ENTER TO RESEARCH · SHIFT+ENTER FOR NEW LINE</div>
      </main>
    </div>
  );
}

function Sidebar(props) {
  const {
    tab,
    setTab,
    openRouterKey,
    setOpenRouterKey,
    serperKey,
    setSerperKey,
    model,
    setModel,
    discordBotToken,
    setDiscordBotToken,
    discordChannelId,
    setDiscordChannelId,
    applicantName,
    setApplicantName,
    applicantEmail,
    setApplicantEmail,
    onSave,
    savedFlash,
  } = props;

  return (
    <aside style={styles.sidebar}>
      <div style={styles.brand}>
        <div style={styles.brandLogo}>R</div>
        <div>
          <div style={styles.brandName}>Relu Consultancy</div>
          <div style={styles.brandSub}>COMPANY INTELLIGENCE</div>
        </div>
      </div>

      <button style={styles.newResearchBtn} onClick={() => window.location.reload()}>
        + New Research
      </button>

      <div style={styles.tabRow}>
        <button
          style={{ ...styles.tabBtn, ...(tab === "api" ? styles.tabBtnActive : {}) }}
          onClick={() => setTab("api")}
        >
          API
        </button>
        <button
          style={{ ...styles.tabBtn, ...(tab === "discord" ? styles.tabBtnActive : {}) }}
          onClick={() => setTab("discord")}
        >
          DISCORD
        </button>
      </div>

      {tab === "api" ? (
        <>
          <Field label="OPENROUTER API KEY">
            <input
              style={styles.textInput}
              type="password"
              placeholder="sk-or-v1-..."
              value={openRouterKey}
              onChange={(e) => setOpenRouterKey(e.target.value)}
            />
          </Field>
          <Field label="SERPER.DEV API KEY">
            <input
              style={styles.textInput}
              type="password"
              placeholder="Your Serper key..."
              value={serperKey}
              onChange={(e) => setSerperKey(e.target.value)}
            />
          </Field>
          <Field label="AI MODEL">
            <select style={styles.textInput} value={model} onChange={(e) => setModel(e.target.value)}>
              {DEFAULT_MODELS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
        </>
      ) : (
        <>
          <div style={styles.discordNote}>
            <strong>Discord Bot Integration</strong>
            <div style={{ marginTop: 6, color: "var(--muted)" }}>
              After research completes, the report auto-sends to your configured channel.
            </div>
          </div>
          <Field label="BOT TOKEN">
            <input
              style={styles.textInput}
              type="password"
              placeholder="Discord bot token"
              value={discordBotToken}
              onChange={(e) => setDiscordBotToken(e.target.value)}
            />
          </Field>
          <Field label="CHANNEL ID">
            <input
              style={styles.textInput}
              placeholder="Channel ID"
              value={discordChannelId}
              onChange={(e) => setDiscordChannelId(e.target.value)}
            />
          </Field>

          <div style={styles.applicantHeading}>APPLICANT DETAILS</div>
          <Field label="Full Name">
            <input
              style={styles.textInput}
              placeholder="Your name"
              value={applicantName}
              onChange={(e) => setApplicantName(e.target.value)}
            />
          </Field>
          <Field label="Email Address">
            <input
              style={styles.textInput}
              placeholder="you@example.com"
              value={applicantEmail}
              onChange={(e) => setApplicantEmail(e.target.value)}
            />
          </Field>
        </>
      )}

      <button style={styles.saveBtn} onClick={onSave}>
        {savedFlash ? "Saved ✓" : "Save Configuration"}
      </button>

      <div style={styles.howItWorks}>
        <div style={styles.howItWorksTitle}>HOW IT WORKS</div>
        {[
          "Enter a company name or URL",
          "Serper.dev searches and crawls it",
          "OpenRouter AI generates insights",
          "Download a professional PDF report",
        ].map((step, i) => (
          <div key={i} style={styles.howStep}>
            <span style={styles.howStepNum}>{i + 1}</span>
            <span>{step}</span>
          </div>
        ))}
      </div>

      <div style={styles.sidebarFooter}>OPENROUTER · SERPER · JSPDF</div>
    </aside>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={styles.fieldLabel}>{label}</div>
      {children}
    </div>
  );
}

function EmptyState() {
  return (
    <div style={styles.emptyWrap}>
      <div style={styles.emptyKicker}>AI-POWERED INTELLIGENCE</div>
      <h2 style={styles.emptyTitle}>
        Know any company
        <br />
        in minutes.
      </h2>
      <p style={styles.emptySub}>
        Enter a company name or website URL to get AI-powered insights, competitor analysis, pain
        points, and a professional PDF report.
      </p>
      <div style={styles.chipsRow}>
        {["Stripe", "Tesla", "Notion"].map((c) => (
          <span key={c} style={styles.chip}>
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

function ProgressBlock({ step }) {
  return (
    <div style={styles.progressBlock}>
      <div style={styles.spinner} />
      <span>{step || "Working…"}</span>
    </div>
  );
}

function MessageBlock({ msg, discordConfig }) {
  if (msg.role === "user") {
    return (
      <div style={styles.userMsgWrap}>
        <div style={styles.userMsg}>{msg.content}</div>
      </div>
    );
  }

  if (msg.type === "error") {
    return (
      <div style={styles.errorMsg}>
        <strong>Couldn't complete research:</strong> {msg.content}
      </div>
    );
  }

  if (msg.type === "result") {
    return <ResultCard result={msg.content} discordConfig={discordConfig} />;
  }

  return null;
}

function ResultCard({ result, discordConfig }) {
  const [sending, setSending] = useState(false);
  const [sentStatus, setSentStatus] = useState(null); // null | 'ok' | 'error'

  function handleDownload() {
    const { blob, fileName } = buildResearchPdf(result);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSendToDiscord() {
    if (!discordConfig.discordBotToken || !discordConfig.discordChannelId) {
      setSentStatus("error");
      return;
    }
    setSending(true);
    setSentStatus(null);
    try {
      const { dataUri, fileName } = buildResearchPdf(result);
      const res = await fetch("/api/discord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken: discordConfig.discordBotToken,
          channelId: discordConfig.discordChannelId,
          applicantName: discordConfig.applicantName,
          applicantEmail: discordConfig.applicantEmail,
          companyName: result.companyName,
          companyWebsite: result.website,
          pdfBase64: dataUri,
          fileName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSentStatus("ok");
    } catch {
      setSentStatus("error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={styles.resultCard}>
      <div style={styles.resultHeader}>
        <div>
          <h3 style={styles.resultTitle}>{result.companyName}</h3>
          <a href={result.website} target="_blank" rel="noreferrer" style={styles.resultLink}>
            {result.website}
          </a>
        </div>
        <span style={styles.completeBadge}>RESEARCH COMPLETE</span>
      </div>

      <div style={styles.infoGrid}>
        <div style={styles.infoBox}>
          <div style={styles.infoLabel}>PHONE</div>
          <div>{result.phone || "Not publicly listed"}</div>
        </div>
        <div style={styles.infoBox}>
          <div style={styles.infoLabel}>ADDRESS</div>
          <div>{result.address || "Not publicly listed"}</div>
        </div>
      </div>

      <div style={styles.sectionLabel}>PRODUCTS & SERVICES</div>
      <div style={styles.tagRow}>
        {(result.productsServices || []).map((p, i) => (
          <span key={i} style={styles.tag}>
            {p}
          </span>
        ))}
      </div>

      <div style={styles.sectionLabel}>AI-GENERATED PAIN POINTS</div>
      <ul style={styles.list}>
        {(result.painPoints || []).map((p, i) => (
          <li key={i} style={styles.listItem}>
            {p}
          </li>
        ))}
      </ul>

      <div style={styles.sectionLabel}>COMPETITORS</div>
      <div style={styles.competitorGrid}>
        {(result.competitors || []).map((c, i) => (
          <div key={i} style={styles.competitorCard}>
            <div style={{ fontWeight: 600 }}>{c.name}</div>
            <a href={c.website} target="_blank" rel="noreferrer" style={styles.resultLink}>
              {c.website}
            </a>
          </div>
        ))}
      </div>

      <div style={styles.actionsRow}>
        <button style={styles.downloadBtn} onClick={handleDownload}>
          ↓ Download PDF Report
        </button>
        <button style={styles.discordBtn} onClick={handleSendToDiscord} disabled={sending}>
          {sending
            ? "Sending…"
            : sentStatus === "ok"
            ? "✓ Sent to Discord"
            : sentStatus === "error"
            ? "Retry Send to Discord"
            : "Send to Discord"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  appShell: {
    display: "flex",
    height: "100vh",
    width: "100vw",
    overflow: "hidden",
  },
  sidebar: {
    width: 320,
    borderRight: "1px solid var(--border)",
    background: "var(--panel)",
    padding: "20px 20px 16px",
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
  },
  brand: { display: "flex", alignItems: "center", gap: 10, marginBottom: 20 },
  brandLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: "var(--blue)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
  },
  brandName: { fontWeight: 700, fontSize: 15 },
  brandSub: { fontSize: 10, color: "var(--muted)", letterSpacing: 1 },
  newResearchBtn: {
    background: "transparent",
    border: "1px solid var(--border)",
    color: "var(--text)",
    borderRadius: "var(--radius)",
    padding: "10px 12px",
    marginBottom: 14,
    fontSize: 13,
    fontWeight: 600,
  },
  tabRow: { display: "flex", gap: 8, marginBottom: 16 },
  tabBtn: {
    flex: 1,
    padding: "8px 0",
    background: "transparent",
    border: "1px solid var(--border)",
    color: "var(--muted)",
    borderRadius: "var(--radius)",
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: 700,
  },
  tabBtnActive: { color: "var(--text)", borderColor: "var(--accent)" },
  fieldLabel: {
    fontSize: 10,
    color: "var(--muted)",
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  textInput: {
    width: "100%",
    padding: "10px 12px",
    background: "#0d0d10",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--text)",
    fontSize: 13,
  },
  discordNote: {
    background: "rgba(109,139,255,0.08)",
    border: "1px solid rgba(109,139,255,0.35)",
    borderRadius: 8,
    padding: 12,
    fontSize: 12,
    marginBottom: 14,
  },
  applicantHeading: {
    fontSize: 10,
    color: "var(--muted)",
    letterSpacing: 0.5,
    margin: "10px 0 10px",
  },
  saveBtn: {
    background: "var(--accent)",
    border: "none",
    borderRadius: 8,
    padding: "12px 0",
    fontWeight: 700,
    color: "#1a1200",
    marginTop: 4,
  },
  howItWorks: { marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border)" },
  howItWorksTitle: { fontSize: 10, color: "var(--muted)", letterSpacing: 1, marginBottom: 12 },
  howStep: { display: "flex", gap: 10, alignItems: "center", fontSize: 12, marginBottom: 10 },
  howStepNum: {
    width: 18,
    height: 18,
    borderRadius: 5,
    background: "rgba(245,166,35,0.15)",
    color: "var(--accent)",
    fontSize: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sidebarFooter: { marginTop: "auto", paddingTop: 20, fontSize: 10, color: "#48484f", letterSpacing: 1 },

  main: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
  header: {
    padding: "18px 24px",
    borderBottom: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  headerTitle: { fontSize: 18, margin: 0, fontWeight: 700 },
  liveBadge: { fontSize: 11, color: "var(--green)", fontWeight: 700, letterSpacing: 1 },

  chatArea: { flex: 1, overflowY: "auto", padding: "24px" },

  emptyWrap: { maxWidth: 640, margin: "60px auto", textAlign: "center" },
  emptyKicker: { color: "var(--accent)", fontSize: 12, letterSpacing: 2, marginBottom: 16 },
  emptyTitle: { fontSize: 40, lineHeight: 1.15, margin: "0 0 20px" },
  emptySub: { color: "var(--muted)", fontSize: 15, lineHeight: 1.6 },
  chipsRow: { display: "flex", gap: 10, justifyContent: "center", marginTop: 24, flexWrap: "wrap" },
  chip: {
    border: "1px solid var(--border)",
    borderRadius: 20,
    padding: "6px 16px",
    fontSize: 13,
    color: "var(--muted)",
  },

  userMsgWrap: { display: "flex", justifyContent: "flex-end", marginBottom: 16 },
  userMsg: {
    background: "var(--accent)",
    color: "#1a1200",
    padding: "10px 16px",
    borderRadius: 14,
    maxWidth: "70%",
    fontSize: 14,
    fontWeight: 600,
  },
  errorMsg: {
    background: "rgba(248,113,113,0.1)",
    border: "1px solid rgba(248,113,113,0.4)",
    color: "var(--danger)",
    padding: "12px 16px",
    borderRadius: 10,
    fontSize: 13,
    marginBottom: 16,
  },

  progressBlock: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "var(--muted)",
    fontSize: 13,
    padding: "10px 2px",
  },
  spinner: {
    width: 14,
    height: 14,
    border: "2px solid var(--border)",
    borderTopColor: "var(--accent)",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },

  resultCard: {
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: 14,
    padding: 24,
    marginBottom: 20,
  },
  resultHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  resultTitle: { margin: "0 0 4px", fontSize: 22 },
  resultLink: { fontSize: 13, textDecoration: "none" },
  completeBadge: {
    fontSize: 10,
    color: "var(--green)",
    border: "1px solid rgba(52,211,153,0.4)",
    borderRadius: 20,
    padding: "4px 10px",
    letterSpacing: 0.5,
    height: "fit-content",
  },
  infoGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 },
  infoBox: { border: "1px solid var(--border)", borderRadius: 10, padding: 12 },
  infoLabel: { fontSize: 10, color: "var(--muted)", letterSpacing: 0.5, marginBottom: 6 },
  sectionLabel: {
    fontSize: 11,
    color: "var(--muted)",
    letterSpacing: 1,
    margin: "18px 0 10px",
    textTransform: "uppercase",
  },
  tagRow: { display: "flex", flexWrap: "wrap", gap: 8 },
  tag: {
    background: "rgba(109,139,255,0.1)",
    border: "1px solid rgba(109,139,255,0.3)",
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 12,
  },
  list: { margin: 0, paddingLeft: 18 },
  listItem: { fontSize: 13.5, lineHeight: 1.7, color: "#dcdce2" },
  competitorGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  competitorCard: { border: "1px solid var(--border)", borderRadius: 10, padding: 12, fontSize: 13 },
  actionsRow: { display: "flex", gap: 12, marginTop: 22 },
  downloadBtn: {
    background: "var(--accent)",
    color: "#1a1200",
    border: "none",
    borderRadius: 8,
    padding: "12px 18px",
    fontWeight: 700,
    fontSize: 13,
  },
  discordBtn: {
    background: "transparent",
    border: "1px solid var(--green)",
    color: "var(--green)",
    borderRadius: 8,
    padding: "12px 18px",
    fontWeight: 700,
    fontSize: 13,
  },

  inputBar: { display: "flex", gap: 10, padding: "16px 24px 4px", borderTop: "1px solid var(--border)" },
  input: {
    flex: 1,
    padding: "14px 16px",
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    color: "var(--text)",
    fontSize: 14,
  },
  researchBtn: {
    background: "var(--accent)",
    border: "none",
    borderRadius: 10,
    padding: "0 22px",
    fontWeight: 700,
    color: "#1a1200",
    fontSize: 14,
  },
  inputHint: {
    textAlign: "center",
    fontSize: 10,
    color: "#48484f",
    letterSpacing: 1,
    padding: "6px 0 16px",
  },
};
