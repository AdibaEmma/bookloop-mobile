### 📘 README


# 📲 BookLoop Mobile App

The mobile companion for **BookLoop**, built with **React Native (Expo)**.  
It enables users to list books, find nearby exchanges, negotiate meetups, and pay securely with MoMo or Paystack.

---

## ✨ Features
- Ghana card or phone-based onboarding
- Real-time book listings around Accra
- Negotiation + meetup scheduling
- Paystack checkout (Card, MoMo)
- Reading karma dashboard
- Dark/light “Modern Cozy Glass” theme

---

## 🧩 Tech Stack
| Category | Tech |
|-----------|------|
| Framework | React Native (Expo) |
| Language | TypeScript |
| Navigation | React Navigation |
| Auth | Supabase Auth |
| State | Zustand / Context |
| API | Axios → BookLoop API |
| Maps | Mapbox |
| Payments | Paystack SDK |

---

## 🛠️ Setup
```bash
git clone https://github.com/BookLoopHQ/bookloop-mobile.git
cd bookloop-mobile
pnpm install
cp .env.example .env
pnpm start
