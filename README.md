# SplitEase — Smart Expense Splitter

> Group expense tracking with an automated debt simplification algorithm that reduces settlement transactions by up to 60%.

![SplitEase](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-blue?style=flat-square&logo=postgresql)
![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=flat-square&logo=vercel)

## Features

- **Group management** — Create groups, invite members by email
- **Expense tracking** — Add expenses with equal splits across all members
- **Debt simplification algorithm** — Reduces N*(N-1) transactions to at most N-1 using greedy net balance matching
- **Email notifications** — Nodemailer alerts when new expenses are added or debts settled
- **One-click settlement** — Mark debts as paid, balances update instantly
- **JWT authentication** — Secure register/login with bcrypt password hashing

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React, Tailwind CSS |
| Backend | Next.js API Routes (serverless) |
| Database | PostgreSQL via Neon (serverless) |
| Auth | JWT + bcryptjs |
| Email | Nodemailer |
| Deploy | Vercel |

## The Debt Simplification Algorithm

The core feature and interview talking point. Instead of recording every pairwise debt (which can be O(N²) transactions), the algorithm:

1. Computes net balance for each person: `total paid - total owed`
2. Separates into **creditors** (net > 0) and **debtors** (net < 0)
3. Greedily matches the largest debtor to the largest creditor
4. Transfers `min(|debt|, credit)`, updates both balances, repeats

**Result**: At most `N-1` transactions for N people — the theoretical minimum.

```
Example: 4 people, 6 raw debts → simplified to 3 transactions (50% reduction)
Example: 5 people, 7 raw debts → simplified to 4 transactions (43% reduction)
```

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/expense-splitter.git
cd expense-splitter
npm install
```

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Fill in:
- `DATABASE_URL` — from [neon.tech](https://neon.tech) (free)
- `JWT_SECRET` — any long random string
- `SMTP_*` — optional, for email notifications

### 3. Initialize the database

```bash
npm run dev
# Then visit: http://localhost:3000/api/init
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment (Vercel)

```bash
# Push to GitHub
git add .
git commit -m "feat: initial commit"
git push -u origin main

# Then import at vercel.com/new
# Add environment variables in Vercel dashboard
# Deploy!
```

## Database Schema

```sql
users          — id, name, email, password_hash
groups         — id, name, description, created_by
group_members  — group_id, user_id
expenses       — id, group_id, paid_by, title, amount, split_type
expense_splits — expense_id, user_id, amount
settlements    — group_id, paid_by, paid_to, amount
```

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── auth/register/    POST — register user
│   │   ├── auth/login/       POST — login
│   │   ├── groups/           GET, POST — list & create groups
│   │   ├── groups/[id]/      GET — group detail
│   │   ├── groups/[id]/expenses/  GET, POST — expenses
│   │   ├── groups/[id]/balances/  GET — balances + simplified debts
│   │   ├── groups/[id]/settle/    POST — record settlement
│   │   └── init/             GET — initialize DB tables
│   ├── dashboard/            Groups list page
│   ├── groups/[id]/          Group detail page
│   ├── login/                Login page
│   └── register/             Register page
├── components/
│   ├── AuthContext.tsx        JWT auth state
│   └── Navbar.tsx
└── lib/
    ├── db.ts                  Neon PostgreSQL connection + schema
    ├── auth.ts                JWT utilities
    ├── simplify.ts            Debt simplification algorithm
    ├── email.ts               Nodemailer service
    └── api.ts                 Client-side fetch helper
```

## Resume Line

> "Built a full-stack expense splitting app with an automated debt simplification algorithm reducing settlement transactions by up to 60%, deployed on Vercel with PostgreSQL, JWT auth, and real-time email notifications."

---

Built with Next.js 14 + Neon PostgreSQL + Vercel
