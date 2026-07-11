import { readRows } from '../sheet/sheetService.js';
import { toNumber } from '../utils/money.js';

export async function listProducts(category) {
  const products = await readRows('Products');
  return products.filter((p) => !category || p.Category === category).map(normalizeProduct);
}
export async function getProduct(productId) {
  const product = (await listProducts()).find((p) => p.id === productId);
  if (!product) throw new Error('找不到此商品');
  return product;
}
function normalizeProduct(p) {
  return { id: p.ProductId, name: p.Name, price: toNumber(p.Price), image: p.Image, description: p.Description, stock: toNumber(p.Stock), category: p.Category };
}
