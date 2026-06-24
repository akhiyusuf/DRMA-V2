"use client";
import { useState, useEffect, useRef, useCallback } from 'react';

const POLL_INTERVAL = 8000; // Check every 8 seconds

type Tab = 'stock' | 'orders' | 'homepage';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-foreground/[0.06] text-foreground/60 border-foreground/15',
  paid: 'bg-foreground text-background border-foreground',
  shipped: 'bg-foreground/20 text-foreground border-foreground/30',
  delivered: 'bg-foreground text-background border-foreground',
  cancelled: 'bg-foreground/5 text-foreground/30 border-foreground/10 line-through',
  refunded: 'bg-foreground/5 text-foreground/30 border-foreground/10',
};

// =============================================================================
// TagInput — MUST live at module scope (NOT inside DashboardPage).
// When defined inside the parent, every parent re-render (e.g. the 8s poll)
// creates a NEW function reference, React sees a different component type at
// the same position, unmounts the old subtree and mounts a new one — which
// destroys the <input>'s focus AND its uncontrolled value mid-keystroke.
// Keeping it at module scope gives it a stable identity so the DOM persists.
// =============================================================================
interface TagInputProps {
  label: string;
  values: string[];
  onChange: (vals: string[]) => void;
  listId: string;
  placeholder: string;
}

