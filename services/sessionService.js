// Cart items persist in Sheets; this only holds the active checkout choices.
const sessions = new Map();
const get = (userId) => sessions.get(userId) || {};
export function setShipping(userId, shipping) { sessions.set(userId, { shipping }); }
export function setPayment(userId, payment) { sessions.set(userId, { ...get(userId), payment }); }
export function beginCustomerDetails(userId) { sessions.set(userId, { ...get(userId), step: 'name' }); }
export function setCustomerName(userId, name) { sessions.set(userId, { ...get(userId), name, step: 'phone' }); }
export function setCustomerPhone(userId, phone) { sessions.set(userId, { ...get(userId), phone, step: 'delivery' }); }
export function setDeliveryDetail(userId, deliveryDetail) { sessions.set(userId, { ...get(userId), deliveryDetail, step: undefined }); }
export function setDeliveryCandidate(userId, deliveryDetail) { sessions.set(userId, { ...get(userId), deliveryDetail, step: 'deliveryConfirm' }); }
export function retryDelivery(userId) { sessions.set(userId, { ...get(userId), deliveryDetail: undefined, step: 'delivery' }); }
export function setPendingTransferScreenshot(userId, orderNo) { sessions.set(userId, { ...get(userId), transferScreenshotOrderNo: orderNo }); }
export function clearPendingTransferScreenshot(userId) { const session = { ...get(userId) }; delete session.transferScreenshotOrderNo; sessions.set(userId, session); }
export function getCheckout(userId) { return get(userId); }
export function clearCheckout(userId) { sessions.delete(userId); }
