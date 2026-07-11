import { google } from 'googleapis';

let sheets;
let drive;
function credentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  return raw ? JSON.parse(raw) : undefined;
}
export function getSheets() {
  if (sheets) return sheets;
  const serviceAccount = credentials();
  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    keyFile: serviceAccount ? undefined : process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  sheets = google.sheets({ version: 'v4', auth });
  return sheets;
}

export function getDrive() {
  if (drive) return drive;
  const serviceAccount = credentials();
  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    keyFile: serviceAccount ? undefined : process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/drive']
  });
  drive = google.drive({ version: 'v3', auth });
  return drive;
}

export function spreadsheetId() {
  if (!process.env.GOOGLE_SHEET_ID) throw new Error('GOOGLE_SHEET_ID is not configured');
  return process.env.GOOGLE_SHEET_ID;
}
