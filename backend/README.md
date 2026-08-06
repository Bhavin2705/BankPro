# BankPro Backend API

Backend REST API & Socket.IO server for BankPro built with Node.js, Express, and MongoDB.

## Features
- JWT authentication with refresh token support
- Accounts, transactions, transfers, cards, bills, budgets, and recurring payments
- Bank directory & live currency exchange rates
- Real-time Socket.IO notifications & event handlers
- Jest integration & unit test suite

## Prerequisites
- Node.js >= 18
- MongoDB instance (local or Atlas)

## Quick Start
```bash
npm install
npm run dev
```

## Environment Variables (`.env`)
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/bank_management_system
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
FRONTEND_URL=http://localhost:5173
```

## API Route Summary (`/api`)
- **/auth**: `/register`, `/login`, `/refresh`, `/logout`, `/me`, `/forgotpassword`, `/resetpassword/:token`
- **/users**: `/me`, `/update-pin`, `/verify-pin`, `/me/client-data`, `/transfer-recipients`, `/stats`
- **/transactions**: `/`, `/:id`, `/transfer`, `/validate-transfer`, `/stats`, `/categories`
- **/cards**: `/`, `/:id`, `/status`, `/pin`, `/reveal-cvv`
- **/bills**: `/`, `/:id`, `/pay`, `/stats`
- **/budgets**: `/`, `/:id`, `/summary`, `/stats`
- **/recurring**: `/`, `/:id`, `/process`
- **/exchange**: `/rates`, `/convert`
- **/notifications**: `/`, `/:id/read`, `/read-all`

## Testing & Database Seeding
```bash
npm test         # Run Jest test suite
npm run seed     # Seed database with initial banks and demo data
```
