# 🎓 EduPlatform — Enterprise MERN Stack LMS

**Production-ready, enterprise-grade Learning Management System**
Built with Node.js + Express + MongoDB + Vanilla JS (React-pattern architecture)

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐   │
│  │ Router   │  │ Store    │  │   API    │  │  Socket.io    │   │
│  │ (Hash)   │  │ (Redux-  │  │  Client  │  │  Client       │   │
│  │          │  │  like)   │  │ (Axios)  │  │               │   │
│  └──────────┘  └──────────┘  └──────────┘  └───────────────┘   │
└────────────────────────────────────┬────────────────────────────┘
                                     │ HTTPS + WSS
┌────────────────────────────────────▼────────────────────────────┐
│                    Express Server (Node.js)                       │
│  ┌──────────────┐  ┌─────────────┐  ┌───────────────────────┐   │
│  │  Middleware  │  │   Routes    │  │  Socket.io Server     │   │
│  │  • helmet    │  │  /auth      │  │  • Auth middleware     │   │
│  │  • cors      │  │  /users     │  │  • Room management    │   │
│  │  • rateLimit │  │  /courses   │  │  • Events             │   │
│  │  • auth JWT  │  │  /dashboard │  └───────────────────────┘   │
│  └──────────────┘  └─────────────┘                               │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │               Controllers (MVC)                          │    │
│  │  authController │ userController │ courseController      │    │
│  │  dashboardController                                     │    │
│  └──────────────────────────────────────────────────────────┘    │
└────────────────────────────────────┬────────────────────────────┘
                                     │ Mongoose ODM
┌────────────────────────────────────▼────────────────────────────┐
│                     MongoDB Database                              │
│  ┌────────────┐   ┌──────────────┐   ┌────────────────────┐     │
│  │   Users    │   │   Courses    │   │   (Notifications)  │     │
│  │ Collection │   │ Collection   │   │   Collection       │     │
│  └────────────┘   └──────────────┘   └────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
mern-edu-platform/
├── backend/
│   ├── server.js                    # Entry point
│   ├── .env.example                 # Environment variables template
│   ├── package.json
│   ├── config/
│   │   └── db.js                    # MongoDB connection
│   ├── controllers/                 # MVC Controllers
│   │   ├── authController.js        # Register, Login, Logout, Refresh
│   │   ├── userController.js        # User CRUD + Admin ops
│   │   ├── courseController.js      # Course CRUD + Enrollment
│   │   └── dashboardController.js   # Analytics per role
│   ├── middleware/
│   │   ├── auth.js                  # JWT protect + role authorize
│   │   ├── errorHandler.js          # Global error handling
│   │   └── validate.js              # Input validation (express-validator)
│   ├── models/
│   │   ├── User.js                  # User schema + bcrypt hooks
│   │   └── Course.js                # Course schema + modules
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── courseRoutes.js
│   │   └── dashboardRoutes.js
│   ├── sockets/
│   │   └── socketManager.js         # Socket.io server logic
│   └── utils/
│       ├── jwtHelper.js             # Token generation/verification
│       └── apiResponse.js           # Standardized responses
│
└── frontend/
    ├── index.html                   # SPA entry point
    ├── css/
    │   └── main.css                 # Complete design system
    └── js/
        ├── main.js                  # App bootstrap
        ├── store/
        │   └── store.js             # Global state (Redux pattern)
        ├── utils/
        │   ├── api.js               # Axios client + interceptors
        │   ├── socket.js            # Socket.io client
        │   ├── router.js            # Client-side routing
        │   ├── validation.js        # Form validation
        │   └── toast.js             # Notifications
        ├── components/
        │   └── layout/
        │       └── AppShell.js      # Sidebar + Navbar
        └── pages/
            ├── auth/
            │   ├── login.js
            │   └── register.js
            ├── admin/
            │   └── dashboard.js
            ├── teacher/
            │   └── dashboard.js
            └── student/
                └── dashboard.js
```

---

## 🔐 Complete Authentication Flow

```
REGISTRATION:
┌────────────┐     POST /api/auth/register      ┌────────────────┐
│   Client   │ ─────────────────────────────▶  │    Server      │
│            │   {firstName, lastName,           │                │
│            │    email, password, role}         │ 1. Validate    │
│            │                                   │ 2. Hash pass   │
│            │                                   │ 3. Save user   │
│            │                                   │ 4. Gen tokens  │
│            │ ◀───────────────────────────────  │ 5. Return      │
│            │   {user, accessToken,             │                │
│            │    refreshToken}                  └────────────────┘
│            │
│ Store tokens in localStorage                  
│ Update Redux store
│ Init Socket.io
│ Redirect to dashboard
└────────────┘

LOGIN:
Same flow but with password comparison via bcrypt.compare()

