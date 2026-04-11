import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Modal,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFileStore, getLanguageLabel, getLanguageColor } from '../store/fileStore';
import { useRepoStore } from '../store/repoStore';
import { useAuthStore } from '../store/authStore';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
import { API_BASE_URL } from '../constants/Config';

// ─── Syntax Highlighting Engine ──────────────────────────────────────────────
interface Token {
  text: string;
  type: 'keyword' | 'string' | 'comment' | 'number' | 'operator' | 'function' | 'type' | 'property' | 'tag' | 'attribute' | 'punctuation' | 'regexp' | 'builtin' | 'plain';
}

const SYNTAX_COLORS: Record<Token['type'], string> = {
  keyword: '#C678DD',     // Purple
  string: '#98C379',      // Green
  comment: '#5C6370',     // Gray
  number: '#D19A66',      // Orange
  operator: '#56B6C2',    // Cyan
  function: '#61AFEF',    // Blue
  type: '#E5C07B',        // Yellow
  property: '#E06C75',    // Red
  tag: '#E06C75',         // Red
  attribute: '#D19A66',   // Orange
  punctuation: '#ABB2BF', // Light gray
  regexp: '#98C379',      // Green
  builtin: '#56B6C2',     // Cyan
  plain: '#ABB2BF',       // Default
};

const EDITOR_FONT = Platform.OS === 'ios' ? 'Courier' : 'monospace';
const EDITOR_FONT_SIZE = 13;
const LINE_HEIGHT = 22;
const GUTTER_PADDING = 12;

// ─── Autocomplete Engine ─────────────────────────────────────────────────────

