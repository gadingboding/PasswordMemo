<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# 代码规范
禁止在任何地方使用任何emoji。

# import规范
我们使用现代的es6 module方式而不是commonjs，当然具体还是根据打包工具的配置和`package.json`的配置以及`tsconfig.json`的配置决定。

# 包管理器
1. 使用pnpm而不是npm
2. 使用基于pnpm的monorepo方式管理仓库