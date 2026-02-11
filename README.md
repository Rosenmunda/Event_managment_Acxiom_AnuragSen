# 🎟️ Event Management System (EventMS)

A full-stack MERN web application designed to streamline the planning and execution of technical events. This platform connects **Users** (event organizers) with **Vendors** (equipment/service providers) while providing **Admins** with full system oversight.

![Project Status](https://img.shields.io/badge/status-active-success.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

---

## 🚀 Live Demo
- **Frontend:** (https://event-managment-acxiom-anurag-blrpq83gf-rosenmundas-projects.vercel.app/)
- **Backend API:** (https://event-api-ufe3.onrender.com/api/)

---

## 🌟 Features

### 👤 User Portal
- **Browse & Search:** Filter vendors and products by category or name.
- **Cart System:** Add items to cart and manage quantities (persists on refresh).
- **Order Management:** Place orders and track status (Received → Shipped → Delivered).
- **Request Item:** Submit custom requests for items not listed in the catalog.

### 🏪 Vendor Dashboard
- **Product Management:** Add, edit, delete, and toggle visibility of products.
- **Order Fulfillment:** View incoming orders containing your products and update their status.
- **Analytics:** View total revenue, total orders, and active product count.

### 🛡️ Admin Panel
- **User/Vendor Oversight:** View all registered users and vendors.
- **System Stats:** Real-time dashboard showing total revenue, orders, and user count.
- **Database Seeder:** Built-in tool to populate the database with initial admin/demo data.

---

## 🛠️ Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | HTML5, CSS3, JavaScript (Vanilla) | Single Page Application (SPA) architecture without frameworks. |
| **Backend** | Node.js, Express.js | RESTful API handling auth, data, and logic. |
| **Database** | MongoDB Atlas | Cloud NoSQL database for flexible data storage. |
| **Deployment**| Render (Back), Netlify (Front) | CI/CD pipeline for automatic deployment. |

---

## 📂 Project Structure

```text
EventManagementSystem/
├── client/              # Frontend Code
│   ├── index.html       # Single Page Application Entry
│   ├── style.css        # Global Styles & Theming
│   └── script.js        # API Calls & UI Logic
└── server/              # Backend Code
    ├── server.js        # Express App & Routes
    ├── package.json     # Dependencies
    └── .env             # Environment Variables (Not committed)



