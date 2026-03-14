import { Tool } from './types';

export const TOOLS: Tool[] = [
  // --- LDR Tools ---
  {
      id: 'ldr_qualify', modules: ['ldr'], name: 'Lead Qualifier', icon: 'check-square', color: 'emerald', emoji: '✅', desc: 'Filtro de ICP',
      prompt: 'Você é um Lead Development Representative. Analise os dados do prospect e verifique se ele se encaixa no Ideal Customer Profile (ICP).',
      fields: [
          { id: 'company_data', label: 'Dados da Empresa', type: 'textarea', placeholder: 'Setor, Tamanho, Faturamento...' },
          { id: 'icp_criteria', label: 'Critérios ICP', type: 'text', placeholder: 'Ex: Startups Series A+, BR/US' }
      ]
  },
  {
      id: 'ldr_list', modules: ['ldr'], name: 'List Builder', icon: 'list-plus', color: 'emerald', emoji: '📋', desc: 'Mapeamento de Contas',
      prompt: 'Crie uma lista de contas alvo (Target Accounts) baseada em um setor e região específicos.',
      fields: [
          { id: 'sector', label: 'Setor Alvo', type: 'text', placeholder: 'Ex: SaaS de Logística' },
          { id: 'region', label: 'Região', type: 'text', placeholder: 'Ex: América Latina' },
          { id: 'employees', label: 'Tamanho (Colaboradores)', type: 'select', options: ['1-10', '11-50', '51-200', '201-1000', '1000+'] },
          { id: 'funding', label: 'Funding Stage', type: 'select', options: ['Bootstrapped', 'Seed', 'Series A', 'Series B+', 'IPO'] }
      ]
  },

  // --- BDR Tools ---
  {
      id: 'bdr_vision', modules: ['bdr', 'sdr'], name: 'Vision Intel', icon: 'eye', color: 'cyan', emoji: '👁️', desc: 'Análise de Prints',
      prompt: 'Você é um BDR Sênior. Analise esta imagem com visão computacional. Identifique oportunidades de venda. Identifique tecnologias, erros, oportunidades de melhoria e dados de contato se visíveis.', acceptsImage: true,
      fields: [
          { id: 'focus', label: 'Foco da Análise', type: 'select', options: ['Tecnologias Utilizadas', 'Estrutura do Time', 'Dores/Gaps Visíveis', 'Notícias/Expansão'] },
          { id: 'ctx', label: 'Contexto Extra', type: 'text', placeholder: 'Ex: Vendemos software de RH' }
      ]
  },
  {
      id: 'bdr_content', modules: ['bdr'], name: 'Ghostwriter', icon: 'pen-tool', color: 'pink', emoji: '👻', desc: 'LinkedIn Viral',
      prompt: 'Você é um Copywriter Top Voice do LinkedIn especializado em B2B. Crie um post viral e educativo.',
      fields: [
          { id: 'topic', label: 'Tema do Post', type: 'text', placeholder: 'Ex: Erros na contratação de Tech' },
          { id: 'audience', label: 'Público Alvo', type: 'text', placeholder: 'Ex: CTOs de Startups' },
          { id: 'style', label: 'Estilo', type: 'select', options: ['Polêmico/Contrarian', 'Storytelling Emocional', 'Lista Prática (How-to)', 'Análise de Dados'] }
      ]
  },
  {
      id: 'bdr_script', modules: ['bdr'], name: 'Script BDR', icon: 'zap', color: 'indigo', emoji: '📝', desc: 'AIDA & Persuasão',
      prompt: 'Você é um especialista em Cold Calling e Scripts. Crie um roteiro de abordagem fria altamente persuasivo.',
      fields: [
          { id: 'prospect', label: 'Cargo do Lead', type: 'text', placeholder: 'Ex: Diretor de Marketing' },
          { id: 'company', label: 'Nome da Empresa', type: 'text', placeholder: 'Ex: Fintech X' },
          { id: 'value_prop', label: 'Proposta de Valor', type: 'textarea', placeholder: 'Ex: Reduzimos o CAC em 30%...' },
          { id: 'framework', label: 'Framework', type: 'select', options: ['AIDA (Atenção, Interesse...)', 'PAS (Problema, Agitação...)', 'Depoimento/Prova Social'] }
      ]
  },
  {
      id: 'bdr_summary', modules: ['bdr', 'sdr'], name: 'Resumo Web', icon: 'globe', color: 'blue', emoji: '🌐', desc: 'News & Dores Atuais',
      prompt: 'Realize uma pesquisa profunda na web sobre a empresa alvo. Resuma as últimas notícias, desafios financeiros e oportunidades de venda.', useSearch: true,
      fields: [
          { id: 'company', label: 'Empresa Alvo', type: 'text', placeholder: 'Ex: Coca-Cola Brasil' },
          { id: 'focus', label: 'O que buscar?', type: 'select', options: ['Notícias Recentes', 'Saúde Financeira/Layoffs', 'Lançamentos de Produtos', 'Fusões e Aquisições'] }
      ]
  },

  // --- SDR Tools ---
  {
      id: 'roleplay_gk', modules: ['sdr'], name: 'Roleplay: Secretária', icon: 'shield', color: 'orange', emoji: '🛡️', desc: 'Simulador em Chat', isChat: true,
      prompt: 'Simule uma conversa com uma secretária executiva.',
      persona: 'Uma secretária executiva protetora e experiente. Sua missão é bloquear vendedores. Use desculpas como "está em reunião", "mande por email". Seja difícil.',
      firstMsg: 'Bom dia, escritório da Diretoria. Quem deseja falar?'
  },
  {
      id: 'sdr_cadence', modules: ['sdr'], name: 'Cadência Total', icon: 'layers', color: 'rose', emoji: '📅', desc: 'Fluxo de Prospecção',
      prompt: 'Crie uma cadência de prospecção outbound multicanal (Email, LinkedIn, Fone).',
      fields: [
          { id: 'persona', label: 'Persona Alvo', type: 'text', placeholder: 'Ex: Gerente de Logística' },
          { id: 'sector', label: 'Setor', type: 'text', placeholder: 'Ex: Varejo' },
          { id: 'duration', label: 'Duração', type: 'select', options: ['15 Dias (Agressiva)', '30 Dias (Consultiva)'] }
      ]
  },
  {
      id: 'sdr_coldcall', modules: ['sdr'], name: 'Cold Call Sim', icon: 'phone-incoming', color: 'orange', emoji: '📞', desc: 'Simulador de Objeções',
      prompt: 'Atue como um prospect que recebeu uma ligação fria. Critique o pitch e ofereça uma objeção difícil.',
      fields: [
          { id: 'pitch', label: 'Seu Pitch Inicial', type: 'textarea', placeholder: 'Cole aqui como você começa a ligação...' },
          { id: 'difficulty', label: 'Nível de Dificuldade', type: 'select', options: ['Fácil (Curioso)', 'Médio (Cético)', 'Difícil (Ocupado/Rude)'] },
          { id: 'rebuttal', label: 'Estratégia de Rebuttal', type: 'select', options: ['Empatia + Ponte', 'Desafio Provocativo', 'Pergunta Aberta', 'Silêncio Estratégico'] }
      ]
  },

  // --- Closer Tools ---
  {
      id: 'closer_warroom', modules: ['closer'], name: 'Deal War Room', icon: 'users', color: 'indigo', emoji: '🏛️', desc: 'Simulação Multi-Agente',
      prompt: 'Simule um diálogo privado (formato script) entre os C-Levels da empresa sobre a compra. Revele as objeções ocultas que eles não dizem ao vendedor.',
      fields: [
          { id: 'company', label: 'Empresa', type: 'text', placeholder: 'Ex: Enterprise Co.' },
          { id: 'deal_value', label: 'Valor do Contrato', type: 'text', placeholder: 'Ex: R$ 500k/ano' },
          { id: 'stakeholders', label: 'Envolvidos', type: 'text', placeholder: 'Ex: CEO, CFO, CTO' }
      ]
  },
  {
      id: 'roleplay_cfo', modules: ['closer'], name: 'Roleplay: CFO Cético', icon: 'user-x', color: 'red', emoji: '😤', desc: 'Negociação Tensa', isChat: true,
      prompt: 'Simule uma negociação tensa com um CFO cético.',
      persona: 'Um CFO analítico, focado exclusivamente em EBITDA e redução de custos. Você odeia risco. Questione cada centavo.',
      firstMsg: 'Tenho exatos 5 minutos. Me dê um motivo financeiro para não vetar esse projeto agora.'
  },
  {
      id: 'close_email', modules: ['closer'], name: 'Email Closer', icon: 'mail-check', color: 'sky', emoji: '📧', desc: 'Respostas Finais',
      prompt: 'Escreva um e-mail de fechamento decisivo.',
      fields: [
          { id: 'situation', label: 'Situação Atual', type: 'textarea', placeholder: 'Ex: Cliente pediu desconto e parou de responder...' },
          { id: 'strategy', label: 'Estratégia', type: 'select', options: ['Desapego (Break-up)', 'Urgência (Gatilho Temporal)', 'Concessão Estratégica', 'Recap de Valor'] }
      ]
  },

  // --- Visual & Creative (All Modules) ---
  {
      id: 'gen_persona', modules: ['ldr', 'bdr', 'sdr', 'closer'], name: 'Visual Persona', icon: 'image', color: 'cyan', emoji: '👤', desc: 'Retrato ICP',
      prompt: 'Gere um retrato fotorealista profissional de estúdio de uma persona de negócios.', acceptsImage: false, isImage: true,
      fields: [
          { id: 'job', label: 'Cargo', type: 'text', placeholder: 'Ex: CEO de Startup' },
          { id: 'age', label: 'Idade Aprox.', type: 'text', placeholder: 'Ex: 45 anos' },
          { id: 'vibe', label: 'Ambiente/Vibe', type: 'text', placeholder: 'Ex: Escritório moderno, confiante' }
      ]
  }
];
