# HKUer 前端

Vue 3 + TypeScript + Vite 前端，包含新社区页面和原管理后台。完整环境配置、数据库初始化与项目介绍见 [项目 README](../README.md)。

```sh
npm ci
npm run dev:mesh
```

访问 http://127.0.0.1:5174/home；后台位于 /admin。先启动 9091 后端，.env.mesh 已配置 /java 代理。npm run dev 使用相同 mesh 模式，端口默认为 5173。

| 命令 | 用途 |
|---|---|
| npm run type-check | Vue / TypeScript 类型检查 |
| npm run build:mesh | 类型检查并构建社区版本 |
| npm run preview | 预览构建产物；接口代理需自行配置 |

- src/mesh/：社区页面、弹窗、会话和领域 API。
- src/router/mesh.ts：社区路由。
- src/views/admin/：原管理后台及社区治理页面。
- src/api/、src/utils/：原请求、认证和业务封装。
- src/views/user/：保留的兼容页面，仍被项目使用。

dist/ 和 node_modules/ 不提交。VITE_* 变量会进入浏览器代码，只能放公开配置，不能放服务器密码或云服务密钥。
