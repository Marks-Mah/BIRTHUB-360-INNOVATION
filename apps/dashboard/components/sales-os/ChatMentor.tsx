"use client";

import React, { useEffect, useRef, useState } from "react";
import { Bot, MessageCircle, Mic, Send, X } from "lucide-react";
import { marked } from "marked";
import { sanitize } from "../../lib/sanitize";
import { getChatHistory, saveChatHistory } from "../../lib/sales-os/services/storage";
import { ChatMessage } from "../../lib/sales-os/types";

interface ChatMentorProps {
  isOpen: boolean;
  onToggle: () => void;
  currentModule: string;
}

const initialMessage = (moduleName: string): ChatMessage => ({
  role: "model",
  text: `Olá! Sou seu mentor ${moduleName.toUpperCase()}. Como posso ajudar a fechar negócios hoje?`,
});

export const ChatMentor: React.FC<ChatMentorProps> = ({ isOpen, onToggle, currentModule }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage(currentModule)]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = getChatHistory().map((item) => ({ role: item.role, text: item.text }));
    if (stored.length > 0) {
      setMessages(stored);
    }
  }, []);

  useEffect(() => {
    saveChatHistory(messages.map((item, index) => ({ ...item, timestamp: Date.now() + index })));
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = { role: "user", text: input };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setIsThinking(true);

    try {
      const response = await fetch("/api/sales-os/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.text, moduleName: currentModule, history: nextMessages.slice(-10) }),
      });

      if (!response.body) throw new Error("stream indisponível");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      let pending = "";

      setMessages((prev) => [...prev, { role: "model", text: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        pending += decoder.decode(value, { stream: true });
        const frames = pending.split("\n\n");
        pending = frames.pop() || "";

        for (const frame of frames) {
          const line = frame.trim();
          if (!line.startsWith("data:")) continue;
          const token = line.slice(5).trim();
          if (!token || token === "[DONE]") continue;
          assistantText += `${token} `;
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: "model", text: assistantText.trim() };
            return copy;
          });
        }
      }
    } catch {
      setMessages((prev) => [...prev, { role: "model", text: "Não consegui conectar ao mentor agora." }]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleMic = () => {
    if (typeof window !== "undefined" && !("webkitSpeechRecognition" in window)) {
      alert("Speech recognition not supported in this browser.");
    }
  };

  if (!isOpen)
    return (
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-[150]">
        <button onClick={onToggle} className="w-12 h-12 bg-gradient-to-tr from-brand-primary to-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30 hover:scale-110 hover:-translate-y-1 transition-all border-2 border-white/10 group">
          <MessageCircle className="w-5 h-5 text-white" />
          <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900"></span>
        </button>
      </div>
    );

  return (
    <div className="fixed bottom-24 right-6 w-80 h-[450px] glass rounded-[2rem] shadow-2xl z-[200] flex flex-col overflow-hidden border-2 border-white/5 transition-transform duration-300 origin-bottom-right animate-pop-in bg-white/80 dark:bg-slate-900/80">
      <div className="p-4 bg-gradient-to-r from-brand-primary to-indigo-600 text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white/20 rounded-lg"><Bot className="w-4 h-4" /></div>
          <div>
            <h3 className="font-black text-xs uppercase tracking-wide">Mentor {currentModule}</h3>
            <p className="text-[9px] opacity-80 font-medium">Streaming SSE</p>
          </div>
        </div>
        <button onClick={onToggle} className="p-1.5 hover:bg-white/20 rounded-full transition-colors"><X className="w-4 h-4" /></button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-white shadow-sm ${m.role === "user" ? "bg-slate-400" : "bg-brand-primary"}`}>
              {m.role === "user" ? "EU" : "IA"}
            </div>
            <div className={`p-3 rounded-xl shadow-sm text-[11px] leading-relaxed max-w-[85%] ${m.role === "user" ? "bg-brand-primary text-white rounded-tr-none" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-tl-none"}`}>
              {/* Sanitiza markdown renderizado de mensagens do usuário/modelo para evitar XSS antes do innerHTML. */}
              <div dangerouslySetInnerHTML={{ __html: sanitize(marked.parse(m.text) as string) }} />
            </div>
          </div>
        ))}
        {isThinking && <div className="text-[10px] text-slate-400 text-center animate-pulse">Thinking...</div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-t border-slate-200 dark:border-white/5 flex gap-2 shrink-0">
        <button onClick={handleMic} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-rose-500"><Mic className="w-4 h-4" /></button>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} type="text" placeholder="Ask strategy..." className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2 text-[11px] font-medium outline-none focus:ring-2 focus:ring-brand-primary/50 transition-all dark:text-white text-slate-900 border border-transparent" />
        <button onClick={handleSend} className="w-8 h-8 bg-brand-primary rounded-full text-white shadow-lg hover:bg-indigo-500 active:scale-90 transition-all flex items-center justify-center"><Send className="w-3 h-3 ml-0.5" /></button>
      </div>
    </div>
  );
};
