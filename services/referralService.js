import { appendRow, readRows, updateRow } from '../sheet/sheetService.js';
import { getUserProfile } from '../line/client.js';

let sourceCache;

function normalizeKeyword(value = '') {
  return value.trim().replace(/^來源\s*[：:]\s*/i, '').replace(/\s+/g, '').toLowerCase();
}

async function getActiveSources() {
  if (sourceCache && Date.now() - sourceCache.at < 5 * 60 * 1000) return sourceCache.rows;
  const rows = await readRows('ReferralSources');
  const active = rows.filter((row) => String(row.Active || '').trim().toUpperCase() !== 'N');
  sourceCache = { at: Date.now(), rows: active };
  return active;
}

export async function registerNewFollower(userId) {
  const referrals = await readRows('CustomerReferrals');
  if (referrals.some((row) => row.UserId === userId)) return;
  const followedAt = new Date().toISOString();
  let displayName = '';
  try { displayName = (await getUserProfile(userId)).displayName || ''; } catch { /* Keep tracking even when LINE profile lookup is unavailable. */ }
  await appendRow('CustomerReferrals', [userId, displayName, '', '', '', '待人工確認', followedAt, '', '尚未輸入推廣關鍵字']);
  await appendRow('ReferralAlerts', [userId, displayName, followedAt, '待詢問來源', '新好友尚未輸入推廣關鍵字']);
}

export async function tryAttributeReferral(userId, input) {
  const keyword = normalizeKeyword(input);
  if (!keyword) return false;
  const source = (await getActiveSources()).find((row) => normalizeKeyword(row.Keyword) === keyword);
  if (!source) return false;

  const referrals = await readRows('CustomerReferrals');
  const referral = referrals.find((row) => row.UserId === userId);
  if (referral && ['已歸屬', '人工歸屬'].includes(referral.Status)) return { alreadyAttributed: true, sourceName: referral.SourceName };

  const followedAt = referral?.FollowedAt || new Date().toISOString();
  const row = [userId, referral?.DisplayName || '', source.Keyword, source.SourceName || source.Keyword, source.SourceType || '推廣關鍵字', '已歸屬', followedAt, new Date().toISOString(), '關鍵字自動歸屬'];
  if (referral) await updateRow('CustomerReferrals', referral._row, row);
  else await appendRow('CustomerReferrals', row);

  const alerts = await readRows('ReferralAlerts');
  const alert = alerts.filter((item) => item.UserId === userId && item.Status !== '已處理').at(-1);
  if (alert) await updateRow('ReferralAlerts', alert._row, [userId, alert.DisplayName || '', alert.FollowedAt, '已處理', `已自動歸屬：${source.SourceName || source.Keyword}`]);
  return { sourceName: source.SourceName || source.Keyword };
}

export async function recordReferralSale({ orderNo, userId, total, createdAt }) {
  const referrals = await readRows('CustomerReferrals');
  const referral = referrals.find((row) => row.UserId === userId && ['已歸屬', '人工歸屬'].includes(row.Status));
  if (!referral) return;

  const month = createdAt.slice(0, 7);
  await appendRow('ReferralSales', [orderNo, userId, referral.SourceName, referral.SourceKeyword, month, total, createdAt]);

  const summaries = await readRows('ReferralMonthlySummary');
  const summary = summaries.find((row) => row.Month === month && row.SourceName === referral.SourceName);
  if (summary) {
    await updateRow('ReferralMonthlySummary', summary._row, [month, referral.SourceName, Number(summary.OrderCount || 0) + 1, Number(summary.Revenue || 0) + Number(total || 0)]);
  } else {
    await appendRow('ReferralMonthlySummary', [month, referral.SourceName, 1, total]);
  }
}
