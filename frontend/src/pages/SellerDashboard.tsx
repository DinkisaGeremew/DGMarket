import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../lib/api';

interface Product { id: string; title: string; priceETB: number; category: string; isActive: boolean; images: string[]; }
interface OrderItem { productId: string; quantity: number; unitPriceETB: number; }
interface Order { id: string; buyerId: string; items: OrderItem[]; totalETB: number; status: string; paymentMethod: string; createdAt: string; paymentProof?: string; }

const CATEGORIES = ['Shoes', 'Cars', 'Motorcycles', 'Electronics', 'Clothing', 'Food', 'Furniture', 'Agriculture', 'Beauty', 'Other'];
const STATUS_COLORS: Record<string, string> = {
  pending_payment: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};
const NEXT_STATUS: Record<string, string> = {
  paid: 'shipped',
  shipped: 'delivered',
};

type Tab = 'overview' | 'listings' | 'add-product' | 'orders' | 'marketplace' | 'settings-verify';

function ProofModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <p className="font-semibold text-gray-800">Payment Proof</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <img src={src} alt="Payment proof" className="w-full rounded-lg object-contain max-h-[70vh]" />
        <a href={src} download="payment-proof.jpg" className="mt-3 block text-center text-sm text-green-700 hover:underline">
          Download image
        </a>
      </div>
    </div>
  );
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 800;
      const scale = img.width > MAX ? MAX / img.width : 1;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = reject;
    img.src = url;
  });
}

const NAV_ITEMS: { key: Tab; icon: string; label: string }[] = [
  { key: 'overview',     icon: '📊', label: 'seller.overview' },
  { key: 'listings',     icon: '📦', label: 'seller.listings' },
  { key: 'add-product',  icon: '➕', label: 'seller.addProduct' },
  { key: 'orders',       icon: '🛒', label: 'seller.incomingOrders' },
  { key: 'marketplace',  icon: '🏪', label: 'seller.browseMarketplace' },
];

