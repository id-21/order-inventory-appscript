const SPREADSHEET_ID = "1sRBEyozhaPwoUr6uP4aLw-X9yPMuFIimlaXhIrSPA_0"; 
// Link: https://docs.google.com/spreadsheets/d/1sRBEyozhaPwoUr6uP4aLw-X9yPMuFIimlaXhIrSPA_0/edit?gid=0#gid=0

const JSON_ORDER_SHEET = "Order JSON";
const ORDER_SHEET = "Order";

const JSON_ORDER_HEADERS = ["DATE", "EXPRESS", "CUSTOMER NAME", "STATUS", "JSON", "TIMESTAMP",  "LINK"];
const ORDER_HEADERS = ["DATE", "EXPRESS", "CUSTOMER NAME", "STATUS", "DESIGN", "QTY", "LOT", "TIMESTAMP", "LINK"];

const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
let jsonSheet = getSheet(JSON_ORDER_SHEET, JSON_ORDER_HEADERS);
let orderSheet = getSheet(ORDER_SHEET, ORDER_HEADERS);

function getDate(){
  const date = new Date();
  // Adapted from https://developers.google.com/google-ads/scripts/docs/features/dates
  const date_month = Utilities.formatDate(date, 'Asia/Calcutta', 'MMMM dd, yyyy');
  const date_time = Utilities.formatDate(date, 'Asia/Calcutta', 'MMMM dd, yyyy - HH:mm');
  return [date, date_month, date_time];
}

function doGet() {
  let template = HtmlService.createTemplateFromFile('index');
  let html = template.evaluate().setTitle('Order Form');
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

function submitOrder(orderInfoString) {
  const [date, date_month, date_time] = getDate();
  const orderInfo = JSON.parse(orderInfoString);
  jsonSheet.appendRow([date_month, orderInfo.express, orderInfo.customerName, "PENDING", orderInfoString, date_time]);
  orderInfo.orderDetails.forEach(item => {
      orderSheet.appendRow([date_month, orderInfo.express, orderInfo.customerName, "PENDING", item.Design, item.Qty, item.Lot, date_time]);
  });
}

function getOrderId(){
  const lastRow = jsonSheet.getLastRow();
  if (lastRow === 0){
    return null;
  }

  // Get the value in column B (index 2) of the last row.
  const lastValue = jsonSheet.getRange(lastRow, 2).getValue();

  return lastValue+1;

  // return 1;
}

/**
 * INCLUDE HTML PARTS, EG. JAVASCRIPT, CSS, OTHER HTML FILES
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}