import 'dotenv/config';
import { ensureSheets, replaceRows } from '../sheet/sheetService.js';

const SOURCE_URL = 'https://data.gcis.nat.gov.tw/od/file?oid=C054F05C-0A6B-428C-B388-288BDB0618E4';

function parseCsv(text) {
  const rows = []; let row = []; let value = ''; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(value); value = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(value); if (row.some((cell) => cell !== '')) rows.push(row); row = []; value = '';
    } else value += char;
  }
  row.push(value); if (row.some((cell) => cell !== '')) rows.push(row);
  return rows;
}

const response = await fetch(SOURCE_URL);
if (!response.ok) throw new Error(`門市資料下載失敗：${response.status}`);
const rows = parseCsv((await response.text()).replace(/^\uFEFF/, ''));
const stores = rows.slice(1).map((row) => {
  const company = row[1] || '';
  const brand = company.includes('統一超商') ? '7-ELEVEN' : company.includes('全家') ? '全家' : '';
  const status = row[5] === '01' ? '營業中' : '非營業';
  return brand ? [brand, row[3] || '', row[4] || '', status, row[7] || ''] : null;
}).filter(Boolean);

await ensureSheets();
await replaceRows('ConvenienceStores', stores);
console.log(`已匯入 ${stores.length} 筆 7-ELEVEN／全家門市資料。`);
