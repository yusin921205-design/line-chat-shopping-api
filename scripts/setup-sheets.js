import 'dotenv/config';
import { ensureSheets } from '../sheet/sheetService.js';

await ensureSheets();
console.log('Google Sheet 已初始化：Products、Cart、Orders。');
