# 🍽️ DineSwift - Cloud-Native Food Ordering & Delivery System

![Banner](Frontend/src/assets/DineSwift.png)

DineSwift is a next-gen, cloud-native food ordering and delivery platform inspired by UberEats & PickMe Food. Designed with a scalable microservices architecture, it offers a seamless experience for customers, restaurants, and delivery drivers. 🚀

> 🔐 **This repository is a security-hardened fork of the original DineSwift project**, created for the **SE4030 – Secure Software Development** group assignment. The original codebase (last commit 12 Jul 2025, see [original repo](https://github.com/NIKKAvRULZ/DineSwift)) was audited for vulnerabilities, fixed, and extended with an OAuth/OpenID Connect login flow. See the [Security & Assignment Work](#-security--assignment-work) section below for details.

---

## 🚀 Features at a Glance

- ✅ **Intuitive Web Interface** – Easily browse restaurants, add items to cart, and place orders  
- ✅ **Restaurant Dashboard** – Manage menus, update orders, and track earnings  
- ✅ **Order Tracking** – Real-time status updates with GPS-enabled delivery tracking  
- ✅ **AI-Powered Auto Assignment** – Smart allocation of drivers to optimize deliveries  
- ✅ **Secure Payments** – Supports PayHere, Dialog Genie, and Stripe (Sandbox Mode)  
- ✅ **Instant Notifications** – Get email & SMS updates for every order status change  
- ✅ **OAuth 2.0 / OpenID Connect Login** – Sign in with Google, alongside the existing email/password flow *(added for SE4030)*

---

## 🏗️ Tech Stack

### 🔙 Backend (Microservices)
- 🟢 **Node.js (Express.js)** – API Development  
- 🟢 **MongoDB** – NoSQL Database  
- 🟢 **Kafka** – Asynchronous Messaging  
- 🟢 **Docker & Kubernetes** – Containerized Services & Orchestration  

### 🎨 Frontend
- ⚛️ **React.js** – Modern Web App UI  
- 💅 **Tailwind CSS** – Styling and Components  
- 🔄 **Axios** – API Integration  
- 🎬 **Framer Motion** – Smooth Animations  

### 🛠️ DevOps & Deployment
- 🐳 **Docker** – Microservice Deployment  
- ☸️ **Kubernetes** – Scalable Service Management  
- 🧪 **Postman** – API Testing & Debugging  

### 🛡️ Security Tooling *(added for SE4030)*
- 🔎 **OWASP ZAP** – Black-box vulnerability scanning  
- 🔎 **npm audit / OWASP Dependency-Check** – Dependency vulnerability scanning  
- 🔎 **gitleaks** – Scanning for committed secrets  
- 🔎 **ESLint (security plugin)** – Static code analysis  
- 🔐 **Helmet** – HTTP security headers  
- 🔐 **Passport.js (Google OAuth 2.0 strategy)** – OpenID Connect login

---

## 📂 Project Structure

```
DineSwift/
├── Frontend/                  # React.js Frontend
│   ├── src/
│   │   ├── components/        # Reusable UI Components
│   │   ├── pages/             # Page Components
│   │   ├── context/           # React Context Providers
│   │   ├── hooks/             # Custom React Hooks
│   │   └── api/               # API Integration
│   └── public/                # Static Assets
│
├── Services/                  # Backend Microservices
│   ├── ApiGateway/            # API Gateway Service
│   ├── UserService/           # User Management + Auth (incl. OAuth/OIDC)
│   ├── RestaurantService/     # Restaurant Management
│   ├── OrderService/          # Order Processing
│   ├── PaymentService/        # Payment Processing
│   ├── DeliveryService/       # Delivery Management
│   └── NotificationService/   # Email/SMS Notifications
│
├── Kubernetes/                # K8s Deployment Configs
└── Docker/                    # Docker Configurations
```

---

## 🔧 Quick Setup

### ✅ Prerequisites
- Node.js (v16+)
- Docker
- Kubernetes CLI (`kubectl`)
- MongoDB

### 1️⃣ Clone the Repository
```bash
git clone <this-repo-url>
cd DineSwift
```

### 2️⃣ Configure environment variables
Each service ships with a `.env.example` — copy it to `.env` and fill in your own values (database URI, JWT secret, Stripe key, Twilio credentials, Google OAuth client ID/secret, etc.):
```bash
cp Services/<ServiceName>/.env.example Services/<ServiceName>/.env
```
> ⚠️ **Never commit real `.env` files.** They're excluded via `.gitignore` — this was one of the vulnerabilities fixed in this fork (see below).

### 3️⃣ Frontend Setup
```bash
cd Frontend
npm install
npm run dev
```

### 4️⃣ Backend Services Setup
For each microservice in `Services/`:
```bash
cd Services/<ServiceName>
npm install
npm start
```
---

## 🛡️ Security & Assignment Work

This fork was created for the **SE4030 Secure Software Development** group assignment. Work done on top of the original project:

- Identified and fixed **7+ distinct vulnerabilities**, including broken login/password verification, hardcoded secrets committed to version control, missing access-control checks on API routes, overly permissive CORS, no rate limiting on auth endpoints, client-side JWT storage, inconsistent input validation, and outdated/vulnerable dependencies.
- Implemented an **OAuth 2.0 / OpenID Connect** login flow (Google) in `UserService`, alongside the existing email/password login.
- Full vulnerability list, fixes, and before/after evidence are documented in the assignment **report (PDF)**.
- A walkthrough video (≤20 min) demonstrating the vulnerabilities, fixes, and OAuth flow is linked in `README.txt` at the repo root (submission file, separate from this document).

---


## 👥 Meet the Team

- 🚀 **Nithika** – Project Lead · API Gateway, UserService, OAuth/OIDC implementation  
- 💡 **Susara** – RestaurantService, Frontend  
- 🔧 **Imeshi** – OrderService, PaymentService  
- 📊 **Dilki** – DeliveryService, NotificationService, Secrets & Config Cleanup  

---

## 📞 Contact Us

For questions, suggestions, or collaborations, reach out at:  
📧 **nithika151@gmail.com**

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).