# OneTool

基于 Tauri 2、React、TypeScript 和 Ant Design 的桌面工具箱。

## 功能

左侧菜单按类别组织工具：

- **转换**：时间戳转换、颜色转换
- **开发**：XML 编辑、SQL 格式化、Cron 表达式生成器
- **JSON**：JSON 编辑、JSON 对比
- **加密**：BASE64、JWT、RSA 密钥生成、国密 SM2 密钥生成、对称加密（AES、SM4、RC4）
- **文本**：文本压缩、文本对比
- **网络**：IPv4 子网计算器
- **专注**：番茄钟
- **视频**：YouTube 视频下载

加密工具在前端使用 Web Crypto API 和 `sm-crypto`，不依赖 Electron 的 `window.toolsApi`。窗口启动背景色和应用图标已配置在 Tauri 设置中。

## 环境要求

- Node.js 18 或更高版本
- pnpm
- Rust stable
- Tauri 2 开发环境（Windows 需要 WebView2；macOS/Linux 请按 Tauri 官方文档安装系统依赖）

## 开发

安装依赖：

```bash
pnpm install
```

仅运行前端 Vite 开发服务器：

```bash
pnpm dev
```

运行 Tauri 桌面开发环境：

```bash
pnpm tauri dev
```

## 构建

检查 TypeScript 并构建前端：

```bash
pnpm build
```

构建 Tauri 安装包：

```bash
pnpm tauri build
```

## 项目结构

```text
src/                  React 应用和工具页面
src/tools/            按菜单分类的工具实现
src/cryptoApi.ts      浏览器端加密能力封装
src-tauri/src/        Tauri Rust 后端
src-tauri/icons/      应用图标资源
src-tauri/tauri.conf.json
                      Tauri 窗口、构建和打包配置
```

## 图标

Tauri 图标位于 `src-tauri/icons`，包含 PNG、ICO、ICNS 及 Windows 多尺寸资源。更新源图标后，可以运行：

```bash
pnpm tauri icon path/to/icon.png
```

然后重新构建应用。
