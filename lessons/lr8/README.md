# LR8: Backend API with Hono + TypeScript

## Структура занятия

- **Лекция:** Теория Backend разработки
  - Материалы: [slides.html](docs/slides-standalone/slides.html) | [slides-speech.md](docs/slides-speech.md)
  - Справочные материалы: [GUIDE.md](docs/GUIDE.md) | [CHEATSHEET.md](docs/CHEATSHEET.md) | [Interactive Examples](docs/interactive.html)

- **Практическая работа:** Реализация backend

---

## 🎯 Практическая работа: Создание Backend

### Цели

По окончании практической работы вы:

1. **Настроите базу данных** с помощью Prisma ORM
2. **Создадите User модель** для хранения данных студентов с GitHub ID
3. **Реализуете GitHub OAuth** (POST /api/auth/github/callback)
4. **Реализуете JWT авторизацию** (выдача токенов, GET /api/auth/me)
5. **Защитите endpoints** JWT токенами

### Результат

Backend приложение на `localhost:3000`, которое:

- Имеет User модель в БД с полями: id, email, name, githubId
- Обменивает GitHub код на JWT токен (POST /api/auth/github/callback)
- Выдаёт JWT токены после верификации GitHub OAuth
- Имеет защищённый endpoint GET /api/auth/me для получения текущего пользователя
- Поддерживает mock режим для тестирования (code с префиксом `test_*`)

---

## 🛠️ Инструменты и технологии

| Технология         | Назначение                               | Версия              |
| ------------------ | ---------------------------------------- | ------------------- |
| **Node.js**        | Runtime для JavaScript на сервере        | 18+                 |
| **TypeScript**     | Типизированный JavaScript                | 5.0+                |
| **Hono**           | Web framework (легче Express, type-safe) | 3.0+                |
| **Prisma**         | ORM для работы с БД, миграции, типы      | 5.0+                |
| **SQLite**         | Встроенная база данных                   | 3.0+                |
| **Zod**            | Runtime validation схем                  | 3.0+                |
| **JWT**            | Токены для аутентификации                | встроено в hono/jwt |
| **Postman / curl** | Тестирование API                         | для debug           |

**Стек:** Node.js + TypeScript + Hono + Prisma + SQLite + JWT

---

## 📦 Установка и подготовка

### Стартовые команды

**1. Используйте Hono стартер (рекомендуется):**

```bash
npm create hono@latest quiz-backend -- --template nodejs
cd quiz-backend
npm install
```

**2. Установите дополнительные пакеты:**

**3. Настройте .env файл:**

```env
# .env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key-change-in-production"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
NODE_ENV="development"
```

**4. Запустите сервер:**

```bash
npm run dev
```

Должно вывести: `Server running on http://localhost:3000`

---

## 🗂️ Архитектура проекта

```
quiz-backend/
├── src/
│   ├── index.ts              # Точка входа (Hono app)
│   ├── routes/
│   │   └── auth.ts           # POST /api/auth/github/callback, GET /api/auth/me
│   ├── middleware/
│   │   └── auth.ts           # (опционально) JWT middleware для примера
│   └── utils/
│       └── validation.ts     # Zod schemas для валидации
├── prisma/
│   ├── schema.prisma         # User модель
│   └── migrations/           # История миграций БД
├── .env                      # Переменные окружения
├── package.json
├── tsconfig.json
└── README.md
```

---

## 📋 Последовательность действий (Checkpoints)

Работайте независимо. Каждый checkpoint — это отдельный блок функциональности. Начните с простого, двигайтесь к сложному.

### ✅ Checkpoint 1: Hello World

**Цель:** Запустить Hono сервер, вернуть статус

**Что делать:**

1. Создайте файл `src/index.ts` с базовым Hono приложением
2. Добавьте endpoint `GET /health` — должен вернуть `{"status":"ok"}`
3. Запустите `npm run dev`
4. Проверьте в браузере: `http://localhost:3000/health`

