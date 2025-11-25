# Stock Out App - Comprehensive Report

## Overview

The **Stock Out App** is a Google Apps Script web application designed to manage inventory outflow by scanning QR codes on products and tracking stock movements. It integrates with Google Sheets for data storage and Google Drive for image storage, providing a mobile-friendly interface for warehouse operations.

## Core Features

### 1. QR Code Scanning & Validation
- **Real-time QR scanning** using the html5-qrcode library
- **Duplicate detection** to prevent scanning the same item twice
- **Order-specific validation** that ensures scanned items match the selected order
- **Quantity tracking** to prevent over-scanning items beyond order requirements

### 2. Order Management
- **Pending order display** shows all orders with "PENDING" status as interactive cards
- **Order selection** allows users to choose which order to fulfill
- **Custom order mode** for handling orders not in the system
- **Auto-status updates** marks orders as "COMPLETED" when all items are scanned

### 3. Data Recording & Image Upload
- **Aggregated data storage** groups scanned items by Design and Lot number
- **Image capture** allows taking photos as proof of shipment
- **Google Drive integration** stores images with organized naming
- **Dual sheet system** maintains both raw JSON data and formatted records

### 4. Mobile-Optimized Interface
- **Card-based order selection** with horizontal scrolling
- **Live scanning feedback** displays scanned items in real-time
- **Progress table** shows aggregated quantities per Design/Lot
- **Loading overlays** provide feedback during upload operations

## Technical Architecture

### Backend ([Code.gs](appscript-apps/stockOutApp/Code.gs))

#### Data Sources
- **Google Spreadsheet**: `1sRBEyozhaPwoUr6uP4aLw-X9yPMuFIimlaXhIrSPA_0`
  - `Stock JSON` sheet: Stores raw scanned data as JSON
  - `Stock` sheet: Stores formatted, denormalized stock records
  - `Order JSON` sheet: Contains order master data
  - `Order` sheet: Contains order line items
- **Google Drive Folder**: `1qvlgDR0OaFqdq-cUQHPhajOqZqfJdzgY` for images
- **Script Properties**: Temporary storage for session data

#### Key Functions

**Order Processing**
- `getPendingOrders()` (151-166): Filters Order JSON sheet for PENDING status orders
- `addOrderData(orderJSON, orderID, manual)` (250-268): Stores selected order in session properties
- `updateOrderStatus(orderId, link)` (111-149): Updates both Order JSON and Order sheets to COMPLETED status

**QR Code Processing**
- `processQRCode2(qrCodeText)` (191-248): Main QR validation logic
  - Parses QR code JSON data
  - Checks if item belongs to selected order (Design + Lot match)
  - Validates quantity hasn't been exceeded
  - Prevents duplicate scanning by Unique Identifier
  - Stores validated scans in Script Properties

**Data Aggregation**
- `getScannedData()` (270-288): Aggregates scanned items
  - Groups by Design and Lot
  - Counts quantity
  - Collects all Unique Identifiers
  - Returns consolidated array for display and storage

**Final Submission**
- `tableAndFile(exp, file)` (49-109): Processes complete submission
  - Uploads image to Google Drive with timestamp
  - Writes aggregated data to Stock sheet
  - Writes raw JSON to Stock JSON sheet
  - Updates order status if not custom order
  - Returns image URL for confirmation

**Utility Functions**
- `doGet()` (33-38): Entry point that initializes the web app
- `getDate()` (25-31): Returns formatted dates in Asia/Calcutta timezone
- `clearScannedData()` (290-292): Clears session storage
- `include(filename)` (297-299): Templating function for HTML includes

### Frontend Components

#### 1. [index.html](appscript-apps/stockOutApp/index.html) - Main Structure
- Container for order cards (`cards-section`)
- QR scanner container (`qr-container`, initially hidden)
- Table display for scanned items
- Includes all component templates

