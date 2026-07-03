# 🍽️ Restaurant Management System (RMS)

Full-stack Restaurant ERP with **QR Code Ordering**, **Voice Ordering**, **Real-time Kitchen Display**, **Role-based Access Control**, and **Live Socket.io Sync**.

---

## 🚀 Features

### 🎯 Core Modules
- **Dashboard** — Live metrics, active orders, revenue tracking
- **Order Management** — POS terminal for dine-in & takeaway
- **QR Smart Ordering** — Customer self-ordering via QR code (Tamil/English/Hindi)
- **Kitchen Display System** — Real-time order queue (Pending → Preparing → Ready)
- **Table Management** — Live table status, reservations, auto-assignment
- **Menu Management** — Single items, combo offers, recipe configurator
- **Billing & Invoicing** — Bill merging, payment tracking, WhatsApp share
- **Inventory** — Low stock alerts, supplier management, auto-deduction
- **Staff Management** — Attendance tracking, shift scheduling, RBAC
- **Reports & Analytics** — Sales trends, popular items, performance metrics

### ✨ Advanced Features
- 🎤 **Voice Ordering** — Hands-free ordering with Web Speech API (multilingual)
- 🔐 **JWT Authentication** — Secure login with bcrypt password hashing
- 🔌 **Socket.io Real-time Sync** — Live order updates across all devices
- 📱 **Mobile Responsive** — Works seamlessly on phones & tablets
- 🌍 **Multi-language** — Tamil, Hindi, English support
- 📊 **Role-based Permissions** — Admin, Manager, Chef, Waiter, Cashier roles

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| **Frontend** | React 19 + Vite + Tailwind CSS v4 |
| **Backend** | Node.js + Express 5 + MongoDB + Mongoose |
| **Auth** | JWT + bcrypt |
| **Real-time** | Socket.io |
| **State** | Context API |

---

## 📦 Installation & Setup

---

### 🚀 **LOCAL-LA RUN PANUVATHU EPPADI? (HOW TO RUN LOCALLY)**

#### **SYSTEM REQUIREMENTS:**
- Node.js (v18+) installed
- MongoDB (local OR MongoDB Atlas account)
- Internet connection

#### **QUICK START (3 STEPS ONLY):**
```bash
# 1️⃣ Clone the project
git clone https://github.com/YuvasriArumugasamy/RMS.git
cd RMS/restaurant-erp

# 2️⃣ Backend + Frontend dependencies install
cd server && npm install && cd ../client && npm install

# 3️⃣ Terminal 1 - Backend start (port 5000)
cd server && npm run dev

# 4️⃣ Terminal 2 - Frontend start (port 5173)
cd client && npm run dev
```

**DONE! Open browser-la:** http://localhost:5173

---

### 1. Clone Repository
```bash
git clone https://github.com/YuvasriArumugasamy/RMS.git
cd RMS/restaurant-erp
```

### 2. Backend Setup

#### Install Dependencies
```bash
cd server
npm install
```

#### Configure Environment
Create `server/.env`:
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/restaurant-erp?retryWrites=true&w=majority
JWT_SECRET=rms_super_secret_jwt_key_2026
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

**Get MongoDB URI:**
1. Go to [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get connection string → replace `<username>` and `<password>`

#### Seed Database (Run Once)
```bash
node seedData.js
```

#### Start Server
```bash
npm run dev
```

Server runs on `http://localhost:5000`

---

### 3. Frontend Setup

```bash
cd ../client
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

---

## 🔑 Login Credentials (After Seed)

| Role | Username | Password |
|---|---|---|
| **Admin** | admin | Admin@123 |
| **Manager** | manager | Manager@123 |
| **Chef** | chef1 | Chef@123 |
| **Waiter** | waiter1 | Waiter@123 |
| **Cashier** | cashier1 | Cashier@123 |

---

## 📱 QR Ordering Flow

1. **Admin** → Table Management → Click QR icon → Copy URL
2. **Customer** scans QR → Opens `/qr-order/:tableId`
3. Select guest count → Browse menu → Add to cart with special notes
4. Place order → **Kitchen gets live notification**
5. Track order status: Pending → Preparing → Ready → Served
6. Request bill / call waiter / water refill — all from phone!

---

## 🗂️ Project Structure

```
restaurant-erp/
├── client/              # React frontend
│   ├── src/
│   │   ├── pages/       # All page components
│   │   ├── components/  # Reusable components
│   │   ├── context/     # AuthContext (JWT)
│   │   └── App.jsx      # Router setup
│   └── .env             # API_URL config
│
└── server/              # Node.js backend
    ├── models/          # MongoDB schemas
    ├── routes/          # API endpoints
    ├── middleware/      # JWT auth middleware
    ├── index.js         # Express + Socket.io server
    ├── seedData.js      # Database seeder
    └── .env             # MongoDB URI, JWT secret
```

---

## 🔐 API Endpoints

### Auth
- `POST /api/auth/register` — Register user
- `POST /api/auth/login` — Login (returns JWT)
- `GET /api/auth/me` — Get current user (protected)

### Orders
- `GET /api/orders` — Get all orders
- `POST /api/orders` — Create order
- `PUT /api/orders/:id/status` — Update order status (Chef)
- `PUT /api/orders/:id/billing` — Mark as paid (Cashier)

### Menu
- `GET /api/menu` — Get menu items (public)
- `POST /api/menu` — Add item (Admin/Manager)
- `PUT /api/menu/:id` — Update item
- `DELETE /api/menu/:id` — Delete item

### Tables
- `GET /api/tables` — Get all tables
- `POST /api/tables` — Create table (Admin)
- `PUT /api/tables/:id` — Update status/reservation

### Inventory
- `GET /api/inventory` — Get ingredients
- `POST /api/inventory` — Add ingredient (Admin/Manager)
- `PUT /api/inventory/:id` — Update stock

### Staff
- `GET /api/staff` — Get staff list (Admin/Manager)
- `POST /api/staff` — Add staff member
- `PUT /api/staff/:id/attendance` — Mark attendance

---

## 🎤 Voice Ordering

**Supported Commands:**
- English: "Add 2 Biryani", "Remove Naan"
- Tamil: "ரெண்டு பிரியாணி போடு", "நான் வேண்டாம்"
- Hindi: "दो बिरयानी डालो", "नान हटाओ"

Works best in **Chrome**. Uses Web Speech API (no external dependencies).

---

## 🛡️ Security Features

✅ **JWT Authentication** — Token-based auth with httpOnly cookies  
✅ **Password Hashing** — bcrypt with salt rounds  
✅ **Role-based Access Control** — Server-side authorization middleware  
✅ **Protected Routes** — `/api/*` endpoints require valid JWT  
✅ **Environment Secrets** — `.env` never pushed to Git  

---

## 🚧 Future Enhancements

- [ ] Payment Integration (Razorpay/Stripe)
- [ ] PWA (Offline mode)
- [ ] Analytics Dashboard (Chart.js)
- [ ] SMS/Email Notifications
- [ ] Multi-branch Support
- [ ] AI Recommendations
- [ ] AR Menu Preview

---

## 📄 License

MIT License — Free to use for personal & commercial projects.

---

## 👨‍💻 Author

**Yuvasri Arumugasamy**  
GitHub: [@YuvasriArumugasamy](https://github.com/YuvasriArumugasamy)

---

## 🙏 Contributing

Pull requests welcome! For major changes, please open an issue first.

---

**Built with ❤️ for restaurants worldwide** 🍕🍔🍜
