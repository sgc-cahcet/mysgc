# 🎓 MySGC — Student Guidance Cell Portal

[![portal.teamsgc.in](https://img.shields.io/badge/Live-portal.teamsgc.in-0051FF?logo=cloudflare&logoColor=white)](https://portal.teamsgc.in)
[![Download APK](https://img.shields.io/badge/Download-APK-00C853?style=flat&logo=android&logoColor=white)](https://github.com/sgc-cahcet/mysgc/raw/main/apk-files/mysgc.apk)

> **One stop for everything SGC.** Track attendance, review sessions, submit feedback, propose topics — all in one place. Built by students, for students.

A member portal for the **Student Guidance Cell (SGC)** at **CAHCET**. Members stay on top of their sessions and attendance, while admins manage the full session lifecycle with ease.

---

## 🧰 Tech Stack

| Layer     | Technology                                                    |
| --------- | ------------------------------------------------------------- |
| ⚛️        | [Next.js 15](https://nextjs.org/) + React 18                  |
| 🟦        | TypeScript (strict)                                           |
| 🎨        | Tailwind CSS 3.4 + [shadcn/ui](https://ui.shadcn.com/)       |
| 🗄️        | PostgreSQL via [Supabase](https://supabase.com)               |
| 🔐        | Supabase Auth (PKCE flow, email/password)                     |
| ☁️        | [Cloudflare Pages](https://pages.cloudflare.com/)             |

---

## ✨ Features

### 👤 Member

| Feature                 | What it does                                                              |
| ----------------------- | ------------------------------------------------------------------------- |
| 📊 **Attendance**       | Monthly summary — see your present days, absent dates, and percentage.    |
| 📅 **Sessions**         | Today's and upcoming sessions with handler & co-handler details.          |
| ⭐ **Feedback**         | Rate and review today's sessions (available 1:30 PM – 11:59 PM IST).      |
| ✋ **Propose a Session**| Pitch a topic, pick a date, and optionally add a co-handler.              |
| 📜 **Session History**  | Browse every past session you've attended with feedback and ratings.      |
| 🔑 **Password Mgmt**    | Change password or reset it via email.                                    |
| 📱 **PWA**              | Install it on your phone like a native app.                               |

### 🛡️ Admin

> Requires one of these roles: `President`, `Vice President`, `Administrator`, or `Session Incharge`.

| Feature                          | What it does                                                            |
| -------------------------------- | ----------------------------------------------------------------------- |
| ✅ **Pending Approvals**         | Review, approve, reject, or reschedule session requests.                |
| 📄 **Approved Sessions**         | Paginated list (10/page) with live search by topic, handler, or date.   |
| 💬 **View Feedback**             | See average ratings and individual comments for any session.            |
| 🗑️ **Manage Sessions**           | Delete sessions or add them manually without a prior request.           |
| ⚠️ **Conflict Detection**        | Automatically warns when a date is already booked.                      |

---

## 📖 Documentation

| What                         | Where                          |
| ---------------------------- | ------------------------------ |
| 🛠️ Setup & configuration    | [docs/SETUP.md](./docs/SETUP.md) |
| 🏗️ Architecture & database  | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) |
| 🚀 Cloudflare deployment    | [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) |
| 🤝 Contributing guide       | [CONTRIBUTING.md](./CONTRIBUTING.md) |
| 📜 Code of conduct          | [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) |

---

## 🚀 Quick Start

```bash
npm install
cp .env.example .env.local   # drop in your Supabase credentials
npm run dev                   # 🎉 open http://localhost:3000
```

See [docs/SETUP.md](./docs/SETUP.md) for the full Supabase walkthrough.

---

## 📲 Android App

[![Download APK](https://img.shields.io/badge/Download-APK-00C853?style=for-the-badge&logo=android&logoColor=white)](https://github.com/sgc-cahcet/mysgc/raw/main/apk-files/mysgc.apk)

Download the MySGC Android app (`mysgc.apk`) — install it on your device for quick access.

> 📱 Android only. Allows side-loading from unknown sources.

---

## 🌐 Live

| Link                              | Type            |
| --------------------------------- | --------------- |
| [mysgc.pages.dev](https://mysgc.pages.dev) | Cloudflare-provided |
| [portal.teamsgc.in](https://portal.teamsgc.in) | Custom domain         |

---

## 🌟 Meet the Contributors

[![Contributors](https://contrib.rocks/image?repo=sgc-cahcet/mysgc)](https://github.com/sgc-cahcet/mysgc/graphs/contributors)

**Want your picture here?** 🖼️  
Fork the repo, send a PR, and become a contributor!  
Check out the [Contributing Guide](./CONTRIBUTING.md) to get started.

Built and maintained with ❤️ by **Student Guidance Cell — CAHCET**.

---

## 📄 License

[MIT](./LICENSE)
