# ===== 阶段1: 构建前端 =====
FROM node:22-alpine AS builder

WORKDIR /app

# 先拷依赖清单,利用层缓存
COPY package.json package-lock.json* ./
RUN npm ci --include=dev

# 拷源码,构建前端 dist/
COPY . .
RUN npm run build

# ===== 阶段2: 运行时镜像 =====
FROM node:22-alpine AS runner

WORKDIR /app

# 只装运行时依赖(不含 devDependencies)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# 拷后端代码
COPY server/ ./server/

# 从 builder 拷前端构建产物
COPY --from=builder /app/dist/ ./dist/

# 数据目录(挂载卷持久化)
RUN mkdir -p /app/data
ENV DB_PATH=/app/data/data.sqlite
ENV NODE_ENV=production

# 健康检查:探测 /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/api/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

EXPOSE 3001

CMD ["node", "server/index.js"]
