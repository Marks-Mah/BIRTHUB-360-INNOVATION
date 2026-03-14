import React from 'react';
import * as LucideIcons from 'lucide-react';
import { Tool } from '../../lib/sales-os/types';

interface ToolCardProps {
    tool: Tool;
    onSelect: (tool: Tool) => void;
    idx: number;
}

export const ToolCard: React.FC<ToolCardProps> = ({ tool, onSelect, idx }) => {
    const colorClass = `text-${tool.color}-500`;
    const bgClass = `bg-${tool.color}-500/10`;

    // Dynamic Icon Rendering
    const renderIcon = (iconName: string, color: string) => {
        // Normalize icon name: kebab-case to PascalCase (e.g., 'check-square' -> 'CheckSquare')
        const pascalCaseName = iconName.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
        const IconComponent = (LucideIcons as any)[pascalCaseName];

        if (!IconComponent) {
             // Fallback icons if dynamic lookup fails or icon doesn't exist in Lucide set used
             if (iconName === 'pen-tool') return <LucideIcons.PenTool className="w-5 h-5" />;
             if (iconName === 'shield') return <LucideIcons.Shield className="w-5 h-5" />;
             if (iconName === 'globe') return <LucideIcons.Globe className="w-5 h-5" />;
             return <LucideIcons.Box className={`w-5 h-5 text-${color}-500`} />;
        }
        return <IconComponent className={`w-5 h-5`} style={{ color: `var(--color-${color}-500)` }} />;
    };

    return (
        <div
            onClick={() => onSelect(tool)}
            className={`relative p-4 rounded-3xl glass cursor-pointer group overflow-hidden hover:bg-white/30 dark:hover:bg-white/5 transition-all border border-transparent hover:border-${tool.color}-500/30 shadow-sm hover:shadow-lg hover:-translate-y-1`}
            style={{ animationDelay: `${idx * 0.05}s` }}
        >
            <div className="flex items-start gap-3 relative z-10">
                <div className={`w-10 h-10 rounded-xl ${bgClass} flex items-center justify-center group-hover:bg-${tool.color}-500 group-hover:text-white transition-all duration-300 flex-shrink-0`}>
                    <div className={`${colorClass} group-hover:text-white`}>
                        {renderIcon(tool.icon, tool.color)}
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                        <h3 className={`text-xs font-black text-slate-800 dark:text-white leading-none group-hover:text-${tool.color}-500 transition-colors uppercase tracking-tight`}>
                            {tool.name}
                        </h3>
                        <span className="text-[10px] filter grayscale group-hover:grayscale-0 transition-all opacity-70 group-hover:opacity-100 transform scale-75 group-hover:scale-100">{tool.emoji}</span>
                    </div>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed opacity-80 line-clamp-2">
                        {tool.desc}
                    </p>
                </div>
            </div>
        </div>
    );
};
