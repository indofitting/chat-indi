/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  IndoFitting — Indi WhatsApp Bot v3                         ║
 * ║  Full Sales Closer — Complete Flow:                         ║
 * ║  Shopify Catalog → KiriminAja Shipping → Midtrans Payment   ║
 * ║  → Auto Shopify Order Creation                              ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Stack: Node.js + Express
 * Host:  Railway.app
 */

const express = require("express");
const axios   = require("axios");
const crypto  = require("crypto");
const app     = express();

app.use(express.json());
app.post("/webhook", async (req, res) => {
  // 1) ACK cepat ke Wati supaya tidak retry
  res.sendStatus(200);

  try {
    const body = req.body || {};
    console.log("Webhook masuk:", JSON.stringify(body));

    // 2) Ambil nomor & pesan dari payload Wati kamu
    const waId = body.waId;      // contoh: "6285194347575"
    const text = body.text;      // contoh: "Hai"
    const eventType = body.eventType;

    // 3) Filter: hanya balas kalau ada pesan text masuk
    if (eventType !== "message") return;
    if (!waId || !text) return;

    // 4) Kirim balasan via Wati
    await axios.post(
      `${WATI_API_URL}/{tenantId}/api/v1/sendSessionMessage/{whatsappNumber}`,
      { messageText: `Halo! Indi di sini. Kamu barusan chat: "${text}". Mau cari fitting untuk ruangan apa?` },
      { headers: { Authorization: `Bearer ${WATI_API_TOKEN}` } }
    );

  } catch (err) {
    console.error("Error kirim balasan:", err.response?.data || err.message);
  }
});


app.get("/webhook", (req, res) => {
  res.status(200).send("OK");
});

// webhook yang dipakai Wati (POST)
app.post("/webhook", (req, res) => {
  console.log("WATI PAYLOAD >>>", JSON.stringify(req.body));
  res.sendStatus(200);
});


// ─── ENVIRONMENT VARIABLES ────────────────────────────────────────────────────
// Set ALL of these in Railway → your project → Variables tab
const ANTHROPIC_API_KEY    = process.env.ANTHROPIC_API_KEY;
const WATI_API_URL         = process.env.WATI_API_URL;
const WATI_API_TOKEN       = process.env.WATI_API_TOKEN;
const SHOPIFY_STORE        = process.env.SHOPIFY_STORE;          // indofitting.myshopify.com
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;   // shpat_xxx (needs read+write orders)
const KIRIMINAJA_API_KEY   = process.env.KIRIMINAJA_API_KEY;     // from kiriminaja.com
const KIRIMINAJA_ORIGIN    = process.env.KIRIMINAJA_ORIGIN;      // your Jakarta postal code e.g. "10110"
const MIDTRANS_SERVER_KEY  = process.env.MIDTRANS_SERVER_KEY;    // from midtrans.com
const MIDTRANS_ENV         = process.env.MIDTRANS_ENV || "production"; // "sandbox" for testing
const PORT                 = process.env.PORT || 3000;

// ─── MIDTRANS BASE URL ────────────────────────────────────────────────────────
const MIDTRANS_BASE = MIDTRANS_ENV === "sandbox"
  ? "https://api.sandbox.midtrans.com/v1"
  : "https://api.midtrans.com/v1";

// ─── IN-MEMORY STORES ─────────────────────────────────────────────────────────
const conversations  = new Map(); // phone → message history
const catalogCache   = new Map(); // phone → { data, timestamp }
const pendingOrders  = new Map(); // phone → order being built
const CACHE_TTL_MS   = 10 * 60 * 1000; // 10 minutes

