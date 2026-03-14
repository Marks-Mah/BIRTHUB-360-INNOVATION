"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    LayoutDashboard,
    Settings,
    Users,
    BrainCircuit,
    ArrowRight,
    BarChart3,
    Clock3,
    Sparkles,
    ChevronRight,
    Target,
    Rocket,
    PanelLeft,
    X,
} from 'lucide-react';
import { ModuleType, Tool } from '../../lib/sales-os/types';
import { Header } from '../../components/sales-os/Header';
import { HubView } from '../../components/sales-os/HubView';
import { GridView } from '../../components/sales-os/GridView';
import { ToolView } from '../../components/sales-os/ToolView';
import { RoleplayView } from '../../components/sales-os/RoleplayView';
import { ChatMentor } from '../../components/sales-os/ChatMentor';

type PortalView = 'portal' | 'prospecting' | 'settings';
type ContentView = 'hub' | 'grid' | 'tool';

type PortalCard = {
    title: string;
    description: string;
    cta: string;
    disabled?: boolean;
};

type KPI = {
    title: string;
    value: string;
    description: string;
    tone: 'indigo' | 'amber' | 'emerald';
};

const PORTAL_STORAGE_KEY = 'sales-portal-view';
const THEME_STORAGE_KEY = 'sales-portal-theme';

const MODULE_LABELS: Record<ModuleType, string> = {
    hub: '360º OS',
    ldr: 'LDR Elite',
    bdr: 'BDR Intel',
    sdr: 'SDR Hunter',
    closer: 'Closer Elite',
};

const KPI_LIST: KPI[] = [
    { title: 'Meta do mês', value: '67%', description: 'Taxa de execução do plano comercial', tone: 'indigo' },
    { title: 'Próxima janela', value: '09:30', description: 'Bloco sugerido para outbound', tone: 'amber' },
    { title: 'Foco de hoje', value: 'Follow-ups', description: 'Priorize oportunidades mornas', tone: 'emerald' },
];

const PORTAL_CARDS: PortalCard[] = [
    {
        title: 'Módulo de Prospecção',
        description: 'Gere, gerencie e qualifique seus leads com o poder da IA.',
        cta: 'Abrir Prospecção',
    },
    {
        title: 'Dashboard de Análise',
        description: 'Visualize métricas de vendas e o desempenho da equipe em tempo real.',
        cta: 'Em breve',
        disabled: true,
    },
    {
        title: 'Gestão de Equipe',
        description: 'Atribua leads e monitore a atividade da sua equipe com governança.',
        cta: 'Em breve',
        disabled: true,
    },
];

