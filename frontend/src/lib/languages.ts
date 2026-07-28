/**
 * Extended Language Support System
 * Supports: Python, SQL, C++, Rust, Go, CUDA C++, Mojo, R, Julia, Scala, JavaScript, Markdown
 * 
 * Each language includes:
 * - Monaco editor mode for syntax highlighting
 * - File extension
 * - Execution runtime information
 * - Language-specific features
 */

export type CellLanguage =
  | 'python'
  | 'sql'
  | 'cpp'
  | 'rust'
  | 'go'
  | 'cuda'
  | 'mojo'
  | 'r'
  | 'julia'
  | 'scala'
  | 'typescript'
  | 'zig'
  | 'javascript'
  | 'markdown'
  | 'raw'

export interface LanguageConfig {
  name: string
  ext: string
  monacoMode: string
  category: 'scripting' | 'compiled' | 'data' | 'gpu' | 'markup' | 'other'
  runtimes: string[]
  features: {
    syntax_highlighting: boolean
    execution: boolean
    visualization: boolean
    interop: string[] // Can interop with these languages
  }
  description?: string
}

export const LANGUAGES: Record<CellLanguage, LanguageConfig> = {
  python: {
    name: 'Python',
    ext: '.py',
    monacoMode: 'python',
    category: 'scripting',
    runtimes: ['CPython 3.8+', 'PyPy', 'Conda'],
    features: {
      syntax_highlighting: true,
      execution: true,
      visualization: true,
      interop: ['sql', 'javascript', 'r', 'julia'],
    },
    description: 'General-purpose scripting language. Best for data science and ML.',
  },

  sql: {
    name: 'SQL',
    ext: '.sql',
    monacoMode: 'sql',
    category: 'data',
    runtimes: ['PostgreSQL', 'MySQL', 'BigQuery', 'Snowflake', 'Redshift', 'DuckDB', 'SQLite', 'T-SQL', 'Oracle'],
    features: {
      syntax_highlighting: true,
      execution: true,
      visualization: true,
      interop: ['python', 'javascript', 'r'],
    },
    description: 'Query language for databases. Integrates with 8+ database backends.',
  },

  cpp: {
    name: 'C++',
    ext: '.cpp',
    monacoMode: 'cpp',
    category: 'compiled',
    runtimes: ['g++', 'clang++', 'MSVC'],
    features: {
      syntax_highlighting: true,
      execution: true,
      visualization: false,
      interop: ['python', 'rust', 'cuda'],
    },
    description: 'High-performance compiled language. For algorithms and systems programming.',
  },

  rust: {
    name: 'Rust',
    ext: '.rs',
    monacoMode: 'rust',
    category: 'compiled',
    runtimes: ['cargo', 'rustc'],
    features: {
      syntax_highlighting: true,
      execution: true,
      visualization: false,
      interop: ['cpp', 'python', 'wasm'],
    },
    description: 'Memory-safe compiled language. Ideal for performance-critical code.',
  },

  go: {
    name: 'Go',
    ext: '.go',
    monacoMode: 'go',
    category: 'compiled',
    runtimes: ['go run', 'go build'],
    features: {
      syntax_highlighting: true,
      execution: true,
      visualization: false,
      interop: ['python', 'cpp', 'rust'],
    },
    description: 'Simple compiled language. Great for concurrent systems and microservices.',
  },

  cuda: {
    name: 'CUDA C++',
    ext: '.cu',
    monacoMode: 'cpp',
    category: 'gpu',
    runtimes: ['NVIDIA CUDA Toolkit 11.0+'],
    features: {
      syntax_highlighting: true,
      execution: true,
      visualization: true,
      interop: ['python', 'cpp'],
    },
    description: 'GPU-accelerated C++. For NVIDIA CUDA-enabled GPUs.',
  },

  mojo: {
    name: 'Mojo',
    ext: '.mojo',
    monacoMode: 'python',
    category: 'scripting',
    runtimes: ['Mojo (0.1.0+)'],
    features: {
      syntax_highlighting: true,
      execution: true,
      visualization: true,
      interop: ['python', 'cuda'],
    },
    description: 'Emerging language combining Python simplicity with systems programming performance.',
  },

  r: {
    name: 'R',
    ext: '.r',
    monacoMode: 'r',
    category: 'scripting',
    runtimes: ['R 4.0+', 'Microsoft R Open'],
    features: {
      syntax_highlighting: true,
      execution: true,
      visualization: true,
      interop: ['python', 'sql', 'julia'],
    },
    description: 'Statistical computing language. Essential for data analysis and visualization.',
  },

  julia: {
    name: 'Julia',
    ext: '.jl',
    monacoMode: 'julia',
    category: 'scripting',
    runtimes: ['Julia 1.6+'],
    features: {
      syntax_highlighting: true,
      execution: true,
      visualization: true,
      interop: ['python', 'r', 'cpp', 'cuda'],
    },
    description: 'High-performance language for numerical computing and data science.',
  },

  scala: {
    name: 'Scala',
    ext: '.scala',
    monacoMode: 'scala',
    category: 'compiled',
    runtimes: ['Scala 3.0+', 'JVM 11+'],
    features: {
      syntax_highlighting: true,
      execution: true,
      visualization: false,
      interop: ['java', 'python', 'sql'],
    },
    description: 'JVM language combining functional and OOP. Great for big data (Spark).',
  },

  typescript: {
    name: 'TypeScript',
    ext: '.ts',
    monacoMode: 'typescript',
    category: 'scripting',
    runtimes: ['Node.js 14+', 'ts-node', 'Deno'],
    features: {
      syntax_highlighting: true,
      execution: true,
      visualization: true,
      interop: ['javascript', 'python', 'wasm'],
    },
    description: 'Typed JavaScript for large-scale applications and web development.',
  },

  zig: {
    name: 'Zig',
    ext: '.zig',
    monacoMode: 'zig',
    category: 'compiled',
    runtimes: ['zig 0.11+'],
    features: {
      syntax_highlighting: true,
      execution: true,
      visualization: false,
      interop: ['cpp', 'c', 'rust', 'wasm'],
    },
    description: 'Modern systems language with improved memory safety and error handling.',
  },

  javascript: {
    name: 'JavaScript',
    ext: '.js',
    monacoMode: 'javascript',
    category: 'scripting',
    runtimes: ['Node.js 14+', 'Browser', 'Deno'],
    features: {
      syntax_highlighting: true,
      execution: true,
      visualization: true,
      interop: ['typescript', 'python', 'wasm'],
    },
    description: 'Language for web and server-side scripting.',
  },

  markdown: {
    name: 'Markdown',
    ext: '.md',
    monacoMode: 'markdown',
    category: 'markup',
    runtimes: [],
    features: {
      syntax_highlighting: true,
      execution: false,
      visualization: true,
      interop: [],
    },
    description: 'Lightweight markup for documentation and notes.',
  },

  raw: {
    name: 'Raw',
    ext: '.txt',
    monacoMode: 'plaintext',
    category: 'other',
    runtimes: [],
    features: {
      syntax_highlighting: false,
      execution: false,
      visualization: false,
      interop: [],
    },
    description: 'Plain text without syntax highlighting.',
  },
} as const

