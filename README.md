# ⚙️ OnlineCinema — Backend REST API

Серверная часть для кроссплатформенного приложения онлайн-кинотеатра `OnlineCinema`. Предоставляет REST API для работы с пользователями, каталогом фильмов, социальной составляющей, подписками и валидацией промокодов.

> 📱 **Клиентская часть (Frontend):** Исходный код приложения на React Native / Expo доступен в репозитории [OnlineCinema Frontend](https://github.com/Nickaykr/OnlineCinema).

---

## 🛠 Технологический стек

* **Runtime Environment:** Node.js
* **Framework:** Express.js
* **Язык программирования:** JavaScript (ES6+)
* **База данных:** MySQL / PostgreSQL
* **Аутентификация:** JWT (JSON Web Tokens) & Password Hashing (bcrypt)
* **Протокол:** REST API (JSON)

---

## 📌 Ключевые возможности & Эндпоинты API

### 🔐 Авторизация и Пользователи
* `POST /api/auth/register` — Регистрация нового пользователя
* `POST /api/auth/login` — Авторизация и выдача JWT-токена
* `GET /api/users/profile` — Получение данных профиля текущего пользователя

### 🎬 Фильмы и Каталог
* `GET /api/movies` — Получение списка фильмов с поддержкой фильтрации
* `GET /api/movies/:id` — Подробные данные фильма (описание, рейтинг, актеры)

### 💳 Подписки и Промокоды
* `POST /api/subscriptions/validate` — Валидация и активация промокодов
* `GET /api/subscriptions/subscribe` — Оформление подписки

---

## 📦 Инструкция по локальному запуску

### Предварительные требования
* **Node.js** (версия `18.x` или выше)
* Установленная база данных (**MySQL** / **PostgreSQL**)
* **npm** или **yarn**

---

### Шаги установки

1. Клонируйте репозиторий и перейдите в папку проекта:
```bash
git clone [https://github.com/Nickaykr/my-server.git](https://github.com/Nickaykr/my-server.git)
cd my-server
```

2. Установите зависимости:
```bash
npm install
```

3. Настройте переменные окружения:
Создайте файл `.env` в корневой папке проекта со следующими параметрами:
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=cinema_db
JWT_SECRET=your_secret_jwt_key
```

4. Запустите сервер:
```bash
npm start
```
*Для запуска в режиме разработки с автоматическим перезапуском:*
```bash
npm run dev
```

---

## 👨‍💻 Разработчик

* **GitHub:** [@Nickaykr](https://github.com/Nickaykr)
