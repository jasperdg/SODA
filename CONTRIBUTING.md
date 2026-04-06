# Contributing to SODA

Thank you for your interest in contributing to the SEDA Oracle Directory & Registry!

## Types of Contributions

### 1. Adding a New Program

If you've deployed a SEDA oracle program and want to list it in the registry:

1. Fork this repository
2. Create a new directory: `programs/<your-program-slug>/`
3. Add required files (see below)
4. Submit a pull request

### 2. Updating an Existing Program

To update metadata or deployments for an existing program:

1. Fork this repository
2. Edit the relevant `programs/<slug>/program.json`
3. Update version numbers if applicable
4. Submit a pull request

### 3. Improving Documentation

Documentation improvements are always welcome:

1. Fork this repository
2. Make your changes
3. Submit a pull request

## Adding a New Program

### Required Files

Each program must have:

```
programs/<slug>/
├── program.json   # Required: Program metadata
└── README.md      # Required: Program documentation
```

### program.json Requirements

Your `program.json` must include these required fields:

```json
{
  "slug": "my-program",
  "name": "My Program Name",
  "description": "A clear description of what this program does (10-1000 chars)",
  "version": "1.0.0",
  "deployments": {
    "mainnet": {
      "oracleProgramId": "<64-character-hex-string>",
      "dateDeployed": "2026-04-01T00:00:00.000Z",
      "gitCommitHash": "<40-character-git-hash>"
    }
  },
  "author": {
    "name": "Your Name or Organization",
    "github": "your-github-username"
  }
}
```

### Optional Fields

Enhance your listing with:

```json
{
  "inputSchema": {
    "type": "object",
    "required": ["asset"],
    "properties": {
      "asset": {
        "type": "string",
        "description": "Asset identifier"
      }
    }
  },
  "outputSchema": {
    "type": "object",
    "required": ["price"],
    "properties": {
      "price": {
        "type": "string",
        "description": "Price as string for precision"
      }
    }
  },
  "dataSources": [
    {
      "id": "my-source",
      "name": "My Data Source",
      "url": "https://example.com",
      "role": "primary"
    }
  ],
  "tags": ["crypto", "basic", "community"],
  "repository": "https://github.com/you/your-repo",
  "examples": [
    {
      "name": "BTC/USD",
      "input": { "asset": "BTC" },
      "expectedOutput": { "price": "50000.00" }
    }
  ]
}
```

### Slug Guidelines

Your program slug must:

- Be lowercase with hyphens only: `my-program-name`
- Be unique across the registry
- Match your directory name
- Be descriptive but concise

### README.md Requirements

Your README should include:

1. **Title** - Program name
2. **Description** - What the program does
3. **Data Sources** - Where data comes from
4. **Input Format** - Expected input structure
5. **Output Format** - What the program returns
6. **Usage Example** - How to use the program
7. **Links** - Repository, documentation

## Validation

Before submitting, validate your entry locally:

```bash
# Install dependencies
bun install

# Validate all programs
bun run validate
```

The validator checks:

- JSON Schema compliance
- Slug matches directory name
- Required files exist
- Program ID format (64 hex chars)
- Git commit hash format (40 hex chars)

## Pull Request Process

### PR Checklist

- [ ] `program.json` follows the schema
- [ ] `README.md` exists with documentation
- [ ] Slug matches directory name
- [ ] Program ID is valid and deployed on-chain
- [ ] `bun run validate` passes locally
- [ ] Description explains what the program does

### Review Process

1. **Automated Checks** - CI validates schema and format
2. **Maintainer Review** - A maintainer reviews for quality
3. **Merge** - Once approved, your program is added

### What We Check

- **Schema Compliance** - Must pass validation
- **Documentation Quality** - Clear, helpful README
- **Program Validity** - Program ID exists on-chain
- **No Malicious Content** - No harmful or misleading entries

## Tags

Use standard tags when applicable:

| Tag | When to Use |
|-----|-------------|
| `crypto` | Cryptocurrency data |
| `equities` | Stock market data |
| `fx` | Forex rates |
| `futures` | Futures contracts |
| `commodities` | Commodity prices |
| `rates` | Interest rates |
| `basic` | Simple price feeds |
| `ema` | EMA calculations |
| `session-aware` | Market hours aware |
| `batch` | Multiple assets |
| `real-time` | Live data |
| `community` | Not officially maintained |

Always include `community` tag for non-official programs.

## Code of Conduct

- Be respectful and constructive
- Provide accurate information
- Don't submit spam or malicious entries
- Help others when you can

## Questions?

- Open an issue for questions
- Join the [SEDA Discord](https://discord.gg/seda) for discussion
- Check existing programs for examples

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
