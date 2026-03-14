"use client";
import React from 'react';
import { ScanSearch, Flame, Crown, Target, ChevronRight } from 'lucide-react';
import { ModuleType } from '../../lib/sales-os/types';

interface HubViewProps {
    onSelectModule: (module: ModuleType) => void;
}

export const HubView: React.FC<HubViewProps> = ({ onSelectModule }) => {
    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center animate-pop-in">
            <div className="text-center mb-10">
                <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-0.5 dark:text-white text-slate-900">
                    SALES <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">OS</span>
                </h2>
                <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">Select Operational Module</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl px-4">
                {/* LDR */}
                <div onClick={() => onSelectModule('ldr')} className="group relative p-6 rounded-[2rem] glass cursor-pointer overflow-hidden hover:border-emerald-500/50 transition-all hover:-translate-y-2 duration-300 active:scale-95 shadow-lg hover:shadow-emerald-500/20">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                            <Target className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-black uppercase tracking-tighter leading-none mb-1 dark:text-white text-slate-800">LDR <span className="text-emerald-500 text-[10px] ml-1">Elite</span></h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Qualify</p>
                        </div>
                    </div>
                    <div className="w-full h-1 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 w-0 group-hover:w-full transition-all duration-500 ease-out"></div>
                    </div>
                </div>

                {/* BDR */}
                <div onClick={() => onSelectModule('bdr')} className="group relative p-6 rounded-[2rem] glass cursor-pointer overflow-hidden hover:border-indigo-500/50 transition-all hover:-translate-y-2 duration-300 active:scale-95 shadow-lg hover:shadow-indigo-500/20">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                            <ScanSearch className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-black uppercase tracking-tighter leading-none mb-1 dark:text-white text-slate-800">BDR <span className="text-indigo-500 text-[10px] ml-1">Intel</span></h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Research</p>
                        </div>
                    </div>
                    <div className="w-full h-1 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 w-0 group-hover:w-full transition-all duration-500 ease-out"></div>
                    </div>
                </div>

                {/* SDR */}
                <div onClick={() => onSelectModule('sdr')} className="group relative p-6 rounded-[2rem] glass cursor-pointer overflow-hidden hover:border-rose-500/50 transition-all hover:-translate-y-2 duration-300 active:scale-95 shadow-lg hover:shadow-rose-500/20">
                    <div className="absolute inset-0 bg-gradient-to-br from-rose-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                            <Flame className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-black uppercase tracking-tighter leading-none mb-1 dark:text-white text-slate-800">SDR <span className="text-rose-500 text-[10px] ml-1">Hunter</span></h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Outbound</p>
                        </div>
                    </div>
                    <div className="w-full h-1 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500 w-0 group-hover:w-full transition-all duration-500 ease-out"></div>
                    </div>
                </div>

                {/* Closer */}
                <div onClick={() => onSelectModule('closer')} className="group relative p-6 rounded-[2rem] glass cursor-pointer overflow-hidden hover:border-brand-gold/50 transition-all hover:-translate-y-2 duration-300 active:scale-95 shadow-lg hover:shadow-amber-500/20">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-brand-gold/10 text-brand-gold flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                            <Crown className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-black uppercase tracking-tighter leading-none mb-1 dark:text-white text-slate-800">Closer <span className="text-brand-gold text-[10px] ml-1">Elite</span></h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Negotiation</p>
                        </div>
                    </div>
                    <div className="w-full h-1 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-gold w-0 group-hover:w-full transition-all duration-500 ease-out"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};
