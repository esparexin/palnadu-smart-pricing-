import { describe, expect, it } from 'vitest';
import {
  addItemToBasket,
  calculateBasketItemCount,
  removeBasketItem,
  updateBasketItemQuantity,
  type BasketItem,
} from './basket-helpers.js';

const sampleItem1: Omit<BasketItem, 'quantity'> = {
  productId: 'prod-1',
  productName: 'Heavy Duty Pump',
  productSlug: 'heavy-duty-pump',
  model: 'HDP-100',
  unit: 'PCS',
  variantId: null,
  variantModel: null,
  sku: 'PUMP-1',
  imageUrl: null,
};

const sampleItem2WithVariant: Omit<BasketItem, 'quantity'> = {
  productId: 'prod-1',
  productName: 'Heavy Duty Pump',
  productSlug: 'heavy-duty-pump',
  model: 'HDP-100',
  unit: 'PCS',
  variantId: 'var-1',
  variantModel: 'HDP-100-PRO',
  sku: 'PUMP-1-PRO',
  imageUrl: 'https://example.com/pump.jpg',
};

describe('basket-helpers', () => {
  it('adds a new item to an empty basket', () => {
    const result = addItemToBasket([], sampleItem1, 2);
    expect(result).toHaveLength(1);
    expect(result[0].productId).toBe('prod-1');
    expect(result[0].quantity).toBe(2);
  });

  it('increments quantity when adding existing product and variant', () => {
    const initial = addItemToBasket([], sampleItem1, 1);
    const updated = addItemToBasket(initial, sampleItem1, 3);

    expect(updated).toHaveLength(1);
    expect(updated[0].quantity).toBe(4);
  });

  it('keeps distinct line items for different variants of the same product', () => {
    const initial = addItemToBasket([], sampleItem1, 1);
    const updated = addItemToBasket(initial, sampleItem2WithVariant, 2);

    expect(updated).toHaveLength(2);
    expect(updated[0].variantId).toBeNull();
    expect(updated[0].quantity).toBe(1);
    expect(updated[1].variantId).toBe('var-1');
    expect(updated[1].quantity).toBe(2);
  });

  it('updates item quantity directly', () => {
    const initial = addItemToBasket([], sampleItem1, 1);
    const updated = updateBasketItemQuantity(initial, 'prod-1', null, 5);

    expect(updated).toHaveLength(1);
    expect(updated[0].quantity).toBe(5);
  });

  it('removes item if updated quantity is 0 or negative', () => {
    const initial = addItemToBasket([], sampleItem1, 1);
    const updatedZero = updateBasketItemQuantity(initial, 'prod-1', null, 0);
    expect(updatedZero).toHaveLength(0);

    const updatedNeg = updateBasketItemQuantity(initial, 'prod-1', null, -2);
    expect(updatedNeg).toHaveLength(0);
  });

  it('removes item by productId and variantId', () => {
    let list = addItemToBasket([], sampleItem1, 2);
    list = addItemToBasket(list, sampleItem2WithVariant, 1);
    expect(list).toHaveLength(2);

    const removed = removeBasketItem(list, 'prod-1', 'var-1');
    expect(removed).toHaveLength(1);
    expect(removed[0].variantId).toBeNull();
  });

  it('calculates total item count properly', () => {
    let list = addItemToBasket([], sampleItem1, 3);
    list = addItemToBasket(list, sampleItem2WithVariant, 4);

    expect(calculateBasketItemCount(list)).toBe(7);
  });
});
