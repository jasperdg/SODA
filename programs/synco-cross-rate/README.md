# Synco Cross-Rate

Derives a cross-rate between two assets by fetching both Pyth prices and dividing base by quote. Returns JSON with the computed rate and timestamp.

## How It Works

1. **Execute phase** reads two Pyth feed IDs (base and quote) from the DR inputs
2. Fetches both prices from Pyth via SEDA's Triton proxy (falls back to Hermes)
3. Computes `base_price / quote_price` using `rust_decimal::Decimal` for precision
4. Optionally applies a power-of-10 scale factor
5. Returns a JSON response with the cross-rate and timestamp

6. **Tally phase** deserializes the first reveal as JSON and re-serializes it (SEDA Fast, replication factor = 1)

## Data Sources

- **Pyth Network** - [https://pyth.network](https://pyth.network) (via SEDA Triton / Hermes proxies)

## Input Format

```json
{
  "base_feed_id": "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  "quote_feed_id": "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
  "scale": null
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `base_feed_id` | Yes | Pyth feed ID for the base asset (e.g. ETH/USD) |
| `quote_feed_id` | Yes | Pyth feed ID for the quote asset (e.g. USDC/USD) |
| `scale` | No | Power-of-10 multiplier applied to the final rate |

## Output Format

```json
{
  "cross_rate": "3000.12345",
  "timestamp": "2026-04-01T12:00:00Z"
}
```

## Usage

```json
{
  "oracleProgramId": "805e0dcde2d34440878bd4a4046aa87d7d015202de005da9afeeedde13813934"
}
```

## Tags

`crypto` `basic` `real-time` `pyth` `community`

## Links

- [Source Code](https://github.com/jasperdg/synco/tree/main/packages/seda-programs/programs/cross-rate)
- [SEDA Documentation](https://docs.seda.xyz)
