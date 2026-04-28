import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

interface Product {
  id: string; title: string; description: string;
  priceETB: number; category: string; images: string[];
}

const CATEGORIES = ['', 'Shoes', 'Cars', 'Motorcycles', 'Electronics', 'Clothing', 'Food', 'Furniture', 'Agriculture', 'Beauty', 'Other'];

export default function ProductsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(searchParams.get('category') ?? '');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // Redirect logged-in users to their dashboard
  useEffect(() => {
    if (!user) return;
    if (user.role === 'buyer') navigate('/buyer', { replace: true });
    else if (user.role === 'seller') navigate('/seller', { replace: true });
    else if (user.role === 'admin') navigate('/admin', { replace: true });
  }, [user]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchProducts = async (p = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('query', query);
      if (category) params.set('category', category);
      if (minPrice) params.set('minPrice', minPrice);
      if (maxPrice) params.set('maxPrice', maxPrice);
      params.set('page', String(p));
      const res = await api.get(`/products?${params}`);
      setProducts(res.data.items);
      setTotal(res.data.total);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(page); }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts(1);
  };

  const clearFilters = () => {
    setQuery(''); setCategory(''); setMinPrice(''); setMaxPrice('');
    setPage(1);
    setTimeout(() => fetchProducts(1), 0);
  };

  const totalPages = Math.ceil(total / 24);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Search & filters */}
      <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow p-4 mb-8 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-gray-500 mb-1">{t('product.search')}</label>
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder={t('product.search')}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700" />
        </div>
        <div className="w-44">
          <label className="block text-xs font-medium text-gray-500 mb-1">{t('product.category')}</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c || t('product.allCategories')}</option>)}
          </select>
        </div>
        <div className="w-32">
          <label className="block text-xs font-medium text-gray-500 mb-1">{t('product.minPrice')}</label>
          <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} min="0"
            placeholder="0"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700" />
        </div>
        <div className="w-32">
          <label className="block text-xs font-medium text-gray-500 mb-1">{t('product.maxPrice')}</label>
          <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} min="0"
            placeholder="Any"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700" />
        </div>
        <button type="submit"
          className="bg-green-800 hover:bg-green-900 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors">
          {t('common.search')}
        </button>
        {(query || category || minPrice || maxPrice) && (
          <button type="button" onClick={clearFilters}
            className="text-gray-500 hover:text-gray-700 text-sm px-3 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50">
            {t('product.clearFilters')}
          </button>
        )}
      </form>

      {/* Results count */}
      {!loading && total > 0 && (
        <p className="text-sm text-gray-500 mb-4">{total} {total !== 1 ? t('product.foundPlural') : t('product.found')}</p>
      )}

      {loading && <p className="text-center text-gray-500 py-12">{t('common.loading')}</p>}

      {!loading && products.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-gray-400 text-lg">{t('product.noResults')}</p>
        </div>
      )}

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((p) => (
          <Link key={p.id} to={`/products/${p.id}`}
            className="bg-white rounded-2xl shadow hover:shadow-lg transition-shadow overflow-hidden group">
            <div className="h-48 bg-gray-100 flex items-center justify-center overflow-hidden">
              {p.images[0]
                ? <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                : <span className="text-5xl">📦</span>}
            </div>
            <div className="p-4">
              <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">{p.category}</span>
              <h3 className="font-semibold text-gray-800 truncate mt-2">{p.title}</h3>
              <p className="text-green-800 font-bold mt-1">{p.priceETB.toLocaleString()} {t('common.currency')}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-10">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50">
            {t('common.prev')}
          </button>
          <span className="text-sm text-gray-600">{t('common.page')} {page} {t('common.of')} {totalPages}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50">
            {t('common.next')}
          </button>
        </div>
      )}
    </div>
  );
}
