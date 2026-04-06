#!/usr/bin/env bun
/**
 * Validates all program.json files against the SODA schema
 */

import Ajv from "ajv";
import addFormats from "ajv-formats";
import { readdir, readFile } from "fs/promises";
import { join, resolve } from "path";

const ROOT_DIR = resolve(import.meta.dir, "..");
const PROGRAMS_DIR = join(ROOT_DIR, "programs");
const SCHEMAS_DIR = join(ROOT_DIR, "schemas");

interface ValidationResult {
  program: string;
  valid: boolean;
  errors?: string[];
}

async function loadSchema(filename: string): Promise<object> {
  const content = await readFile(join(SCHEMAS_DIR, filename), "utf-8");
  return JSON.parse(content);
}

async function getProgramDirs(): Promise<string[]> {
  try {
    const entries = await readdir(PROGRAMS_DIR, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

async function validateProgram(
  ajv: Ajv,
  programSlug: string
): Promise<ValidationResult> {
  const programDir = join(PROGRAMS_DIR, programSlug);
  const programJsonPath = join(programDir, "program.json");

  try {
    const content = await readFile(programJsonPath, "utf-8");
    const program = JSON.parse(content);

    const validate = ajv.getSchema(
      "https://seda.xyz/schemas/soda-program.schema.json"
    );
    if (!validate) {
      return {
        program: programSlug,
        valid: false,
        errors: ["Schema not loaded"],
      };
    }

    const valid = validate(program);
    if (!valid) {
      return {
        program: programSlug,
        valid: false,
        errors: validate.errors?.map(
          (e) => `${e.instancePath || "root"}: ${e.message}`
        ),
      };
    }

    // Additional validation: slug must match directory name
    if (program.slug !== programSlug) {
      return {
        program: programSlug,
        valid: false,
        errors: [
          `Slug "${program.slug}" does not match directory name "${programSlug}"`,
        ],
      };
    }

    // Check for README.md
    try {
      await readFile(join(programDir, "README.md"), "utf-8");
    } catch {
      return {
        program: programSlug,
        valid: false,
        errors: ["Missing README.md file"],
      };
    }

    return { program: programSlug, valid: true };
  } catch (error) {
    return {
      program: programSlug,
      valid: false,
      errors: [
        error instanceof Error ? error.message : "Unknown error reading file",
      ],
    };
  }
}

async function main() {
  console.log("SODA Registry Validator\n");
  console.log("=".repeat(50));

  // Initialize AJV with draft-2020-12 support
  const ajv = new Ajv({
    allErrors: true,
    strict: false,
    validateSchema: false // Don't validate schemas against meta-schema
  });
  addFormats(ajv);

  // Load schemas
  console.log("\nLoading schemas...");
  const programSchema = await loadSchema("soda-program.schema.json");
  const listSchema = await loadSchema("soda-list.schema.json");

  ajv.addSchema(programSchema, "https://seda.xyz/schemas/soda-program.schema.json");
  ajv.addSchema(listSchema, "https://seda.xyz/schemas/soda-list.schema.json");

  console.log("  - soda-program.schema.json");
  console.log("  - soda-list.schema.json");

  // Get all program directories
  const programDirs = await getProgramDirs();
  console.log(`\nFound ${programDirs.length} programs to validate\n`);

  if (programDirs.length === 0) {
    console.log("No programs found in programs/ directory");
    process.exit(0);
  }

  // Validate each program
  const results: ValidationResult[] = [];
  for (const programSlug of programDirs) {
    const result = await validateProgram(ajv, programSlug);
    results.push(result);

    const status = result.valid ? "\x1b[32m\u2713\x1b[0m" : "\x1b[31m\u2717\x1b[0m";
    console.log(`${status} ${programSlug}`);
    if (!result.valid && result.errors) {
      result.errors.forEach((e) => console.log(`    \x1b[31m- ${e}\x1b[0m`));
    }
  }

  // Summary
  const passed = results.filter((r) => r.valid).length;
  const failed = results.filter((r) => !r.valid).length;

  console.log("\n" + "=".repeat(50));
  console.log(`\nResults: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }

  console.log("\n\x1b[32mAll programs validated successfully!\x1b[0m\n");
}

main().catch((error) => {
  console.error("Validation failed:", error);
  process.exit(1);
});