// ══════════════════════════════════════════════════════════════════════════════
// SHOPIFY — CATALOG FETCH
// ══════════════════════════════════════════════════════════════════════════════
async function getShopifyCatalog(phone) {
  const cached = catalogCache.get(phone);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) return cached.data;

  try {
    const res = await axios.get(
      `https://${SHOPIFY_STORE}/admin/api/2024-01/products.json` +
      `?limit=250&status=active&fields=id,title,variants,body_html,product_type,tags,handle`,
      { headers: { "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN } }
    );

    const catalog = res.data.products.map((p) => {
      const variants = p.variants.map((v) => {
        const price = parseFloat(v.price).toLocaleString("id-ID");
        const label = v.title !== "Default Title" ? ` (${v.title})` : "";
        const stock = v.inventory_quantity !== undefined
          ? ` — Stock: ${v.inventory_quantity}` : "";
        return `  • variant_id:${v.id} | Rp ${price}${label}${stock}`;
      }).join("\n");

      const desc = p.body_html
        ? p.body_html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 250)
        : "";

      return [
        `PRODUCT: ${p.title}`,
        `PRODUCT_ID: ${p.id}`,
        `TYPE: ${p.product_type || "Interior Fitting"}`,
        `PRICE/VARIANTS:\n${variants}`,
        `DESC: ${desc}`,
        `URL: https://indofitting.com/products/${p.handle}`,
      ].join("\n");
    }).join("\n\n---\n\n");

    catalogCache.set(phone, { data: catalog, timestamp: Date.now() });
    console.log(`🛍️  Catalog loaded: ${res.data.products.length} products`);
    return catalog;

  } catch (err) {
    console.error("❌ Shopify catalog error:", err.response?.data || err.message);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// KIRIMINAJA — LIVE SHIPPING RATES
// ══════════════════════════════════════════════════════════════════════════════
async function getShippingRates(destinationPostalCode, weightGrams) {
  try {
    const res = await axios.post(
      "https://api.kiriminaja.com/v1/shipping/cost",
      {
        origin:      KIRIMINAJA_ORIGIN,
        destination: destinationPostalCode,
        weight:      weightGrams,
        item_value:  0,
      },
      {
        headers: {
          Authorization:  `Bearer ${KIRIMINAJA_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Return top 5 cheapest options formatted for Indi to present
    const rates = res.data.data || [];
    return rates
      .sort((a, b) => a.price - b.price)
      .slice(0, 5)
      .map((r) => ({
        courier:  r.courier_name,
        service:  r.service_name,
        price:    r.price,
        etd:      r.etd,
        display:  `${r.courier_name} ${r.service_name} — Rp ${r.price.toLocaleString("id-ID")} (${r.etd})`,
      }));

  } catch (err) {
    console.error("❌ KiriminAja error:", err.response?.data || err.message);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MIDTRANS — CREATE PAYMENT LINK
// ══════════════════════════════════════════════════════════════════════════════
async function createMidtransPaymentLink(order) {
  const orderId = `INF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const payload = {
    transaction_details: {
      order_id:     orderId,
      gross_amount: order.total,
    },
    item_details: [
      ...order.items.map((item) => ({
        id:       String(item.variant_id),
        price:    item.unit_price,
        quantity: item.quantity,
        name:     item.name.slice(0, 50),
      })),
      {
        id:       "SHIPPING",
        price:    order.shipping_cost,
        quantity: 1,
        name:     `Shipping - ${order.shipping_courier}`,
      },
    ],
    customer_details: {
      first_name: order.customer_name,
      phone:      order.customer_phone,
      shipping_address: {
        first_name: order.customer_name,
        phone:      order.customer_phone,
        address:    order.customer_address || "",
        city:       order.customer_city,
        country_code: "IDN",
      },
    },
    expiry: {
      unit:     "hours",
      duration: 24,
    },
  };

  const authHeader = "Basic " +
    Buffer.from(MIDTRANS_SERVER_KEY + ":").toString("base64");

  const res = await axios.post(
    `${MIDTRANS_BASE}/payment-links`,
    payload,
    { headers: { Authorization: authHeader, "Content-Type": "application/json" } }
  );

  return { orderId, paymentUrl: res.data.payment_url };
}

// ══════════════════════════════════════════════════════════════════════════════
// SHOPIFY — CREATE ORDER (after payment confirmed)
// ══════════════════════════════════════════════════════════════════════════════
async function createShopifyOrder(order, midtransOrderId) {
  const payload = {
    order: {
      line_items: order.items.map((item) => ({
        variant_id: item.variant_id,
        quantity:   item.quantity,
        price:      (item.unit_price / 100).toFixed(0), // Shopify uses string IDR
      })),
      customer: {
        first_name: order.customer_name,
        phone:      order.customer_phone,
      },
      shipping_address: {
        first_name: order.customer_name,
        phone:      order.customer_phone,
        address1:   order.customer_address || "",
        city:       order.customer_city,
        country:    "Indonesia",
        zip:        order.customer_postal_code || "",
      },
      shipping_lines: [{
        title:         `${order.shipping_courier} — ${order.shipping_service}`,
        price:         (order.shipping_cost / 100).toFixed(0),
        custom:        true,
      }],
      financial_status: "paid",
      fulfillment_status: null, // unfulfilled — admin handles shipping
      tags:           `whatsapp,indi-bot,midtrans:${midtransOrderId}`,
      note:           `Order from WhatsApp via Indi Bot. Midtrans Order ID: ${midtransOrderId}. Customer WhatsApp: ${order.customer_phone}`,
      send_receipt:   false,
    },
  };

  const res = await axios.post(
    `https://${SHOPIFY_STORE}/admin/api/2024-01/orders.json`,
    payload,
    {
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
        "Content-Type":           "application/json",
      },
    }
  );

  const shopifyOrder = res.data.order;
  console.log(`✅ Shopify order created: #${shopifyOrder.order_number} (${shopifyOrder.id})`);
  return shopifyOrder;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONVERSATION HISTORY
// ══════════════════════════════════════════════════════════════════════════════
function getHistory(phone) {
  if (!conversations.has(phone)) conversations.set(phone, []);
  return conversations.get(phone);
}
function addToHistory(phone, role, content) {
  const h = getHistory(phone);
  h.push({ role, content });
  if (h.length > 20) h.splice(0, h.length - 20);
}

// ══════════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ══════════════════════════════════════════════════════════════════════════════
function buildSystemPrompt(catalog) {
  const catalogSection = catalog
    ? `════════ LIVE PRODUCT CATALOG — INDOFITTING.COM ════════
The following is the LIVE product catalog pulled directly from Shopify right now.
Prices are 100% accurate. Each product has a variant_id — you MUST include this
when building orders so the system can create it in Shopify correctly.

${catalog}

════════ END OF CATALOG ════════`
    : `NOTE: Live catalog unavailable. Ask customer to visit indofitting.com directly.`;

  return `You are Indi, the AI sales consultant for IndoFitting (indofitting.com) — a premium interior fittings business in Indonesia.

You run inside WhatsApp. Keep replies SHORT — max 5–6 lines. Plain text only, no markdown. Use line breaks freely. Emojis sparingly.

${catalogSection}

════════ CONVERSATION FLOW — FOLLOW THIS ORDER ════════

STAGE 1 — DISCOVER
Understand what the customer needs:
- Which room? (Kitchen / Bedroom / Bathroom / Laundry)
- What type of cabinet/door?
- Approximate number of doors and drawers

STAGE 2 — RECOMMEND
Recommend specific products from the catalog. Always include:
- Product name, variant, and price exactly as listed
- Product URL
- What the price covers (pair, set, single piece)
- Technical reasoning for why this product suits them

STAGE 3 — BUILD ORDER
Once customer wants to proceed, collect their cart:
- Confirm each item: product name, variant_id, quantity, unit price
- Calculate subtotal

Then collect delivery details:
- Full name
- WhatsApp number (confirm it)
- Delivery city and postal code
- Full delivery address

Then call: [GET_SHIPPING|postal_code={code}|weight_grams={total_weight}]
(Estimate weight: hinges ~150g each, kitchen sets 1000–5000g, drawer systems 3000–8000g)

STAGE 4 — CONFIRM ORDER
Present full order summary clearly:

---
✅ Ringkasan Pesanan / Order Summary:

[list each item: name × qty = subtotal]

Subtotal produk:  Rp xxx
Ongkir [courier]: Rp xxx
─────────────────────────
TOTAL:            Rp xxx

Dikirim ke: [name], [city]
---

Ask: "Konfirmasi pesanan ini? / Confirm this order?"

STAGE 5 — PAYMENT
When customer confirms, output EXACTLY (do not add any other text on same line):
[CREATE_PAYMENT|name={name}|phone={phone}|city={city}|postal={postal}|address={address}|shipping_cost={cost}|shipping_courier={courier}|shipping_service={service}|items={JSON array of {variant_id,name,quantity,unit_price}}|total={total}]

STAGE 6 — DONE
After payment link is sent, say:
"Link berlaku 24 jam. Setelah pembayaran dikonfirmasi, pesanan Anda akan langsung masuk ke sistem kami dan tim kami akan segera memproses pengiriman. 🏠"

════════ TECHNICAL ADVICE ════════

HINGE SELECTION:
- Standard MDF/wood overlay door → IDF Essenta Standard 105°
- Aluminium frame door → IDF Essenta/Titania Aluminium 105°
- Heavy door >30kg → IDF Titania (rated 40kg)
- Handle-free / push-to-open → EFFEGIBREVETTI Ankor DS Push or Soft
- Corner or bi-fold door → 165° Wide Angle
Hinges per door: <60cm=2pcs, 60–120cm=2–3pcs, >120cm=3–4pcs
Bore hole: 35mm standard, 52mm for Ankor DS

DRAWER & KITCHEN:
- Standard drawer → IDF Compacta or VIBO Flybox
- Corner unit → VIBO Flymoon or Compacta Corner Basket
- Cutlery → GOLLINUCCI Sous Chef series
- Pull-down wall cabinet → VEROV or IDF Compacta Pull Down

════════ LEAD COLLECTION ════════
During any conversation, once you have Name + City + Project type, output:
[LEAD]name={name}|city={city}|project={project}|budget={budget}|timeline={timeline}[/LEAD]

════════ ESCALATION ════════
Always hand to human when:
- Order above Rp 10.000.000
- Site visit or installation requested
- Complaint or warranty claim
- Bulk / contractor pricing
Say: "Biarkan saya hubungkan Anda dengan tim kami yang akan follow up dalam 2 jam 🏠"

════════ STYLE ════════
- Warm, knowledgeable — like a trusted interior fitting friend
- Mix Bahasa Indonesia naturally if customer writes in it
- Never pushy — genuinely helpful
- Always end with a question or clear next step
- For pricing: always say "sesuai harga di indofitting.com hari ini"
- Never guess prices — only use catalog above`;
}

// ══════════════════════════════════════════════════════════════════════════════
// PARSE SPECIAL COMMANDS FROM INDI'S REPLIES
// ══════════════════════════════════════════════════════════════════════════════
function parseCommand(text) {
  // Shipping request
  const shippingMatch = text.match(
    /\[GET_SHIPPING\|postal_code=([^|]+)\|weight_grams=(\d+)\]/
  );
  if (shippingMatch) {
    return {
      type:         "GET_SHIPPING",
      postal_code:  shippingMatch[1].trim(),
      weight_grams: parseInt(shippingMatch[2]),
    };
  }

  // Payment creation
  const paymentMatch = text.match(/\[CREATE_PAYMENT\|([\s\S]+?)\]/);
  if (paymentMatch) {
    const raw = paymentMatch[1];
    const get = (key) => {
      const m = raw.match(new RegExp(`${key}=([^|\\]]+)`));
      return m ? m[1].trim() : "";
    };
    let items = [];
    try {
      const itemsRaw = raw.match(/items=(\[[\s\S]+?\])(?:\||\]|$)/);
      if (itemsRaw) items = JSON.parse(itemsRaw[1]);
    } catch (e) {
      console.error("❌ Items parse error:", e.message);
    }
    return {
      type:             "CREATE_PAYMENT",
      customer_name:    get("name"),
      customer_phone:   get("phone"),
      customer_city:    get("city"),
      customer_postal_code: get("postal"),
      customer_address: get("address"),
      shipping_cost:    parseInt(get("shipping_cost")) || 0,
      shipping_courier: get("shipping_courier"),
      shipping_service: get("shipping_service"),
      items,
      total:            parseInt(get("total")) || 0,
    };
  }

  return null;
}

function cleanReply(text) {
  return text
    .replace(/\[GET_SHIPPING\|[^\]]+\]/g, "")
    .replace(/\[CREATE_PAYMENT\|[\s\S]+?\]/g, "")
    .replace(/\[LEAD\][\s\S]*?\[\/LEAD\]/g, "")
    .trim();
}

function extractLead(phone, text) {
  const match = text.match(/\[LEAD\](.*?)\[\/LEAD\]/s);
  if (!match) return null;
  const parts = Object.fromEntries(match[1].split("|").map((p) => p.split("=")));
  const lead  = { phone, ...parts, capturedAt: new Date().toISOString() };
  console.log("📋 LEAD:", JSON.stringify(lead));
  return lead;
}

// ══════════════════════════════════════════════════════════════════════════════
// CALL CLAUDE
// ══════════════════════════════════════════════════════════════════════════════
async function callClaude(phone, userMessage) {
  addToHistory(phone, "user", userMessage);
  const catalog      = await getShopifyCatalog(phone);
  const systemPrompt = buildSystemPrompt(catalog);

  const res = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model:      "claude-sonnet-4-20250514",
      max_tokens: 800,
      system:     systemPrompt,
      messages:   getHistory(phone),
    },
    {
      headers: {
        "x-api-key":         ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type":      "application/json",
      },
    }
  );

  const reply = res.data.content[0].text;
  addToHistory(phone, "assistant", reply);
  return reply;
}

// ══════════════════════════════════════════════════════════════════════════════
// SEND MESSAGE VIA WATI
// ══════════════════════════════════════════════════════════════════════════════
async function sendWatiMessage(phone, message) {
  const cleanPhone = phone.replace(/\D/g, "");
  await axios.post(
    `${WATI_API_URL}/api/v1/sendSessionMessage/${cleanPhone}`,
    { messageText: message },
    {
      headers: {
        Authorization:  `Bearer ${WATI_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN MESSAGE HANDLER
// ══════════════════════════════════════════════════════════════════════════════
async function handleMessage(phone, userMessage) {
  const rawReply = await callClaude(phone, userMessage);
  extractLead(phone, rawReply);

  const command = parseCommand(rawReply);

  // ── SHIPPING REQUEST ───────────────────────────────────────────────────────
  if (command?.type === "GET_SHIPPING") {
    console.log(`🚚 Fetching shipping to ${command.postal_code}, ${command.weight_grams}g`);

    const rates = await getShippingRates(command.postal_code, command.weight_grams);

    if (!rates || rates.length === 0) {
      const fallback = "Maaf, tidak dapat mengambil tarif ongkir saat ini. Tim kami akan menghubungi Anda dengan estimasi ongkir dalam 1 jam. 🙏";
      await sendWatiMessage(phone, fallback);
      addToHistory(phone, "assistant", fallback);
      return;
    }

    // Feed rates back to Claude to present nicely to customer
    const ratesText = rates.map((r, i) => `${i + 1}. ${r.display}`).join("\n");
    const ratesMsg  = `[SHIPPING_RATES_AVAILABLE]\n${ratesText}\n[/SHIPPING_RATES_AVAILABLE]\n\nPlease present these shipping options to the customer clearly and ask them to choose one.`;

    const followUp = await callClaude(phone, ratesMsg);
    await sendWatiMessage(phone, cleanReply(followUp));
    return;
  }

  // ── PAYMENT CREATION ───────────────────────────────────────────────────────
  if (command?.type === "CREATE_PAYMENT") {
    console.log(`💳 Creating payment for ${command.customer_name}`);

    try {
      // 1. Generate Midtrans payment link
      const { orderId, paymentUrl } = await createMidtransPaymentLink(command);
      console.log(`💳 Midtrans order: ${orderId} → ${paymentUrl}`);

      // 2. Store pending order (will create Shopify order after payment webhook)
      pendingOrders.set(orderId, { ...command, phone, midtransOrderId: orderId });

      // 3. Send payment link to customer
      const paymentMsg = [
        `✅ Pesanan Anda sudah siap!`,
        ``,
        `Bayar sekarang 👇`,
        paymentUrl,
        ``,
        `Link berlaku 24 jam 🕐`,
        `Setelah pembayaran dikonfirmasi, pesanan langsung masuk ke sistem kami dan tim akan segera memproses pengiriman. 🏠`,
      ].join("\n");

      await sendWatiMessage(phone, paymentMsg);
      addToHistory(phone, "assistant", paymentMsg);

    } catch (err) {
      console.error("❌ Payment creation error:", err.response?.data || err.message);
      const errMsg = "Maaf, ada kendala membuat link pembayaran. Tim kami akan menghubungi Anda segera. 🙏";
      await sendWatiMessage(phone, errMsg);
    }
    return;
  }

  // ── NORMAL REPLY ───────────────────────────────────────────────────────────
  await sendWatiMessage(phone, cleanReply(rawReply));
}

// ══════════════════════════════════════════════════════════════════════════════
// WEBHOOK — WATI INCOMING MESSAGES
// ══════════════════════════════════════════════════════════════════════════════
app.post("/webhook", async (req, res) => {
  try {
    const { waId, from, text, type } = req.body;
    const phone   = waId || from;
    const message = text?.body || req.body.message || "";

    if (!phone || !message || type !== "text") return res.sendStatus(200);

    console.log(`📨 ${phone}: ${message}`);
    res.sendStatus(200); // respond to Wati immediately

    await handleMessage(phone, message);
    console.log(`✅ Handled message from ${phone}`);

  } catch (err) {
    console.error("❌ Webhook error:", err.response?.data || err.message);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// WEBHOOK — MIDTRANS PAYMENT NOTIFICATION
// Creates Shopify order automatically when payment is confirmed
// ══════════════════════════════════════════════════════════════════════════════
app.post("/midtrans-notify", async (req, res) => {
  try {
    const notification = req.body;
    const { order_id, transaction_status, fraud_status, gross_amount } = notification;

    console.log(`💳 Midtrans notification: ${order_id} → ${transaction_status}`);

    // Verify signature key
    const signatureInput = order_id + notification.status_code + gross_amount + MIDTRANS_SERVER_KEY;
    const expectedSig    = crypto.createHash("sha512").update(signatureInput).digest("hex");
    if (notification.signature_key !== expectedSig) {
      console.error("❌ Invalid Midtrans signature");
      return res.sendStatus(403);
    }

    // Only process confirmed payments
    const isConfirmed = (
      transaction_status === "settlement" ||
      (transaction_status === "capture" && fraud_status === "accept")
    );

    if (!isConfirmed) {
      console.log(`⏳ Payment not yet confirmed (${transaction_status}) — skipping`);
      return res.sendStatus(200);
    }

    // Get pending order data
    const order = pendingOrders.get(order_id);
    if (!order) {
      console.error(`❌ No pending order found for ${order_id}`);
      return res.sendStatus(200);
    }

    // ── CREATE SHOPIFY ORDER ─────────────────────────────────────────────────
    const shopifyOrder = await createShopifyOrder(order, order_id);

    // ── NOTIFY CUSTOMER ON WHATSAPP ──────────────────────────────────────────
    const confirmMsg = [
      `🎉 Pembayaran dikonfirmasi!`,
      ``,
      `Order #${shopifyOrder.order_number} telah dibuat.`,
      `Tim kami akan segera memproses dan mengirimkan pesanan Anda ke ${order.customer_city}.`,
      ``,
      `Terima kasih sudah berbelanja di IndoFitting! 🏠`,
    ].join("\n");

    await sendWatiMessage(order.phone, confirmMsg);

    // Clean up pending order
    pendingOrders.delete(order_id);

    console.log(`✅ Shopify order #${shopifyOrder.order_number} created for ${order.customer_name}`);
    res.sendStatus(200);

  } catch (err) {
    console.error("❌ Midtrans notify error:", err.response?.data || err.message);
    res.sendStatus(500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ══════════════════════════════════════════════════════════════════════════════
app.get("/", (req, res) => {
  res.json({
    status:         "✅ Indi v3 is live",
    version:        "3.0.0",
    shopify:        SHOPIFY_STORE        || "❌ not set",
    kiriminaja:     KIRIMINAJA_API_KEY   ? "✅ connected" : "❌ not set",
    midtrans:       MIDTRANS_SERVER_KEY  ? `✅ ${MIDTRANS_ENV}` : "❌ not set",
    conversations:  conversations.size,
    pendingOrders:  pendingOrders.size,
    timestamp:      new Date().toISOString(),
  });
});

app.listen(PORT, () => console.log(`🚀 Indi v3 running on port ${PORT}`));
