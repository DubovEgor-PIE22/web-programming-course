# LR8 Hono Backend API - CHEATSHEET

## 🚀 Quick Start (5 минут)

```bash
# 1. Инициализация проекта
cd lessons/lr8/backend
npm init -y
npm install -D typescript @types/node tsx
npm install hono @prisma/client zod jsonwebtoken dotenv cors
npm install -D prisma @types/jsonwebtoken

# 2. Структура
mkdir -p src/{handlers,services,middleware,db,types,utils}

# 3. tsconfig.json
npx tsc --init

# 4. Первое приложение
npm run dev
```

---

## 📚 Основные концепции

| Концепция | Что это | Зачем |
|-----------|---------|-------|
| **HTTP методы** | GET, POST, PUT, DELETE | CRUD операции |
| **REST API** | /api/users, /api/users/:id | Стандартный способ взаимодействия |
| **Hono** | Web framework | Быстрый, TypeScript-first фреймворк |
| **Prisma ORM** | SQL → TypeScript | Type-safe работа с БД |
| **Zod** | Валидация + типы | Проверка входных данных |
| **JWT** | JSON Web Token | Безопасная аутентификация |
| **SQLite** | Файловая БД | Простая для разработки |

---

## 🔧 Синтаксис Hono

### Hello World
```typescript
import { Hono } from 'hono';

const app = new Hono();

app.get('/hello', (c) => {
  return c.json({ message: 'Hello!' });
});

export default {
  port: 3000,
  fetch: app.fetch,
};
```

### REST endpoints
```typescript
// GET /api/users
app.get('/users', async (c) => {
  const users = await prisma.user.findMany();
  return c.json({ users });
});

// POST /api/users
app.post('/users', async (c) => {
  const body = await c.req.json();
  const user = await prisma.user.create({ data: body });
  return c.json(user, 201); // 201 = Created
});

// GET /api/users/:id
app.get('/users/:id', async (c) => {
  const id = c.req.param('id');
  const user = await prisma.user.findUnique({ where: { id } });
  return c.json(user);
});

// PUT /api/users/:id
app.put('/users/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const user = await prisma.user.update({ where: { id }, data: body });
  return c.json(user);
});

// DELETE /api/users/:id
app.delete('/users/:id', async (c) => {
  const id = c.req.param('id');
  await prisma.user.delete({ where: { id } });
  return c.json({ success: true });
});
```

### Middleware
```typescript
// CORS
import { cors } from 'hono/cors';
app.use('*', cors());

// Логирование
import { logger } from 'hono/logger';
app.use(logger());

// JWT проверка
import { jwt } from 'hono/jwt';
app.use('/api/protected/*', jwt({ secret: process.env.JWT_SECRET! }));

// Кастомный middleware
app.use(async (c, next) => {
  console.log(c.req.method, c.req.path);
  await next();
});
```

### Обработка ошибок
```typescript
try {
  const body = await c.req.json();
  const data = MySchema.parse(body);
  const result = await someFunction(data);
  return c.json(result, 200);
} catch (error) {
  console.error(error);
  return c.json(
    { error: 'BadRequest', message: 'Invalid data' },
    400
  );
}

// Глобальный обработчик
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'InternalServerError' }, 500);
});
```

---

## 🗄️ Prisma ORM

### Schema (prisma/schema.prisma)
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String    @id @default(cuid())
  email     String    @unique
  name      String?
  role      UserRole  @default(USER)
  createdAt DateTime  @default(now())

  posts     Post[]
  @@map("users")
}

enum UserRole {
  USER
  ADMIN
}

model Post {
  id        String    @id @default(cuid())
  title     String
  userId    String
  user      User      @relation(fields: [userId], references: [id])
  createdAt DateTime  @default(now())

  @@map("posts")
}
```

### Миграции
```bash
# Создать миграцию
npx prisma migrate dev --name init

# Просмотреть БД
npx prisma studio
```

### Queries
```typescript
import { prisma } from './db/client';

// CREATE
const user = await prisma.user.create({
  data: { email: 'test@example.com', name: 'Test' }
});

// READ - один
const user = await prisma.user.findUnique({
  where: { id: '123' }
});

// READ - много
const users = await prisma.user.findMany({
  skip: 0,
  take: 10,
  select: { id: true, name: true }
});

// UPDATE
const user = await prisma.user.update({
  where: { id: '123' },
  data: { name: 'Updated' }
});

