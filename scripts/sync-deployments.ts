#!/usr/bin/env bun
/**
 * Syncs deployment data from seda-oracle-programs repository
 * Creates or updates program entries based on deployed programs
 */

import { readFile, writeFile, mkdir, access } from "fs/promises";
import { join, resolve } from "path";

const ROOT_DIR = resolve(import.meta.dir, "..");
const PROGRAMS_DIR = join(ROOT_DIR, "programs");

// Path to seda-oracle-programs deployments
// Can be overridden via environment variable SEDA_ORACLE_PROGRAMS_DIR
const ORACLE_PROGRAMS_DIR = process.env.SEDA_ORACLE_PROGRAMS_DIR || "/Users/fluxper/seda/programs/seda-oracle-programs";
const MAINNET_DEPLOYMENTS = join(ORACLE_PROGRAMS_DIR, "deployments/deployed-programs-mainnet.json");
const TESTNET_DEPLOYMENTS = join(ORACLE_PROGRAMS_DIR, "deployments/deployed-programs-testnet.json");

interface Deployment {
  oracleProgramId: string;
  version?: string;
  dateDeployed: string;
  gitCommitHash: string;
}

interface ProgramMetadata {
  name: string;
  description: string;
  tags: string[];
  dataSources: Array<{ id: string; name: string; url?: string; role: "primary" | "secondary" }>;
}

