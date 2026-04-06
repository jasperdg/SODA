#!/usr/bin/env bun
/**
 * Syncs deployment data from seda-oracle-programs repository.
 *
 * For programs that already have a program.json, only the deployments
 * field is updated. For new programs a minimal skeleton is created that
 * should be filled in manually.
 *
 * Usage:
 *   SEDA_ORACLE_PROGRAMS_DIR=/path/to/seda-oracle-programs bun run sync
 */

import { readFile, writeFile, mkdir, access } from "fs/promises";
import { join, resolve } from "path";

const ROOT_DIR = resolve(import.meta.dir, "..");
const PROGRAMS_DIR = join(ROOT_DIR, "programs");

const ORACLE_PROGRAMS_DIR =
  process.env.SEDA_ORACLE_PROGRAMS_DIR ||
  resolve(ROOT_DIR, "../programs/seda-oracle-programs");
const MAINNET_DEPLOYMENTS = join(
  ORACLE_PROGRAMS_DIR,
  "deployments/deployed-programs-mainnet.json"
);
const TESTNET_DEPLOYMENTS = join(
  ORACLE_PROGRAMS_DIR,
  "deployments/deployed-programs-testnet.json"
);

interface Deployment {
  oracleProgramId: string;
  version?: string;
  dateDeployed: string;
  gitCommitHash: string;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function loadJson(path: string): Promise<Record<string, Deployment>> {
  try {
    return JSON.parse(await readFile(path, "utf-8"));
  } catch {
    return {};
  }
}

function buildDeploymentEntry(d: Deployment): Record<string, string> {
  const entry: Record<string, string> = {
    oracleProgramId: d.oracleProgramId,
    dateDeployed: d.dateDeployed,
    gitCommitHash: d.gitCommitHash,
  };
  return entry;
}

async function updateExistingProgram(
  programJsonPath: string,
  mainnet?: Deployment,
  testnet?: Deployment
): Promise<void> {
  const program = JSON.parse(await readFile(programJsonPath, "utf-8"));

  const deployments: Record<string, object> = { ...program.deployments };
  if (mainnet) deployments.mainnet = buildDeploymentEntry(mainnet);
  if (testnet) deployments.testnet = buildDeploymentEntry(testnet);
  program.deployments = deployments;

  // Update version if the deployment provides one
  const version = mainnet?.version || testnet?.version;
  if (version) program.version = version;

  await writeFile(programJsonPath, JSON.stringify(program, null, 2) + "\n", "utf-8");
}

async function createSkeletonProgram(
  slug: string,
  mainnet?: Deployment,
  testnet?: Deployment
): Promise<void> {
  const programDir = join(PROGRAMS_DIR, slug);
  await mkdir(programDir, { recursive: true });

  const deployments: Record<string, object> = {};
  if (mainnet) deployments.mainnet = buildDeploymentEntry(mainnet);
  if (testnet) deployments.testnet = buildDeploymentEntry(testnet);

  const version = mainnet?.version || testnet?.version || "1.0.0";

  const program = {
    slug,
    name: slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    description: "TODO: Add description",
    version,
    deployments,
    dataSources: [],
    tags: ["official"],
    repository: "https://github.com/sedaprotocol/seda-oracle-programs",
    author: {
      name: "SEDA Protocol",
      github: "sedaprotocol",
    },
  };

  const programJsonPath = join(programDir, "program.json");
  await writeFile(programJsonPath, JSON.stringify(program, null, 2) + "\n", "utf-8");

  // Create a minimal README if missing
  const readmePath = join(programDir, "README.md");
  if (!(await fileExists(readmePath))) {
    await writeFile(
      readmePath,
      `# ${program.name}\n\nTODO: Add documentation\n`,
      "utf-8"
    );
  }
}

async function main() {
  console.log("SODA Deployment Sync\n");
  console.log("=".repeat(50));
  console.log(`\nSource: ${ORACLE_PROGRAMS_DIR}`);

  // Load deployments
  console.log("\nLoading deployments...");
  const mainnetDeployments = await loadJson(MAINNET_DEPLOYMENTS);
  const testnetDeployments = await loadJson(TESTNET_DEPLOYMENTS);
  console.log(`  Mainnet: ${Object.keys(mainnetDeployments).length} programs`);
  console.log(`  Testnet: ${Object.keys(testnetDeployments).length} programs`);

  const allSlugs = new Set([
    ...Object.keys(mainnetDeployments),
    ...Object.keys(testnetDeployments),
  ]);

  console.log(`\nSyncing ${allSlugs.size} programs...\n`);

  let updated = 0;
  let created = 0;

  for (const slug of Array.from(allSlugs).sort()) {
    const mainnet = mainnetDeployments[slug];
    const testnet = testnetDeployments[slug];
    const programJsonPath = join(PROGRAMS_DIR, slug, "program.json");

    if (await fileExists(programJsonPath)) {
      await updateExistingProgram(programJsonPath, mainnet, testnet);
      console.log(`  \x1b[32m\u2713\x1b[0m ${slug} (updated)`);
      updated++;
    } else {
      await createSkeletonProgram(slug, mainnet, testnet);
      console.log(`  \x1b[33m+\x1b[0m ${slug} (created skeleton — needs manual editing)`);
      created++;
    }
  }

  console.log(`\n\x1b[32mSync complete!\x1b[0m`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Created: ${created}`);
  if (created > 0) {
    console.log(
      `\n  \x1b[33mNote:\x1b[0m New skeletons have TODO fields — fill in descriptions, tags, and data sources.`
    );
  }
  console.log(`\n  Run 'bun run validate' to verify\n`);
}

main().catch((error) => {
  console.error("Sync failed:", error);
  process.exit(1);
});
