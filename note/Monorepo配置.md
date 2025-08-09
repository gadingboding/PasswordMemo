# Monorepo配置

目前编译出了点问题，问题就是目前我将web目录嵌套在了core中，虽然不在core目录里面，但是根目录的`tsconfig.json`实际上是给core进行配置的，所以web模块就在core模块里面，但是web又有单独的一个`tsconfig.json`，它们的root（`@`）是冲突的。

我希望切换为Monorepo的项目结构，这种结构比较适应当前的情况，而且之后可能还会增加其他的客户端，同时也会有golang/rust的加密解密依赖。

我了解了一下一些主流的做法