const SPREADSHEET_ID = "1sRBEyozhaPwoUr6uP4aLw-X9yPMuFIimlaXhIrSPA_0"; 
// Link: https://docs.google.com/spreadsheets/d/1sRBEyozhaPwoUr6uP4aLw-X9yPMuFIimlaXhIrSPA_0/edit?gid=0#gid=0
const IMG_FDR_ID = "1qvlgDR0OaFqdq-cUQHPhajOqZqfJdzgY";
// Link: https://drive.google.com/drive/folders/1qvlgDR0OaFqdq-cUQHPhajOqZqfJdzgY

const JSON_STOCK_SHEET = "Stock JSON";
const STOCK_SHEET = "Stock";
const JSON_ORDER_SHEET = "Order JSON";
const ORDER_SHEET = "Order";

const JSON_STOCK_HEADERS = ["DATE", "EXPRESS", "STATUS", "LINK", "JSON", "TIMESTAMP"];
const STOCK_HEADERS = ["DATE", "EXPRESS", "STATUS", "DESIGN", "QTY", "LOT", "LINK", "UID", "JSON", "TIMESTAMP"];

const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
const IMG_FDR = DriveApp.getFolderById(IMG_FDR_ID);
let jsonStockSheet = getSheet(JSON_STOCK_SHEET, JSON_STOCK_HEADERS);
let stockSheet = getSheet(STOCK_SHEET, STOCK_HEADERS);
let orderJsonSheet = ss.getSheetByName(JSON_ORDER_SHEET);
let orderSheet = ss.getSheetByName(ORDER_SHEET);

const PROPERTIES = PropertiesService.getScriptProperties(); // Get properties service
// const PROPERTIES = PropertiesService;
const SCANNED_DATA = 'SCANNED_CODES';

function getDate(){
  const date = new Date();
  // Adapted from https://developers.google.com/google-ads/scripts/docs/features/dates
  const date_month = Utilities.formatDate(date, 'Asia/Calcutta', 'MMMM dd, yyyy');
  const date_time = Utilities.formatDate(date, 'Asia/Calcutta', 'MMMM dd, yyyy - HH:mm');
  return [date, date_month, date_time];
}

function doGet() {
  clearScannedData();
  let template = HtmlService.createTemplateFromFile('index');
  let html = template.evaluate().setTitle('Stock Out Form');
  return html;
}

