import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

interface CartItem { productId: string; quantity: number; }
interface Cart { userId: string; items: CartItem[]; }
interface ProductInfo { id: string; title: string; priceETB: number; sellerId: string; images: string[]; }

const PLATFORM_ACCOUNT: Record<string, string> = {
  telebirr: '0927333140',
  cbe_birr: '1000345140798',
  bank_transfer: 'CBE Account: 1000345140798',
};

const COMMISSION_RATE = 0.08;

export default function CartPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState<Cart | null>(null);
  const [products, setProducts] = useState<Record<string, ProductInfo>>({});
  const [paymentMethod, setPaymentMethod] = useState<'telebirr' | 'cbe_birr' | 'bank_transfer'>('telebirr');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    api.get(`/orders/cart/${user.id}`).then(async (r) => {
      const cartData: Cart = r.data;
      setCart(cartData);
      // Fetch product details for each cart item
      const productMap: Record<string, ProductInfo> = {};
      await Promise.all(
        cartData.items.map(async (item) => {
          try {
            const res = await api.get(`/products/${item.productId}`);
            productMap[item.productId] = res.data;
          } catch { /* product may have been removed */ }
        })
      );
      setProducts(productMap);
    });
  }, [user]);

  const removeItem = async (productId: string) => {
    if (!user) return;
    const res = await api.delete(`/orders/cart/${user.id}/remove/${productId}`);
    setCart(res.data);
  };

  const handleCheckout = async () => {
    if (!user || !cart || cart.items.length === 0) return;
    setError('');
    setLoading(true);
    try {
      // Group items by seller
      const bySeller: Record<string, { productId: string; quantity: number; priceETB: number }[]> = {};
      cart.items.forEach((item) => {
        const p = products[item.productId];
        if (!p) return;
        if (!bySeller[p.sellerId]) bySeller[p.sellerId] = [];
        bySeller[p.sellerId].push({ productId: item.productId, quantity: item.quantity, priceETB: p.priceETB });
      });

      const sellerOrders = Object.entries(bySeller).map(([sellerId, items]) => ({
        sellerId,
        prices: Object.fromEntries(items.map((i) => [i.productId, i.priceETB])),
      }));

      const res = await api.post('/orders', {
        buyerId: user.id,
        paymentMethod,
        sellerOrders,
      });

      // res.data is an array of orders — navigate to first one
      const firstId = res.data[0]?.id;
      navigate(firstId ? `/orders` : '/orders');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const total = cart?.items.reduce((sum, item) => {
    return sum + (products[item.productId]?.priceETB ?? 0) * item.quantity;
  }, 0) ?? 0;

  if (!cart) return <div className="text-center py-20 text-gray-400">{t('common.loading')}</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('cart.title')}</h1>
      {cart.items.length === 0
        ? <div className="text-center py-16 text-gray-400 text-lg">{t('cart.empty')}</div>
        : (
          <div className="space-y-4">
            {cart.items.map((item) => {
              const p = products[item.productId];
              return (
                <div key={item.productId} className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
                  {p?.images?.[0]
                    ? <img src={p.images[0]} alt={p.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                    : <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">📦</div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">{p?.title ?? item.productId}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{t('cart.quantity')}: {item.quantity}</p>
                    <p className="text-sm font-semibold text-green-800 mt-0.5">
                      {((p?.priceETB ?? 0) * item.quantity).toLocaleString()} ETB
                    </p>
                  </div>
                  <button onClick={() => removeItem(item.productId)}
                    className="text-red-500 hover:text-red-700 text-sm font-medium flex-shrink-0">{t('cart.remove')}</button>
                </div>
              );
            })}

            <div className="bg-white rounded-xl shadow p-6 mt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600 font-medium">{t('cart.subtotal')}</span>
                <span className="text-lg font-bold text-gray-800">{total.toLocaleString()} ETB</span>
              </div>
              <div className="flex justify-between items-center mb-4 text-sm text-gray-500">
                <span>{t('cart.platformFee')}</span>
                <span>{Math.round(total * COMMISSION_RATE).toLocaleString()} ETB</span>
              </div>
              <div className="flex justify-between items-center mb-4 border-t pt-3">
                <span className="text-gray-700 font-semibold">{t('cart.youPay')}</span>
                <span className="text-xl font-bold text-green-800">{total.toLocaleString()} ETB</span>
              </div>
              {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-2 mb-3">{error}</div>}
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('order.paymentMethod')}</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 mb-4">
                <option value="telebirr">{t('payment.telebirr')}</option>
                <option value="cbe_birr">{t('payment.cbe_birr')}</option>
                <option value="bank_transfer">{t('payment.bank_transfer')}</option>
              </select>
              {/* Platform payment account info */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-xs font-semibold text-green-800 mb-1">📋 {t('cart.sendPaymentTo')}</p>
                <p className="text-sm font-mono text-green-900 font-bold">{PLATFORM_ACCOUNT[paymentMethod]}</p>
                <p className="text-xs text-green-700 mt-1">{t('cart.uploadAfterCheckout')}</p>
              </div>
              <button onClick={handleCheckout} disabled={loading}
                className="w-full bg-green-800 hover:bg-green-900 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50">
                {loading ? t('common.loading') : t('cart.checkout')}
              </button>
            </div>
          </div>
        )}
    </div>
  );
}