PROTECTED REQUESTS:
┌────────────┐     GET /api/dashboard/admin      ┌────────────────┐
│   Client   │  Authorization: Bearer {token} ▶  │    Server      │
│            │                                    │                │
│            │                                    │ protect()      │
│            │                                    │ 1. Extract     │
│            │                                    │    token       │
│            │                                    │ 2. Verify JWT  │
│            │                                    │ 3. Find user   │
│            │                                    │ 4. Check role  │
│            │ ◀──────────────────────────────── │ 5. Pass/Deny   │
│            │   {success: true, data: {...}}     └────────────────┘
└────────────┘

TOKEN REFRESH (auto, on 401):
┌────────────┐     POST /api/auth/refresh         ┌────────────────┐
│   Client   │  {refreshToken}                 ▶  │    Server      │
│ [Intercept │                                     │                │
│   401]     │                                     │ 1. Verify RT   │
│            │                                     │ 2. Find user   │
│            │                                     │ 3. Check DB    │
│            │                                     │ 4. Gen new     │
│            │ ◀───────────────────────────────── │    pair        │
│            │   {accessToken, refreshToken}       └────────────────┘
│ Retry      │
│ original   │
│ request    │
└────────────┘

LOGOUT:
- Client sends POST /api/auth/logout with refreshToken
- Server removes refreshToken from user.refreshTokens[]
- Client clears localStorage, disconnects socket, resets store
```

---

## 📡 Complete API Endpoint Reference

### 🔑 Auth Routes `/api/auth`
| Method | Endpoint        | Access  | Description                    |
|--------|-----------------|---------|--------------------------------|
| POST   | `/register`     | Public  | Create new account             |
| POST   | `/login`        | Public  | Sign in, get tokens            |
| POST   | `/refresh`      | Public  | Get new access token           |
| GET    | `/me`           | Private | Get current user data          |
| POST   | `/logout`       | Private | Logout (this device)           |
| POST   | `/logout-all`   | Private | Logout all devices             |

### 👥 User Routes `/api/users`
| Method | Endpoint                    | Access          | Description              |
|--------|-----------------------------|-----------------|--------------------------|
| GET    | `/`                         | Admin           | List all users (paginated)|
| GET    | `/stats`                    | Admin           | User statistics          |
| GET    | `/:id`                      | Admin \| Self   | Get single user          |
| PUT    | `/:id`                      | Admin \| Self   | Update profile           |
| PATCH  | `/:id/change-password`      | Self only       | Change password          |
| PATCH  | `/:id/toggle-status`        | Admin           | Activate/Deactivate      |
| DELETE | `/:id`                      | Admin           | Delete user              |

### 📚 Course Routes `/api/courses`
| Method | Endpoint            | Access              | Description            |
|--------|---------------------|---------------------|------------------------|
| GET    | `/`                 | Public              | List courses (search+filter) |
| GET    | `/:id`              | Public              | Get course details     |
| POST   | `/`                 | Admin \| Teacher    | Create course          |
| PUT    | `/:id`              | Admin \| Owner      | Update course          |
| PATCH  | `/:id/publish`      | Admin \| Owner      | Toggle publish         |
| POST   | `/:id/enroll`       | Student             | Enroll in course       |
| DELETE | `/:id`              | Admin               | Delete course          |

### 📊 Dashboard Routes `/api/dashboard`
| Method | Endpoint   | Access                 | Description               |
|--------|------------|------------------------|---------------------------|
| GET    | `/admin`   | Admin                  | Platform-wide analytics   |
| GET    | `/teacher` | Admin \| Teacher       | Teaching analytics        |
| GET    | `/student` | Admin \| Student       | Learning progress         |

### 🏥 Health
| Method | Endpoint       | Access | Description          |
|--------|----------------|--------|----------------------|
| GET    | `/api/health`  | Public | Server health check  |

---

## 🔌 Socket.io Events Reference

### Client → Server
| Event                  | Payload                          | Description                    |
|------------------------|----------------------------------|--------------------------------|
| `course:join`          | `courseId: string`               | Join course room               |
| `course:leave`         | `courseId: string`               | Leave course room              |
| `course:announcement`  | `{courseId, message}`            | Send announcement to course    |
| `admin:notify`         | `{targetRole, message, type}`    | Broadcast to role (admin only) |
| `ping`                 | —                                | Heartbeat                      |

### Server → Client
| Event                  | Payload                          | Who receives                   |
|------------------------|----------------------------------|--------------------------------|
| `notification`         | `{message, type, from}`          | Targeted user/role             |
| `presence:update`      | `{onlineCount}`                  | Connecting user                |
| `user:online`          | `{userId, name, role}`           | Admins                         |
| `user:offline`         | `{userId, name, reason}`         | Admins                         |
| `course:newEnrollment` | `{studentName, courseTitle}`     | Course instructor              |
| `course:announcement`  | `{message, from, courseId}`      | Course room members            |
| `user:registered`      | `{id, name, role, email}`        | Admins                         |
| `pong`                 | `{timestamp}`                    | Requesting client              |

---

## ⚙️ Environment Configuration

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb://localhost:27017/mern_edu_platform

# JWT (use strong random secrets in production!)
JWT_ACCESS_SECRET=your_64+_char_secret_here
JWT_REFRESH_SECRET=different_64+_char_secret_here
JWT_ACCESS_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# CORS
CLIENT_URL=http://localhost:3000

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
BCRYPT_SALT_ROUNDS=12
```