#### 2. [cards.html](appscript-apps/stockOutApp/cards.html) - Order Selection
**Rendering Logic**
- `renderCards([data, index])` (8-32): Creates order cards
  - First card is always "Custom Order" option
  - Subsequent cards show order details (Express #, Customer, Items)
  - Each card has a "Process Order" button

**Order Selection**
- `processOrder(button, isCustomOrder)` (34-75): Handles order selection
  - Hides unselected cards, highlights selected card
  - Shows QR scanner interface
  - Calls `addOrderData()` to store order in session
  - Auto-fills and disables invoice number field for regular orders

#### 3. [scanner.html](appscript-apps/stockOutApp/scanner.html) - QR Scanning
**Scanner Configuration**
- Uses Html5QrcodeScanner with 10 FPS and 250px qr-box
- `onScanSuccess(decodedText, decodedResult)` (26-47): Scan handler
  - Prevents duplicate consecutive scans
  - Calls `processQRCode2()` for validation
  - Updates table on success
  - Shows alerts for errors/duplicates

#### 4. [table.html](appscript-apps/stockOutApp/table.html) - Data Entry Form
**Components**
- Editable table displaying Design, Lot, Qty (populated by scanner)
- Invoice number input field
- Image capture input (camera or gallery)
- Image preview section
- Submit and Clear buttons

#### 5. [js.html](appscript-apps/stockOutApp/js.html) - Core Logic
**Table Updates**
- `updateTable()` (40-61): Fetches and displays aggregated scan data
  - Calls `getScannedData()` from backend
  - Populates table with Design, Lot, Qty

**Image Handling**
- Camera input listener (114-131):
  - Converts captured image to base64
  - Shows preview
  - Stores for submission

**Submission Flow**
- `handleTableClick(button)` (76-102): Validates and submits
  - Checks invoice number exists
  - Checks image exists
  - Shows loading lightbox
  - Calls `tableAndFile()` with invoice and image
  - Resets form on completion

**UI Feedback**
- `showLightbox()`: "Uploading..." message during submission
- `showSuccessLightbox()`: "Stock Entry Received!" confirmation
- Loading process takes approximately 15 seconds

**Data Management**
- `clearData()` (104-111): Post-submission cleanup
  - Hides loading, shows success message
  - Calls `clearScannedData()` on backend
  - Refreshes table display

#### 6. [style.html](appscript-apps/stockOutApp/style.html) - Responsive Design
**Key Styles**
- Root font size: 40px for mobile readability
- Responsive card layout with horizontal scrolling
- Table styling with borders and padding
- Modal lightboxes for loading/success states
  - Loading: Red background (`#ff8b94`)
  - Success: Green background (`#a8e6cf`)

## Data Flow

### 1. Order Selection Flow
```
User opens app → doGet() clears session
↓
getPendingOrders() fetches PENDING orders
↓
renderCards() displays order cards
↓
User clicks "Process Order"
↓
processOrder() stores order in Script Properties
↓
QR scanner becomes visible
```

### 2. Scanning Flow
```
QR code scanned → onScanSuccess() parses JSON
↓
processQRCode2() validates:
  - Item belongs to selected order?
  - Quantity not exceeded?
  - Not a duplicate?
↓
If valid: Store in Script Properties
↓
updateTable() fetches and displays aggregated data
↓
Repeat until all items scanned
```

### 3. Submission Flow
```
User captures image → Preview shown
↓
User enters invoice number (auto-filled if order selected)
↓
User clicks Submit → handleTableClick() validates
↓
tableAndFile() executes:
  1. Upload image to Drive
  2. Write to Stock JSON sheet
  3. Write to Stock sheet (multiple rows)
  4. Update Order status to COMPLETED
↓
Success lightbox shown → User refreshes for new entry
```

## Data Schema

### QR Code JSON Format
```json
{
  "Design": "SKU-123",
  "Lot": "LOT-456",
  "Unique Identifier": "UID-789"
}
```

### Order JSON Format
```json
{
  "express": 45,
  "customerName": "John Doe",
  "orderDetails": [
    {"Design": "SKU-123", "Qty": 5, "Lot": "LOT-456"}
  ]
}
```

### Stock Sheet Columns
| Column | Description |
|--------|-------------|
| DATE | Date in "MMMM dd, yyyy" format |
| EXPRESS | Invoice/Order number |
| STATUS | "COMPLETED" or "CUSTOM" |
| DESIGN | Product design/SKU |
| QTY | Quantity in this entry |
| LOT | Lot number |
| LINK | Google Drive image URL |
| UID | JSON array of Unique Identifiers |
| JSON | Complete scan session data |
| TIMESTAMP | Full timestamp with time |

### Stock JSON Sheet Columns
| Column | Description |
|--------|-------------|
| DATE | Date in "MMMM dd, yyyy" format |
| EXPRESS | Invoice/Order number |
| STATUS | "COMPLETED" or "CUSTOM" |
| LINK | Google Drive image URL |
| JSON | Raw array of all scanned items |
| TIMESTAMP | Full timestamp with time |

## User Workflows

### Standard Order Fulfillment
1. Open app on mobile device
2. View pending orders displayed as cards
3. Select the order to fulfill
4. Invoice field auto-fills and locks
5. Scan QR codes on products
6. View real-time table updates
7. Capture image of packed order
8. Submit
9. Wait for success confirmation (15s)
10. Refresh page for next order

### Custom Order Processing
1. Open app
2. Click "Custom Order" card
3. Invoice field remains editable
4. Scan QR codes (no order validation)
5. Manually enter invoice number
6. Capture image
7. Submit
8. Wait for confirmation
9. Refresh for next entry

## Key Design Decisions

### Session Management
- **Script Properties** used for temporary storage instead of client-side storage
- Ensures data persists during scanner lifecycle
- `clearScannedData()` called on app initialization to prevent stale data

### Validation Strategy
- **Two-tier validation**: Basic duplicate check + order-specific quantity check
- `processQRCode2()` replaced simpler `processQRCode()` to add order validation
- Manual mode (`manual=true`) bypasses order validation for flexibility

### Data Denormalization
- **Stock sheet** stores one row per Design/Lot combination (user-friendly)
- **Stock JSON sheet** stores one row per submission (audit trail)
- Trade-off: Storage space vs. query performance and readability

### Bulk Insert Optimization
- Uses `setValues()` instead of `appendRow()` loop (Code.gs:97-106)
- Reduces execution time from O(n) API calls to O(1)
- Critical for performance with large orders

### Image Storage
- **Base64 encoding** used for transmission from client to server
- **Google Drive** preferred over storing in Sheets for:
  - File size flexibility
  - Better organization
  - Direct URL sharing capability

## Limitations & Considerations

### Performance
- 15-second submission time due to:
  - Image upload to Drive
  - Multiple sheet writes
  - Order status updates
- No batch processing for multiple orders

### User Experience
- **Manual refresh required** after each submission
- No back/undo functionality once order selected
- **No edit capability** for scanned items (must restart)

### Data Integrity
- **No server-side locking** - concurrent submissions could conflict
- **Delete Property** on init means incomplete sessions are lost
- **No audit trail** for who performed the stock out

### Mobile Constraints
- Requires camera access for QR scanning
- Large root font size (40px) assumes specific device types
- **No offline mode** - requires internet throughout

### Security
- **Hardcoded IDs** for spreadsheet and folder in Code.gs
- **No authentication** beyond Google account required by Apps Script
- **No role-based access** - all users have same permissions

## Technology Stack

- **Backend**: Google Apps Script (JavaScript runtime)
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **QR Scanning**: html5-qrcode library v2.3.8
- **Data Storage**: Google Sheets
- **File Storage**: Google Drive
- **Hosting**: Google Apps Script Web App

## Potential Enhancements

1. **Real-time updates** using WebSockets or polling instead of manual refresh
2. **Edit/remove scanned items** before submission
3. **Batch order processing** to handle multiple orders in one session
4. **Offline mode** with sync when connection restored
5. **User authentication** and activity logging
6. **Barcode support** in addition to QR codes
7. **Export functionality** for stock out reports
8. **Search/filter** for historical stock out records
9. **Mobile app wrapper** (PWA or native) for better UX
10. **Configurable validation rules** without code changes

## Conclusion

The Stock Out App effectively digitizes the warehouse outflow process by combining QR code scanning with order management. Its mobile-first design makes it practical for warehouse staff, while the Google Sheets integration provides immediate data availability for inventory tracking. The dual-mode operation (order-based and custom) offers flexibility for various business scenarios, making it a versatile tool for inventory management.
