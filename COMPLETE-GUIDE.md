# 🏠 INDI — Complete Setup Guide
## IndoFitting WhatsApp AI Sales Agent
## Everything you need — from zero to fully live

---
---

# PART 1 — WHAT YOU ARE BUILDING

Indi is an AI sales agent that lives inside your WhatsApp Business number.
She handles the complete sales journey automatically:

  Customer asks about products
           ↓
  Indi recommends from your LIVE Shopify catalog
           ↓
  Indi provides technical advice (hinge specs, compatibility, BOQ)
           ↓
  Customer confirms items
           ↓
  Indi fetches LIVE shipping rates from KiriminAja
           ↓
  Customer picks courier
           ↓
  Indi sends a Midtrans payment link
           ↓
  Customer pays (GoPay / OVO / Bank Transfer / Card)
           ↓
  Shopify order created AUTOMATICALLY ✅
           ↓
  Customer receives WhatsApp confirmation with order number
           ↓
  Your admin sees the order in Shopify → fulfils and ships

No Shopify account needed from the customer.
No website visit needed.
Everything happens inside WhatsApp.

---
---

# PART 2 — WHAT YOU NEED TO SET UP (CHECKLIST)

Complete these in order. Each section below has exact steps.

  □ STEP 1  — Anthropic API Key          (5 min)   Free to create
  □ STEP 2  — Shopify API Key            (10 min)  Free, built into Shopify
  □ STEP 3  — KiriminAja Account         (1 day)   Free API
  □ STEP 4  — Midtrans Account           (1-3 days) Free, pay per transaction
  □ STEP 5  — Wati.io Account            (30 min)  $49/month
  □ STEP 6  — GitHub Account             (10 min)  Free
  □ STEP 7  — Railway Deployment         (15 min)  Free tier
  □ STEP 8  — Connect Wati Webhook       (5 min)   Free
  □ STEP 9  — Connect Midtrans Webhook   (5 min)   Free
  □ STEP 10 — Set Welcome Message        (5 min)   Free
  □ STEP 11 — Test End-to-End            (20 min)  Free

Total setup time: ~2 hours spread over 1-3 days
(KiriminAja and Midtrans verification take 1-3 business days)

---
---

# PART 3 — STEP BY STEP SETUP

═══════════════════════════════════════════════════════
STEP 1 — GET YOUR ANTHROPIC API KEY
Time: 5 minutes | Cost: Free (pay as you go ~$5-20/month)
═══════════════════════════════════════════════════════

This powers Indi's intelligence.

1. Go to: https://console.anthropic.com
2. Sign up and create an account
3. Click "API Keys" in the left menu
4. Click "Create Key" → name it: IndoFitting Indi
5. ⚠️  COPY the key (starts with sk-ant-...) — you only see it ONCE
6. Go to "Billing" → add payment method → top up $20 to start
7. Set a spending limit of $30/month to avoid surprises

Save this as: ANTHROPIC_API_KEY

═══════════════════════════════════════════════════════
STEP 2 — GET YOUR SHOPIFY API KEY
Time: 10 minutes | Cost: Free
═══════════════════════════════════════════════════════

This lets Indi read your live products AND create orders automatically.

⚠️  IMPORTANT: You need TWO permissions this time:
    ✅ read_products  (to show customers your catalog)
    ✅ write_orders   (to create orders after payment)

1. Log into: https://indofitting.myshopify.com/admin
2. Left menu → "Apps" → scroll to bottom → "Develop apps"
   (If you see a warning, click "Allow custom app development")
3. Click "Create an app"
4. Name: Indi Bot v3 | Email: your email | Click "Create app"
5. Click "Configure Admin API scopes"
6. Find and tick BOTH:
   ✅ read_products
   ✅ write_orders
7. Click "Save"
8. Click "Install app" → Confirm
9. Click "Reveal token once"
10. ⚠️  COPY the token (starts with shpat_...) — only shown once

Save these as:
  SHOPIFY_STORE         = indofitting.myshopify.com
  SHOPIFY_ACCESS_TOKEN  = shpat_...

NOTE: If you already have an older Indi Bot app in Shopify,
      create a NEW one called "Indi Bot v3" — the old token
      does not have write_orders permission.

═══════════════════════════════════════════════════════
STEP 3 — SET UP KIRIMINAJA (Live Shipping Rates)
Time: 10 minutes setup + 1 business day verification
Cost: Free API — you pay normal courier rates per shipment
═══════════════════════════════════════════════════════

This gives Indi real-time shipping quotes from JNE, J&T, SiCepat, etc.

1. Go to: https://kiriminaja.com
2. Click "Daftar" (Register) → create a business account
3. Complete business verification (they may ask for NPWP/KTP)
4. Once approved, go to Dashboard → API Settings
5. Copy your API Key

