"use client";
import { useState, useEffect, useRef } from 'react';

type Tab = 'content' | 'orders' | 'stock';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  paid: 'bg-green-100 text-green-800 border-green-200',
  shipped: 'bg-blue-100 text-blue-800 border-blue-200',
  delivered: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  refunded: 'bg-purple-100 text-purple-800 border-purple-200',
};

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('content');

  // --- Content Tab State ---
  const [homepageData, setHomepageData] = useState<any>(null);
  const [productsData, setProductsData] = useState<any[] | null>(null);
  const [filter, setFilter] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [editingStock, setEditingStock] = useState<string | null>(null);

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
  useEffect(() => { if (activeTab === 'orders') fetchOrders(); }, [activeTab, ordersPage, ordersFilter]);
  useEffect(() => { if (activeTab === 'stock') fetchStock(); }, [activeTab]);

  // ======== Content Tab Helpers ========

  const save = async (type: string, data: any, id?: string) => {
    let payload = data;
    if (type === 'products' && id) {
      const currentData = await fetch('/api/cms/content?type=products').then(res => res.json());
      payload = currentData.map((p: any) => p.id === id ? data : p);
    }
    try {
      const res = await fetch('/api/cms/content', { method: 'POST', body: JSON.stringify({ type, data: payload }) });
      if (res.ok) alert('Saved successfully!');
      else alert('Failed to save');
    } catch (err) { alert('Error saving: ' + err); }
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
      if (res.ok && result.success) { setImages([...images, result.path]); alert('Image uploaded!'); if (fileInputRef.current) fileInputRef.current.value = ''; }
      else alert('Upload failed: ' + (result.error || 'Unknown'));
    } catch (err) { alert('Upload error: ' + err); }
    finally { setUploading(false); }
  };

  const TagInput = ({ label, values, onChange, listId, placeholder }: { label: string, values: string[], onChange: (vals: string[]) => void, listId: string, placeholder: string }) => (
    <div>
      <label className="text-xs uppercase font-medium text-foreground/60 mb-1 block">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {(values || []).map((val: string, i: number) => (
          <span key={i} className="bg-primary/20 text-primary px-2 py-1 rounded-full text-xs flex items-center gap-1">
            {val}
            <button onClick={() => onChange(values.filter((_, idx) => idx !== i))} className="hover:text-primary/80">×</button>
          </span>
        ))}
      </div>
      <input list={listId} className="w-full border border-foreground/10 bg-background/5 p-2 rounded-lg" onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); const val = e.currentTarget.value.trim(); if (val && !values.includes(val)) { onChange([...values, val]); e.currentTarget.value = ''; } }
      }} placeholder={placeholder} />
    </div>
  );

  // ======== Orders Tab Helpers ========

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/cms/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, note: statusNote || undefined }),
      });
      if (res.ok) { fetchOrders(); setStatusNote(''); setExpandedOrder(null); }
      else alert('Failed to update order');
    } catch { alert('Error updating order'); }
  };

  // ======== Stock Tab Helpers ========

  const updateStock = async (productId: string, field: string, value: any) => {
    try {
      const res = await fetch('/api/cms/stock', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, [field]: value }),
      });
      if (res.ok) fetchStock();
      else alert('Failed to update stock');
    } catch { alert('Error updating stock'); }
  };

  // ======== Render Helpers ========

  if (!homepageData || !productsData) return <div className="p-8 pt-32 text-center">Loading...</div>;

  const filteredProducts = productsData?.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()) || p.category.toLowerCase().includes(filter.toLowerCase())) || [];
  const uniqueCategories = Array.from(new Set(productsData?.map(p => p.category).filter(Boolean)));
  const uniqueTags = Array.from(new Set(productsData?.flatMap(p => p.tags || []).filter(Boolean)));
  const uniqueSizes = Array.from(new Set(productsData?.flatMap(p => p.variations?.sizes || []).filter(Boolean)));
  const uniqueColors = Array.from(new Set(productsData?.flatMap(p => p.variations?.colors || []).filter(Boolean)));
  const uniqueMaterials = Array.from(new Set(productsData?.flatMap(p => p.variations?.materials || []).filter(Boolean)));

  const tabs: { key: Tab; label: string }[] = [
    { key: 'content', label: 'Content' },
    { key: 'orders', label: `Orders${ordersTotal > 0 ? ` (${ordersTotal})` : ''}` },
    { key: 'stock', label: 'Stock' },
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
                    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-medium border ${STATUS_COLORS[order.status] || STATUS_COLORS.pending}`}>
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
                  {/* Shipping Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><span className="text-foreground/40 text-xs uppercase block mb-1">Ship To</span><p>{order.shipping_address}</p><p>{order.shipping_city}, {order.shipping_state} {order.shipping_zip}</p></div>
                    <div><span className="text-foreground/40 text-xs uppercase block mb-1">Shipping</span><p className="capitalize">{order.shipping_method?.replace('_', ' ')}</p></div>
                    <div><span className="text-foreground/40 text-xs uppercase block mb-1">Subtotal</span><p>${parseFloat(order.subtotal).toFixed(2)}</p></div>
                    <div><span className="text-foreground/40 text-xs uppercase block mb-1">Tax + Shipping</span><p>${parseFloat(order.tax_amount || 0).toFixed(2)} + ${parseFloat(order.shipping_cost).toFixed(2)}</p></div>
                  </div>

                  {/* Items */}
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

                  {/* Update Status */}
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

          {/* Pagination */}
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

  // ======== STOCK TAB ========

  const renderStock = () => (
    <div className="space-y-4">
      <p className="text-sm text-foreground/50">Manage inventory levels. Stock of <span className="font-mono text-foreground/70">-1</span> means untracked (always in stock). Set a number to enable tracking.</p>

      {stockData.length === 0 ? (
        <div className="text-center py-20 text-foreground/40">
          <p className="text-lg mb-2">No products found</p>
          <p className="text-sm">Products will appear here once they exist in the database.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Header row */}
          <div className="grid grid-cols-12 gap-3 px-4 py-2 text-[10px] uppercase tracking-widest text-foreground/40 font-medium border-b border-foreground/10">
            <div className="col-span-2">Product</div>
            <div className="col-span-1">SKU</div>
            <div className="col-span-1">Stock</div>
            <div className="col-span-1">Low Alert</div>
            <div className="col-span-1">Max/Order</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-4 text-right">Actions</div>
          </div>

          {stockData.map((product: any) => {
            const stock = product.stock_quantity ?? -1;
            const lowThreshold = product.low_stock_threshold ?? 5;
            const isLow = stock >= 0 && stock <= lowThreshold && stock > 0;
            const isOut = stock === 0;

            return (
              <div key={product.id} className={`grid grid-cols-12 gap-3 items-center px-4 py-3 rounded-xl border ${editingStock === product.id ? 'border-primary bg-primary/5' : 'border-foreground/10 hover:bg-foreground/[0.02]'} transition-colors`}>
                <div className="col-span-2 min-w-0">
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  <p className="text-[10px] text-foreground/40">${parseFloat(product.price).toFixed(2)}</p>
                </div>

                {editingStock === product.id ? (
                  <>
                    <div className="col-span-1"><input className="w-full border border-foreground/20 bg-background p-1.5 rounded-lg text-sm" defaultValue={product.sku || ''} placeholder="SKU" onBlur={e => updateStock(product.id, 'sku', e.target.value || null)} /></div>
                    <div className="col-span-1"><input type="number" className="w-full border border-foreground/20 bg-background p-1.5 rounded-lg text-sm" defaultValue={stock === -1 ? '' : stock} placeholder="-1" onBlur={e => { const v = e.target.value; updateStock(product.id, 'stockQuantity', v === '' ? -1 : parseInt(v)); }} /></div>
                    <div className="col-span-1"><input type="number" className="w-full border border-foreground/20 bg-background p-1.5 rounded-lg text-sm" defaultValue={lowThreshold} min={0} onBlur={e => updateStock(product.id, 'lowStockThreshold', parseInt(e.target.value) || 3)} /></div>
                    <div className="col-span-1"><input type="number" className="w-full border border-foreground/20 bg-background p-1.5 rounded-lg text-sm" defaultValue={product.max_per_order ?? 3} min={1} onBlur={e => updateStock(product.id, 'maxPerOrder', parseInt(e.target.value) || 3)} /></div>
                  </>
                ) : (
                  <>
                    <div className="col-span-1 text-xs font-mono text-foreground/60">{product.sku || '—'}</div>
                    <div className="col-span-1 font-mono text-sm">{stock === -1 ? <span className="text-foreground/40 italic">—</span> : stock}</div>
                    <div className="col-span-1 text-sm text-foreground/50">{stock >= 0 ? lowThreshold : '—'}</div>
                    <div className="col-span-1 text-sm text-foreground/50">{product.max_per_order ?? 3}</div>
                  </>
                )}

                <div className="col-span-2">
                  {stock === -1 ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider bg-foreground/5 text-foreground/50 border border-foreground/10">Untracked</span>
                  ) : isOut ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider bg-red-100 text-red-700 border border-red-200">Out of Stock</span>
                  ) : isLow ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200">Low Stock</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider bg-green-100 text-green-700 border border-green-200">In Stock</span>
                  )}
                </div>

                <div className="col-span-4 text-right">
                  {editingStock === product.id ? (
                    <button onClick={() => { setEditingStock(null); fetchStock(); }} className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-xs">Done</button>
                  ) : (
                    <button onClick={() => setEditingStock(product.id)} className="px-3 py-1 border border-foreground/20 rounded-full text-xs hover:bg-foreground/5 transition-colors">Edit Stock</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ======== MAIN RENDER ========

  return (
    <div className="p-4 md:p-8 pt-32 max-w-7xl mx-auto bg-background text-foreground min-h-screen">
      <h1 className="pt-16 pb-8 text-center text-4xl font-heading font-light tracking-tight">CMS</h1>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-8 border-b border-foreground/10">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === tab.key ? 'border-primary text-foreground' : 'border-transparent text-foreground/40 hover:text-foreground/70'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ====== ORDERS TAB ====== */}
      {activeTab === 'orders' && renderOrders()}

      {/* ====== STOCK TAB ====== */}
      {activeTab === 'stock' && renderStock()}

      {/* ====== CONTENT TAB (original CMS) ====== */}
      {activeTab === 'content' && (
      <div className="grid grid-cols-12 gap-8">
        {/* Datalists */}
        <datalist id="categories">{uniqueCategories.map((c, i) => <option key={`${c}-${i}`} value={c} />)}</datalist>
        <datalist id="tags">{uniqueTags.map((t, i) => <option key={`${t}-${i}`} value={t} />)}</datalist>
        <datalist id="sizes">{uniqueSizes.map((s, i) => <option key={`${s}-${i}`} value={s} />)}</datalist>
        <datalist id="colors">{uniqueColors.map((c, i) => <option key={`${c}-${i}`} value={c} />)}</datalist>
        <datalist id="materials">{uniqueMaterials.map((m, i) => <option key={`${m}-${i}`} value={m} />)}</datalist>

        {/* Media Library */}
        <aside className="col-span-12 lg:col-span-5 xl:col-span-4 border border-foreground/10 p-6 rounded-3xl lg:sticky lg:top-28 bg-foreground/5 self-start">
          <h2 className="text-xl font-heading mb-6 flex justify-between items-center">
            Media Library
            <label className={`cursor-pointer bg-primary text-primary-foreground p-2 rounded-full hover:bg-primary/90 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} accept="image/*" />
            </label>
          </h2>
          {uploading && <p className="text-sm text-primary mb-4">Uploading...</p>}
          <div className="columns-3 gap-2 overflow-y-auto max-h-[80vh] pr-2">
            {images.length === 0 ? (
              <p className="text-foreground/40 text-sm">No images uploaded yet</p>
            ) : (
              images.map((img, index) => (
                <div key={`${img}-${index}`} className="relative group border border-foreground/10 p-1 rounded-xl mb-2 break-inside-avoid">
                  <img draggable onDragStart={e => e.dataTransfer.setData('text/plain', img)} src={img} alt="Library" className="w-full h-auto object-contain rounded-lg cursor-grab" />
                  <button className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100"
                    onClick={async () => {
                      const res = await fetch('/api/cms/images/delete', { method: 'POST', body: JSON.stringify({ imageUrl: img }) });
                      if (res.ok) { setImages(images.filter(i => i !== img)); alert('Image deleted'); }
                      else alert('Failed to delete image');
                    }}>&times;</button>
                </div>
              ))
            )}
          </div>
        </aside>

        <main className="col-span-12 lg:col-span-7 xl:col-span-8 space-y-12">
          {/* Homepage Editor */}
          <section className="border border-foreground/10 p-8 rounded-3xl space-y-8">
            <h2 className="text-2xl font-heading">Homepage Editor</h2>
            <div className="space-y-4">
              <h3 className="text-lg font-bold">Hero Section</h3>
              <input className="w-full border border-foreground/10 bg-background/5 p-4 rounded-xl" value={homepageData.hero.title} onChange={e => setHomepageData({...homepageData, hero: {...homepageData.hero, title: e.target.value}})} placeholder="Title" />
              <textarea className="w-full border border-foreground/10 bg-background/5 p-4 rounded-xl" value={homepageData.hero.description || ''} onChange={e => setHomepageData({...homepageData, hero: {...homepageData.hero, description: e.target.value}})} placeholder="Description" />
              <div className="border border-foreground/10 p-4 rounded-xl" onDragOver={e => e.preventDefault()} onDrop={e => { const img = e.dataTransfer.getData('text/plain'); setHomepageData({...homepageData, hero: {...homepageData.hero, image: img}}); }}>
                <label className="block text-xs uppercase tracking-widest font-medium mb-3">Hero Image (Drag from Library)</label>
                <div className="relative inline-block">
                  {homepageData.hero.image ? (
                    <div className="relative">
                      <img src={homepageData.hero.image} alt="Hero" className="max-h-80 w-auto object-contain rounded-xl" />
                      <button className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-80 hover:opacity-100" onClick={() => setHomepageData({...homepageData, hero: {...homepageData.hero, image: ''}})}>&times;</button>
                    </div>
                  ) : (<div className="h-40 w-full bg-background/10 rounded-xl flex items-center justify-center text-foreground/40 text-sm">No image set</div>)}
                </div>
              </div>
            </div>
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-bold">Mission Section</h3>
              <input className="w-full border border-foreground/10 bg-background/5 p-4 rounded-xl" value={homepageData.mission.title} onChange={e => setHomepageData({...homepageData, mission: {...homepageData.mission, title: e.target.value}})} placeholder="Title" />
              <textarea className="w-full border border-foreground/10 bg-background/5 p-4 rounded-xl" value={homepageData.mission.description || ''} onChange={e => setHomepageData({...homepageData, mission: {...homepageData.mission, description: e.target.value}})} placeholder="Description" />
              <div className="border border-foreground/10 p-4 rounded-xl" onDragOver={e => e.preventDefault()} onDrop={e => { const img = e.dataTransfer.getData('text/plain'); setHomepageData({...homepageData, mission: {...homepageData.mission, image: img}}); }}>
                <label className="block text-xs uppercase tracking-widest font-medium mb-3">Mission Image (Drag from Library)</label>
                <div className="relative inline-block">
                  {homepageData.mission.image ? (
                    <div className="relative">
                      <img src={homepageData.mission.image} alt="Mission" className="max-h-80 w-auto object-contain rounded-xl" />
                      <button className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-80 hover:opacity-100" onClick={() => setHomepageData({...homepageData, mission: {...homepageData.mission, image: ''}})}>&times;</button>
                    </div>
                  ) : (<div className="h-40 w-full bg-background/10 rounded-xl flex items-center justify-center text-foreground/40 text-sm">No image set</div>)}
                </div>
              </div>
            </div>
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-bold">Differentiation Points</h3>
              {(homepageData.differentiation?.points || []).map((point: any, index: number) => (
                <div key={index} className="space-y-2 border p-4 rounded-xl">
                  <input className="w-full border border-foreground/10 bg-background/5 p-2 rounded-lg" value={point.title} onChange={e => { const newPoints = [...homepageData.differentiation.points]; newPoints[index].title = e.target.value; setHomepageData({...homepageData, differentiation: {...homepageData.differentiation, points: newPoints}}); }} placeholder="Point Title" />
                  <textarea className="w-full border border-foreground/10 bg-background/5 p-2 rounded-lg" value={point.description} onChange={e => { const newPoints = [...homepageData.differentiation.points]; newPoints[index].description = e.target.value; setHomepageData({...homepageData, differentiation: {...homepageData.differentiation, points: newPoints}}); }} placeholder="Point Description" />
                </div>
              ))}
            </div>
            <button onClick={() => save('homepage', homepageData)} className="bg-primary text-primary-foreground px-6 py-3 rounded-full font-medium hover:bg-primary/90 transition-colors">Save Homepage</button>
          </section>

          {/* Featured Products Editor */}
          <section className="border border-foreground/10 p-8 rounded-3xl space-y-8">
            <h2 className="text-2xl font-heading">Featured Products Editor</h2>
            <div className="flex flex-col gap-4">
              <label className="text-xs uppercase tracking-widest font-medium">Currently Featured</label>
              <div className="flex flex-wrap gap-2">
                {(homepageData.featuredProductIds || []).map((id: string) => {
                  const product = productsData.find(p => p.id === id);
                  if (!product) return null;
                  return (<span key={id} className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm flex items-center gap-2">{product.name}<button onClick={() => setHomepageData({...homepageData, featuredProductIds: homepageData.featuredProductIds.filter((fid: string) => fid !== id)})} className="hover:text-primary/80">&times;</button></span>);
                })}
              </div>
            </div>
            <div className="space-y-4 border-t pt-4">
              <label className="text-xs uppercase tracking-widest font-medium">Add Featured Product</label>
              <select className="border border-foreground/10 bg-background/5 p-4 rounded-xl w-full" onChange={e => { if (e.target.value && !homepageData.featuredProductIds.includes(e.target.value)) { setHomepageData({...homepageData, featuredProductIds: [...homepageData.featuredProductIds, e.target.value]}); } }}>
                <option value="">Select a product...</option>
                {productsData?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <button onClick={() => save('homepage', homepageData)} className="bg-primary text-primary-foreground px-6 py-3 rounded-full font-medium hover:bg-primary/90 transition-colors">Save Homepage</button>
          </section>

          {/* Products Editor */}
          <section className="border border-foreground/10 p-8 rounded-3xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-heading">Products Editor</h2>
              <div className="flex gap-3">
                <input className="border border-foreground/10 bg-background/5 p-3 rounded-full" placeholder="Filter..." value={filter} onChange={e => setFilter(e.target.value)} />
                <button onClick={() => setProductsData([...productsData, { id: Date.now().toString(), name: 'New Product', price: 0, images: [], tags: [], category: '', variations: { sizes: [], colors: [], materials: [] }, description: '' }])} className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm">+ Add Product</button>
              </div>
            </div>
            {filteredProducts.map((product, index) => (
              <div key={product.id} className="mb-8 p-6 border border-foreground/10 rounded-2xl bg-foreground/5" onDragOver={e => e.preventDefault()} onDrop={e => { const img = e.dataTransfer.getData('text/plain'); const newProducts = [...productsData]; if (!newProducts[index].images.includes(img)) { newProducts[index].images.push(img); setProductsData(newProducts); } }}>
                <div className="flex justify-between mb-4">
                  <div className="w-full">
                    <label className="text-xs uppercase font-medium text-foreground/60 mb-1 block">Product Name</label>
                    <input className="font-heading text-xl bg-transparent border-b border-foreground/20 p-1 w-full" value={product.name || ''} onChange={e => { const newProducts = [...productsData]; newProducts[index].name = e.target.value; setProductsData(newProducts); }} />
                  </div>
                  <div className="flex gap-2 mt-6">
                    <button onClick={() => save('products', product, product.id)} className="text-primary hover:text-primary/80 font-medium">Save</button>
                    <button onClick={() => setProductsData(productsData.filter(p => p.id !== product.id))} className="text-red-400 hover:text-red-600 font-medium">Delete</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs uppercase font-medium text-foreground/60 mb-1 block">Price</label><input type="number" className="w-full border border-foreground/10 bg-background/5 p-2 rounded-lg" value={product.price ?? 0} onChange={e => { const newProducts = [...productsData]; newProducts[index].price = parseFloat(e.target.value); setProductsData(newProducts); }} placeholder="Price" /></div>
                  <div><label className="text-xs uppercase font-medium text-foreground/60 mb-1 block">Category</label><input list="categories" className="w-full border border-foreground/10 bg-background/5 p-2 rounded-lg" value={product.category} onChange={e => { const newProducts = [...productsData]; newProducts[index].category = e.target.value; setProductsData(newProducts); }} placeholder="Category" /></div>
                </div>
                <div><label className="text-xs uppercase font-medium text-foreground/60 mb-1 block mt-4">Description</label><textarea className="w-full border border-foreground/10 bg-background/5 p-2 rounded-lg" value={product.description || ''} onChange={e => { const newProducts = [...productsData]; newProducts[index].description = e.target.value; setProductsData(newProducts); }} placeholder="Description" /></div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <TagInput label="Tags" values={product.tags || []} onChange={vals => { const p = [...productsData]; p[index].tags = vals; setProductsData(p); }} listId="tags" placeholder="Type and press Enter" />
                  <TagInput label="Sizes" values={product.variations?.sizes || []} onChange={vals => { const p = [...productsData]; p[index].variations = { ...p[index].variations, sizes: vals }; setProductsData(p); }} listId="sizes" placeholder="Type and press Enter" />
                  <TagInput label="Colors" values={product.variations?.colors || []} onChange={vals => { const p = [...productsData]; p[index].variations = { ...p[index].variations, colors: vals }; setProductsData(p); }} listId="colors" placeholder="Type and press Enter" />
                  <TagInput label="Materials" values={product.variations?.materials || []} onChange={vals => { const p = [...productsData]; p[index].variations = { ...p[index].variations, materials: vals }; setProductsData(p); }} listId="materials" placeholder="Type and press Enter" />
                </div>
                <label className="block text-xs uppercase tracking-widest font-medium mb-3 mt-6">Images (Drag from Library)</label>
                <div className="flex gap-3 flex-wrap">
                  {(product.images || []).map((img: string, i: number) => (
                    <div key={i} className="relative group">
                      {img && img.trim() !== '' ? (
                        <div className="relative">
                          <img src={img} className="max-h-32 w-auto object-contain border border-foreground/10 rounded-xl" alt="product" />
                          <button className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100" onClick={() => { const newProducts = [...productsData]; newProducts[index].images.splice(i, 1); setProductsData(newProducts); }}>&times;</button>
                        </div>
                      ) : (<div className="h-20 w-20 border border-foreground/10 rounded-xl bg-background/10 flex items-center justify-center text-[10px] text-foreground/40">No img</div>)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        </main>
      </div>
      )}
    </div>
  );
}