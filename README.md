# SAL Accounting System

<div align="center">
  <h3>🧾 Modern Accounting System for F&B Suppliers</h3>
  <p>A MYOB-like accounting system with Invoicing, Inventory, and Reporting</p>
</div>

---

## ✨ Features

### 📊 Sales & Invoicing
- Create draft invoices with multi-line items
- Post invoices with automatic stock deduction
- Moving average cost calculation
- Payment allocation (partial/full)
- Credit notes for returns

### 📦 Inventory Management
- Real-time stock tracking
- Moving average costing (perpetual)
- Stock ledger with full history
- Stock adjustments & opname
- Negative stock prevention

### 🛒 Purchasing
- Receive items from suppliers
- Bill management
- Payment processing
- Debit notes for returns

### 📈 Reporting
- Sales summary by period
- AR/AP aging reports
- Inventory valuation
- Profit & Loss statement
- Balance Sheet
- Trial Balance

### 🔐 Security
- Role-based access control (RBAC)
- Permission-based UI
- Audit trail for all actions
- Period locking

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- npm or yarn

### 1. Start Database (Docker)

```bash
# Start MySQL and phpMyAdmin
make docker-up

# Or manually:
cd docker && docker-compose up -d
```

**Services:**
- MySQL: `localhost:3306`

### 2. Install Dependencies

```bash
make install

# Or manually:
cd apps/web && npm install
```

### 3. Start Development Server

```bash
make dev

# Or manually:
cd apps/web && npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Login

Use the default admin credentials:
- **Email:** `admin@sal-system.local`
- **Password:** `admin123`

---

## 📁 Project Structure

```
sal-system/
├── apps/
│   └── web/                    # Next.js application
│       ├── app/
│       │   ├── api/v1/         # API Route Handlers
│       │   ├── (ui)/           # UI Pages
│       │   └── layout.tsx
│       └── src/
│           ├── lib/            # Client utilities
│           └── ui/             # React components
├── packages/
│   ├── shared/
│   │   ├── types/              # TypeScript types
│   │   ├── schemas/            # Zod validation schemas
│   │   └── constants/          # Error codes, permissions
│   └── server/
│       ├── db/                 # Database connection
│       ├── auth/               # Authentication
│       └── services/           # Business logic
└── docker/
    ├── docker-compose.yml
    └── mysql/
        ├── init/               # SQL init scripts (schema + seed)
        └── conf.d/             # MySQL configuration
```

---

## 🔑 Default Roles & Permissions

| Role | Description |
|------|-------------|
| **Admin** | Full system access |
| **Owner** | Reports & approvals |
| **Finance** | Post transactions, payments, reports |
| **Sales** | Create invoices, manage customers |
| **Warehouse** | Inventory management |
| **Purchasing** | Purchase orders, receiving |

---

## 🛠️ Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18
- **State Management:** TanStack Query v5
- **Validation:** Zod
- **Database:** MySQL 8.0 (InnoDB)
- **Authentication:** JWT (jose)
- **Styling:** Vanilla CSS with design system
- **Icons:** Lucide React

---

## 📡 API Endpoints

### Authentication
```
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/me
```

### Sales
```
GET  /api/v1/sales/invoices
POST /api/v1/sales/invoices
GET  /api/v1/sales/invoices/:id
POST /api/v1/sales/invoices/:id/post
POST /api/v1/sales/payments
```

### Inventory
```
GET  /api/v1/inventory/stock-on-hand
GET  /api/v1/inventory/ledger
POST /api/v1/inventory/adjustments
```

### Reports
```
GET  /api/v1/reports/sales-summary
GET  /api/v1/reports/ar-aging
GET  /api/v1/reports/inventory-valuation
```

---

## 🐳 Docker Services

| Service | Port | Description |
|---------|------|-------------|
| MySQL | 3306 | Database server |
| phpMyAdmin | 8080 | Database admin UI |

### Environment Variables

Copy `docker/.env` and modify as needed:

```env
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=sal_accounting
MYSQL_USER=sal_user
MYSQL_PASSWORD=sal_password
MYSQL_PORT=3306
PMA_PORT=8080
```

---

## 📋 Commands

```bash
# Docker
make docker-up      # Start containers
make docker-down    # Stop containers
make docker-logs    # View logs
make db-reset       # Reset database

# Development
make install        # Install dependencies
make dev            # Start dev server
make build          # Production build
make start          # Start production
make clean          # Clean artifacts
```

---

## 🔄 Transaction Flow

### Sales Invoice Posting

1. ✅ Check period lock (invoice date)
2. ✅ Validate invoice status = DRAFT
3. ✅ Check stock availability (if no_negative_stock enabled)
4. ✅ Lock item_stock rows (FOR UPDATE)
5. ✅ Update stock (deduct qty, calculate value)
6. ✅ Insert stock ledger entries
7. ✅ Create journal entries (AR, Sales, Tax, COGS, Inventory)
8. ✅ Update invoice status to POSTED
9. ✅ Update customer AR balance
10. ✅ Create audit log

---

## 📝 License

MIT License - feel free to use for personal or commercial projects.

---

<div align="center">
  <p>Built with ❤️ for F&B Suppliers</p>
</div>
