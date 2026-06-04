# Changelog

## [1.1.0] - 2026-06-04

### Changed
- `notify()` now sends JSON-RPC notifications without an `id` member.
- `RpcSafeClient.notify()` accepts valid empty `204` responses without requiring a response Safe Mode header.

### Added
- Added `maxSerializationDepth` and `maxDeserializationDepth` options.

### Fixed
- Serialization and deserialization now fail deterministically on circular or too-deep structures.
- `__proto__` keys are preserved as inert own properties during serialization and deserialization.