// Metadata for known programs
const PROGRAM_METADATA: Record<string, ProgramMetadata> = {
  "pyth-basic": {
    name: "Pyth Basic Price Feed",
    description: "Fetches real-time price data from Pyth Network for a single asset. Returns the latest price with timestamp.",
    tags: ["crypto", "basic", "real-time", "pyth", "official"],
    dataSources: [{ id: "pyth", name: "Pyth Network", url: "https://pyth.network", role: "primary" }],
  },
  "pyth-pro-multi-ema": {
    name: "Pyth Pro Multi-Asset EMA",
    description: "Calculates exponential moving averages using Pyth Pro Benchmarks API. Supports multiple assets with configurable EMA periods.",
    tags: ["crypto", "ema", "pyth-pro", "batch", "official"],
    dataSources: [{ id: "pyth-pro", name: "Pyth Pro Benchmarks", url: "https://benchmarks.pyth.network", role: "primary" }],
  },
  "pyth-pro-basic": {
    name: "Pyth Pro Basic",
    description: "Fetches historical price data from Pyth Pro Benchmarks API for a single asset at a specific timestamp.",
    tags: ["crypto", "basic", "pyth-pro", "official"],
    dataSources: [{ id: "pyth-pro", name: "Pyth Pro Benchmarks", url: "https://benchmarks.pyth.network", role: "primary" }],
  },
  "pyth-pro-batch-crypto": {
    name: "Pyth Pro Batch Crypto",
    description: "Fetches prices for multiple cryptocurrency assets in a single request using Pyth Pro Benchmarks API.",
    tags: ["crypto", "batch", "pyth-pro", "official"],
    dataSources: [{ id: "pyth-pro", name: "Pyth Pro Benchmarks", url: "https://benchmarks.pyth.network", role: "primary" }],
  },
  "pyth-pro-futures-ema-with-discount": {
    name: "Pyth Pro Futures EMA with Discount",
    description: "Calculates EMA for futures contracts with discount rate computation using Pyth Pro Benchmarks API.",
    tags: ["futures", "ema", "discount", "pyth-pro", "official"],
    dataSources: [{ id: "pyth-pro", name: "Pyth Pro Benchmarks", url: "https://benchmarks.pyth.network", role: "primary" }],
  },
  "equities-session-aware-ema": {
    name: "Equities Session-Aware EMA",
    description: "Calculates EMA for equities with awareness of market trading sessions. Handles market open/close times correctly.",
    tags: ["equities", "ema", "session-aware", "dxfeed", "official"],
    dataSources: [{ id: "dxfeed", name: "dxFeed", url: "https://dxfeed.com", role: "primary" }],
  },
  "equities-session-aware": {
    name: "Equities Session-Aware",
    description: "Fetches equity prices with market session awareness. Returns appropriate prices based on market hours.",
    tags: ["equities", "session-aware", "dxfeed", "official"],
    dataSources: [{ id: "dxfeed", name: "dxFeed", url: "https://dxfeed.com", role: "primary" }],
  },
  "equities-session-aware-bid-ask": {
    name: "Equities Session-Aware Bid-Ask",
    description: "Fetches bid and ask prices for equities with market session awareness.",
    tags: ["equities", "session-aware", "bid-ask", "dxfeed", "official"],
    dataSources: [{ id: "dxfeed", name: "dxFeed", url: "https://dxfeed.com", role: "primary" }],
  },
  "ema-hyperliquid": {
    name: "Hyperliquid EMA",
    description: "Calculates exponential moving averages using price data from Hyperliquid exchange.",
    tags: ["crypto", "ema", "hyperliquid", "official"],
    dataSources: [{ id: "hyperliquid", name: "Hyperliquid", url: "https://hyperliquid.xyz", role: "primary" }],
  },
  "dxfeed-basic": {
    name: "dxFeed Basic",
    description: "Fetches real-time price data from dxFeed for equities, forex, and other traditional assets.",
    tags: ["equities", "fx", "basic", "real-time", "dxfeed", "official"],
    dataSources: [{ id: "dxfeed", name: "dxFeed", url: "https://dxfeed.com", role: "primary" }],
  },
  "dxfeed-session-aware-ema": {
    name: "dxFeed Session-Aware EMA",
    description: "Calculates EMA using dxFeed data with market session awareness for accurate pricing outside trading hours.",
    tags: ["equities", "ema", "session-aware", "dxfeed", "official"],
    dataSources: [{ id: "dxfeed", name: "dxFeed", url: "https://dxfeed.com", role: "primary" }],
  },
  "stork-multi-ema": {
    name: "Stork Multi-Asset EMA",
    description: "Calculates exponential moving averages for multiple assets using Stork price feeds.",
    tags: ["crypto", "ema", "batch", "stork", "official"],
    dataSources: [{ id: "stork", name: "Stork", url: "https://stork.network", role: "primary" }],
  },
  "futures-session-aware-ema-discount": {
    name: "Futures Session-Aware EMA with Discount",
    description: "Calculates EMA for futures contracts with session awareness and discount rate computation.",
    tags: ["futures", "ema", "session-aware", "discount", "dxfeed", "official"],
    dataSources: [{ id: "dxfeed", name: "dxFeed", url: "https://dxfeed.com", role: "primary" }],
  },
  "fx-session-aware-ema": {
    name: "FX Session-Aware EMA",
    description: "Calculates EMA for foreign exchange pairs with awareness of forex market sessions.",
    tags: ["fx", "ema", "session-aware", "dxfeed", "official"],
    dataSources: [{ id: "dxfeed", name: "dxFeed", url: "https://dxfeed.com", role: "primary" }],
  },
  "caplight": {
    name: "Caplight Private Markets",
    description: "Fetches private market data from Caplight for pre-IPO and private company valuations.",
    tags: ["equities", "official"],
    dataSources: [{ id: "caplight", name: "Caplight", url: "https://caplight.com", role: "primary" }],
  },
  "mantra-binbygate": {
    name: "MANTRA Binbygate",
    description: "Custom oracle program for MANTRA Chain integration using Binbygate data source.",
    tags: ["crypto", "official"],
    dataSources: [{ id: "binbygate", name: "Binbygate", role: "primary" }],
  },
  "candle-pyth-pro": {
    name: "Candlestick Pyth Pro",
    description: "Fetches OHLC candlestick data from Pyth Pro Benchmarks API for technical analysis.",
    tags: ["crypto", "candle", "pyth-pro", "official"],
    dataSources: [{ id: "pyth-pro", name: "Pyth Pro Benchmarks", url: "https://benchmarks.pyth.network", role: "primary" }],
  },
  "nyse-single-session-ema": {
    name: "NYSE Single Session EMA",
    description: "Calculates EMA specifically for NYSE-listed equities during trading hours.",
    tags: ["equities", "ema", "session-aware", "dxfeed", "official"],
    dataSources: [{ id: "dxfeed", name: "dxFeed", url: "https://dxfeed.com", role: "primary" }],
  },
  "nobi-session-aware": {
    name: "Nobi Session-Aware",
    description: "Session-aware price feeds for Nobi protocol integration.",
    tags: ["crypto", "session-aware", "official"],
    dataSources: [{ id: "nobi", name: "Nobi", role: "primary" }],
  },
  "vix-usde": {
    name: "VIX USDe",
    description: "Fetches VIX volatility index data for USDe protocol integration.",
    tags: ["rates", "official"],
    dataSources: [{ id: "cboe", name: "CBOE", url: "https://www.cboe.com", role: "primary" }],
  },
  "nunchi-regular-hours": {
    name: "Nunchi Regular Hours",
    description: "Price feeds for Nunchi protocol during regular market hours.",
    tags: ["equities", "session-aware", "official"],
    dataSources: [{ id: "dxfeed", name: "dxFeed", url: "https://dxfeed.com", role: "primary" }],
  },
  "nunchi-us-rates": {
    name: "Nunchi US Rates",
    description: "US interest rate data feeds for Nunchi protocol.",
    tags: ["rates", "official"],
    dataSources: [{ id: "dxfeed", name: "dxFeed", url: "https://dxfeed.com", role: "primary" }],
  },
  "equities-session-aware-ema-custom-quote": {
    name: "Equities Session-Aware EMA Custom Quote",
    description: "Session-aware EMA for equities with custom quote currency support.",
    tags: ["equities", "ema", "session-aware", "dxfeed", "official"],
    dataSources: [{ id: "dxfeed", name: "dxFeed", url: "https://dxfeed.com", role: "primary" }],
  },
};