const SalesPage: React.FC = () => {
    const [portalView, setPortalView] = useState<PortalView>('portal');
    const [view, setView] = useState<ContentView>('hub');
    const [currentModule, setCurrentModule] = useState<ModuleType>('hub');
    const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
    const [isDark, setIsDark] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        const storedView = window.localStorage.getItem(PORTAL_STORAGE_KEY) as PortalView | null;
        const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
        if (storedView === 'portal' || storedView === 'prospecting' || storedView === 'settings') {
            setPortalView(storedView);
        }
        if (storedTheme === 'dark') {
            setIsDark(true);
            document.documentElement.classList.add('dark');
            document.body.classList.remove('light');
            document.body.classList.add('dark');
        }
    }, []);

    useEffect(() => {
        window.localStorage.setItem(PORTAL_STORAGE_KEY, portalView);
    }, [portalView]);

    useEffect(() => {
        window.localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
    }, [isDark]);

    useEffect(() => {
        const url = new URL(window.location.href);
        url.searchParams.set('view', portalView);
        window.history.replaceState({}, '', url.toString());
    }, [portalView]);

    const toggleTheme = () => {
        setIsDark((prev) => {
            const next = !prev;
            if (next) {
                document.documentElement.classList.add('dark');
                document.body.classList.remove('light');
                document.body.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
                document.body.classList.remove('dark');
                document.body.classList.add('light');
            }
            return next;
        });
    };

    const resetProspectingState = useCallback(() => {
        setView('hub');
        setCurrentModule('hub');
        setSelectedTool(null);
        setChatOpen(false);
    }, []);

    const handleSelectModule = (module: ModuleType) => {
        setCurrentModule(module);
        setView('grid');
    };

    const handleSelectTool = (tool: Tool) => {
        setSelectedTool(tool);
        setView('tool');
    };

    const goHome = () => {
        setView('hub');
        setCurrentModule('hub');
        setSelectedTool(null);
    };

    const goBackToGrid = () => {
        setView('grid');
        setSelectedTool(null);
    };

    const moduleText = useMemo(() => MODULE_LABELS[currentModule], [currentModule]);

    const openPortalView = (nextView: PortalView) => {
        if (nextView === 'portal') {
            resetProspectingState();
        }
        setPortalView(nextView);
        setIsSidebarOpen(false);
    };

    const handleOpenProspecting = () => {
        resetProspectingState();
        setPortalView('prospecting');
    };

    const navItems: NavItemProps[] = [
        { icon: <LayoutDashboard size={18} />, label: 'Portal', active: portalView === 'portal', onClick: () => openPortalView('portal') },
        { icon: <Users size={18} />, label: 'Prospecção', active: portalView === 'prospecting', onClick: () => openPortalView('prospecting') },
        { icon: <Settings size={18} />, label: 'Configurações', active: portalView === 'settings', onClick: () => openPortalView('settings'), disabled: true },
    ];

    return (
        <div className="flex min-h-screen bg-slate-100 text-slate-800">
            <a href="#sales-main-content" className="sr-only focus:not-sr-only focus:p-2 focus:bg-white focus:text-indigo-700">Ir para o conteúdo principal</a>

            <button
                onClick={() => setIsSidebarOpen((prev) => !prev)}
                className="fixed left-4 top-4 z-40 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow md:hidden"
            >
                {isSidebarOpen ? <X size={16} /> : <PanelLeft size={16} />} Menu
            </button>

            <aside
                className={`fixed inset-y-0 left-0 z-30 w-64 border-r border-slate-200 bg-white p-4 transition-transform md:static md:translate-x-0 ${
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
                aria-label="Navegação do Sales Portal"
            >
                <div className="mb-8 flex items-center gap-3">
                    <BrainCircuit size={30} className="text-indigo-600" />
                    <div>
                        <h1 className="text-xl font-bold">Sales Portal</h1>
                        <p className="text-xs text-slate-500">Workspace comercial</p>
                    </div>
                </div>
                <nav className="flex flex-col gap-2">
                    {navItems.map((item) => (
                        <NavItem key={item.label} {...item} />
                    ))}
                </nav>
                <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    <p className="font-semibold text-slate-700">Dica rápida</p>
                    <p className="mt-1">Use “Portal” para planejar e “Prospecção” para executar.</p>
                </div>
            </aside>

            {isSidebarOpen && <div className="fixed inset-0 z-20 bg-black/30 md:hidden" onClick={() => setIsSidebarOpen(false)} aria-hidden="true" />}

            <div className={`flex-1 pb-10 md:ml-0 ${isDark ? 'dark' : 'light'}`} id="sales-main-content">
                <div className="border-b border-slate-200 bg-white px-4 py-3 md:hidden">
                    <p className="text-xs text-slate-500">Visão atual</p>
                    <p className="font-semibold text-slate-800">{portalView === 'portal' ? 'Portal' : portalView === 'prospecting' ? 'Prospecção' : 'Configurações'}</p>
                </div>

                {portalView === 'portal' && <PortalDashboard onOpenProspecting={handleOpenProspecting} />}

                {portalView === 'prospecting' && (
                    <>
                        <Header
                            onHome={goHome}
                            currentModuleText={moduleText}
                            isDark={isDark}
                            toggleTheme={toggleTheme}
                        />

                        <div className="mx-auto mt-20 w-full max-w-7xl px-4 pt-4 text-xs text-slate-500 md:mt-24">
                            Portal <ChevronRight size={12} className="mx-1 inline" /> Prospecção <ChevronRight size={12} className="mx-1 inline" /> {view === 'tool' ? 'Ferramenta' : view === 'grid' ? 'Grade' : 'Hub'}
                        </div>

                        <main className="mx-auto w-full max-w-7xl p-4">
                            {view === 'hub' && <HubView onSelectModule={handleSelectModule} />}

                            {view === 'grid' && currentModule !== 'hub' && (
                                <GridView
                                    module={currentModule}
                                    onSelectTool={handleSelectTool}
                                    onBack={goHome}
                                />
                            )}

                            {view === 'tool' && selectedTool && (
                                <>
                                    {selectedTool.isChat ? (
                                        <RoleplayView tool={selectedTool} onBack={goBackToGrid} />
                                    ) : (
                                        <ToolView
                                            tool={selectedTool}
                                            moduleName={currentModule}
                                            onBack={goBackToGrid}
                                        />
                                    )}
                                </>
                            )}
                        </main>

                        <ChatMentor
                            isOpen={chatOpen}
                            onToggle={() => setChatOpen(!chatOpen)}
                            currentModule={currentModule === 'hub' ? 'sales' : currentModule}
                        />
                    </>
                )}

                {portalView === 'settings' && (
                    <div className="space-y-4 p-8">
                        <h2 className="text-2xl font-bold">Configurações</h2>
                        <p className="text-slate-600">Em breve.</p>
                        <div className="max-w-xl rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
                            Aqui você poderá configurar preferências, integrações e permissões da operação comercial.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

type NavItemProps = {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    disabled?: boolean;
    onClick: () => void;
};

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, disabled, onClick }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        aria-current={active ? 'page' : undefined}
        className={`flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            active ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
        } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
        {icon}
        <span>{label}</span>
    </button>
);

