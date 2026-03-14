import React from 'react';
import { marked } from 'marked';
import { ChatMessage as IChatMessage } from '../../lib/sales-os/types';

interface ChatMessageProps {
    message: IChatMessage;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
    return (
        <div className={`flex gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
             <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-white shadow-sm ${message.role === 'user' ? 'bg-slate-400' : 'bg-brand-primary'}`}>
                 {message.role === 'user' ? 'EU' : 'IA'}
             </div>
             <div className={`p-3 rounded-xl shadow-sm text-[11px] leading-relaxed max-w-[85%] ${
                 message.role === 'user'
                    ? 'bg-brand-primary text-white rounded-tr-none'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-tl-none'
             }`}>
                 {/* Basic markdown parsing for chat */}
                 <div dangerouslySetInnerHTML={{ __html: marked.parse(message.text) }} />
             </div>
        </div>
    );
};
