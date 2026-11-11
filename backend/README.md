# QuickMart Hyperlocal Grocery Delivery Backend

A robust, lightweight, monolithic backend for hyperlocal grocery shopping and delivery in rural and semi-urban areas. Built with Node.js, Express, TypeScript, and MongoDB.

## Features

- **Store & Delivery Configuration**: Dynamic store coordinates, max delivery radius, delivery fee, free delivery threshold, and ETA calculation.
- **Location Validation**: Haversine formula calculation to determine whether a customer's coordinates fall within the serviceable rural/semi-urban delivery zone.
- **Product Catalog**: Categories, products, search with fuzzy regex, offers/discounts, and recommended items.
- **Cart Revalidation**: Strict server-side revalidation of prices and stock before checkout (client-side totals are never trusted).
- **Phone-Number Authentication**: 6-digit OTP verification with rate limiting, brute-force protection, and bcrypt hashing.
- **Cash on Delivery (COD) with 2nd OTP**: Dedicated second OTP sent and verified specifically for confirming COD order placement.
- **Order Lifecycle & Tracking**: Live status progression (`Order Placed` ➔ `Order Accepted` ➔ `Preparing Your Order` ➔ `Out for Delivery` ➔ `Delivered`), approximate distance and ETA calculation, and order history.
- **Customer Profile**: Profile photo upload, address management, and compliant account deletion with OTP re-authentication.

---

## Directory Structure

```text
backend/
├── src/
│   ├── config/         # Environment, database, store configuration
│   ├── models/         # Mongoose models (User, Category, Product, Order, Otp, DeliveryConfig)
│   ├── routes/         # Express API routes
│   ├── controllers/    # Request handlers and business logic
│   ├── middleware/     # JWT authentication, rate limiting, multer image upload, error handling
│   ├── services/       # SMS provider abstraction (Dev, Fast2SMS, MSG91)
│   ├── validators/     # Zod request payload schemas
│   ├── utils/          # Haversine distance, crypto, order numbers, auto-seeder
│   └── app.ts          # Express application entry point
├── scripts/
│   ├── seed.ts         # Standalone catalog seeder
│   └── test-api.ts     # Automated end-to-end integration test suite
├── uploads/            # Stored profile photos
├── .env.example        # Environment template
├── package.json
└── tsconfig.json
```

---

## Getting Started

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Create `.env` based on `.env.example`:

```bash
cp .env.example .env
```

Key environment options:

| Variable | Description | Default |
|---|---|---|
| `PORT` | API server port | `5000` |
| `NODE_ENV` | Environment (`development` or `production`) | `development` |
| `MONGODB_URI` | MongoDB connection string (Local or MongoDB Atlas) | `mongodb://127.0.0.1:27017/quickmart` |
| `USE_IN_MEMORY_DB` | Set to `true` to auto-spin an embedded MongoMemoryServer | `false` |
| `JWT_SECRET` | Secret key for JWT signing | *Secure random string* |
| `SMS_PROVIDER` | `dev` (logs OTP to console), `fast2sms`, or `msg91` | `dev` |
| `SMS_API_KEY` | API key from Fast2SMS or MSG91 | *Your gateway key* |
| `DELIVERY_RADIUS_KM`| Maximum delivery radius in kilometers | `15` |
| `STORE_LATITUDE` | Latitude of rural fulfillment center | `22.5645` |
| `STORE_LONGITUDE` | Longitude of rural fulfillment center | `72.9289` |

### 3. Configuring MongoDB

- **Local MongoDB**: Ensure `mongod` is running on `127.0.0.1:27017` and keep `USE_IN_MEMORY_DB=false`.
- **MongoDB Atlas**: Paste your cluster connection string into `MONGODB_URI` (e.g. `mongodb+srv://user:pass@cluster.mongodb.net/quickmart`).
- **Zero-Config Development**: Set `USE_IN_MEMORY_DB=true`. The server will spin up an isolated in-memory MongoDB instance automatically.

### 4. Configuring Indian SMS OTP Gateways

#### Option A: Development Provider (`SMS_PROVIDER=dev`)
- No external account required.
- OTPs are logged directly in the backend terminal with purpose and timestamp.
- In `development` mode, the API also returns `devOtp` in responses to facilitate rapid frontend testing.

#### Option B: Fast2SMS (Indian SMS Route)
1. Register on [Fast2SMS](https://www.fast2sms.com/).
2. Obtain your API authorization key from the Dev API section.
3. In `.env`:
   ```env
   SMS_PROVIDER=fast2sms
   SMS_API_KEY=your_fast2sms_auth_key
   ```

#### Option C: MSG91
1. Register on [MSG91](https://msg91.com/).
2. Create an OTP template and get your AuthKey.
3. In `.env`:
   ```env
   SMS_PROVIDER=msg91
   SMS_API_KEY=your_msg91_auth_key
   SMS_SENDER_ID=your_template_id
   ```

---

## Running the Application

### Development Mode (with hot-reload)
```bash
npm run dev
```

### Seeding the Catalog
```bash
npm run seed
```

### Running Automated Integration Tests
Runs tests across health, delivery config, geofencing, search, cart recalculation, auth OTP, COD 2nd OTP, order creation, active tracking, and account deletion:
```bash
npm run test:api
```

### Production Build
```bash
npm run build
npm start
```
