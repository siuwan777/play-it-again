export function getDisplaySellerName(data: {
  sellerName?: string;
  sellerEmail?: string;
}): string {
  if (data.sellerName && data.sellerName !== '音樂愛好者') {
    return data.sellerName;
  }

  if (data.sellerEmail) {
    const localPart = data.sellerEmail.split('@')[0]?.trim();
    if (localPart) return localPart;
  }

  if (data.sellerName) {
    return data.sellerName;
  }

  return '音樂愛好者';
}
