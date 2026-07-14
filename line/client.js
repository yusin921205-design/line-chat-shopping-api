import { messagingApi } from '@line/bot-sdk';

if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
  console.warn('LINE_CHANNEL_ACCESS_TOKEN is not set. LINE API calls will fail until configured.');
}

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || 'missing-token'
});

export const replyMessage = (replyToken, messages) => client.replyMessage({ replyToken, messages });
export const getUserProfile = (userId) => client.getProfile(userId);
export const createRichMenu = (richMenu) => client.createRichMenu(richMenu);
export const setDefaultRichMenu = (richMenuId) => client.setDefaultRichMenu(richMenuId);
export const uploadRichMenuImage = (richMenuId, contentType, body) =>
  client.setRichMenuImage(richMenuId, contentType, body);
