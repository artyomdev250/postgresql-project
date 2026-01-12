# postgresql-project

REST API на **Node.js (Express)** + **PostgreSQL** с:

- регистрацией/входом (JWT **access token** + **refresh token** в httpOnly-cookie)
- обновлением токена (refresh rotation + хранение **хэша** refresh-токена в БД)
- CRUD для задач пользователя
- загрузкой изображения к задаче в **Cloudinary** (опционально)

## Стек

- Node.js (**Node 22** используется в Dockerfile)
- Express
- PostgreSQL (**Postgres 16** в docker-compose)
- pg, bcrypt, jsonwebtoken
- multer (upload до 5 MB в память), Cloudinary
- Docker / docker-compose

## Структура проекта (коротко)

- `server.js` — запуск Express, подключение роутов
- `routes/authRoutes.js` — `/auth/*`
- `routes/homeRoutes.js` — `/api/*` (защищено access-токеном)
- `db.js` — подключение к PostgreSQL через `pg.Pool`
- `middleware/auth.js` — `requireAuth` (проверка `Authorization: Bearer ...`)
- `middleware/upload.js` — конфиг `multer`
- `init.sql` — дамп/схема БД (таблицы `users_data`, `tasks_data`)

## Требования

- Node.js 22 (или совместимая версия) и npm **или** Docker + Docker Compose
- PostgreSQL 16 (если запускаете без Docker)
- Аккаунт Cloudinary (если хотите загружать картинки)

## Переменные окружения

Скопируйте пример и заполните значения:

```bash
cp .env.example .env
```

Описание ключевых переменных:

- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` — подключение к PostgreSQL
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — секреты подписи JWT
- `ACCESS_TOKEN_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN` — сроки жизни токенов (например `5m`, `7d`)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — Cloudinary (нужно только для загрузки изображений)

> ⚠️ `.env` содержит секреты. Не коммитьте его в репозиторий.

## Запуск через Docker (рекомендуется)

1) Создайте `.env` (см. выше)

2) Поднимите сервисы:

```bash
docker compose up --build
```

API будет доступно на `http://localhost:3000`.

### Инициализация базы данных

В проекте есть `init.sql`, но он **в кодировке UTF‑16LE** (это pg_dump). Удобнее один раз сконвертировать в UTF‑8 и применить.

**Вариант A: применить вручную (быстро)**

Из корня проекта:

```bash
iconv -f UTF-16LE -t UTF-8 init.sql > init.utf8.sql
docker compose exec -T db psql -U "$PGUSER" -d "$PGDATABASE" < init.utf8.sql
```

**Вариант B: автоприменение при первом старте Postgres**

1) Создайте `init.utf8.sql` как выше  
2) Добавьте volume в сервис `db` в `docker-compose.yml`:

```yaml
services:
  db:
    ...
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init.utf8.sql:/docker-entrypoint-initdb.d/init.sql:ro
```

3) Важно: init-скрипты выполняются только при **первом** создании volume. Если БД уже запускалась — удалите volume:

```bash
docker compose down -v
docker compose up --build
```

## Запуск без Docker (локально)

1) Поднимите PostgreSQL и создайте БД `PGDATABASE` (например `projectdb`)

2) Примените `init.sql` (с конвертацией):

```bash
iconv -f UTF-16LE -t UTF-8 init.sql > init.utf8.sql
psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -f init.utf8.sql
```

3) Установите зависимости и запустите сервер:

```bash
npm install
npm run dev   # nodemon
# или
npm start     # node server.js
```

## Аутентификация

- **Access token** возвращается в JSON при `POST /auth/signin` и используется в заголовке:
  `Authorization: Bearer <accessToken>`
- **Refresh token** кладётся в httpOnly-cookie `refreshToken` с `path=/auth/refresh`.  
  Это значит, что браузер будет отправлять cookie **только** на `/auth/refresh` (это нормально и сделано специально).

### Поток работы (типичный)

1) `POST /auth/signup` — регистрация  
2) `POST /auth/signin` — получить `accessToken` + установить refresh-cookie  
3) Ходить в защищённые `/api/*` с `Authorization: Bearer ...`  
4) При 401 — `POST /auth/refresh` (cookie должна быть отправлена), взять новый `accessToken`  
5) `POST /auth/signout` — разлогин (сбрасывает cookie и инвалидирует refresh в БД)

## API

Базовый URL (локально): `http://localhost:3000`

### Public

#### GET `/`
Проверка, что сервер жив.

