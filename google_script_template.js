/**
 * ==========================================================================
 * Google Apps Script Webhook Template for Ganesh Puja Kits Web App
 * ==========================================================================
 * 
 * INSTRUCTIONS TO SET UP LIVE GOOGLE SHEET INTEGRATION (100% Free):
 * 
 * 1. Open Google Sheets (https://sheets.google.com) and create a New Spreadsheet.
 * 2. In row 1, set these exact Column Headers:
 *    A1: Order ID | B1: Timestamp | C1: Name | D1: Mobile | E1: Kits Count | F1: Customer Address
 * 3. In the Google Sheet menu, click: Extensions > Apps Script.
 * 4. Replace any default code in Apps Script editor with the code below.
 * 5. Click "Save" (Ctrl+S or Cmd+S).
 * 6. Click "Deploy" > "New deployment".
 * 7. Choose type: "Web app".
 * 8. Set Configuration:
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"  <-- IMPORTANT so your website can send order data
 * 9. Click "Deploy", authorize permissions when prompted.
 * 10. Copy the Web App URL (starts with https://script.google.com/macros/s/...).
 * 11. Open your website -> Click top right 🔒 Lock icon (Passcode: Badyatha@2026) -> Paste URL into "Google Sheets Webhook URL" field and click Save!
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);

    // Auto-generate 4-digit sequential Order ID: PK-0001, PK-0002, PK-0003...
    var lastRow = sheet.getLastRow();
    var nextSeq = Math.max(1, lastRow); // Row 1 is header, so Row 2 becomes PK-0001
    var orderId = "PK-" + ("0000" + nextSeq).slice(-4);

    // Append new row with order data
    sheet.appendRow([
      orderId,
      data.timestamp || new Date().toLocaleString(),
      data.name || "",
      "'" + (data.mobile || ""), // Quote forces mobile number string formatting
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

function doGet(e) {
  return ContentService.createTextOutput("Ganesh Puja Kits Webhook Service is active!");
}