---

## 🚀 Step-by-Step Setup

### Prerequisites
- Node.js v18+
- MongoDB v6+ (local or Atlas)
- npm or yarn

### Backend Setup
```bash
# 1. Navigate to backend
cd mern-edu-platform/backend

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env
# → Edit .env with your values

# 4. Start development server
npm run dev

# Server starts at http://localhost:5000
# Test: GET http://localhost:5000/api/health
```

### Frontend Setup
```bash
# Frontend is pure HTML/CSS/JS — no build step needed!

# Option 1: VS Code Live Server (recommended)
# Install "Live Server" extension → Right click index.html → "Open with Live Server"

# Option 2: Python HTTP server
cd mern-edu-platform/frontend
python3 -m http.server 3000

# Option 3: Node.js serve
npx serve . -p 3000

# Frontend at http://localhost:3000
```

### Seed Admin User
```javascript
// Run this once to create an admin user
// backend/scripts/seed.js

const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  await User.create({
    firstName: 'Admin',
    lastName:  'User',
    email:     'admin@platform.com',
    password:  'Admin@123456',
    role:      'admin',
    isEmailVerified: true,
  });
  console.log('Admin created!');
  process.exit(0);
});
```

```bash
node backend/scripts/seed.js
```

---

## 🛡️ Role-Based Access Control Matrix

| Feature                  | Admin | Teacher | Student |
|--------------------------|:-----:|:-------:|:-------:|
| View all users           | ✅    | ❌      | ❌      |
| Manage users             | ✅    | ❌      | ❌      |
| Admin dashboard          | ✅    | ❌      | ❌      |
| Create courses           | ✅    | ✅      | ❌      |
| Edit own courses         | ✅    | ✅      | ❌      |
| Delete any course        | ✅    | ❌      | ❌      |
| Enroll in courses        | ❌    | ❌      | ✅      |
| View teacher dashboard   | ✅    | ✅      | ❌      |
| View student dashboard   | ✅    | ❌      | ✅      |
| Edit own profile         | ✅    | ✅      | ✅      |
| Broadcast notifications  | ✅    | ❌      | ❌      |

---

## 🏗️ Production Deployment Checklist

### Security
- [ ] Change all JWT secrets to strong random values (64+ chars)
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS/SSL
- [ ] Configure proper CORS origins
- [ ] Increase bcrypt rounds to 14+
- [ ] Set up MongoDB authentication
- [ ] Enable MongoDB Atlas IP whitelist

### Performance
- [ ] Add Redis for session/cache management
- [ ] Configure MongoDB indexes (already in models)
- [ ] Enable gzip compression (`compression` package)
- [ ] Set up CDN for static assets
- [ ] Add response caching for public endpoints

### Monitoring
- [ ] Add Winston/Morgan logging
- [ ] Set up error tracking (Sentry)
- [ ] Configure uptime monitoring
- [ ] Add health check endpoints

### Frontend (React Migration)
When migrating to React with Vite:
```bash
npm create vite@latest frontend -- --template react
npm install @reduxjs/toolkit react-redux axios socket.io-client react-router-dom
```

The store.js patterns directly map to Redux Toolkit slices.
The api.js patterns map to RTK Query or Axios interceptors.

---

## 🎨 Design System Colors

| Token              | Dark              | Light            |
|--------------------|-------------------|------------------|
| `--bg-base`        | `#0a0e1a`         | `#f4f6fc`        |
| `--bg-surface`     | `#0f1629`         | `#ffffff`        |
| `--brand-500`      | `#3b82f6`         | `#3b82f6`        |
| `--accent-purple`  | `#8b5cf6`         | `#8b5cf6`        |
| `--accent-emerald` | `#10b981`         | `#10b981`        |
| `--text-primary`   | `#f0f4ff`         | `#0f172a`        |

---

## 👥 Team & Credits

Built as a production-ready enterprise template.

**Tech Stack:**
- Backend: Node.js, Express.js, MongoDB, Mongoose, Socket.io, JWT, bcrypt
- Frontend: HTML5, CSS3 (Custom Properties), Vanilla JS ES Modules
- State: Custom Redux-pattern store
- Auth: JWT Access + Refresh token rotation
- Real-time: Socket.io with room-based events

---

*client project For edu system @astracognixsolution.in*