Also note your Jakarta warehouse/office postal code.
Example: Central Jakarta = 10110, South Jakarta = 12110
(Google "kode pos [your area] Jakarta" to find yours)

Save these as:
  KIRIMINAJA_API_KEY  = your API key
  KIRIMINAJA_ORIGIN   = your Jakarta postal code (e.g. 10110)

═══════════════════════════════════════════════════════
STEP 4 — SET UP MIDTRANS (Payment Gateway)
Time: 15 minutes setup + 1-3 business days verification
Cost: Free account — small fee per transaction only
═══════════════════════════════════════════════════════

This lets Indi send payment links directly in WhatsApp.
Customers can pay via GoPay, OVO, DANA, bank transfer, credit card,
Alfamart, Indomaret — all without leaving WhatsApp.

1. Go to: https://midtrans.com
2. Click "Daftar Sekarang" → create business account
3. Complete verification:
   - Business name and address
   - Bank account for payouts
   - Business documents (may take 1-3 days)
4. Once approved, go to:
   Dashboard → Settings → Access Keys
5. Copy:
   - Server Key (starts with Mid-server-...)
   - Client Key (starts with Mid-client-...)
   You only need the Server Key for Indi.

Testing first (recommended):
   Midtrans has a Sandbox mode for testing.
   Use MIDTRANS_ENV=sandbox while testing,
   then switch to MIDTRANS_ENV=production when ready.

Save these as:
  MIDTRANS_SERVER_KEY  = Mid-server-...
  MIDTRANS_ENV         = sandbox  (change to production when live)

═══════════════════════════════════════════════════════
STEP 5 — SET UP WATI.IO (WhatsApp Connection)
Time: 30 minutes | Cost: $49/month (7-day free trial)
═══════════════════════════════════════════════════════

Wati connects your WhatsApp Business number to Indi.

1. Go to: https://wati.io → Start Free Trial
2. During signup → "Connect Existing Number"
3. Enter your IndoFitting WhatsApp Business number
4. Connect your Meta Business account when prompted:
   → Click "Connect with Facebook"
   → Log in with your Meta credentials
   → Approve the permissions
5. Complete phone number verification
6. Once set up, go to:
   Manage Account → API