const COMPLETIONS: Record<string, string[]> = {
  javascript: ['async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'export', 'extends', 'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'new', 'return', 'super', 'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield', 'console', 'log', 'error', 'warn', 'JSON', 'stringify', 'parse', 'Math', 'Promise', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Map', 'Set'],
  typescript: ['abstract', 'as', 'any', 'async', 'await', 'boolean', 'break', 'case', 'catch', 'class', 'const', 'continue', 'declare', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'implements', 'import', 'in', 'instanceof', 'interface', 'is', 'keyof', 'let', 'module', 'namespace', 'never', 'new', 'null', 'number', 'object', 'package', 'private', 'protected', 'public', 'readonly', 'return', 'set', 'static', 'string', 'super', 'switch', 'this', 'throw', 'true', 'try', 'type', 'typeof', 'undefined', 'var', 'void', 'while', 'with', 'yield'],
  python: ['False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield', 'print', 'range', 'len', 'enumerate', 'zip', 'list', 'dict', 'set', 'tuple', 'str', 'int', 'float', 'bool', 'self', 'cls'],
  go: ['break', 'default', 'func', 'interface', 'select', 'case', 'defer', 'go', 'map', 'struct', 'chan', 'else', 'goto', 'package', 'switch', 'const', 'fallthrough', 'if', 'range', 'type', 'continue', 'for', 'import', 'return', 'var', 'int', 'string', 'bool', 'byte', 'rune', 'float64', 'error', 'nil', 'true', 'false', 'make', 'new', 'append', 'copy', 'delete', 'len', 'cap', 'panic', 'recover', 'close', 'complex', 'real', 'imag'],
  rust: ['as', 'async', 'await', 'break', 'const', 'continue', 'crate', 'dyn', 'else', 'enum', 'extern', 'false', 'fn', 'for', 'if', 'impl', 'in', 'let', 'loop', 'match', 'mod', 'move', 'mut', 'pub', 'ref', 'return', 'self', 'Self', 'static', 'struct', 'super', 'trait', 'true', 'type', 'union', 'unsafe', 'use', 'where', 'while', 'Option', 'Result', 'Some', 'None', 'Ok', 'Err', 'Box', 'Vec', 'String', 'println!'],
  java: ['abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally', 'float', 'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new', 'package', 'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'try', 'void', 'volatile', 'while', 'true', 'false', 'null', 'System', 'out', 'println'],
  sql: ['SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'TABLE', 'INDEX', 'VIEW', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'ON', 'AND', 'OR', 'NOT', 'IN', 'BETWEEN', 'LIKE', 'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'AS', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'NULL', 'IS', 'SET', 'VALUES', 'INTO'],
};

function getSuggestions(text: string, cursorPosition: number, language: string): string[] {
  // Get word prefix at cursor
  const leftSide = text.slice(0, cursorPosition);
  const match = leftSide.match(/([a-zA-Z0-9_$]+)$/);
  if (!match) return [];
  const prefix = match[1];
  if (prefix.length < 1) return [];

  const langKey = language.toLowerCase();
  const keywords = COMPLETIONS[langKey] || COMPLETIONS['javascript']; // fallback to JS/TS

  // Also collect identifiers from the code itself
  const identifiers = new Set<string>();
  const idMatch = text.match(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g);
  if (idMatch) {
    idMatch.forEach(id => {
      if (id !== prefix) identifiers.add(id);
    });
  }

  const allCompletions = Array.from(new Set([...keywords, ...Array.from(identifiers)]));
  
  return allCompletions
    .filter(c => c.startsWith(prefix) && c !== prefix)
    .sort((a, b) => a.length - b.length)
    .slice(0, 10);
}

// ─── Autocomplete Bar Component ──────────────────────────────────────────────

function AutocompleteBar({
  suggestions,
  onSelect,
}: {
  suggestions: string[];
  onSelect: (word: string) => void;
}) {
  if (suggestions.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown} style={autocompleteStyles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always">
        {suggestions.map((suggestion, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => onSelect(suggestion)}
            style={autocompleteStyles.item}
          >
            <Text style={autocompleteStyles.text}>{suggestion}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

const autocompleteStyles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    height: 40,
  },
  item: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.05)',
  },
  text: {
    color: '#61AFEF',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: EDITOR_FONT,
  },
});

function tokenizeLine(line: string, language: string): Token[] {
  if (!line) return [{ text: '', type: 'plain' }];

  const tokens: Token[] = [];
  let remaining = line;

  // Language-specific keyword sets
  const jsKeywords = /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|this|class|extends|import|from|export|default|async|await|try|catch|finally|throw|typeof|instanceof|in|of|yield|delete|void|null|undefined|true|false|super|static|get|set|constructor|as|type|interface|enum|implements|declare|namespace|module|require|readonly)\b/;
  const pyKeywords = /\b(def|class|if|elif|else|for|while|return|import|from|as|try|except|finally|raise|with|yield|lambda|pass|break|continue|and|or|not|is|in|True|False|None|self|async|await|global|nonlocal|assert|del|print)\b/;
  const goKeywords = /\b(func|package|import|var|const|type|struct|interface|map|chan|go|select|switch|case|default|if|else|for|range|return|break|continue|defer|fallthrough|goto|nil|true|false|make|new|len|cap|append|copy|delete|close|panic|recover)\b/;
  const rustKeywords = /\b(fn|let|mut|const|if|else|for|while|loop|match|return|use|mod|pub|struct|enum|impl|trait|type|where|self|super|crate|as|in|ref|move|async|await|dyn|unsafe|extern|true|false|None|Some|Ok|Err|Vec|String|Box|Rc|Arc|Option|Result)\b/;
  const javaKeywords = /\b(public|private|protected|class|interface|extends|implements|static|final|void|int|long|double|float|boolean|char|byte|short|return|if|else|for|while|do|switch|case|break|continue|new|this|super|try|catch|finally|throw|throws|import|package|null|true|false|abstract|synchronized|volatile|transient|native|instanceof|enum|assert)\b/;
  const rubyKeywords = /\b(def|end|class|module|if|elsif|else|unless|while|until|for|do|begin|rescue|ensure|raise|return|yield|block_given|self|super|nil|true|false|and|or|not|in|require|include|extend|attr_reader|attr_writer|attr_accessor|puts|print|p)\b/;
  const sqlKeywords = /\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TABLE|INDEX|VIEW|JOIN|INNER|LEFT|RIGHT|OUTER|ON|AND|OR|NOT|IN|BETWEEN|LIKE|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|AS|DISTINCT|COUNT|SUM|AVG|MAX|MIN|NULL|IS|SET|VALUES|INTO)\b/i;

  const keywords = (() => {
    switch (language) {
      case 'python': return pyKeywords;
      case 'go': return goKeywords;
      case 'rust': return rustKeywords;
      case 'java': case 'kotlin': return javaKeywords;
      case 'ruby': return rubyKeywords;
      case 'sql': return sqlKeywords;
      default: return jsKeywords; // JS/TS/JSX/TSX default
    }
  })();

  const typePattern = /\b([A-Z][a-zA-Z0-9_]*)\b/;
  const functionPattern = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/;

  while (remaining.length > 0) {
    let matched = false;

    // Inline comment //
    if (remaining.startsWith('//')) {
      tokens.push({ text: remaining, type: 'comment' });
      remaining = '';
      matched = true;
    }
    // Hash comment #
    else if (remaining.startsWith('#') && (language === 'python' || language === 'ruby' || language === 'bash' || language === 'yaml')) {
      tokens.push({ text: remaining, type: 'comment' });
      remaining = '';
      matched = true;
    }
    // Block comment start
    else if (remaining.startsWith('/*')) {
      const end = remaining.indexOf('*/');
      if (end !== -1) {
        tokens.push({ text: remaining.substring(0, end + 2), type: 'comment' });
        remaining = remaining.substring(end + 2);
      } else {
        tokens.push({ text: remaining, type: 'comment' });
        remaining = '';
      }
      matched = true;
    }
    // Template literal
    else if (remaining.startsWith('`')) {
      const endIdx = remaining.indexOf('`', 1);
      if (endIdx !== -1) {
        tokens.push({ text: remaining.substring(0, endIdx + 1), type: 'string' });
        remaining = remaining.substring(endIdx + 1);
      } else {
        tokens.push({ text: remaining, type: 'string' });
        remaining = '';
      }
      matched = true;
    }
    // Double-quoted string
    else if (remaining.startsWith('"')) {
      let i = 1;
      while (i < remaining.length && remaining[i] !== '"') {
        if (remaining[i] === '\\') i++; // skip escaped chars
        i++;
      }
      tokens.push({ text: remaining.substring(0, i + 1), type: 'string' });
      remaining = remaining.substring(i + 1);
      matched = true;
    }
    // Single-quoted string
    else if (remaining.startsWith("'")) {
      let i = 1;
      while (i < remaining.length && remaining[i] !== "'") {
        if (remaining[i] === '\\') i++;
        i++;
      }
      tokens.push({ text: remaining.substring(0, i + 1), type: 'string' });
      remaining = remaining.substring(i + 1);
      matched = true;
    }

    if (!matched) {
      // Number
      const numMatch = remaining.match(/^(\d+\.?\d*(?:[eE][+-]?\d+)?|0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+)/);
      if (numMatch) {
        tokens.push({ text: numMatch[0], type: 'number' });
        remaining = remaining.substring(numMatch[0].length);
        matched = true;
      }
    }

    if (!matched) {
      // Keyword
      const kwMatch = remaining.match(keywords);
      if (kwMatch && kwMatch.index === 0) {
        tokens.push({ text: kwMatch[0], type: 'keyword' });
        remaining = remaining.substring(kwMatch[0].length);
        matched = true;
      }
    }

    if (!matched) {
      // Function call
      const fnMatch = remaining.match(functionPattern);
      if (fnMatch && fnMatch.index === 0) {
        tokens.push({ text: fnMatch[1], type: 'function' });
        remaining = remaining.substring(fnMatch[1].length);
        matched = true;
      }
    }

    if (!matched) {
      // Type (PascalCase)
      const typeMatch = remaining.match(typePattern);
      if (typeMatch && typeMatch.index === 0) {
        tokens.push({ text: typeMatch[0], type: 'type' });
        remaining = remaining.substring(typeMatch[0].length);
        matched = true;
      }
    }

    if (!matched) {
      // Operator
      const opMatch = remaining.match(/^(===|!==|==|!=|<=|>=|=>|&&|\|\||<<|>>|>>>|\+\+|--|\.\.\.|\?\?|\?\.|\*\*|[+\-*/%&|^~<>!=?:])/);
      if (opMatch) {
        tokens.push({ text: opMatch[0], type: 'operator' });
        remaining = remaining.substring(opMatch[0].length);
        matched = true;
      }
    }

    if (!matched) {
      // Punctuation
      const punctMatch = remaining.match(/^[{}()\[\];,.<>]/);
      if (punctMatch) {
        tokens.push({ text: punctMatch[0], type: 'punctuation' });
        remaining = remaining.substring(1);
        matched = true;
      }
    }

    if (!matched) {
      // Property access (.xxx)
      const propMatch = remaining.match(/^\.([a-zA-Z_$][a-zA-Z0-9_$]*)/);
      if (propMatch) {
        tokens.push({ text: '.', type: 'punctuation' });
        tokens.push({ text: propMatch[1], type: 'property' });
        remaining = remaining.substring(propMatch[0].length);
        matched = true;
      }
    }

    if (!matched) {
      // Consume one char as plain text
      tokens.push({ text: remaining[0], type: 'plain' });
      remaining = remaining.substring(1);
    }
  }

  return tokens;
}

