import { getDrive } from '../sheet/googleSheetClient.js';
import { Readable } from 'node:stream';

export async function saveTransferScreenshot(orderNo, messageId) {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) throw new Error('GOOGLE_DRIVE_FOLDER_ID is not configured');
  const response = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
    headers: { Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}` }
  });
  if (!response.ok) throw new Error(`LINE image download failed: ${response.status}`);
  const mimeType = response.headers.get('content-type') || 'image/jpeg';
  const extension = mimeType.includes('png') ? 'png' : 'jpg';
  const buffer = Buffer.from(await response.arrayBuffer());
  const file = await getDrive().files.create({
    requestBody: { name: `${orderNo}-匯款截圖.${extension}`, parents: [folderId] },
    media: { mimeType, body: Readable.from(buffer) },
    fields: 'id,webViewLink'
  });
  return file.data.webViewLink || `https://drive.google.com/open?id=${file.data.id}`;
}
