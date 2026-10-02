# Solo Leveling System

**Turn everyday effort into visible progression.**

Solo Leveling System is a productivity and personal-growth platform that brings goals, habits, focus sessions, journaling, and analytics together in a game-inspired progression system. Users build a Hunter profile, complete quests, earn experience, and track their growth over time.

The hosted application is intended to be used as a SaaS product. Access to the hosted service is subject to its applicable service terms. The application source code is proprietary and is not licensed for copying, modification, redistribution, or reuse. See [LICENSE.md](LICENSE.md).

## Product features

- **Progression:** Hunter profiles, levels, ranks, experience, statistics, and achievements.
- **Planning:** Quests, goals, habits, streaks, dungeons, bosses, and raids.
- **Focus and reflection:** Focus sessions, a personal journal, and progress reports.
- **Knowledge and coaching:** A connected knowledge space and AI-assisted coaching.
- **Insights:** Analytics, activity history, and performance trends.
- **Account controls:** Privacy settings, notifications, session management, and data export.
- **Engagement:** Real-time updates, public profiles, guild features, and installable PWA support.
- **Subscriptions:** Recurring plans managed through Razorpay where enabled.

Feature availability may depend on account plan, configuration, and deployment.

## Application architecture

This repository contains a React client and a Node.js API. MongoDB stores application data, while Socket.IO supports real-time updates.

```text
client/    React 18, Vite, React Router, TanStack Query, Zustand
server/    Node.js, Express, Mongoose, Socket.IO
docs/      Operational setup guides
```

The backend is organized by product domain, including authentication, users, quests, habits, focus, analytics, billing, and notifications.

## Technology

- **Client:** React, Vite, Tailwind CSS, React Router, TanStack Query, Zustand
- **API:** Node.js, Express, Mongoose, MongoDB, Socket.IO
- **Integrations:** Cloudinary, Resend, Groq, Razorpay, and Web Push (optional)

## Run locally

### Requirements

- Node.js 18 or newer and npm
- A MongoDB database
- Optional credentials for Cloudinary, Resend, Groq, Razorpay, and Web Push, depending on the features you want to run

### Install dependencies

From the repository root, install server dependencies:

```bash
cd server
npm install
```

In a second terminal, install client dependencies:

```bash
cd client
npm install
```

### Configure the client

Create `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_SOCKET_URL=http://localhost:5000
```

### Configure the server

Create `server/.env` with at least:

```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017/solo-leveling
JWT_SECRET=replace_with_a_long_random_secret
JWT_REFRESH_SECRET=replace_with_a_different_long_random_secret
```

Add optional integration settings as needed. Email uses `RESEND_API_KEY` and `EMAIL_FROM`; AI coaching can use `GROQ_API_KEY`; image uploads use the `CLOUDINARY_*` settings; push notifications use the `VAPID_*` settings; and subscriptions use the `RAZORPAY_*` settings. See [server/.env.example](server/.env.example) and [docs/BILLING_SETUP.md](docs/BILLING_SETUP.md).

Never commit real credentials or production secrets. Use test credentials while developing integrations.

### Start the applications

Start the API from the `server` directory:

```bash
npm run dev
```

Start the client from the `client` directory in another terminal:

```bash
npm run dev
```

Vite prints the local client URL when it starts. The API health endpoint is available at `http://localhost:5000/health`.

## Production build

Build the client from the `client` directory:

```bash
npm run build
```

Run the API with `npm start` from the `server` directory. Production deployments should use HTTPS, strong unique secrets, a production MongoDB URI, and exact client origins in the server configuration.

## Billing setup

Razorpay subscriptions require configured plans, API credentials, and a webhook. Follow [docs/BILLING_SETUP.md](docs/BILLING_SETUP.md) and verify the complete checkout and cancellation flow in test mode before enabling live billing.

## Security and user data

The API includes authentication, password hashing, request validation, rate limiting, security headers, and MongoDB sanitization. These controls do not replace a production security review. Secure all secrets, restrict production origins, and review data handling and retention before operating the service.

## License and SaaS use

The source code is proprietary. No source-code rights are granted except by written permission or where applicable law provides otherwise. Access to a hosted instance, if offered, is separate from source-code licensing and is governed by the service's Terms of Service and Privacy Policy.

Before opening the SaaS to customers, publish clear Terms of Service and a Privacy Policy covering account use, subscriptions and cancellations, user data, retention and deletion, acceptable use, and support. The project license does not replace those customer-facing terms. For legal advice about protecting or licensing the product, consult a qualified lawyer in your jurisdiction.

Third-party packages and services remain subject to their respective licenses and terms.
