# 🛵 Food Delivery Live Tracking System

A production-style food delivery live tracking application similar to **Swiggy / Zomato**, built for learning and testing the **map location tracking module**. Features real-time order tracking with smooth animated markers, ETA calculation, route polylines, and live Socket.IO communication.

---

## 🎯 Features

### Customer
- 📍 Select delivery location via Google Places autocomplete or draggable map marker
- 🍔 Create dummy orders
- 🛵 See animated delivery partner marker moving smoothly on the map
- 📊 Live ETA, distance, and speed updates
- 🗺️ Route polyline drawn via Google Directions API
- 📋 Order status timeline (Pending → Accepted → Picked Up → On the Way → Delivered)
- 🔔 Real-time notifications when rider is assigned and arrives
- 🟢 Socket connection status indicator

### Delivery Partner
- 📋 View and accept pending orders
- 🚀 Start delivery with one click
- 📡 Simulates location movement along the Google Directions route
- 📤 Broadcasts location every 3 seconds via Socket.IO
- 📏 Live distance remaining and ETA display
- ✅ Mark delivery as completed with arrival detection
- 🔄 Auto-refresh pending orders after delivery

### Technical
- 🔐 JWT authentication with role-based routing
- 🔌 Socket.IO for real-time bidirectional communication
- 🏠 Room-based socket architecture per order
- 📐 Haversine formula for distance calculation
- 🎨 Smooth marker animation using `requestAnimationFrame`
- ⚡ Lazy loading and code splitting
- 📱 Fully responsive (mobile, tablet, desktop)
- 🎭 Framer Motion animations throughout

---

## 🏗️ Architecture

```
live-tracker/
├── client/                 # React + Vite Frontend
│   ├── src/
│   │   ├── animations/     # Framer Motion variants
│   │   ├── components/     # Reusable UI (Navbar, Modal, Toast, Loader, etc.)
│   │   ├── constants/      # Enums for statuses, events, roles
│   │   ├── contexts/       # AuthContext, SocketContext
│   │   ├── hooks/          # useToast, useGeolocation
│   │   ├── pages/          # Login, Register, CustomerDashboard, DeliveryDashboard
│   │   ├── services/       # Axios API layer
│   │   └── utils/          # Distance, ETA, formatting helpers
│   └── .env                # VITE_GOOGLE_MAPS_API_KEY
│
└── server/                 # Node.js + Express Backend
    ├── config/             # MongoDB connection
    ├── constants/          # (extensible)
    ├── controllers/        # Auth, Order controllers
    ├── middleware/          # JWT auth middleware
    ├── models/             # User, Order, Tracking, Notification
    ├── routes/             # Auth, Order routes
    ├── sockets/            # Socket.IO tracking handler
    ├── utils/              # Haversine distance & ETA calculator
    └── .env                # PORT, MONGO_URI, JWT_SECRET
```

---

## 🛠️ Tech Stack

| Layer     | Technology                                     |
|-----------|-------------------------------------------------|
| Frontend  | React 19, Vite, Tailwind CSS v4, Framer Motion |
| Maps      | @react-google-maps/api, Directions, Places API |
| Backend   | Node.js, Express 5                              |
| Database  | MongoDB, Mongoose                               |
| Realtime  | Socket.IO                                       |
| Auth      | JWT (jsonwebtoken), bcryptjs                    |

---

## ⚡ Quick Start

### Prerequisites
- **Node.js** v18+ installed
- **MongoDB** running locally or a MongoDB Atlas URI
- **Google Maps API Key** with Maps JS, Directions, Places, and Geocoding APIs enabled

### 1. Clone the project
```bash
cd e:\live-tracker
```

### 2. Backend Setup
```bash
cd server
cp .env.example .env
# Edit .env with your MONGO_URI and JWT_SECRET
npm install
npm run dev
```
The server will start on `http://localhost:5000`.

### 3. Frontend Setup
```bash
cd client
cp .env.example .env
# Edit .env with your VITE_GOOGLE_MAPS_API_KEY
npm install
npm run dev
```
The frontend will start on `http://localhost:5173`.

### 4. Google Maps API Key Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable these APIs:
   - Maps JavaScript API
   - Directions API
   - Places API
   - Geocoding API
4. Create an API Key under Credentials
5. Paste the key in `client/.env` as `VITE_GOOGLE_MAPS_API_KEY`

---

## 🧪 Testing Workflow

