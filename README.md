# Task Manager REST API — Valentius Kryptix WA-2 Internship Project

A secure, scalable, and production-ready **Task Manager REST API** engineered with **Node.js**, **Express.js**, **SQLite**, and **JSON Web Token (JWT) Authentication**.

Designed and implemented for the **Valentius Kryptix Intern Hub Web App Internship — Task WA-2: Backend REST API**.

---

## 📋 Table of Contents
1. [Project Overview & Key Features](#-project-overview--key-features)
2. [Technology Stack](#-technology-stack)
3. [Database Schema & Design](#-database-schema--design)
4. [Architecture & Folder Structure](#-architecture--folder-structure)
5. [Prerequisites](#-prerequisites)
6. [Installation & Setup Guide](#-installation--setup-guide)
7. [Environment Variables Configuration](#-environment-variables-configuration)
8. [Running the Application & Tests](#-running-the-application--tests)
9. [Complete API Endpoint Documentation](#-complete-api-endpoint-documentation)
   - [Health & Status Check](#1-health--status-check)
   - [Authentication Endpoints](#2-authentication-endpoints)
   - [Task Management Endpoints](#3-task-management-endpoints)
10. [Security & Ownership Safeguards](#-security--ownership-safeguards)
11. [Postman Testing & Collection Guide](#-postman-testing--collection-guide)
12. [Troubleshooting & FAQ](#-troubleshooting--faq)
13. [Interview Defense Guide](#-interview-defense-guide)
14. [GitHub Deployment Steps](#-github-deployment-steps)

---

## 🌟 Project Overview & Key Features

This backend REST API provides multi-user task management capabilities with security-first architecture. Each user has full CRUD (Create, Read, Update, Delete) control over their tasks, with complete data isolation enforced at the database layer.

### ✨ Key Capabilities
- **Stateless JWT Authentication:** Secure registration and login issuing signed JSON Web Tokens with configurable expiration (`24h`).
- **Cryptographic Password Hashing:** User passwords hashed using `bcryptjs` (salt rounds: 10) before database persistence. Plaintext passwords or hashes are never exposed.
- **Strict User Ownership Enforcement:** A user can only access, update, or delete their own tasks. Cross-user data access returns `HTTP 404 Not Found` to prevent resource enumeration.
- **Robust Input Validation:** Parameterized request body and route validation powered by `express-validator` with descriptive field-level error messages.
- **Relational SQLite Storage:** Normalized schema with foreign key enforcement (`PRAGMA foreign_keys = ON;`), unique constraints, and indexed queries.
- **Centralized Error Handling:** Uniform JSON response structure handling 400, 401, 404, 409, and 500 errors without leaking server stack traces in production.
- **Automated Test Coverage:** End-to-end integration tests using `Jest` and `Supertest` covering authentication flows, validation edges, and cross-user isolation.
- **Ready-to-Use Postman Suite:** Pre-configured collection with automatic JWT variable assignment for instant testing.

---

## 🛠 Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Runtime** | Node.js (v18+ / v20+ / v22+) | High-performance asynchronous JavaScript engine |
| **Framework** | Express.js (v4.x) | Lightweight web application routing and middleware framework |
| **Database** | SQLite3 | Serverless, zero-configuration relational SQL engine |
| **Security** | `bcryptjs` | Salted cryptographic password hashing |
| **Auth** | `jsonwebtoken` (JWT) | Stateless signed bearer token authorization |
| **Validation** | `express-validator` | Declarative schema validation and request sanitization |
| **Environment** | `dotenv` | Secure configuration injection from `.env` files |
| **Testing** | `Jest` & `Supertest` | Automated unit, integration, and HTTP lifecycle testing |
| **Tooling** | Postman | API design, manual testing, and documentation |

---

## 🗄 Database Schema & Design

The database uses SQLite with foreign key enforcement enabled upon every connection.

```
+------------------------------------+          +------------------------------------+
|               users                |          |               tasks                |
+------------------------------------+          +------------------------------------+
| id (INTEGER, PK, AUTOINCREMENT)    |<---1:N---| id (INTEGER, PK, AUTOINCREMENT)    |
| name (TEXT, NOT NULL)              |          | user_id (INTEGER, FK -> users.id)  |
| email (TEXT, UNIQUE, NOCASE)       |          | title (TEXT, NOT NULL)             |
| password_hash (TEXT, NOT NULL)     |          | description (TEXT)                 |
| created_at (DATETIME, CURRENT_TIME)|          | status (TEXT, DEFAULT 'pending')   |
+------------------------------------+          | due_date (DATETIME)                |
                                                | created_at (DATETIME, CURRENT_TIME)|
                                                | updated_at (DATETIME, CURRENT_TIME)|
                                                +------------------------------------+
```

### Table Definitions

#### 1. `users` Table
```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. `tasks` Table
```sql
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed')),
  due_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Indexes
- `idx_tasks_user_id`: Optimizes `SELECT ... WHERE user_id = ?` lookups.
- `idx_tasks_status`: Speeds up filtering queries by status (`pending`, `in_progress`, `completed`).
- `idx_users_email`: Enforces case-insensitive uniqueness and fast email lookups during login.

---

## 📂 Architecture & Folder Structure

The project follows a clean **Controller-Model-Route-Middleware** architectural pattern:

```text
task-manager-api/
├── src/
│   ├── config/
│   │   └── database.js           # SQLite connection pool, promisified queries & schema migrations
│   ├── controllers/
│   │   ├── auth.controller.js    # Registration and JWT login business logic
│   │   └── task.controller.js    # Task CRUD logic with strict ownership filtering
│   ├── middleware/
│   │   ├── authenticate.js       # Bearer JWT verification and user injection
│   │   ├── errorHandler.js       # Centralized 404 & 500 error management
│   │   └── validate.js           # Express-validator error aggregation
│   ├── models/
│   │   ├── user.model.js         # Parameterized SQL queries for user persistence
│   │   └── task.model.js         # Parameterized SQL queries for tasks
│   ├── routes/
│   │   ├── auth.routes.js        # /api/auth endpoint routes
│   │   └── task.routes.js        # /api/tasks endpoint routes
│   ├── app.js                    # Express app configuration & middleware pipeline
│   └── server.js                 # Server entry point & graceful shutdown handling
├── tests/
│   ├── auth.test.js              # Integration tests for auth & password hashing
│   └── task.test.js              # Integration tests for CRUD & cross-user isolation
├── .env.example                  # Environment variable blueprint
├── .gitignore                    # Prevents node_modules, .env, and .db from being committed
├── package.json                  # Project metadata, dependencies, and test scripts
├── postman_collection.json       # Exported Postman collection for manual verification
└── README.md                     # Comprehensive documentation
```

---

## ⚙️ Prerequisites

Before getting started, make sure you have:
- **Node.js** v18.0.0 or higher (`node -v`)
- **npm** v9.0.0 or higher (`npm -v`)
- **Git** (`git --version`)
- **Postman** (Desktop application or web agent for API testing)

---

## 🚀 Installation & Setup Guide

### 1. Clone or Navigate to the Project
```bash
cd task-manager-api
```

### 2. Install Project Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy the example environment file to `.env`:
```bash
# Windows PowerShell
Copy-Item .env.example .env

# macOS / Linux / Git Bash
cp .env.example .env
```

---

## 🔑 Environment Variables Configuration

The `.env` file holds server and security settings:

| Variable | Description | Default / Example |
|---|---|---|
| `PORT` | HTTP port the server listens on | `5000` |
| `NODE_ENV` | Runtime environment (`development`, `production`, `test`) | `development` |
| `DB_PATH` | Relative or absolute path to SQLite file | `./data/tasks.db` |
| `JWT_SECRET` | Secret key used to sign and verify JWT tokens | *(32+ character strong secret)* |
| `JWT_EXPIRES_IN` | Validity duration of signed tokens | `24h` (or `1h`, `7d`) |

> [!WARNING]
> Never commit `.env` or your production `JWT_SECRET` to GitHub or version control. Always keep `.env` listed in `.gitignore`.

---

## 🧪 Running the Application & Tests

### Start Development Server (Auto-reload with Nodemon)
```bash
npm run dev
```

### Start Production Server
```bash
npm start
```
The server will start at `http://localhost:5000`.

### Run Automated Integration Tests
```bash
npm test
```
The test suite utilizes an isolated test database (`data/test-*.db`) which is automatically created, tested, and torn down to prevent polluting real development data.

---

## 📖 Complete API Endpoint Documentation

Base URL: `http://localhost:5000`

### Summary of Status Codes Used
- **200 OK**: Request succeeded (Read, Update, Login).
- **201 Created**: Resource created successfully (Registration, Create Task).
- **400 Bad Request**: Validation error, missing required fields, or malformed JSON.
- **401 Unauthorized**: Missing, invalid, or expired JWT token; or incorrect login credentials.
- **404 Not Found**: Resource not found or belongs to another user.
- **409 Conflict**: Duplicate email address during registration.
- **500 Internal Server Error**: Unexpected server-side failure.

---

### 1. Health & Status Check

#### `GET /api/health`
Check if the API server and database are healthy.

- **Authentication:** None (Public)
- **Response `200 OK`**:
```json
{
  "success": true,
  "status": "ok",
  "message": "Task Manager REST API is running smoothly",
  "timestamp": "2026-10-25T01:15:00.000Z",
  "environment": "development"
}
```

---

### 2. Authentication Endpoints

#### `POST /api/auth/register`
Register a new user account with secure password hashing.

- **Authentication:** None (Public)
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "name": "Syed Aqdas",
  "email": "aqdas.dev@example.com",
  "password": "SecurePassword123"
}
```
- **Validation Rules:**
  - `name`: Required, 2-50 characters.
  - `email`: Required, valid email format, normalized.
  - `password`: Required, minimum 6 characters, must include at least 1 numeric digit.

- **Response `201 Created`**:
```json
{
  "success": true,
  "message": "User registered successfully.",
  "data": {
    "user": {
      "id": 1,
      "name": "Syed Aqdas",
      "email": "aqdas.dev@example.com"
    }
  }
}
```
- **Error Responses:**
  - `400 Bad Request`: Input validation failed.
  - `409 Conflict`: `{"success": false, "message": "An account with this email address already exists."}`

---

#### `POST /api/auth/login`
Authenticate user credentials and obtain a signed JWT token.

- **Authentication:** None (Public)
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "email": "aqdas.dev@example.com",
  "password": "SecurePassword123"
}
```

- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "Syed Aqdas",
      "email": "aqdas.dev@example.com",
      "created_at": "2026-10-25 01:15:00"
    }
  }
}
```

- **Error Responses:**
  - `400 Bad Request`: Missing email or password.
  - `401 Unauthorized`: `{"success": false, "message": "Invalid email or password."}`

---

### 3. Task Management Endpoints

All task endpoints require an `Authorization` header containing the JWT token received from `/api/auth/login`:
```http
Authorization: Bearer <your_jwt_access_token>
```

---

#### `POST /api/tasks`
Create a new task belonging to the authenticated user.

- **Authentication:** Required (`Bearer <token>`)
- **Headers:**
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "title": "Build REST API for Valentius Kryptix",
  "description": "Implement authentication, SQLite models, and tests",
  "status": "in_progress",
  "dueDate": "2026-10-31T18:00:00.000Z"
}
```
- **Fields:**
  - `title` *(string, required)*: Non-empty, max 200 characters.
  - `description` *(string, optional)*: Up to 1000 characters.
  - `status` *(string, optional)*: `pending` (default), `in_progress`, or `completed`.
  - `dueDate` *(string, optional)*: Valid ISO 8601 date string.

- **Response `201 Created`**:
```json
{
  "success": true,
  "message": "Task created successfully.",
  "data": {
    "task": {
      "id": 1,
      "user_id": 1,
      "title": "Build REST API for Valentius Kryptix",
      "description": "Implement authentication, SQLite models, and tests",
      "status": "in_progress",
      "due_date": "2026-10-31T18:00:00.000Z",
      "created_at": "2026-10-25 01:20:00",
      "updated_at": "2026-10-25 01:20:00"
    }
  }
}
```

---

#### `GET /api/tasks`
Retrieve all tasks belonging to the authenticated user.

- **Authentication:** Required (`Bearer <token>`)
- **Query Parameters (Optional):**
  - `status`: Filter by status (`pending`, `in_progress`, `completed`). Example: `/api/tasks?status=completed`

- **Response `200 OK`**:
```json
{
  "success": true,
  "count": 1,
  "data": {
    "tasks": [
      {
        "id": 1,
        "user_id": 1,
        "title": "Build REST API for Valentius Kryptix",
        "description": "Implement authentication, SQLite models, and tests",
        "status": "in_progress",
        "due_date": "2026-10-31T18:00:00.000Z",
        "created_at": "2026-10-25 01:20:00",
        "updated_at": "2026-10-25 01:20:00"
      }
    ]
  }
}
```

---

#### `GET /api/tasks/:id`
Retrieve a single task by ID.

- **Authentication:** Required (`Bearer <token>`)
- **Path Parameter:** `:id` (Positive Integer)

- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "task": {
      "id": 1,
      "user_id": 1,
      "title": "Build REST API for Valentius Kryptix",
      "description": "Implement authentication, SQLite models, and tests",
      "status": "in_progress",
      "due_date": "2026-10-31T18:00:00.000Z",
      "created_at": "2026-10-25 01:20:00",
      "updated_at": "2026-10-25 01:20:00"
    }
  }
}
```

- **Error Responses:**
  - `401 Unauthorized`: Token missing or expired.
  - `404 Not Found`: Task does not exist OR belongs to another user.

---

#### `PUT /api/tasks/:id`
Update an existing task belonging to the authenticated user.

- **Authentication:** Required (`Bearer <token>`)
- **Headers:** `Content-Type: application/json`
- **Request Body (At least one valid field required):**
```json
{
  "title": "Build REST API - Final Polish",
  "status": "completed"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Task updated successfully.",
  "data": {
    "task": {
      "id": 1,
      "user_id": 1,
      "title": "Build REST API - Final Polish",
      "description": "Implement authentication, SQLite models, and tests",
      "status": "completed",
      "due_date": "2026-10-31T18:00:00.000Z",
      "created_at": "2026-10-25 01:20:00",
      "updated_at": "2026-10-25 01:25:00"
    }
  }
}
```
- **Error Responses:**
  - `400 Bad Request`: Empty update payload or unrecognized fields.
  - `404 Not Found`: Task does not exist OR belongs to another user.

---

#### `DELETE /api/tasks/:id`
Delete an existing task belonging to the authenticated user.

- **Authentication:** Required (`Bearer <token>`)
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Task deleted successfully."
}
```
- **Error Responses:**
  - `404 Not Found`: Task does not exist OR belongs to another user.

---

## 🔒 Security & Ownership Safeguards

1. **SQL Injection Defense:** All queries in `user.model.js` and `task.model.js` use parameterized placeholder queries (`?`), preventing SQL injection attacks entirely.
2. **Database-Level Ownership Enforcement:** All task query mutations and lookups enforce `WHERE id = ? AND user_id = ?`. User B cannot modify or read User A's data even if User B guesses User A's task ID.
3. **No ID Enumeration:** Cross-user access attempts return `HTTP 404 Not Found` rather than `403 Forbidden`, preventing malicious actors from knowing whether a task ID exists on the server.
4. **Stateless JWT Validation:** Expired or tampered tokens are rejected before reaching controller business logic.
5. **No Password Leakage:** The `password_hash` column is never selected in user profile endpoints or returned in registration/login responses.
6. **Environment Separation:** Database files and sensitive tokens are separated from source code via `.env` and `.gitignore`.

---

## 📬 Postman Testing & Collection Guide

A complete, pre-configured collection is included at `postman_collection.json`.

### How to Import and Use:
1. Open **Postman**.
2. Click **Import** (top-left) and select `postman_collection.json` from the `task-manager-api` folder.
3. The collection **Valentius Kryptix WA-2 - Task Manager REST API** will appear in your left sidebar.
4. **Auto-Token Magic:**
   - Run the **Login User (Success)** request.
   - The included Postman test script will automatically capture the returned JWT access token and store it in the collection's `{{token}}` variable!
   - Every subsequent request in the `Tasks CRUD (Protected)` folder is already configured with `Bearer {{token}}` and will execute immediately.
5. **Automated ID Capture:**
   - Creating a task automatically stores the new `task_id` into the `{{task_id}}` variable so `GET /tasks/:id`, `PUT /tasks/:id`, and `DELETE /tasks/:id` work without manual copy-pasting.

---

## 🔧 Troubleshooting & FAQ

### 1. `Error: Cannot find module 'express'` or other dependencies
**Fix:** Run `npm install` inside the `task-manager-api` directory.

### 2. `SQLITE_BUSY: database is locked`
**Fix:** Ensure no external database viewing tools (such as DB Browser for SQLite) have locked the `tasks.db` file during transactions.

### 3. `401 Unauthorized: Access denied. No Bearer token provided`
**Fix:** Ensure your request includes the header:
`Authorization: Bearer <your_token_here>`. If using Postman, log in first to auto-populate the `{{token}}` variable.

### 4. `EADDRINUSE: address already in use :::5000`
**Fix:** Another process is using port 5000. Either terminate the process or change `PORT=5001` in your `.env` file.

---

## 🎓 Interview Defense Guide

When asked to explain or defend this project in an internship interview, you can confidently explain the design choices with these talking points:

### 1. Architectural Pattern
> *"I designed the application following the MVC (Model-View-Controller) pattern, adapted for REST APIs as Controller-Model-Route-Middleware. This separates route definitions (`routes/`), request sanitization (`validators/`), business logic (`controllers/`), and SQL database interaction (`models/`), ensuring maximum readability and maintainability."*

### 2. How Ownership & Authorization Work
> *"I ensured data isolation wasn't just handled in JavaScript logic; it is strictly enforced in the SQL queries. Every task query for reading, updating, or deleting requires both `id = ?` and `user_id = ?`. If User B attempts to access User A's task, the query returns 0 rows, which maps to an HTTP 404 response. We return 404 instead of 403 to prevent resource enumeration attacks."*

### 3. Password Storage & Authentication
> *"Passwords are never stored in plaintext. When a user registers, we use `bcryptjs` with a cost factor (salt rounds) of 10 to hash the password before inserting it into SQLite. Upon login, we use `bcrypt.compare` to prevent timing attacks. On success, we generate a cryptographically signed JSON Web Token containing the user's ID and email with a 24-hour expiration."*

### 4. Database Integrity
> *"SQLite disables foreign key enforcement by default for backward compatibility. To ensure referential integrity, I explicitly execute `PRAGMA foreign_keys = ON;` on every database connection. This ensures cascading deletes work properly if a user is removed."*

---

## 🚀 GitHub Deployment Steps

To push this project to your GitHub profile:

```bash
# 1. Navigate into the task-manager-api folder
cd task-manager-api

# 2. Initialize a git repository (if not already inside one)
git init

# 3. Verify that .gitignore is working and .env / node_modules are excluded
git status

# 4. Stage and commit all files
git add .
git commit -m "feat: complete Valentius Kryptix WA-2 Task Manager REST API with Express, SQLite, and JWT"

# 5. Create a new repository on GitHub (e.g. valentius-kryptix-task-manager-api)

# 6. Link remote and push to main
git remote add origin https://github.com/<your-username>/valentius-kryptix-task-manager-api.git
git branch -M main
git push -u origin main
```
