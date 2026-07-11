import { getSheets, spreadsheetId } from './googleSheetClient.js';

const HEADERS = {
  Products: ['ProductId', 'Name', 'Price', 'Image', 'Description', 'Stock', 'Category'],
  Cart: ['UserId', 'ProductId', 'Quantity'],
  Orders: ['OrderNo', 'UserId', 'Products(JSON)', 'Total', 'Shipping', 'Payment', 'Status', 'CreatedAt']
};

export async function ensureSheets() {
  const api = getSheets(); const id = spreadsheetId();
  const { data } = await api.spreadsheets.get({ spreadsheetId: id });
  const existing = new Set((data.sheets || []).map((s) => s.properties.title));
  const missing = Object.keys(HEADERS).filter((name) => !existing.has(name));
  if (missing.length) await api.spreadsheets.batchUpdate({ spreadsheetId: id, requestBody: { requests: missing.map((title) => ({ addSheet: { properties: { title } } })) } });
  for (const title of missing) await api.spreadsheets.values.update({ spreadsheetId: id, range: `${title}!A1`, valueInputOption: 'RAW', requestBody: { values: [HEADERS[title]] } });
}

export async function readRows(sheetName) {
  const { data } = await getSheets().spreadsheets.values.get({ spreadsheetId: spreadsheetId(), range: `${sheetName}!A:Z` });
  const [headers = [], ...rows] = data.values || [];
  return rows.filter((row) => row.some((value) => value !== '')).map((row, index) => ({
    ...Object.fromEntries(headers.map((key, col) => [key, row[col] ?? ''])),
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
