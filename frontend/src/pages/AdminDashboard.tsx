import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

interface Metrics {
  totalUsers: number; activeListings: number; totalOrders: number;
  totalCommissionETB: number; pendingPayoutETB: number; pendingPayoutCount: number;
  disputedCount: number; ordersNeedingAttention: number;
}
interface AdminUser { id: string; email?: string; phone?: string; role: string; isActive: boolean; createdAt: string; }
interface AdminProduct { id: string; title: string; priceETB: number; category: string; isActive: boolean; sellerId: string; createdAt: string; }
interface AdminOrder {
  id: string; buyerId: string; sellerId: string; totalETB: number;
  commissionETB: number; sellerPayoutETB: number; status: string;
  paymentMethod: string; paymentProof?: string; transactionId?: string; payoutStatus: string;
  payoutNote?: string; createdAt: string;
}

type Section = 'dashboard' | 'orders' | 'products' | 'users' | 'add-user' |
               'payments' | 'delivery' | 'reports' | 'settings' | 'profile' | 'change-password' | 'verifications';

const STATUS_PILL: Record<string, string> = {
  pending_payment: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  paid: 'bg-blue-100 text-blue-800 border border-blue-200',
  shipped: 'bg-purple-100 text-purple-800 border border-purple-200',
  delivered: 'bg-green-100 text-green-800 border border-green-200',
  cancelled: 'bg-red-100 text-red-800 border border-red-200',
};

const NAV_ITEMS: { key: Section; label: string; icon: string; parent?: Section }[] = [
  { key: 'dashboard',       label: 'admin.dashboard',     icon: '▣' },
  { key: 'orders',          label: 'admin.orders',         icon: '◈' },
  { key: 'products',        label: 'admin.products',       icon: '◉' },
  { key: 'users',           label: 'admin.users',          icon: '◎' },
  { key: 'add-user',        label: 'admin.addUser',        icon: '⊕', parent: 'users' },
  { key: 'verifications',   label: 'admin.verifications',  icon: '🪪' },
  { key: 'payments',        label: 'admin.payments',       icon: '◆' },
  { key: 'delivery',        label: 'admin.delivery',       icon: '◀' },
  { key: 'reports',         label: 'admin.reports',        icon: '◐' },
  { key: 'settings',        label: 'admin.settings',       icon: '◍' },
  { key: 'profile',         label: 'admin.profile',        icon: '◌', parent: 'settings' },
  { key: 'change-password', label: 'admin.changePassword', icon: '◌', parent: 'settings' },
];