export default function SellerDashboard() {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>(() => {
    const params = new URLSearchParams(location.search);
    return params.get('tab') === 'orders' ? 'orders' : 'overview';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [form, setForm] = useState({ title: '', description: '', priceETB: '', category: 'Shoes' });
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [proofModal, setProofModal] = useState<string | null>(null);

  // Verification form state
  const [vStep, setVStep] = useState<'fan' | 'fan-otp' | 'docs'>('fan');
  const [vFan, setVFan] = useState('');
  const [vFanOtp, setVFanOtp] = useState('');
  const [vFanDevCode, setVFanDevCode] = useState('');
  const [vIdType, setVIdType] = useState<'national_id' | 'passport'>('national_id');
  const [vIdNumber, setVIdNumber] = useState('');
  const [vIdFront, setVIdFront] = useState('');
  const [vIdBack, setVIdBack] = useState('');
  const [vLoading, setVLoading] = useState(false);
  const [vError, setVError] = useState('');
  const [vSuccess, setVSuccess] = useState('');
  const vFrontRef = useRef<HTMLInputElement>(null);
  const vBackRef = useRef<HTMLInputElement>(null);

  // Marketplace browse state
  const [mktProducts, setMktProducts] = useState<Product[]>([]);
  const [mktQuery, setMktQuery] = useState('');
  const [mktCategory, setMktCategory] = useState('');
  const [mktTotal, setMktTotal] = useState(0);
  const [mktPage, setMktPage] = useState(1);
  const [mktLoading, setMktLoading] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'seller') { navigate('/login'); return; }
    refreshListings();
    refreshOrders();
  }, [user]);

  const refreshListings = async () => {
    const r = await api.get('/products');
    setProducts(r.data.items.filter((p: Product & { sellerId: string }) => p.sellerId === user!.id));
  };

  const refreshOrders = async () => {
    try {
      const r = await api.get(`/orders/seller/${user!.id}`);
      setOrders(r.data);
    } catch { /* no orders yet */ }
  };

  const fetchMarketplace = async (p = mktPage, q = mktQuery, cat = mktCategory) => {
    setMktLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('query', q);
      if (cat) params.set('category', cat);
      params.set('page', String(p));
      const r = await api.get(`/products?${params}`);
      setMktProducts(r.data.items);
      setMktTotal(r.data.total);
    } catch { setMktProducts([]); }
    finally { setMktLoading(false); }
  };

  useEffect(() => {
    if (tab === 'marketplace') fetchMarketplace(mktPage, mktQuery, mktCategory);
  }, [tab, mktPage]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const previews = await Promise.all(files.map(readFileAsDataURL));
    setImagePreviews((prev) => [...prev, ...previews].slice(0, 5));
  };

  const removeImage = (index: number) => setImagePreviews((prev) => prev.filter((_, i) => i !== index));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (imagePreviews.length === 0) { setError(t('seller.addAtLeastOneImage')); return; }
    setLoading(true);
    try {
      await api.post('/products', {
        sellerId: user!.id,
        title: form.title,
        description: form.description,
        priceETB: parseFloat(form.priceETB),
        category: form.category,
        images: imagePreviews,
      });
      setSuccess(t('seller.createdSuccess'));
      setForm({ title: '', description: '', priceETB: '', category: 'Shoes' });
      setImagePreviews([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await refreshListings();
      setTab('listings');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? t('common.error'));
    } finally { setLoading(false); }
  };

  const handleDeactivate = async (id: string) => {
    await api.delete(`/products/${id}`, { data: { sellerId: user!.id } });
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, isActive: false } : p));
  };

  const handleAdvanceStatus = async (orderId: string, nextStatus: string) => {
    await api.put(`/orders/${orderId}/status`, { status: nextStatus });
    await refreshOrders();
  };

  const handleFanSendOtp = async (e: React.FormEvent) => {
    e.preventDefault(); setVError(''); setVLoading(true);
    try {
      const r = await api.post('/auth/fan-otp/send', { fanNumber: vFan });
      setVFanDevCode(r.data.devCode ?? '');
      setVStep('fan-otp');
    } catch (err: unknown) {
      setVError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to send OTP.');
    } finally { setVLoading(false); }
  };

  const handleFanVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault(); setVError(''); setVLoading(true);
    try {
      await api.post('/auth/fan-otp/verify', { fanNumber: vFan, code: vFanOtp });
      setVStep('docs');
    } catch (err: unknown) {
      setVError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Invalid OTP.');
    } finally { setVLoading(false); }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setVError(''); setVSuccess('');
    if (!vIdFront) { setVError('Please upload the front of your ID.'); return; }
    if (!vIdBack) { setVError('Please upload the back of your ID.'); return; }
    setVLoading(true);
    try {
      await api.post('/auth/verify-identity', {
        idType: vIdType, idNumber: vIdNumber,
        idImageFront: vIdFront, idImageBack: vIdBack, fanNumber: vFan,
      });
      setVSuccess('Verification submitted! Our team will review it within 24 hours.');
    } catch (err: unknown) {
      setVError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Something went wrong.');
    } finally { setVLoading(false); }
  };

  const pendingCount = orders.filter((o) => o.status === 'paid').length;
  const totalRevenue = orders.filter((o) => o.status === 'delivered').reduce((s, o) => s + o.totalETB, 0);
  const activeListings = products.filter((p) => p.isActive).length;

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 bg-gray-50 focus:bg-white transition-all';

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {proofModal && <ProofModal src={proofModal} onClose={() => setProofModal(null)} />}

      {/* ── SIDEBAR ── */}
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-green-900 text-white z-30 flex flex-col
        transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:flex lg:flex-shrink-0
      `}>
        {/* Store identity */}
        <div className="px-6 py-6 border-b border-green-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center text-green-900 font-black text-lg">
              {(user?.businessName ?? user?.name ?? 'S')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">{user?.businessName ?? user?.name ?? 'My Store'}</p>
              <p className="text-green-300 text-xs">{t('seller.account')}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => { setTab(item.key); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-left ${
                tab === item.key
                  ? 'bg-white/15 text-white'
                  : 'text-green-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{t(item.label)}</span>
              {item.key === 'orders' && pendingCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}

          {/* Settings group */}
          <div className="pt-3">
            <p className="px-4 text-xs font-bold text-green-500 uppercase tracking-widest mb-1">{t('admin.settings')}</p>
            <button
              onClick={() => { setTab('settings-verify'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-left ${
                tab === 'settings-verify'
                  ? 'bg-white/15 text-white'
                  : 'text-green-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="text-base">🪪</span>
              <span>{t('seller.verifyAccount')}</span>
              {/* Status badge */}
              {user?.verificationStatus === 'verified' && (
                <span className="ml-auto text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">Verified</span>
              )}
              {user?.verificationStatus === 'pending' && (
                <span className="ml-auto text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full">Pending</span>
              )}
              {(!user?.verificationStatus || user.verificationStatus === 'unverified') && (
                <span className="ml-auto text-xs bg-red-500/80 text-white px-2 py-0.5 rounded-full">!</span>
              )}
            </button>
          </div>
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-green-800">
          <button onClick={() => { logout(); navigate('/login'); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-all">
            <span>🚪</span> <span>{t('seller.signOut')}</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4 flex-shrink-0">
          <button className="lg:hidden text-gray-500 hover:text-gray-700" onClick={() => setSidebarOpen(true)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {tab === 'settings-verify' ? t('seller.verifyAccount') : t(NAV_ITEMS.find((n) => n.key === tab)?.label ?? 'seller.overview')}
            </h1>
            <p className="text-xs text-gray-400">{t('seller.dashboard')}</p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: t('seller.activeListings'), value: activeListings, icon: '📦', color: 'text-blue-600' },
                  { label: t('seller.pendingOrders'), value: pendingCount, icon: '⏳', color: 'text-yellow-600' },
                  { label: t('seller.totalRevenue'), value: `${totalRevenue.toLocaleString()} ETB`, icon: '💰', color: 'text-green-700' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
                    <span className="text-3xl">{stat.icon}</span>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                      <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent orders */}
              <div className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-800">{t('seller.recentOrders')}</h2>
                  <button onClick={() => setTab('orders')} className="text-xs text-green-700 hover:underline">{t('seller.viewAll')}</button>
                </div>
                {orders.length === 0
                  ? <p className="text-sm text-gray-400">{t('seller.noOrdersYet')}</p>
                  : orders.slice(0, 5).map((order) => (
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

          {/* ── MY LISTINGS ── */}
          {tab === 'listings' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">{products.length} product{products.length !== 1 ? 's' : ''}</p>
                <button onClick={() => setTab('add-product')}
                  className="bg-green-800 hover:bg-green-900 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors">
                  + Add Product
                </button>
              </div>
              {products.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                  <p className="text-4xl mb-3">📦</p>
                  <p className="text-sm">No listings yet.</p>
                  <button onClick={() => setTab('add-product')} className="mt-3 text-green-700 text-sm hover:underline">Add your first product</button>
                </div>
              )}
              {products.map((p) => (
                <div key={p.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
                  {p.images?.[0]
                    ? <img src={p.images[0]} alt={p.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                    : <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">📷</div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{p.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{p.priceETB.toLocaleString()} ETB · {p.category}</p>
                    <span className={`text-xs font-bold ${p.isActive ? 'text-green-600' : 'text-red-500'}`}>
                      {p.isActive ? '● Active' : '● Inactive'}
                    </span>
                  </div>
                  {p.isActive && (
                    <button onClick={() => handleDeactivate(p.id)}
                      className="text-xs text-red-500 hover:text-red-700 border border-red-200 px-3 py-1.5 rounded-lg flex-shrink-0">
                      Deactivate
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── ADD PRODUCT ── */}
          {tab === 'add-product' && (
            <div className="max-w-xl">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-base font-bold text-gray-800 mb-5">{t('product.create')}</h2>
                {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-2 mb-4">{error}</div>}
                {success && <div className="bg-green-50 text-green-700 text-sm rounded-lg px-4 py-2 mb-4">{success}</div>}
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t('seller.title')}</label>
                    <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required
                      className={inputCls} placeholder={t('seller.titlePlaceholder')} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t('product.description')}</label>
                    <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required rows={3}
                      className={inputCls + ' resize-none'} placeholder={t('seller.descriptionPlaceholder')} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t('product.price')} (ETB)</label>
                      <input type="number" min="1" value={form.priceETB} onChange={(e) => setForm({ ...form, priceETB: e.target.value })} required
                        className={inputCls} placeholder="e.g. 1500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t('product.category')}</label>
                      <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls}>
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t('product.imagesUpTo')}</label>
                    <div onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-green-600 hover:bg-green-50 transition-colors">
                      <div className="text-3xl mb-2">📷</div>
                      <p className="text-sm text-gray-500">{t('product.clickToBrowse')}</p>
                      <p className="text-xs text-gray-400 mt-1">{t('product.imageFormats')}</p>
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
                    {imagePreviews.length > 0 && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {imagePreviews.map((src, i) => (
                          <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                            <img src={src} alt={`preview-${i}`} className="w-full h-full object-cover" />
                            <button type="button" onClick={() => removeImage(i)}
                              className="absolute top-0 right-0 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-bl-lg">×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full bg-green-800 hover:bg-green-900 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50">
                    {loading ? t('seller.creating') : t('product.create')}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ── ORDERS ── */}
          {tab === 'orders' && (
            <div className="space-y-4">
              {orders.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                  <p className="text-4xl mb-3">🛒</p>
                  <p className="text-sm">{t('seller.noOrders')}</p>
                </div>
              )}
              {orders.map((order) => (
                <div key={order.id} className="bg-white rounded-xl shadow-sm p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-gray-400 font-mono">#{order.id.slice(0, 8)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString()} · {order.paymentMethod.replace('_', ' ')}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="space-y-1 mb-3">
                    {order.items.map((item) => {
                      const p = products.find((pr) => pr.id === item.productId);
                      return (
                        <div key={item.productId} className="flex justify-between text-sm">
                          <span className="text-gray-700">{p?.title ?? item.productId} × {item.quantity}</span>
                          <span className="text-gray-600">{(item.unitPriceETB * item.quantity).toLocaleString()} ETB</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="font-bold text-green-800">{order.totalETB.toLocaleString()} ETB</span>
                    <div className="flex items-center gap-2">
                      {order.paymentProof && (
                        <button onClick={() => setProofModal(order.paymentProof!)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium border border-blue-200 px-3 py-1.5 rounded-lg">
                          {t('seller.viewProof')}
                        </button>
                      )}
                      {NEXT_STATUS[order.status] && (
                        <button onClick={() => handleAdvanceStatus(order.id, NEXT_STATUS[order.status])}
                          className="bg-green-800 hover:bg-green-900 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
                          {t('seller.markAs')} {NEXT_STATUS[order.status]}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── MARKETPLACE ── */}
          {tab === 'marketplace' && (
            <div>
              {/* Search bar */}
              <form onSubmit={(e) => { e.preventDefault(); setMktPage(1); fetchMarketplace(1, mktQuery, mktCategory); }}
                className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-40">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
                  <input value={mktQuery} onChange={(e) => setMktQuery(e.target.value)}
                    placeholder="Search products..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700" />
                </div>
                <div className="w-40">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                  <select value={mktCategory} onChange={(e) => setMktCategory(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700">
                    <option value="">All Categories</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <button type="submit" className="bg-green-800 hover:bg-green-900 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors">
                  Search
                </button>
              </form>

              {mktLoading && <p className="text-center text-gray-400 py-12">Loading...</p>}

              {!mktLoading && mktProducts.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                  <p className="text-4xl mb-3">🔍</p>
                  <p className="text-sm">No products found.</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {mktProducts.map((p) => (
                  <a key={p.id} href={`/products/${p.id}`} target="_blank" rel="noreferrer"
                    className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                    <div className="h-40 bg-gray-100 overflow-hidden">
                      {p.images[0]
                        ? <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        : <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>}
                    </div>
                    <div className="p-3">
                      <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">{p.category}</span>
                      <p className="font-semibold text-gray-800 text-sm truncate mt-1.5">{p.title}</p>
                      <p className="text-green-800 font-bold text-sm mt-0.5">{p.priceETB.toLocaleString()} ETB</p>
                    </div>
                  </a>
                ))}
              </div>

              {/* Pagination */}
              {Math.ceil(mktTotal / 24) > 1 && (
                <div className="flex justify-center items-center gap-4 mt-8">
                  <button onClick={() => setMktPage((p) => Math.max(1, p - 1))} disabled={mktPage === 1}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50">
                    Prev
                  </button>
                  <span className="text-sm text-gray-500">Page {mktPage} of {Math.ceil(mktTotal / 24)}</span>
                  <button onClick={() => setMktPage((p) => p + 1)} disabled={mktPage >= Math.ceil(mktTotal / 24)}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50">
                    Next
                  </button>
                </div>
              )}
            </div>
          )}


          {/* ── VERIFY ACCOUNT ── */}
          {tab === 'settings-verify' && (
            <div className="max-w-lg">
              {user?.verificationStatus === 'verified' && (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-4">
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className="font-bold text-green-800 text-sm">Account Verified</p>
                    <p className="text-green-600 text-xs mt-0.5">Your identity has been confirmed. You can sell freely.</p>
                  </div>
                </div>
              )}
              {user?.verificationStatus === 'pending' && (
                <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-4">
                  <span className="text-2xl">⏳</span>
                  <div>
                    <p className="font-bold text-yellow-800 text-sm">Verification Under Review</p>
                    <p className="text-yellow-700 text-xs mt-0.5">We received your documents. Review takes up to 24 hours.</p>
                  </div>
                </div>
              )}
              {user?.verificationStatus === 'rejected' && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4 mb-4">
                  <span className="text-2xl">❌</span>
                  <p className="font-bold text-red-800 text-sm">Verification Rejected — please resubmit below.</p>
                </div>
              )}

              {user?.verificationStatus !== 'verified' && user?.verificationStatus !== 'pending' && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="font-bold text-gray-800 text-base mb-1">Identity Verification</h2>
                  <p className="text-xs text-gray-500 mb-5">Complete all 3 steps to verify your seller account.</p>

                  {/* Step indicator */}
                  <div className="flex items-center mb-6">
                    {[
                      { n: 1, label: 'FAN Number', s: 'fan' },
                      { n: 2, label: 'OTP Confirm', s: 'fan-otp' },
                      { n: 3, label: 'ID Documents', s: 'docs' },
                    ].map((item, i) => (
                      <div key={item.s} className="flex items-center flex-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                          vStep === item.s ? 'bg-green-800 text-white' :
                          (i === 0 && (vStep === 'fan-otp' || vStep === 'docs')) || (i === 1 && vStep === 'docs')
                            ? 'bg-green-200 text-green-800' : 'bg-gray-100 text-gray-400'
                        }`}>{item.n}</div>
                        <span className="text-xs text-gray-500 ml-1.5 hidden sm:block">{item.label}</span>
                        {i < 2 && <div className="flex-1 h-px bg-gray-200 mx-2" />}
                      </div>
                    ))}
                  </div>

                  {vError && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-2 mb-4">{vError}</div>}
                  {vSuccess && <div className="bg-green-50 text-green-700 text-sm rounded-lg px-4 py-2 mb-4">{vSuccess}</div>}

                  {/* Step 1: FAN */}
                  {vStep === 'fan' && (
                    <form onSubmit={handleFanSendOtp} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Fayda Authentication Number (FAN)</label>
                        <input value={vFan} onChange={(e) => setVFan(e.target.value)} required
                          placeholder="e.g. 1234567890123" className={inputCls} />
                        <p className="text-xs text-gray-400 mt-1">Your 13-digit national ID number from the Fayda system.</p>
                      </div>
                      <button type="submit" disabled={vLoading}
                        className="w-full bg-green-800 hover:bg-green-900 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50">
                        {vLoading ? 'Sending OTP...' : 'Send OTP to My Phone'}
                      </button>
                    </form>
                  )}

                  {/* Step 2: FAN OTP */}
                  {vStep === 'fan-otp' && (
                    <form onSubmit={handleFanVerifyOtp} className="space-y-4">
                      <div className="bg-blue-50 border-l-4 border-blue-400 px-4 py-3 text-sm text-blue-700 rounded-r-lg">
                        OTP sent to the phone linked to FAN <strong>{vFan}</strong>.
                        {vFanDevCode && <span className="ml-2 font-mono font-bold">(dev: {vFanDevCode})</span>}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Enter OTP Code</label>
                        <input value={vFanOtp} onChange={(e) => setVFanOtp(e.target.value)} required
                          maxLength={6} placeholder="6-digit code"
                          className={inputCls + ' text-center text-2xl tracking-[0.4em] font-mono'} />
                      </div>
                      <div className="flex gap-3">
                        <button type="button" onClick={() => { setVStep('fan'); setVError(''); }}
                          className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-lg text-sm hover:bg-gray-50">
                          Back
                        </button>
                        <button type="submit" disabled={vLoading}
                          className="flex-1 bg-green-800 hover:bg-green-900 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50">
                          {vLoading ? 'Verifying...' : 'Confirm OTP'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Step 3: ID documents */}
                  {vStep === 'docs' && (
                    <form onSubmit={handleVerifySubmit} className="space-y-5">
                      <div className="bg-green-50 border-l-4 border-green-500 px-4 py-2 text-sm text-green-700 rounded-r-lg">
                        ✅ FAN verified. Now upload your ID documents.
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-2">Document Type</label>
                        <div className="grid grid-cols-2 gap-3">
                          {(['national_id', 'passport'] as const).map((type) => (
                            <button key={type} type="button" onClick={() => setVIdType(type)}
                              className={`py-3 rounded-lg border-2 text-sm font-semibold transition-all ${
                                vIdType === type ? 'border-green-700 bg-green-700 text-white' : 'border-gray-200 text-gray-500 hover:border-gray-400'
                              }`}>
                              {type === 'national_id' ? '🪪 National ID' : '📘 Passport'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                          {vIdType === 'national_id' ? 'National ID Number' : 'Passport Number'}
                        </label>
                        <input value={vIdNumber} onChange={(e) => setVIdNumber(e.target.value)} required
                          placeholder={vIdType === 'national_id' ? 'e.g. ETH-123456789' : 'e.g. EP1234567'}
                          className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Front of Document</label>
                        {vIdFront ? (
                          <div className="relative rounded-lg overflow-hidden border border-gray-200">
                            <img src={vIdFront} alt="front" className="w-full max-h-40 object-contain bg-gray-50" />
                            <button type="button" onClick={() => setVIdFront('')}
                              className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-lg">Remove</button>
                          </div>
                        ) : (
                          <div onClick={() => vFrontRef.current?.click()}
                            className="border-2 border-dashed border-gray-200 rounded-lg p-5 text-center cursor-pointer hover:border-green-600 hover:bg-green-50 transition-colors">
                            <p className="text-2xl mb-1">📄</p>
                            <p className="text-sm text-gray-500">Click to upload front side</p>
                          </div>
                        )}
                        <input ref={vFrontRef} type="file" accept="image/*" className="hidden"
                          onChange={async (e) => { const f = e.target.files?.[0]; if (f) setVIdFront(await readFileAsDataURL(f)); }} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Back of Document</label>
                        {vIdBack ? (
                          <div className="relative rounded-lg overflow-hidden border border-gray-200">
                            <img src={vIdBack} alt="back" className="w-full max-h-40 object-contain bg-gray-50" />
                            <button type="button" onClick={() => setVIdBack('')}
                              className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-lg">Remove</button>
                          </div>
                        ) : (
                          <div onClick={() => vBackRef.current?.click()}
                            className="border-2 border-dashed border-gray-200 rounded-lg p-5 text-center cursor-pointer hover:border-green-600 hover:bg-green-50 transition-colors">
                            <p className="text-2xl mb-1">📄</p>
                            <p className="text-sm text-gray-500">Click to upload back side</p>
                          </div>
                        )}
                        <input ref={vBackRef} type="file" accept="image/*" className="hidden"
                          onChange={async (e) => { const f = e.target.files?.[0]; if (f) setVIdBack(await readFileAsDataURL(f)); }} />
                      </div>
                      <button type="submit" disabled={vLoading}
                        className="w-full bg-green-800 hover:bg-green-900 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50">
                        {vLoading ? 'Submitting...' : 'Submit for Verification'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
