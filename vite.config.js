// Vite 配置文件，定义项目的构建与开发服务器行为
import { fileURLToPath, URL } from 'node:url' // Node 原生模块，用于路径解析
import { defineConfig } from 'vite' // Vite 的配置入口函数
import vue from '@vitejs/plugin-vue' // 支持 .vue 单文件组件
import AutoImport from 'unplugin-auto-import/vite' // 自动导入 API（如 ref、reactive 等）
import Components from 'unplugin-vue-components/vite' // 自动按需加载组件
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers' // Element‑Plus 解析器

export default defineConfig({
  // -------------------- 插件 --------------------
  plugins: [
    vue(), // 启用 Vue 支持
    // 自动导入 Element‑Plus 相关的 API（如 ElMessage、ElLoading）
    AutoImport({ resolvers: [ElementPlusResolver()] }),
    // 自动按需注册 Element‑Plus 组件（如 ElButton、ElInput）
    Components({ resolvers: [ElementPlusResolver()] }),
  ],

  // -------------------- 开发服务器 --------------------
  server: {
    proxy: {
      // 将前端的 /api 请求代理到后端 Spring Boot 服务
      '/api': {
        target: 'http://localhost:8080', // 后端地址
        changeOrigin: true, // 修改请求头中的 Host 字段
      },
    },
  },

  // -------------------- 路径别名 --------------------
  resolve: {
    alias: {
      // 使用 @ 代表 src 目录，方便在代码中引用
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})