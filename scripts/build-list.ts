#!/usr/bin/env bun
/**
 * Builds the consolidated program list from individual program entries
 */

import Ajv from "ajv";
import addFormats from "ajv-formats";
import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import { join, resolve } from "path";

const ROOT_DIR = resolve(import.meta.dir, "..");
const PROGRAMS_DIR = join(ROOT_DIR, "programs");
const LISTS_DIR = join(ROOT_DIR, "lists");
const TAGS_FILE = join(ROOT_DIR, "tags", "standard-tags.json");
const SCHEMAS_DIR = join(ROOT_DIR, "schemas");
const OUTPUT_FILE = join(LISTS_DIR, "seda.programs.json");

interface ProgramEntry {
  slug: string;
  name: string;
  description: string;
  version: string;
  deployments: Record<string, unknown>;
  [key: string]: unknown;
}

interface ProgramList {
  name: string;
  description: string;
  timestamp: string;
  version: { major: number; minor: number; patch: number };
  keywords: string[];
  tags: Record<string, { name: string; description: string }>;
  programs: ProgramEntry[];
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
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

async function loadProgram(programSlug: string): Promise<ProgramEntry | null> {
  const programJsonPath = join(PROGRAMS_DIR, programSlug, "program.json");
  try {
    const content = await readFile(programJsonPath, "utf-8");
    return JSON.parse(content);
  } catch {
    console.warn(`  Warning: Could not load ${programSlug}/program.json`);
    return null;
  }
}

async function loadTags(): Promise<Record<string, { name: string; description: string }>> {
  try {
    const content = await readFile(TAGS_FILE, "utf-8");
    const tags = JSON.parse(content);
    // Remove $schema property if present
    delete tags.$schema;
    return tags;
  } catch {
    console.warn("  Warning: Could not load standard-tags.json");
    return {};
  }
}

async function getCurrentVersion(): Promise<{ major: number; minor: number; patch: number }> {
  try {
    const content = await readFile(OUTPUT_FILE, "utf-8");
    const existing = JSON.parse(content);
    return existing.version || { major: 1, minor: 0, patch: 0 };
  } catch {
    return { major: 1, minor: 0, patch: 0 };
  }
}

async function main() {
  console.log("SODA Registry Builder\n");
  console.log("=".repeat(50));

  // Initialize AJV for validation with draft-2020-12 support
  const ajv = new Ajv({
    allErrors: true,
    strict: false,
    validateSchema: false // Don't validate schemas against meta-schema
  });
  addFormats(ajv);

  const programSchema = await loadSchema("soda-program.schema.json");
  const listSchema = await loadSchema("soda-list.schema.json");

  ajv.addSchema(programSchema, "https://seda.xyz/schemas/soda-program.schema.json");
  ajv.addSchema(listSchema, "https://seda.xyz/schemas/soda-list.schema.json");

  // Load all programs
  console.log("\nLoading programs...");
  const programDirs = await getProgramDirs();
  const programs: ProgramEntry[] = [];

  for (const slug of programDirs) {
    const program = await loadProgram(slug);
    if (program) {
      // Validate program against schema
      const validate = ajv.getSchema("https://seda.xyz/schemas/soda-program.schema.json");
      if (validate && validate(program)) {
        programs.push(program);
        console.log(`  \x1b[32m\u2713\x1b[0m ${slug}`);
      } else {
        console.log(`  \x1b[31m\u2717\x1b[0m ${slug} (invalid schema)`);
      }
    }
  }

  // Load tags
  console.log("\nLoading tags...");
  const tags = await loadTags();
  console.log(`  Loaded ${Object.keys(tags).length} tag definitions`);

  // Get version
  const currentVersion = await getCurrentVersion();
  const newVersion = {
    major: currentVersion.major,
    minor: currentVersion.minor,
    patch: currentVersion.patch + 1,
  };

  // Build the list
  const list: ProgramList = {
    name: "SEDA Official Oracle Programs",
    description: "The official registry of SEDA oracle programs including community contributions",
    timestamp: new Date().toISOString(),
    version: newVersion,
    keywords: ["seda", "oracle", "price-feed", "blockchain", "defi"],
    tags,
    programs,
  };

  // Validate the final list
  console.log("\nValidating output...");
  const validateList = ajv.getSchema("https://seda.xyz/schemas/soda-list.schema.json");
  if (validateList && !validateList(list)) {
    console.error("\x1b[31mList validation failed:\x1b[0m");
    validateList.errors?.forEach((e) => {
      console.error(`  ${e.instancePath || "root"}: ${e.message}`);
    });
    process.exit(1);
  }

  // Ensure output directory exists
  await mkdir(LISTS_DIR, { recursive: true });

  // Write output
  const output = JSON.stringify(list, null, 2);
  await writeFile(OUTPUT_FILE, output, "utf-8");

  console.log(`\n\x1b[32mBuild complete!\x1b[0m`);
  console.log(`  Output: ${OUTPUT_FILE}`);
  console.log(`  Programs: ${programs.length}`);
  console.log(`  Version: ${newVersion.major}.${newVersion.minor}.${newVersion.patch}`);
  console.log("");
}

main().catch((error) => {
  console.error("Build failed:", error);
  process.exit(1);
});