function getDefaultMetadata(slug: string): ProgramMetadata {
  // Try to infer metadata from slug
  const tags: string[] = ["official"];
  const dataSources: Array<{ id: string; name: string; role: "primary" }> = [];

  if (slug.includes("pyth-pro")) {
    tags.push("pyth-pro");
    dataSources.push({ id: "pyth-pro", name: "Pyth Pro Benchmarks", role: "primary" });
  } else if (slug.includes("pyth")) {
    tags.push("pyth");
    dataSources.push({ id: "pyth", name: "Pyth Network", role: "primary" });
  }
  if (slug.includes("dxfeed")) {
    tags.push("dxfeed");
    dataSources.push({ id: "dxfeed", name: "dxFeed", role: "primary" });
  }
  if (slug.includes("stork")) {
    tags.push("stork");
    dataSources.push({ id: "stork", name: "Stork", role: "primary" });
  }
  if (slug.includes("hyperliquid")) {
    tags.push("hyperliquid");
    dataSources.push({ id: "hyperliquid", name: "Hyperliquid", role: "primary" });
  }
  if (slug.includes("ema")) tags.push("ema");
  if (slug.includes("session-aware")) tags.push("session-aware");
  if (slug.includes("basic")) tags.push("basic");
  if (slug.includes("batch")) tags.push("batch");
  if (slug.includes("equities")) tags.push("equities");
  if (slug.includes("futures")) tags.push("futures");
  if (slug.includes("fx")) tags.push("fx");
  if (slug.includes("crypto")) tags.push("crypto");
  if (slug.includes("discount")) tags.push("discount");

  return {
    name: slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    description: `SEDA oracle program: ${slug}`,
    tags,
    dataSources: dataSources.length > 0 ? dataSources : [{ id: "unknown", name: "Unknown", role: "primary" }],
  };
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function createProgramEntry(
  slug: string,
  mainnetDeployment?: Deployment,
  testnetDeployment?: Deployment
): Promise<void> {
  const programDir = join(PROGRAMS_DIR, slug);
  const programJsonPath = join(programDir, "program.json");
  const readmePath = join(programDir, "README.md");

  // Get metadata
  const metadata = PROGRAM_METADATA[slug] || getDefaultMetadata(slug);

  // Determine version
  const version = mainnetDeployment?.version || testnetDeployment?.version || "1.0.0";

  // Build deployments object
  const deployments: Record<string, object> = {};
  if (mainnetDeployment) {
    deployments.mainnet = {
      oracleProgramId: mainnetDeployment.oracleProgramId,
      dateDeployed: mainnetDeployment.dateDeployed,
      gitCommitHash: mainnetDeployment.gitCommitHash,
    };
  }
  if (testnetDeployment) {
    deployments.testnet = {
      oracleProgramId: testnetDeployment.oracleProgramId,
      dateDeployed: testnetDeployment.dateDeployed,
      gitCommitHash: testnetDeployment.gitCommitHash,
    };
  }

  const programEntry = {
    slug,
    name: metadata.name,
    description: metadata.description,
    version,
    deployments,
    dataSources: metadata.dataSources,
    tags: metadata.tags,
    repository: "https://github.com/sedaprotocol/seda-oracle-programs",
    author: {
      name: "SEDA Protocol",
      github: "sedaprotocol",
    },
  };

  // Create directory
  await mkdir(programDir, { recursive: true });

  // Write program.json
  await writeFile(programJsonPath, JSON.stringify(programEntry, null, 2), "utf-8");

  // Create README if it doesn't exist
  if (!(await fileExists(readmePath))) {
    const readme = `# ${metadata.name}

${metadata.description}

## Data Sources

${metadata.dataSources.map((ds) => `- **${ds.name}**${ds.url ? ` - [${ds.url}](${ds.url})` : ""}`).join("\n")}

## Usage

\`\`\`json
{
  "oracleProgramId": "${mainnetDeployment?.oracleProgramId || testnetDeployment?.oracleProgramId || "<program-id>"}"
}
\`\`\`

## Tags

${metadata.tags.map((t) => `\`${t}\``).join(" ")}

## Links

- [Source Code](https://github.com/sedaprotocol/seda-oracle-programs/tree/main/programs/${slug})
- [SEDA Documentation](https://docs.seda.xyz)
`;
    await writeFile(readmePath, readme, "utf-8");
  }
}

async function main() {
  console.log("SODA Deployment Sync\n");
  console.log("=".repeat(50));

  // Load deployments
  console.log("\nLoading deployments...");

  let mainnetDeployments: Record<string, Deployment> = {};
  let testnetDeployments: Record<string, Deployment> = {};

  try {
    const mainnetContent = await readFile(MAINNET_DEPLOYMENTS, "utf-8");
    mainnetDeployments = JSON.parse(mainnetContent);
    console.log(`  Mainnet: ${Object.keys(mainnetDeployments).length} programs`);
  } catch (error) {
    console.warn("  Warning: Could not load mainnet deployments");
  }

  try {
    const testnetContent = await readFile(TESTNET_DEPLOYMENTS, "utf-8");
    testnetDeployments = JSON.parse(testnetContent);
    console.log(`  Testnet: ${Object.keys(testnetDeployments).length} programs`);
  } catch (error) {
    console.warn("  Warning: Could not load testnet deployments");
  }

  // Get all unique program slugs
  const allSlugs = new Set([
    ...Object.keys(mainnetDeployments),
    ...Object.keys(testnetDeployments),
  ]);

  console.log(`\nSyncing ${allSlugs.size} programs...\n`);

  // Create/update each program
  for (const slug of Array.from(allSlugs).sort()) {
    const mainnet = mainnetDeployments[slug];
    const testnet = testnetDeployments[slug];

    await createProgramEntry(slug, mainnet, testnet);
    console.log(`  \x1b[32m\u2713\x1b[0m ${slug}`);
  }

  console.log(`\n\x1b[32mSync complete!\x1b[0m`);
  console.log(`  Created/updated ${allSlugs.size} program entries`);
  console.log(`  Run 'bun run validate' to verify\n`);
}

main().catch((error) => {
  console.error("Sync failed:", error);
  process.exit(1);
});
