# 🍽️ Campus Canteen Ordering System

A full-stack web application for college campus canteen food ordering with online payments, real-time kitchen display, AI demand prediction, and QR code-based order verification.

🔗 **Live Demo:** [campus-canteen-ordering-21c7a.web.app](https://campus-canteen-ordering-21c7a.web.app)

---

## ✨ Features

### For Students
- 📋 Browse menu with real food images and category filters
- 🛒 Add items to cart with quantity controls
- 💳 **Online Payment** via Razorpay (GPay, PhonePe, UPI, Cards) or Pay at Pickup
- 📱 **QR Code** on every order for pickup verification
- 🔔 **Push Notifications** when order is ready
- ⏱️ Estimated wait time on active orders
- 🔄 One-tap reorder from order history
- ⭐ Rate and review delivered orders

### For Kitchen Staff
- 👨‍🍳 **Real-time Kitchen Display** — live order queue with status management
- 🔄 One-click status updates: Placed → Preparing → Ready → Delivered
- 💵 Payment mode badges (Paid Online / Pay at Pickup)
- 📱 Mobile-friendly large buttons for touch screens
- 📋 QR code scanning for delivery confirmation

### For Admin
- 📊 **Reports & Analytics** — daily order charts, revenue graphs, popular items pie chart
- 🤖 **AI Demand Prediction** — powered by Google Gemini 2.0 Flash
- 📝 **Menu Management** — add/edit/delete items with toggle switch for availability
- 👥 User role management (Student / Staff / Admin)

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS |
| Backend | Firebase (Auth, Firestore, Hosting) |
| Payments | Razorpay (Test Mode) |
| AI | Google Gemini 2.0 Flash API |
| Charts | Recharts |
| QR Code | react-qr-code |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- Firebase account (free Spark plan)
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/manoharreddydaram/Campus-Canteen.git
cd Campus-Canteen

# Install dependencies
npm install

# Start development server
npm start
```

The app opens at `http://localhost:3000`.

### Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** (Email/Password + Google Sign-In)
3. Create a **Firestore** database
4. Update `src/firebase.ts` with your Firebase config
5. Deploy Firestore rules: `firebase deploy --only firestore`

### Seed Menu Data

```bash
# Download service account key from Firebase Console
# Save as serviceAccountKey.json in project root

# Populate menu items with images
node seed-menu.js
node update-images.js

# Create demo admin & staff accounts
node create-demo-accounts.js
```

### Deploy

```bash
npm run build
firebase deploy --only hosting
```

---

## 👤 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@canteen.com | admin123 |
| Staff | staff@canteen.com | staff123 |
| Student | Sign up with any email | — |

---

## 📁 Project Structure

```
campus-canteen/
├── public/                  # Static assets
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Navbar.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── FeedbackModal.tsx
│   ├── contexts/            # React contexts
│   │   ├── AuthContext.tsx   # Authentication state
│   │   └── CartContext.tsx   # Shopping cart state
│   ├── pages/               # Route pages
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── MenuPage.tsx
│   │   ├── CartPage.tsx      # Razorpay payment integration
│   │   ├── OrdersPage.tsx    # QR codes + notifications
│   │   ├── OrderVerifyPage.tsx # QR scan verification
│   │   ├── KitchenDisplayPage.tsx
│   │   ├── MenuManagePage.tsx
│   │   ├── ReportsPage.tsx   # Charts & analytics
│   │   ├── AIPredictPage.tsx # Gemini AI predictions
│   │   └── AdminSetupPage.tsx
│   ├── types/               # TypeScript interfaces
│   ├── utils/               # Seed data utilities
│   └── firebase.ts          # Firebase configuration
├── firestore.rules          # Security rules
├── firestore.indexes.json   # Composite indexes
├── seed-menu.js             # Menu seeding script
├── update-images.js         # Image URL updater
├── create-demo-accounts.js  # Demo account creator
└── firebase.json            # Firebase hosting config
```

---

## 🔒 Security

- Firestore security rules enforce role-based access
- `serviceAccountKey.json` is excluded via `.gitignore`
- API keys are for demo/test mode only
- Authentication required for all data access

---

## 📄 License

This project was built as a **Final Year CSE Project** for academic purposes.

---

## 👨‍💻 Author

**Manohar Reddy Daram**
- GitHub: [@manoharreddydaram](https://github.com/manoharreddydaram)