type PortalDashboardProps = {
    onOpenProspecting: () => void;
};

const KPIIcon: Record<KPI['tone'], React.ReactNode> = {
    indigo: <BarChart3 size={16} />,
    amber: <Clock3 size={16} />,
    emerald: <Sparkles size={16} />,
};

const KPIColor: Record<KPI['tone'], string> = {
    indigo: 'text-indigo-600',
    amber: 'text-amber-600',
    emerald: 'text-emerald-600',
};

const PortalDashboard: React.FC<PortalDashboardProps> = ({ onOpenProspecting }) => (
    <div className="space-y-8 p-8">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-3xl font-bold text-slate-800">Bem-vindo ao seu Portal de Vendas</h2>
            <p className="mb-6 max-w-2xl text-slate-600">Acompanhe o funil, priorize as próximas ações e abra módulos estratégicos sem sair do seu workspace.</p>
            <div className="flex flex-wrap items-center gap-3">
                <button
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                    onClick={onOpenProspecting}
                >
                    Iniciar prospecção agora <ArrowRight size={16} />
                </button>
                <button className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    <Target size={16} /> Planejar sprint comercial
                </button>
                <button className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    <Rocket size={16} /> Revisar pipeline da semana
                </button>
            </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {KPI_LIST.map((kpi) => (
                <div key={kpi.title} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className={`mb-2 flex items-center gap-2 ${KPIColor[kpi.tone]}`}>{KPIIcon[kpi.tone]} {kpi.title}</div>
                    <p className="text-2xl font-bold">{kpi.value}</p>
                    <p className="text-xs text-slate-500">{kpi.description}</p>
                </div>
            ))}
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {PORTAL_CARDS.map((card) => (
                <article
                    key={card.title}
                    className={`rounded-lg border border-slate-200 bg-white p-6 shadow-sm ${card.disabled ? 'opacity-60' : ''}`}
                >
                    <h3 className="text-lg font-bold text-slate-800">{card.title}</h3>
                    <p className="mt-2 text-sm text-slate-600">{card.description}</p>
                    <button
                        onClick={card.disabled ? undefined : onOpenProspecting}
                        disabled={card.disabled}
                        className="mt-4 inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed"
                    >
                        {card.cta}
                    </button>
                </article>
            ))}
        </section>
    </div>
);

export default SalesPage;
