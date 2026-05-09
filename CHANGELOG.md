# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-05-09

### Added
- `AuthValidator` and `makeSharedSecretValidator(...)` for handshake authentication by room.
- `SocketIoMesh.init({ port, host, cors, authValidator, exposeAdminUI, exposeRootInfo, healthPath })`.
- Upstream `GET /healthz` endpoint with default path `/healthz`.
- `SocketClientOptions` support for `auth`, `extraHeaders`, transport/path overrides and reconnection tuning.
- `smoke:auth` script to validate valid auth, invalid auth and `/healthz` in one local run.

### Changed
- `SocketClient` now extends `EventEmitter` and reemits `connect_error`, `auth_error`, `reconnect`, `ping`, `pong` and related lifecycle events.
- `SocketClient` disables the legacy automatic bootstrap (`CLIENT_REGISTER` + subscribe to `ENGINE_THREADS`) when explicit `auth` is provided.
- Admin UI instrumentation is disabled by default when `authValidator` is active, to avoid exposing an unauthenticated control surface.
- `bindHost` / `host` becomes the real listener bind, while consumers can keep separate public/internal base URLs.

### Compatibility
- Existing positional signatures remain valid:
  - `SocketIoMesh.init(number)`
  - `new SocketClient(..., boolean)`
  - `new AlephScriptClient(..., boolean)`