// DELETE
await prisma.user.delete({
  where: { id: '123' }
});

// Relational queries
const user = await prisma.user.findUnique({
  where: { id: '123' },
  include: { posts: true }
});
```

---

## ✅ Zod Валидация

```typescript
import { z } from 'zod';

// Простая схема
const UserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  age: z.number().int().positive().optional(),
});

// Использование
try {
  const data = UserSchema.parse(body);
  // data типизирован как { email: string, name: string, age?: number }
} catch (error) {
  // Ошибка валидации
  return c.json({ error: 'BadRequest' }, 400);
}

// Извлечение типа
type User = z.infer<typeof UserSchema>;

// Сложные схемы
const CreatePostSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(10),
  tags: z.array(z.string()).min(1).max(5),
  status: z.enum(['draft', 'published']).default('draft'),
});

// Трансформация данных
const UserSchema = z.object({
  email: z.string().email().toLowerCase(),
  name: z.string().trim(),
});
```

---

## 🔐 JWT Authentication

### Генерация токена
```typescript
import jwt from 'jsonwebtoken';

function createToken(userId: string) {
  return jwt.sign(
    { userId, role: 'student' },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );
}
```

### Проверка токена (старый способ)
```typescript
function verifyToken(token: string) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!);
  } catch (error) {
    return null;
  }
}

app.use('/api/protected/*', async (c, next) => {
  const auth = c.req.header('Authorization');
  const token = auth?.replace('Bearer ', '');

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const payload = verifyToken(token);
  if (!payload) {
    return c.json({ error: 'Invalid token' }, 401);
  }

  c.set('userId', payload.userId);
  await next();
});
```

### Проверка токена (Hono helper - РЕКОМЕНДУЕТСЯ)
```typescript
import { jwt } from 'hono/jwt';

app.use('/api/protected/*', jwt({ secret: process.env.JWT_SECRET! }));

app.get('/api/protected/me', (c) => {
  const payload = c.get('jwtPayload');
  return c.json({ userId: payload.userId });
});
```

---

## 📁 Структура проекта

```
backend/
├── src/
│   ├── handlers/
│   │   ├── auth.ts          # POST /api/auth/github/callback, GET /api/auth/me
│   │   ├── categories.ts    # CRUD /api/categories
│   │   ├── questions.ts     # CRUD /api/questions
│   │   ├── sessions.ts      # POST /api/sessions, POST /api/sessions/:id/answers
│   │   └── admin.ts         # Admin endpoints
│   ├── services/
│   │   ├── authService.ts
│   │   ├── quizService.ts
│   │   └── scoreService.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   └── errorHandler.ts
│   ├── db/
│   │   └── client.ts        # Prisma клиент
│   ├── types/
│   │   └── index.ts
│   └── index.ts             # Main app
├── prisma/
│   └── schema.prisma
├── .env
├── package.json
└── tsconfig.json
```

---

## 🛠️ HTTP Статус коды

| Код | Значение | Используется |
|-----|----------|--------------|
| **200** | OK | Успешный запрос |
| **201** | Created | Ресурс создан |
| **204** | No Content | Успех, нет контента |
| **400** | Bad Request | Неправильные данные |
| **401** | Unauthorized | Нет авторизации |
| **403** | Forbidden | Доступ запрещен |
| **404** | Not Found | Ресурс не найден |
| **500** | Server Error | Ошибка сервера |

---

## 🔍 Отладка

```bash
# Просмотреть БД
npx prisma studio

# Генерировать типы
npx prisma generate

# Применить миграции
npx prisma db push

# Сбросить БД (ОПАСНО!)
npx prisma migrate reset
```

---

## ⚠️ Частые ошибки

| Ошибка | Решение |
|--------|---------|
| `await` забыт | Всегда `await` для async функций |
| Не обработана ошибка валидации | Используйте `try-catch` для `schema.parse()` |
| `return` забыт | Всегда возвращайте результат `c.json()` |
| Token не передан | Проверьте заголовок `Authorization: Bearer <token>` |
| БД не существует | Запустите `npx prisma migrate dev` |

---

## 📖 Полезные ссылки

- [Hono docs](https://hono.dev)
- [Prisma docs](https://www.prisma.io/docs)
- [Zod docs](https://zod.dev)
- [OpenAPI schema](../quiz-api-schema.yaml)
