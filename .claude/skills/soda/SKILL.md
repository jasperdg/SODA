---
name: soda
description: Discover, evaluate, and verify SEDA oracle programs from the SODA registry. Find the right oracle for your use case, inspect source code, and verify builds match on-chain deployments.
user-invocable: true
---

# SODA: SEDA Oracle Directory for Agents

Use this skill to discover, evaluate, and verify SEDA oracle programs. SODA is a trust layer — it helps you go from "I need a price feed" to a verified, auditable oracle program ID you can deploy with confidence.

## What You Can Do

This skill supports four workflows, matching the SODA trust model:

1. **Search** — find programs by use case, tags, data source, or keyword
2. **Inspect** — read program metadata, schemas, and source code to understand what it does
3. **Verify build** — compile source code and confirm the hash matches the registered program ID
4. **Verify on-chain** — confirm the program ID exists on the SEDA network

## How to Handle Requests

### Step 1: Understand What the User Needs

When a user asks for an oracle program (e.g., "I need a price feed for my lending protocol"), figure out:

- **What kind of data?** (single price, cross-rate, batch, EMA, etc.)
- **Which data source?** (Pyth, dxFeed, Stork, etc.)
- **Which network?** (mainnet, testnet)
- **Any special requirements?** (session-awareness, binary output for FastAdapter, JSON output, etc.)

If the request is vague, ask clarifying questions before searching.

### Step 2: Search the Registry

The registry lives at `lists/seda.programs.json` in the SODA repo root. Individual program entries are in `programs/<slug>/program.json` with a corresponding `programs/<slug>/README.md`.

To search, read the consolidated list and filter by relevant fields:

```bash
# Read the full registry
cat lists/seda.programs.json

# Or search by keyword in program files
grep -r "price" programs/*/program.json
```

**Key fields to match on:**

| Field | Use For |
|-------|---------|
| `tags` | Category filtering (`crypto`, `pyth`, `ema`, `session-aware`, etc.) |
| `dataSources` | Data provider filtering |
| `description` | Semantic matching for use case |
| `inputSchema` | What the program expects |
| `outputSchema` | What the program returns |
| `deployments` | Which networks it's available on |

### Step 3: Present Results

When presenting matching programs, always include:

1. **Name and slug** — e.g., `synco-price-feed`
2. **What it does** — one-line description
3. **Program ID** — the `oracleProgramId` for the relevant network
4. **Input/Output** — what you send and what you get back
5. **Source repo** — link to the source code for audit

Format the response as a clear recommendation. If multiple programs match, rank them by relevance and explain trade-offs.

**Example response for "I need a price feed for a lending protocol":**

> **Recommended: `synco-price-feed`**
>
> Single-asset USD price via Pyth, encoded as a 64-byte binary payload for FastAdapter. This is purpose-built for lending protocols — Synco Finance uses it for their own lending protocol on Tempo testnet.
>
> - **Program ID (testnet):** `766d6b5fbc862f8b5ef452c16893e2bb3edbd053e1b824f9819745a26ac60d98`
> - **Input:** `{ "pyth_id": "0x...", "scale": 8 }`
> - **Output:** 64-byte binary `[padding][u128 price][padding][u64 timestamp]`
> - **Source:** https://github.com/jasperdg/synco/tree/main/packages/seda-programs/programs/price-feed
>
> For derived cross-rates (e.g., ETH/USDC), see `synco-cross-rate`.

### Step 4: Verify (When Asked)

If the user asks to verify a program, walk through the full trust chain:

#### 4a. Source Verification (compile and hash-compare)

Clone the source repo, compile to WASM, and compare the hash:

```bash
# Clone the source repository
git clone <repository-url> /tmp/soda-verify-<slug>
cd /tmp/soda-verify-<slug>

# IMPORTANT: Use the exact Rust toolchain from the deployment metadata.
# Check the program's `rustToolchain` field in program.json.
rustup install <version>   # e.g. rustup install 1.82.0
rustup target add wasm32-wasip1 --toolchain <version>

# Build the WASM oracle program with the pinned toolchain
cargo +<version> build --release --target wasm32-wasip1

# The compiled WASM is at:
# target/wasm32-wasip1/release/<program-name>.wasm

# Hash it and compare with the registered oracleProgramId
sha256sum target/wasm32-wasip1/release/<program-name>.wasm
```