function Badge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full ${STATUS_PILL[status] ?? 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function ProofModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white max-w-lg w-full p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <p className="font-black text-gray-900 uppercase tracking-widest text-xs">Payment Proof</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none font-bold">&times;</button>
        </div>
        <img src={src} alt="proof" className="w-full object-contain max-h-[70vh]" />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, accent }: { icon: string; label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div className={`${accent} text-white p-5 relative overflow-hidden`}>
      <div className="absolute right-4 top-4 text-white/10 text-6xl font-black leading-none select-none">{icon}</div>
      <p className="text-xs font-bold uppercase tracking-widest opacity-75 mb-2">{label}</p>
      <p className="text-3xl font-black leading-none">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [section, setSection] = useState<Section>('dashboard');
  const [usersOpen, setUsersOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [proofModal, setProofModal] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [verifications, setVerifications] = useState<AdminUser[]>([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState('all');
  const [productSearch, setProductSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'buyer', phone: '' });
  const [addMsg, setAddMsg] = useState('');
  const [profile, setProfile] = useState({ email: user?.email ?? '' });
  const [profileMsg, setProfileMsg] = useState('');
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');

  const inp = 'w-full border border-gray-200 bg-gray-50 focus:bg-white px-4 py-3 text-sm focus:outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700 transition-all';

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/login'); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [mRes, oRes, uRes, pRes] = await Promise.all([
        api.get('/admin/dashboard'), api.get('/admin/orders'),
        api.get('/admin/users'), api.get('/admin/products'),
      ]);
      setMetrics(mRes.data); setOrders(oRes.data ?? []);
      setUsers(uRes.data ?? []); setProducts(pRes.data ?? []);
    } catch { /* ignore */ }
    // load verifications separately so it doesn't block main data
    try {
      const vRes = await api.get('/admin/verifications');
      setVerifications(vRes.data ?? []);
    } catch { /* ignore */ }
  };

  const handleRelease = async (id: string) => {
    setActionLoading(id);
    try { await api.post(`/admin/orders/${id}/release-payout`, { note: 'Released by admin' }); await loadData(); }
    catch (e: unknown) { alert((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed'); }
    finally { setActionLoading(null); }
  };

  const handleApprovePayment = async (id: string) => {
    setActionLoading(id);
    try { await api.post(`/admin/orders/${id}/approve-payment`); await loadData(); }
    catch (e: unknown) { alert((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed'); }
    finally { setActionLoading(null); }
  };

  const handleDeactivateUser = async (id: string) => { try { await api.delete(`/admin/users/${id}`); await loadData(); } catch { /* ignore */ } };
  const handleDeactivateProduct = async (id: string) => { try { await api.delete(`/admin/listings/${id}`); await loadData(); } catch { /* ignore */ } };

  const handleApproveVerification = async (id: string) => {
    setActionLoading(id);
    try { await api.post(`/admin/verifications/${id}/approve`); await loadData(); }
    catch { /* ignore */ } finally { setActionLoading(null); }
  };

  const handleRejectVerification = async (id: string) => {
    const reason = prompt('Rejection reason (shown to seller):');
    if (!reason) return;
    setActionLoading(id);
    try { await api.post(`/admin/verifications/${id}/reject`, { reason }); await loadData(); }
    catch { /* ignore */ } finally { setActionLoading(null); }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault(); setAddMsg('');
    try { await api.post('/auth/register', newUser); setAddMsg(t('admin.userCreated')); setNewUser({ email: '', password: '', role: 'buyer', phone: '' }); await loadData(); }
    catch (e: unknown) { setAddMsg((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? t('common.error')); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault(); setPwMsg('');
    if (pwForm.next !== pwForm.confirm) { setPwMsg(t('admin.passwordsNoMatch')); return; }
    if (pwForm.next.length < 6) { setPwMsg(t('admin.minChars')); return; }
    try { await api.post('/auth/change-password', { currentPassword: pwForm.current, newPassword: pwForm.next }); setPwMsg(t('admin.passwordChanged')); setPwForm({ current: '', next: '', confirm: '' }); }
    catch (e: unknown) { setPwMsg((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? t('common.error')); }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const navTo = (key: Section) => {
    if (key === 'users') { setUsersOpen(o => !o); setSection('users'); return; }
    if (key === 'settings') { setSettingsOpen(o => !o); return; }
    setSection(key);
  };

  const isActive = (key: Section) =>
    section === key ||
    (key === 'users' && section === 'add-user') ||
    (key === 'settings' && (section === 'profile' || section === 'change-password'));

  const totalRevenue = orders.filter(o => ['paid','shipped','delivered'].includes(o.status)).reduce((s,o) => s+o.totalETB, 0);
  const totalCommission = orders.reduce((s,o) => s+(o.commissionETB??0), 0);
  const filteredOrders = orders.filter(o => (orderStatus==='all'||o.status===orderStatus) && (o.id.includes(orderSearch)||o.buyerId.includes(orderSearch)));
  const filteredProducts = products.filter(p => p.title.toLowerCase().includes(productSearch.toLowerCase())||p.category.toLowerCase().includes(productSearch.toLowerCase()));
  const paymentOrders = orders.filter(o => paymentFilter==='all'||(paymentFilter==='paid'&&['paid','shipped','delivered'].includes(o.status))||(paymentFilter==='pending'&&o.status==='pending_payment')||(paymentFilter==='failed'&&o.status==='cancelled'));
  const recentOrders = [...orders].sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()).slice(0,6);
  const topProducts = [...products].sort((a,b)=>b.priceETB-a.priceETB).slice(0,5);

  const TH = ({ children }: { children: string }) => (
    <th className="text-left px-5 py-3.5 text-xs font-black text-gray-400 uppercase tracking-widest bg-gray-50 border-b border-gray-100">{children}</th>
  );
  const TD = ({ children, cls }: { children: React.ReactNode; cls?: string }) => (
    <td className={`px-5 py-3.5 ${cls ?? ''}`}>{children}</td>
  );

  return (
    <div className="flex h-screen bg-[#f5f6fa] overflow-hidden">
      {proofModal && <ProofModal src={proofModal} onClose={() => setProofModal(null)} />}

      {/* ══ SIDEBAR ══ */}
      <aside className="w-64 bg-gray-950 text-white flex flex-col flex-shrink-0 shadow-2xl">
        {/* Brand */}
        <div className="px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-yellow-400 flex items-center justify-center font-black text-gray-900 text-sm">DG</div>
            <div>
              <p className="font-black text-white text-base uppercase tracking-tight leading-none">DG MARKET</p>
              <p className="text-gray-500 text-xs mt-0.5">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.filter(n => !n.parent).map(item => (
            <div key={item.key}>
              <button onClick={() => navTo(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold transition-all text-left group ${
                  isActive(item.key)
                    ? 'bg-green-800 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}>
                <span className={`text-base w-5 text-center ${isActive(item.key) ? 'text-yellow-400' : 'text-gray-600 group-hover:text-gray-300'}`}>{item.icon}</span>
                <span className="flex-1">{t(item.label)}</span>
                {item.key === 'users' && <span className="text-xs text-gray-600">{usersOpen ? '▲' : '▼'}</span>}
                {item.key === 'settings' && <span className="text-xs text-gray-600">{settingsOpen ? '▲' : '▼'}</span>}
              </button>
              {item.key === 'users' && usersOpen && (
                <div className="ml-5 mt-0.5 border-l border-white/10 pl-3 space-y-0.5">
                  {NAV_ITEMS.filter(n => n.parent === 'users').map(sub => (
                    <button key={sub.key} onClick={() => setSection(sub.key)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-all text-left ${section===sub.key ? 'text-yellow-400' : 'text-gray-500 hover:text-white'}`}>
                      <span>›</span><span>{t(sub.label)}</span>
                    </button>
                  ))}
                </div>
              )}
              {item.key === 'settings' && settingsOpen && (
                <div className="ml-5 mt-0.5 border-l border-white/10 pl-3 space-y-0.5">
                  {NAV_ITEMS.filter(n => n.parent === 'settings').map(sub => (
                    <button key={sub.key} onClick={() => setSection(sub.key)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-all text-left ${section===sub.key ? 'text-yellow-400' : 'text-gray-500 hover:text-white'}`}>
                      <span>›</span><span>{t(sub.label)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-white/5 space-y-0.5">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-500/10 hover:text-red-400 transition-all text-left">
            <span className="text-base w-5 text-center">↩</span>
            <span>{t('admin.logout')}</span>
          </button>
        </div>
      </aside>

      {/* ══ MAIN ══ */}
      <main className="flex-1 overflow-y-auto">
        {/* Topbar */}
        <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">DG Market Admin</p>
            <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight leading-none mt-0.5">
              {t(NAV_ITEMS.find(n => n.key === section)?.label ?? 'admin.dashboard')}
            </h1>
          </div>

        </div>

        <div className="p-8 space-y-6">

          {/* ── DASHBOARD ── */}
          {section === 'dashboard' && (
            <div className="space-y-6">
              {!metrics ? (
                <div className="flex items-center justify-center h-40">
                  <div className="w-8 h-8 border-4 border-green-800 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon="₿" label={t('admin.totalRevenue')} value={`${totalRevenue.toLocaleString()} ETB`} accent="bg-green-800" />
                    <StatCard icon="◈" label={t('admin.totalOrders')} value={metrics.totalOrders} accent="bg-gray-800" />
                    <StatCard icon="◎" label={t('admin.totalUsers')} value={metrics.totalUsers} accent="bg-blue-700" />
                    <StatCard icon="◉" label={t('admin.activeProducts')} value={metrics.activeListings} accent="bg-yellow-500" sub={t('admin.listings2')} />
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon="%" label={t('admin.commission')} value={`${totalCommission.toLocaleString()} ETB`} accent="bg-purple-700" />
                    <StatCard icon="⏳" label={t('admin.pendingPayouts')} value={`${metrics.pendingPayoutETB.toLocaleString()} ETB`} accent="bg-orange-600" sub={`${metrics.pendingPayoutCount} ${t('admin.ordersCount')}`} />
                    <StatCard icon="🚩" label={t('admin.disputed')} value={metrics.disputedCount} accent="bg-red-700" />
                    <StatCard icon="⚠" label={t('admin.needAttention')} value={metrics.ordersNeedingAttention} accent="bg-gray-700" />
                  </div>
                  {metrics.ordersNeedingAttention > 0 && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 flex items-center gap-3">
                      <span className="text-yellow-500 text-xl">⚠</span>
                      <div>
                        <p className="font-black text-yellow-800 text-sm uppercase tracking-wide">{metrics.ordersNeedingAttention} {t('admin.ordersNeedAttention')}</p>
                        <button onClick={() => setSection('orders')} className="text-xs text-yellow-700 underline font-semibold mt-0.5">{t('admin.viewOrders')}</button>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="bg-white shadow-sm p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-black text-gray-900 text-xs uppercase tracking-widest">{t('admin.recentOrders')}</h3>
                        <button onClick={() => setSection('orders')} className="text-xs text-green-700 font-bold hover:underline">{t('admin.viewAll')}</button>
                      </div>
                      {recentOrders.length === 0 ? <p className="text-gray-400 text-sm">{t('admin.noOrdersYet')}</p> : (
                        <div className="space-y-3">
                          {recentOrders.map(o => (
                            <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                              <span className="font-mono text-xs text-gray-400">#{o.id.slice(0,8)}</span>
                              <Badge status={o.status} />
                              <span className="font-black text-sm text-gray-800">{o.totalETB.toLocaleString()} ETB</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="bg-white shadow-sm p-6">
                      <h3 className="font-black text-gray-900 text-xs uppercase tracking-widest mb-4">{t('admin.revenueBreakdown')}</h3>
                      <div className="space-y-4">
                        {[
                          { label: t('admin.totalRevenueLabel'), value: totalRevenue, pct: 100, color: 'bg-green-700' },
                          { label: t('admin.commissionLabel'), value: totalCommission, pct: totalRevenue ? Math.round((totalCommission/totalRevenue)*100) : 0, color: 'bg-blue-600' },
                          { label: t('admin.pendingPayoutsLabel'), value: metrics.pendingPayoutETB, pct: totalRevenue ? Math.round((metrics.pendingPayoutETB/totalRevenue)*100) : 0, color: 'bg-orange-500' },
                        ].map(r => (
                          <div key={r.label}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-500 font-semibold">{r.label}</span>
                              <span className="font-black text-gray-800">{r.value.toLocaleString()} ETB</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full ${r.color} rounded-full transition-all`} style={{ width: `${r.pct}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── ORDERS ── */}
          {section === 'orders' && (
            <div className="space-y-4">
              <div className="flex gap-3 flex-wrap">
                <input value={orderSearch} onChange={e => setOrderSearch(e.target.value)}
                  placeholder={t('admin.searchOrders')}
                  className="border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-green-700 flex-1 min-w-48 bg-white" />
                <select value={orderStatus} onChange={e => setOrderStatus(e.target.value)}
                  className="border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-green-700 bg-white">
                  {['all','pending_payment','paid','shipped','delivered','cancelled'].map(s => (
                    <option key={s} value={s}>{s === 'all' ? t('admin.allStatuses') : s.replace(/_/g,' ')}</option>
                  ))}
                </select>
              </div>
              <div className="bg-white shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr>
                    {[t('admin.orderIdCol'),t('admin.dateCol'),t('admin.paymentCol'),t('admin.totalCol'),t('admin.statusCol'),t('admin.payoutCol'),t('admin.actionCol')].map(h => <TH key={h}>{h}</TH>)}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredOrders.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-gray-400">{t('admin.noOrdersFound')}</td></tr>}
                    {filteredOrders.map(o => (
                      <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                        <TD><span className="font-mono text-xs text-gray-400">#{o.id.slice(0,8)}</span></TD>
                        <TD cls="text-xs text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</TD>
                        <TD cls="text-xs text-gray-600 capitalize">{o.paymentMethod.replace(/_/g,' ')}</TD>
                        <TD cls="font-black text-gray-900">{o.totalETB.toLocaleString()} ETB</TD>
                        <TD><Badge status={o.status} /></TD>
                        <TD>
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${o.payoutStatus==='released'?'bg-green-50 text-green-700 border-green-200':o.payoutStatus==='disputed'?'bg-red-50 text-red-700 border-red-200':'bg-orange-50 text-orange-700 border-orange-200'}`}>
                            {o.payoutStatus}
                          </span>
                        </TD>
                        <TD>
                          <div className="flex gap-1.5 flex-wrap">
                            {o.transactionId && (
                              <span className="text-xs font-mono bg-gray-100 text-gray-700 border border-gray-200 px-2 py-1 rounded">
                                TXN: {o.transactionId}
                              </span>
                            )}
                            {o.paymentProof && <button onClick={() => setProofModal(o.paymentProof!)} className="text-xs text-blue-600 border border-blue-200 px-2.5 py-1 font-bold hover:bg-blue-50 transition-colors">{t('admin.proof')}</button>}
                            {o.status==='pending_payment' && o.paymentProof && (
                              <button onClick={() => handleApprovePayment(o.id)} disabled={actionLoading===o.id}
                                className="text-xs bg-blue-700 hover:bg-blue-800 text-white font-bold px-2.5 py-1 disabled:opacity-50 transition-colors">
                                {actionLoading===o.id ? '...' : '✓ Approve'}
                              </button>
                            )}
                            {o.status==='delivered' && o.payoutStatus==='pending' && (
                              <button onClick={() => handleRelease(o.id)} disabled={actionLoading===o.id}
                                className="text-xs bg-green-800 hover:bg-green-900 text-white font-bold px-2.5 py-1 disabled:opacity-50 transition-colors">
                                {actionLoading===o.id ? '...' : t('admin.release')}
                              </button>
                            )}
                          </div>
                        </TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── PRODUCTS ── */}
          {section === 'products' && (
            <div className="space-y-4">
              <input value={productSearch} onChange={e => setProductSearch(e.target.value)}
                placeholder={t('admin.searchProducts')}
                className="border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-green-700 w-full max-w-md bg-white" />
              <div className="bg-white shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr>{[t('admin.productCol'),t('admin.categoryCol'),t('admin.priceCol'),t('admin.statusCol'),t('admin.actionCol')].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredProducts.length === 0 && <tr><td colSpan={5} className="text-center py-12 text-gray-400">{t('admin.noProductsFound')}</td></tr>}
                    {filteredProducts.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <TD cls="font-semibold text-gray-800">{p.title}</TD>
                        <TD><span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-0.5 font-bold uppercase tracking-wide">{p.category}</span></TD>
                        <TD cls="font-black text-gray-900">{p.priceETB.toLocaleString()} ETB</TD>
                        <TD><span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${p.isActive?'bg-green-50 text-green-700 border-green-200':'bg-red-50 text-red-600 border-red-200'}`}>{p.isActive ? t('admin.active') : t('admin.inactive')}</span></TD>
                        <TD>{p.isActive && <button onClick={() => handleDeactivateProduct(p.id)} className="text-xs text-red-600 border border-red-200 px-2.5 py-1 font-bold hover:bg-red-50 transition-colors">{t('admin.deactivate')}</button>}</TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── USERS ── */}
          {section === 'users' && (
            <div className="bg-white shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr>{[t('admin.emailPhoneCol'),t('admin.roleCol'),t('admin.statusColUser'),t('admin.joinedCol'),t('admin.actionCol')].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {users.length === 0 && <tr><td colSpan={5} className="text-center py-12 text-gray-400">{t('admin.noUsersFound')}</td></tr>}
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <TD cls="font-semibold text-gray-800">{u.email ?? u.phone ?? '—'}</TD>
                      <TD><span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${u.role==='admin'?'bg-purple-50 text-purple-700 border-purple-200':u.role==='seller'?'bg-blue-50 text-blue-700 border-blue-200':'bg-gray-100 text-gray-600 border-gray-200'}`}>{u.role}</span></TD>
                      <TD><span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${u.isActive?'bg-green-50 text-green-700 border-green-200':'bg-red-50 text-red-600 border-red-200'}`}>{u.isActive ? t('admin.active') : t('admin.inactive')}</span></TD>
                      <TD cls="text-xs text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</TD>
                      <TD>{u.role!=='admin' && <button onClick={() => handleDeactivateUser(u.id)} className="text-xs text-red-600 border border-red-200 px-2.5 py-1 font-bold hover:bg-red-50 transition-colors">{t('admin.deactivate')}</button>}</TD>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── ADD USER ── */}
          {section === 'add-user' && (
            <div className="bg-white shadow-sm p-8 max-w-md">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">{t('admin.addNewUser')}</h2>
              {addMsg && <div className={`text-sm px-4 py-3 mb-5 border-l-4 ${addMsg.includes('success')?'bg-green-50 border-green-600 text-green-700':'bg-red-50 border-red-500 text-red-700'}`}>{addMsg}</div>}
              <form onSubmit={handleAddUser} className="space-y-4">
                {[{label:t('admin.emailOptional'),type:'email',key:'email',ph:'user@example.com'},{label:t('admin.phoneOptional'),type:'tel',key:'phone',ph:'+251 9XX XXX XXX'},{label:t('admin.passwordLabel'),type:'password',key:'password',ph:'Min 6 characters'}].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-black text-gray-600 uppercase tracking-widest mb-2">{f.label}</label>
                    <input type={f.type} required={f.key!=='phone'} value={newUser[f.key as keyof typeof newUser]}
                      onChange={e => setNewUser({...newUser, [f.key]: e.target.value})} className={inp} placeholder={f.ph} />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-black text-gray-600 uppercase tracking-widest mb-2">{t('admin.roleLabel')}</label>
                  <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className={inp}>
                    <option value="buyer">{t('admin.buyer')}</option><option value="seller">{t('admin.seller')}</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-black text-sm uppercase tracking-widest py-3.5 transition-all active:scale-[0.98]">{t('admin.createUser')}</button>
              </form>
            </div>
          )}

          {/* ── PAYMENTS ── */}
          {section === 'payments' && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <StatCard icon="✓" label={t('admin.totalPaid')} value={`${orders.filter(o=>['paid','shipped','delivered'].includes(o.status)).reduce((s,o)=>s+o.totalETB,0).toLocaleString()} ETB`} accent="bg-green-800" />
                <StatCard icon="⏳" label={t('admin.pending')} value={`${orders.filter(o=>o.status==='pending_payment').reduce((s,o)=>s+o.totalETB,0).toLocaleString()} ETB`} accent="bg-yellow-500" />
                <StatCard icon="%" label={t('admin.commission')} value={`${totalCommission.toLocaleString()} ETB`} accent="bg-blue-700" />
              </div>
              <div className="flex gap-2">
                {['all','paid','pending','failed'].map(f => (
                  <button key={f} onClick={() => setPaymentFilter(f)}
                    className={`px-4 py-2 text-xs font-black uppercase tracking-widest border transition-colors ${paymentFilter===f?'bg-green-800 text-white border-green-800':'bg-white text-gray-600 border-gray-200 hover:border-green-700'}`}>
                    {f}
                  </button>
                ))}
              </div>
              <div className="bg-white shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr>{['Order ID','Date','Method','Amount','Status','Proof'].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {paymentOrders.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-gray-400">No payments found.</td></tr>}
                    {paymentOrders.map(o => (
                      <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                        <TD><span className="font-mono text-xs text-gray-400">#{o.id.slice(0,8)}</span></TD>
                        <TD cls="text-xs text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</TD>
                        <TD cls="text-xs text-gray-600 capitalize">{o.paymentMethod.replace(/_/g,' ')}</TD>
                        <TD cls="font-black text-gray-900">{o.totalETB.toLocaleString()} ETB</TD>
                        <TD><Badge status={o.status} /></TD>
                        <TD>{o.paymentProof ? <button onClick={() => setProofModal(o.paymentProof!)} className="text-xs text-blue-600 underline font-bold">View</button> : <span className="text-gray-300">—</span>}</TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── DELIVERY ── */}
          {section === 'delivery' && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <StatCard icon="▶" label="Pending Shipment" value={orders.filter(o=>o.status==='paid').length} accent="bg-yellow-500" />
                <StatCard icon="◀" label="Shipped" value={orders.filter(o=>o.status==='shipped').length} accent="bg-purple-700" />
                <StatCard icon="✓" label="Delivered" value={orders.filter(o=>o.status==='delivered').length} accent="bg-green-800" />
              </div>
              <div className="bg-white shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr>{['Order ID','Date','Buyer','Total','Status'].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {orders.filter(o=>['paid','shipped','delivered'].includes(o.status)).length === 0 && (
                      <tr><td colSpan={5} className="text-center py-12 text-gray-400">No delivery records.</td></tr>
                    )}
                    {orders.filter(o=>['paid','shipped','delivered'].includes(o.status)).map(o => (
                      <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                        <TD><span className="font-mono text-xs text-gray-400">#{o.id.slice(0,8)}</span></TD>
                        <TD cls="text-xs text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</TD>
                        <TD><span className="font-mono text-xs text-gray-400">{o.buyerId.slice(0,8)}...</span></TD>
                        <TD cls="font-black text-gray-900">{o.totalETB.toLocaleString()} ETB</TD>
                        <TD><Badge status={o.status} /></TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── REPORTS ── */}
          {section === 'reports' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon="₿" label="Total Revenue" value={`${totalRevenue.toLocaleString()} ETB`} accent="bg-green-800" />
                <StatCard icon="%" label="Commission" value={`${totalCommission.toLocaleString()} ETB`} accent="bg-blue-700" />
                <StatCard icon="◈" label="Total Orders" value={orders.length} accent="bg-gray-800" />
                <StatCard icon="◎" label="Total Users" value={users.length} accent="bg-purple-700" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-white shadow-sm p-6">
                  <h3 className="font-black text-gray-900 text-xs uppercase tracking-widest mb-4">Top Products by Price</h3>
                  <div className="space-y-3">
                    {topProducts.map((p, i) => (
                      <div key={p.id} className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-green-800 text-white text-xs font-black flex items-center justify-center flex-shrink-0">{i+1}</span>
                        <span className="flex-1 text-sm text-gray-700 truncate">{p.title}</span>
                        <span className="font-black text-sm text-gray-900 flex-shrink-0">{p.priceETB.toLocaleString()} ETB</span>
                      </div>
                    ))}
                    {topProducts.length === 0 && <p className="text-gray-400 text-sm">No products yet.</p>}
                  </div>
                </div>
                <div className="bg-white shadow-sm p-6">
                  <h3 className="font-black text-gray-900 text-xs uppercase tracking-widest mb-4">Order Status Breakdown</h3>
                  <div className="space-y-3">
                    {['pending_payment','paid','shipped','delivered','cancelled'].map(s => {
                      const count = orders.filter(o => o.status === s).length;
                      const pct = orders.length ? Math.round((count/orders.length)*100) : 0;
                      return (
                        <div key={s}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-500 font-semibold capitalize">{s.replace(/_/g,' ')}</span>
                            <span className="font-black text-gray-800">{count} ({pct}%)</span>
                          </div>
                          <div className="h-2 bg-gray-100 overflow-hidden">
                            <div className="h-full bg-green-700 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── VERIFICATIONS ── */}
          {section === 'verifications' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">{verifications.length} pending verification{verifications.length !== 1 ? 's' : ''}</p>
              {verifications.length === 0 && (
                <div className="bg-white shadow-sm p-10 text-center text-gray-400">
                  <p className="text-4xl mb-3">✅</p>
                  <p className="text-sm">No pending verifications.</p>
                </div>
              )}
              {verifications.map((v: AdminUser & {
                fanNumber?: string; verificationIdType?: string; verificationIdNumber?: string;
                verificationIdImage?: string; verificationIdImageBack?: string; verificationSubmittedAt?: string;
                name?: string; businessName?: string;
              }) => (
                <div key={v.id} className="bg-white shadow-sm p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-black text-gray-900 text-sm">{v.businessName ?? v.name ?? v.email ?? v.phone ?? v.id}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{v.email ?? v.phone} · Submitted {v.verificationSubmittedAt ? new Date(v.verificationSubmittedAt).toLocaleDateString() : '—'}</p>
                    </div>
                    <span className="text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-200 px-2.5 py-0.5 rounded-full">Pending</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div><span className="text-gray-400 text-xs">FAN Number</span><p className="font-mono font-bold text-gray-800">{v.fanNumber ?? '—'}</p></div>
                    <div><span className="text-gray-400 text-xs">ID Type</span><p className="font-bold text-gray-800 capitalize">{v.verificationIdType?.replace('_', ' ') ?? '—'}</p></div>
                    <div><span className="text-gray-400 text-xs">ID Number</span><p className="font-mono font-bold text-gray-800">{v.verificationIdNumber ?? '—'}</p></div>
                  </div>
                  {/* ID images */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    {v.verificationIdImage && (
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Front</p>
                        <img src={v.verificationIdImage} alt="ID front" className="w-full max-h-40 object-contain bg-gray-50 border border-gray-200 rounded" />
                      </div>
                    )}
                    {v.verificationIdImageBack && (
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Back</p>
                        <img src={v.verificationIdImageBack} alt="ID back" className="w-full max-h-40 object-contain bg-gray-50 border border-gray-200 rounded" />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => handleApproveVerification(v.id)} disabled={actionLoading === v.id}
                      className="flex-1 bg-green-800 hover:bg-green-900 text-white font-black text-xs uppercase tracking-widest py-2.5 transition-colors disabled:opacity-50">
                      {actionLoading === v.id ? '...' : '✅ Approve'}
                    </button>
                    <button onClick={() => handleRejectVerification(v.id)} disabled={actionLoading === v.id}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest py-2.5 transition-colors disabled:opacity-50">
                      {actionLoading === v.id ? '...' : '❌ Reject'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── SETTINGS ── */}
          {section === 'settings' && (
            <div className="bg-white shadow-sm p-8 max-w-md">
              <p className="text-gray-400 text-sm">Select a settings option from the sidebar.</p>
            </div>
          )}

          {/* ── CHANGE PROFILE ── */}
          {section === 'profile' && (
            <div className="bg-white shadow-sm p-8 max-w-md">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">{t('admin.profileTitle')}</h2>
              {profileMsg && <div className={`text-sm px-4 py-3 mb-5 border-l-4 ${profileMsg.includes('success')?'bg-green-50 border-green-600 text-green-700':'bg-red-50 border-red-500 text-red-700'}`}>{profileMsg}</div>}
              <form onSubmit={e => { e.preventDefault(); setProfileMsg('Profile update coming soon.'); }} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-gray-600 uppercase tracking-widest mb-2">{t('admin.emailLabel')}</label>
                  <input type="email" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} className={inp} />
                </div>
                <button type="submit" className="w-full bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-black text-sm uppercase tracking-widest py-3.5 transition-all">{t('admin.saveProfile')}</button>
              </form>
            </div>
          )}

          {/* ── CHANGE PASSWORD ── */}
          {section === 'change-password' && (
            <div className="bg-white shadow-sm p-8 max-w-md">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">{t('admin.changePassword')}</h2>
              {pwMsg && <div className={`text-sm px-4 py-3 mb-5 border-l-4 ${pwMsg.includes('success')?'bg-green-50 border-green-600 text-green-700':'bg-red-50 border-red-500 text-red-700'}`}>{pwMsg}</div>}
              <form onSubmit={handleChangePassword} className="space-y-4">
                {[{label:t('admin.currentPassword'),key:'current'},{label:t('admin.newPassword'),key:'next'},{label:t('admin.confirmPassword'),key:'confirm'}].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-black text-gray-600 uppercase tracking-widest mb-2">{f.label}</label>
                    <input type="password" required value={pwForm[f.key as keyof typeof pwForm]}
                      onChange={e => setPwForm({...pwForm, [f.key]: e.target.value})} className={inp} placeholder="••••••••" />
                  </div>
                ))}
                <button type="submit" className="w-full bg-green-800 hover:bg-green-900 text-white font-black text-sm uppercase tracking-widest py-3.5 transition-all">{t('admin.changePasswordBtn')}</button>
              </form>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
