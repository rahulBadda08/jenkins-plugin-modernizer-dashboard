# Contributing to Jenkins Plugin Modernizer Dashboard

Thank you for your interest in contributing! This project is an independent analytics and modernization platform for the Jenkins plugin ecosystem.

---

## Development Prerequisites

- **Node.js**: `24.x` (see [`.nvmrc`](.nvmrc))
- **npm**: `10+`
- **Git**

```bash
# Clone and setup
git clone https://github.com/rahulBadda08/jenkins-plugin-modernizer-dashboard.git
cd jenkins-plugin-modernizer-dashboard
nvm use
npm ci
```

---

## Local Development Workflow

- `npm run dev`: Launch the Vite development server with Hot Module Replacement.
- `npm run check`: **Mandatory pre-push quality gate**. Runs ESLint, TypeScript type-check, Vitest unit suite, dataset SHA-256 verification, and production compilation.
- `npm test`: Run the Vitest test suite.
- `npm run data:verify`: Validate dataset schema integrity and SHA-256 checksum match.
- `npm run data:refresh`: Execute local ingestion against upstream data sources.

---

## Architectural Principles

1. **Domain Isolation (`src/domain/`)**:
   - Keep business and analytical logic (scoring, version comparison, check-run categorization, security sanitization) pure and decoupled from React components.
   - All domain functions must have 100% unit test coverage in `src/domain/__tests__/`.

2. **Security by Default**:
   - Never render raw unescaped HTML from external sources.
   - Ensure all generated shell commands validate plugin identifiers against `/^[a-zA-Z0-9_-]+$/`.
   - Ensure all CSV/Excel exports sanitize formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`, `%`, `|`).

3. **Accessibility**:
   - Adhere to WAI-ARIA authoring practices.
   - Use semantic interactive elements (`<button>`, `<a>`, `<input>`).
   - Ensure keyboard navigability (Tab, Enter, Space, Arrow keys, Escape) and screen-reader accessible fallbacks.

---

## Pull Request Guidelines

1. Create a feature branch: `git checkout -b feat/your-feature-name` or `fix/your-bugfix`.
2. Ensure `npm run check` exits with code `0`.
3. Use [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat(...)`: New feature or analytical capability
   - `fix(...)`: Bug fix or calculation correction
   - `refactor(...)`: Code restructuring without behavioral change
   - `test(...)`: Adding or updating test suites
   - `docs(...)`: Documentation updates
   - `chore(...)`: Tooling, build, or dependency updates
4. Submit a Pull Request targeting `main`. CI will automatically run all automated verification checks.
