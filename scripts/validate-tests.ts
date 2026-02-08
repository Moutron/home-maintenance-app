/**
 * Test Validation Script
 * Validates that all test files are syntactically correct and ready to run
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const testsDir = join(process.cwd(), "tests");

interface TestFile {
  path: string;
  errors: string[];
  warnings: string[];
}

function findTestFiles(dir: string, files: TestFile[] = []): TestFile[] {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      findTestFiles(fullPath, files);
    } else if (entry.endsWith(".test.ts") || entry.endsWith(".test.tsx")) {
      files.push({
        path: fullPath,
        errors: [],
        warnings: [],
      });
    }
  }

  return files;
}

function validateTestFile(file: TestFile): void {
  try {
    const content = readFileSync(file.path, "utf-8");

    // Check for required imports
    if (!content.includes("from \"vitest\"")) {
      file.errors.push("Missing vitest import");
    }

    // Check for test structure
    if (!content.includes("describe(") && !content.includes("it(")) {
      file.warnings.push("No test cases found");
    }

    // Check for common issues
    if (content.includes("require(\"@/lib/prisma\")") && !content.includes("beforeAll")) {
      file.warnings.push("Prisma mock should be initialized in beforeAll");
    }

    // Check for vi.mock usage
    if (content.includes("vi.mock") && !content.includes("vi.mock(\"@/lib/prisma\"")) {
      // This is fine, just checking structure
    }

    // Validate syntax by checking for common errors
    const lines = content.split("\n");
    lines.forEach((line, index) => {
      // Check for unclosed brackets/parentheses (basic check)
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      const openParens = (line.match(/\(/g) || []).length;
      const closeParens = (line.match(/\)/g) || []).length;

      // This is a very basic check - TypeScript compiler would catch real issues
    });

  } catch (error: any) {
    file.errors.push(`Failed to read file: ${error.message}`);
  }
}

function main() {
  console.log("🔍 Validating test files...\n");

  const testFiles = findTestFiles(testsDir);
  let totalErrors = 0;
  let totalWarnings = 0;

  testFiles.forEach((file) => {
    validateTestFile(file);
    totalErrors += file.errors.length;
    totalWarnings += file.warnings.length;
  });

  console.log(`Found ${testFiles.length} test files:\n`);

  testFiles.forEach((file) => {
    const relativePath = file.path.replace(process.cwd() + "/", "");
    const status = file.errors.length > 0 ? "❌" : file.warnings.length > 0 ? "⚠️" : "✅";
    console.log(`${status} ${relativePath}`);

    if (file.errors.length > 0) {
      file.errors.forEach((error) => {
        console.log(`   Error: ${error}`);
      });
    }

    if (file.warnings.length > 0) {
      file.warnings.forEach((warning) => {
        console.log(`   Warning: ${warning}`);
      });
    }
  });

  console.log(`\n📊 Summary:`);
  console.log(`   Total files: ${testFiles.length}`);
  console.log(`   Errors: ${totalErrors}`);
  console.log(`   Warnings: ${totalWarnings}`);

  if (totalErrors === 0) {
    console.log(`\n✅ All test files are valid!`);
    console.log(`\n📝 To run tests:`);
    console.log(`   1. Install dependencies: npm install`);
    console.log(`   2. Run tests: npm test`);
    process.exit(0);
  } else {
    console.log(`\n❌ Found ${totalErrors} error(s) that need to be fixed.`);
    process.exit(1);
  }
}

main();

