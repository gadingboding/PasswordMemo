# Password Manager Core

A secure password manager core library with encryption and synchronization capabilities.

## Features

- 🔐 Strong encryption using libsodium (Argon2id + AES-GCM)
- 🔄 Multi-device synchronization with conflict resolution
- 🌐 Cross-platform support (Browser + Node.js)
- 📱 PIN unlock with secure session management
- 🗂️ Custom field templates and labels
- ☁️ WebDAV integration for remote storage

## Development

### Prerequisites

- Node.js 18+
- pnpm

### Installation

```bash
pnpm install
```

### Scripts

```bash
# Build the project
pnpm run build

# Run tests
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Run tests with coverage
pnpm run test:coverage

# Lint code
pnpm run lint

# Format code
pnpm run format

# Development mode
pnpm run dev
```

### Project Structure

```
src/
├── core/                     # Core functionality modules
│   ├── auth/                 # Authentication & session management
│   ├── crypto/               # Cryptography engine
│   ├── vault/                # Vault management
│   ├── sync/                 # Synchronization coordinator
│   └── config/               # Configuration management
├── adapters/                 # Environment adapters
│   └── storage/              # Storage adapters (LocalStorage, FileSystem, etc.)
├── types/                    # TypeScript type definitions
└── index.ts                  # Main entry point
```

## Architecture

This library follows a modular architecture with clear separation of concerns:

- **Core Modules**: Business logic and domain-specific functionality
- **Adapters**: Environment-specific implementations (browser vs Node.js)
- **Types**: Shared type definitions and interfaces

## Security

- All sensitive data is encrypted using industry-standard algorithms
- PIN unlock provides convenience without compromising security
- Master password never stored, only derived keys
- Length normalization padding prevents timing attacks

## License

MIT