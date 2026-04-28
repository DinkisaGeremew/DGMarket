import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../lib/api';

interface OrderItem { productId: string; quantity: number; unitPriceETB: number; }
interface Order {
  id: string; sellerId: string; items: OrderItem[];
  totalETB: number; status: string; paymentMethod: string;
  createdAt: string; paymentProof?: string;
}
interface ProductInfo { id: string; title: string; images: string[]; }

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

export default function OrdersPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Record<string, ProductInfo>>({});
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [proofPreview, setProofPreview] = useState<Record<string, string>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    loadOrders();
  }, [user]);

  const loadOrders = async () => {
    try {
      const r = await api.get(`/orders/buyer/${user!.id}`);
      const orderList: Order[] = r.data;
      setOrders(orderList);

      // Fetch product info for all items
      const allProductIds = [...new Set(orderList.flatMap((o) => o.items.map((i) => i.productId)))];
      const productMap: Record<string, ProductInfo> = {};
      await Promise.all(allProductIds.map(async (pid) => {
        try {
          const res = await api.get(`/products/${pid}`);
          productMap[pid] = res.data;
        } catch { /* product removed */ }
      }));
      setProducts(productMap);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProofUpload = async (orderId: string, file: File) => {
    setUploadingId(orderId);
    try {
      const proof = await compressImage(file);
      setProofPreview((prev) => ({ ...prev, [orderId]: proof }));
      await api.post(`/orders/${orderId}/payment-proof`, { buyerId: user!.id, proof });
      await loadOrders();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert(msg ?? 'Failed to upload proof');
    } finally {
      setUploadingId(null);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">{t('common.loading')}</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('order.myOrders')}</h1>
      {orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📦</p>
          <p>{t('order.noOrders')}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl shadow p-5">
              {/* Order header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-400 font-mono">#{order.id.slice(0, 8)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString('en-ET', { year: 'numeric', month: 'short', day: 'numeric' })}
                    {' · '}{order.paymentMethod.replace(/_/g, ' ')}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {order.status === 'paid' ? t('order.paidAwaiting') : t(`order.status.${order.status}`) }
                </span>
              </div>

              {/* Items */}
              <div className="space-y-2 mb-4">
                {order.items.map((item) => {
                  const p = products[item.productId];
                  return (
                    <div key={item.productId} className="flex items-center gap-3">
                      {p?.images?.[0]
                        ? <img src={p.images[0]} alt={p.title} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                        : <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">📦</div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{p?.title ?? 'Product'}</p>
                        <p className="text-xs text-gray-500">Qty: {item.quantity} × {item.unitPriceETB.toLocaleString()} ETB</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-700 flex-shrink-0">
                        {(item.unitPriceETB * item.quantity).toLocaleString()} ETB
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Total */}
              <div className="flex justify-between items-center pt-3 border-t border-gray-100 mb-4">
                <span className="text-sm text-gray-500">{t('order.total')}</span>
                <span className="font-bold text-green-800 text-lg">{order.totalETB.toLocaleString()} ETB</span>
              </div>

              {/* Payment proof section */}
              {order.status === 'pending_payment' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-yellow-800 mb-1">{t('order.paymentRequired')}</p>
                  <p className="text-xs text-yellow-700 mb-2">
                    {t('order.transferTo')} <span className="font-bold">{order.totalETB.toLocaleString()} ETB</span> {t('order.via')}{' '}
                    <span className="font-bold">{order.paymentMethod.replace(/_/g, ' ')}</span> {t('order.to')}
                  </p>
                  <div className="bg-white border border-yellow-300 rounded-lg px-3 py-2 mb-3">
                    <p className="text-xs text-gray-500 mb-0.5">{t('order.platformAccount')}</p>
                    <p className="text-sm font-mono font-bold text-gray-800">
                      {PLATFORM_ACCOUNT[order.paymentMethod] ?? order.paymentMethod}
                    </p>
                  </div>
                  {proofPreview[order.id] || order.paymentProof ? (
                    <div className="mb-3">
                      <img src={proofPreview[order.id] ?? order.paymentProof} alt="Payment proof"
                        className="w-full max-h-48 object-contain rounded-lg border border-yellow-200" />
                    </div>
                  ) : null}
                  <input
                    type="file" accept="image/*"
                    className="hidden"
                    ref={(el) => { fileRefs.current[order.id] = el; }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleProofUpload(order.id, file);
                    }}
                  />
                  <button
                    onClick={() => fileRefs.current[order.id]?.click()}
                    disabled={uploadingId === order.id}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50">
                    {uploadingId === order.id ? t('order.uploading') : t('order.uploadProof')}
                  </button>
                </div>
              )}

              {/* Proof already submitted */}
              {order.status !== 'pending_payment' && order.paymentProof && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">{t('order.proofSubmitted')}</p>
                  <img src={order.paymentProof} alt="Payment proof"
                    className="w-full max-h-32 object-contain rounded-lg border border-gray-200" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
