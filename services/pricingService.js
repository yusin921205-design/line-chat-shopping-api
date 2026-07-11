export const SHIPPING_OPTIONS = {
  seven: { label: '7-ELEVEN 超商取貨', fee: 60 },
  family: { label: '全家超商取貨', fee: 60 },
  post_office: { label: '郵局寄送', fee: 80 },
  meetup: { label: '面交', fee: 0 }
};

export function getShippingOption(shipping) {
  return SHIPPING_OPTIONS[shipping] || { label: '尚未選擇物流', fee: 0 };
}

export function isBuyThreeGetOne(product) {
  return /洗髮精|舒緩霜/.test(product.name);
}

export function freeQuantity(product, quantity) {
  return isBuyThreeGetOne(product) ? Math.floor(quantity / 3) : 0;
}
