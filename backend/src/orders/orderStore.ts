import { Order } from '@em/shared';
import { loadMap, saveMap } from '../persist';

const orders: Map<string, Order> = loadMap<Order>('orders');

function persist() { saveMap('orders', orders); }

export function save(order: Order): void {
  orders.set(order.id, order);
  persist();
}

export function findById(id: string): Order | undefined {
  return orders.get(id);
}

export function findByBuyer(buyerId: string): Order[] {
  return Array.from(orders.values()).filter((o) => o.buyerId === buyerId);
}

export function findBySeller(sellerId: string): Order[] {
  return Array.from(orders.values()).filter((o) => o.sellerId === sellerId);
}

export function findAll(): Order[] {
  return Array.from(orders.values());
}

export function _reset(): void {
  orders.clear();
}
