export type ModuleType = 'hub' | 'ldr' | 'bdr' | 'sdr' | 'closer';

export interface ToolField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  placeholder?: string;
  options?: string[];
}

export interface Tool {
  id: string;
  modules: ModuleType[];
  name: string;
  icon: string;
  color: string;
  emoji: string;
  desc: string;
  prompt: string;
  acceptsImage?: boolean;
  isImage?: boolean;
  isChat?: boolean;
  useSearch?: boolean;
  persona?: string;
  firstMsg?: string;
  fields?: ToolField[];
}

export interface HistoryItem {
  id: string;
  toolName: string;
  module: ModuleType;
  content: string;
  timestamp: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
