# SODA: SEDA Oracle Directory for Agents

A verifiable discovery layer for SEDA oracle programs, designed for AI agents and developers. A machine-readable registry where every program can be independently verified — not just discovered.

## Why SODA?

AI agents operating in DeFi need to autonomously find, evaluate, and integrate oracle programs. But a program ID is just a 64-character hex string — it tells you nothing about what it does, where the data comes from, or whether you should trust it.

SODA solves this by pairing each program ID with structured metadata (schemas, descriptions, data sources) **and** a path to verify it from source. An agent can:

1. **Discover** — search the registry by tags, data sources, or schemas to find programs that match its needs
2. **Inspect** — read the source code and cross-reference it against the declared description and schemas to judge whether the program actually does what it claims
3. **Verify from source** — clone the repository, compile the code to WASM, and confirm the resulting hash matches the registered `oracleProgramId`
4. **Verify on-chain** — confirm the program ID is actually deployed and active on the SEDA network

This makes SODA a **trust layer**: instead of blindly using a program ID someone gave you, an agent can independently prove that the source code, the compiled artifact, and the on-chain deployment all match — and that the logic does what the metadata says it does.

## Overview

Each program entry in the registry includes:

- **Program IDs** for mainnet and testnet deployments
- **Input/Output schemas** for machine-readable integration
- **Metadata** including data sources, tags, and documentation
- **Repository links** pointing to auditable source code
- **Version history** tracking deployments over time

## Quick Start

### Using the Registry

The consolidated program list is available at:

```
lists/seda.programs.json
```

Example: Finding a program by slug

```typescript
import programs from './lists/seda.programs.json';

const priceFeed = programs.programs.find(p => p.slug === 'synco-price-feed');
console.log(priceFeed.deployments.testnet.oracleProgramId);
// 766d6b5fbc862f8b5ef452c16893e2bb3edbd053e1b824f9819745a26ac60d98
```

### Available Programs

| Program | Description | Networks |
|---------|-------------|----------|
| `synco-price-feed` | Single-asset USD price via Pyth, encoded as 64-byte binary for FastAdapter | testnet |
| `synco-cross-rate` | Derived cross-rate between two Pyth feeds (base / quote), returned as JSON | testnet |

## Contributing

We welcome community contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

### Quick Contribution Guide

1. **Fork** this repository
2. **Create** a new directory under `programs/<your-program-slug>/`
3. **Add** `program.json` following the [program schema](schemas/soda-program.schema.json)
4. **Add** `README.md` with documentation
5. **Validate** locally with `bun run validate`
6. **Submit** a pull request

### Program Entry Structure

```json
{
  "slug": "my-program",
  "name": "My Custom Oracle Program",
  "description": "Description of what this program does...",
  "version": "1.0.0",
  "deployments": {
    "testnet": {
      "oracleProgramId": "abc123...",
      "dateDeployed": "2026-04-01T00:00:00.000Z"
    }
  },
  "inputSchema": {
    "type": "object",
    "required": ["asset_id"],
    "properties": {
      "asset_id": { "type": "string" }
    }
  },
  "outputSchema": {
    "type": "object",
    "required": ["price"],
    "properties": {
      "price": { "type": "string" }
    }
  },
  "dataSources": [
    { "id": "my-source", "name": "My Data Source", "role": "primary" }
  ],
  "tags": ["crypto", "basic"],
  "repository": "https://github.com/my-org/my-program",
  "author": {
    "name": "My Organization",
    "github": "my-org"
  }
}
```

## Development

### Prerequisites

- [Bun](https://bun.sh) v1.0+

### Setup

```bash
# Install dependencies
bun install

# Validate all programs
bun run validate

# Build consolidated list
bun run build

# Sync from seda-oracle-programs (maintainers only)
bun run sync
```

### Directory Structure

```
SODA/
├── schemas/                    # JSON Schema definitions
│   ├── soda-list.schema.json   # Root list format
│   └── soda-program.schema.json # Program entry format
├── programs/                   # Individual program entries
│   ├── synco-price-feed/
│   │   ├── program.json
│   │   └── README.md
│   ├── synco-cross-rate/
│   │   ├── program.json
│   │   └── README.md
│   └── .../
├── lists/                      # Built outputs
│   └── seda.programs.json      # Consolidated registry
├── tags/                       # Tag definitions
│   └── standard-tags.json
├── scripts/                    # Build and validation scripts
└── .github/                    # CI/CD configuration
```

## Tags

Programs are categorized using standard tags:

| Tag | Description |
|-----|-------------|
| `crypto` | Cryptocurrency prices |
| `equities` | Stock market data |
| `fx` | Foreign exchange rates |
| `futures` | Futures contracts |
| `ema` | Exponential moving average |
| `session-aware` | Market session awareness |
| `batch` | Multi-asset requests |
| `pyth` | Pyth Network source |
| `dxfeed` | dxFeed source |
| `official` | SEDA Protocol maintained |
| `community` | Community contributed |

See [tags/standard-tags.json](tags/standard-tags.json) for the full list.

## Schema Validation

All program entries are validated against JSON Schema on submission:

- `schemas/soda-program.schema.json` - Individual program validation
- `schemas/soda-list.schema.json` - Consolidated list validation

## License

MIT License - See [LICENSE](LICENSE) for details.

## Links

- [SEDA Protocol](https://seda.xyz)
- [SEDA Documentation](https://docs.seda.xyz)
- [Synco Finance](https://github.com/jasperdg/synco)
