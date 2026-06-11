# Changelog

## [1.1.2] - 2026-06-11

### Added
- Publish source maps for CommonJS, ESM, browser, and minified browser bundles.
- Add package metadata banners to generated bundles and source headers.

### Fixed
- Decode Safe Mode `error.data` recursively before throwing `RpcError`.

## [1.1.0] - 2026-06-04

### Changed
- `notify()` now sends JSON-RPC notifications without an `id` member.
- `RpcSafeClient.notify()` accepts valid empty `204` responses without requiring a response Safe Mode header.

### Added
- Added `maxSerializationDepth` and `maxDeserializationDepth` options.

### Fixed
- Serialization and deserialization now fail deterministically on circular or too-deep structures.
- `__proto__` keys are preserved as inert own properties during serialization and deserialization.