**Подсказка:** Посмотрите на слайд 8 в slides-speech.md (там hello-world пример)

**Проверка:** Браузер показывает JSON, сервер не падает

---

### ✅ Checkpoint 2: Prisma + User Model

**Цель:** Настроить БД, создать User модель

**Что делать:**

1. Отредактируйте `prisma/schema.prisma`
2. Создайте User модель с полями: `id`, `email`, `name`, `githubId`
3. Запустите миграцию: `npx prisma migrate dev --name init`
4. Проверьте БД через Prisma Studio: `npx prisma studio`

**Подсказка:**

- `email` и `githubId` должны быть unique
- `githubId` используется для GitHub OAuth
- Используйте `@default(cuid())` для `id`

**Проверка:** `npx prisma studio` открывается, User таблица пустая, но структура правильная

---

### ✅ Checkpoint 3: GitHub OAuth Callback

**Цель:** Реализовать обработку GitHub OAuth callback

**Что делать:**

1. Создайте `src/utils/validation.ts` с Zod schema для валидации `code`
2. Создайте `src/routes/auth.ts`
3. Реализуйте endpoint:
   - `POST /api/auth/github/callback` — обработка GitHub OAuth
   - Параметры: `code` (GitHub authorization code)
   - **Mock режим:** если `code` начинается с `test_` — использовать тестовые данные
   - **Real режим:** обменяйте код на GitHub access token через GitHub API
   - Получите данные пользователя из GitHub (id, email, name)
   - Создайте или обновите User в БД (используйте `githubId` как уникальный ключ)
   - Выдайте JWT токен с помощью `sign()` из `hono/jwt`
   - Вернуть `{token: "...", user: {...}}`
4. Подключите route в `src/index.ts`

**Подсказка:**

- Используйте `prisma.user.upsert()` для создания/обновления пользователя по `githubId`
- JWT создаётся встроенной функцией `sign()` из `hono/jwt`
- Для тестирования используйте код с префиксом `test_*` (например, `test_code`)

**Проверка (тестирование с mock данными):**

```bash
curl -X POST http://localhost:3000/api/auth/github/callback \
  -H "Content-Type: application/json" \
  -d '{"code":"test_code"}'
```

---

### ✅ Checkpoint 4: JWT Protection

**Цель:** Защитить endpoints JWT токенами

**Что делать:**

1. В `src/routes/auth.ts` добавьте функцию для проверки JWT:
   - Используйте `verify()` из `hono/jwt` с 3 аргументами: `verify(token, secret, 'HS256')`
   - Проверяйте `Authorization: Bearer <token>` header
   - Если токен валиден — извлеките `userId` из payload
   - Если нет — вернуть 401 Unauthorized
2. Можете опционально создать `src/middleware/auth.ts` для примера (не обязательно)

**Подсказка:**

- JWT_SECRET должен быть в .env
- `verify()` требует 3 аргумента: `await verify(token, JWT_SECRET, 'HS256')`
- Payload содержит `userId` и `email`
- Функция `sign()` из Checkpoint 3 создаёт токен с этими полями

**Проверка (после добавления токена из Checkpoint 3):**

```bash
TOKEN="your-jwt-token-from-checkpoint-3"
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

---

### ✅ Checkpoint 5: GET /api/auth/me

**Цель:** Реализовать получение текущего пользователя

**Что делать:**

1. В `src/routes/auth.ts` добавьте endpoint:
   - `GET /api/auth/me` — получить данные текущего пользователя
   - Проверьте JWT токен из `Authorization` header (из Checkpoint 4)
   - Извлеките `userId` из payload
   - Найдите пользователя в БД через `prisma.user.findUnique()`
   - Вернуть `{user: {id, email, name, githubId, createdAt}}`
2. Обработайте ошибки:
   - Нет токена → 401 Unauthorized
   - Невалидный токен → 401 Invalid token
   - Юзер не найден → 404 User not found

**Подсказка:** Используйте проверку JWT из Checkpoint 4 в начале handler'а

**Проверка:**

```bash
TOKEN="your-jwt-token-from-checkpoint-3"
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
# Должен вернуть: {"user": {"id": "...", "email": "...", "name": "...", "githubId": "...", "createdAt": "..."}}
```

---

## 📚 Справочные материалы

- **Теория лекции:** [GUIDE.md](docs/GUIDE.md) — объяснение концепций
- **Примеры кода:** [CHEATSHEET.md](docs/CHEATSHEET.md) — синтаксис и примеры
- **Интерактивные примеры:** [interactive.html](docs/interactive.html) — код с подсветкой
- **OpenAPI схема:** `../lr5/quiz-api-schema.yaml` — контракт API

---

## 🔧 Полезные команды

```bash
# Запуск в режиме разработки
npm run dev

