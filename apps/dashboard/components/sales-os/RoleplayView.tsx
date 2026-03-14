"use client";
import React, { useState, useRef, useEffect } from 'react';
import { dashboardLogger } from '../../lib/logger';
import { ArrowLeft, Mic, Send } from 'lucide-react';
import { Tool } from '../../lib/sales-os/types';
import { generateChatReply, generateSpeech, playAudioBuffer } from '../../lib/sales-os/services/gemini';

interface RoleplayViewProps {
    tool: Tool;
    onBack: () => void;
}

export const RoleplayView: React.FC<RoleplayViewProps> = ({ tool, onBack }) => {
    const [messages, setMessages] = useState<{ role: string, text: string }[]>([]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (tool.firstMsg && messages.length === 0) {
            setMessages([{ role: 'model', text: tool.firstMsg }]);
            generateSpeech(tool.firstMsg).then(b => b && playAudioBuffer(b));
        }
    }, [tool.firstMsg, messages.length]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;
        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsThinking(true);

        try {
            const history = messages.slice(-10); // Context window
            const responseText = await generateChatReply(history, userMsg, tool.persona || 'Helpful Assistant');

            setMessages(prev => [...prev, { role: 'model', text: responseText }]);

            const audioBuffer = await generateSpeech(responseText);
            if (audioBuffer) playAudioBuffer(audioBuffer);

        } catch (error) {
            dashboardLogger.error({ error }, "Roleplay action failed");
        } finally {
            setIsThinking(false);
        }
    };

    const handleMic = () => {
         if (typeof window !== 'undefined' && !('webkitSpeechRecognition' in window)) {
            alert("Speech recognition not supported");
            return;
        }
        if (typeof window !== 'undefined') {
            const recognition = new (window as any).webkitSpeechRecognition();
            recognition.lang = 'pt-BR';
            recognition.onresult = (event: any) => {
                setInput(event.results[0][0].transcript);
            };
            recognition.start();
        }
    };

    return (
        <div className="col-span-12 h-[80vh] flex flex-col glass rounded-[2.5rem] overflow-hidden shadow-2xl relative animate-pop-in bg-white/80 dark:bg-slate-900/80">
            {/* Header */}
            <div className={`p-6 bg-gradient-to-r from-${tool.color}-600 to-${tool.color}-800 flex justify-between items-center text-white shrink-0`}>
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className={`w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white hover:text-${tool.color}-600 transition-colors`}>
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <h3 className="font-black text-sm uppercase tracking-wide flex items-center gap-2">
                            {tool.name} <span className="bg-white/20 text-[9px] px-2 py-0.5 rounded-full">SIMULAÇÃO GEMINI</span>
                        </h3>
                        <p className="text-[10px] opacity-80">{tool.desc}</p>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50">
                {messages.map((m, i) => (
                    <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-lg ${m.role === 'user' ? 'bg-slate-400' : `bg-${tool.color}-500`}`}>
                            {m.role === 'user' ? 'EU' : tool.emoji}
                        </div>
                        <div className={`p-4 rounded-2xl shadow-md text-sm leading-relaxed max-w-[80%] ${
                            m.role === 'user'
                                ? 'bg-brand-primary text-white rounded-tr-none'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-none'
                        }`}>
                            {m.text}
                        </div>
                    </div>
                ))}
                {isThinking && (
                    <div className="flex gap-3">
                         <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-lg bg-${tool.color}-500`}>{tool.emoji}</div>
                         <div className="text-sm text-slate-400 p-4">Thinking...</div>
                    </div>
                )}
                <div ref={scrollRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-slate-100 dark:bg-slate-900/80 border-t border-white/5 flex gap-3 items-center shrink-0">
                <button onClick={handleMic} className="w-12 h-12 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 group">
                    <Mic className="w-5 h-5 group-hover:animate-pulse" />
                </button>
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    type="text"
                    placeholder="Speak your objection..."
                    className={`flex-1 bg-white dark:bg-black/20 rounded-full px-6 py-3 text-xs outline-none focus:ring-2 focus:ring-${tool.color}-500/50 transition-all dark:text-white text-slate-900 shadow-inner`}
                />
                <button onClick={handleSend} className={`w-12 h-12 rounded-full bg-${tool.color}-500 hover:bg-${tool.color}-600 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95`}>
                    <Send className="w-5 h-5 ml-0.5" />
                </button>
            </div>
        </div>
    );
};
