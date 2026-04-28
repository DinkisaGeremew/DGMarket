import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import api from '../lib/api';

type Tab = 'overview' | 'shop' | 'orders' | 'cart';

interface Order { id: string; items: { productId: string; quantity: number; unitPriceETB: number }[]; totalETB: number; status: string; paymentMethod: string; createdAt: string; paymentProof?: string; }
interface ProductInfo { id: string; title: string; priceETB: number; category: string; images: string[]; sellerId: string; }
interface CartItem { productId: string; quantity: number; }

const STATUS_COLORS: Record<string, string> = {
  pending_payment: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const PLATFORM_ACCOUNT: Record<string, string> = {
  telebirr: '0927333140',
  cbe_birr: '1000345140798',
  bank_transfer: 'CBE Account: 1000345140798',
};

const CATEGORIES = ['', 'Shoes', 'Cars', 'Motorcycles', 'Electronics', 'Clothing', 'Food', 'Furniture', 'Agriculture', 'Beauty', 'Other'];

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1200;
      const scale = img.width > MAX ? MAX / img.width : 1;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = reject;
    img.src = url;
  });
}

const NAV: { key: Tab; icon: string; label: string }[] = [
  { key: 'overview', icon: '📊', label: 'Overview' },
  { key: 'shop',     icon: '🛍️', label: 'Shop' },
  { key: 'cart',     icon: '🛒', label: 'My Cart' },
  { key: 'orders',   icon: '📦', label: 'My Orders' },
];

