# 家教工作台 (Teacher Workbench)

个人家教工作台,记录课时费、学生情况、上课状态、家长反馈、知识点掌握与针对性训练建议。

## 技术栈

- 前端:React 18 + Vite 6
- 后端:Express 4 + sql.js(WASM 版 SQLite,无需原生编译)
- 数据存储:本地 `data.sqlite` 文件

## 快速开始

```bash
npm install
npm run dev
```

启动后浏览器访问 http://localhost:5173

- 前端运行在 5173 端口
- API 服务运行在 3001 端口(Vite 已配置代理,前端直接调用 `/api/*`)

## 功能模块

| 模块 | 说明 |
|------|------|
| 课表 | 周/月双视图切换。周视图 7 天列展示课程详情;月视图日历网格,每格显示日期+N节+首课时间,点击展开当天详情。每节课显示学生/时间/地点/通勤,同一天相邻课程自动检测间隔,通勤时间不足或时间冲突会高亮提示 |
| 学生档案 | 年级、科目、课时费、上课地点、单程通勤时间、家长信息、性格特点、薄弱环节 |
| 课时与收入 | 记录每次上课日期/时长/专注度/表现,自动按课时费结算,支持按学生/月份汇总统计 |
| 知识点掌握 | 按知识点跟踪状态(未学/学习中/已掌握)与掌握度(0-100%),提供常见能力维度参考 |
| 英语知识点库 | 上海地区牛津英语 7 个年级(小学3-5 + 初中6-9)48 个知识点,含重难点与教学建议,可勾选一键导入到学生掌握清单 |
| 家长反馈 | 内置反馈模板,支持占位符自动替换(名字/科目/表现等),一键复制发送给家长 |
| 训练建议 | 基于薄弱知识点一键生成训练计划,支持模板套用、完成状态标记 |
| AI 建议 | 读取数据库全量信息,智能生成排课建议、学习建议、训练方案、家长总结、工作台总结 |

## 数据备份

所有数据保存在项目根目录的 `data.sqlite` 文件中,复制该文件即可完成备份/迁移。

## 目录结构

```
teacher/
├── server/
│   ├── index.js          # Express 入口
│   ├── db.js             # SQLite 连接与持久化
│   └── routes/           # 各模块 API 路由
├── src/
│   ├── App.jsx           # 主应用 + 侧边栏导航
│   ├── api.js            # 前端 API 封装
│   ├── components/UI.jsx # Modal/Toast/Field 通用组件
│   ├── pages/            # 五个功能页面
│   └── styles.css
├── index.html
├── vite.config.js
└── package.json
```

## API 一览

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | `/api/students` | 学生列表/新增 |
| GET/PUT/DELETE | `/api/students/:id` | 学生详情/更新/删除 |
| GET/POST | `/api/sessions` | 课时列表/新增 |
| GET/PUT/DELETE | `/api/sessions/:id` | 课时详情/更新/删除 |
| GET | `/api/sessions/stats/summary` | 课时收入汇总(支持 from/to 日期筛选) |
| GET | `/api/schedule/week?date=YYYY-MM-DD` | 按周查询课表(含学生地点/通勤) |
| GET | `/api/schedule/month?date=YYYY-MM-DD` | 按月查询课表(返回日历网格+月统计) |
| GET | `/api/schedule/day?date=YYYY-MM-DD` | 按天查询课表 |
| GET | `/api/english-kb` | 上海英语知识点库全量 |
| GET | `/api/english-kb/grades` | 年级概览列表 |
| GET | `/api/english-kb/grade/:idx` | 单个年级详情 |
| POST | `/api/english-kb/import` | 批量导入知识点到学生(自动去重) |
| GET/POST | `/api/ai/config` | AI 配置读取/保存(Key 脱敏返回) |
| GET | `/api/ai/students` | AI 场景用的学生简表 |
| GET | `/api/ai/history?limit=N` | AI 建议历史记录 |
| POST | `/api/ai/schedule-advice` | 排课建议(读取课表+通勤) |
| POST | `/api/ai/study-advice` | 学习建议(需 student_id) |
| POST | `/api/ai/training-plan` | 训练方案生成(需 student_id) |
| POST | `/api/ai/parent-summary` | 家长阶段总结(需 student_id) |
| POST | `/api/ai/workbench-summary` | 全局工作台总结 |
| GET/POST | `/api/knowledge` | 知识点列表/新增 |
| GET/PUT/DELETE | `/api/knowledge/:id` | 知识点详情/更新/删除 |
| GET/POST | `/api/feedbacks` | 反馈列表/新增 |
| GET/PUT/DELETE | `/api/feedbacks/:id` | 反馈详情/更新/删除 |
| GET/POST | `/api/trainings` | 训练建议列表/新增 |
| GET/PUT/DELETE | `/api/trainings/:id` | 训练建议详情/更新/删除 |
