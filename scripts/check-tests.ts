/**
 * Test Check Script
 * Identifies potential issues in test files without running them
 */

import fs from "fs";
import path from "path";

interface TestIssue {
  file: string;
  issues: string[];
}

const testDir = path.join(process.cwd(), "tests");
const issues: TestIssue[] = [];

function checkFile(filePath: string): TestIssue | null {
  const content = fs.readFileSync(filePath, "utf-8");
  const relativePath = path.relative(process.cwd(), filePath);
  const fileIssues: string[] = [];

  // Check for missing React import in .tsx files
  if (filePath.endsWith(".tsx")) {
    if (content.includes("JSX") || content.includes("<") && !content.includes('import') && !content.includes("from \"react\"")) {
      fileIssues.push("May need React import for JSX");
    }
  }

  // Check for missing vitest imports
  if (!content.includes("vitest") && !content.includes("@playwright/test") && !filePath.includes("msw")) {
    fileIssues.push("No test framework import");
  }

  // Check for common import issues
  if (content.includes("from \"@/") && !content.includes("import")) {
    fileIssues.push("Potential import syntax issue");
  }

  // Check for expect without import
  if (content.includes("expect(") && !content.includes("import") && !content.includes("expect") && !content.includes("from \"vitest\"")) {
    fileIssues.push("expect used but may not be imported");
  }

  // Check for describe without import
  if (content.includes("describe(") && !content.includes("from \"vitest\"") && !content.includes("from \"@playwright/test\"")) {
    fileIssues.push("describe used but may not be imported");
  }

  if (fileIssues.length > 0) {
    return { file: relativePath, issues: fileIssues };
  }
  return null;
}

function walkDir(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) {
    return fileList;
  }
  
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    try {
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        walkDir(filePath, fileList);
      } else if (
        file.endsWith(".test.ts") ||
        file.endsWith(".test.tsx") ||
        file.endsWith(".spec.ts")
      ) {
        fileList.push(filePath);
      }
    } catch (e) {
      // Skip files we can't read
    }
  });

  return fileList;
}

console.log("Checking test files for potential issues...\n");

const testFiles = walkDir(testDir);
console.log(`Found ${testFiles.length} test files\n`);

testFiles.forEach((file) => {
  try {
    const issue = checkFile(file);
    if (issue) {
      issues.push(issue);
    }
  } catch (e) {
    issues.push({
      file: path.relative(process.cwd(), file),
      issues: [`Error reading file: ${e}`],
    });
  }
});

if (issues.length > 0) {
  console.log("Files with potential issues:\n");
  issues.forEach(({ file, issues: fileIssues }) => {
    console.log(`  ${file}`);
    fileIssues.forEach((issue) => console.log(`    - ${issue}`));
  });
} else {
  console.log("✅ No obvious issues found in test files.");
}

console.log(`\nTotal test files checked: ${testFiles.length}`);
console.log(`Files with issues: ${issues.length}`);
