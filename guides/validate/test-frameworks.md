# Test Framework Detection Guide

## Automatic Detection

The `/EA-validate` command automatically detects your project type and runs the appropriate tests.

## Supported Frameworks

### JavaScript/TypeScript

| Framework | Detection | Command |
|-----------|-----------|---------|
| **Vitest** | `vitest.config.ts` or `vitest.config.js` | `npx vitest run` |
| **Jest** | `jest.config.js` or package.json jest config | `npm test` |
| **Bun** | `bun.lockb` present | `bun test` |
| **npm** | `package.json` with test script | `npm test` |

### Python

| Framework | Detection | Command |
|-----------|-----------|---------|
| **Pytest** | `pyproject.toml` with pytest | `pytest tests/ -v --tb=short` |
| **Unittest** | `requirements.txt` | `python -m pytest` |

### Other Languages

| Language | Detection | Command |
|----------|-----------|---------|
| **Rust** | `Cargo.toml` | `cargo test` |
| **Go** | `go.mod` | `go test ./...` |

## Detection Priority

When multiple indicators exist, this order is used:

1. Bun (`bun.lockb`) - Bun projects take priority
2. Vitest config - Vitest over Jest if both exist
3. Jest config - Explicit Jest configuration
4. npm test - Fallback for Node projects
5. Pytest - Python projects
6. Language-specific - Rust, Go, etc.

## Manual Override

If detection fails, run tests manually:

```bash
# JavaScript
npm test
npx vitest run
bun test

# Python
pytest tests/ -v
python -m pytest

# Rust
cargo test

# Go
go test ./...
```

## Adding Test Coverage

If your project doesn't have tests:

1. **JavaScript**: Add Vitest
   ```bash
   npm install -D vitest
   ```

2. **Python**: Add Pytest
   ```bash
   pip install pytest
   ```

3. Create a `tests/` directory
4. Add test files following framework conventions
