## Description

<!-- Describe your changes -->

## Type of Change

- [ ] New program submission
- [ ] Update to existing program
- [ ] Documentation update
- [ ] Bug fix
- [ ] Other (please describe)

## Program Details (for new submissions)

**Program Slug:** `<slug>`

**Program Name:**

**Data Source(s):**

**Networks:**
- [ ] Mainnet
- [ ] Testnet

## Checklist

### Required for all PRs
- [ ] I have read [CONTRIBUTING.md](../CONTRIBUTING.md)
- [ ] My changes follow the project's coding standards

### Required for new programs
- [ ] `program.json` follows the [schema](../schemas/soda-program.schema.json)
- [ ] `README.md` exists with clear documentation
- [ ] Program slug matches directory name
- [ ] Program ID is a valid 64-character hex string
- [ ] Program is deployed and accessible on-chain
- [ ] `bun run validate` passes locally

### Required for program updates
- [ ] Version number updated (if applicable)
- [ ] Deployment info is accurate
- [ ] `bun run validate` passes locally

## Testing

<!-- Describe how you tested your changes -->

```bash
bun run validate
```

## Additional Notes

<!-- Any additional information for reviewers -->
