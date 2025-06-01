const { defineConfig } = require('@vue/cli-service')
const fs = require('fs')
const path = require('path');

module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    port: 80,
    allowedHosts: "all",
    open: true,
    https: {
      cert: fs.readFileSync(path.join(__dirname, 'src/ssl/cert.crt')),
      key: fs.readFileSync(path.join(__dirname, 'src/ssl/cert.key'))
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8081',  // 后端地址
        changeOrigin: true,
        pathRewrite: {
          '^/api': ''  // 移除请求路径中的/api
        }
      }
    }
  },
  chainWebpack: config =>{
    config.plugin('html')
        .tap(args => {
          args[0].title = "管理系统";
          return args;
        })
  }
})
