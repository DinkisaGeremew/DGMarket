import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

interface Product {
  id: string; title: string; description: string;
  priceETB: number; category: string; images: string[]; sellerId: string;
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [added, setAdded] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    api.get(`/products/${id}`).then((r) => setProduct(r.data)).finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = async () => {
    if (!user) { navigate('/login'); return; }
    if (product?.sellerId === user.id) { alert("You can't buy your own product."); return; }
    setAdding(true);
    try {
      await api.post(`/orders/cart/${user.id}/add`, { productId: id, quantity });
      setAdded(true);
      setTimeout(() => setAdded(false), 2500);
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">{t('common.loading')}</div>;
  if (!product) return (
    <div className="text-center py-20">
      <p className="text-gray-400 text-lg mb-4">{t('product.notFound')}</p>
      <Link to="/products" className="text-green-700 hover:underline">{t('product.backToProducts')}</Link>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link to="/" className="hover:text-green-700">{t('common.home')}</Link>
        <span>/</span>
        <Link to="/products" className="hover:text-green-700">{t('common.breadcrumbProducts')}</Link>
        <span>/</span>
        <Link to={`/products?category=${product.category}`} className="hover:text-green-700">{product.category}</Link>
        <span>/</span>
        <span className="text-gray-600 truncate max-w-xs">{product.title}</span>
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden grid md:grid-cols-2 gap-0">
        {/* Images */}
        <div className="p-4">
          <div className="h-72 md:h-80 bg-gray-100 rounded-xl overflow-hidden mb-3">
            {product.images[activeImg]
              ? <img src={product.images[activeImg]} alt={product.title} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-8xl">📦</div>}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {product.images.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors ${activeImg === i ? 'border-green-700' : 'border-transparent'}`}>
                  <img src={img} alt={`${product.title} ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="p-8 flex flex-col justify-between">
          <div>
            <Link to={`/products?category=${product.category}`}
              className="text-xs font-semibold text-green-700 bg-green-50 px-3 py-1 rounded-full hover:bg-green-100 transition-colors">
              {product.category}
            </Link>
            <h1 className="text-2xl font-bold text-gray-800 mt-3 leading-tight">{product.title}</h1>
            <p className="text-3xl font-bold text-green-800 mt-4">
              {product.priceETB.toLocaleString()} <span className="text-lg font-normal text-gray-500">ETB</span>
            </p>
            <p className="text-gray-600 mt-4 leading-relaxed text-sm">{product.description}</p>

            {/* Escrow badge */}
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-start gap-2">
              <span className="text-lg">🔒</span>
              <div>
                <p className="text-xs font-semibold text-blue-800">{t('product.secureEscrow')}</p>
                <p className="text-xs text-blue-600 mt-0.5">{t('product.escrowDesc')}</p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            {/* Quantity */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm font-medium text-gray-700">{t('cart.quantity')}:</span>
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-2 text-gray-600 hover:bg-gray-100 transition-colors font-bold">−</button>
                <span className="px-4 py-2 text-sm font-semibold border-x border-gray-300">{quantity}</span>
                <button onClick={() => setQuantity((q) => q + 1)}
                  className="px-3 py-2 text-gray-600 hover:bg-gray-100 transition-colors font-bold">+</button>
              </div>
              <span className="text-sm text-gray-500">
                = {(product.priceETB * quantity).toLocaleString()} ETB
              </span>
            </div>

            <button onClick={handleAddToCart} disabled={adding}
              className={`w-full py-3 rounded-xl font-semibold text-white transition-all ${
                added ? 'bg-green-600 scale-95' : 'bg-green-800 hover:bg-green-900'
              } disabled:opacity-50`}>
              {added ? t('product.addedToCart') : adding ? t('product.adding') : t('product.addToCart')}
            </button>

            {user && (
              <button onClick={() => navigate('/cart')}
                className="w-full mt-2 py-3 rounded-xl font-semibold text-green-800 border-2 border-green-800 hover:bg-green-50 transition-colors">
                {t('product.viewCart')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
