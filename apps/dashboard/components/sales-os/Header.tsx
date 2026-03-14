"use client";
import React, { useEffect, useState } from 'react';
import { Layers, Moon, Sun, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface HeaderProps {
    onHome: () => void;
    currentModuleText: string;
    isDark: boolean;
    toggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onHome, currentModuleText, isDark, toggleTheme }) => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <header className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[92%] max-w-7xl glass rounded-full px-6 py-2.5 flex items-center justify-between shadow-2xl backdrop-blur-xl transition-all duration-500">
            <div className="flex items-center gap-3">
                <Link href="/" className="w-10 h-10 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center hover:bg-white hover:text-brand-primary transition-all text-slate-500 dark:text-slate-300 shadow-sm mr-2" title="Back to Dashboard">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex items-center gap-3 cursor-pointer group" onClick={onHome}>
                    <div className={`w-10 h-10 bg-gradient-to-br from-brand-primary to-purple-600 rounded-full flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform duration-300`}>
                        <Layers className="w-5 h-5 text-white" />
                    </div>
                <div>
                    <h1 className="font-extrabold text-lg tracking-tight leading-none dark:text-white text-slate-900 group-hover:text-brand-primary transition-colors">
                        BirthHub <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-pink-500">{currentModuleText}</span>
                    </h1>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        <span>MARCELO ONLINE</span>
                    </p>
                </div>
            </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="hidden md:flex flex-col text-right">
                    <p className="text-[10px] font-black text-slate-400 font-mono tracking-widest">
                        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-[8px] font-bold text-slate-500 uppercase">
                        {time.toLocaleDateString()}
                    </p>
                </div>
                <button
                    onClick={toggleTheme}
                    className="w-9 h-9 rounded-full glass hover:bg-white/10 flex items-center justify-center transition-all active:scale-90 group"
                >
                    {isDark ?
                        <Moon className="w-4 h-4 text-indigo-400 group-hover:text-yellow-400 transition-colors" /> :
                        <Sun className="w-4 h-4 text-brand-gold group-hover:text-orange-500 transition-colors" />
                    }
                </button>
            </div>
        </header>
    );
};
