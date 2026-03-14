"use client";

import { useEffect, useMemo, useState } from "react";

type Message = {
  from: "user" | "bot";
  text: string;
};

const tips: Record<string, string> = {
  pipeline: "Visualize gargalos por etapa para agir mais rápido.",
  health: "Use sinais de risco para reduzir churn.",
  financeiro: "Acompanhe receita recorrente e inadimplência.",
  analytics: "Descubra os canais que trazem melhor ROI.",
  contratos: "Antecipe renovações e reajustes críticos.",
  atividades: "Monitore ações dos agentes em tempo real.",
};

const botAnswers: Record<string, string> = {
  default:
    "Posso ajudar com pipeline, finanças, contratos, analytics e rotinas diárias. Pergunte algo objetivo para eu acelerar sua operação.",
  pipeline:
    "No pipeline, priorize oportunidades com alto valor e baixa probabilidade para recuperar conversão.",
  financeiro:
    "No financeiro, monitore MRR novo, expansão e churn juntos para entender crescimento líquido.",
  contrato:
    "Para contratos, configure alertas 30/15/7 dias antes do vencimento e um playbook de renovação.",
};

export function ExperienceLab() {
  const [messages, setMessages] = useState<Message[]>([
    { from: "bot", text: "👋 Olá! Eu sou o Chatboook da BirthHub. Como posso ajudar hoje?" },
  ]);
  const [input, setInput] = useState("");
  const [voiceStatus, setVoiceStatus] = useState("Pronto para comando de voz");
  const [note, setNote] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [tip, setTip] = useState("Clique em um item para ver um balão explicativo.");

  useEffect(() => {
    const savedNote = window.localStorage.getItem("birthub-note");
    const savedDate = window.localStorage.getItem("birthub-scheduled-at");
    if (savedNote) setNote(savedNote);
    if (savedDate) setScheduledAt(savedDate);
  }, []);

  const nowLabel = useMemo(() => new Date().toLocaleString("pt-BR"), []);

  const playSound = (freq = 660) => {
    const audioCtx = new window.AudioContext();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = freq;
    gainNode.gain.value = 0.05;

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.12);
  };

  const answerFromText = (text: string) => {
    const normalized = text.toLowerCase();
    if (normalized.includes("pipeline")) return botAnswers.pipeline;
    if (normalized.includes("finance")) return botAnswers.financeiro;
    if (normalized.includes("contrat")) return botAnswers.contrato;
    return botAnswers.default;
  };

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const botReply = answerFromText(text);
    setMessages((prev) => [
      ...prev,
      { from: "user", text },
      { from: "bot", text: botReply },
    ]);
    playSound(740);
    setInput("");
  };

  const startVoiceCommand = () => {
    const Recognition =
      (window as Window & { webkitSpeechRecognition?: any; SpeechRecognition?: any }).webkitSpeechRecognition ||
      (window as Window & { SpeechRecognition?: any }).SpeechRecognition;

    if (!Recognition) {
      setVoiceStatus("Comando de voz não suportado neste navegador.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "pt-BR";
    recognition.interimResults = false;

    recognition.onstart = () => setVoiceStatus("🎙️ Ouvindo...");
    recognition.onend = () => setVoiceStatus("Pronto para novo comando");
    recognition.onerror = () => setVoiceStatus("Erro no reconhecimento de voz.");
    recognition.onresult = (event: any) => {
      const spokenText = event.results[0][0].transcript;
      setVoiceStatus(`Comando recebido: ${spokenText}`);
      sendMessage(spokenText);
    };

    recognition.start();
  };

  const savePlanner = () => {
    window.localStorage.setItem("birthub-note", note);
    window.localStorage.setItem("birthub-scheduled-at", scheduledAt);
    setTip("Planejamento salvo com sucesso no navegador.");
    playSound(520);
  };

  return (
    <section className="experience-shell card">
      <div className="experience-header">
        <h2>⚡ Experience Boost 360</h2>
        <p>🤩 Interações com chatbot, voz, agenda, mídia e microanimações premium.</p>
      </div>

      <div className="experience-grid">
        <article className="card feature-card animated-pop">
          <h3>💬 Chatboook</h3>
          <div className="chat-window" aria-live="polite">
            {messages.map((message, index) => (
              <p key={`${message.from}-${index}`} className={`chat-line ${message.from}`}>
                {message.text}
              </p>
            ))}
          </div>
          <div className="chat-input-row">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="⌨️ Digite sua pergunta rápida"
            />
            <button onClick={() => sendMessage(input)}>📨 Enviar</button>
          </div>
        </article>

        <article className="card feature-card animated-pop" style={{ animationDelay: "0.1s" }}>
          <h3>🎙️ Comando de voz</h3>
          <p>{voiceStatus}</p>
          <button onClick={startVoiceCommand}>🎤 Ativar microfone</button>
          <small>Funciona em navegadores compatíveis com SpeechRecognition.</small>
        </article>

        <article className="card feature-card animated-pop" style={{ animationDelay: "0.2s" }}>
          <h3>🗓️ Calendário + data/hora + salvar</h3>
          <label>
            📅 Agendamento
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
            />
          </label>
          <label>
            📝 Nota rápida
            <textarea
              rows={4}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ex: Revisar campanha enterprise na segunda"
            />
          </label>
          <button onClick={savePlanner}>💾 Salvar</button>
          <small>🕒 Agora: {nowLabel}</small>
        </article>

        <article className="card feature-card animated-pop" style={{ animationDelay: "0.3s" }}>
          <h3>💡 Balões explicativos</h3>
          <div className="tips-row">
            {Object.entries(tips).map(([key, value]) => (
              <button
                key={key}
                className="pill"
                onClick={() => {
                  setTip(value);
                  playSound(460);
                }}
              >
                {key}
              </button>
            ))}
          </div>
          <p className="tooltip-balloon">💡 {tip}</p>
        </article>
      </div>

      <div className="media-grid">
        <figure className="card media-card animated-pop" style={{ animationDelay: "0.35s" }}>
          <img
            src="https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80"
            alt="Equipe analisando dashboard em ambiente moderno"
          />
          <figcaption>🖼️ Imagem inspiracional para equipe orientada a dados.</figcaption>
        </figure>

        <article className="card media-card animated-pop" style={{ animationDelay: "0.4s" }}>
          <h3>🎬 Vídeo de inspiração</h3>
          <video controls preload="none" poster="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm">
            <source src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" type="video/mp4" />
          </video>
        </article>
      </div>
    </section>
  );
}
