import { appendRow, readRows, updateRow } from '../sheet/sheetService.js';

export async function submitTransferReport(userId, orderNo, last5) {
  const orders = await readRows('Orders');
  const order = orders.find((item) => item.OrderNo === orderNo && item.UserId === userId && item.Payment === 'transfer');
  if (!order) throw new Error('找不到這筆銀行轉帳訂單，請確認訂單編號。');
  if (order.Status === '待核帳' || order.Status === '已付款') throw new Error('這筆訂單已回報或已完成付款確認。');

  await updateRow('Orders', order._row, [
    order.OrderNo, order.UserId, order['Products(JSON)'], order.Total,
    order.Shipping, order.Payment, '待核帳', order.CreatedAt, order.ShippedAt,
    order.ProductSummary, order.CustomerName, order.CustomerPhone, order.DeliveryDetail, last5, order.ShippingFee || 0
  ]);
  await appendRow('PaymentReports', [orderNo, userId, last5, '待核帳', new Date().toISOString(), '']);
  return order;
}

export async function attachTransferScreenshot(userId, orderNo, screenshotUrl) {
  const reports = await readRows('PaymentReports');
  const report = reports.filter((item) => item.OrderNo === orderNo && item.UserId === userId).at(-1);
  if (!report) throw new Error('找不到這筆匯款回報資料。');
  await updateRow('PaymentReports', report._row, [
    report.OrderNo, report.UserId, report.TransferLast5, report.Status, report.ReportedAt, screenshotUrl
  ]);
}
