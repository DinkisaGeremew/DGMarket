import { Cart, CartItem } from '@em/shared';
import { loadMap, saveMap } from '../persist';

const carts: Map<string, Cart> = loadMap<Cart>('carts');

function persist() { saveMap('carts', carts); }

export function getCart(userId: string): Cart {
  return carts.get(userId) ?? { userId, items: [] };
}

export function addToCart(userId: string, productId: string, quantity: number): Cart {
  const cart = getCart(userId);
  const existing = cart.items.find((i) => i.productId === productId);

  let items: CartItem[];
  if (existing) {
    items = cart.items.map((i) =>
      i.productId === productId ? { ...i, quantity: i.quantity + quantity } : i
    );
  } else {
    items = [...cart.items, { productId, quantity }];
  }

  const updated: Cart = { userId, items };
  carts.set(userId, updated);
  persist();
  return updated;
}

export function removeFromCart(userId: string, productId: string): Cart {
  const cart = getCart(userId);
  const updated: Cart = {
    userId,
    items: cart.items.filter((i) => i.productId !== productId),
  };
  carts.set(userId, updated);
  persist();
  return updated;
}

export function clearCart(userId: string): Cart {
  const empty: Cart = { userId, items: [] };
  carts.set(userId, empty);
  persist();
  return empty;
}

export function _reset(): void {
  carts.clear();
}
