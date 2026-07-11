import { replyMessage } from '../line/client.js';
import { ensureSheets } from '../sheet/sheetService.js';
import { addItem, changeQuantity, clearCart, getCart, removeItem } from '../services/cartService.js';
import { getProduct, listProducts } from '../services/productService.js';
import { createOrder } from '../services/orderService.js';
import { getCheckout, setPayment, setShipping } from '../services/sessionService.js';
import { cartMessage, editMessage, paymentMessage, productList, shippingMessage } from '../flex/messages.js';

const shippingLabels = { seven: '7-ELEVEN 超商取貨（免運）', family: '全家超商取貨（免運）', post_office: '郵局寄送（免運）', meetup: '面交（免運）' };
const paymentLabels = { line_pay: 'LINE Pay', apple_pay: 'Apple Pay／信用卡', transfer: '銀行轉帳' };

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
      if (['商品', '商品分類', 'products', '我要下單'].includes(text)) return reply(event, productList(await listProducts()));
      if (['購物車', 'cart'].includes(text)) return reply(event, cartMessage(await getCart(userId)));
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
    case 'add': await addItem(userId, id); return cartMessage(await getCart(userId));
    case 'cart': return cartMessage(await getCart(userId));
    case 'edit': { const item = (await getCart(userId)).items.find((x) => x.id === id); if (!item) throw new Error('購物車中沒有此商品'); return editMessage(item); }
    case 'plus': await changeQuantity(userId, id, 1); return cartMessage(await getCart(userId));
    case 'minus': await changeQuantity(userId, id, -1); return cartMessage(await getCart(userId));
    case 'delete': await removeItem(userId, id); return cartMessage(await getCart(userId));
    case 'clear': await clearCart(userId); return { type: 'text', text: '已清空購物車。' };
    case 'shipping-menu': return shippingMessage();
    case 'shipping': setShipping(userId, type); return paymentMessage();
    case 'payment': setPayment(userId, type); return cartMessage(await getCart(userId));
    case 'checkout': {
      const choices = getCheckout(userId);
      if (!choices.shipping) return shippingMessage();
      if (!choices.payment) return paymentMessage();
      const order = await createOrder(userId);
      return { type: 'text', text: `訂單已建立！\n訂單編號：${order.orderNo}\n訂單金額：NT$${order.total.toLocaleString('zh-TW')}\n物流：${shippingLabels[choices.shipping] || choices.shipping}\n付款：${paymentLabels[choices.payment] || choices.payment}\n付款狀態：待付款\n\n我們會依你選擇的方式提供付款與取貨資訊。` };
    }
    default: throw new Error('未知操作');
  }
}
async function reply(event, message) {
  try { await replyMessage(event.replyToken, [message]); }
  catch (error) { console.error('LINE reply failed:', error.message); }
}
