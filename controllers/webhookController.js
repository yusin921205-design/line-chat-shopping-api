import { replyMessage } from '../line/client.js';
import { ensureSheets } from '../sheet/sheetService.js';
import { addItem, changeQuantity, clearCart, getCart, removeItem } from '../services/cartService.js';
import { getProduct, listProducts } from '../services/productService.js';
import { createOrder } from '../services/orderService.js';
import { getCustomerOrders } from '../services/orderQueryService.js';
import { beginCustomerDetails, clearCheckout, clearPendingTransferScreenshot, getCheckout, retryDelivery, setCustomerDetails, setDeliveryCandidate, setDeliveryDetail, setPayment, setPendingTransferScreenshot, setShipping } from '../services/sessionService.js';
import { attachTransferScreenshot, submitTransferReport } from '../services/paymentReportService.js';
import { saveTransferScreenshot } from '../services/transferScreenshotService.js';
import { cartMessage, editMessage, paymentMessage, productList, shippingMessage } from '../flex/messages.js';

const shippingLabels = { seven: '7-ELEVEN 超商取貨（免運）', family: '全家超商取貨（免運）', post_office: '郵局寄送（免運）', meetup: '面交（免運）' };
const paymentLabels = { transfer: '銀行轉帳' };
const deliveryPrompts = {
  seven: '請輸入 7-ELEVEN 取貨門市名稱與縣市。',
  family: '請輸入全家取貨門市名稱與縣市。',
  post_office: '請輸入郵局寄送地址（含郵遞區號）。',
  meetup: '請輸入面交地點與方便約定的時間。'
};
const orderStatusLabels = {
  Pending: ['待付款', '尚未出貨'],
  '待核帳': ['核對款項中', '尚未出貨'],
  '已付款': ['已付款', '備貨中'],
  '已出貨': ['已付款', '已出貨']
};

const customerDetailsPrompt = '請一次輸入收件資料：\n1. 姓名：王小美\n2. 電話：0912345678';

function parseCustomerDetails(input) {
  const name = input.match(/(?:姓名|名字|收件人)\s*[：:]\s*([^\n\r]+)/)?.[1]?.trim();
  const phone = input.match(/(?:電話|手機)\s*[：:]\s*(09\d{8})/)?.[1];
  return { name, phone };
}

function formatDate(value, empty = '尚未出貨') {
  if (!value) return empty;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false });
}

function orderSummary(order) {
  const [paymentStatus, shippingStatus] = orderStatusLabels[order.Status] || [order.Status || '處理中', '處理中'];
  return `訂單編號：${order.OrderNo}\n訂購日期：${formatDate(order.CreatedAt, '—')}\n付款狀態：${paymentStatus}\n出貨狀態：${shippingStatus}\n出貨日期：${formatDate(order.ShippedAt)}\n金額：NT$${Number(order.Total || 0).toLocaleString('zh-TW')}`;
}

