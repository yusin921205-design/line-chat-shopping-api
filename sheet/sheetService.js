import { getSheets, spreadsheetId } from './googleSheetClient.js';

const HEADERS = {
  Products: ['ProductId｜商品編號', 'Name｜商品名稱', 'Price｜售價', 'Image｜圖片網址', 'Description｜商品說明', 'Stock｜庫存數量', 'Category｜商品分類'],
  Cart: ['UserId｜LINE使用者ID', 'ProductId｜商品編號', 'Quantity｜商品數量'],
  Orders: ['OrderNo｜訂單編號', 'UserId｜LINE使用者ID', 'Products(JSON)｜商品明細JSON', 'Total｜訂單總額', 'Shipping｜取貨方式', 'Payment｜付款方式', 'Status｜訂單狀態', 'CreatedAt｜訂購日期時間', 'ShippedAt｜出貨日期', 'ProductSummary｜訂購商品與數量', 'CustomerName｜客戶姓名', 'CustomerPhone｜客戶電話', 'DeliveryDetail｜取貨門市或收件資訊', 'TransferLast5｜匯款末五碼'],
  PaymentReports: ['OrderNo｜訂單編號', 'UserId｜LINE使用者ID', 'TransferLast5｜匯款末五碼', 'Status｜核帳狀態', 'ReportedAt｜回報日期時間'],
  CustomerDetails: ['OrderNo｜訂單編號', 'UserId｜LINE使用者ID', 'Name｜客戶姓名', 'Phone｜客戶電話', 'DeliveryDetail｜取貨門市或收件資訊', 'CreatedAt｜建立日期時間']
};

export async function ensureSheets() {
  const api = getSheets(); const id = spreadsheetId();
  const { data } = await api.spreadsheets.get({ spreadsheetId: id });
  const existing = new Set((data.sheets || []).map((s) => s.properties.title));
  const missing = Object.keys(HEADERS).filter((name) => !existing.has(name));
  if (missing.length) await api.spreadsheets.batchUpdate({ spreadsheetId: id, requestBody: { requests: missing.map((title) => ({ addSheet: { properties: { title } } })) } });
  for (const [title, headers] of Object.entries(HEADERS)) {
    const { data } = await api.spreadsheets.values.get({ spreadsheetId: id, range: `${title}!A1:Z1` });
    const currentHeaders = data.values?.[0] || [];
    if (currentHeaders.length !== headers.length || currentHeaders.some((value, index) => value !== headers[index])) {
      await api.spreadsheets.values.update({ spreadsheetId: id, range: `${title}!A1`, valueInputOption: 'RAW', requestBody: { values: [headers] } });
    }
  }
}

export async function readRows(sheetName) {
  const { data } = await getSheets().spreadsheets.values.get({ spreadsheetId: spreadsheetId(), range: `${sheetName}!A:Z` });
  const [headers = [], ...rows] = data.values || [];
  return rows.filter((row) => row.some((value) => value !== '')).map((row, index) => ({
    ...Object.fromEntries(headers.map((key, col) => [String(key).split('｜')[0].trim(), row[col] ?? ''])),
    _row: index + 2
  }));
}

export async function appendRow(sheetName, values) {
  await getSheets().spreadsheets.values.append({ spreadsheetId: spreadsheetId(), range: `${sheetName}!A:Z`, valueInputOption: 'USER_ENTERED', requestBody: { values: [values] } });
}

export async function updateRow(sheetName, row, values) {
  await getSheets().spreadsheets.values.update({ spreadsheetId: spreadsheetId(), range: `${sheetName}!A${row}`, valueInputOption: 'USER_ENTERED', requestBody: { values: [values] } });
}

export async function deleteRow(sheetName, row) {
  const meta = await getSheets().spreadsheets.get({ spreadsheetId: spreadsheetId() });
  const sheetId = meta.data.sheets.find((s) => s.properties.title === sheetName)?.properties.sheetId;
  if (sheetId === undefined) throw new Error(`Sheet not found: ${sheetName}`);
  await getSheets().spreadsheets.batchUpdate({ spreadsheetId: spreadsheetId(), requestBody: { requests: [{ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: row - 1, endIndex: row } } }] } });
}
