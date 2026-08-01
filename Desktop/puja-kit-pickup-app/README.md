# 🪔 Divine Puja Kits - Store Pickup Web App

A lightweight, mobile-first web application designed for selling single-type Puja Kits with direct store pickup. Includes automatic top 5 nearest store calculations, free address autocomplete, live Google Sheets synchronization, and a hidden admin dashboard with one-click Excel CSV export.

---

## 🌟 Key Features

1. **Mobile-First UX**: Built for smartphone screens with large touch buttons, numerical keypads, and smooth animations.
2. **Nearest Store Engine**:
   - Calculates distance in kilometers between customer address and store coordinates using the Haversine algorithm.
   - Automatically renders the **Top 5 Nearest Stores**.
3. **Free Address Autocomplete & Geolocation**:
   - **📍 Use My Location**: Standard browser Geolocation API with reverse geocoding.
   - **OpenStreetMap Photon Autocomplete**: Free real-time address suggestions while typing (no API key required).
4. **Instant Store Contact & Navigation**:
   - **📞 Call Store**: Tapping opens phone dialer (`tel:` link).
   - **📋 Copy Number**: Dedicated one-tap copy button with "Copied!" toast feedback.
   - **🗺️ Get Directions**: Directly opens Google Maps navigation to the selected store.
5. **Live Admin Sheet Sync & Excel Export**:
   - **Google Sheets Webhook**: Integrates with a free Google Apps Script to log incoming requests directly to a single spreadsheet.
   - **Hidden Admin Panel**: Access via the top-right 🔒 icon (Passcode: `admin123`).
   - **📥 Download Excel (.CSV)**: Instant download of all orders for offline Excel management.

---

## 🚀 How to Run Locally

You can run this website using any standard local HTTP server or simple browser opening:

```bash
# Option 1: Using npx http-server
npx http-server ./

# Option 2: Using Python built-in server
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

---

## ☁️ How to Deploy for Free on Vercel

### Method 1: Using Vercel CLI (Recommended)

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```
2. Run deployment inside the project folder:
   ```bash
   vercel
   ```
3. Follow the prompts. Your site will be live instantly with a free HTTPS URL!

### Method 2: Deploy via GitHub + Vercel Dashboard

1. Push this project repository to your GitHub account.
2. Go to [vercel.com](https://vercel.com) -> Click **Add New Project**.
3. Import your GitHub repository and click **Deploy**.

---

## 📊 Setting Up Free Google Sheets Integration

1. Create a new Google Sheet on [Google Sheets](https://sheets.google.com).
2. Set Row 1 column headers:
   `Order ID` | `Timestamp` | `Name` | `Mobile` | `Kits Count` | `Customer Address` | `Assigned Store`
3. Click **Extensions > Apps Script** in Google Sheets menu.
4. Copy the code from [`google_script_template.js`](file:///Users/jayanth/.gemini/antigravity/scratch/puja-kit-pickup-app/google_script_template.js) and paste it into the editor.
5. Click **Deploy > New Deployment**:
   - Select **Web app**.
   - Execute as: **Me**.
   - Who has access: **Anyone**.
6. Copy the generated Web App URL.
7. Click the 🔒 Lock icon on your website (Passcode: `admin123`) -> Paste the URL into the **Google Sheets Webhook URL** field and click **Save URL**.

Every order placed by customers will now instantly appear in your Google Sheet!



Location API token 
https://my.locationiq.com/dashboard#accesstoken