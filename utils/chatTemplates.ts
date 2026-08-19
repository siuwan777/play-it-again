export type ChatQuickReply = {
  label: string;
  text: string;
};

const BUYER_QUICK_REPLIES: ChatQuickReply[] = [
  { label: '可以試琴嗎？', text: '你好，請問可以試琴嗎？' },
  { label: '今天面交', text: '請問今天可以面交嗎？' },
  { label: '明天面交', text: '請問明天可以面交嗎？' },
  { label: '旺角面交', text: '我想在旺角面交，請問方便嗎？' },
  { label: '銅鑼灣面交', text: '我想在銅鑼灣面交，請問方便嗎？' },
  { label: '可以議價嗎？', text: '請問這個價錢還有議價空間嗎？' },
];

const SELLER_QUICK_REPLIES: ChatQuickReply[] = [
  { label: '可以試琴', text: '可以試琴，歡迎預約時間。' },
  { label: '今天 OK', text: '今天可以面交，請問幾點方便？' },
  { label: '明天 OK', text: '明天可以面交，請問幾點方便？' },
  { label: '旺角 OK', text: '旺角面交沒問題，請問幾點方便？' },
  { label: '銅鑼灣 OK', text: '銅鑼灣面交沒問題，請問幾點方便？' },
  { label: '價錢 OK', text: '這個價錢可以，我們約時間交收吧。' },
];

export function getChatQuickReplies(isBuyer: boolean): ChatQuickReply[] {
  return isBuyer ? BUYER_QUICK_REPLIES : SELLER_QUICK_REPLIES;
}
