/**
 * Code Templates System
 * Provides starter templates for all 15 languages with:
 * - Hello World examples
 * - Common patterns
 * - Auto-format configuration
 * - Auto-documentation rules
 * - Auto-completion setup
 */

import type { CellLanguage } from './languages'

export interface CodeTemplate {
  name: string
  description: string
  code: string
  autoFormat?: boolean
  autoDocument?: boolean
  autoComplete?: boolean
  tags: string[]
}

export interface LanguageTemplates {
  helloWorld: CodeTemplate
  basicFunction: CodeTemplate
  dataProcessing?: CodeTemplate
  errorHandling?: CodeTemplate
  asyncExample?: CodeTemplate
  testExample?: CodeTemplate
}

export interface FormatterConfig {
  command: string
  args: string[]
  formatOnSave: boolean
}

export interface DocumenterConfig {
  style: 'jsdoc' | 'sphinx' | 'rustdoc' | 'godoc' | 'javadoc'
  autoFormat: boolean
  commentPrefix: string
}

export interface CompleterConfig {
  provider: 'lsp' | 'builtin' | 'external'
  triggerChars: string[]
  autoTrigger: boolean
}

/**
 * Code Templates for all 15 languages
 */
export const LANGUAGE_TEMPLATES: Record<CellLanguage, LanguageTemplates> = {
  python: {
    helloWorld: {
      name: 'Hello World',
      description: 'Print a simple greeting',
      code: `print("Hello, Python!")`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['basic', 'io'],
    },
    basicFunction: {
      name: 'Function Definition',
      description: 'Define and call a function',
      code: `def greet(name: str) -> str:
    """Return a personalized greeting."""
    return f"Hello, {name}!"

result = greet("World")
print(result)`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['functions', 'typing'],
    },
    dataProcessing: {
      name: 'Pandas DataFrame',
      description: 'Load and process data',
      code: `import pandas as pd

# Create sample data
df = pd.DataFrame({
    'name': ['Alice', 'Bob', 'Charlie'],
    'age': [30, 25, 35],
    'city': ['NYC', 'LA', 'Chicago']
})

# Display summary
print(df.describe())
print(df[df['age'] > 25])`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['data', 'pandas'],
    },
    errorHandling: {
      name: 'Try-Except Block',
      description: 'Handle exceptions gracefully',
      code: `try:
    x = 10 / 0
except ZeroDivisionError as e:
    print(f"Error: {e}")
except Exception as e:
    print(f"Unexpected error: {e}")
finally:
    print("Cleanup done")`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['errors', 'exceptions'],
    },
    asyncExample: {
      name: 'Async/Await',
      description: 'Asynchronous execution',
      code: `import asyncio

async def fetch_data(delay: int) -> str:
    """Simulate fetching data."""
    await asyncio.sleep(delay)
    return f"Data after {delay}s"

async def main():
    result = await fetch_data(2)
    print(result)

asyncio.run(main())`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['async', 'concurrency'],
    },
    testExample: {
      name: 'Unit Test',
      description: 'pytest test case',
      code: `import pytest

def add(a: int, b: int) -> int:
    """Add two numbers."""
    return a + b

def test_add():
    assert add(2, 3) == 5
    assert add(-1, 1) == 0
    assert add(0, 0) == 0

if __name__ == "__main__":
    pytest.main([__file__, "-v"])`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['testing', 'pytest'],
    },
  },

  r: {
    helloWorld: {
      name: 'Hello World',
      description: 'Print output',
      code: `print("Hello, R!")`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['basic', 'io'],
    },
    basicFunction: {
      name: 'Function Definition',
      description: 'Define a function',
      code: `greet <- function(name) {
  # Return personalized greeting
  paste("Hello,", name)
}

result <- greet("World")
print(result)`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['functions'],
    },
    dataProcessing: {
      name: 'Data Frame Operations',
      description: 'Manipulate data with tidyverse',
      code: `library(tidyverse)

df <- data.frame(
  name = c("Alice", "Bob", "Charlie"),
  age = c(30, 25, 35),
  city = c("NYC", "LA", "Chicago")
)

df %>%
  filter(age > 25) %>%
  arrange(desc(age)) %>%
  select(name, age)`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['data', 'tidyverse'],
    },
    errorHandling: {
      name: 'Error Handling',
      description: 'Try-catch in R',
      code: `result <- tryCatch({
  x <- 10 / 0
}, error = function(e) {
  message("Caught error: ", e$message)
  NA
}, warning = function(w) {
  message("Warning: ", w$message)
})

print(result)`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['errors', 'exceptions'],
    },
    testExample: {
      name: 'Unit Test',
      description: 'testthat test case',
      code: `library(testthat)

add <- function(a, b) {
  # Add two numbers
  a + b
}

test_that("addition works", {
  expect_equal(add(2, 3), 5)
  expect_equal(add(-1, 1), 0)
  expect_equal(add(0, 0), 0)
})`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['testing', 'testthat'],
    },
  },

  julia: {
    helloWorld: {
      name: 'Hello World',
      description: 'Print greeting',
      code: `println("Hello, Julia!")`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['basic', 'io'],
    },
    basicFunction: {
      name: 'Function Definition',
      description: 'Define a function',
      code: `"""
    greet(name::String)

Return a personalized greeting.
"""
function greet(name::String)::String
    return "Hello, \$name!"
end

result = greet("World")
println(result)`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['functions', 'typing'],
    },
    dataProcessing: {
      name: 'Array Operations',
      description: 'Vectorized computation',
      code: `using Statistics

# Create arrays
x = 1:10
y = sin.(x)  # Vectorized sin

# Compute statistics
mean_y = mean(y)
std_y = std(y)

println("Mean: \$mean_y, Std: \$std_y")`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['data', 'arrays'],
    },
    errorHandling: {
      name: 'Try-Catch Block',
      description: 'Exception handling',
      code: `try
    x = 10 / 0
catch e
    if e isa DivideError
        println("Division by zero!")
    else
        println("Other error: \$e")
    end
finally
    println("Cleanup done")
end`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['errors', 'exceptions'],
    },
    testExample: {
      name: 'Unit Test',
      description: 'Test.jl test case',
      code: `using Test

function add(a::Int, b::Int)::Int
    """Add two integers."""
    return a + b
end

@testset "Addition tests" begin
    @test add(2, 3) == 5
    @test add(-1, 1) == 0
    @test add(0, 0) == 0
end`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['testing'],
    },
  },

  sql: {
    helloWorld: {
      name: 'Hello World',
      description: 'Simple SELECT',
      code: `SELECT 'Hello, SQL!' as greeting;`,
      autoFormat: true,
      autoDocument: false,
      autoComplete: true,
      tags: ['basic'],
    },
    basicFunction: {
      name: 'Query with Aggregation',
      description: 'GROUP BY and aggregates',
      code: `SELECT
    department,
    COUNT(*) as employee_count,
    AVG(salary) as avg_salary
FROM employees
GROUP BY department
ORDER BY avg_salary DESC;`,
      autoFormat: true,
      autoDocument: false,
      autoComplete: true,
      tags: ['aggregation'],
    },
    dataProcessing: {
      name: 'Complex Join',
      description: 'Multi-table join',
      code: `SELECT
    o.order_id,
    c.customer_name,
    p.product_name,
    o.quantity,
    (o.quantity * p.price) as total
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN products p ON o.product_id = p.id
WHERE o.order_date >= CURRENT_DATE - INTERVAL 30 DAY
ORDER BY o.order_date DESC;`,
      autoFormat: true,
      autoDocument: false,
      autoComplete: true,
      tags: ['joins', 'queries'],
    },
    errorHandling: {
      name: 'Error Handling',
      description: 'NULL handling and validation',
      code: `SELECT
    user_id,
    email,
    COALESCE(last_login, '1970-01-01') as last_login,
    CASE
        WHEN email IS NULL THEN 'INVALID'
        WHEN status = 'active' THEN 'ACTIVE'
        ELSE 'INACTIVE'
    END as user_status
FROM users
WHERE email IS NOT NULL
ORDER BY user_id;`,
      autoFormat: true,
      autoDocument: false,
      autoComplete: true,
      tags: ['validation', 'null-handling'],
    },
  },

  cpp: {
    helloWorld: {
      name: 'Hello World',
      description: 'Print greeting',
      code: `#include <iostream>
int main() {
    std::cout << "Hello, C++!" << std::endl;
    return 0;
}`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['basic', 'io'],
    },
    basicFunction: {
      name: 'Function with Types',
      description: 'Type-safe function',
      code: `#include <iostream>
#include <string>

// Return a personalized greeting
std::string greet(const std::string& name) {
    return "Hello, " + name + "!";
}

int main() {
    std::cout << greet("World") << std::endl;
    return 0;
}`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['functions', 'strings'],
    },
    dataProcessing: {
      name: 'Vector Operations',
      description: 'STL vectors',
      code: `#include <iostream>
#include <vector>
#include <algorithm>

int main() {
    std::vector<int> numbers = {3, 1, 4, 1, 5, 9};

    std::sort(numbers.begin(), numbers.end());

    for (int n : numbers) {
        std::cout << n << " ";
    }
    std::cout << std::endl;

    return 0;
}`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['data', 'stl'],
    },
  },

  rust: {
    helloWorld: {
      name: 'Hello World',
      description: 'Print greeting',
      code: `fn main() {
    println!("Hello, Rust!");
}`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['basic', 'io'],
    },
    basicFunction: {
      name: 'Function with Types',
      description: 'Type-safe function',
      code: `/// Return a personalized greeting
fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

fn main() {
    let greeting = greet("World");
    println!("{}", greeting);
}`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['functions', 'ownership'],
    },
    errorHandling: {
      name: 'Result Handling',
      description: 'Error handling with Result',
      code: `use std::fs::File;
use std::io::Read;

fn read_file(path: &str) -> Result<String, std::io::Error> {
    let mut file = File::open(path)?;
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;
    Ok(contents)
}

fn main() {
    match read_file("data.txt") {
        Ok(content) => println!("{}", content),
        Err(e) => eprintln!("Error: {}", e),
    }
}`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['errors', 'result'],
    },
  },

  go: {
    helloWorld: {
      name: 'Hello World',
      description: 'Print greeting',
      code: `package main

import "fmt"

func main() {
    fmt.Println("Hello, Go!")
}`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['basic', 'io'],
    },
    basicFunction: {
      name: 'Function Definition',
      description: 'Named return value',
      code: `package main

import "fmt"

// Greet returns a personalized greeting
func greet(name string) string {
    return "Hello, " + name + "!"
}

func main() {
    fmt.Println(greet("World"))
}`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['functions'],
    },
    asyncExample: {
      name: 'Goroutines',
      description: 'Concurrent execution',
      code: `package main

import (
    "fmt"
    "time"
)

func worker(id int, jobs <-chan int, results chan<- int) {
    for j := range jobs {
        fmt.Println("worker", id, "processing job", j)
        results <- j * 2
    }
}

func main() {
    jobs := make(chan int, 100)
    results := make(chan int, 100)

    for w := 1; w <= 3; w++ {
        go worker(w, jobs, results)
    }

    for j := 1; j <= 5; j++ {
        jobs <- j
    }
    close(jobs)

    for a := 1; a <= 5; a++ {
        <-results
    }
}`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['concurrency', 'goroutines'],
    },
  },

  scala: {
    helloWorld: {
      name: 'Hello World',
      description: 'Print greeting',
      code: `object Main {
  def main(args: Array[String]): Unit = {
    println("Hello, Scala!")
  }
}`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['basic', 'io'],
    },
    basicFunction: {
      name: 'Function Definition',
      description: 'Typed function',
      code: `// Return a personalized greeting
def greet(name: String): String = s"Hello, $name!"

val result = greet("World")
println(result)`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['functions'],
    },
    dataProcessing: {
      name: 'Collections',
      description: 'Scala collections',
      code: `val numbers = List(1, 2, 3, 4, 5)

val doubled = numbers.map(_ * 2)
val filtered = doubled.filter(_ > 5)

println(filtered)  // List(6, 8, 10)`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['collections', 'functional'],
    },
  },

  typescript: {
    helloWorld: {
      name: 'Hello World',
      description: 'Print greeting',
      code: `console.log("Hello, TypeScript!");`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['basic', 'io'],
    },
    basicFunction: {
      name: 'Typed Function',
      description: 'Type-safe function',
      code: `/**
 * Return a personalized greeting
 */
function greet(name: string): string {
    return \`Hello, \${name}!\`;
}

const result = greet("World");
console.log(result);`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['functions', 'typing'],
    },
    asyncExample: {
      name: 'Async/Await',
      description: 'Asynchronous execution',
      code: `async function fetchData(delay: number): Promise<string> {
    await new Promise(r => setTimeout(r, delay));
    return \`Data after \${delay}ms\`;
}

async function main(): Promise<void> {
    const result = await fetchData(2000);
    console.log(result);
}

main();`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['async', 'promises'],
    },
  },

  javascript: {
    helloWorld: {
      name: 'Hello World',
      description: 'Print greeting',
      code: `console.log("Hello, JavaScript!");`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['basic', 'io'],
    },
    basicFunction: {
      name: 'Function Definition',
      description: 'Arrow function',
      code: `const greet = (name) => {
    return \`Hello, \${name}!\`;
};

console.log(greet("World"));`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['functions', 'arrow-functions'],
    },
    asyncExample: {
      name: 'Async/Await',
      description: 'Promise-based async',
      code: `const fetchData = async (delay) => {
    await new Promise(r => setTimeout(r, delay));
    return \`Data after \${delay}ms\`;
};

(async () => {
    const result = await fetchData(2000);
    console.log(result);
})();`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['async', 'promises'],
    },
  },

  zig: {
    helloWorld: {
      name: 'Hello World',
      description: 'Print greeting',
      code: `const std = @import("std");

pub fn main() !void {
    const stdout = std.io.getStdOut().writer();
    try stdout.print("Hello, Zig!\\n", .{});
}`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['basic', 'io'],
    },
    basicFunction: {
      name: 'Function Definition',
      description: 'Typed function',
      code: `const std = @import("std");

fn greet(allocator: std.mem.Allocator, name: []const u8) ![]u8 {
    return std.fmt.allocPrint(allocator, "Hello, {}!", .{name});
}

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    const greeting = try greet(allocator, "World");
    defer allocator.free(greeting);

    const stdout = std.io.getStdOut().writer();
    try stdout.print("{}\\n", .{greeting});
}`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['functions', 'memory'],
    },
  },

  cuda: {
    helloWorld: {
      name: 'Hello World',
      description: 'Simple kernel',
      code: `#include <stdio.h>

__global__ void helloKernel() {
    printf("Hello from GPU!\\n");
}

int main() {
    helloKernel<<<1, 1>>>();
    cudaDeviceSynchronize();
    return 0;
}`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['basic', 'gpu'],
    },
    basicFunction: {
      name: 'Vector Addition',
      description: 'Parallel computation',
      code: `__global__ void add(float *a, float *b, float *c, int n) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i < n) {
        c[i] = a[i] + b[i];
    }
}

int main() {
    int n = 1000;
    float *d_a, *d_b, *d_c;

    cudaMalloc(&d_a, n * sizeof(float));
    cudaMalloc(&d_b, n * sizeof(float));
    cudaMalloc(&d_c, n * sizeof(float));

    add<<<(n+255)/256, 256>>>(d_a, d_b, d_c, n);

    cudaFree(d_a);
    cudaFree(d_b);
    cudaFree(d_c);

    return 0;
}`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['gpu', 'parallel'],
    },
  },

  mojo: {
    helloWorld: {
      name: 'Hello World',
      description: 'Print greeting',
      code: `def main():
    print("Hello, Mojo!")

main()`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['basic', 'io'],
    },
    basicFunction: {
      name: 'Function Definition',
      description: 'Typed function',
      code: `def greet(name: String) -> String:
    return "Hello, " + name + "!"

def main():
    result = greet("World")
    print(result)

main()`,
      autoFormat: true,
      autoDocument: true,
      autoComplete: true,
      tags: ['functions', 'typing'],
    },
  },

  markdown: {
    helloWorld: {
      name: 'Heading',
      description: 'Markdown heading',
      code: `# Hello, Markdown!

This is a paragraph with **bold** and *italic* text.`,
      autoFormat: true,
      autoDocument: false,
      autoComplete: true,
      tags: ['basic'],
    },
    basicFunction: {
      name: 'Code Block',
      description: 'Markdown code example',
      code: `# Code Example

\`\`\`python
def greet(name):
    return f"Hello, {name}!"
\`\`\`

- Item 1
- Item 2
- Item 3`,
      autoFormat: true,
      autoDocument: false,
      autoComplete: true,
      tags: ['code', 'lists'],
    },
  },

  raw: {
    helloWorld: {
      name: 'Plain Text',
      description: 'Simple text',
      code: `Hello, Plain Text!`,
      autoFormat: false,
      autoDocument: false,
      autoComplete: false,
      tags: ['basic'],
    },
    basicFunction: {
      name: 'Multi-line',
      description: 'Multiple lines',
      code: `Line 1
Line 2
Line 3`,
      autoFormat: false,
      autoDocument: false,
      autoComplete: false,
      tags: ['text'],
    },
  },
}