### Step 1: Register Two Users
1. Open `http://localhost:5173/register`
2. Create a **Customer** account (e.g., `customer@test.com`)
3. Create a **Delivery Partner** account (e.g., `rider@test.com`)

### Step 2: Customer Creates an Order
1. Log in as the Customer
2. Click **"Create Order"** button
3. Search for a delivery address or drag the marker
4. Submit the order — it goes to `pending` status

### Step 3: Delivery Partner Accepts
1. Open a separate browser/incognito window
2. Log in as the Delivery Partner
3. See the pending order appear in the list
4. Click **"Accept Order"**
5. The Customer receives a real-time notification

### Step 4: Start Delivery
1. As the Delivery Partner, click **"Start Delivery"**
2. The system simulates movement along the Google route
3. Location is broadcast every 3 seconds via Socket.IO
4. The Customer sees the 🛵 marker moving smoothly on their map

### Step 5: Delivery Completes
1. When the rider reaches the destination (or clicks "Mark as Delivered")
2. Both users receive a completion notification
3. The order status updates to `delivered`

---

## 🔌 Socket Events

| Event               | Direction            | Description                        |
|---------------------|----------------------|------------------------------------|
| `join_order_room`   | Client → Server      | Join a specific order's room       |
| `location_update`   | Delivery → Server    | Send lat/lng/speed/direction       |
| `receive_location`  | Server → Customer    | Broadcast delivery partner's location |
| `order_accepted`    | Delivery → Server    | Notify order acceptance            |
| `order_status_update` | Server → Customer  | Broadcast status changes           |
| `delivery_reached`  | Delivery → Server    | Mark arrival                       |
| `delivery_arrived`  | Server → Customer    | Notify customer of arrival         |
| `eta_update`        | Server → Room        | Broadcast updated ETA & distance   |

---

## 📊 Database Models

### User
- `name`, `email`, `password`, `role` (customer | delivery)

### Order
- `customerId`, `deliveryPartnerId`, `pickupLocation`, `deliveryLocation`, `status`, `eta`

### Tracking
- `orderId`, `deliveryPartnerId`, `latitude`, `longitude`, `speed`, `direction`

### Notification
- `userId`, `title`, `message`, `isRead`

---

## 🗺️ Map Tracking Deep Dive

### Smooth Animation
The delivery marker uses `requestAnimationFrame` with cubic easing to interpolate between position updates, creating buttery-smooth movement instead of teleporting markers.

### ETA Calculation
Uses the **Haversine formula** to calculate the great-circle distance between the delivery partner and customer, then divides by average speed (~20 km/h) to estimate arrival time.

### Route Simulation
The Delivery Partner dashboard fetches the Google Directions route, extracts `overview_path` waypoints, and moves through them at 3-second intervals — simulating real GPS movement.

### Arrival Detection
When the distance between the delivery partner and customer drops below **50 meters**, the system automatically triggers the delivery completion flow.

---

## 🚀 Deployment

### Backend (Render)
1. Push `server/` to a GitHub repo
2. Create a new Web Service on [Render](https://render.com)
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variables (MONGO_URI, JWT_SECRET)

### Frontend (Vercel)
1. Push `client/` to a GitHub repo
2. Import on [Vercel](https://vercel.com)
3. Framework: Vite
4. Add `VITE_GOOGLE_MAPS_API_KEY` as environment variable
5. Update the API base URL in `services/api.js`

### MongoDB Atlas
1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Whitelist your IP or set `0.0.0.0/0` for all
3. Create a database user
4. Copy the connection string to `MONGO_URI`

---

## 🔮 Future Improvements

- 🔴 **Redis** for scaling Socket.IO across multiple server instances
- 🔔 **Firebase Push Notifications** for mobile-like alerts
- 📊 **Admin Dashboard** with order analytics and rider management
- 🗺️ **Geofencing** for automatic zone-based order assignment
- 📍 **Map Clustering** for visualizing multiple deliveries
- 🔄 **Route Optimization** for multi-drop deliveries
- 💬 **Live Chat** between customer and delivery partner
- 📴 **Offline Mode** with retry queue for unreliable networks
- 🔒 **Rate Limiting** with `express-rate-limit` and `helmet`
- 📈 **Database Indexing** on location fields for geo-queries
- 🧪 **Unit Tests** with Jest and React Testing Library

---

## 📝 License

This project is for **learning purposes only**.

Built with ❤️ using React, Node.js, Socket.IO, and Google Maps.
