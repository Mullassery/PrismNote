/**
 * Test Fixtures: Sample Notebooks
 * Used in E2E tests to provide consistent test data
 */

export const emptyNotebook = {
  id: 'test-empty',
  name: 'Empty Notebook',
  cells: [],
  metadata: { createdAt: new Date().toISOString() },
}

export const singleCellPythonNotebook = {
  id: 'test-single-py',
  name: 'Single Python Cell',
  cells: [
    {
      id: 'cell-1',
      type: 'python' as const,
      code: 'print("Hello, World!")',
      output: null,
      status: 'idle' as const,
    },
  ],
  metadata: { createdAt: new Date().toISOString() },
}

export const multiCellNotebook = {
  id: 'test-multi',
  name: 'Multi-Cell Notebook',
  cells: [
    {
      id: 'cell-1',
      type: 'python' as const,
      code: 'x = 42\nprint("Variable defined")',
      output: { type: 'text', data: 'Variable defined\n' },
      status: 'idle' as const,
    },
    {
      id: 'cell-2',
      type: 'python' as const,
      code: 'y = x * 2\nprint(f"Result: {y}")',
      output: { type: 'text', data: 'Result: 84\n' },
      status: 'idle' as const,
    },
    {
      id: 'cell-3',
      type: 'markdown' as const,
      code: '# Results\n\nBoth variables defined successfully.',
      output: null,
      status: 'idle' as const,
    },
  ],
  metadata: { createdAt: new Date().toISOString() },
}

export const sqlNotebook = {
  id: 'test-sql',
  name: 'SQL Notebook',
  cells: [
    {
      id: 'cell-1',
      type: 'sql' as const,
      code: 'SELECT * FROM users LIMIT 10',
      output: null,
      status: 'idle' as const,
      connection: 'postgres-default',
    },
  ],
  metadata: { createdAt: new Date().toISOString() },
}

export const complexNotebook = {
  id: 'test-complex',
  name: 'Complex Analysis Notebook',
  cells: [
    {
      id: 'cell-1',
      type: 'markdown' as const,
      code: '# Data Analysis Report\n\nAnalyzing user behavior from last quarter.',
      output: null,
      status: 'idle' as const,
    },
    {
      id: 'cell-2',
      type: 'python' as const,
      code: `import pandas as pd
import numpy as np

df = pd.DataFrame({
    'user_id': range(1, 101),
    'revenue': np.random.uniform(10, 1000, 100),
    'date': pd.date_range('2024-01-01', periods=100)
})
print(f"Loaded {len(df)} records")`,
      output: { type: 'text', data: 'Loaded 100 records\n' },
      status: 'idle' as const,
    },
    {
      id: 'cell-3',
      type: 'python' as const,
      code: `monthly = df.groupby(df['date'].dt.to_period('M'))['revenue'].sum()
print(monthly)`,
      output: { type: 'text', data: 'Monthly revenue calculated\n' },
      status: 'idle' as const,
    },
    {
      id: 'cell-4',
      type: 'python' as const,
      code: `import matplotlib.pyplot as plt
plt.plot(monthly)
plt.title('Monthly Revenue')
plt.show()`,
      output: { type: 'chart', data: 'chart-visualization' },
      status: 'idle' as const,
    },
  ],
  metadata: { createdAt: new Date().toISOString() },
}

export const largeNotebook = {
  id: 'test-large',
  name: 'Large Notebook (50 cells)',
  cells: Array.from({ length: 50 }, (_, i) => ({
    id: `cell-${i + 1}`,
    type: ['python', 'markdown', 'sql'][i % 3] as const,
    code:
      i % 3 === 1
        ? `# Section ${i + 1}\n\nDescriptive text for section.`
        : i % 3 === 2
          ? `SELECT * FROM table_${i} LIMIT 5`
          : `print("Cell ${i + 1}")`,
    output: null,
    status: 'idle' as const,
  })),
  metadata: { createdAt: new Date().toISOString() },
}

export const errorNotebook = {
  id: 'test-errors',
  name: 'Notebook with Errors',
  cells: [
    {
      id: 'cell-1',
      type: 'python' as const,
      code: 'x = 1 / 0',
      output: { type: 'error', data: 'ZeroDivisionError: division by zero' },
      status: 'error' as const,
    },
    {
      id: 'cell-2',
      type: 'python' as const,
      code: 'print(undefined_variable)',
      output: { type: 'error', data: 'NameError: name "undefined_variable" is not defined' },
      status: 'error' as const,
    },
    {
      id: 'cell-3',
      type: 'python' as const,
      code: 'print("This will work")',
      output: { type: 'text', data: 'This will work\n' },
      status: 'idle' as const,
    },
  ],
  metadata: { createdAt: new Date().toISOString() },
}
