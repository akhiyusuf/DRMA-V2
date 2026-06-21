"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight, Plus, ArrowRight } from "lucide-react";
import type { Product } from "@/types/product";

export default function Home() {
  const [homepageData, setHomepageData] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch('/api/cms/content?type=homepage')
      .then(res => res.json())
      .then(data => {
        setHomepageData(data);
      })
      .catch(err => {
        console.error('Error fetching homepage data:', err);
        setHomepageData(null);
      });
    
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setProducts(data);
      })
      .catch(err => console.error('Error fetching products:', err));
  }, []);

  if (!homepageData) return null;

  return (
    <div className="w-full bg-background overflow-hidden selection:bg-primary selection:text-primary-foreground">
      {/* 
        HERO: Clean & Editorial Luxury
      */}
      <section className="relative min-h-[100dvh] w-full grid grid-cols-1 overflow-hidden bg-[#FAFAF9]">
        {/* Animated background blurs for liquid effect */}
        <div className="absolute top-1/4 left-1/4 w-[40vw] h-[40vw] bg-[#CA8A04]/10 rounded-full blur-[100px] animate-pulse duration-10000 pointer-events-none mix-blend-multiply"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[50vw] h-[50vw] bg-[#1C1917]/5 rounded-full blur-[120px] animate-pulse duration-[12000ms] pointer-events-none mix-blend-multiply delay-1000"></div>
        
        <div className="container mx-auto px-4 md:px-8 relative z-10 w-full h-full flex flex-col justify-start pt-32 lg:pt-64">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-start relative">
            
            {/* Left Column: Typography (7 cols) */}
            <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left relative z-30 mb-16 lg:mb-0">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
                className="flex items-center gap-3 mb-4 md:mb-8"
              >
                <span className="h-[1px] w-8 md:w-12 bg-[#CA8A04]/60"></span>
                <span className="rounded-full px-4 py-1.5 text-[10px] md:text-[11px] uppercase tracking-[0.25em] font-medium bg-[#1C1917]/5 text-[#1C1917]/80 border border-[#1C1917]/10 backdrop-blur-sm">
                  {homepageData.hero?.collectionLabel || 'Collection'}
                </span>
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 1.2, ease: [0.32, 0.72, 0, 1] }}
                className="text-5xl sm:text-7xl md:text-8xl lg:text-[10rem] font-heading font-normal tracking-tighter text-[#0C0A09] leading-[0.85] lg:leading-[0.85] lg:-ml-2 z-10"
              >
                {(homepageData.hero?.title || "").split(", ")[0]}, <br className="hidden sm:block" /> 
                <span className="italic font-medium text-[#1C1917]/80 flex flex-col lg:flex-row items-center gap-4 md:gap-8 mt-2 md:mt-4">
                  <span className="hidden lg:block w-32 h-[1px] bg-[#CA8A04]/40 mt-4"></span>
                  {(homepageData.hero?.title || "").split(", ")[1]}
                </span>
              </motion.h1>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.3, ease: [0.32, 0.72, 0, 1] }}
                className="mt-8 md:mt-16 flex flex-col items-center lg:items-start gap-6 md:gap-8"
              >
                <Link 
                  href={homepageData.hero?.ctaUrl || "/shop"} 
                  className="group relative inline-flex items-center gap-4 rounded-full bg-[#1C1917] pl-8 pr-2 py-2 text-sm font-medium tracking-wide text-white transition-colors duration-300 hover:bg-[#1C1917]/90"
                >
                  <span className="uppercase tracking-widest text-xs">{homepageData.hero?.buttonLabel || "Shop Now"}</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:scale-110">
                    <ArrowUpRight className="h-4 w-4 stroke-[1.5]" />
                  </div>
                </Link>

                <p className="text-sm md:text-base text-[#44403C] max-w-sm font-light leading-relaxed">
                  {homepageData.hero?.description || ""}
                </p>
              </motion.div>
            </div>

            {/* Right Column: Main Visual */}
            <div className="lg:col-span-5 relative w-full h-full z-20 flex items-end justify-center lg:justify-end">
              <motion.div 
                initial={{ opacity: 0, y: 40, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 1.6, delay: 0.2, ease: [0.32, 0.72, 0, 1] }}
                className="w-full max-w-[650px] lg:max-w-[1920px] z-20 flex items-end"
              >
                {homepageData.hero?.image && (
                  <img 
                    src={homepageData.hero.image} 
                    alt="Modest Fashion Model" 
                    className="w-full h-auto object-contain transition-transform duration-[4s] hover:scale-[1.01]"
                    style={{
                      filter: "drop-shadow(20px 20px 0px rgba(202, 138, 4, 0.25)) drop-shadow(0 30px 60px rgba(0,0,0,0.4))"
                    }}
                  />
                )}

              </motion.div>
            </div>

            </div>
            </div>
            </section>
      
      {/* 
        SECTION BREAKER: Scrolling Editorial Statement
      */}
      <div className="-mt-16 md:-mt-24 lg:-mt-32 relative w-full py-8 md:py-14 bg-[#1C1917] overflow-hidden border-y border-[#CA8A04]/20 z-20">
        <div className="flex whitespace-nowrap">
          <motion.div 
            animate={{ x: ["0%", "-50%"] }}
            transition={{ 
              duration: 30, 
              repeat: Infinity, 
              ease: "linear" 
            }}
            className="flex items-center gap-16 md:gap-24 px-8"
          >
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-16 md:gap-24">
                <span className="text-white/80 text-xs md:text-sm font-medium uppercase tracking-[0.5em]">Conscious Design</span>
                <div className="w-2 h-2 rotate-45 border border-[#CA8A04]/50"></div>
                <span className="text-white/80 text-xs md:text-sm font-medium uppercase tracking-[0.5em]">Ethical Production</span>
                <div className="w-2 h-2 rotate-45 border border-[#CA8A04]/50"></div>
                <span className="text-white/80 text-xs md:text-sm font-medium uppercase tracking-[0.5em]">Timeless Elegance</span>
                <div className="w-2 h-2 rotate-45 border border-[#CA8A04]/50"></div>
                <span className="text-white/80 text-xs md:text-sm font-medium uppercase tracking-[0.5em]">Modern Heritage</span>
                <div className="w-2 h-2 rotate-45 border border-[#CA8A04]/50"></div>
                <span className="text-white/80 text-xs md:text-sm font-medium uppercase tracking-[0.5em]">Unapologetically Modest</span>
                <div className="w-2 h-2 rotate-45 border border-[#CA8A04]/50"></div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* 
        MISSION: Soft Structuralism
      */}
      <section className="py-32 md:py-48 relative z-10">
        <div className="container mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-24 items-center">
            <motion.div 
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.2, delay: 0.1, ease: [0.32, 0.72, 0, 1] }}
              className="w-full order-last md:order-first"
            >
              <div className="p-2 rounded-[2rem] bg-foreground/5 ring-1 ring-foreground/10">
                <div className="relative aspect-square md:aspect-[4/5] rounded-[calc(2rem-0.5rem)] overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
                  {homepageData.mission?.image && (
                    <img 
                      src={homepageData.mission.image} 
                      alt="Hand-loomed organic fabric texture" 
                      className="w-full h-full object-cover scale-105 transition-transform duration-[3s] hover:scale-100"
                    />
                  )}

                </div>
              </div>
            </motion.div>

            <div className="flex flex-col items-start w-full">
              <motion.div 
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 1, ease: [0.32, 0.72, 0, 1] }}
                className="mb-8"
              >
                <span className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium bg-primary/10 text-primary border border-primary/20">{homepageData.mission?.label || "Mission"}</span>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading font-light mt-8 leading-tight text-foreground">
                  {(homepageData.mission?.title || " ").split(" <br/> ")[0]} <br/> <span className="italic text-foreground/60">{(homepageData.mission?.title || " ").split(" <br/> ")[1]}</span>
                </h2>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 1, delay: 0.1, ease: [0.32, 0.72, 0, 1] }}
                className="flex flex-col justify-start"
              >
                <p className="text-foreground/70 text-lg md:text-xl leading-relaxed mb-10 font-light max-w-lg">
                  {homepageData.mission?.description || ""}
                </p>
                
                <Link href={homepageData.mission?.ctaUrl || "#"} className="group inline-flex items-center text-primary font-medium tracking-wide uppercase text-xs w-max">
                  {homepageData.mission?.buttonLabel || "Learn More"}
                  <span className="relative ml-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 transition-transform duration-300 ease-spring group-hover:translate-x-2">
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* 
        BEST PRODUCTS: Bento Grid 
        5 products arranged in the specific layout requested.
      */}
      <section className="py-24 md:py-32 relative z-10 bg-[#F9F9F7]">
        <div className="container mx-auto px-4 md:px-8">
          
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: [0.32, 0.72, 0, 1] }}
            className="flex flex-col items-start mb-20 md:mb-24"
          >
            <span className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium bg-foreground/5 text-foreground/70 border border-foreground/10 mb-6">
              Curated Selection
            </span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading font-light leading-tight text-foreground">
              The Best <span className="italic text-foreground/60">Products.</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-6 relative z-0">
            {(homepageData.featuredProductIds || []).map((id: string, index: number) => {
              const product = products.find(p => p.id === id);
              if (!product) return null;
              
              const bentoClasses = [
                "md:col-span-4 md:row-span-2 min-h-[400px] md:min-h-[700px]", // 0: Large left
                "md:col-span-2 md:row-span-1 min-h-[280px] md:min-h-[340px]", // 1: Top right
                "md:col-span-2 md:row-span-1 min-h-[280px] md:min-h-[340px]", // 2: Middle right
                "md:col-span-3 md:row-span-1 min-h-[280px] md:min-h-[400px]", // 3: Bottom left wide
                "md:col-span-3 md:row-span-1 min-h-[280px] md:min-h-[400px]", // 4: Bottom right wide
              ];

              return (
                <motion.div 
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.8, delay: index * 0.1, ease: [0.32, 0.72, 0, 1] }}
                  className={`group relative flex flex-col bg-white rounded-[1.5rem] md:rounded-[2rem] border border-[#E5E5E1] p-1.5 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 ${bentoClasses[index]}`}
                >
                  <Link href={`/product/${product.id}`} className="absolute inset-0 z-30 block" aria-label={`View ${product.name}`} />
                  
                  {/* Image Area */}
                  <div className="relative flex-1 w-full bg-[#F3F3F1] rounded-[1.125rem] md:rounded-[1.75rem] overflow-hidden">
                    <img 
                      src={product.images[0]} 
                      alt={product.name} 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2.5s] ease-[0.32,0.72,0,1] group-hover:scale-[1.03]"
                    />
                    
                    {/* Badge */}
                    <div className="absolute top-4 left-4 z-10">
                      <span className="bg-white/90 backdrop-blur-md text-[#1C1917] text-[9px] md:text-[10px] font-semibold tracking-wider uppercase px-3 py-1.5 rounded-full shadow-sm">
                        {product.tags[0]}
                      </span>
                    </div>
                  </div>
               
                  {/* Content Section */}
                  <div className="flex justify-between items-end p-4 md:p-6 bg-white">
                    <div>
                      <h3 className="font-medium text-sm md:text-base text-[#1C1917] mb-1">{product.name}</h3>
                      <p className="text-xs md:text-sm text-[#44403C]/70">${product.price.toFixed(2)}</p>
                    </div>
                 
                    <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-[#1C1917] text-white shrink-0 shadow-md transition-all duration-300 group-hover:scale-110">
                      <Plus className="h-4 w-4 md:h-5 md:w-5 stroke-[2.5]" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 
        DIFFERENTIATION: Dark luxe — no more dull 
      */}
      <section className="py-32 md:py-48 bg-gradient-to-b from-[#1a1614] via-[#14100E] to-[#0D0B0A] text-[#FAFAF9] relative rounded-t-[3rem] -mt-10 shadow-2xl overflow-hidden">
        {/* Background accents */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#CA8A04]/[0.03] rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#CA8A04]/[0.02] rounded-full blur-[100px] pointer-events-none" />
        
        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: [0.32, 0.72, 0, 1] }}
            className="flex flex-col items-center text-center max-w-3xl mx-auto mb-24"
          >
            <div className="flex items-center gap-3 mb-8">
              <span className="h-px w-8 bg-[#CA8A04]/50" />
              <span className="text-[11px] uppercase tracking-[0.25em] font-medium text-[#CA8A04]">
                {homepageData.differentiation?.label || "Why Us"}
              </span>
              <span className="h-px w-8 bg-[#CA8A04]/50" />
            </div>
            <h2 className="text-5xl md:text-7xl font-heading font-light leading-[1.05] text-white">
              {(homepageData.differentiation?.title || " ").split(" <br/> ")[0]} <br/> <span className="italic text-[#CA8A04]">{(homepageData.differentiation?.title || " ").split(" <br/> ")[1]}</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
            {(homepageData.differentiation?.points || []).map((point: any, index: number) => (
              <motion.div 
                key={point.number}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, delay: index * 0.1, ease: [0.32, 0.72, 0, 1] }}
                whileHover={{ y: -4 }}
                className={index === 2 
                  ? "md:col-span-12 rounded-[2rem] bg-gradient-to-br from-[#262220] to-[#1a1614] border border-[#CA8A04]/20 shadow-[0_8px_40px_rgba(202,138,4,0.06)]" 
                  : "md:col-span-6 rounded-[2rem] bg-gradient-to-br from-[#262220] to-[#1a1614] border border-white/[0.06] hover:border-[#CA8A04]/20 transition-colors duration-500"}
              >
                <div className="h-full p-8 md:p-12 flex flex-col justify-between">
                  <div className="text-5xl md:text-6xl font-heading font-semibold text-[#CA8A04] mb-6 md:mb-8 tracking-tight">{point.number}</div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-heading mb-4 text-white font-medium">
                      {point.title}
                    </h3>
                    <p className="text-[#D1CFCD] text-sm md:text-base leading-relaxed font-light">
                      {point.description}
                    </p>
                  </div>
                  {index === 2 && (
                    <Link 
                      href="/shop" 
                      className="group relative inline-flex items-center gap-4 rounded-full bg-background pl-6 pr-2 py-2 text-sm font-medium tracking-wide text-foreground transition-all active:scale-95 mt-8"
                    >
                      <span className="uppercase tracking-widest text-[10px]">Shop Now</span>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/10 transition-transform duration-300 ease-spring group-hover:translate-x-1 group-hover:scale-110">
                        <ArrowRight className="h-3 w-3 stroke-[1.5]" />
                      </div>
                    </Link>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
