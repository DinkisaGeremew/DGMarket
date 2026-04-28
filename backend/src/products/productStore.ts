import { Product } from '@em/shared';
import { loadMap, saveMap } from '../persist';

const SEED_SELLER = '00000000-0000-0000-0000-000000000001';

const SEED_PRODUCTS: Product[] = [
  { id: 'seed-001', sellerId: SEED_SELLER, title: 'Nike Air Max Shoes', description: 'Comfortable and stylish Nike Air Max sneakers. Available in multiple sizes. Perfect for everyday wear and sports activities.', priceETB: 4500, category: 'Shoes', images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'], isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'seed-002', sellerId: SEED_SELLER, title: 'Leather Dress Shoes', description: 'Premium genuine leather dress shoes. Handcrafted for formal occasions and business meetings. Sizes 38-46.', priceETB: 3200, category: 'Shoes', images: ['https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=400'], isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'seed-003', sellerId: SEED_SELLER, title: 'Toyota Corolla 2020', description: 'Well-maintained Toyota Corolla 2020. Automatic transmission, 50,000 km mileage. Full service history available. Addis Ababa.', priceETB: 2800000, category: 'Cars', images: ['https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=400'], isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'seed-004', sellerId: SEED_SELLER, title: 'Hyundai Tucson 2019', description: 'Hyundai Tucson SUV 2019. 4WD, sunroof, leather seats. Excellent condition. 65,000 km. Price negotiable.', priceETB: 3500000, category: 'Cars', images: ['https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=400'], isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'seed-005', sellerId: SEED_SELLER, title: 'Samsung Galaxy S24', description: 'Brand new Samsung Galaxy S24. 256GB storage, 8GB RAM. Sealed box with full warranty. All colors available.', priceETB: 62000, category: 'Electronics', images: ['https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400'], isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'seed-006', sellerId: SEED_SELLER, title: 'HP Laptop 15-inch', description: 'HP laptop with Intel Core i5, 16GB RAM, 512GB SSD. Windows 11 pre-installed. Great for work and study.', priceETB: 45000, category: 'Electronics', images: ['https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400'], isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'seed-007', sellerId: SEED_SELLER, title: 'Traditional Habesha Kemis', description: 'Handwoven traditional Ethiopian Habesha Kemis dress. Pure cotton, white with colorful border. Sizes S, M, L, XL.', priceETB: 1800, category: 'Clothing', images: ['https://images.unsplash.com/photo-1594938298603-c8148c4b4e5b?w=400'], isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'seed-008', sellerId: SEED_SELLER, title: 'Fresh Yirgacheffe Coffee (1kg)', description: 'Premium single-origin Yirgacheffe coffee beans. Freshly roasted, fruity and floral notes. Direct from the farm.', priceETB: 850, category: 'Food', images: ['https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400'], isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'seed-009', sellerId: SEED_SELLER, title: 'Sofa Set (3+1+1)', description: 'Modern 5-seater sofa set. High-quality fabric, solid wood frame. Available in grey and brown. Free delivery in Addis.', priceETB: 28000, category: 'Furniture', images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400'], isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'seed-010', sellerId: SEED_SELLER, title: 'Bajaj Boxer Motorcycle', description: 'Bajaj Boxer 150cc motorcycle. 2022 model, low mileage, excellent fuel economy. Perfect for city commuting.', priceETB: 95000, category: 'Motorcycles', images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'], isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
];

// Load persisted products, then add seeds if not already present
const products: Map<string, Product> = loadMap<Product>('products');
for (const seed of SEED_PRODUCTS) {
  if (!products.has(seed.id)) products.set(seed.id, seed);
}

function persist(): void {
  saveMap('products', products);
}

export function save(product: Product): void {
  products.set(product.id, product);
  persist();
}

export function findById(id: string): Product | undefined {
  return products.get(id);
}

export function findAll(): Product[] {
  return Array.from(products.values());
}

export function findActive(): Product[] {
  return findAll().filter((p) => p.isActive);
}

export function _reset(): void {
  products.clear();
}