// ─── Highlighted Line Component ──────────────────────────────────────────────
const HighlightedLine = React.memo(({ line, language, lineNumber, totalLines }: {
  line: string;
  language: string;
  lineNumber: number;
  totalLines: number;
}) => {
  const tokens = useMemo(() => tokenizeLine(line, language), [line, language]);
  const gutterWidth = Math.max(3, String(totalLines).length) * 10 + 16;

  return (
    <View style={lineStyles.lineRow}>
      <View style={[lineStyles.gutter, { width: gutterWidth }]}>
        <Text style={lineStyles.lineNumber}>{lineNumber}</Text>
      </View>
      <View style={lineStyles.codeLine}>
        <Text style={lineStyles.codeText}>
          {tokens.map((token, i) => (
            <Text
              key={i}
              style={[
                { color: SYNTAX_COLORS[token.type] },
                token.type === 'comment' && { fontStyle: 'italic' },
              ]}
            >
              {token.text}
            </Text>
          ))}
        </Text>
      </View>
    </View>
  );
});

const lineStyles = StyleSheet.create({
  lineRow: {
    flexDirection: 'row',
    minHeight: LINE_HEIGHT,
  },
  gutter: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: GUTTER_PADDING,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.06)',
  },
  lineNumber: {
    color: '#3E4451',
    fontSize: 12,
    fontFamily: EDITOR_FONT,
    lineHeight: LINE_HEIGHT,
  },
  codeLine: {
    flex: 1,
    paddingLeft: GUTTER_PADDING,
    justifyContent: 'center',
  },
  codeText: {
    fontSize: EDITOR_FONT_SIZE,
    fontFamily: EDITOR_FONT,
    lineHeight: LINE_HEIGHT,
  },
});

