export type SupportedLanguage =
  | "pt-BR"
  | "en"
  | "es"
  | "zh-CN"
  | "hi"
  | "ar"
  | "fr"
  | "ru"
  | "bn";

export const SUPPORTED_LANGUAGES: Array<{ code: SupportedLanguage; label: string }> = [
  { code: "pt-BR", label: "Português (Brasil)" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "zh-CN", label: "中文（简体）" },
  { code: "hi", label: "हिन्दी" },
  { code: "ar", label: "العربية" },
  { code: "fr", label: "Français" },
  { code: "ru", label: "Русский" },
  { code: "bn", label: "বাংলা" },
];

const dictionary: Record<SupportedLanguage, Record<string, string>> = {
  "pt-BR": {
    overview: "Visão Geral",
    salesPipeline: "Pipeline de Vendas",
    healthScore: "Health Score",
    financialView: "Visão Financeira",
    analytics: "Analytics",
    contracts: "Contratos",
    agentActivities: "Atividades dos Agentes",
    salesOs: "Sales OS",
    migrations: "Revisão de Migrações",
    logout: "Encerrar sessão",
    settings: "Configurações",
    language: "Idioma",
    theme: "Tema",
    palette: "Paleta",
    avatar: "Avatar",
  },
  en: {
    overview: "Overview", salesPipeline: "Sales Pipeline", healthScore: "Health Score", financialView: "Financial View", analytics: "Analytics", contracts: "Contracts", agentActivities: "Agent Activities", salesOs: "Sales OS", migrations: "Migrations Review", logout: "Sign out", settings: "Settings", language: "Language", theme: "Theme", palette: "Palette", avatar: "Avatar",
  },
  es: {
    overview: "Resumen", salesPipeline: "Pipeline de Ventas", healthScore: "Health Score", financialView: "Vista Financiera", analytics: "Analítica", contracts: "Contratos", agentActivities: "Actividades de Agentes", salesOs: "Sales OS", migrations: "Revisión de Migraciones", logout: "Cerrar sesión", settings: "Configuración", language: "Idioma", theme: "Tema", palette: "Paleta", avatar: "Avatar",
  },
  "zh-CN": { overview: "总览", salesPipeline: "销售管道", healthScore: "健康评分", financialView: "财务视图", analytics: "分析", contracts: "合同", agentActivities: "智能体活动", salesOs: "销售系统", logout: "退出", settings: "设置", language: "语言", theme: "主题", palette: "配色", avatar: "头像" },
  hi: { overview: "ओवरव्यू", salesPipeline: "सेल्स पाइपलाइन", healthScore: "हेल्थ स्कोर", financialView: "वित्तीय दृश्य", analytics: "एनालिटिक्स", contracts: "कॉन्ट्रैक्ट्स", agentActivities: "एजेंट गतिविधियाँ", salesOs: "सेल्स OS", logout: "लॉगआउट", settings: "सेटिंग्स", language: "भाषा", theme: "थीम", palette: "पैलेट", avatar: "अवतार" },
  ar: { overview: "نظرة عامة", salesPipeline: "قمع المبيعات", healthScore: "مؤشر الصحة", financialView: "الرؤية المالية", analytics: "التحليلات", contracts: "العقود", agentActivities: "أنشطة الوكلاء", salesOs: "نظام المبيعات", logout: "تسجيل الخروج", settings: "الإعدادات", language: "اللغة", theme: "السمة", palette: "لوحة الألوان", avatar: "الصورة" },
  fr: { overview: "Vue d’ensemble", salesPipeline: "Pipeline Commercial", healthScore: "Score de Santé", financialView: "Vue Financière", analytics: "Analytique", contracts: "Contrats", agentActivities: "Activités des Agents", salesOs: "Sales OS", logout: "Déconnexion", settings: "Paramètres", language: "Langue", theme: "Thème", palette: "Palette", avatar: "Avatar" },
  ru: { overview: "Обзор", salesPipeline: "Воронка продаж", healthScore: "Индекс здоровья", financialView: "Финансы", analytics: "Аналитика", contracts: "Контракты", agentActivities: "Активности агентов", salesOs: "Sales OS", logout: "Выйти", settings: "Настройки", language: "Язык", theme: "Тема", palette: "Палитра", avatar: "Аватар" },
  bn: { overview: "সংক্ষিপ্তসার", salesPipeline: "সেলস পাইপলাইন", healthScore: "হেলথ স্কোর", financialView: "আর্থিক ভিউ", analytics: "অ্যানালিটিক্স", contracts: "চুক্তি", agentActivities: "এজেন্ট কার্যকলাপ", salesOs: "Sales OS", logout: "লগ আউট", settings: "সেটিংস", language: "ভাষা", theme: "থিম", palette: "প্যালেট", avatar: "অ্যাভাটার" },
};

export function t(lang: SupportedLanguage, key: string): string {
  return dictionary[lang]?.[key] ?? dictionary["pt-BR"][key] ?? key;
}

const RTL_LANGUAGES = new Set<SupportedLanguage>(["ar"]);

export function isRtlLanguage(lang: SupportedLanguage): boolean {
  return RTL_LANGUAGES.has(lang);
}