Compare the resulting hash with the `oracleProgramId` from the program's registry entry. If they match, the source code compiles to the exact program that was deployed.

**IMPORTANT:** The build must be deterministic for this to work. Always use the Rust toolchain version specified in the deployment's `rustToolchain` field — different compiler versions produce different WASM output. Also check that the repo has a `Cargo.lock` (it should) and any specific build instructions in its README.

#### 4b. Source Code Audit

Read the source code and cross-reference against the program's declared purpose:

1. Read `programs/<slug>/program.json` — note the `description`, `inputSchema`, and `outputSchema`
2. Clone the `repository` URL
3. Read the execution phase source code (typically `src/execution_phase.rs` for Rust programs)
4. Confirm the code does what the metadata says:
   - Does it fetch from the declared data sources?
   - Does it accept the declared input format?
   - Does it produce the declared output format?
   - Are there any hidden behaviors not mentioned in the metadata?

Report your findings to the user clearly: what matches, what doesn't, and any concerns.

#### 4c. On-Chain Verification

Confirm the program ID exists on the SEDA network:

```bash
# Query the SEDA network for the program
# (requires seda-sdk CLI or direct RPC query)
npx seda-sdk oracle-program info <oracleProgramId> --rpc <seda-rpc-url>
```

## Available Tags

These are the standard tags used in the registry:

| Tag | Meaning |
|-----|---------|
| `crypto` | Cryptocurrency prices |
| `equities` | Stock market data |
| `fx` | Foreign exchange rates |
| `futures` | Futures contracts |
| `commodities` | Commodity prices |
| `rates` | Interest rates |
| `basic` | Simple price feed, no complex processing |
| `ema` | Exponential moving average |
| `session-aware` | Aware of market trading hours |
| `batch` | Multiple assets in one request |
| `real-time` | Live data |
| `pyth` | Uses Pyth Network |
| `pyth-pro` | Uses Pyth Pro (Benchmarks) API |
| `dxfeed` | Uses dxFeed |
| `stork` | Uses Stork |
| `hyperliquid` | Uses Hyperliquid |
| `multi-source` | Aggregates from multiple sources |
| `official` | Maintained by SEDA Protocol |
| `community` | Community contributed |

## Registry Schema Reference

Each `program.json` entry has this structure:

| Field | Required | Description |
|-------|----------|-------------|
| `slug` | Yes | URL-friendly identifier (lowercase, hyphens) |
| `name` | Yes | Human-readable name |
| `description` | Yes | What the program does (10-1000 chars) |
| `version` | Yes | Semantic version |
| `deployments` | Yes | Network deployments with `oracleProgramId` and `rustToolchain` |
| `author` | Yes | Name and optional GitHub handle |
| `inputSchema` | No | JSON Schema for program inputs |
| `outputSchema` | No | JSON Schema for program outputs |
| `dataSources` | No | Array of data sources (id, name, url, role) |
| `tags` | No | Categorization tags |
| `repository` | No | URL to source code |
| `examples` | No | Example inputs and expected outputs |
| `deprecated` | No | Whether the program is deprecated |
| `replacedBy` | No | Slug of replacement program |

## Adding a New Program

If the user wants to register their own oracle program in SODA:

1. Create `programs/<slug>/program.json` following the schema above
2. Create `programs/<slug>/README.md` documenting the program
3. Validate: `bun run validate`
4. Build the consolidated list: `bun run build`
5. Submit a PR

The slug must be lowercase with hyphens, match the directory name, and be unique.

## Troubleshooting

### No programs match the search
The registry may not have a program for every use case. Suggest the user:
- Check the [seda-oracle-programs](https://github.com/sedaprotocol/seda-oracle-programs) repo for official programs not yet registered
- Build their own using the existing programs as templates
- Contribute their program to SODA once deployed

### Build hash doesn't match
This could mean:
- Different Rust/toolchain version — always use the `rustToolchain` version from the deployment metadata in `program.json`
- Missing `Cargo.lock` (non-deterministic dependency resolution)
- Build was done with different flags or profile
- The deployed version doesn't match the current `main` branch — check the `gitCommitHash` in the deployment and build from that specific commit

### Can't verify on-chain
- Check you're querying the right SEDA network (mainnet vs testnet)
- The program may have been removed or superseded — check the `deprecated` and `replacedBy` fields