function TagInput({ label, values, onChange, listId, placeholder }: TagInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    const v = inputRef.current?.value.trim();
    if (v && !values.includes(v)) {
      onChange([...values, v]);
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/40 mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {(values || []).map((val: string, i: number) => (
          <span key={`${val}-${i}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-foreground text-background text-[11px]">
            {val}
            <button
              type="button"
              onClick={() => onChange(values.filter((_, idx) => idx !== i))}
              className="hover:bg-background/20 rounded-full w-3.5 h-3.5 flex items-center justify-center transition-colors text-[9px]"
              aria-label={`Remove ${val}`}
            >×</button>
          </span>
        ))}
      </div>
      <input
        ref={inputRef}
        list={listId}
        className="w-full bg-transparent border-b border-foreground/10 pb-1 text-sm focus:border-foreground/30 focus:outline-none transition-colors placeholder:text-foreground/20"
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Backspace' && e.currentTarget.value === '' && values.length > 0) {
            // Backspace on empty input removes the last tag (common UX)
            onChange(values.slice(0, -1));
          }
        }}
        onBlur={() => {
          // Commit on blur so partially-typed values aren't lost when polling fires
          if (inputRef.current?.value.trim()) commit();
        }}
        placeholder={placeholder}
      />
    </div>
  );
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('stock');

  // --- Shared State ---
  const [homepageData, setHomepageData] = useState<any>(null);
  const [productsData, setProductsData] = useState<any[] | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState('');

  // --- Orders Tab State ---
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersFilter, setOrdersFilter] = useState('all');
  const [ordersSearch, setOrdersSearch] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState('');

  // --- Stock Tab State ---
  const [stockData, setStockData] = useState<any[]>([]);
  const [expandedStockProduct, setExpandedStockProduct] = useState<string | null>(null);
  const [variantData, setVariantData] = useState<Record<string, any[]>>({});

  // --- Auto-Refresh State ---
  const [lastFingerprint, setLastFingerprint] = useState('');
  const [lastFingerprints, setLastFingerprints] = useState<{ products: string; homepage: string; orders: string }>({ products: '', homepage: '', orders: '' });
  const [refreshNotification, setRefreshNotification] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isSavingRef = useRef(false);
  const cmsSoundRef = useRef<HTMLAudioElement | null>(null);

  // ======== Toast System ========

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const showConfirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setToast({ message, type: 'info' });
      // Resolve false immediately — for delete, we'll use a two-click pattern instead
      resolve(false);
    });
  }, []);

  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  // ======== Data Fetching ========

  const fetchImages = async () => {
    try {
      const res = await fetch('/api/cms/images');
      if (res.ok) { const data = await res.json(); setImages(Array.isArray(data) ? data : []); }
    } catch (err) { console.error('Error fetching images:', err); }
  };

  const fetchContentData = () => {
    fetch('/api/cms/content?type=homepage')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setHomepageData({ hero: { title: '', description: '', image: '', ...data.hero }, mission: { title: '', description: '', image: '', ...data.mission }, differentiation: { points: [], ...data.differentiation }, featuredProductIds: [], ...data });
        } else { setHomepageData({ hero: { title: '', description: '', image: '' }, mission: { title: '', description: '', image: '' }, differentiation: { points: [] }, featuredProductIds: [] }); }
      })
      .catch(() => { setHomepageData({ hero: { title: '', description: '', image: '' }, mission: { title: '', description: '', image: '' }, differentiation: { points: [] }, featuredProductIds: [] }); });

    fetch('/api/cms/content?type=products')
      .then(res => res.json())
      .then(data => { if (!data.error) setProductsData(data); else setProductsData([]); })
      .catch(() => setProductsData([]));

    fetchImages();
  };

  const fetchOrders = () => {
    const params = new URLSearchParams({ page: String(ordersPage), limit: '20' });
    if (ordersFilter !== 'all') params.set('status', ordersFilter);
    if (ordersSearch) params.set('search', ordersSearch);
    fetch(`/api/cms/orders?${params}`)
      .then(res => res.json())
      .then(data => { setOrders(data.orders || []); setOrdersTotal(data.total || 0); })
      .catch(() => { setOrders([]); setOrdersTotal(0); });
  };

  const fetchStock = () => {
    fetch('/api/cms/stock')
      .then(res => res.json())
      .then(data => { setStockData(data.products || []); })
      .catch(() => setStockData([]));
  };

  useEffect(() => { fetchContentData(); }, []);
  useEffect(() => { fetchOrders(); }, []);
  useEffect(() => { if (activeTab === 'orders') fetchOrders(); }, [activeTab, ordersPage, ordersFilter]);
  useEffect(() => { if (activeTab === 'stock') { fetchStock(); } }, [activeTab]);

  // ======== Auto-Refresh Polling ========

  const playCmsSound = useCallback(() => {
    if (!cmsSoundRef.current) {
      cmsSoundRef.current = new Audio('/sounds/cms-refresh.wav');
      cmsSoundRef.current.volume = 0.3;
    }
    if (cmsSoundRef.current) {
      cmsSoundRef.current.currentTime = 0;
      cmsSoundRef.current.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const pollFingerprint = async () => {
      try {
        const res = await fetch('/api/cms/fingerprint');
        if (!res.ok) return;
        const data = await res.json();
        const { fingerprint, products, homepage, orders } = data;

        if (lastFingerprint && fingerprint !== lastFingerprint && !isSavingRef.current) {
          const prev = lastFingerprints;
          let message = 'Data updated';
          if (orders !== prev.orders) {
            message = 'New order received';
          } else if (products !== prev.products) {
            message = 'Product data updated';
          } else if (homepage !== prev.homepage) {
            message = 'Homepage content updated';
          }

          fetchContentData();
          if (activeTab === 'orders') fetchOrders();
          if (activeTab === 'stock') fetchStock();
          const countRes = await fetch('/api/cms/orders?limit=1');
          if (countRes.ok) { const countData = await countRes.json(); setOrdersTotal(countData.total || 0); }

          playCmsSound();
          setRefreshNotification(message);
          setTimeout(() => setRefreshNotification(null), 3000);
        }
        setLastFingerprint(fingerprint);
        setLastFingerprints({ products: products || '', homepage: homepage || '', orders: orders || '' });
      } catch {
        // Silently fail
      }
    };

    const initTimeout = setTimeout(() => {
      fetch('/api/cms/fingerprint')
        .then(res => res.ok ? res.json() : { fingerprint: '', products: '', homepage: '', orders: '' })
        .then((data) => {
          setLastFingerprint(data.fingerprint);
          setLastFingerprints({ products: data.products || '', homepage: data.homepage || '', orders: data.orders || '' });
        })
        .catch(() => {});
    }, 2000);

    const interval = setInterval(pollFingerprint, POLL_INTERVAL);
    return () => {
      clearInterval(interval);
      clearTimeout(initTimeout);
    };
  }, [lastFingerprint, lastFingerprints, activeTab, playCmsSound]);

  // ======== Helpers ========

  const save = async (type: string, data: any, id?: string) => {
    let payload = data;
    if (type === 'products' && id) {
      const currentData = await fetch('/api/cms/content?type=products').then(res => res.json());
      payload = currentData.map((p: any) => p.id === id ? data : p);
    }
    isSavingRef.current = true;
    try {
      const res = await fetch('/api/cms/content', { method: 'POST', body: JSON.stringify({ type, data: payload }) });
      if (res.ok) {
        const fpRes = await fetch('/api/cms/fingerprint');
        if (fpRes.ok) {
          const fpData = await fpRes.json();
          setLastFingerprint(fpData.fingerprint);
          setLastFingerprints({ products: fpData.products || '', homepage: fpData.homepage || '', orders: fpData.orders || '' });
        }
        showToast('Saved successfully', 'success');
      }
      else showToast('Failed to save', 'error');
    } catch (err) { showToast('Error saving', 'error'); }
    finally { isSavingRef.current = false; }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/cms/upload', { method: 'POST', body: formData });
      const result = await res.json();
      if (res.ok && result.success) { setImages([...images, result.path]); showToast('Image uploaded', 'success'); if (fileInputRef.current) fileInputRef.current.value = ''; }
      else showToast('Upload failed', 'error');
    } catch (err) { showToast('Upload error', 'error'); }
    finally { setUploading(false); }
  };

  // TagInput is now defined at module scope above (see top of file).

  // ======== Orders Tab Helpers ========

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    isSavingRef.current = true;
    try {
      const res = await fetch(`/api/cms/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, note: statusNote || undefined }),
      });
      if (res.ok) {
        fetchOrders();
        setStatusNote('');
        setExpandedOrder(null);
        const fpRes = await fetch('/api/cms/fingerprint');
        if (fpRes.ok) {
          const fpData = await fpRes.json();
          setLastFingerprint(fpData.fingerprint);
          setLastFingerprints({ products: fpData.products || '', homepage: fpData.homepage || '', orders: fpData.orders || '' });
        }
      }
      else showToast('Failed to update order', 'error');
    } catch { showToast('Error updating order', 'error'); }
    finally { isSavingRef.current = false; }
  };

  // ======== Stock Tab Helpers ========

  const updateStock = async (productId: string, field: string, value: any) => {
    isSavingRef.current = true;
    try {
      const res = await fetch('/api/cms/stock', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, [field]: value }),
      });
      if (res.ok) {
        fetchStock();
        const fpRes = await fetch('/api/cms/fingerprint');
        if (fpRes.ok) {
          const fpData = await fpRes.json();
          setLastFingerprint(fpData.fingerprint);
          setLastFingerprints({ products: fpData.products || '', homepage: fpData.homepage || '', orders: fpData.orders || '' });
        }
      }
      else showToast('Failed to update stock', 'error');
    } catch { showToast('Error updating stock', 'error'); }
    finally { isSavingRef.current = false; }
  };

  const updateVariantStock = async (productId: string, size: string, color: string, field: string, value: any) => {
    isSavingRef.current = true;
    try {
      const res = await fetch('/api/cms/stock/variant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, size, color, [field]: value }),
      });
      if (res.ok) {
        fetchVariants(productId);
        fetchStock();
        const fpRes = await fetch('/api/cms/fingerprint');
        if (fpRes.ok) {
          const fpData = await fpRes.json();
          setLastFingerprint(fpData.fingerprint);
          setLastFingerprints({ products: fpData.products || '', homepage: fpData.homepage || '', orders: fpData.orders || '' });
        }
      }
      else showToast('Failed to update variant stock', 'error');
    } catch { showToast('Error updating variant stock', 'error'); }
    finally { isSavingRef.current = false; }
  };

  const fetchVariants = async (productId: string) => {
    try {
      const res = await fetch('/api/cms/stock/variant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });
      if (res.ok) {
        const data = await res.json();
        setVariantData(prev => ({ ...prev, [productId]: data.variants || [] }));
      }
    } catch {}
  };

  const toggleExpandStock = async (productId: string) => {
    if (expandedStockProduct === productId) {
      setExpandedStockProduct(null);
    } else {
      setExpandedStockProduct(productId);
      // Fetch variants for all products with variations
      if (!variantData[productId]) {
        await fetchVariants(productId);
      }
    }
  };

  // ======== Render Helpers ========

  if (!homepageData || !productsData) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-pulse font-heading text-2xl text-foreground/20 tracking-[0.3em]">DRMA</div></div>;

  // Find product content data by id (merge stockData with productsData)
  const getProductContent = (id: string) => productsData?.find((p: any) => p.id === id);

  const filteredProducts = stockData?.filter((p: any) => {
    const content = getProductContent(p.id);
    const name = content?.name || p.name;
    const category = content?.category || p.category || '';
    return name.toLowerCase().includes(filter.toLowerCase()) || category.toLowerCase().includes(filter.toLowerCase());
  }) || [];
  const uniqueCategories = Array.from(new Set(productsData?.map(p => p.category).filter(Boolean)));
  const uniqueTags = Array.from(new Set(productsData?.flatMap(p => p.tags || []).filter(Boolean)));
  const uniqueSizes = Array.from(new Set(productsData?.flatMap(p => p.variations?.sizes || []).filter(Boolean)));
  const uniqueColors = Array.from(new Set(productsData?.flatMap(p => p.variations?.colors || []).filter(Boolean)));
  const uniqueMaterials = Array.from(new Set(productsData?.flatMap(p => p.variations?.materials || []).filter(Boolean)));

  const tabs: { key: Tab; label: string }[] = [
    { key: 'stock', label: 'Products' },
    { key: 'orders', label: `Orders${ordersTotal > 0 ? ` (${ordersTotal})` : ''}` },
    { key: 'homepage', label: 'Homepage' },
  ];

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // ======== ORDERS TAB ========

  const renderOrders = () => (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'].map(s => (
            <button key={s} onClick={() => { setOrdersFilter(s); setOrdersPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-wider border transition-colors ${ordersFilter === s ? 'bg-foreground text-background border-foreground' : 'border-foreground/20 text-foreground/60 hover:border-foreground/40'}`}>
              {s}
            </button>
          ))}
        </div>
        <input className="border border-foreground/10 bg-background/5 p-2 rounded-lg text-sm ml-auto" placeholder="Search orders..." value={ordersSearch} onChange={e => { setOrdersSearch(e.target.value); setOrdersPage(1); }} />
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 text-foreground/40">
          <p className="text-lg mb-2">No orders found</p>
          <p className="text-sm">Orders will appear here after customers complete checkout.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => (
            <div key={order.id} className="border border-foreground/10 rounded-2xl overflow-hidden">
              <button onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                className="w-full p-5 flex flex-wrap items-center gap-4 hover:bg-foreground/5 transition-colors text-left">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-xs text-foreground/50">{order.id?.substring(0, 20)}...</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-medium border ${STATUS_STYLES[order.status] || STATUS_STYLES.pending}`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/70">{order.customer_first_name} {order.customer_last_name} — {order.customer_email}</p>
                </div>
                <div className="text-right">
                  <p className="font-heading text-lg">${parseFloat(order.total).toFixed(2)}</p>
                  <p className="text-[10px] text-foreground/40 uppercase">{formatDate(order.created_at)}</p>
                </div>
              </button>

              {expandedOrder === order.id && (
                <div className="border-t border-foreground/10 p-5 space-y-6 bg-foreground/[0.02]">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><span className="text-foreground/40 text-xs uppercase block mb-1">Ship To</span><p>{order.shipping_address}</p><p>{order.shipping_city}, {order.shipping_state} {order.shipping_zip}</p></div>
                    <div><span className="text-foreground/40 text-xs uppercase block mb-1">Shipping</span><p className="capitalize">{order.shipping_method?.replace('_', ' ')}</p></div>
                    <div><span className="text-foreground/40 text-xs uppercase block mb-1">Subtotal</span><p>${parseFloat(order.subtotal).toFixed(2)}</p></div>
                    <div><span className="text-foreground/40 text-xs uppercase block mb-1">Tax + Shipping</span><p>${parseFloat(order.tax_amount || 0).toFixed(2)} + ${parseFloat(order.shipping_cost).toFixed(2)}</p></div>
                  </div>

                  <div>
                    <h4 className="text-xs uppercase tracking-widest text-foreground/40 mb-3">Items</h4>
                    <div className="space-y-2">
                      {(order.items || []).map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-foreground/5 rounded-xl text-sm">
                          <div>
                            <p className="font-medium">{item.product_name}</p>
                            <p className="text-foreground/50 text-xs">{item.selected_color} / {item.selected_size} x {item.quantity}</p>
                          </div>
                          <p className="font-light">${(parseFloat(item.price) * item.quantity).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-end gap-3 pt-4 border-t border-foreground/10">
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-xs uppercase tracking-widest text-foreground/40 block mb-2">Update Status</label>
                      <div className="flex gap-2 flex-wrap">
                        {['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'].map(s => (
                          <button key={s} onClick={() => updateOrderStatus(order.id, s)}
                            className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-wider border transition-colors ${order.status === s ? 'bg-foreground text-background border-foreground' : 'border-foreground/20 text-foreground/60 hover:border-foreground/40 hover:bg-foreground/5'}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-xs uppercase tracking-widest text-foreground/40 block mb-2">Note (optional)</label>
                      <input className="w-full border border-foreground/10 bg-background/5 p-2 rounded-lg text-sm" placeholder="Tracking number, note..." value={statusNote} onChange={e => setStatusNote(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {ordersTotal > 20 && (
            <div className="flex justify-center gap-2">
              <button disabled={ordersPage <= 1} onClick={() => setOrdersPage(p => p - 1)} className="px-4 py-2 border border-foreground/10 rounded-xl text-sm disabled:opacity-30">Previous</button>
              <span className="px-4 py-2 text-sm text-foreground/50">Page {ordersPage} of {Math.ceil(ordersTotal / 20)}</span>
              <button disabled={ordersPage * 20 >= ordersTotal} onClick={() => setOrdersPage(p => p + 1)} className="px-4 py-2 border border-foreground/10 rounded-xl text-sm disabled:opacity-30">Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ======== STOCK TAB (Products + Content Editing + Stock) ========

  const getVariantStockDisplay = (productId: string, size: string, color: string): number => {
    const variants = variantData[productId] || [];
    const v = variants.find((vr: any) => vr.size === size && vr.color === color);
    return v ? v.stock_quantity : -2; // -2 = no row set (falls back to product stock)
  };

  const renderStock = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-foreground/50">Manage products, content, and inventory. Click a product to edit details, images, and per-variant stock.</p>
        <div className="flex items-center gap-3">
          <input className="bg-foreground/[0.03] border border-foreground/10 rounded-full px-4 py-2 text-xs focus:outline-none focus:border-foreground/30 transition-colors w-40 placeholder:text-foreground/25" placeholder="Filter..." value={filter} onChange={e => setFilter(e.target.value)} />
          <button onClick={async () => {
            const newId = Date.now().toString();
            const newProduct = { id: newId, name: 'New Product', price: 0, images: [], tags: [], category: '', variations: { sizes: [], colors: [], materials: [] }, description: '', in_stock: true, stock_quantity: -1, low_stock_threshold: 3, max_per_order: 3 };
            // Append to local state immediately so it appears
            if (productsData) {
              setProductsData([...productsData, newProduct]);
            }
            setExpandedStockProduct(newId);
            await save('products', newProduct, newId);
            fetchStock();
          }} className="bg-foreground text-background rounded-full px-4 py-2 text-[11px] uppercase tracking-widest font-medium hover:bg-foreground/90 transition-all active:scale-[0.98]">
            + Add Product
          </button>
          <label className={`cursor-pointer bg-foreground text-background w-9 h-9 rounded-full flex items-center justify-center hover:bg-foreground/90 transition-all active:scale-95 ${uploading ? 'opacity-40 cursor-not-allowed' : ''}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} accept="image/*" />
          </label>
        </div>
      </div>

      {/* Datalists */}
      <datalist id="categories">{uniqueCategories.map((c, i) => <option key={`${c}-${i}`} value={c} />)}</datalist>
      <datalist id="tags">{uniqueTags.map((t, i) => <option key={`${t}-${i}`} value={t} />)}</datalist>
      <datalist id="sizes">{uniqueSizes.map((s, i) => <option key={`${s}-${i}`} value={s} />)}</datalist>
      <datalist id="colors">{uniqueColors.map((c, i) => <option key={`${c}-${i}`} value={c} />)}</datalist>
      <datalist id="materials">{uniqueMaterials.map((m, i) => <option key={`${m}-${i}`} value={m} />)}</datalist>

      {stockData.length === 0 ? (
        <div className="text-center py-20 text-foreground/40">
          <p className="text-lg mb-2">No products found</p>
          <p className="text-sm">Products will appear here once they exist in the database.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {stockData.map((product: any) => {
            const content = getProductContent(product.id);
            const stock = product.stock_quantity ?? -1;
            const lowThreshold = product.low_stock_threshold ?? 5;
            const isLow = stock >= 0 && stock <= lowThreshold && stock > 0;
            const isOut = stock === 0;
            const isExpanded = expandedStockProduct === product.id;
            const sizes: string[] = content?.variations?.sizes || product.variations?.sizes || [];
            const colors: string[] = content?.variations?.colors || product.variations?.colors || [];
            const hasVariants = sizes.length > 0 && colors.length > 0;

            return (
              <div key={product.id} className="border border-foreground/10 rounded-2xl overflow-hidden transition-all hover:border-foreground/20">
                {/* Product row header */}
                <div className="px-5 py-4 flex items-center gap-4">
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-foreground/10 bg-foreground/5 shrink-0">
                    {(content?.images?.[0] || product.images?.[0]) ? (
                      <img src={content?.images?.[0] || product.images?.[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-foreground/20 text-xs">No img</div>
                    )}
                  </div>

                  {/* Product info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <p className="font-medium text-sm truncate">{content?.name || product.name}</p>
                      {hasVariants && (
                        <span className="text-[9px] uppercase tracking-widest text-foreground/30">{sizes.length} sizes x {colors.length} colors</span>
                      )}
                      {content?.category && (
                        <span className="text-[9px] uppercase tracking-widest text-foreground/20">{content.category}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-foreground/40">${parseFloat(product.price).toFixed(2)}{product.sku ? ` · ${product.sku}` : ''}</p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {/* Stock info */}
                    <div className="hidden md:flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-widest text-foreground/30">Stock</p>
                        <p className="font-mono text-sm">{stock === -1 ? <span className="text-foreground/40 italic">untracked</span> : stock}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-widest text-foreground/30">Max/Order</p>
                        <p className="text-sm">{product.max_per_order ?? 3}</p>
                      </div>
                    </div>

                    {/* Status badge */}
                    <div>
                      {stock === -1 ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider bg-foreground/[0.03] text-foreground/40 border border-foreground/10">Untracked</span>
                      ) : isOut ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider bg-foreground text-background border border-foreground">Out of Stock</span>
                      ) : isLow ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider bg-foreground/20 text-foreground border border-foreground/30">Low Stock</span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider bg-foreground/[0.06] text-foreground/70 border border-foreground/15">In Stock</span>
                      )}
                    </div>

                    {/* Expand button */}
                    <button
                      onClick={() => toggleExpandStock(product.id)}
                      className={`text-foreground/30 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                    >&#9654;</button>
                  </div>
                </div>

                {/* ===== Expanded: Unified Product Editing (Content + Stock + Variants) ===== */}
                {isExpanded && content && (
                  <div className="border-t border-foreground/10 bg-foreground/[0.015]">
                    {/* --- Content Section --- */}
                    <div className="px-5 py-5 space-y-5">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="h-[1px] w-4 bg-foreground/20"></span>
                        <p className="text-[10px] uppercase tracking-[0.25em] text-foreground/40">Details</p>
                      </div>
                      {/* Name + Price + Category */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/40 mb-2">Name</p>
                          <input className="w-full bg-transparent border-b border-foreground/10 pb-1 text-sm font-heading font-light focus:border-foreground/30 focus:outline-none transition-colors" value={content.name || ''} onChange={e => {
                            const p = [...productsData]; const idx = p.findIndex(x => x.id === product.id);
                            if (idx >= 0) { p[idx].name = e.target.value; setProductsData(p); }
                          }} placeholder="Product name" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/40 mb-2">Price</p>
                          <div className="relative">
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 text-foreground/30 text-sm">$</span>
                            <input type="number" className="w-full bg-transparent border-b border-foreground/10 pb-1 pl-4 text-sm focus:border-foreground/30 focus:outline-none transition-colors" value={content.price ?? 0} onChange={e => {
                              const p = [...productsData]; const idx = p.findIndex(x => x.id === product.id);
                              if (idx >= 0) { p[idx].price = parseFloat(e.target.value); setProductsData(p); }
                            }} />
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/40 mb-2">Category</p>
                          <input list="categories" className="w-full bg-transparent border-b border-foreground/10 pb-1 text-sm focus:border-foreground/30 focus:outline-none transition-colors" value={content.category || ''} onChange={e => {
                            const p = [...productsData]; const idx = p.findIndex(x => x.id === product.id);
                            if (idx >= 0) { p[idx].category = e.target.value; setProductsData(p); }
                          }} placeholder="Category" />
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/40 mb-2">Description</p>
                        <textarea className="w-full bg-transparent border-b border-foreground/10 pb-1 text-sm text-foreground/70 font-light leading-relaxed focus:border-foreground/30 focus:outline-none transition-colors resize-none" rows={2} value={content.description || ''} onChange={e => {
                          const p = [...productsData]; const idx = p.findIndex(x => x.id === product.id);
                          if (idx >= 0) { p[idx].description = e.target.value; setProductsData(p); }
                        }} placeholder="Description" />
                      </div>

                      {/* Tags, Sizes, Colors, Materials */}
                      <div className="grid grid-cols-2 gap-4">
                        <TagInput label="Tags" values={content.tags || []} onChange={vals => { const p = [...productsData]; const idx = p.findIndex(x => x.id === product.id); if (idx >= 0) { p[idx].tags = vals; setProductsData(p); } }} listId="tags" placeholder="Type and press Enter" />
                        <TagInput label="Sizes" values={content.variations?.sizes || []} onChange={vals => { const p = [...productsData]; const idx = p.findIndex(x => x.id === product.id); if (idx >= 0) { p[idx].variations = { ...p[idx].variations, sizes: vals }; setProductsData(p); } }} listId="sizes" placeholder="Type and press Enter" />
                        <TagInput label="Colors" values={content.variations?.colors || []} onChange={vals => { const p = [...productsData]; const idx = p.findIndex(x => x.id === product.id); if (idx >= 0) { p[idx].variations = { ...p[idx].variations, colors: vals }; setProductsData(p); } }} listId="colors" placeholder="Type and press Enter" />
                        <TagInput label="Materials" values={content.variations?.materials || []} onChange={vals => { const p = [...productsData]; const idx = p.findIndex(x => x.id === product.id); if (idx >= 0) { p[idx].variations = { ...p[idx].variations, materials: vals }; setProductsData(p); } }} listId="materials" placeholder="Type and press Enter" />
                      </div>

                      {/* Images */}
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/40 mb-3">Images <span className="normal-case tracking-normal text-foreground/25">(drag from library or click + on toolbar to upload)</span></p>
                        <div className="flex gap-3 flex-wrap">
                          {(content.images || []).map((img: string, i: number) => (
                            <div key={i} className="relative group">
                              {img && img.trim() !== '' ? (
                                <div className="p-1 rounded-xl border border-foreground/10 hover:ring-1 hover:ring-foreground/20 transition-all">
                                  <img src={img} className="max-h-24 w-auto object-contain rounded-lg" alt="product" />
                                  <button className="absolute -top-1.5 -right-1.5 bg-foreground/80 text-background rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[9px]" onClick={() => {
                                    const p = [...productsData]; const idx = p.findIndex(x => x.id === product.id);
                                    if (idx >= 0) { p[idx].images.splice(i, 1); setProductsData(p); }
                                  }}>&times;</button>
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mx-5 h-px bg-foreground/5"></div>

                    {/* --- Stock & Inventory Section --- */}
                    <div className="px-5 py-5 space-y-4">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="h-[1px] w-4 bg-foreground/20"></span>
                        <p className="text-[10px] uppercase tracking-[0.25em] text-foreground/40">Inventory</p>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div><label className="text-[10px] uppercase tracking-widest text-foreground/30 block mb-1">SKU</label><input className="w-full border border-foreground/20 bg-background p-2 rounded-lg text-sm" defaultValue={product.sku || ''} placeholder="SKU" onBlur={e => updateStock(product.id, 'sku', e.target.value || null)} /></div>
                        <div><label className="text-[10px] uppercase tracking-widest text-foreground/30 block mb-1">Stock (-1=untracked)</label><input type="number" className="w-full border border-foreground/20 bg-background p-2 rounded-lg text-sm" defaultValue={stock === -1 ? '' : stock} placeholder="-1" onBlur={e => { const v = e.target.value; updateStock(product.id, 'stockQuantity', v === '' ? -1 : parseInt(v)); }} /></div>
                        <div><label className="text-[10px] uppercase tracking-widest text-foreground/30 block mb-1">Low Alert</label><input type="number" className="w-full border border-foreground/20 bg-background p-2 rounded-lg text-sm" defaultValue={lowThreshold} min={0} onBlur={e => updateStock(product.id, 'lowStockThreshold', parseInt(e.target.value) || 3)} /></div>
                        <div><label className="text-[10px] uppercase tracking-widest text-foreground/30 block mb-1">Max/Order</label><input type="number" className="w-full border border-foreground/20 bg-background p-2 rounded-lg text-sm" defaultValue={product.max_per_order ?? 3} min={1} onBlur={e => updateStock(product.id, 'maxPerOrder', parseInt(e.target.value) || 3)} /></div>
                      </div>

                      {/* Variant Stock Grid */}
                      {hasVariants && (
                        <div className="mt-4">
                          <p className="text-[10px] uppercase tracking-widest text-foreground/40 mb-3">Per-Variant Stock (Size x Color)</p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-foreground/10">
                                  <th className="text-left text-[10px] uppercase tracking-widest text-foreground/30 py-2 pr-3 font-medium">Size \ Color</th>
                                  {colors.map(c => (
                                    <th key={c} className="text-center text-[10px] uppercase tracking-widest text-foreground/30 py-2 px-2 font-medium min-w-[80px]">{c}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {sizes.map(size => (
                                  <tr key={size} className="border-b border-foreground/5 hover:bg-foreground/[0.02]">
                                    <td className="py-2 pr-3 text-foreground/70 font-medium text-xs whitespace-nowrap">{size}</td>
                                    {colors.map(color => {
                                      const vStock = getVariantStockDisplay(product.id, size, color);
                                      const vIsOut = vStock === 0;
                                      const vIsLow = vStock > 0 && vStock <= (product.low_stock_threshold ?? 3);

                                      return (
                                        <td key={`${size}-${color}`} className="py-2 px-2 text-center">
                                          <div className={`inline-flex items-center justify-center min-w-[48px] h-8 rounded-lg text-xs font-mono ${vIsOut ? 'bg-foreground text-background' : vIsLow ? 'bg-foreground/20 text-foreground' : 'bg-foreground/[0.03] text-foreground/70'} transition-colors`}>
                                            <input
                                              type="number"
                                              className="w-full text-center bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-foreground/30 rounded-lg p-1 text-xs font-mono"
                                              defaultValue={vStock === -2 ? '' : (vStock === -1 ? '-1' : vStock)}
                                              placeholder="--"
                                              onBlur={e => {
                                                const v = e.target.value;
                                                updateVariantStock(product.id, size, color, 'stockQuantity', v === '' ? null : (v === '-1' ? -1 : parseInt(v)));
                                              }}
                                            />
                                          </div>
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <p className="text-[10px] text-foreground/25 mt-3">Blank = use default stock. -1 = untracked (always in stock). 0 = out of stock.</p>
                        </div>
                      )}
                    </div>

                    {/* Save / Delete */}
                    <div className="px-5 py-4 flex items-center justify-between border-t border-foreground/10">
                      <button onClick={() => {
                          setProductsData(productsData.filter(p => p.id !== product.id));
                          save('products', productsData.filter(p => p.id !== product.id));
                          setExpandedStockProduct(null);
                          showToast('Product deleted', 'info');
                      }} className="text-[10px] uppercase tracking-widest text-foreground/30 hover:text-foreground/60 transition-colors px-3 py-1 rounded-full border border-foreground/10 hover:border-foreground/30">Delete Product</button>
                      <button onClick={() => { save('products', content, product.id); fetchStock(); }} className="group relative bg-foreground text-background rounded-full pl-6 pr-1.5 py-1.5 text-[11px] uppercase tracking-widest font-medium hover:bg-foreground/90 transition-all active:scale-[0.98]">
                        <span className="py-1.5">Save All</span>
                        <span className="inline-flex w-7 h-7 items-center justify-center rounded-full bg-background/20 ml-2">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ======== HOMEPAGE TAB ========

  const renderHomepage = () => (
    <div className="grid grid-cols-12 gap-8 lg:gap-12">
      {/* Media Library Sidebar */}
      <aside className="col-span-12 lg:col-span-5 xl:col-span-4 lg:sticky lg:top-28 self-start">
        <div className="p-1.5 rounded-[2rem] bg-foreground/5 ring-1 ring-foreground/10">
          <div className="rounded-[calc(2rem-0.375rem)] bg-background p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-foreground/40 mb-1">Library</p>
                <h2 className="text-lg font-heading font-light">Media</h2>
              </div>
              <label className={`cursor-pointer bg-foreground text-background w-9 h-9 rounded-full flex items-center justify-center hover:bg-foreground/90 transition-all active:scale-95 ${uploading ? 'opacity-40 cursor-not-allowed' : ''}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} accept="image/*" />
              </label>
            </div>
            {uploading && <p className="text-[10px] uppercase tracking-widest text-foreground/40 mb-4">Uploading...</p>}
            <div className="columns-3 gap-2 overflow-y-auto max-h-[75vh] pr-1">
              {images.length === 0 ? (
                <p className="text-foreground/30 text-xs uppercase tracking-widest col-span-3 py-12 text-center">No images yet</p>
              ) : (
                images.map((img, index) => (
                  <div key={`${img}-${index}`} className="relative group border border-foreground/10 p-1 rounded-xl mb-2 break-inside-avoid hover:ring-1 hover:ring-foreground/20 transition-all">
                    <img draggable onDragStart={e => e.dataTransfer.setData('text/plain', img)} src={img} alt="Library" className="w-full h-auto object-contain rounded-lg cursor-grab" />
                    <button className="absolute top-2 right-2 bg-foreground/80 text-background rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px]"
                      onClick={async () => {
                        const res = await fetch('/api/cms/images/delete', { method: 'POST', body: JSON.stringify({ imageUrl: img }) });
                        if (res.ok) { setImages(images.filter(i => i !== img)); }
                      }}>&times;</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </aside>

      <main className="col-span-12 lg:col-span-7 xl:col-span-8 space-y-10">
        {/* Homepage Editor */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <span className="h-[1px] w-6 bg-foreground/20"></span>
            <p className="text-[10px] uppercase tracking-[0.25em] text-foreground/40">Section</p>
          </div>
          <div className="p-1.5 rounded-[2rem] bg-foreground/5 ring-1 ring-foreground/10">
            <div className="rounded-[calc(2rem-0.375rem)] bg-background p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-heading font-light">Homepage</h2>
                <button onClick={() => save('homepage', homepageData)} className="group relative bg-foreground text-background rounded-full pl-6 pr-1.5 py-1.5 text-[11px] uppercase tracking-widest font-medium hover:bg-foreground/90 transition-all active:scale-[0.98]">
                  <span className="py-1.5">Save</span>
                  <span className="inline-flex w-7 h-7 items-center justify-center rounded-full bg-background/20 ml-2">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </span>
                </button>
              </div>

              {/* Hero */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-foreground/40 mb-4">Hero</p>
                <div className="space-y-4">
                  <input className="w-full bg-transparent border-b border-foreground/10 pb-2 text-xl font-heading font-light focus:border-foreground/30 focus:outline-none transition-colors placeholder:text-foreground/20" value={homepageData.hero.title} onChange={e => setHomepageData({...homepageData, hero: {...homepageData.hero, title: e.target.value}})} placeholder="Title" />
                  <textarea className="w-full bg-transparent border-b border-foreground/10 pb-2 text-sm text-foreground/70 font-light leading-relaxed focus:border-foreground/30 focus:outline-none transition-colors resize-none placeholder:text-foreground/20" rows={3} value={homepageData.hero.description || ''} onChange={e => setHomepageData({...homepageData, hero: {...homepageData.hero, description: e.target.value}})} placeholder="Description" />
                  <div className="border border-dashed border-foreground/15 p-4 rounded-2xl" onDragOver={e => e.preventDefault()} onDrop={e => { const img = e.dataTransfer.getData('text/plain'); setHomepageData({...homepageData, hero: {...homepageData.hero, image: img}}); }}>
                    <p className="text-[10px] uppercase tracking-widest text-foreground/30 mb-3">Hero Image <span className="normal-case tracking-normal">(drag from library)</span></p>
                    {homepageData.hero.image ? (
                      <div className="relative inline-block">
                        <img src={homepageData.hero.image} alt="Hero" className="max-h-64 w-auto object-contain rounded-xl" />
                        <button className="absolute -top-2 -right-2 bg-foreground/80 text-background rounded-full w-5 h-5 flex items-center justify-center text-[10px] hover:bg-foreground transition-colors" onClick={() => setHomepageData({...homepageData, hero: {...homepageData.hero, image: ''}})}>&times;</button>
                      </div>
                    ) : (
                      <div className="h-32 w-full bg-foreground/[0.02] rounded-xl flex items-center justify-center">
                        <span className="text-[10px] uppercase tracking-widest text-foreground/25">Drop image here</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="w-full h-px bg-foreground/5"></div>

              {/* Mission */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-foreground/40 mb-4">Mission</p>
                <div className="space-y-4">
                  <input className="w-full bg-transparent border-b border-foreground/10 pb-2 text-xl font-heading font-light focus:border-foreground/30 focus:outline-none transition-colors placeholder:text-foreground/20" value={homepageData.mission.title} onChange={e => setHomepageData({...homepageData, mission: {...homepageData.mission, title: e.target.value}})} placeholder="Title" />
                  <textarea className="w-full bg-transparent border-b border-foreground/10 pb-2 text-sm text-foreground/70 font-light leading-relaxed focus:border-foreground/30 focus:outline-none transition-colors resize-none placeholder:text-foreground/20" rows={3} value={homepageData.mission.description || ''} onChange={e => setHomepageData({...homepageData, mission: {...homepageData.mission, description: e.target.value}})} placeholder="Description" />
                  <div className="border border-dashed border-foreground/15 p-4 rounded-2xl" onDragOver={e => e.preventDefault()} onDrop={e => { const img = e.dataTransfer.getData('text/plain'); setHomepageData({...homepageData, mission: {...homepageData.mission, image: img}}); }}>
                    <p className="text-[10px] uppercase tracking-widest text-foreground/30 mb-3">Mission Image <span className="normal-case tracking-normal">(drag from library)</span></p>
                    {homepageData.mission.image ? (
                      <div className="relative inline-block">
                        <img src={homepageData.mission.image} alt="Mission" className="max-h-64 w-auto object-contain rounded-xl" />
                        <button className="absolute -top-2 -right-2 bg-foreground/80 text-background rounded-full w-5 h-5 flex items-center justify-center text-[10px] hover:bg-foreground transition-colors" onClick={() => setHomepageData({...homepageData, mission: {...homepageData.mission, image: ''}})}>&times;</button>
                      </div>
                    ) : (
                      <div className="h-32 w-full bg-foreground/[0.02] rounded-xl flex items-center justify-center">
                        <span className="text-[10px] uppercase tracking-widest text-foreground/25">Drop image here</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="w-full h-px bg-foreground/5"></div>

              {/* Differentiation Points */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-foreground/40 mb-4">Differentiation</p>
                <div className="space-y-3">
                  {(homepageData.differentiation?.points || []).map((point: any, index: number) => (
                    <div key={index} className="p-4 bg-foreground/[0.02] rounded-2xl space-y-2">
                      <input className="w-full bg-transparent border-b border-foreground/10 pb-1 text-sm font-medium focus:border-foreground/30 focus:outline-none transition-colors placeholder:text-foreground/20" value={point.title} onChange={e => { const newPoints = [...homepageData.differentiation.points]; newPoints[index].title = e.target.value; setHomepageData({...homepageData, differentiation: {...homepageData.differentiation, points: newPoints}}); }} placeholder="Point Title" />
                      <textarea className="w-full bg-transparent border-b border-foreground/10 pb-1 text-sm text-foreground/60 font-light focus:border-foreground/30 focus:outline-none transition-colors resize-none placeholder:text-foreground/20" rows={2} value={point.description} onChange={e => { const newPoints = [...homepageData.differentiation.points]; newPoints[index].description = e.target.value; setHomepageData({...homepageData, differentiation: {...homepageData.differentiation, points: newPoints}}); }} placeholder="Point Description" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Products Editor */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <span className="h-[1px] w-6 bg-foreground/20"></span>
            <p className="text-[10px] uppercase tracking-[0.25em] text-foreground/40">Featured</p>
          </div>
          <div className="p-1.5 rounded-[2rem] bg-foreground/5 ring-1 ring-foreground/10">
            <div className="rounded-[calc(2rem-0.375rem)] bg-background p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] space-y-6">
              <h2 className="text-2xl font-heading font-light">Featured Products</h2>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/40 mb-3">Currently Featured</p>
                <div className="flex flex-wrap gap-2">
                  {(homepageData.featuredProductIds || []).length === 0 ? (
                    <span className="text-xs text-foreground/30 italic">None selected</span>
                  ) : (homepageData.featuredProductIds || []).map((id: string) => {
                    const product = productsData.find(p => p.id === id);
                    if (!product) return null;
                    return (
                      <span key={id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-foreground text-background text-xs">
                        {product.name}
                        <button onClick={() => setHomepageData({...homepageData, featuredProductIds: homepageData.featuredProductIds.filter((fid: string) => fid !== id)})} className="hover:bg-background/20 rounded-full w-4 h-4 flex items-center justify-center transition-colors text-[10px]">&times;</button>
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="w-full h-px bg-foreground/5"></div>
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/40 mb-2">Add Product</p>
                  <div className="relative">
                    <select className="w-full bg-transparent border-b border-foreground/10 py-2.5 text-sm focus:border-foreground/30 focus:outline-none transition-colors cursor-pointer" onChange={e => { if (e.target.value && !homepageData.featuredProductIds.includes(e.target.value)) { setHomepageData({...homepageData, featuredProductIds: [...homepageData.featuredProductIds, e.target.value]}); e.target.value = ''; } }}>
                      <option value="">Select a product...</option>
                      {productsData?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={() => save('homepage', homepageData)} className="group relative bg-foreground text-background rounded-full pl-6 pr-1.5 py-1.5 text-[11px] uppercase tracking-widest font-medium hover:bg-foreground/90 transition-all active:scale-[0.98]">
                  <span className="py-1.5">Save</span>
                  <span className="inline-flex w-7 h-7 items-center justify-center rounded-full bg-background/20 ml-2">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );

  // ======== MAIN RENDER ========

  return (
    <div className="w-full bg-background text-foreground min-h-screen selection:bg-primary selection:text-primary-foreground">
      <main role="main" aria-label="CMS dashboard" className="max-w-[1400px] mx-auto px-4 md:px-8 pt-32 pb-24 relative">

        {/* Toast Notifications */}
        {toast && (
          <div className={`fixed top-24 right-6 z-50 px-5 py-3 rounded-full text-xs uppercase tracking-widest font-medium shadow-lg transition-all duration-300 ${
            toast.type === 'success'
              ? 'bg-foreground text-background'
              : toast.type === 'error'
                ? 'bg-foreground text-background ring-2 ring-foreground/30'
                : 'bg-foreground/90 text-background'
          }`}>
            {toast.message}
          </div>
        )}
        {/* Auto-refresh notification */}
        {refreshNotification && !toast && (
          <div className="fixed top-24 right-6 z-40 bg-foreground/80 text-background px-5 py-3 rounded-full text-xs uppercase tracking-widest font-medium shadow-lg backdrop-blur-sm">
            {refreshNotification}
          </div>
        )}

        {/* Auto-refresh indicator */}
        <div className="absolute top-32 right-6 flex items-center gap-2 text-[10px] uppercase tracking-widest text-foreground/25">
          <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-pulse"></span>
          Live Sync
        </div>

        {/* Header */}
        <header role="banner" aria-label="CMS dashboard header" className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <span className="h-[1px] w-8 bg-foreground/20"></span>
            <span className="text-[10px] uppercase tracking-[0.25em] text-foreground/50 font-medium">Dashboard</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-heading font-light tracking-tight leading-[0.9]">Content <span className="italic text-foreground/50">Management</span></h1>
        </header>

        {/* Tab Navigation */}
        <nav role="navigation" aria-label="CMS sections" className="flex gap-1 mb-12">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`relative px-6 py-3 text-[11px] uppercase tracking-[0.15em] font-medium transition-all rounded-full ${activeTab === tab.key ? 'bg-foreground text-background' : 'text-foreground/40 hover:text-foreground/70 hover:bg-foreground/5'}`}>
              {tab.label}
            </button>
          ))}
        </nav>

      {/* ====== PRODUCTS TAB ====== */}
      {activeTab === 'stock' && renderStock()}

      {/* ====== ORDERS TAB ====== */}
      {activeTab === 'orders' && renderOrders()}

      {/* ====== HOMEPAGE TAB ====== */}
      {activeTab === 'homepage' && renderHomepage()}

      </main>
    </div>
  );
}