/**
 * Get Monaco editor mode for syntax highlighting
 */
export function getMonacoMode(language: CellLanguage): string {
  return LANGUAGES[language]?.monacoMode || 'plaintext'
}

/**
 * Check if a string is a valid language
 */
export function isValidLanguage(lang: unknown): lang is CellLanguage {
  return typeof lang === 'string' && lang in LANGUAGES
}

/**
 * Get available runtimes for a language
 */
export function getRuntimes(language: CellLanguage): string[] {
  return LANGUAGES[language]?.runtimes || []
}

/**
 * Check if language supports execution
 */
export function supportsExecution(language: CellLanguage): boolean {
  return LANGUAGES[language]?.features.execution || false
}

/**
 * Check if language supports visualization
 */
export function supportsVisualization(language: CellLanguage): boolean {
  return LANGUAGES[language]?.features.visualization || false
}

/**
 * Get languages that can interop with this language
 */
export function getInteropLanguages(language: CellLanguage): CellLanguage[] {
  const interop = LANGUAGES[language]?.features.interop || []
  return interop.filter(isValidLanguage)
}

/**
 * Get all languages by category
 */
export function getLanguagesByCategory(category: LanguageConfig['category']): CellLanguage[] {
  return Object.entries(LANGUAGES)
    .filter(([_, config]) => config.category === category)
    .map(([key]) => key as CellLanguage)
}

/**
 * Get all executable languages
 */
export function getExecutableLanguages(): CellLanguage[] {
  return Object.entries(LANGUAGES)
    .filter(([_, config]) => config.features.execution)
    .map(([key]) => key as CellLanguage)
}

/**
 * Get all visualizable languages
 */
export function getVisualizableLanguages(): CellLanguage[] {
  return Object.entries(LANGUAGES)
    .filter(([_, config]) => config.features.visualization)
    .map(([key]) => key as CellLanguage)
}

/**
 * Sort languages by category for UI display
 */
export function getLanguagesSorted(): { category: string; languages: Array<[CellLanguage, LanguageConfig]> }[] {
  const categories = ['scripting', 'data', 'compiled', 'gpu', 'markup', 'other'] as const
  
  return categories.map(category => ({
    category: category.charAt(0).toUpperCase() + category.slice(1),
    languages: Object.entries(LANGUAGES)
      .filter(([_, config]) => config.category === category)
      .map(([key, config]) => [key as CellLanguage, config]),
  }))
}