Ответ (строка):
- `Node.js & PostgreSQL setup!`

### Auth (`/auth`)

#### POST `/auth/signup`
Регистрация.

**Body (JSON):**
```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "supersecret123"
}
```

**Ответ 201:**
```json
{
  "message": "User created.",
  "user": { "user_id": 1, "username": "alice", "email": "alice@example.com" }
}
```

#### POST `/auth/signin`
Вход по username **или** email.

**Body (JSON):**
```json
{
  "usernameOrEmail": "alice",
  "password": "supersecret123"
}
```

**Ответ 200:**
- устанавливает httpOnly-cookie `refreshToken`
- возвращает `accessToken`

```json
{
  "message": "Signed in.",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "user_id": 1, "username": "alice", "email": "alice@example.com" }
}
```

#### POST `/auth/refresh`
Обновление access-токена по refresh-cookie. Refresh-токен **ротируется** (выдаётся новый и его хэш сохраняется в БД).

**Ответ 200:**
```json
{
  "message": "Token refreshed.",
  "accessToken": "...",
  "user": { "user_id": 1, "username": "alice", "email": "alice@example.com" }
}
```

#### POST `/auth/signout`
Выход: очищает refresh-cookie и ставит `refresh_token_hash = NULL` в БД (если refresh-токен валиден).

**Ответ 200:**
```json
{ "message": "Signed out." }
```

### Protected (`/api`)

Все эндпоинты ниже требуют заголовок:

```
Authorization: Bearer <accessToken>
```

#### GET `/api/home`
Мини-профиль из access-токена.

**Ответ 200:**
```json
{ "username": "alice", "email": "alice@example.com" }
```

### Задачи (`/api/tasks`)

Модель задачи (ответы):
- `task_id` — number
- `title` — string
- `description` — string
- `tags` — массив строк
- `status` — `"Pending"` или `"Completed"`
- `image_url` / `image_public_id` — может быть `null`
- `created_at`, `updated_at` — timestamps

#### GET `/api/tasks`
Список задач текущего пользователя.

**Ответ 200:** массив задач.

#### GET `/api/tasks/:id`
Одна задача по `task_id`.

**Ответ 200:** объект задачи  
**Ответ 404:** `{ "message": "Task not found." }`

#### POST `/api/tasks`
Создать задачу.

`Content-Type: multipart/form-data`

Поля:
- `title` (text, обязательно)
- `description` (text, обязательно)
- `tags` (text, обязательно) — можно:
  - строка через запятую: `work,home,urgent`
  - или JSON-массив: `["work","home"]`
- `image` (file, необязательно) — картинка до **5 MB**, грузится в Cloudinary

**Ответ 201:** объект созданной задачи.

#### PUT `/api/tasks/:id`
Обновить задачу (частичное обновление).

`Content-Type: multipart/form-data`

Можно передавать:
- `title` (text)
- `description` (text)
- `tags` (text) — формат как в POST
- `status` (text) — только `Pending` или `Completed`
- `image` (file) — чтобы **заменить** картинку
- `removeImage` (text/bool) — чтобы **удалить** картинку (`true`, `1`, `yes`, `on`)

**Ответ 200:** обновлённая задача.

#### DELETE `/api/tasks/:id`
Удалить задачу (и картинку в Cloudinary, если была).

**Ответ 200:**
```json
{ "message": "Task deleted.", "task_id": 24 }
```

## Postman

В архиве есть Postman-коллекция `postgresql-project` (JSON). Импортируйте её в Postman и используйте запросы:

- `auth/sign_up`, `auth/sign_in`, `auth/refresh`, `auth/sign_out`
- `home/home`
- `home/tasks/*`

> Для `POST/PUT` задач коллекция использует `form-data` (и поле `image` как файл — опционально).

## Частые проблемы

- **`relation "users_data" does not exist` / `relation "tasks_data" does not exist`**  
  Вы не применили `init.sql` (см. раздел “Инициализация базы данных”).

- **401 `Invalid or expired access token.`**  
  Access-токен истёк → вызовите `/auth/refresh` (cookie должна отправляться), получите новый `accessToken`.

- **401 `Missing refresh token.`**  
  Refresh-cookie нет (не логинились, удалили cookie, другой домен/порт) → сделайте `POST /auth/signin`.

- **Ошибки загрузки изображений**  
  Проверьте `CLOUDINARY_*` переменные. Если Cloudinary не нужен — просто не отправляйте поле `image`.

## Лицензия

Не задана (можно добавить при необходимости).
