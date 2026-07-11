import { readRows } from '../sheet/sheetService.js';

export async function getCustomerOrders(userId) {
  const orders = await readRows('Orders');
  return orders.filter((order) => order.UserId === userId).sort((a, b) => String(b.CreatedAt).localeCompare(String(a.CreatedAt)));
}
