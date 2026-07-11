import fs from 'node:fs';
import path from 'node:path';
import { createRichMenu, setDefaultRichMenu, uploadRichMenuImage } from '../line/client.js';

const imagePath = process.argv[2] || 'assets/rich-menu.png';
if (!fs.existsSync(imagePath)) throw new Error(`找不到 Rich Menu 圖片：${imagePath}`);
const richMenu = JSON.parse(fs.readFileSync(path.resolve('rich-menu.json'), 'utf8'));
const richMenuId = await createRichMenu(richMenu);
await uploadRichMenuImage(richMenuId, 'image/png', fs.createReadStream(imagePath));
await setDefaultRichMenu(richMenuId);
console.log(`Rich Menu 已建立並設為預設：${richMenuId}`);
