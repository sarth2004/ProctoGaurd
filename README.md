# AI-Based Online Exam Proctoring System

A premium, secure, and modern online examination platform featuring real-time AI proctoring, multi-role authentication, and advanced reporting.

---

## 🚀 Tech Stack

### Frontend
- **React (Vite)**: For a lightning-fast development experience.
- **Tailwind CSS**: Modern, utility-first styling.
- **Framer Motion**: Smooth micro-animations and transitions.
- **Lucide React**: Clean and consistent iconography.
- **Face-api.js**: Client-side computer vision for face detection.

### Backend
- **Node.js & Express**: Scalable and robust API architecture.
- **MongoDB**: Flexible NoSQL database for exam and result storage.
- **JSON Web Tokens (JWT)**: Secure, stateless authentication.
- **Bcrypt.js**: Industry-standard password hashing.

---

## ✨ Key Features

- 🔐 **Secure Admin Access**: Registration/Login requires a unique secret key (`PROCTOR1`).
- 📝 **Exam Management**: Create exams with custom titles, duration, and MCQs.
- 🔑 **Unique Exam Keys**: Auto-generated 6-digit keys for students to join.
- 🤖 **AI Proctoring**:
  - **Face Detection**: Monitors for empty seats or multiple candidates.
  - **Tab Tracking**: Detects and logs when students switch browser tabs.
  - **Fullscreen Enforcement**: Prevents students from exiting the exam view.
- 📊 **Ranked Results**: Admins view students ranked by score.
- 📥 **CSV Export**: Download comprehensive result reports.

---

## 🛠️ Startup Guide

### Prerequisites
- Node.js (v16+)
- MongoDB (Local or Atlas)

### 1. Clone & Setup Server
```bash
cd server
npm install
```

Create a `.env` file in the `server` directory:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_key
ADMIN_SECRET=PROCTOR1
```

Run the server:
```bash
npm run dev # or npm start
```

### 2. Setup Client
```bash
cd client
npm install
```

Run the frontend:
```bash
npm start # or npm run dev
```

---

## 📖 Project Structure

```text
├── client/
│   ├── src/
│   │   ├── context/      # Auth & Global State
│   │   ├── pages/        # Login, Dashboard, ExamPortal
│   │   ├── components/   # ProtectedRoute, UI components
│   │   └── App.jsx       # Routing logic
├── server/
│   ├── models/           # Mongoose Schemas (User, Exam, Result)
│   ├── controllers/      # Business Logic (Auth, Exam)
│   ├── routes/           # API Endpoints
│   └── index.js          # Entry point
└── README.md
```

---

## 🛡️ Security Note
The default Admin Secret Key is `PROCTOR1`. This can be changed in the server's `.env` file to ensure only authorized personnel can register as administrators.
