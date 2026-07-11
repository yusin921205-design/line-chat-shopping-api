import { readRows } from '../sheet/sheetService.js';

const brandByShipping = { seven: '7-ELEVEN', family: '全家' };
const normalize = (value) => String(value || '').toLowerCase().replace(/[\s｜－-]|7-eleven|7-11|全家便利商店/g, '');

export async function findStores(shipping, query) {
  const brand = brandByShipping[shipping];
  if (!brand) return { exact: [], suggestions: [] };
  const key = normalize(query);
  const stores = (await readRows('ConvenienceStores')).filter((store) => store.Brand === brand && store.Status === '營業中');
  const exact = stores.filter((store) => normalize(store.StoreName) === key || normalize(`${store.StoreName}${store.Address}`) === key);
  const suggestions = stores.filter((store) => normalize(store.StoreName).includes(key)).slice(0, 5);
  return { exact, suggestions };
}