export async function handleWebhook(req, res, next) {
  res.sendStatus(200); // Acknowledge LINE promptly; replies run independently.
  try { await Promise.all(req.lineEvents.map(handleEvent)); } catch (error) { console.error('Webhook handling failed:', error); }
}
async function handleEvent(event) {
  if (!event.replyToken || !event.source?.userId) return;
  try {
    const userId = event.source.userId;
    await ensureSheets();
    if (event.type === 'message' && event.message.type === 'image') {
      const checkout = getCheckout(userId);
      if (!checkout.transferScreenshotOrderNo) return reply(event, { type: 'text', text: '請先依訂單指示回覆匯款末五碼，再上傳匯款截圖。' });
      const screenshotUrl = await saveTransferScreenshot(checkout.transferScreenshotOrderNo, event.message.id);
      await attachTransferScreenshot(userId, checkout.transferScreenshotOrderNo, screenshotUrl);
      clearPendingTransferScreenshot(userId);
      return reply(event, { type: 'text', text: '已收到匯款截圖與末五碼資料，我們會盡快核對款項；確認後將於 1–3 天內安排出貨。' });
    }
    if (event.type === 'message' && event.message.type === 'text') {
      const text = event.message.text.trim().toLowerCase();
      const transferReport = text.match(/^匯款\s+(l\d{8}-[a-z0-9]+)\s+(\d{5})$/i);
      if (transferReport) {
        const [, orderNo, last5] = transferReport;
        await submitTransferReport(userId, orderNo.toUpperCase(), last5);
        setPendingTransferScreenshot(userId, orderNo.toUpperCase());
        return reply(event, { type: 'text', text: '已收到您的匯款末五碼資料。請再上傳一張匯款截圖，完成後我們會盡快核對款項。' });
      }
      const checkout = getCheckout(userId);
      if (checkout.step === 'customerDetails') {
        const { name, phone } = parseCustomerDetails(event.message.text);
        if (!name || !/^09\d{8}$/.test(phone || '')) return reply(event, { type: 'text', text: `資料格式不正確。\n\n${customerDetailsPrompt}` });
        setCustomerDetails(userId, name, phone);
        return reply(event, { type: 'text', text: deliveryPrompts[checkout.shipping] || '請輸入收件資訊。' });
      }
      if (checkout.step === 'delivery') {
        const input = event.message.text.trim();
        setDeliveryCandidate(userId, input);
        const title = ['seven', 'family'].includes(checkout.shipping) ? '請確認取貨門市' : '請確認收件資訊';
        return reply(event, { type: 'text', text: `${title}：\n${input}\n\n正確請回覆「確認」；若有誤請重新輸入。` });
      }
      if (checkout.step === 'deliveryConfirm') {
        if (['確認', 'confirm', '正確'].includes(text)) {
          setDeliveryDetail(userId, checkout.deliveryDetail);
          return reply(event, cartMessage(await getCart(userId), { canCheckout: true }));
        }
        retryDelivery(userId);
        return reply(event, { type: 'text', text: `${deliveryPrompts[checkout.shipping] || '請重新輸入收件資訊。'}\n請重新輸入。` });
      }
      if (['訂單查詢', '查詢訂單', 'orders'].includes(text)) {
        const orders = await getCustomerOrders(userId);
        if (!orders.length) return reply(event, { type: 'text', text: '目前找不到您的訂單。' });
        return reply(event, { type: 'text', text: `您的最近訂單：\n\n${orders.slice(0, 5).map(orderSummary).join('\n\n')}` });
      }
      if (['商品', '商品分類', 'products', '我要下單'].includes(text)) return reply(event, productList(await listProducts()));
      if (['購物車', 'cart'].includes(text)) {
        const checkout = getCheckout(userId);
        return reply(event, cartMessage(await getCart(userId), { canCheckout: Boolean(checkout.shipping && checkout.payment) }));
      }
      return reply(event, { type: 'text', text: '請使用下方圖文選單選購商品，或輸入「商品」／「購物車」。' });
    }
    if (event.type !== 'postback') return;
    const data = Object.fromEntries(new URLSearchParams(event.postback.data));
    return reply(event, await processAction(userId, data));
  } catch (error) {
    console.error('Event failed:', error);
    return reply(event, { type: 'text', text: `操作未完成：${error.message}` });
  }
}
async function processAction(userId, { action, id, type }) {
  switch (action) {
    case 'category': return productList(await listProducts());
    case 'add': await addItem(userId, id); clearCheckout(userId); return cartMessage(await getCart(userId));
    case 'cart': {
      const checkout = getCheckout(userId);
      return cartMessage(await getCart(userId), { canCheckout: Boolean(checkout.shipping && checkout.payment) });
    }
    case 'edit': { const item = (await getCart(userId)).items.find((x) => x.id === id); if (!item) throw new Error('購物車中沒有此商品'); return editMessage(item); }
    case 'plus': await changeQuantity(userId, id, 1); return cartMessage(await getCart(userId));
    case 'minus': await changeQuantity(userId, id, -1); return cartMessage(await getCart(userId));
    case 'delete': await removeItem(userId, id); return cartMessage(await getCart(userId));
    case 'clear': await clearCart(userId); clearCheckout(userId); return { type: 'text', text: '已清空購物車。' };
    case 'shipping-menu': return shippingMessage();
    case 'shipping': setShipping(userId, type); return paymentMessage();
    case 'payment': setPayment(userId, type); beginCustomerDetails(userId); return { type: 'text', text: customerDetailsPrompt };
    case 'checkout': {
      const choices = getCheckout(userId);
      if (!choices.shipping) return shippingMessage();
      if (!choices.payment) return paymentMessage();
      if (!choices.name || !choices.phone) return { type: 'text', text: customerDetailsPrompt };
      if (!choices.deliveryDetail) return { type: 'text', text: deliveryPrompts[choices.shipping] || '請輸入收件資訊。' };
      const order = await createOrder(userId);
      const transferInstructions = (process.env.BANK_TRANSFER_INSTRUCTIONS || '請聯絡我們取得銀行轉帳資訊。').replaceAll('\\n', '\n');
      return { type: 'text', text: `訂單已建立！\n訂單編號：${order.orderNo}\n訂單金額：NT$${order.total.toLocaleString('zh-TW')}\n物流：${shippingLabels[choices.shipping] || choices.shipping}\n付款：${paymentLabels[choices.payment] || choices.payment}\n付款狀態：待付款\n\n${transferInstructions}\n\n轉帳後請回覆：\n匯款 ${order.orderNo} 12345\n（將 12345 改為您的帳戶末五碼）\n\n匯款完成後，請截圖回傳。` };
    }
    default: throw new Error('未知操作');
  }
}
async function reply(event, message) {
  try { await replyMessage(event.replyToken, [message]); }
  catch (error) { console.error('LINE reply failed:', error.message); }
}
