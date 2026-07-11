import crypto from 'node:crypto';
import { appendRow } from '../sheet/sheetService.js';
import { clearCart, getCart } from './cartService.js';
import { clearCheckout, getCheckout } from './sessionService.js';

export async function createOrder(userId) {
  const cart = await getCart(userId); const { shipping, payment, name, phone, deliveryDetail } = getCheckout(userId);
  if (!cart.items.length) throw new Error('購物車是空的');
  if (!shipping || !payment) throw new Error('請先選擇物流與付款方式');
  if (!name || !phone || !deliveryDetail) throw new Error('請先填寫收件人資料');
  const orderNo = `L${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const products = cart.items.map(({ id, name, price, quantity, subtotal }) => ({ productId: id, name, price, quantity, subtotal }));
  const productSummary = cart.items.map((item) => `${item.name} × ${item.quantity}`).join('、');
  await appendRow('Orders', [orderNo, userId, JSON.stringify(products), cart.total, shipping, payment, 'Pending', new Date().toISOString(), '', productSummary, name, phone, deliveryDetail, '']);
  await appendRow('CustomerDetails', [orderNo, userId, name, phone, deliveryDetail, new Date().toISOString()]);
  await clearCart(userId); clearCheckout(userId);
  return { orderNo, total: cart.total };
}