// ─── Commit Modal ────────────────────────────────────────────────────────────
function CommitModal({
  visible,
  onClose,
  onCommit,
  loading,
  filePath,
  branch,
}: {
  visible: boolean;
  onClose: () => void;
  onCommit: (message: string) => void;
  loading: boolean;
  filePath: string;
  branch: string;
}) {
  const [message, setMessage] = useState(`Update ${filePath.split('/').pop()}`);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={commitStyles.overlay}>
        <Animated.View entering={FadeInDown.springify()} style={commitStyles.sheet}>
          {/* Header Row */}
          <View style={commitStyles.header}>
            <View style={commitStyles.headerLeft}>
              <Ionicons name="git-commit" size={20} color="#fff" />
              <Text style={commitStyles.title}>COMMIT & PUSH</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={commitStyles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Branch Info */}
          <View style={commitStyles.branchRow}>
            <View style={commitStyles.branchPill}>
              <Ionicons name="git-branch" size={14} color="#fff" />
              <Text style={commitStyles.branchText}>{branch}</Text>
            </View>
            <View style={commitStyles.filePill}>
              <Ionicons name="document-text" size={14} color="#61AFEF" />
              <Text style={commitStyles.fileText} numberOfLines={1}>{filePath}</Text>
            </View>
          </View>

          {/* Commit Message Input */}
          <Text style={commitStyles.label}>COMMIT MESSAGE</Text>
          <TextInput
            style={commitStyles.input}
            value={message}
            onChangeText={setMessage}
            placeholder="Describe your changes..."
            placeholderTextColor="#475569"
            multiline
            maxLength={200}
            autoFocus
          />

          {/* Commit Button */}
          <TouchableOpacity
            onPress={() => onCommit(message)}
            disabled={loading || !message.trim()}
            style={[
              commitStyles.commitBtn,
              (loading || !message.trim()) && { opacity: 0.5 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="cloud-upload" size={18} color="#000" />
                <Text style={commitStyles.commitBtnText}>PUSH TO {branch.toUpperCase()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const commitStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  branchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  branchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  branchText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  filePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(97, 175, 239, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(97, 175, 239, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexShrink: 1,
  },
  fileText: {
    color: '#61AFEF',
    fontSize: 13,
    flexShrink: 1,
  },
  label: {
    color: '#64748b',
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1e293b',
    color: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  commitBtn: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  commitBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
});

// ─── Search Bar ──────────────────────────────────────────────────────────────
function SearchBar({
  visible,
  onClose,
  searchText,
  onSearchChange,
  matchCount,
  currentMatch,
  onNext,
  onPrev,
}: {
  visible: boolean;
  onClose: () => void;
  searchText: string;
  onSearchChange: (t: string) => void;
  matchCount: number;
  currentMatch: number;
  onNext: () => void;
  onPrev: () => void;
}) {
  if (!visible) return null;

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={searchStyles.container}>
      <View style={searchStyles.inner}>
        <Ionicons name="search" size={18} color="#64748b" />
        <TextInput
          style={searchStyles.input}
          value={searchText}
          onChangeText={onSearchChange}
          placeholder="Find in file..."
          placeholderTextColor="#475569"
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchText.length > 0 && (
          <Text style={searchStyles.matchCount}>
            {matchCount > 0 ? `${currentMatch + 1}/${matchCount}` : 'No matches'}
          </Text>
        )}
        <TouchableOpacity onPress={onPrev} style={searchStyles.navBtn} disabled={matchCount === 0}>
          <Ionicons name="chevron-up" size={18} color={matchCount > 0 ? '#fff' : '#334155'} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onNext} style={searchStyles.navBtn} disabled={matchCount === 0}>
          <Ionicons name="chevron-down" size={18} color={matchCount > 0 ? '#fff' : '#334155'} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={searchStyles.closeBtn}>
          <Ionicons name="close" size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const searchStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: '#1a1f2e',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    paddingVertical: 6,
  },
  matchCount: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  navBtn: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  closeBtn: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// ─── Main Editor Screen ──────────────────────────────────────────────────────
export default function EditorScreen() {
  const { currentFile, setCurrentFile } = useFileStore();
  const { currentRepo, currentBranch } = useRepoStore();
  const { token } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Editor states
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [commitLoading, setCommitLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const scrollRef = useRef<ScrollView>(null);
  const editRef = useRef<TextInput>(null);

  // Animation
  const headerGlow = useSharedValue(0);

  useEffect(() => {
    headerGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.2 + headerGlow.value * 0.4,
  }));

  // Parse data
  const filePath = currentFile?.path || '';
  const originalContent = currentFile?.content || '';
  const language = currentFile?.language || 'text';
  const langLabel = getLanguageLabel(language);
  const langColor = getLanguageColor(language);
  const branch = currentBranch || currentRepo?.default_branch || 'main';

  const displayContent = isEditing ? editedContent : originalContent;
  const lines = useMemo(() => displayContent.split('\n'), [displayContent]);
  const lineCount = lines.length;
  const charCount = displayContent.length;

  // Search
  const searchMatches = useMemo(() => {
    if (!searchText) return [];
    const matches: number[] = [];
    lines.forEach((line, idx) => {
      if (line.toLowerCase().includes(searchText.toLowerCase())) {
        matches.push(idx);
      }
    });
    return matches;
  }, [lines, searchText]);

  const handleSearchNext = () => {
    if (searchMatches.length === 0) return;
    const next = (currentMatchIndex + 1) % searchMatches.length;
    setCurrentMatchIndex(next);
    scrollToLine(searchMatches[next]);
  };

  const handleSearchPrev = () => {
    if (searchMatches.length === 0) return;
    const prev = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    setCurrentMatchIndex(prev);
    scrollToLine(searchMatches[prev]);
  };

  const scrollToLine = (lineIdx: number) => {
    scrollRef.current?.scrollTo({ y: lineIdx * 22 - 100, animated: true });
  };

  // Edit mode
  const startEditing = () => {
    if (isProcessing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsProcessing(true);
    setTimeout(() => {
      setEditedContent(originalContent);
      setIsEditing(true);
      setHasChanges(false);
      setIsProcessing(false);
      setTimeout(() => editRef.current?.focus(), 300);
    }, 10);
  };

  const cancelEditing = () => {
    if (isProcessing) return;
    if (hasChanges) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setIsProcessing(true);
              Keyboard.dismiss();
              setTimeout(() => {
                setIsEditing(false);
                setHasChanges(false);
                setEditedContent('');
                setIsProcessing(false);
              }, 10);
            },
          },
        ]
      );
    } else {
      setIsProcessing(true);
      Keyboard.dismiss();
      setTimeout(() => {
        setIsEditing(false);
        setIsProcessing(false);
      }, 10);
    }
  };

  const handleContentChange = (text: string) => {
    setEditedContent(text);
    setHasChanges(text !== originalContent);
    
    // Update suggestions based on new text and current selection
    const newSuggestions = getSuggestions(text, selection.start, language);
    setSuggestions(newSuggestions);
  };

  const handleSelectionChange = (event: any) => {
    const newSelection = event.nativeEvent.selection;
    setSelection(newSelection);
    
    // Update suggestions based on new selection
    const newSuggestions = getSuggestions(editedContent, newSelection.start, language);
    setSuggestions(newSuggestions);
  };

  const handleSuggestionSelect = (word: string) => {
    const leftSide = editedContent.slice(0, selection.start);
    const rightSide = editedContent.slice(selection.start);
    
    // Find the word prefix being replaced
    const match = leftSide.match(/([a-zA-Z0-9_$]+)$/);
    if (match) {
      const prefix = match[1];
      const newText = leftSide.slice(0, -prefix.length) + word + rightSide;
      setEditedContent(newText);
      setSuggestions([]);
      
      const newPos = leftSide.length - prefix.length + word.length;
      setTimeout(() => {
        setSelection({ start: newPos, end: newPos });
      }, 50);
    }
  };

  // Commit & Push
  const handleCommit = async (message: string) => {
    if (!currentRepo || !currentFile) return;

    setCommitLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/repos/${currentRepo.owner.login}/${currentRepo.name}/commit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            path: filePath,
            content: editedContent,
            message,
            sha: currentFile.sha,
            branch,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to commit');
      }

      const result = await response.json();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Update the file store with new content & sha
      setCurrentFile({
        ...currentFile,
        content: editedContent,
        sha: result.content?.sha || currentFile.sha,
      });

      setIsEditing(false);
      setHasChanges(false);
      setShowCommitModal(false);

      Alert.alert(
        '✅ Committed Successfully',
        `Pushed to "${branch}" branch.\n\n${message}`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Commit Failed', error.message || 'Something went wrong');
    } finally {
      setCommitLoading(false);
    }
  };

  // Go back
  const handleGoBack = () => {
    if (isEditing && hasChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved edits. Discard them?',
        [
          { text: 'Stay', style: 'cancel' },
          {
            text: 'Discard & Go Back',
            style: 'destructive',
            onPress: () => {
              setCurrentFile(null);
              router.back();
            },
          },
        ]
      );
    } else {
      setCurrentFile(null);
      router.back();
    }
  };

  // Fallback if no file
  if (!currentFile) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <Ionicons name="document-text-outline" size={64} color="#1e293b" />
        <Text style={styles.emptyText}>No file selected</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.emptyBtn}>
          <Text style={styles.emptyBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const fileName = filePath.split('/').pop() || filePath;

  // Dynamically responsive insets ensuring the Editor never slips under hardware or nav bar bounds
  const topPadding = Math.max(insets.top, 10);
  const bottomPadding = Math.max(insets.bottom, 0) + 20; // Reduced clearance to respect compact UI

  return (
    <View style={[styles.root, { paddingTop: topPadding, paddingBottom: bottomPadding }]}>
      <View style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {/* ─── Top Header ──────────────────────────────────── */}
          <Animated.View style={[styles.header, glowStyle]}>
            {/* Back button */}
            <TouchableOpacity onPress={handleGoBack} style={styles.headerBtn}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>

            {/* File info */}
            <View style={styles.headerInfo}>
              <Text style={styles.fileName} numberOfLines={1}>{fileName}</Text>
              <View style={styles.headerMeta}>
                <View style={[styles.langDot, { backgroundColor: langColor }]} />
                <Text style={styles.langText}>{langLabel}</Text>
                <Text style={styles.metaSep}>·</Text>
                <Text style={styles.metaText}>{lineCount} lines</Text>
                <Text style={styles.metaSep}>·</Text>
                <Text style={styles.metaText}>{formatBytes(charCount)}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.headerActions}>
              {/* Search */}
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowSearch(!showSearch);
                  if (showSearch) setSearchText('');
                }}
                style={[styles.headerBtn, showSearch && styles.headerBtnActive]}
              >
                <Ionicons name="search" size={18} color={showSearch ? '#fff' : '#94a3b8'} />
              </TouchableOpacity>

              {/* Edit / Cancel */}
              {isEditing ? (
                <TouchableOpacity onPress={cancelEditing} style={[styles.headerBtn, styles.headerBtnDanger]} disabled={isProcessing}>
                  {isProcessing ? <ActivityIndicator size="small" color="#f87171" /> : <Ionicons name="close" size={18} color="#f87171" />}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={startEditing} style={styles.editBtn} disabled={isProcessing}>
                  {isProcessing ? <ActivityIndicator size="small" color="#000" /> : <Ionicons name="pencil" size={16} color="#000" />}
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>

          {/* ─── Branch / Path Bar ───────────────────────────── */}
          <View style={styles.pathBar}>
            <View style={styles.branchChip}>
              <Ionicons name="git-branch" size={13} color="#fff" />
              <Text style={styles.branchChipText}>{branch}</Text>
            </View>
            <Ionicons name="chevron-forward" size={12} color="#334155" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
              <Text style={styles.pathText} numberOfLines={1}>{filePath}</Text>
            </ScrollView>
            {hasChanges && (
              <Animated.View entering={FadeIn} style={styles.modifiedBadge}>
                <Text style={styles.modifiedText}>MODIFIED</Text>
              </Animated.View>
            )}
          </View>

          {/* ─── Code Content ────────────────────────────────── */}
          <View style={styles.editorWrapper}>
            {/* Search overlay */}
            <SearchBar
              visible={showSearch}
              onClose={() => { setShowSearch(false); setSearchText(''); }}
              searchText={searchText}
              onSearchChange={(t) => { setSearchText(t); setCurrentMatchIndex(0); }}
              matchCount={searchMatches.length}
              currentMatch={currentMatchIndex}
              onNext={handleSearchNext}
              onPrev={handleSearchPrev}
            />

            <ScrollView
              ref={scrollRef}
              style={styles.editorScroll}
              contentContainerStyle={{ paddingVertical: 12, paddingBottom: 150 }}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="always"
            >
              {isEditing ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
                  <View style={{ flexDirection: 'row', minWidth: SCREEN_WIDTH }}>
                    {/* Fixed-Width Gutter for Line Numbers (Edit Mode) */}
                    <View style={[lineStyles.gutter, { width: Math.max(3, String(lineCount).length) * 10 + 16 }]}>
                      {lines.map((_, idx) => (
                        <Text key={idx} style={[lineStyles.lineNumber, { minHeight: LINE_HEIGHT, textAlign: 'right' }]}>{idx + 1}</Text>
                      ))}
                    </View>

                    {/* Plain Text Editor Surface */}
                    <View style={{ flex: 1, paddingLeft: GUTTER_PADDING }}>
                      <TextInput
                        ref={editRef}
                        style={[styles.editInput, { paddingVertical: 0, paddingHorizontal: 0, color: '#ABB2BF', flex: 1, minWidth: SCREEN_WIDTH * 2 }]}
                        value={editedContent}
                        onChangeText={handleContentChange}
                        onSelectionChange={handleSelectionChange}
                        selection={selection}
                        multiline
                        autoCapitalize="none"
                        autoCorrect={false}
                        spellCheck={false}
                        textAlignVertical="top"
                        scrollEnabled={false}
                        cursorColor="#61AFEF"
                        includeFontPadding={false}
                      />
                    </View>
                  </View>
                </ScrollView>
              ) : (
                <View>
                  {/* Background Syntax Highlighting Layer (View Mode) */}
                  {lines.map((line, idx) => {
                    const isSearchMatch = searchText && searchMatches.includes(idx);
                    const isCurrentMatch = isSearchMatch && idx === searchMatches[currentMatchIndex];
                    
                    return (
                      <View
                        key={idx}
                        style={[
                          isSearchMatch && styles.searchHighlight,
                          isCurrentMatch && styles.currentSearchHighlight,
                        ]}
                      >
                        <HighlightedLine
                          line={line}
                          language={language}
                          lineNumber={idx + 1}
                          totalLines={lineCount}
                        />
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </View>

          {/* ─── Bottom Toolbar ───────────────────────────────── */}
          <View style={styles.toolbar}>
            {isEditing ? (
              /* Edit toolbar */
              <View>
                <AutocompleteBar 
                  suggestions={suggestions} 
                  onSelect={handleSuggestionSelect} 
                />
                <View style={styles.toolbarInner}>
                  <View style={styles.toolbarLeft}>
                    <TouchableOpacity
                      onPress={() => {
                        // Insert tab (2 spaces)
                        const start = selection.start;
                        const newText = editedContent.slice(0, start) + '  ' + editedContent.slice(selection.end);
                        handleContentChange(newText);
                        setTimeout(() => {
                          setSelection({ start: start + 2, end: start + 2 });
                        }, 50);
                      }}
                      style={styles.toolbarBtn}
                    >
                      <Ionicons name="arrow-forward" size={16} color="#94a3b8" />
                      <Text style={styles.toolbarBtnText}>TAB</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        const start = selection.start;
                        const newText = editedContent.slice(0, start) + '\n' + editedContent.slice(selection.end);
                        handleContentChange(newText);
                        setTimeout(() => {
                          setSelection({ start: start + 1, end: start + 1 });
                        }, 50);
                      }}
                      style={styles.toolbarBtn}
                    >
                      <Ionicons name="return-down-back" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        // Undo - revert to original
                        handleContentChange(originalContent);
                      }}
                      style={styles.toolbarBtn}
                    >
                      <Ionicons name="arrow-undo" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                      setShowCommitModal(true);
                    }}
                    disabled={!hasChanges}
                    style={[
                      styles.commitTriggerBtn,
                      !hasChanges && { opacity: 0.4 },
                    ]}
                  >
                    <Ionicons name="cloud-upload" size={16} color="#000" />
                    <Text style={styles.commitTriggerText}>COMMIT & PUSH</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* View toolbar */
              <View style={styles.toolbarInner}>
                <View style={styles.toolbarLeft}>
                  <View style={styles.statChip}>
                    <Ionicons name="code-slash" size={14} color={langColor} />
                    <Text style={[styles.statText, { color: langColor }]}>{langLabel}</Text>
                  </View>
                  <View style={styles.statChip}>
                    <Ionicons name="list" size={14} color="#64748b" />
                    <Text style={styles.statText}>{lineCount}</Text>
                  </View>
                  <View style={styles.statChip}>
                    <Ionicons name="document-text-outline" size={14} color="#64748b" />
                    <Text style={styles.statText}>{formatBytes(charCount)}</Text>
                  </View>
                </View>

                <TouchableOpacity onPress={startEditing} style={styles.editToolbarBtn}>
                  <Ionicons name="pencil" size={16} color="#000" />
                  <Text style={styles.editToolbarText}>EDIT</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>

      {/* Commit Modal */}
      <CommitModal
        visible={showCommitModal}
        onClose={() => setShowCommitModal(false)}
        onCommit={handleCommit}
        loading={commitLoading}
        filePath={filePath}
        branch={branch}
      />
    </View>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#0d1117',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 18,
    marginTop: 16,
  },
  emptyBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  emptyBtnText: {
    color: '#000',
    fontWeight: 'bold',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#161b22',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 4,
    gap: 8,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerBtnDanger: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  headerInfo: {
    flex: 1,
  },
  fileName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  langDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  langText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  metaSep: {
    color: '#334155',
    fontSize: 11,
  },
  metaText: {
    color: '#64748b',
    fontSize: 11,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 6,
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },

  // Path bar
  pathBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#111621',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    gap: 6,
  },
  branchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  branchChipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  pathText: {
    color: '#64748b',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  modifiedBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  modifiedText: {
    color: '#FBBF24',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // Editor area
  editorWrapper: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0d1117',
  },
  editorScroll: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  editInput: {
    color: '#ABB2BF',
    fontSize: EDITOR_FONT_SIZE,
    fontFamily: EDITOR_FONT,
    lineHeight: LINE_HEIGHT,
    padding: 0,
    minHeight: SCREEN_HEIGHT,
    textAlignVertical: 'top',
  },

  // Search highlights
  searchHighlight: {
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
  },
  currentSearchHighlight: {
    backgroundColor: 'rgba(251, 191, 36, 0.25)',
    borderLeftWidth: 2,
    borderLeftColor: '#FBBF24',
  },

  // Bottom toolbar
  toolbar: {
    backgroundColor: '#161b22',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  toolbarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolbarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  toolbarBtnText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  commitTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  commitTriggerText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  statText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  editToolbarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  editToolbarText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
