"use client";
import { useState, useEffect } from 'react';

export default function DashboardPage() {
  const [homepageData, setHomepageData] = useState<any>(null);
  const [productsData, setProductsData] = useState<any[] | null>(null);
  const [filter, setFilter] = useState('');
  const [images, setImages] = useState<string[]>([]);
  useEffect(() => {
    fetch('/api/cms/content?type=homepage')
        .then(res => res.json())
        .then(data => {
            if (!data.error) {
                setHomepageData({
                    hero: { title: '', description: '', image: '', ...data.hero },
                    mission: { title: '', description: '', image: '', ...data.mission },
                    differentiation: { points: [], ...data.differentiation },
                    featuredProductIds: [],
                    ...data
                });
            } else {
                console.error("Error fetching homepage:", data.error);
                setHomepageData({ hero: { title: '', description: '', image: '' }, mission: { title: '', description: '', image: '' }, differentiation: { points: [] }, featuredProductIds: [] });
            }
        })
        .catch(err => {
            console.error("Network error fetching homepage:", err);
            setHomepageData({ hero: { title: '', description: '', image: '' }, mission: { title: '', description: '', image: '' }, differentiation: { points: [] }, featuredProductIds: [] });
        });

    fetch('/api/cms/content?type=products')
        .then(res => res.json())
        .then(data => {
            if (!data.error) {
                setProductsData(data);
            } else {
                console.error("Error fetching products:", data.error);
                setProductsData([]);
            }
        })
        .catch(err => {
            console.error("Network error fetching products:", err);
            setProductsData([]);
        });
    
    // Fetch images from the new API route
    fetch('/api/cms/images').then(res => res.json()).then(data => {
        if (!data.error) setImages(data);
    });
  }, []);

  const save = async (type: string, data: any, id?: string) => {
    let payload = data;
    if (type === 'products' && id) {
        // Fetch current full list to update only one product
        const currentData = await fetch('/api/cms/content?type=products').then(res => res.json());
        payload = currentData.map((p: any) => p.id === id ? data : p);
    }
    
    await fetch('/api/cms/content', {
      method: 'POST',
      body: JSON.stringify({ type, data: payload }),
    });
    alert('Saved!');
  };

  // Helper for dynamic tagging lists
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
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                const val = e.currentTarget.value.trim();
                if (val && !values.includes(val)) {
                    onChange([...values, val]);
                    e.currentTarget.value = '';
                }
            }
        }} placeholder={placeholder} />
    </div>
  );

  if (!homepageData || !productsData) return <div>Loading...</div>;

  const filteredProducts = productsData?.filter(p => 
    p.name.toLowerCase().includes(filter.toLowerCase()) || 
    p.category.toLowerCase().includes(filter.toLowerCase())
  ) || [];

  // Derive unique options for dynamic inputs
  const uniqueCategories = Array.from(new Set(productsData?.map(p => p.category).filter(Boolean)));
  const uniqueTags = Array.from(new Set(productsData?.flatMap(p => p.tags || []).filter(Boolean)));
  const uniqueSizes = Array.from(new Set(productsData?.flatMap(p => p.variations?.sizes || []).filter(Boolean)));
  const uniqueColors = Array.from(new Set(productsData?.flatMap(p => p.variations?.colors || []).filter(Boolean)));
  const uniqueMaterials = Array.from(new Set(productsData?.flatMap(p => p.variations?.materials || []).filter(Boolean)));

  return (
    <div className="p-4 md:p-8 pt-32 max-w-7xl mx-auto grid grid-cols-12 gap-8 bg-background text-foreground min-h-screen">
      {/* Datalists for dynamic options */}
      <datalist id="categories">{uniqueCategories.map((c, i) => <option key={`${c}-${i}`} value={c} />)}</datalist>
      <datalist id="tags">{uniqueTags.map((t, i) => <option key={`${t}-${i}`} value={t} />)}</datalist>
      <datalist id="sizes">{uniqueSizes.map((s, i) => <option key={`${s}-${i}`} value={s} />)}</datalist>
      <datalist id="colors">{uniqueColors.map((c, i) => <option key={`${c}-${i}`} value={c} />)}</datalist>
      <datalist id="materials">{uniqueMaterials.map((m, i) => <option key={`${m}-${i}`} value={m} />)}</datalist>

      <h1 className="col-span-12 pt-16 text-center text-4xl font-heading font-light tracking-tight">Content Management System (CMS)</h1>
      
      {/* Media Library Pane */}
      <aside className="col-span-12 lg:col-span-5 xl:col-span-4 border border-foreground/10 p-6 rounded-3xl lg:sticky lg:top-28 bg-foreground/5 self-start">
        <h2 className="text-xl font-heading mb-6 flex justify-between items-center">
            Media Library
            <label className="cursor-pointer bg-primary text-primary-foreground p-2 rounded-full hover:bg-primary/90 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                <input type="file" className="hidden" onChange={async (e) => {
                    if (e.target.files && e.target.files[0]) {
                        const formData = new FormData();
                        formData.append('file', e.target.files[0]);
                        const res = await fetch('/api/cms/upload', { method: 'POST', body: formData });
                        if (res.ok) {
                            alert('Uploaded!');
                            window.location.reload();
                        }
                    }
                }} />
            </label>
        </h2>
        <div className="columns-3 gap-2 overflow-y-auto max-h-[80vh] pr-2">
            {images.map((img, index) => (
                <div key={`${img}-${index}`} className="relative group border border-foreground/10 p-1 rounded-xl mb-2 break-inside-avoid">
                    <img draggable onDragStart={e => e.dataTransfer.setData('text/plain', img)} src={img} alt="Library" className="w-full h-auto object-contain rounded-lg cursor-grab" />
                    <button className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100" onClick={async () => {
                        const res = await fetch('/api/cms/images/delete', { method: 'POST', body: JSON.stringify({ imageUrl: img }) });
                        if (res.ok) {
                            setImages(images.filter(i => i !== img));
                        } else {
                            alert('Failed to delete');
                        }
                    }}>×</button>
                </div>
            ))}
        </div>
      </aside>

      <main className="col-span-12 lg:col-span-7 xl:col-span-8 space-y-12">
        {/* Homepage Editor */}
        <section className="border border-foreground/10 p-8 rounded-3xl space-y-8">
            <h2 className="text-2xl font-heading">Homepage Editor</h2>
            
            {/* Hero Section */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold">Hero Section</h3>
                <input className="w-full border border-foreground/10 bg-background/5 p-4 rounded-xl" value={homepageData.hero.title} onChange={e => setHomepageData({...homepageData, hero: {...homepageData.hero, title: e.target.value}})} placeholder="Hero Title" />
                <textarea className="w-full border border-foreground/10 bg-background/5 p-4 rounded-xl" value={homepageData.hero.description || ''} onChange={e => setHomepageData({...homepageData, hero: {...homepageData.hero, description: e.target.value}})} placeholder="Hero Description" />
                <div className="border border-foreground/10 p-4 rounded-xl" onDragOver={e => e.preventDefault()} onDrop={e => {
                  const img = e.dataTransfer.getData('text/plain');
                  setHomepageData({...homepageData, hero: {...homepageData.hero, image: img}});
                }}>
                  <label className="block text-xs uppercase tracking-widest font-medium mb-3">Hero Image (Drag from Library)</label>
                  <div className="relative inline-block">
                    {homepageData.hero.image ? (
                        <div className="relative">
                          <img src={homepageData.hero.image} alt="Hero" className="max-h-80 w-auto object-contain rounded-xl" />
                          <button className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-80 hover:opacity-100" onClick={() => setHomepageData({...homepageData, hero: {...homepageData.hero, image: ''}})}>×</button>
                        </div>
                    ) : (
                        <div className="h-40 w-full bg-background/10 rounded-xl flex items-center justify-center text-foreground/40 text-sm">No image set</div>
                    )}
                  </div>
                </div>
            </div>

            {/* Mission Section */}
            <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-bold">Mission Section</h3>
                <input className="w-full border border-foreground/10 bg-background/5 p-4 rounded-xl" value={homepageData.mission.title} onChange={e => setHomepageData({...homepageData, mission: {...homepageData.mission, title: e.target.value}})} placeholder="Mission Title" />
                <textarea className="w-full border border-foreground/10 bg-background/5 p-4 rounded-xl" value={homepageData.mission.description || ''} onChange={e => setHomepageData({...homepageData, mission: {...homepageData.mission, description: e.target.value}})} placeholder="Mission Description" />
                <div className="border border-foreground/10 p-4 rounded-xl" onDragOver={e => e.preventDefault()} onDrop={e => {
                  const img = e.dataTransfer.getData('text/plain');
                  setHomepageData({...homepageData, mission: {...homepageData.mission, image: img}});
                }}>
                  <label className="block text-xs uppercase tracking-widest font-medium mb-3">Mission Image (Drag from Library)</label>
                  <div className="relative inline-block">
                    {homepageData.mission.image ? (
                        <div className="relative">
                          <img src={homepageData.mission.image} alt="Mission" className="max-h-80 w-auto object-contain rounded-xl" />
                          <button className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-80 hover:opacity-100" onClick={() => setHomepageData({...homepageData, mission: {...homepageData.mission, image: ''}})}>×</button>
                        </div>
                    ) : (
                        <div className="h-40 w-full bg-background/10 rounded-xl flex items-center justify-center text-foreground/40 text-sm">No image set</div>
                    )}
                  </div>
                </div>
            </div>

            {/* Differentiation Points */}
            <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-bold">Differentiation Points</h3>
            {(homepageData.differentiation?.points || []).map((point: any, index: number) => (
                <div key={index} className="space-y-2 border p-4 rounded-xl">
                    <input className="w-full border border-foreground/10 bg-background/5 p-2 rounded-lg" value={point.title} onChange={e => {
                        const newPoints = [...homepageData.differentiation.points];
                        newPoints[index].title = e.target.value;
                        setHomepageData({...homepageData, differentiation: {...homepageData.differentiation, points: newPoints}});
                    }} placeholder="Point Title" />
                    <textarea className="w-full border border-foreground/10 bg-background/5 p-2 rounded-lg" value={point.description} onChange={e => {
                        const newPoints = [...homepageData.differentiation.points];
                        newPoints[index].description = e.target.value;
                        setHomepageData({...homepageData, differentiation: {...homepageData.differentiation, points: newPoints}});
                    }} placeholder="Point Description" />
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
              return (
                <span key={id} className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm flex items-center gap-2">
                  {product.name}
                  <button onClick={() => setHomepageData({...homepageData, featuredProductIds: homepageData.featuredProductIds.filter((fid: string) => fid !== id)})} className="hover:text-primary/80">×</button>
                </span>
              );
            })}
            </div>
            </div>
            <div className="space-y-4 border-t pt-4">
              <label className="text-xs uppercase tracking-widest font-medium">Add Featured Product</label>
              <select className="border border-foreground/10 bg-background/5 p-4 rounded-xl w-full" onChange={e => {
                  if (e.target.value && !homepageData.featuredProductIds.includes(e.target.value)) {
                    setHomepageData({...homepageData, featuredProductIds: [...homepageData.featuredProductIds, e.target.value]});
                  }
                }}>
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
                <input className="border border-foreground/10 bg-background/5 p-3 rounded-full" placeholder="Filter..." value={filter} onChange={e => setFilter(e.target.value)} />
                <button onClick={() => setProductsData([...productsData, { id: Date.now().toString(), name: 'New Product', price: 0, images: [''], tags: [], category: '', variations: { sizes: [], colors: [], materials: [] } }])} className="bg-primary text-primary-foreground px-6 py-3 rounded-full font-medium hover:bg-primary/90">+ Add Product</button>
            </div>
            {filteredProducts.map((product, index) => (
            <div key={product.id} className="mb-8 p-6 border border-foreground/10 rounded-2xl bg-foreground/5" onDragOver={e => e.preventDefault()} onDrop={e => {
                const img = e.dataTransfer.getData('text/plain');
                const newProducts = [...productsData];
                if (!newProducts[index].images.includes(img)) {
                    newProducts[index].images.push(img);
                    setProductsData(newProducts);
                }
            }}>
                <div className="flex justify-between mb-4">
                    <div className="w-full">
                        <label className="text-xs uppercase font-medium text-foreground/60 mb-1 block">Product Name</label>
                        <input className="font-heading text-xl bg-transparent border-b border-foreground/20 p-1 w-full" value={product.name || ''} onChange={e => {
                            const newProducts = [...productsData];
                            newProducts[index].name = e.target.value;
                            setProductsData(newProducts);
                        }} />
                    </div>
                    <div className="flex gap-2 mt-6">
                        <button onClick={() => save('products', product, product.id)} className="text-primary hover:text-primary/80 font-medium">Save</button>
                        <button onClick={() => setProductsData(productsData.filter(p => p.id !== product.id))} className="text-red-400 hover:text-red-600 font-medium">Delete</button>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs uppercase font-medium text-foreground/60 mb-1 block">Price</label>
                    <input type="number" className="w-full border border-foreground/10 bg-background/5 p-2 rounded-lg" value={product.price ?? 0} onChange={e => {
                        const newProducts = [...productsData];
                        newProducts[index].price = parseFloat(e.target.value);
                        setProductsData(newProducts);
                    }} placeholder="Price" />
                  </div>
                  <div>
                    <label className="text-xs uppercase font-medium text-foreground/60 mb-1 block">Category</label>
                    <input list="categories" className="w-full border border-foreground/10 bg-background/5 p-2 rounded-lg" value={product.category} onChange={e => {
                        const newProducts = [...productsData];
                        newProducts[index].category = e.target.value;
                        setProductsData(newProducts);
                    }} placeholder="Category" />
                  </div>
                </div>
                <div>
                  <label className="text-xs uppercase font-medium text-foreground/60 mb-1 block mt-4">Description</label>
                  <textarea className="w-full border border-foreground/10 bg-background/5 p-2 rounded-lg" value={product.description || ''} onChange={e => {
                      const newProducts = [...productsData];
                      newProducts[index].description = e.target.value;
                      setProductsData(newProducts);
                  }} placeholder="Description" />
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                    <TagInput label="Tags" values={product.tags || []} onChange={vals => { const p = [...productsData]; p[index].tags = vals; setProductsData(p); }} listId="tags" placeholder="Type tag and press Enter" />
                    <TagInput label="Sizes" values={product.variations?.sizes || []} onChange={vals => { const p = [...productsData]; p[index].variations = { ...p[index].variations, sizes: vals }; setProductsData(p); }} listId="sizes" placeholder="Type size and press Enter" />
                    <TagInput label="Colors" values={product.variations?.colors || []} onChange={vals => { const p = [...productsData]; p[index].variations = { ...p[index].variations, colors: vals }; setProductsData(p); }} listId="colors" placeholder="Type color and press Enter" />
                    <TagInput label="Materials" values={product.variations?.materials || []} onChange={vals => { const p = [...productsData]; p[index].variations = { ...p[index].variations, materials: vals }; setProductsData(p); }} listId="materials" placeholder="Type material and press Enter" />
                </div>
                
                <label className="block text-xs uppercase tracking-widest font-medium mb-3 mt-6">Images (Drag from Library)</label>
                <div className="flex gap-3 flex-wrap">
                    {(product.images || []).map((img: string, i: number) => (
                      <div key={i} className="relative group">
                          {img && img.trim() !== '' ? (
                            <div className="relative">
                              <img src={img} className="max-h-32 w-auto object-contain border border-foreground/10 rounded-xl" />
                              <button className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100" onClick={() => {
                                  const newProducts = [...productsData];
                                  newProducts[index].images.splice(i, 1);
                                  setProductsData(newProducts);
                              }}>×</button>
                            </div>
                          ) : (
                            <div className="h-20 w-20 border border-foreground/10 rounded-xl bg-background/10 flex items-center justify-center text-[10px] text-foreground/40">No img</div>
                          )}
                      </div>
                    ))}
                </div>
            </div>
            ))}
        </section>
      </main>
    </div>
  );
}
