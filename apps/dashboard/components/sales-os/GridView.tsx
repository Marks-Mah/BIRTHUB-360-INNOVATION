"use client";
import React from 'react';
import { LayoutGrid } from 'lucide-react';
import { ModuleType, Tool } from '../../lib/sales-os/types';
import { TOOLS } from '../../lib/sales-os/constants';
import { ToolCard } from './ToolCard';

interface GridViewProps {
    module: ModuleType;
    onSelectTool: (tool: Tool) => void;
    onBack: () => void;
}

export const GridView: React.FC<GridViewProps> = ({ module, onSelectTool, onBack }) => {
    const tools = TOOLS.filter(t => t.modules.includes(module));

    return (
        <div className="animate-pop-in">
             <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 px-2">
                <div>
                    <span className="inline-block py-0.5 px-3 rounded-full bg-white/10 text-slate-500 dark:text-white text-[9px] font-black uppercase tracking-widest mb-2 border border-slate-200 dark:border-white/10">
                        {module.toUpperCase()} Module
                    </span>
                    <h2 className="text-2xl font-black tracking-tight dark:text-white text-slate-900 flex items-center gap-2">
                        Arsenal <span className="animate-pulse">⚡</span>
                    </h2>
                </div>
                <button onClick={onBack} className="px-5 py-2 glass rounded-full text-[10px] font-bold text-slate-400 hover:text-brand-primary hover:bg-white/5 flex items-center gap-2 transition-all active:scale-95">
                    <LayoutGrid className="w-3 h-3" /> MENU
                </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {tools.map((t, idx) => (
                    <ToolCard key={t.id} tool={t} onSelect={onSelectTool} idx={idx} />
                ))}
            </div>
        </div>
    );
};