/**
 * Auto-format configuration per language
 */
export const FORMATTER_CONFIG: Record<CellLanguage, FormatterConfig | null> = {
  python: { command: 'black', args: ['-'], formatOnSave: true },
  r: { command: 'styler', args: [], formatOnSave: true },
  julia: { command: 'juliafmt', args: [], formatOnSave: true },
  sql: { command: 'sqlparse', args: [], formatOnSave: true },
  cpp: { command: 'clang-format', args: ['-style=LLVM'], formatOnSave: true },
  rust: { command: 'rustfmt', args: [], formatOnSave: true },
  go: { command: 'gofmt', args: [], formatOnSave: true },
  scala: { command: 'scalafmt', args: [], formatOnSave: true },
  zig: { command: 'zig fmt', args: [], formatOnSave: true },
  cuda: { command: 'clang-format', args: ['-style=LLVM'], formatOnSave: true },
  mojo: { command: 'mojo fmt', args: [], formatOnSave: true },
  typescript: { command: 'prettier', args: ['--parser', 'typescript'], formatOnSave: true },
  javascript: { command: 'prettier', args: ['--parser', 'babel'], formatOnSave: true },
  markdown: { command: 'prettier', args: ['--parser', 'markdown'], formatOnSave: true },
  raw: null,
}

