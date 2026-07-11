import { template } from './template.js';
import { formatMoney } from '../utils/money.js';

const flex = (altText, contents) => ({ type: 'flex', altText, contents });
const button = (label, data, style) => ({ type: 'button', ...(style ? { style } : {}), action: { type: 'postback', label, data } });
export function productList(products) {
  if (!products.length) return { type: 'text', text: '目前沒有可購買的商品。' };
  return flex('商品列表', { type: 'carousel', contents: products.slice(0, 12).map((p) => template('product-bubble', { ...p, price: formatMoney(p.price), image: p.image || 'https://placehold.co/800x520/png?text=Product' })) });
}
export function cartMessage(cart, { canCheckout = false } = {}) {
  if (!cart.items.length) return { type: 'text', text: '購物車目前是空的。請從「商品分類」開始選購。' };
  const items = cart.items.map((item) => template('cart-bubble', { ...item, price: formatMoney(item.price), subtotal: formatMoney(item.subtotal), image: item.image || 'https://placehold.co/800x520/png?text=Product' }));
  const summaryButtons = [
    button('繼續購物', 'action=category', 'secondary'),
    button('選擇物流', 'action=shipping-menu'),
    button('清空購物車', 'action=clear', 'secondary')
  ];
  if (canCheckout) summaryButtons.push(button('送出訂單', 'action=checkout', 'primary'));
  items.push({ type: 'bubble', body: { type: 'box', layout: 'vertical', spacing: 'md', contents: [
    { type: 'text', text: '購物車合計', weight: 'bold', size: 'lg' }, { type: 'text', text: formatMoney(cart.total), weight: 'bold', size: 'xxl', color: '#D55B32' }
  ] }, footer: { type: 'box', layout: 'vertical', spacing: 'sm', contents: [
    ...summaryButtons
  ] } });
  return flex('最新購物車', { type: 'carousel', contents: items });
}
export function editMessage(item) { return flex('修改購物車商品', template('edit-bubble', { ...item, price: formatMoney(item.price) })); }
export function shippingMessage() { return choiceMessage('選擇物流方式（全部免運）', [['7-ELEVEN 超商取貨（免運）', 'seven'], ['全家超商取貨（免運）', 'family'], ['郵局寄送（免運）', 'post_office'], ['面交（免運）', 'meetup']], 'shipping'); }
export function paymentMessage() { return choiceMessage('付款方式', [['銀行轉帳', 'transfer']], 'payment'); }
function choiceMessage(title, choices, action) {
  return flex(title, { type: 'bubble', body: { type: 'box', layout: 'vertical', spacing: 'md', contents: [{ type: 'text', text: title, weight: 'bold', size: 'xl' }, ...choices.map(([label, value]) => button(label, `action=${action}&type=${value}`))] } });
}
