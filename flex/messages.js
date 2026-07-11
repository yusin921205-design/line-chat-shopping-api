import { template } from './template.js';
import { formatMoney } from '../utils/money.js';
import { getShippingOption, SHIPPING_OPTIONS } from '../services/pricingService.js';

const flex = (altText, contents) => ({ type: 'flex', altText, contents });
const button = (label, data, style) => ({ type: 'button', ...(style ? { style } : {}), action: { type: 'postback', label, data } });
export function productList(products) {
  if (!products.length) return { type: 'text', text: '目前沒有可購買的商品。' };
  return flex('商品列表', { type: 'carousel', contents: products.slice(0, 12).map((p) => template('product-bubble', { ...p, price: formatMoney(p.price), image: p.image || 'https://placehold.co/800x520/png?text=Product' })) });
}
export function cartMessage(cart, { canCheckout = false, shipping } = {}) {
  if (!cart.items.length) return { type: 'text', text: '購物車目前是空的。請從「商品分類」開始選購。' };
  const items = cart.items.slice(0, 10).map((item) => template('cart-bubble', {
    ...item,
    quantityLabel: item.freeQuantity ? `${item.quantity}（買3送1，贈${item.freeQuantity}，共${item.fulfilledQuantity}件）` : item.quantity,
    price: formatMoney(item.price), subtotal: formatMoney(item.subtotal), image: item.image || 'https://placehold.co/800x520/png?text=Product'
  }));
  const shippingOption = getShippingOption(shipping);
  const shippingFee = shipping ? shippingOption.fee : 0;
  const grandTotal = cart.subtotal + shippingFee;
  const summaryButtons = [
    button('繼續購物', 'action=category', 'secondary'),
    button('清空購物車', 'action=clear', 'secondary')
  ];
  if (canCheckout) summaryButtons.push(button('送出訂單', 'action=checkout', 'primary'));
  else if (shipping) summaryButtons.push(button('下一步：銀行轉帳', 'action=payment&type=transfer', 'primary'));
  items.push({ type: 'bubble', body: { type: 'box', layout: 'vertical', spacing: 'md', contents: [
    { type: 'text', text: '選擇物流方式', weight: 'bold', size: 'lg' },
    { type: 'text', text: shipping ? `目前：${shippingOption.label}（運費 ${formatMoney(shippingOption.fee)}）` : '請直接點選下方物流方式', wrap: true, color: '#666666' },
    ...Object.entries(SHIPPING_OPTIONS).map(([value, option]) => button(`${option.label.replace('超商取貨', '取貨')} $${option.fee}`, `action=shipping&type=${value}`, shipping === value ? 'primary' : undefined))
  ] } });
  const calculation = cart.items.map((item) => ({ type: 'text', size: 'sm', wrap: true, text: `${formatMoney(item.price)} × ${item.quantity}${item.freeQuantity ? `（買3送1贈${item.freeQuantity}）` : ''} = ${formatMoney(item.subtotal)}` }));
  items.push({ type: 'bubble', body: { type: 'box', layout: 'vertical', spacing: 'md', contents: [
    { type: 'text', text: '購物車合計', weight: 'bold', size: 'lg' },
    ...calculation,
    { type: 'separator' },
    { type: 'text', text: `商品小計：${formatMoney(cart.subtotal)}`, wrap: true },
    { type: 'text', text: shipping ? `運費：${formatMoney(shippingFee)}` : '運費：請先選擇物流方式', wrap: true },
    { type: 'text', text: `總計：${formatMoney(grandTotal)}`, weight: 'bold', size: 'xxl', color: '#D55B32' }
  ] }, footer: { type: 'box', layout: 'vertical', spacing: 'sm', contents: [
    ...summaryButtons
  ] } });
  return flex('最新購物車', { type: 'carousel', contents: items });
}
export function editMessage(item) { return flex('修改購物車商品', template('edit-bubble', { ...item, price: formatMoney(item.price) })); }
export function shippingMessage() { return choiceMessage('選擇物流方式', Object.entries(SHIPPING_OPTIONS).map(([value, option]) => [`${option.label}（運費 ${formatMoney(option.fee)}）`, value]), 'shipping'); }
export function paymentMessage() { return choiceMessage('付款方式', [['銀行轉帳', 'transfer']], 'payment'); }
function choiceMessage(title, choices, action) {
  return flex(title, { type: 'bubble', body: { type: 'box', layout: 'vertical', spacing: 'md', contents: [{ type: 'text', text: title, weight: 'bold', size: 'xl' }, ...choices.map(([label, value]) => button(label, `action=${action}&type=${value}`))] } });
}