export default function BuyerDashboard() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [productMap, setProductMap] = useState<Record<string, ProductInfo>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [txnIds, setTxnIds] = useState<Record<string, string>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Cart
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartProducts, setCartProducts] = useState<Record<string, ProductInfo>>({});
  const [paymentMethod, setPaymentMethod] = useState<'telebirr' | 'cbe_birr' | 'bank_transfer'>('telebirr');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  // Shop
  const [shopProducts, setShopProducts] = useState<ProductInfo[]>([]);
  const [shopQuery, setShopQuery] = useState('');
  const [shopCategory, setShopCategory] = useState('');
  const [shopTotal, setShopTotal] = useState(0);
  const [shopPage, setShopPage] = useState(1);
  const [shopLoading, setShopLoading] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'buyer') { navigate('/login'); return; }
    loadOrders();
    loadCart();
  }, [user]);

  useEffect(() => {
    if (tab === 'shop') fetchShop(1, shopQuery, shopCategory);
  }, [tab]);

  const loadOrders = async () => {
    try {
      const r = await api.get(`/orders/buyer/${user!.id}`);
      const list: Order[] = r.data;
      setOrders(list);
      const ids = [...new Set(list.flatMap(o => o.items.map(i => i.productId)))];
      const map: Record<string, ProductInfo> = {};
      await Promise.all(ids.map(async id => {
        try { const res = await api.get(`/products/${id}`); map[id] = res.data; } catch { /* removed */ }
      }));
      setProductMap(map);
    } catch { setOrders([]); }
  };

  const loadCart = async () => {
    try {
      const r = await api.get(`/orders/cart/${user!.id}`);
      const items: CartItem[] = r.data.items ?? [];
      setCartItems(items);
      const map: Record<string, ProductInfo> = {};
      await Promise.all(items.map(async item => {
        try { const res = await api.get(`/products/${item.productId}`); map[item.productId] = res.data; } catch { /* removed */ }
      }));
      setCartProducts(map);
    } catch { setCartItems([]); }
  };

  const fetchShop = async (p = shopPage, q = shopQuery, cat = shopCategory) => {
    setShopLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('query', q);
      if (cat) params.set('category', cat);
      params.set('page', String(p));
      const r = await api.get(`/products?${params}`);
      setShopProducts(r.data.items);
      setShopTotal(r.data.total);
    } catch { setShopProducts([]); }
    finally { setShopLoading(false); }
  };

  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  const addToCart = async (productId: string) => {
    setAddingToCart(productId);
    try {
      await api.post(`/orders/cart/${user!.id}/add`, { productId, quantity: 1 });
      await loadCart();
    } catch { /* ignore */ }
    finally { setAddingToCart(null); }
  };

  const removeFromCart = async (productId: string) => {
    try {
      await api.delete(`/orders/cart/${user!.id}/remove/${productId}`);
      await loadCart();
    } catch { /* ignore */ }
  };

  const handleCheckout = async () => {
    if (!cartItems.length) return;
    setCheckoutError(''); setCheckoutLoading(true);
    try {
      const bySeller: Record<string, { productId: string; quantity: number; priceETB: number }[]> = {};
      cartItems.forEach(item => {
        const p = cartProducts[item.productId];
        if (!p) return;
        if (!bySeller[p.sellerId]) bySeller[p.sellerId] = [];
        bySeller[p.sellerId].push({ productId: item.productId, quantity: item.quantity, priceETB: p.priceETB });
      });
      await api.post('/orders', {
        buyerId: user!.id, paymentMethod,
        sellerOrders: Object.entries(bySeller).map(([sellerId]) => ({ sellerId, prices: Object.fromEntries(cartItems.map(i => [i.productId, cartProducts[i.productId]?.priceETB ?? 0])) })),
      });
      await loadOrders();
      await loadCart();
      setTab('orders');
    } catch (err: unknown) {
      setCheckoutError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Checkout failed.');
    } finally { setCheckoutLoading(false); }
  };

  const handleProofUpload = async (orderId: string, file: File) => {
    const txnId = txnIds[orderId]?.trim();
    if (!txnId) { alert('Please enter your transaction ID first.'); return; }
    setUploadingId(orderId);
    try {
      const proof = await compressImage(file);
      await api.post(`/orders/${orderId}/payment-proof`, { buyerId: user!.id, proof, transactionId: txnId });
      await loadOrders();
    } catch { alert('Failed to upload proof'); }
    finally { setUploadingId(null); }
  };

  const NAV: { key: Tab; icon: string; label: string }[] = [
    { key: 'overview', icon: '📊', label: t('buyer.overview') },
    { key: 'shop',     icon: '🛍️', label: t('buyer.shop') },
    { key: 'cart',     icon: '🛒', label: t('buyer.myCart') },
    { key: 'orders',   icon: '📦', label: t('buyer.myOrders') },
  ];
  const pendingOrders = orders.filter(o => o.status === 'pending_payment').length;
  const cartCount = cartItems.length;

  const cartTotal = cartItems.reduce((s, i) => s + (cartProducts[i.productId]?.priceETB ?? 0) * i.quantity, 0);
  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 bg-gray-50 focus:bg-white transition-all';

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* SIDEBAR */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-green-900 text-white z-30 flex flex-col transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 lg:flex lg:flex-shrink-0`}>
        {/* Identity */}
        <div className="px-6 py-6 border-b border-green-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center text-green-900 font-black text-lg">
              {(user?.name ?? user?.email ?? 'B')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">{user?.name ?? user?.email ?? t('buyer.account')}</p>
              <p className="text-green-300 text-xs">{t('buyer.account')}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(item => (
            <button key={item.key} onClick={() => { setTab(item.key); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-left ${tab === item.key ? 'bg-white/15 text-white' : 'text-green-200 hover:bg-white/10 hover:text-white'}`}>
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
              {item.key === 'cart' && cartCount > 0 && (
                <span className="ml-auto bg-yellow-400 text-green-900 text-xs w-5 h-5 rounded-full flex items-center justify-center font-black">{cartCount}</span>
              )}
              {item.key === 'orders' && pendingOrders > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{pendingOrders}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-green-800">
          <button onClick={() => { logout(); navigate('/login'); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-all">
            <span>🚪</span><span>{t('buyer.signOut')}</span>
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4 flex-shrink-0">
          <button className="lg:hidden text-gray-500 hover:text-gray-700" onClick={() => setSidebarOpen(true)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{NAV.find(n => n.key === tab)?.label}</h1>
            <p className="text-xs text-gray-400">{t('buyer.dashboard')}</p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">

          {/* OVERVIEW */}
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: t('buyer.totalOrders'), value: orders.length, icon: '📦', color: 'text-blue-600' },
                  { label: t('buyer.pendingPayment'), value: pendingOrders, icon: '⏳', color: 'text-yellow-600' },
                  { label: t('buyer.cartItems'), value: cartCount, icon: '🛒', color: 'text-green-700' },
                ].map(stat => (
                  <div key={stat.label} className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
                    <span className="text-3xl">{stat.icon}</span>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                      <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-800">{t('buyer.recentOrders')}</h2>
                  <button onClick={() => setTab('orders')} className="text-xs text-green-700 hover:underline">{t('buyer.viewAll')}</button>
                </div>
                {orders.length === 0 ? <p className="text-sm text-gray-400">{t('buyer.noOrders')}</p> :
                  orders.slice(0, 5).map(order => (
                    <div key={order.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-700">#{order.id.slice(0, 8)}</p>
                        <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-800">{order.totalETB.toLocaleString()} ETB</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {/* SHOP */}
          {tab === 'shop' && (
            <div>
              <form onSubmit={e => { e.preventDefault(); setShopPage(1); fetchShop(1, shopQuery, shopCategory); }}
                className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-40">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
                  <input value={shopQuery} onChange={e => setShopQuery(e.target.value)} placeholder={t('buyer.searchProducts')} className={inputCls} />
                </div>
                <div className="w-40">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                  <select value={shopCategory} onChange={e => setShopCategory(e.target.value)} className={inputCls}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c || t('buyer.allCategories')}</option>)}
                  </select>
                </div>
                <button type="submit" className="bg-green-800 hover:bg-green-900 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors">Search</button>
              </form>
              {shopLoading && <p className="text-center text-gray-400 py-12">Loading...</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {shopProducts.map(p => (
                  <div key={p.id} className="bg-white rounded-xl shadow-sm overflow-hidden group">
                    <div className="h-40 bg-gray-100 overflow-hidden">
                      {p.images[0] ? <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        : <div className="w-full h-full flex items-center justify-center text-4xl">��</div>}
                    </div>
                    <div className="p-3">
                      <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">{p.category}</span>
                      <p className="font-semibold text-gray-800 text-sm truncate mt-1.5">{p.title}</p>
                      <p className="text-green-800 font-bold text-sm mt-0.5">{p.priceETB.toLocaleString()} ETB</p>
                      <button onClick={() => addToCart(p.id)} disabled={addingToCart === p.id}
                        className="mt-2 w-full bg-green-800 hover:bg-green-900 text-white text-xs font-bold py-2 rounded-lg transition-colors disabled:opacity-60">
                        {addingToCart === p.id ? t('buyer.adding') : `🛒 ${t('buyer.addToCart')}`}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {Math.ceil(shopTotal / 24) > 1 && (
                <div className="flex justify-center items-center gap-4 mt-8">
                  <button onClick={() => { setShopPage(p => Math.max(1, p - 1)); fetchShop(shopPage - 1, shopQuery, shopCategory); }} disabled={shopPage === 1}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50">Prev</button>
                  <span className="text-sm text-gray-500">Page {shopPage} of {Math.ceil(shopTotal / 24)}</span>
                  <button onClick={() => { setShopPage(p => p + 1); fetchShop(shopPage + 1, shopQuery, shopCategory); }} disabled={shopPage >= Math.ceil(shopTotal / 24)}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50">Next</button>
                </div>
              )}
            </div>
          )}

          {/* CART */}
          {tab === 'cart' && (
            <div className="max-w-2xl space-y-3">
              {cartItems.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                  <p className="text-4xl mb-3">🛒</p>
                  <p className="text-sm">{t('buyer.cartEmpty')}</p>
                  <button onClick={() => setTab('shop')} className="mt-3 text-green-700 text-sm hover:underline">{t('buyer.browseProducts')}</button>
                </div>
              )}
              {cartItems.map(item => {
                const p = cartProducts[item.productId];
                return (
                  <div key={item.productId} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
                    {p?.images?.[0] ? <img src={p.images[0]} alt={p.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                      : <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">📦</div>}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{p?.title ?? item.productId}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Qty: {item.quantity}</p>
                      <p className="text-sm font-bold text-green-800 mt-0.5">{((p?.priceETB ?? 0) * item.quantity).toLocaleString()} ETB</p>
                    </div>
                    <button onClick={() => removeFromCart(item.productId)} className="text-xs text-red-500 hover:text-red-700 border border-red-200 px-3 py-1.5 rounded-lg flex-shrink-0">Remove</button>
                  </div>
                );
              })}
              {cartItems.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-6 mt-2">
                  <div className="flex justify-between items-center mb-4 text-lg font-bold">
                    <span className="text-gray-700">Total</span>
                    <span className="text-green-800">{cartTotal.toLocaleString()} ETB</span>
                  </div>
                  {checkoutError && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-2 mb-3">{checkoutError}</div>}
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Payment Method</label>
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as typeof paymentMethod)} className={inputCls + ' mb-4'}>
                    <option value="telebirr">Telebirr</option>
                    <option value="cbe_birr">CBE Birr</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <p className="text-xs font-semibold text-green-800 mb-1">📋 Send payment to:</p>
                    <p className="text-sm font-mono font-bold text-green-900">{PLATFORM_ACCOUNT[paymentMethod]}</p>
                    <p className="text-xs text-green-700 mt-1">Upload your payment screenshot on the Orders page after checkout.</p>
                  </div>
                  <button onClick={handleCheckout} disabled={checkoutLoading}
                    className="w-full bg-green-800 hover:bg-green-900 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50">
                    {checkoutLoading ? t('buyer.processing') : t('buyer.checkout')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ORDERS */}
          {tab === 'orders' && (
            <div className="space-y-4 max-w-2xl">
              {orders.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                  <p className="text-4xl mb-3">📦</p>
                  <p className="text-sm">{t('buyer.noOrders')}</p>
                </div>
              )}
              {orders.map(order => (
                <div key={order.id} className="bg-white rounded-xl shadow-sm p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-gray-400 font-mono">#{order.id.slice(0, 8)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{new Date(order.createdAt).toLocaleDateString()} · {order.paymentMethod.replace(/_/g, ' ')}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="space-y-2 mb-3">
                    {order.items.map(item => {
                      const p = productMap[item.productId];
                      return (
                        <div key={item.productId} className="flex items-center gap-3">
                          {p?.images?.[0] ? <img src={p.images[0]} alt={p.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                            : <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">📦</div>}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{p?.title ?? 'Product'}</p>
                            <p className="text-xs text-gray-500">Qty: {item.quantity} × {item.unitPriceETB.toLocaleString()} ETB</p>
                          </div>
                          <p className="text-sm font-semibold text-gray-700 flex-shrink-0">{(item.unitPriceETB * item.quantity).toLocaleString()} ETB</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-gray-100 mb-3">
                    <span className="text-sm text-gray-500">Total</span>
                    <span className="font-bold text-green-800">{order.totalETB.toLocaleString()} ETB</span>
                  </div>
                  {order.status === 'pending_payment' && !order.paymentProof && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm font-semibold text-yellow-800 mb-2">{t('buyer.paymentRequired')}</p>
                      <div className="bg-white border border-yellow-300 rounded-lg px-3 py-2 mb-3">
                        <p className="text-xs text-gray-500 mb-0.5">{t('buyer.sendTo')}</p>
                        <p className="text-sm font-mono font-bold text-gray-800">{PLATFORM_ACCOUNT[order.paymentMethod] ?? order.paymentMethod}</p>
                      </div>
                      <div className="mb-3">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">{t('buyer.transactionId')} <span className="text-red-500">*</span></label>
                        <input
                          value={txnIds[order.id] ?? ''}
                          onChange={e => setTxnIds(prev => ({ ...prev, [order.id]: e.target.value }))}
                          placeholder={t('buyer.transactionIdPlaceholder')}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        />
                        <p className="text-xs text-gray-400 mt-1">{t('buyer.transactionIdNote')}</p>
                      </div>
                      <input type="file" accept="image/*" className="hidden"
                        ref={el => { fileRefs.current[order.id] = el; }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleProofUpload(order.id, f); }} />
                      <button onClick={() => fileRefs.current[order.id]?.click()} disabled={uploadingId === order.id || !txnIds[order.id]?.trim()}
                        className="w-full bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50">
                        {uploadingId === order.id ? t('buyer.uploading') : `📎 ${t('buyer.uploadScreenshot')}`}
                      </button>
                    </div>
                  )}
                  {order.status !== 'pending_payment' && order.paymentProof && (
                    <div className="mt-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                      <p className="text-xs font-semibold text-green-800">
                        {order.status === 'paid' ? '✅ Payment approved by admin — awaiting shipment' :
                         order.status === 'shipped' ? '🚚 Order shipped — awaiting delivery' :
                         order.status === 'delivered' ? '📦 Order delivered' :
                         'Payment proof submitted'}
                      </p>
                    </div>
                  )}
                  {order.status === 'pending_payment' && order.paymentProof && (
                    <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                      <p className="text-xs font-semibold text-blue-800">⏳ {t('buyer.proofPending')}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
