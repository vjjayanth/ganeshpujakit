#  Ganesh Puja Kits - Complete Setup, Credentials & Deployment Guide

This document contains full operational documentation, API keys, credentials, Google Sheets integration steps, and Vercel deployment instructions for the **Ganesh Puja Kits Store Pickup Service App** (by **Badyatha Foundation**).

---

## 🛠️ 1. Technology Stack & File Architecture

* **Frontend**: Vanilla HTML5, Vanilla CSS3, Modern JavaScript (ES6+).
* **Asset Optimization**: `poster.webp` (Poster image converted using ChatGPT for a 91% size reduction from 2.1 MB to 193 KB).
* **Hosting**: Vercel Free Hobby Tier (Static Site).

### Key Files in Repository:
* [`index.html`](file:///Users/jayanth/Desktop/puja-kit-pickup-app/index.html) — Core Single Page Application structure with 3 independent views (`Book Your Order`, `Find Nearest Stores`, `Browse All Locations`).
* [`styles.css`](file:///Users/jayanth/Desktop/puja-kit-pickup-app/styles.css) — Custom responsive CSS theme, glassmorphism modals, and smooth animations.
* [`app.js`](file:///Users/jayanth/Desktop/puja-kit-pickup-app/app.js) — Application logic, distance calculation engine (Haversine formula), LocationIQ/Photon geocoding integration, and Google Sheets webhook dispatch.
* [`stores_data.js`](file:///Users/jayanth/Desktop/puja-kit-pickup-app/stores_data.js) — Database of 88 verified stores across Telangana, Andhra Pradesh, Karnataka & Maharashtra.
* [`google_script_template.js`](file:///Users/jayanth/Desktop/puja-kit-pickup-app/google_script_template.js) — Google Apps Script backend code for logging live orders into Google Sheets.
* [`process_stores.py`](file:///Users/jayanth/Desktop/puja-kit-pickup-app/process_stores.py) — Python automation script used to geocode and parse store locations into `stores_data.js`.

---

## 🔑 2. API Keys & External Credentials

### A. LocationIQ API (Reverse Geocoding & Address Search)
* **Access Token**: `pk.ba5c48f0ad8a8c94b22e161877b201ca`
* **Location in Code**: [`app.js:L31`](file:///Users/jayanth/Desktop/puja-kit-pickup-app/app.js#L31) (`const LOCATIONIQ_TOKEN = "..."`)
* **Usage**:
  * Reverse geocodes GPS coordinates into human-readable Indian addresses.
  * Autocompletes typed locality and area names when searching for nearest pickup centers.
* **Fallback APIs**: If LocationIQ limit is reached, the app automatically falls back to **OpenStreetMap Photon** (`https://photon.komoot.io/api/`) and **Nominatim** (`https://nominatim.openstreetmap.org/reverse`) with zero downtime.

### B. Admin Dashboard Passcode
* **Passcode**: `Badyatha@2026`
* **Location in Code**: [`app.js:L1040`](file:///Users/jayanth/Desktop/puja-kit-pickup-app/app.js#L1040)
* **How to Access**: Click the top-right 🔒 **Lock Icon** in the web app header.
* **Features**:
  * View local browser orders table.
  * Export orders to Excel/CSV (`Puja_Orders_YYYY-MM-DD.csv`).
  * Update or test Google Sheets Webhook URL.
  * Features eye icon toggle (`👁️`/`🙈`) to reveal/hide typed passcode.

---

## 📊 3. Google Sheets Live Webhook Setup

The app logs all customer bookings directly into a Google Sheet in real-time.

### Hardcoded Google Webhook URL:
```javascript
https://script.google.com/macros/s/AKfycbyZcR8RClyRo_jpeCEPqk6W9wiFHtroy1nHuAtPL_eW-QRYa-8v4T4HqIBUA3b69kI/exec
```
* **Location in Code**: [`app.js:L28`](file:///Users/jayanth/Desktop/puja-kit-pickup-app/app.js#L28) (`const DEFAULT_WEBHOOK_URL = "..."`)

### Step-by-Step Instructions to Create/Deploy a Google Sheet Backend:
1. Open [Google Sheets](https://sheets.google.com) and create a new spreadsheet named **`Ganesh Puja Kits Orders 2026`**.
2. Set Row 1 Column Headers:
   * **A1**: `Order ID`
   * **B1**: `Timestamp`
   * **C1**: `Name`
   * **D1**: `Mobile`
   * **E1**: `Kits Count`
   * **F1**: `Customer Address`
3. Click menu **Extensions** > **Apps Script**.
4. Paste the script content from [`google_script_template.js`](file:///Users/jayanth/Desktop/puja-kit-pickup-app/google_script_template.js):
```javascript
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);

    // Auto-generate 4-digit sequential Order ID: PK-0001, PK-0002, PK-0003...
    var lastRow = sheet.getLastRow();
    var nextSeq = Math.max(1, lastRow); // Row 1 is header, so Row 2 becomes PK-0001
    var orderId = "PK-" + ("0000" + nextSeq).slice(-4);

    sheet.appendRow([
      orderId,
      data.timestamp || new Date().toLocaleString(),
      data.name || "",
      "'" + (data.mobile || ""),
      data.kits || 1,
      data.address || ""
    ]);

    return ContentService.createTextOutput(JSON.stringify({ status: "success", orderId: orderId }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```
5. Click **Deploy** > **New deployment**.
6. Set **Execute as**: `Me`, **Who has access**: `Anyone`.
7. Click **Deploy**, authorize permissions, and copy the generated Web App URL.

---

## 🚀 4. Vercel Free Hosting Deployment Guide

### Option A: Deploy via GitHub (Recommended)
1. Push the local repository to GitHub:
   ```bash
   git add .
   git commit -m "Deploy Ganesh Puja Kits app"
   git push origin main
   ```
2. Log in to [Vercel](https://vercel.com) using your GitHub account.
3. Click **Add New Project** -> Select `vjjayanth/ganeshpujakit`.
4. Keep default settings (Preset: **Other / Static HTML**).
5. Click **Deploy**. Your app will be live on `https://ganeshpujakit.vercel.app` (with automatic SSL HTTPS security)!

### Option B: Deploy via Vercel CLI
```bash
npm install -g vercel
vercel login
vercel --prod
```

---

## 📱 5. Essential Mobile & Browser Behaviors

1. **HTTPS Security Requirement**:
   * Mobile browsers (Safari on iOS & Chrome on Android) strictly require an **HTTPS connection** for HTML5 Geolocation (`navigator.geolocation`).
   * When deployed on Vercel (`https://...`), mobile location detection will function automatically with 100% precision.
2. **Order ID Sequential Counter**:
   * Order IDs (`PK-0001`, `PK-0002`, `PK-0003`...) are automatically assigned in Column A when orders land in Google Sheets.
3. **Flexible Store Pickup**:
   * Customers do not need to assign a fixed store upfront; they can collect their reserved kits at any nearby verified center.

---

*Documentation maintained for Badyatha Foundation.*