/**
 * Auto-documentation configuration
 */
export const DOCUMENTER_CONFIG: Record<CellLanguage, DocumenterConfig | null> = {
  python: { style: 'sphinx', autoFormat: true, commentPrefix: '"""' },
  r: { style: 'godoc', autoFormat: true, commentPrefix: '#\'' },
  julia: { style: 'godoc', autoFormat: true, commentPrefix: '"""' },
  sql: null,
  cpp: { style: 'javadoc', autoFormat: true, commentPrefix: '/**' },
  rust: { style: 'rustdoc', autoFormat: true, commentPrefix: '///' },
  go: { style: 'godoc', autoFormat: true, commentPrefix: '//' },
  scala: { style: 'javadoc', autoFormat: true, commentPrefix: '/**' },
  zig: { style: 'godoc', autoFormat: true, commentPrefix: '///' },
  cuda: { style: 'javadoc', autoFormat: true, commentPrefix: '/**' },
  mojo: { style: 'sphinx', autoFormat: true, commentPrefix: '"""' },
  typescript: { style: 'jsdoc', autoFormat: true, commentPrefix: '/**' },
  javascript: { style: 'jsdoc', autoFormat: true, commentPrefix: '/**' },
  markdown: null,
  raw: null,
}

/**
 * Auto-completion configuration
 */
