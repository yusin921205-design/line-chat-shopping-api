import { replyMessage } from '../line/client.js';
import { ensureSheets } from '../sheet/sheetService.js';
import { addItem, changeQuantity, clearCart, getCart, removeItem } from '../services/cartService.js';
import { getProduct, listProducts } from '../services/productService.js';
import { createOrder } from '../services/orderService.js';
import { beginCustomerDetails, clearCheckout, getCheckout, setCustomerName, setCustomerPhone, setDeliveryDetail, setPayment, setShipping } from '../services/sessionService.js';
import { submitTransferReport } from '../services/paymentReportService.js';
import { cartMessage, editMessage, paymentMessage, productList, shippingMessage } from '../flex/messages.js';

const shippingLabels = { seven: '7-ELEVEN 超商取貨（免運）', family: '全家超商取貨（免運）', post_office: '郵局寄送（免運）', meetup: '面交（免運）' };
const paymentLabels = { transfer: '銀行轉帳' };
const deliveryPrompts = {
  seven: '請輸入 7-ELEVEN 取貨門市名稱。',
  family: '請輸入全家取貨門市名稱。',
  post_office: '請輸入郵局寄送地址（含郵遞區號）。',
  meetup: '請輸入面交地點與方便約定的時間。'
};

export async function handleWebhook(req, res, next) {
  res.sendStatus(200); // Acknowledge LINE promptly; replies run independently.
  try { await Promise.all(req.lineEvents.map(handleEvent)); } catch (error) { console.error('Webhook handling failed:', error); }
}
async function handleEvent(event) {
  if (!event.replyToken || !event.source?.userId) return;
  try {
    const userId = event.source.userId;
    await ensureSheets();
    if (event.type === 'message' && event.message.type === 'text') {
      const text = event.message.text.trim().toLowerCase();
      const transferReport = text.match(/^匯款\s+(l\d{8}-[a-z0-9]+)\s+(\d{5})$/i);
      if (transferReport) {
        const [, orderNo, last5] = transferReport;
        await submitTransferReport(userId, orderNo.toUpperCase(), last5);
        return reply(event, { type: 'text', text: '已收到您的匯款資料，我們會盡快核對款項；確認後將於 1–3 天內安排出貨，出貨後會再通知您。' });
      }
      const checkout = getCheckout(userId);
      if (checkout.step === 'name') {
        setCustomerName(userId, event.message.text.trim());
        return reply(event, { type: 'text', text: '請輸入收件人手機號碼（例如：0912345678）。' });
      }
      if (checkout.step === 'phone') {
        const phone = event.message.text.replace(/\D/g, '');
        if (!/^09\d{8}$/.test(phone)) return reply(event, { type: 'text', text: '手機號碼格式不正確，請輸入 10 碼手機號碼，例如：0912345678。' });
        setCustomerPhone(userId, phone);
        return reply(event, { type: 'text', text: deliveryPrompts[checkout.shipping] || '請輸入收件資訊。' });
      }
      if (checkout.step === 'delivery') {
        setDeliveryDetail(userId, event.message.text.trim());
        return reply(event, cartMessage(await getCart(userId), { canCheckout: true }));
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
    case 'payment': setPayment(userId, type); beginCustomerDetails(userId); return { type: 'text', text: '請輸入收件人姓名。' };
    case 'checkout': {
      const choices = getCheckout(userId);
      if (!choices.shipping) return shippingMessage();
      if (!choices.payment) return paymentMessage();
      if (!choices.name) return { type: 'text', text: '請輸入收件人姓名。' };
      if (!choices.phone) return { type: 'text', text: '請輸入收件人手機號碼。' };
      if (!choices.deliveryDetail) return { type: 'text', text: deliveryPrompts[choices.shipping] || '請輸入收件資訊。' };
      const order = await createOrder(userId);
      const transferInstructions = (process.env.BANK_TRANSFER_INSTRUCTIONS || '請聯絡我們取得銀行轉帳資訊。').replaceAll('\\n', '\n');
      return { type: 'text', text: `訂單已建立！\n訂單編號：${order.orderNo}\n訂單金額：NT$${order.total.toLocaleString('zh-TW')}\n物流：${shippingLabels[choices.shipping] || choices.shipping}\n付款：${paymentLabels[choices.payment] || choices.payment}\n付款狀態：待付款\n\n${transferInstructions}\n\n轉帳後請回覆：\n匯款 ${order.orderNo} 12345\n（將 12345 改為您的帳戶末五碼）` };
    }
    default: throw new Error('未知操作');
  }
}
async function reply(event, message) {
  try { await replyMessage(event.replyToken, [message]); }
  catch (error) { console.error('LINE reply failed:', error.message); }
}
