# 代码规范
禁止在任何地方使用任何emoji。

# import规范
我们使用现代的es6 module方式而不是commonjs，当然具体还是根据打包工具的配置和`package.json`的配置以及`tsconfig.json`的配置决定。

# 包管理器
1. 使用pnpm而不是npm
2. 使用基于pnpm的monorepo方式管理仓库