7. Copy:
   - API Endpoint URL (e.g. https://live-mt-server.wati.io/12345)
   - Access Token (long string starting with ey...)

Save these as:
  WATI_API_URL    = https://live-mt-server.wati.io/XXXXX
  WATI_API_TOKEN  = eyXXXXXXXXXXXX

═══════════════════════════════════════════════════════
STEP 6 — UPLOAD FILES TO GITHUB
Time: 10 minutes | Cost: Free
═══════════════════════════════════════════════════════

GitHub stores your bot code. Railway reads from it to run the bot.

1. Go to: https://github.com → sign up (free)
2. Click "+" top right → "New repository"
3. Name: indi-whatsapp-bot
4. Set to: Private
5. Click "Create repository"
6. Click "uploading an existing file"
7. Drag and drop these 4 files from this zip:
   → server.js
   → package.json
   → .gitignore
   → .env.example
   ⚠️  Do NOT upload .env — keep your keys private
8. Click "Commit changes"

═══════════════════════════════════════════════════════
STEP 7 — DEPLOY ON RAILWAY
Time: 15 minutes | Cost: Free tier (~$5/month when you scale)
═══════════════════════════════════════════════════════

Railway runs your bot 24/7 in the cloud.

A. DEPLOY THE CODE
   1. Go to: https://railway.app
   2. Sign in with GitHub → approve connection
   3. Click "New Project" → "Deploy from GitHub repo"
   4. Select "indi-whatsapp-bot"
   5. Railway deploys automatically — wait ~2 minutes

B. ADD ALL YOUR ENVIRONMENT VARIABLES
   1. Click on your service → "Variables" tab
   2. Add each variable one by one:

   ┌─────────────────────────────────────────────────────────────┐
   │ Variable Name          │ Value                              │
   ├─────────────────────────────────────────────────────────────┤
   │ ANTHROPIC_API_KEY      │ sk-ant-... (from Step 1)          │
   │ WATI_API_URL           │ https://live-mt-server... (Step 5)│
   │ WATI_API_TOKEN         │ ey... (from Step 5)               │
   │ SHOPIFY_STORE          │ indofitting.myshopify.com         │
   │ SHOPIFY_ACCESS_TOKEN   │ shpat_... (from Step 2)           │
   │ KIRIMINAJA_API_KEY     │ your key (from Step 3)            │
   │ KIRIMINAJA_ORIGIN      │ your postal code (from Step 3)    │
   │ MIDTRANS_SERVER_KEY    │ Mid-server-... (from Step 4)      │
   │ MIDTRANS_ENV           │ sandbox (change to production later)│
   └─────────────────────────────────────────────────────────────┘

   3. Railway restarts automatically with new variables

C. GET YOUR RAILWAY URL
   1. Click "Settings" tab → "Domains"
   2. Click "Generate Domain"
   3. Copy the URL — looks like:
      https://indi-whatsapp-bot-production.up.railway.app

D. TEST THE HEALTH CHECK
   Open that URL in your browser. You should see:
   {
     "status": "✅ Indi v3 is live",
     "shopify": "indofitting.myshopify.com",
     "kiriminaja": "✅ connected",
     "midtrans": "✅ sandbox",
     ...
   }
   If you see this — Indi is running! 🎉

═══════════════════════════════════════════════════════
STEP 8 — CONNECT WATI WEBHOOK
Time: 5 minutes
═══════════════════════════════════════════════════════

This tells Wati to forward every incoming WhatsApp message to Indi.

1. Wati dashboard → "Integrations" → "Webhooks"
2. Click "Add Webhook"
3. URL field: paste your Railway URL + /webhook
   Example: https://indi-whatsapp-bot-production.up.railway.app/webhook
4. Events: tick ✅ "Message Received"
5. Click "Save"

═══════════════════════════════════════════════════════
STEP 9 — CONNECT MIDTRANS PAYMENT WEBHOOK
Time: 5 minutes
═══════════════════════════════════════════════════════

This tells Midtrans to notify Indi when a payment is confirmed.
This is what triggers automatic Shopify order creation.

1. Log into: https://dashboard.midtrans.com
2. Go to Settings → Configuration
3. Find "Payment Notification URL"
4. Enter your Railway URL + /midtrans-notify:
   Example: https://indi-whatsapp-bot-production.up.railway.app/midtrans-notify
5. Click Save

═══════════════════════════════════════════════════════
STEP 10 — SET WELCOME MESSAGE IN WATI
Time: 5 minutes
═══════════════════════════════════════════════════════

Auto-sends when a new customer messages you for the first time.

1. Wati dashboard → "Automation" → "Welcome Message"
2. Turn it ON and paste this message:

---
Halo! 👋 Selamat datang di IndoFitting!

Saya Indi, konsultan fitting interior Anda.

Saya bisa bantu:
🔩 Rekomendasi produk yang tepat
💰 Info harga terbaru langsung dari website
🚚 Estimasi ongkir real-time ke kota Anda
📐 BOQ dari gambar kerja Anda
💳 Proses pesanan & pembayaran langsung di sini

Sedang mengerjakan ruangan apa? 🏠
---

3. Click Save

═══════════════════════════════════════════════════════
STEP 11 — TEST END-TO-END
Time: 20 minutes
═══════════════════════════════════════════════════════

Do a full test before going live with real customers.

A. BASIC CONVERSATION TEST
   From a different phone → message your IndoFitting WhatsApp:
   → "Halo, saya butuh engsel untuk kitchen cabinet"
   Indi should reply within 3-5 seconds with product recommendations.

B. FULL SALES FLOW TEST (use Midtrans sandbox)
   Have a full conversation:
   1. Ask about products
   2. Say you want to order
   3. Give a delivery city and postal code
   4. Confirm a shipping option
   5. Confirm the full order
   6. Receive the payment link
   7. Pay using Midtrans sandbox test card:
      Card: 4811 1111 1111 1114
      Expiry: any future date
      CVV: 123
   8. Check Shopify admin — order should appear automatically ✅
   9. Check WhatsApp — confirmation message should arrive ✅

C. GO LIVE
   Once everything works in sandbox:
   → Change MIDTRANS_ENV from "sandbox" to "production" in Railway
   → Indi is now fully live and accepting real payments! 🎉

---
---

# PART 4 — SHOPIFY LISTING RULES (VERY IMPORTANT)

Since Indi reads your Shopify catalog live, how you write
your product listings directly affects what Indi tells customers.

GOLDEN RULES:
─────────────────────────────────────────────────────────────
1. ALWAYS state what the price covers in the title or description
   ❌  IDF Essenta 105°
   ✅  IDF Essenta Standard Hinge 105° — 1 Pair (2 pcs)

2. ALWAYS write the price description clearly
   ❌  Rp 65.000
   ✅  Rp 65.000 per pair (2 pieces included)

3. ALWAYS name variants clearly
   ❌  Option 1 / Option 2
   ✅  35mm overlay / 45mm overlay

4. ALWAYS include in description:
   - What door type it fits
   - Weight capacity
   - What's included in the pack
   - Key dimensions (bore hole size, overlay, etc.)

5. Keep products ACTIVE in Shopify — Indi only shows active products

─────────────────────────────────────────────────────────────
When you update a price on Shopify → Indi quotes it immediately
When you add a new product → Indi finds it automatically
When you run a promo → update Shopify → Indi quotes the promo price
─────────────────────────────────────────────────────────────

---
---

# PART 5 — ADDING MORE SHOPIFY STORES

Since all your businesses are in the same industry,
use ONE Indi for ALL stores. Cost stays flat.

For each new store, just add 2 more variables in Railway:
  SHOPIFY_STORE_2         = yourstore2.myshopify.com
  SHOPIFY_ACCESS_TOKEN_2  = shpat_yyy

And send me (Claude) a message — I'll update server.js to
include the new store. Takes about 30 minutes.

Cost impact: ZERO. Same $54-74/month for 1 or 10 stores.

---
---

# PART 6 — MONTHLY COSTS

┌──────────────────────────────────────────────────────┐
│ Service           │ Cost          │ In IDR            │
├──────────────────────────────────────────────────────┤
│ Anthropic (Claude)│ ~$5-20/month  │ Rp 80K-320K      │
│ Wati.io           │ $49/month     │ Rp 784K           │
│ Railway (hosting) │ Free → $5/mo  │ Rp 0-80K          │
│ Shopify API       │ Free          │ Rp 0              │
│ KiriminAja API    │ Free          │ Rp 0              │
│ Midtrans          │ Per txn only  │ Rp 4K-flat/VA     │
├──────────────────────────────────────────────────────┤
│ TOTAL             │ ~$54-74/month │ Rp 864K-1.18 juta │
└──────────────────────────────────────────────────────┘

Cost stays THE SAME whether you have 1 store or 5 stores.
Midtrans only charges when you RECEIVE a payment.

---
---

# PART 7 — ONGOING MAINTENANCE

─────────────────────────────────────────────────────────────
WHEN YOU CHANGE A PRICE → Update Shopify. Indi updates instantly.
WHEN YOU ADD A PRODUCT  → Add to Shopify. Indi finds it automatically.
WHEN YOU RUN A PROMO    → Update price in Shopify. Done.
WHEN YOU ADD A STORE    → New Shopify API key + 2 Railway variables.
─────────────────────────────────────────────────────────────

Monthly checks (10 minutes):
→ Railway dashboard → make sure bot is still running
→ Anthropic billing → top up if needed
→ Wati → review conversation quality

---
---

# PART 8 — FILES IN THIS ZIP

┌─────────────────────────────────────────────────────────┐
│ File              │ What it is                          │
├─────────────────────────────────────────────────────────┤
│ server.js         │ The complete Indi v3 bot code       │
│                   │ Includes: Shopify sync, KiriminAja, │
│                   │ Midtrans payments, auto Shopify      │
│                   │ order creation, lead capture         │
├─────────────────────────────────────────────────────────┤
│ package.json      │ Node.js dependencies list           │
├─────────────────────────────────────────────────────────┤
│ .env.example      │ Template for all 9 environment      │
│                   │ variables (copy and fill in)         │
├─────────────────────────────────────────────────────────┤
│ .gitignore        │ Prevents secrets from being         │
│                   │ accidentally uploaded to GitHub      │
├─────────────────────────────────────────────────────────┤
│ COMPLETE-GUIDE.md │ This file — everything you need     │
└─────────────────────────────────────────────────────────┘

Upload server.js, package.json, .gitignore, and .env.example
to GitHub. Keep this guide for reference.

---
---

# PART 9 — TROUBLESHOOTING

─────────────────────────────────────────────────────────────
Problem: Indi doesn't reply at all
→ Check Railway logs (Railway → your service → Logs tab)
→ Confirm WATI_API_URL and WATI_API_TOKEN are correct
→ Confirm webhook URL in Wati ends with /webhook

Problem: Indi gives wrong prices
→ Check your Shopify product listing — is the title and price clear?
→ Make sure product is set to "Active" in Shopify

Problem: Shipping rates not showing
→ Check KIRIMINAJA_API_KEY and KIRIMINAJA_ORIGIN are set in Railway
→ Make sure customer provided a valid Indonesian postal code

Problem: Payment link not generated
→ Check MIDTRANS_SERVER_KEY is correct
→ Check MIDTRANS_ENV is either "sandbox" or "production" (exact spelling)

Problem: Shopify order not created after payment
→ Check /midtrans-notify URL is set in Midtrans dashboard
→ Check SHOPIFY_ACCESS_TOKEN has write_orders permission
→ Check Railway logs for error messages

Problem: WATI_API_TOKEN expired (Unauthorized error in logs)
→ Go to Wati dashboard → regenerate Access Token
→ Update WATI_API_TOKEN in Railway Variables

─────────────────────────────────────────────────────────────

Built with ❤️ for IndoFitting
www.indofitting.com | Powered by Claude AI
