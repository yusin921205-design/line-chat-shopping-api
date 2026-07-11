// Cart items persist in Sheets; this only holds the active checkout choices.
const sessions = new Map();
const get = (userId) => sessions.get(userId) || {};
export function setShipping(userId, shipping) { sessions.set(userId, { shipping }); }
export function setPayment(userId, payment) { sessions.set(userId, { ...get(userId), payment }); }
export function getCheckout(userId) { return get(userId); }
export function clearCheckout(userId) { sessions.delete(userId); }
