# Order Management Application - Comprehensive Report

## Overview
The **orderApp** is a Google Apps Script web application designed to collect and manage order information through a user-friendly web interface. It stores order data in a Google Spreadsheet with dual storage formats (JSON and normalized).

---

## Core Features

### 1. **Order Data Collection**
The application provides a dynamic web form that captures:
- **Order Number**: Auto-generated sequential ID
- **Customer Name**: Text input
- **Order Line Items**: Table with multiple rows containing:
  - Design name
  - Quantity
  - Lot number

### 2. **Dynamic Row Management**
- Users can add unlimited order line items via an "Add Row" button
- Each row can be individually removed with a "Remove" button
- First row is pre-populated and visible on load

### 3. **Data Validation**
Before submission, the form validates:
- Order Number is not empty
- Customer Name is not empty
- All Design, Quantity, and Lot fields in each row are filled

### 4. **Visual Feedback**
- Submit button changes color (red when clicked, green when ready)
- Submit button is disabled during processing
- Success lightbox modal appears after successful submission
- Form automatically resets after successful submission

---

## Architecture & File Structure

### Files:
1. **[index.html](orderApp/index.html)** - Main UI and client-side logic
2. **[style.html](orderApp/style.html)** - CSS styling (loaded via templating)
3. **[Code.gs](orderApp/Code.gs)** - Server-side Google Apps Script backend

---

## Technical Implementation

### Frontend (index.html)

**Key Components:**
- **Form Fields** (lines 11-15): Order number and customer name inputs
- **Dynamic Table** (lines 17-40): Row template system for order items
- **Control Buttons** (lines 41-42): Add row and submit functionality
- **Success Modal** (lines 44-50): Lightbox confirmation dialog

**JavaScript Logic:**
- **Row Management** (lines 60-74): Clone template row and attach event listeners
- **Form Validation** (lines 82-118): Check all required fields before submission
- **Data Aggregation** (lines 120-134): Construct order object with nested orderDetails array
- **Server Communication** (line 137): `google.script.run` to call backend `submitOrder()`
- **Form Reset** (lines 140-161): Clear form and re-enable submit button
- **Auto-ID Generation** (lines 169-174): Fetch next order ID from backend

### Backend (Code.gs)

**Configuration:**
- Target Spreadsheet ID: `1sRBEyozhaPwoUr6uP4aLw-X9yPMuFIimlaXhIrSPA_0`
- Two sheet structure: "Order JSON" and "Order"
- Timezone: Asia/Calcutta

**Core Functions:**

1. **`doGet()`** (lines 22-26)
   - Serves the web app HTML
   - Entry point for the web application

2. **`getSheet(name, headers)`** (lines 28-35)
   - Creates sheet if it doesn't exist
   - Initializes with header row

3. **`submitOrder(orderInfoString)`** (lines 37-44)
   - Parses JSON order data
   - Writes to both sheets:
     - **JSON_ORDER_SHEET**: One row per order (full JSON preserved)
     - **ORDER_SHEET**: One row per line item (normalized)
   - Sets default status as "PENDING"

4. **`getOrderId()`** (lines 46-58)
   - Retrieves last order number from column B
   - Returns incremented value for next order

5. **`include(filename)`** (lines 63-65)
   - Template system to inject CSS/HTML files

### Styling (style.html)

**Design Characteristics:**
- Large base font size (32px) for mobile/tablet readability
- Responsive input fields with padding
- Green buttons for positive actions, red for removal
- Modal lightbox overlay with centered content
- Clean table layout with borders and spacing

---

## Data Flow

```
1. User loads web app → doGet() serves index.html
2. Page loads → getOrderId() fetches next order number
3. User fills form → Client-side validation on submit
4. Valid submission → JSON sent to submitOrder()
5. Server processes → Writes to both Google Sheets
6. Success callback → showLightbox() displays confirmation
7. Form resets → Ready for next order
```

## Storage Schema

### JSON_ORDER_SHEET Columns:
| DATE | EXPRESS | CUSTOMER NAME | STATUS | JSON | TIMESTAMP | LINK |
|------|---------|---------------|--------|------|-----------|------|

### ORDER_SHEET Columns (Normalized):
| DATE | EXPRESS | CUSTOMER NAME | STATUS | DESIGN | QTY | LOT | TIMESTAMP | LINK |
|------|---------|---------------|--------|--------|-----|-----|-----------|------|

---

## Key Technical Details

- **Auto-incrementing IDs**: Order numbers increment from last value in column B of JSON sheet
- **Dual storage**: JSON format preserves full order structure; normalized format enables row-level analysis
- **Template row pattern**: Hidden template row (line 27 in index.html) cloned for new entries
- **Disabled state management**: Submit button disabled during submission to prevent duplicates
- **Date formatting**: Uses Asia/Calcutta timezone with two formats (date_month for display, date_time for timestamp)

---

## Use Case

This application is designed for businesses that need to:
- Collect multi-item orders through a web interface
- Track orders with sequential numbering
- Store orders in Google Sheets for easy access and reporting
- Provide a mobile-friendly form for field operations
- Maintain both structured (normalized) and raw (JSON) data formats