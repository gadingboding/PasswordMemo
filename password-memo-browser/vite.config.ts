import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, existsSync } from 'fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-icons',
      closeBundle: () => {
        const iconsDir = resolve(__dirname, 'icons')
        const distIconsDir = resolve(__dirname, 'dist', 'icons')
        
        // 确保目标目录存在
        if (!existsSync(distIconsDir)) {
          mkdirSync(distIconsDir, { recursive: true })
        }
        
        // 复制图标文件
        const iconSizes = [16, 32, 48, 128]
        iconSizes.forEach(size => {
          const srcIcon = resolve(iconsDir, `icon-${size}.png`)
          const destIcon = resolve(distIconsDir, `icon-${size}.png`)
          
          if (existsSync(srcIcon)) {
            copyFileSync(srcIcon, destIcon)
            console.log(`Copied icon-${size}.png to dist/icons/`)
          }
        })
      }
    }
  ],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        options: resolve(__dirname, 'options.html'),
        content: resolve(__dirname, 'src/content.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
        format: 'es'
      }
    },
    outDir: 'dist',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@pages': resolve(__dirname, 'src/pages'),
      '@lib': resolve(__dirname, 'src/lib')
    }
  }
})