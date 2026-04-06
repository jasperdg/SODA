# Synco Price Feed

Fetches a single asset's USD price from Pyth via SEDA proxies (Triton with Hermes fallback) and encodes it as a 64-byte binary payload for on-chain consumption via FastAdapter.

## How It Works

1. **Execute phase** reads a Pyth feed ID from the DR inputs
2. Fetches the latest price from Pyth via SEDA's Triton proxy (falls back to Hermes)
3. Optionally divides by a quote asset and/or applies a power-of-10 scale
4. Encodes the result as a 64-byte binary array for the FastAdapter

**Binary output format:**

```
Offset  0..16   — zero padding
Offset 16..32   — u128 price (big-endian)
Offset 32..56   — zero padding
Offset 56..64   — u64 Unix timestamp (big-endian)
```

5. **Tally phase** passes through the first reveal unchanged (SEDA Fast, replication factor = 1)

## Data Sources

- **Pyth Network** - [https://pyth.network](https://pyth.network) (via SEDA Triton / Hermes proxies)

## Input Format

```json
{
  "pyth_id": "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  "quote_asset": null,
  "scale": null
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `pyth_id` | Yes | Pyth price feed ID (hex) |
| `quote_asset` | No | Pyth feed ID to divide by (for derived rates) |
| `scale` | No | Power-of-10 multiplier applied to the final price |

## Output Format

Raw 64-byte binary (not JSON). See binary layout above.

## Usage

```json
{
  "oracleProgramId": "766d6b5fbc862f8b5ef452c16893e2bb3edbd053e1b824f9819745a26ac60d98"
}
```

## Tags

`crypto` `basic` `real-time` `pyth` `community`

## Links

- [Source Code](https://github.com/jasperdg/synco/tree/main/packages/seda-programs/programs/price-feed)
- [SEDA Documentation](https://docs.seda.xyz)
