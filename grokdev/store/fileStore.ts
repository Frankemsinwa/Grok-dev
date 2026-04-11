import { create } from 'zustand';

export interface FileData {
  path: string;
  content: string;
  sha?: string;
  language: string;
}

interface FileState {
  currentFile: FileData | null;
  setCurrentFile: (file: FileData | null) => void;
}

// Language detection from file extension
export function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    rb: 'ruby',
    java: 'java',
    kt: 'kotlin',
    kts: 'kotlin',
    swift: 'swift',
    go: 'go',
    rs: 'rust',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    cs: 'csharp',
    php: 'php',
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    json: 'json',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    md: 'markdown',
    mdx: 'markdown',
    sql: 'sql',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    fish: 'bash',
    ps1: 'powershell',
    dockerfile: 'dockerfile',
    graphql: 'graphql',
    gql: 'graphql',
    vue: 'html',
    svelte: 'html',
    dart: 'dart',
    lua: 'lua',
    r: 'r',
    scala: 'scala',
    ex: 'elixir',
    exs: 'elixir',
    erl: 'erlang',
    hrl: 'erlang',
    hs: 'haskell',
    clj: 'clojure',
    cljs: 'clojure',
    ml: 'ocaml',
    mli: 'ocaml',
    prisma: 'graphql',
    tf: 'hcl',
    env: 'bash',
    gitignore: 'bash',
    editorconfig: 'ini',
    ini: 'ini',
    cfg: 'ini',
    conf: 'ini',
    lock: 'json',
    log: 'text',
    txt: 'text',
    csv: 'text',
  };

  // Handle special filenames
  const fileName = filePath.split('/').pop()?.toLowerCase() || '';
  if (fileName === 'dockerfile') return 'dockerfile';
  if (fileName === 'makefile') return 'makefile';
  if (fileName === '.env' || fileName.startsWith('.env.')) return 'bash';
  if (fileName === '.gitignore' || fileName === '.dockerignore') return 'bash';

  return map[ext] || 'text';
}

// Get a human-friendly language label
export function getLanguageLabel(lang: string): string {
  const labels: Record<string, string> = {
    typescript: 'TypeScript',
    javascript: 'JavaScript',
    python: 'Python',
    ruby: 'Ruby',
    java: 'Java',
    kotlin: 'Kotlin',
    swift: 'Swift',
    go: 'Go',
    rust: 'Rust',
    c: 'C',
    cpp: 'C++',
    csharp: 'C#',
    php: 'PHP',
    html: 'HTML',
    css: 'CSS',
    scss: 'SCSS',
    sass: 'Sass',
    less: 'Less',
    json: 'JSON',
    xml: 'XML',
    yaml: 'YAML',
    toml: 'TOML',
    markdown: 'Markdown',
    sql: 'SQL',
    bash: 'Shell',
    powershell: 'PowerShell',
    dockerfile: 'Dockerfile',
    graphql: 'GraphQL',
    dart: 'Dart',
    lua: 'Lua',
    r: 'R',
    scala: 'Scala',
    elixir: 'Elixir',
    erlang: 'Erlang',
    haskell: 'Haskell',
    clojure: 'Clojure',
    ocaml: 'OCaml',
    hcl: 'HCL',
    ini: 'INI',
    makefile: 'Makefile',
    text: 'Plain Text',
  };
  return labels[lang] || lang.charAt(0).toUpperCase() + lang.slice(1);
}

// Get icon color per language family
export function getLanguageColor(lang: string): string {
  const colors: Record<string, string> = {
    typescript: '#3178C6',
    javascript: '#F7DF1E',
    python: '#3572A5',
    ruby: '#CC342D',
    java: '#B07219',
    kotlin: '#A97BFF',
    swift: '#FA7343',
    go: '#00ADD8',
    rust: '#DEA584',
    c: '#555555',
    cpp: '#F34B7D',
    csharp: '#178600',
    php: '#4F5D95',
    html: '#E34C26',
    css: '#563D7C',
    scss: '#C6538C',
    sass: '#A53B70',
    less: '#1D365D',
    json: '#40A977',
    xml: '#0060AC',
    yaml: '#CB171E',
    markdown: '#083FA1',
    sql: '#E38C00',
    bash: '#89E051',
    dockerfile: '#384D54',
    graphql: '#E10098',
    dart: '#00B4AB',
    lua: '#000080',
    scala: '#C22D40',
    elixir: '#6E4A7E',
    haskell: '#5E5086',
  };
  return colors[lang] || '#94a3b8';
}

export const useFileStore = create<FileState>((set) => ({
  currentFile: null,
  setCurrentFile: (file) => set({ currentFile: file }),
}));