function getSheet(name, headers) {
  let sheet = ss.getSheetByName(name);
  if(!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
}

function tableAndFile(exp, file){
  function add(entry, link) { 
    stockSheet.appendRow([
      date_month, exp, status, entry.Design, entry.Qty, entry.Lot, link, JSON.stringify(entry.UIDs), JSON.stringify(scanD),date_time ]);
    Logger.log("Added entry to Sheet");
    return true;
  }

  function uploadImage(file, fileName) {
    const obj = {
      fileName : fileName,
      mimeType : file.split(",")[0].split(":")[1],
      data : file.split(",")[1]
    };
    const blob = Utilities.newBlob(Utilities.base64Decode(obj.data), obj.mimeType, obj.fileName);
    const imgFile = IMG_FDR.createFile(blob);
    const url = imgFile.getUrl();
    // const response = {'url' : url};
    return url;
  }

  // Other Constants
  const [date, date_month, date_time] = getDate();
  const fileName = date_month + ' - ' + exp.toString();
  Logger.log("Starting function execution...");
  const imageLink = uploadImage(file, fileName);
  Logger.log("Image Upload Complete");
  var status;

  const manual = PROPERTIES.getProperty('manual');
  if(manual === "false"){
    status = "COMPLETED";
    updateOrderStatus(exp, imageLink);
  }
  else{
    status = "CUSTOM";
  }
  
  Logger.log("Before JSON Data Addition");
  let scanD = getScannedData();
  jsonStockSheet.appendRow([ 
    date_month, exp, status, imageLink, JSON.stringify(scanD), date_time ]);
  Logger.log("JSON Data Added");
  
  // scanD.forEach(entry => add(entry, imageLink));
  // Logger.log("All forEach elements processed!");

  // Code for setting values. Courtesy: https://stackoverflow.com/questions/44695360/appending-multiple-rows-to-spreadsheet-google-apps-script
  let scanDArray = scanD.map(entry => [
    date_month, exp, status, entry.Design, entry.Qty, entry.Lot, imageLink, JSON.stringify(entry.UIDs), JSON.stringify(scanD),date_time ]);
  stockSheet.getRange(
    stockSheet.getLastRow() + 1,
    1,
    scanDArray.length,
    scanDArray[0].length
  )
  .setValues(scanDArray);
  Logger.log("Values have been set!");

  return imageLink;
}

function updateOrderStatus(orderId=45, link='ab'){
  // Find the row in the orderJsonSheet based on orderId
  const orderJsonSheetLastRow = orderJsonSheet.getLastRow();
  let orderJsonRow = 0;
  for (let i = 2; i <= orderJsonSheetLastRow; i++) {
    const orderNo = orderJsonSheet.getRange(i, 2).getValue(); // Assuming orderId is in column B
    if (orderNo === orderId) {
      orderJsonRow = i;
      break;
    }
  }

  // Find all rows in the orderSheet based on orderId
  const orderSheetLastRow = orderSheet.getLastRow();
  const orderSheetRows = [];
  for (let i = 2; i <= orderSheetLastRow; i++) {
    const orderExpress = orderSheet.getRange(i, 2).getValue(); // Assuming orderId is in column B
    if (orderExpress === orderId) {
      orderSheetRows.push(i); 
    }
  }
  
  // console.log("In Code.gs, orderSheetRows: ", orderSheetRows);
  // console.log("In Code.gs, orderJsonRow: ", orderJsonRow);

  // Update status in both sheets if rows were found
  if (orderJsonRow > 0 && orderSheetRows.length > 0) {
    // Assuming "STATUS" column is in column D
    orderJsonSheet.getRange(orderJsonRow, 4).setValue("COMPLETED");
    orderJsonSheet.getRange(orderJsonRow, 7).setValue(link); 

    // Update status in all matching rows in orderSheet
    for (const row of orderSheetRows) {
      orderSheet.getRange(row, 4).setValue("COMPLETED"); 
      orderSheet.getRange(row, 9).setValue(link); 
    }
    return true;
  }
}

function getPendingOrders(){
  // Code adapted from https://stackoverflow.com/questions/43522602/filter-data-by-column-k-in-google-script-editor-google-sheets
  let orderJsonSheet = ss.getSheetByName(JSON_ORDER_SHEET);
  var range = orderJsonSheet.getRange('A:E');
  var rawData = range.getValues();
  var data = [];
  var index = [];
  for (var i=0; i<rawData.length; i++){
    if(rawData[i][3] == "PENDING"){
      data.push(rawData[i][4]);
      index.push(i);
    }
  }
  console.log(data, index);
  return [data, index];
}

function processQRCode(qrCodeText) {
  try {
    const jsonData = JSON.parse(qrCodeText);
    // Get existing scanned codes or initialize an empty array
    let scannedQRCodes = JSON.parse(PROPERTIES.getProperty(SCANNED_DATA) || '[]');
    const isDuplicate = scannedQRCodes.some(existingCode => {
      return existingCode.Design === jsonData.Design && existingCode['Unique Identifier'] === jsonData['Unique Identifier'];
    });

    // If duplicate, return a message, Else store updated scanned codes
    if (isDuplicate) {
      return { success: false, message: "Duplicate QR code scanned." };
    }
    scannedQRCodes.push(jsonData);
    console.log("In processQRCode: ", scannedQRCodes);
    PROPERTIES.setProperty(SCANNED_DATA, JSON.stringify(scannedQRCodes));
    return { success: true, message: "QR code successfully processed." };
  } 
  catch (e) {
    return { success: false, error: "Error processing QR code: " + e.message };
  }
}

function processQRCode2(qrCodeText) {
  try {
    const jsonData = JSON.parse(qrCodeText);
    // console.log("In Code.gs, processQRCode2. Scanned JSON, jsonData: ", jsonData);
    // Check if the order item's required quantity is met
    let scannedQRCodes = JSON.parse(PROPERTIES.getProperty(SCANNED_DATA) || '[]');

    const manual = PROPERTIES.getProperty('manual');
    // console.log("In Code.gs, processQRCode2. manual: ", manual);
    if(manual === "false"){
      const pendingOrder = PROPERTIES.getProperty('selected-order');
      // console.log("In Code.gs, processQRCode2. pendingOrder: ", pendingOrder);
      const order = JSON.parse(pendingOrder);
      // console.log("In Code.gs, order: ", order);
      // Find the matching order item based on design and lot
      const orderItem = order.orderDetails.find(item => {
        return item.Design == jsonData.Design && item.Lot == jsonData.Lot;
      });
      // console.log("In Code.gs, processQRCode2, after comparing in line 185: orderItem -> ", orderItem);
      // Check if a matching order item was found
      if (!orderItem) {
        console.log("In Code.gs, processQRCode2 -> This QR code does not belong to the selected order.");
        return { success: false, message: "Invalid QR code for this order." };
      }
      const scannedCount = scannedQRCodes.filter(code => 
        code.Design === jsonData.Design && code.Lot === jsonData.Lot
      ).length;
      if (scannedCount >= orderItem.Qty) {
        console.log("In Code.gs, processQRCode2 -> The required quantity for this item has already been scanned.");
        return { success: false, message: "Quantity exceeded." };
      }
    }

    // Rest of the code (Check for duplicates, store updated scanned codes, etc.)
    const isDuplicate = scannedQRCodes.some(existingCode => {
      return existingCode.Design === jsonData.Design && 
             existingCode['Unique Identifier'] === jsonData['Unique Identifier'];
    });
    // If duplicate, return a message, Else store updated scanned codes
    if (isDuplicate) {
      return { success: false, message: "Duplicate QR code scanned." };
    }

    scannedQRCodes.push(jsonData);
    // console.log("In Code.gs, processQRCodes2, after pushing to scannedQRCodes: ", scannedQRCodes);
    PROPERTIES.setProperty(SCANNED_DATA, JSON.stringify(scannedQRCodes));
    // console.log("In Code.gs, processQRCode2, after setting Property: ");
    const data2 = PROPERTIES.getProperties();
    // for (const key in data2) {
    //   console.log('Line 174 | Key: %s, Value: %s', key, data2[key]);
    // }

    return { success: true, message: "QR code successfully processed." };
  } 
  catch (e) {
    return { success: false, error: "Error processing QR code: " + e.message };
  }
}

function addOrderData(orderJSON, orderID, manual=false){
  try{
    if (manual){
      console.log("In Code.gs, addOrderData with manual=true. ");
      PROPERTIES.setProperty('manual', true);
      return { success: true };
    }
    console.log("In Code.gs, addOrderData with manual=false. orderJSON: "+orderJSON);
    PROPERTIES.setProperty('manual', false);
    var order = JSON.parse(orderJSON);
    console.log("In Code.gs, addOrderData: ", order);
    PROPERTIES.setProperty('selected-order-id', orderID);
    PROPERTIES.setProperty('selected-order', orderJSON);
    return { success: true };
  }
  catch(e){
    return { success: false, error: "From addOrderData in Code.gs, Error: " + e };
  }
}

function getScannedData(){
  // Retrieve scanned codes from properties service
  let scannedQRCodes = JSON.parse(PROPERTIES.getProperty(SCANNED_DATA) || '[]');
  // console.log("In Code.gs, getScannedData. Value of scannedQRCodes: ", scannedQRCodes);

  const rolls = scannedQRCodes.reduce((acc, item) => {
    const existingEntry = acc.find(entry => entry.Design === item.Design && entry.Lot === item.Lot);
    if (existingEntry) {
      existingEntry.Qty++; // Increase quantity for existing SKU and Lot combination
      existingEntry.UIDs.push(item["Unique Identifier"]); // Add UID to existing entry
    } else {
      acc.push({ "Design": item.Design, "Lot": item.Lot, "Qty": 1, "UIDs": [item["Unique Identifier"]]}); // Add new entry with Qty 1
    }
    return acc;
  }, []);
  // console.log("In Code.gs, getScannedData. rolls: ", rolls)

  return rolls;
}

function clearScannedData(){
  PROPERTIES.deleteProperty(SCANNED_DATA);
}

/**
 * INCLUDE HTML PARTS, EG. JAVASCRIPT, CSS, OTHER HTML FILES
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}