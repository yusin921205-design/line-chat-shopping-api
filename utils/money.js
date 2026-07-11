export const formatMoney = (amount) => `NT$${Number(amount || 0).toLocaleString('zh-TW')}`;
export const toNumber = (value) => Number(value || 0);