# Prisma — просмотр БД в веб-интерфейсе
npx prisma studio

# Prisma — создание миграции после изменения schema
npx prisma migrate dev --name <name>

# Prisma — сброс БД (удаляет все данные!)
npx prisma migrate reset

# TypeScript — проверка типов
npx tsc --noEmit

# Тестирование API
curl -X GET http://localhost:3000/health
curl -X POST http://localhost:3000/api/auth/github/callback \
  -H "Content-Type: application/json" \
  -d '{"code":"test"}'
```

---

## ⚠️ Типичные проблемы и решения

| Проблема                                         | Причина                        | Решение                                          |
| ------------------------------------------------ | ------------------------------ | ------------------------------------------------ |
| `cannot find module 'hono'`                      | Зависимости не установлены     | `npm install`                                    |
| `ENOENT: no such file or directory, open '.env'` | Не создан .env файл            | Создайте `.env` с нужными переменными            |
| `Connection refused on 5432`                     | Нет БД                         | Используйте SQLite (файловая БД)                 |
| `401 Unauthorized`                               | Токен неверный или отсутствует | Проверьте header `Authorization: Bearer <token>` |
| `Column does not exist`                          | Миграция не применена          | Запустите `npx prisma migrate dev`               |

---

## 📊 Критерии оценки

Для получения хороших оценок:

- ✅ Все 5 checkpoints реализованы
- ✅ Endpoints возвращают данные согласно формату (JSON с token/user)
- ✅ Защищённые endpoints требуют JWT токен
- ✅ Нет ошибок в консоли при запуске
- ✅ Можно протестировать через curl/Postman
- ✅ Mock режим работает (code с префиксом `test_*`)
- ✅ Код читаем, с правильной типизацией TypeScript
- ✅ Зависимости установлены и явно перечислены в package.json

---

## 📝 Для студентов, проходивших LR5-6

Если вы делали LR5-6, вы уже знакомы с:

- OpenAPI схемой (`quiz-api-schema.yaml`)
- Endpoints для Quiz приложения
- Работой с API через React Query и Orval

**Что изменится:**

| LR5-6 (использование API)            | LR8 (создание API)                                   |
| ------------------------------------ | ---------------------------------------------------- |
| GET запрос к `/api/categories`       | **Вы реализуете** этот endpoint                      |
| Mock-server или внешний API          | **Ваш Hono backend** на localhost:3000               |
| `VITE_API_URL=http://dancv.ddns.net` | `VITE_API_URL=http://localhost:3000`                 |
| Orval генерирует React Query hooks   | Backend реализует endpoints, на которые идут запросы |

**Результат:** Ваше React приложение из LR5 сможет работать с вашим backend!

Если вы не делали LR5-6 — не переживайте! Вам не нужны знания из LR5-6 для прохождения LR8. Начните с нуля, следуя checkpoints.

---

## 🎓 Дополнительные ресурсы

- [Hono Documentation](https://hono.dev)
- [Prisma Documentation](https://www.prisma.io/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [JWT Introduction](https://jwt.io/introduction)
- [REST API Best Practices](https://restfulapi.net)

---

**Удачи! Вы создаёте свой первый backend! 🚀**
