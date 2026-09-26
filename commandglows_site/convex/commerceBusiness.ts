export function commerceBusinessForProduct(productId: string): string | null {
  if (productId === 'commandglows_app' || productId === 'commandglows_formation') return 'commandglows'
  if (productId === 'communityglows') return 'communityglows'
  if (productId === 'replayglows') return 'replayglows'
  if (productId === 'contentglowz') return 'contentglows'
  return null
}
