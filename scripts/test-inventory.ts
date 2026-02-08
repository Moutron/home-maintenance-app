/**
 * Test Inventory Script
 * Checks for common issues in test files
 */

import fs from "fs";
import path from "path";

const testDir = path.join(process.cwd(), "tests");

function checkTestFile(filePath: string): { file: string; issues: string[] } {
  const issues: string[] = [];
  const content = fs.readFileSync(filePath, "utf-8");
  const relativePath = path.relative(process.cwd(), filePath);

  // Check for common issues
  if (content.includes("import.*from") && !content.match(/import\s+\{?[\w\s,{}]+\}?\s+from/)) {
    // This is just a pattern check
  }

  // Check for missing React import in .tsx files
  if (filePath.endsWith(".tsx") && !content.includes("import") && content.includes("JSX")) {
    issues.push("Missing React import");
  }

  // Check for vitest imports
  if (!content.includes("vitest") && !content.includes("@playwright/test")) {
    issues.push("No test framework import found");
  }

  return { file: relativePath, issues };
}

function walkDir(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      walkDir(filePath, fileList);
    } else if (file.endsWith(".test.ts") || file.endsWith(".test.tsx") || file.endsWith(".spec.ts")) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

const testFiles = walkDir(testDir);
console.log(`Found ${testFiles.length} test files\n`);

const results = testFiles.map(checkTestFile).filter((r) => r.issues.length > 0);

if (results.length > 0) {
  console.log("Files with potential issues:\n");
  results.forEach(({ file, issues }) => {
    console.log(`  ${file}`);
    issues.forEach((issue) => console.log(`    - ${issue}`));
  });
} else {
  console.log("No obvious issues found in test files.");
}

console.log(`\nTotal test files: ${testFiles.length}`);
