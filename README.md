# Ride Share Connect

面向润珑苑小区的拼车互助 Web App Demo，帮助小区居民发布和查找顺路拼车信息。

## 项目定位

`ride-share-connect` 是一个轻量级社区拼车平台，适合润珑苑小区居民在通勤、接送站、周末出行等场景下互相匹配顺路需求。

当前版本已接入 Supabase，适合部署到 Netlify 后给小区内部试运行。

## 功能

- 用户注册、登录和退出
- 发布“车找人”拼车帖
- 发布“人找车”需求帖
- 按类型筛选、按关键词搜索路线
- 按未过期、今天、明天、本周筛选路线
- 查看帖子详情、联系方式和路线信息
- 对帖子发表评论
- 对拼车体验进行评分和文字评价
- 发帖人可删除自己的帖子
- 管理员可删除违规帖子
- 发布页展示拼车安全提示和免责声明
- 多人共享同一份后端数据

## 技术栈

- 前端：React + Vite
- 后端与数据库：Supabase
- 认证：Supabase Auth

## Supabase 设置

1. 在 Supabase 项目中打开 `SQL Editor`。
2. 复制并执行 `supabase/schema.sql` 中的全部 SQL。
3. 打开 `Authentication` -> `Providers` -> `Email`。
4. 关闭 `Confirm email`，否则手机号注册后不会自动登录。

本项目用手机号生成内部邮箱来接入 Supabase Auth，例如 `13800000000@runlongyuan-users.com`。用户界面仍然只展示手机号登录。

### 设置管理员

执行 `supabase/schema.sql` 后，`profiles` 表会有 `is_admin` 字段。需要把某个用户设为管理员时，在 Supabase SQL Editor 中执行：

```sql
update public.profiles
set is_admin = true
where phone = '管理员手机号';
```

管理员登录后可以在帖子详情页删除违规帖子。

## 本地运行

安装依赖：

```bash
npm install
```

复制环境变量示例：

```bash
cp .env.example .env.local
```

然后在 `.env.local` 中填写：

```text
VITE_SUPABASE_URL=你的 Supabase Project URL
VITE_SUPABASE_ANON_KEY=你的 Supabase anon public key
```

启动开发服务：

```bash
npm run dev
```

构建生产版本：

```bash
npm run build
```

## 数据说明

当前版本使用 Supabase 保存共享数据。不同用户访问同一个 Netlify 站点时，会看到同一批发帖、评论和评价。

## 部署

这是一个静态前端应用，可以直接部署到 Netlify。

推荐配置：

```text
Build command: npm run build
Publish directory: dist
```

在 Netlify 的 `Site configuration` -> `Environment variables` 中添加：

```text
VITE_SUPABASE_URL=你的 Supabase Project URL
VITE_SUPABASE_ANON_KEY=你的 Supabase anon public key
```

## 后续可扩展方向

- 增加手机号验证码或微信登录
- 增加小区住户认证
- 增加出发时间提醒
- 增加举报和审核队列
