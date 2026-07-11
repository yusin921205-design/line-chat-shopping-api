import { appendRow, deleteRow, readRows, updateRow } from '../sheet/sheetService.js';
import { getProduct } from './productService.js';

export async function getCart(userId) {
  const rows = (await readRows('Cart')).filter((row) => row.UserId === userId);
  const items = await Promise.all(rows.map(async (row) => {
    try { const product = await getProduct(row.ProductId); return { ...product, quantity: Number(row.Quantity), subtotal: product.price * Number(row.Quantity), row: row._row }; }
    catch { return null; }
  }));
  const valid = items.filter(Boolean);
  return { items: valid, total: valid.reduce((sum, item) => sum + item.subtotal, 0) };
}

async function findRow(userId, productId) { return (await readRows('Cart')).find((row) => row.UserId === userId && row.ProductId === productId); }
export async function addItem(userId, productId) {
  const product = await getProduct(productId);
  if (product.stock < 1) throw new Error('此商品目前缺貨');
  const row = await findRow(userId, productId);
  if (row) await updateRow('Cart', row._row, [userId, productId, Number(row.Quantity) + 1]);
  else await appendRow('Cart', [userId, productId, 1]);
  return getCart(userId);
}
export async function changeQuantity(userId, productId, delta) {
  const row = await findRow(userId, productId);
  if (!row) throw new Error('購物車中沒有此商品');
  const quantity = Number(row.Quantity) + delta;
  if (quantity <= 0) await deleteRow('Cart', row._row);
  else await updateRow('Cart', row._row, [userId, productId, quantity]);
  return getCart(userId);
}
export async function removeItem(userId, productId) { const row = await findRow(userId, productId); if (row) await deleteRow('Cart', row._row); return getCart(userId); }
export async function clearCart(userId) {
  const rows = (await readRows('Cart')).filter((row) => row.UserId === userId).sort((a, b) => b._row - a._row);
  for (const row of rows) await deleteRow('Cart', row._row);
}
