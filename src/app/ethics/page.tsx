"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ShieldCheck, HeartHandshake, Leaf, Users, ArrowUpRight } from "lucide-react";
import { ProductRecommendations } from "@/components/layout/ProductRecommendations";

export default function EthicsPage() {
  return (
    <div className="w-full bg-background overflow-hidden selection:bg-primary selection:text-primary-foreground">
      
      {/* Hero Section */}
      <section className="relative min-h-[70dvh] w-full flex flex-col items-center justify-center pt-24 md:pt-32 pb-16 md:pb-24 text-center">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
            className="inline-flex rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium bg-foreground/5 text-foreground/70 mb-8 border border-foreground/10"
          >
            The Manifesto
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1.2, ease: [0.32, 0.72, 0, 1] }}
            className="text-5xl md:text-7xl lg:text-8xl font-heading font-normal tracking-tight text-foreground leading-[1]"
          >
            Our Ethical <br/> <span className="italic font-light text-foreground/80">Mission.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.32, 0.72, 0, 1] }}
            className="mt-8 text-xl md:text-2xl text-foreground/60 max-w-2xl mx-auto font-light leading-relaxed"
          >
            We exist to prove that beautiful, modest fashion does not require exploitation. 
            We are fighting against child labor and unethical practices in the fashion industry.
          </motion.p>
        </div>
        
        {/* Massive Background Typography Watermark */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center pointer-events-none opacity-[0.02] overflow-hidden select-none z-0">
           <h2 className="text-[20vw] font-heading font-bold whitespace-nowrap">DIGNITY.</h2>
        </div>
      </section>

      {/* The Problem vs Our Solution: Double-Bezel Cards */}
      <section className="py-24 md:py-32 px-4 md:px-8 relative z-10">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            
            {/* Reality Card */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1, ease: [0.32, 0.72, 0, 1] }}
              className="p-1.5 rounded-[2rem] bg-foreground/5 ring-1 ring-foreground/10"
            >
              <div className="h-full rounded-[calc(2rem-0.375rem)] bg-background p-10 md:p-14 flex flex-col shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
                <span className="text-xs uppercase tracking-widest text-foreground/40 font-medium mb-4">01. The Problem</span>
                <h2 className="text-3xl md:text-5xl font-heading font-light mb-8">The Fast Fashion Reality</h2>
                <p className="text-foreground/70 mb-12 font-light leading-relaxed text-lg">
                  Many of the world&apos;s largest fashion brands rely on opaque supply chains where forced labor and child labor are rampant. Workers are often paid pennies per day to produce garments that are worn only a few times before ending up in a landfill.
                </p>
                <ul className="space-y-6 mt-auto border-t border-foreground/10 pt-8">
                  {[
                    "Hidden sub-contracting networks",
                    "Poverty wages for garment workers",
                    "Hazardous working conditions"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center text-foreground/60 text-sm tracking-wide">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-foreground/5 text-foreground mr-4 text-[10px]">✕</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* Commitment Card */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1, delay: 0.2, ease: [0.32, 0.72, 0, 1] }}
              className="p-1.5 rounded-[2rem] bg-foreground ring-1 ring-foreground/10"
            >
              <div className="h-full rounded-[calc(2rem-0.375rem)] bg-foreground p-10 md:p-14 flex flex-col shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] text-background">
                <span className="text-xs uppercase tracking-widest text-background/40 font-medium mb-4">02. The Solution</span>
                <h2 className="text-3xl md:text-5xl font-heading font-light mb-8">The DRMA Commitment</h2>
                <p className="text-background/70 mb-12 font-light leading-relaxed text-lg">
                  We believe you have the right to know who made your clothes and under what conditions. Every DRMA garment is produced in audited facilities where adult workers are paid a living wage.
                </p>
                <ul className="space-y-6 mt-auto border-t border-background/20 pt-8">
                  {[
                    "100% transparent supply chain",
                    "Living wages and safe conditions",
                    "Strict zero-tolerance policy for child labor"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center text-background/80 text-sm tracking-wide">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-background/10 text-background mr-4 text-[10px]">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Pillars: Soft Structuralism */}
      <section className="py-32 md:py-48 bg-foreground/5 relative">
        <div className="container mx-auto px-4 md:px-8">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center mb-24"
          >
            <span className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium bg-foreground/5 text-foreground/70 mb-6 border border-foreground/10">Foundation</span>
            <h2 className="text-4xl md:text-6xl font-heading font-light text-center">Our Core <span className="italic text-foreground/60">Pillars</span></h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-16">
            {[
              {
                icon: ShieldCheck,
                title: "Audited Partners",
                desc: "We personally visit and audit our partner factories to ensure they meet our strict ethical standards."
              },
              {
                icon: Users,
                title: "Artisan Support",
                desc: "We employ traditional artisans, paying them premium rates to preserve their crafts."
              },
              {
                icon: Leaf,
                title: "Sustainable Materials",
                desc: "From organic cotton to recycled polyester, we source materials that have a lower environmental impact."
              },
              {
                icon: HeartHandshake,
                title: "Giving Back",
                desc: "A portion of every sale goes towards NGOs fighting child labor globally."
              }
            ].map((pillar, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.8, delay: i * 0.1, ease: [0.32, 0.72, 0, 1] }}
                className="flex flex-col text-center items-center group"
              >
                <div className="w-20 h-20 mb-8 rounded-full bg-background shadow-sm border border-foreground/5 flex items-center justify-center transition-transform duration-500 ease-spring group-hover:scale-110 group-hover:-translate-y-2">
                  <pillar.icon className="w-8 h-8 text-foreground/80 stroke-[1.5]" />
                </div>
                <h3 className="text-2xl font-heading font-light mb-4">{pillar.title}</h3>
                <p className="text-base text-foreground/60 leading-relaxed font-light">{pillar.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* End-of-page conversion CTA: product recommendations.
          Sits between the Pillars section and the final "Shop with your Values"
          CTA so users see real, shoppable products before being asked to convert. */}
      <ProductRecommendations
        heading="Wear Your Values."
        subheading="Every piece below is produced in audited facilities by adults paid a living wage. Choose with intention."
        variant="light"
      />

      {/* CTA */}
      <section className="py-32 md:py-48 text-center px-4">
        <div className="container mx-auto max-w-3xl flex flex-col items-center">
          <h2 className="text-4xl md:text-6xl font-heading font-light mb-8">Shop with your <span className="italic text-foreground/60">Values.</span></h2>
          <p className="text-foreground/70 mb-12 text-lg md:text-xl font-light">
            Every purchase is a vote for the kind of world you want to live in. Choose ethical. Choose DRMA.
          </p>
          
          <Link 
            href="/shop" 
            className="group relative inline-flex items-center gap-4 rounded-full bg-foreground pl-8 pr-2 py-2 text-sm font-medium tracking-wide text-background transition-all active:scale-[0.98] hover:bg-foreground/90"
          >
            <span className="uppercase tracking-widest text-xs">Explore Our Collection</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background/20 transition-transform duration-300 ease-spring group-hover:translate-x-1 group-hover:scale-105">
              <ArrowUpRight className="h-4 w-4 stroke-[1.5]" />
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
