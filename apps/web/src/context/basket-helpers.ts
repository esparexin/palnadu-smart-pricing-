export interface BasketItem {
  productId: string;
  productName: string;
  productSlug: string;
  model: string | null;
  unit: string;
  variantId: string | null;
  variantModel: string | null;
  sku: string | null;
  quantity: number;
  imageUrl: string | null;
}

export function addItemToBasket(
  items: BasketItem[],
  newItem: Omit<BasketItem, 'quantity'>,
  quantity = 1,
): BasketItem[] {
  const qty = Math.max(1, quantity);
  const existingIdx = items.findIndex(
    (i) =>
      i.productId === newItem.productId && (i.variantId ?? null) === (newItem.variantId ?? null),
  );

  if (existingIdx >= 0) {
    const updated = [...items];
    const existing = updated[existingIdx]!;
    updated[existingIdx] = {
      ...existing,
      quantity: existing.quantity + qty,
    };
    return updated;
  }

  return [...items, { ...newItem, quantity: qty }];
}

export function updateBasketItemQuantity(
  items: BasketItem[],
  productId: string,
  variantId: string | null | undefined,
  quantity: number,
): BasketItem[] {
  if (quantity <= 0) {
    return removeBasketItem(items, productId, variantId);
  }

  return items.map((i) => {
    if (i.productId === productId && (i.variantId ?? null) === (variantId ?? null)) {
      return { ...i, quantity };
    }
    return i;
  });
}

export function removeBasketItem(
  items: BasketItem[],
  productId: string,
  variantId?: string | null,
): BasketItem[] {
  return items.filter(
    (i) => !(i.productId === productId && (i.variantId ?? null) === (variantId ?? null)),
  );
}

export function calculateBasketItemCount(items: BasketItem[]): number {
  return items.reduce((acc, i) => acc + i.quantity, 0);
}