export const COMPLETER_CONFIG: Record<CellLanguage, CompleterConfig | null> = {
  python: { provider: 'lsp', triggerChars: ['.', '@'], autoTrigger: true },
  r: { provider: 'builtin', triggerChars: ['$', '@'], autoTrigger: true },
  julia: { provider: 'lsp', triggerChars: ['.'], autoTrigger: true },
  sql: { provider: 'builtin', triggerChars: [' ', '\n'], autoTrigger: true },
  cpp: { provider: 'lsp', triggerChars: ['.', '::', '->'], autoTrigger: true },
  rust: { provider: 'lsp', triggerChars: ['.', ':'], autoTrigger: true },
  go: { provider: 'lsp', triggerChars: ['.'], autoTrigger: true },
  scala: { provider: 'lsp', triggerChars: ['.'], autoTrigger: true },
  zig: { provider: 'lsp', triggerChars: ['.'], autoTrigger: true },
  cuda: { provider: 'lsp', triggerChars: ['.', '->', '::'], autoTrigger: true },
  mojo: { provider: 'lsp', triggerChars: ['.'], autoTrigger: true },
  typescript: { provider: 'lsp', triggerChars: ['.', '@'], autoTrigger: true },
  javascript: { provider: 'lsp', triggerChars: ['.'], autoTrigger: true },
  markdown: null,
  raw: null,
}

/**
 * Get templates for a language
 */
export function getTemplates(language: CellLanguage): CodeTemplate[] {
  const templates = LANGUAGE_TEMPLATES[language]
  if (!templates) return []

  return [
    templates.helloWorld,
    templates.basicFunction,
    templates.dataProcessing,
    templates.errorHandling,
    templates.asyncExample,
    templates.testExample,
  ].filter((t) => t !== undefined) as CodeTemplate[]
}

/**
 * Get formatter for a language
 */
export function getFormatter(language: CellLanguage): FormatterConfig | null {
  return FORMATTER_CONFIG[language] ?? null
}

/**
 * Get documenter for a language
 */
export function getDocumenter(language: CellLanguage): DocumenterConfig | null {
  return DOCUMENTER_CONFIG[language] ?? null
}

/**
 * Get completer for a language
 */
export function getCompleter(language: CellLanguage): CompleterConfig | null {
  return COMPLETER_CONFIG[language] ?? null
}
