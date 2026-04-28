import * as fc from 'fast-check';
import {
  createProduct,
  getProduct,
  updateProduct,
  deactivateProduct,
  searchProducts,
  isServiceError,
  ProductInput,
} from './productService';
import { _reset } from './productStore';

beforeEach(() => _reset());

// ── Arbitraries ───────────────────────────────────────────────────────────────

// Generate non-empty, non-whitespace strings (starts and ends with alphanumeric to avoid trim issues)
const arbNonEmptyString = (maxLength = 100) =>
  fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9 _-]{0,}[a-zA-Z0-9]$/)
    .filter((s) => s.length >= 2 && s.length <= maxLength);

const arbProductInput = (): fc.Arbitrary<ProductInput> =>
  fc.record({
    sellerId: fc.uuid(),
    title: arbNonEmptyString(100),
    description: arbNonEmptyString(400),
    priceETB: fc.double({ min: 1, max: 100000, noNaN: true }),
    category: arbNonEmptyString(50),
    images: fc.array(fc.webUrl(), { minLength: 1, maxLength: 4 }),
  });

// ── Property 6: Product listing round-trip ────────────────────────────────────
// Feature: ethiopian-marketplace, Property 6: Product listing round-trip
// Validates: Requirements 2.2, 2.3

describe('Property 6: Product listing round-trip', () => {
  it('for any valid product input, creating then fetching by id returns equivalent data', () => {
    fc.assert(
      fc.property(arbProductInput(), (input) => {
        _reset();
        const created = createProduct(input);
        expect(isServiceError(created)).toBe(false);
        if (!isServiceError(created)) {
          const fetched = getProduct(created.id);
          expect(isServiceError(fetched)).toBe(false);
          if (!isServiceError(fetched)) {
            expect(fetched.title).toBe(input.title);
            expect(fetched.description).toBe(input.description);
            expect(fetched.priceETB).toBe(input.priceETB);
            expect(fetched.category).toBe(input.category);
            expect(fetched.images).toEqual(input.images);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('for any valid product, updating it reflects changes immediately', () => {
    fc.assert(
      fc.property(
        arbProductInput(),
        fc.string({ minLength: 1, maxLength: 100 }),
        (input, newTitle) => {
          _reset();
          const created = createProduct(input);
          if (isServiceError(created)) return;
          const updated = updateProduct(created.id, created.sellerId, { title: newTitle });
          expect(isServiceError(updated)).toBe(false);
          if (!isServiceError(updated)) {
            expect(updated.title).toBe(newTitle);
            const fetched = getProduct(created.id);
            if (!isServiceError(fetched)) {
              expect(fetched.title).toBe(newTitle);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 7: Deactivated listing excluded from search ──────────────────────
// Feature: ethiopian-marketplace, Property 7: Deactivated listing excluded from search
// Validates: Requirements 2.4, 8.1

describe('Property 7: Deactivated listing excluded from search', () => {
  it('for any product, deactivating it removes it from search results', () => {
    fc.assert(
      fc.property(arbProductInput(), (input) => {
        _reset();
        const created = createProduct(input);
        if (isServiceError(created)) return;
        deactivateProduct(created.id, created.sellerId);
        const results = searchProducts({});
        const found = results.items.find((p) => p.id === created.id);
        expect(found).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });
});

// ── Property 8: Invalid product listing is rejected ──────────────────────────
// Feature: ethiopian-marketplace, Property 8: Invalid product listing is rejected
// Validates: Requirements 2.5

describe('Property 8: Invalid product listing is rejected', () => {
  it('missing title is rejected with VALIDATION_ERROR', () => {
    fc.assert(
      fc.property(arbProductInput(), (input) => {
        _reset();
        const result = createProduct({ ...input, title: '' });
        expect(isServiceError(result)).toBe(true);
        if (isServiceError(result)) expect(result.code).toBe('VALIDATION_ERROR');
      }),
      { numRuns: 50 }
    );
  });

  it('missing images array is rejected with VALIDATION_ERROR', () => {
    fc.assert(
      fc.property(arbProductInput(), (input) => {
        _reset();
        const result = createProduct({ ...input, images: [] });
        expect(isServiceError(result)).toBe(true);
        if (isServiceError(result)) expect(result.code).toBe('VALIDATION_ERROR');
      }),
      { numRuns: 50 }
    );
  });
});

// ── Property 9: Search and filter results satisfy all criteria ────────────────
// Feature: ethiopian-marketplace, Property 9: Search and filter results satisfy all criteria
// Validates: Requirements 3.1, 3.2

describe('Property 9: Search and filter results satisfy all criteria', () => {
  it('all returned products match the search query in title, description, or category', () => {
    fc.assert(
      fc.property(
        fc.array(arbProductInput(), { minLength: 5, maxLength: 20 }),
        fc.string({ minLength: 2, maxLength: 10 }),
        (inputs, query) => {
          _reset();
          inputs.forEach((i) => createProduct(i));
          const results = searchProducts({ query });
          for (const p of results.items) {
            const q = query.toLowerCase();
            const matches =
              p.title.toLowerCase().includes(q) ||
              p.description.toLowerCase().includes(q) ||
              p.category.toLowerCase().includes(q);
            expect(matches).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('all returned products satisfy the category filter', () => {
    fc.assert(
      fc.property(
        fc.array(arbProductInput(), { minLength: 5, maxLength: 20 }),
        fc.string({ minLength: 2, maxLength: 20 }),
        (inputs, category) => {
          _reset();
          inputs.forEach((i) => createProduct(i));
          const results = searchProducts({ category });
          for (const p of results.items) {
            expect(p.category.toLowerCase()).toBe(category.toLowerCase());
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('all returned products satisfy the price range filter', () => {
    fc.assert(
      fc.property(
        fc.array(arbProductInput(), { minLength: 5, maxLength: 20 }),
        fc.double({ min: 1, max: 500, noNaN: true }),
        fc.double({ min: 500, max: 100000, noNaN: true }),
        (inputs, minPrice, maxPrice) => {
          _reset();
          inputs.forEach((i) => createProduct(i));
          const results = searchProducts({ minPrice, maxPrice });
          for (const p of results.items) {
            expect(p.priceETB).toBeGreaterThanOrEqual(minPrice);
            expect(p.priceETB).toBeLessThanOrEqual(maxPrice);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 10: Product detail contains all required fields ──────────────────
// Feature: ethiopian-marketplace, Property 10: Product detail contains all required fields
// Validates: Requirements 3.3

describe('Property 10: Product detail contains all required fields', () => {
  it('for any active product, fetching it returns all required fields', () => {
    fc.assert(
      fc.property(arbProductInput(), (input) => {
        _reset();
        const created = createProduct(input);
        if (isServiceError(created)) return;
        const fetched = getProduct(created.id);
        if (isServiceError(fetched)) return;
        expect(fetched.title).toBeTruthy();
        expect(fetched.description).toBeTruthy();
        expect(typeof fetched.priceETB).toBe('number');
        expect(fetched.sellerId).toBeTruthy();
        expect(fetched.images.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });
});

// ── Property 11: Pagination limit enforced ────────────────────────────────────
// Feature: ethiopian-marketplace, Property 11: Pagination limit enforced
// Validates: Requirements 3.5

describe('Property 11: Pagination limit enforced', () => {
  it('for any page of results, item count is between 0 and 24', () => {
    fc.assert(
      fc.property(
        fc.array(arbProductInput(), { minLength: 0, maxLength: 60 }),
        fc.integer({ min: 1, max: 5 }),
        (inputs, page) => {
          _reset();
          inputs.forEach((i) => createProduct(i));
          const results = searchProducts({ page });
          expect(results.items.length).toBeGreaterThanOrEqual(0);
          expect(results.items.length).toBeLessThanOrEqual(24);
          expect(results.pageSize).toBe(24);
        }
      ),
      { numRuns: 100 }
    );
  });
});
