import { HistoryItem, ModuleType } from "../types";

const HISTORY_KEY = 'birthhub_history';

export const saveHistory = (toolName: string, module: ModuleType, content: string) => {
    if (typeof window === 'undefined') return { id: '', toolName, module, content, timestamp: 0 };

    const item: HistoryItem = {
        id: Date.now().toString(),
        toolName,
        module,
        content,
        timestamp: Date.now()
    };

    const existing = getHistory();
    const updated = [item, ...existing].slice(0, 50); // Keep last 50
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return item;
};

export const getHistory = (): HistoryItem[] => {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
};
