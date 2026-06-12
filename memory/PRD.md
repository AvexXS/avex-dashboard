# Avex Cloud — PRD

## Original Problem Statement
Build a cloud hosting platform named **Avex** (avex.click).
- Black/white clean modernist landing page with tagline "High performance Servers & Designs at a low performance price"; two CTAs: "Start for free" and "Choose premium plans".
- Legal pages: terms, privacy, fair use, payment terms; About page.
- Hosting via a **Pterodactyl**-like game panel. Free tier: 2 GB RAM, 1 core, 5 GB storage. Premium plans purchasable in dashboard.
- Auth: email/password with SMTP (Brevo) email verification, Google, Discord. First user becomes admin.
- Pterodactyl-like dashboard (server console, plugin downloader for Minecraft).
- Tickets: support, design, video editing, VPS enquiry, billing. Staff admin panel.
- Design Studio: website design + video editing plans → creates a ticket assigned to designer/editor.
- Invoicing with multiple payment methods (Stripe live; Razorpay/PayPal admin-configurable).
- Admin: staff/engineer creation, price editing, invoice review, ticket completion, link Pterodactyl panel.
- VPS / Virtual Dedicated: enquiry → creates ticket.
- Navbar: redirects to Discord, VPS, login, and other landing sections.

## Architecture
- **Backend**: FastAPI + MongoDB (Motor), JWT (httpOnly cookies + Bearer fallback), bcrypt passwords, Brevo SMTP for email, Stripe via emergentintegrations. Routers under `/api`: auth, public, plans, servers, tickets, billing, admin, webhook.
- **Frontend**: React + React Router + Tailwind + framer-motion + shadcn/ui + sonner toasts. Aesthetic: black/white modernist with Outfit display font, Manrope body, JetBrains Mono for terminal/code.
- **Pterodactyl mocking**: in-memory console + DB-backed servers/plugins; admin will link real panel later via Settings page.

## User Personas
- **Visitor**: browses landing, pricing, design, VPS, legal.
- **Customer**: free-tier game server owner managing servers, tickets, invoices.
- **Designer / Editor (staff)**: handles design/video-editing tickets.
- **Engineer (staff)**: handles VPS / support tickets.
- **Admin**: full control — users, plans, settings (Pterodactyl + OAuth + payment gateways), invoices.

## Core Requirements (Static)
1. Auth with JWT + bcrypt + Brevo SMTP verification. First-user-becomes-admin invariant.
2. Pterodactyl-like dashboard with server CRUD, console, stats, plugin install.
3. Plans CRUD + Stripe checkout + invoicing.
4. Tickets module with categories + staff queue + reply.
5. Admin: users, plans, tickets, invoices, settings.

## What's Been Implemented (v1 — 2026-02-12)
- Backend: auth (register/login/logout/me/refresh/verify/forgot/reset), servers + console + plugins (mock), tickets + staff queue + reply (Brevo email on staff reply), plans CRUD, Stripe checkout + webhook + invoices, admin (stats/users/staff/settings/invoices), public settings.
- Frontend: Landing, Pricing, Design, VPS enquiry, About, Legal (4 docs), all auth pages, full user dashboard (overview/servers/server-detail with tabs/tickets/billing/account), full admin panel (overview/users/plans/tickets/invoices/settings).
- Default seeded plans (hosting × 4, design × 3, video × 3) on startup.
- All 27 backend pytest tests pass. UI flows tested end-to-end.

## Prioritized Backlog
### P0 (next)
- Real Pterodactyl panel API integration (replace mock when admin saves API key).
- Discord & Google OAuth wiring (UI placeholders are in place; admin can store keys).
- Razorpay + PayPal checkout (alongside existing Stripe).

### P1
- WebSocket console streaming (currently polls every 3s).
- File manager tab in server detail.
- Email branding tweaks, in-app notification bell.

### P2
- Affiliate / referral program.
- Multi-region selection at server creation.
- Subscription cycle handling for monthly hosting plans (current Stripe flow is one-time per upgrade).

## Test Credentials
See `/app/memory/test_credentials.md`.
