# 🍽️ DineSwift - Cloud-Native Food Ordering & Delivery System

![Banner](Frontend/src/assets/DineSwift.png)

DineSwift is a cloud-native food ordering and delivery platform inspired by UberEats & PickMe Food. Built on a microservices architecture, it provides a unified experience for customers, restaurants, and delivery drivers. 🚀

> 🔐 **This repository is a security-hardened fork of the original DineSwift project** ([original repo](https://github.com/NIKKAvRULZ/DineSwift), last commit 12 Jul 2025), created for the **SE4030 – Secure Software Development** group assignment. The baseline codebase was audited using static code analysis (SAST), software composition analysis (SCA), and dynamic black-box testing (OWASP ZAP). **11 vulnerabilities** spanning the OWASP Top 10 were evaluated and addressed, and a Google **OAuth 2.0 / OpenID Connect** login flow was added. See [Security Audit & Remediation Catalog](#-se4030-security-audit--remediation-catalog) below.

---

## 🚀 Key Features

- ✅ **Intuitive Web Portal** – Browse restaurants, manage your cart, and place orders  
- ✅ **Restaurant Dashboard** – Manage menus, update orders, and track earnings  
- ✅ **Order Tracking** – Real-time status updates with GPS-enabled delivery tracking  
- ✅ **Driver Auto-Assignment** – Smart allocation of drivers to optimize deliveries  
- ✅ **Secure Payments** – Stripe (Sandbox) with signature-verified webhooks  
- ✅ **Instant Notifications** – Email (Nodemailer) & SMS (Twilio) updates for every order status change  
- ✅ **OAuth 2.0 / OpenID Connect Login** – Sign in with Google alongside the email/password flow *(added for SE4030)*

---

## 🏗️ System Architecture & Tech Stack

### 🔙 Microservices

| Service | Port | Responsibility |
| --- | --- | --- |
| **API Gateway** | `5000` | Reverse proxy, centralized JWT verification, route aggregation |
| **UserService** | `5001` | User accounts, bcrypt credential handling, rate limiting, Google OAuth 2.0 / OIDC |
| **RestaurantService** | `5002` | Restaurant catalogs, menus, availability |
| **OrderService** | `5003` | Order processing and payload/total validation |
| **DeliveryService** | `5004` | Driver dispatch, assignment, Socket.IO location updates |
| **PaymentService** | `5005` | Stripe checkout and webhook signature verification |
| **NotificationService** | `5006` | Email/SMS notifications |

Backend stack: **Node.js (Express)**, **MongoDB**, **Kafka**, **Docker**.

### 🎨 Frontend
- ⚛️ **React.js (Vite, `:5173`)** – Single-page application  
- 💅 **Tailwind CSS** – Styling  
- 🔄 **Axios & Context API** – API integration and session state  
- 🎬 **Framer Motion** – Animations  

### 🛡️ Security Tooling *(added for SE4030)*
- 🔎 **OWASP ZAP** – Automated DAST scanning  
- 🔎 **Postman** – API testing, broken-access probing, rate-limit testing  
- 🔎 **npm audit** – Dependency (SCA) vulnerability scanning  
- 🔎 **Gitleaks** – Secret detection in repository history  
- 🔐 **Helmet** – Secure HTTP response headers  
- 🔐 **express-rate-limit** – IP throttling on authentication endpoints  
- 🔐 **Passport.js (`passport-google-oauth20`)** – Google OAuth 2.0 / OIDC authorization code flow  

---

## 📂 Project Structure

```
DineSwift/
├── Frontend/                  # React.js SPA client (:5173)
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Route views (Login, Register, Dashboard...)
│   │   ├── context/           # AuthContext / session providers
│   │   └── api/               # Axios instance & interceptors
│   └── public/                # Static assets
│
├── Services/                  # Backend microservices
│   ├── ApiGateWay/            # Central proxy (:5000) & JWT guard
│   ├── UserService/           # Auth, accounts (:5001) & Google OAuth
│   ├── RestaurantService/     # Catalog & menus (:5002)
│   ├── OrderService/          # Order processing (:5003)
│   ├── DeliveryService/       # Delivery logistics (:5004)
│   ├── PaymentService/        # Stripe processing (:5005)
│   └── NotificationService/   # Email/SMS alerts (:5006)
│
├── README.txt                 # Submission metadata & video link
└── README.md                  # Project & security documentation
```

---

## 🔧 Quick Start & Local Setup

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- Git

### 1️⃣ Clone the repository
```bash
git clone <this-repo-url>
cd DineSwift
git checkout local-testing-env
```

### 2️⃣ Configure environment variables
Each service ships with a sanitized `.env.example`. Copy each to a local `.env` and fill in your own values (MongoDB URI, JWT secret, Stripe keys, Twilio credentials, Google OAuth client ID/secret, etc.):

```bash
cp Services/ApiGateWay/.env.example Services/ApiGateWay/.env
cp Services/UserService/.env.example Services/UserService/.env
# ...repeat for the remaining services
```

> ⚠️ **Never commit real `.env` files.** They are excluded via `.gitignore` (remediated as part of **V02**).

### 3️⃣ Start the services
Use a separate terminal for each:

```bash
# API Gateway (5000)
cd Services/ApiGateWay && npm install && npm start

# User Service (5001)
cd Services/UserService && npm install && npm start

# Restaurant Service (5002)
cd Services/RestaurantService && npm install && npm start

# Order Service (5003)
cd Services/OrderService && npm install && npm start

# Delivery Service (5004)
cd Services/DeliveryService && npm install && npm start

# Payment Service (5005)
cd Services/PaymentService && npm install && npm start

# Notification Service (5006)
cd Services/NotificationService && npm install && npm start

# Frontend (5173)
cd Frontend && npm install && npm run dev
```

---

## 🛡️ SE4030 Security Audit & Remediation Catalog

| ID | Vulnerability | OWASP Top 10 Category | Component | Status |
| --- | --- | --- | --- | --- |
| **V01** | Broken password verification / auth logic bypass | A07: Identification & Auth Failures | `UserService` | ✅ Remediated |
| **V02** | Hardcoded live secrets committed to Git | A02: Cryptographic Failures | Repository-wide | ✅ Remediated |
| **V03** | Broken access control / unprotected downstream APIs | A01: Broken Access Control | `ApiGateWay` | ✅ Remediated |
| **V04** | Permissive wildcard CORS configuration | A05: Security Misconfiguration | All services | ✅ Remediated |
| **V05** | No rate limiting on authentication routes | A04: Insecure Design | `UserService` | ✅ Remediated |
| **V06** | JWT stored in browser `localStorage` | A02: Cryptographic Failures | `Frontend` | ✅ Documented / Isolated |
| **V07** | Missing & inconsistent input validation | A03: Injection / Mass Assignment | `RestaurantService` / `OrderService` | ✅ Remediated |
| **V08** | Known vulnerable dependencies (SCA) | A06: Vulnerable & Outdated Components | All services | ⚠️ Partially fixed (`tar` justified unfixed) |
| **V09** | Unverified Stripe webhook signature (placeholder secret) | A05: Security Misconfiguration | `PaymentService` | ✅ Remediated |
| **V10** | Missing HTTP security headers | A05: Security Misconfiguration | All services | ✅ Remediated |
| **V11** | Runtime error & stack trace disclosure | A05: Security Misconfiguration | `UserService` | ✅ Remediated |

### ⚠️ Rationale for the unfixed vulnerability (V08: `tar` via `bcrypt`)

- **Issue:** `npm audit` reports a critical path-traversal / arbitrary file-write advisory in `tar`.
- **Dependency chain:** `UserService` → `bcrypt` → `@mapbox/node-pre-gyp` → `tar`
- **Justification:** Forcing `tar` to a newer major version breaks `@mapbox/node-pre-gyp` and the native `bcrypt` binary installation, which would disable password hashing. `tar` is only used at install time to unpack pre-built binaries and is never exposed to untrusted runtime user input, so the risk is bounded. Full advisory ID and `npm audit` output are included in the report.

---

## 👥 Team & Responsibilities

| Member | Student ID | Scope |
| --- | --- | --- |
| **Perera W. A. N. I.** *(Team Lead)* | IT22061348 | `UserService` (V01, V11), `ApiGateWay` access control (V03), rate limiting (V05), Google OAuth 2.0 / OIDC |
| **Perera N. S. G.** | IT22276346 | `RestaurantService` validation (V07), client token storage (V06), frontend integration |
| **Perera M. A. I.** | IT22206282 | `OrderService` payload validation (V07), `PaymentService` webhook verification (V09) |
| **Dilki H. P. C.** | IT22111210 | Secret purging & `.gitignore` (V02), CORS hardening (V04), Helmet headers (V10), dependency SCA (V08) |

---

## 📄 Submission Artifacts

- **Technical Report (PDF):** Root-cause analysis, before/after code diffs, ZAP scan evidence, and secure-development recommendations.
- **Demo Video (≤20 min):** Baseline exploitation, live fixes, Postman verification, and the Google OAuth 2.0 flow — link in `README.txt`.
- **Submission Metadata:** Member details, repository URLs, and video link are in `README.txt` at the repository root.

---

## 📞 Contact

📧 **nithika151@gmail.com**

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
