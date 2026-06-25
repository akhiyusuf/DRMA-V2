"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ProductRecommendations } from "@/components/layout/ProductRecommendations";

export default function AboutPage() {
  return (
    <div className="w-full bg-background selection:bg-primary selection:text-primary-foreground overflow-hidden">
      
      {/* Hero Section: The Editorial Split */}
      <section className="relative min-h-[70dvh] w-full flex items-center pt-24 md:pt-32 pb-8 md:pb-12">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row w-full justify-between items-start gap-12 md:gap-8">
            
            {/* Left: Typography */}
            <div className="w-full md:w-1/2 flex flex-col items-start z-10">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
                className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium bg-foreground/5 text-foreground/70 mb-8 border border-foreground/10"
              >
                The Origin
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 1.2, ease: [0.32, 0.72, 0, 1] }}
                className="text-6xl md:text-8xl font-heading font-normal tracking-tight text-foreground leading-[0.9]"
              >
                About <br/> <span className="italic font-light text-foreground/80">DRMA.</span>
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.2, ease: [0.32, 0.72, 0, 1] }}
                className="mt-8 text-xl md:text-2xl text-foreground/80 max-w-md font-light leading-relaxed"
              >
                Founded on a simple premise: modest fashion should honor not just the wearer, but the maker.
              </motion.p>
            </div>

            {/* Right: Floating Ethereal Pill Image */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 1.4, delay: 0.1, ease: [0.32, 0.72, 0, 1] }}
              className="w-full md:w-5/12 relative h-[50vh] md:h-[60vh] z-0"
            >
              {/* The Double-Bezel Shell */}
              <div className="absolute inset-0 p-2 rounded-[3rem] bg-foreground/5 ring-1 ring-foreground/10 md:ml-12">
                {/* Inner Core */}
                <div className="relative w-full h-full rounded-[calc(3rem-0.5rem)] overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
                  <div 
                    className="w-full h-full bg-cover bg-center opacity-90 transition-transform duration-[2s] hover:scale-105 grayscale hover:grayscale-0"
                    style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?q=80&w=2070&auto=format&fit=crop")' }}
                  />
                  {/* Subtle overlay for contrast */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent"></div>
                </div>
              </div>
            </motion.div>
            
          </div>
        </div>
      </section>

      {/* Story & Standard Section: Magazine Layout */}
      <section className="py-24 md:py-40 relative z-10 bg-foreground text-background mt-20 rounded-t-[3rem] shadow-2xl">
        <div className="container mx-auto px-4 md:px-8 max-w-5xl">
          
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: [0.32, 0.72, 0, 1] }}
            className="mb-20 md:mb-32"
          >
            <div className="flex flex-col md:flex-row gap-12 md:gap-24">
              <div className="md:w-1/3">
                 <h2 className="text-3xl md:text-5xl font-heading font-light text-background sticky top-32">
                    Our <br/><span className="italic text-background/60">Story</span>
                 </h2>
              </div>
              <div className="md:w-2/3 prose prose-lg prose-invert font-light text-background/80 leading-relaxed text-lg md:text-xl">
                <p className="first-letter:text-7xl first-letter:font-heading first-letter:mr-3 first-letter:float-left first-letter:text-background">
                  As Muslim women, we struggled to find elegant, modest clothing that didn&apos;t compromise on ethics. The global fashion supply chain is notoriously opaque, often hiding exploitative labor practices behind cheap price tags and fast turnover.
                </p>
                <p className="mt-8">
                  We realized that to truly embrace modesty—a concept that extends beyond clothing to encompass humility, justice, and mindfulness—we needed to ensure our garments were produced in a way that respected human dignity. Thus, DRMA was born.
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: [0.32, 0.72, 0, 1] }}
            className="border-t border-background/20 pt-20 md:pt-32"
          >
            <div className="flex flex-col md:flex-row gap-12 md:gap-24">
              <div className="md:w-1/3">
                 <h2 className="text-3xl md:text-5xl font-heading font-light text-background sticky top-32">
                    The <br/><span className="italic text-background/60">Standard</span>
                 </h2>
              </div>
              <div className="md:w-2/3 prose prose-lg prose-invert font-light text-background/80 leading-relaxed text-lg md:text-xl">
                <p>
                  Our designs draw inspiration from global modesty traditions, refined through a contemporary, minimalist lens. We use high-quality, durable materials designed to last for years, rejecting the harmful cycle of fast fashion.
                </p>
                <p className="mt-8">
                  More importantly, every DRMA piece is a stand against child labor. By maintaining a transparent, audited supply chain, we guarantee that the hands that sew our garments belong to adults who are compensated fairly for their skill.
                </p>

                {/* Button-in-Button Architecture */}
                <div className="mt-16">
                  <Link 
                    href="/ethics" 
                    className="group relative inline-flex items-center gap-4 rounded-full bg-background pl-8 pr-2 py-2 text-sm font-medium tracking-wide text-foreground transition-all active:scale-[0.98] hover:bg-background/90"
                  >
                    <span className="uppercase tracking-widest text-xs">Read The Manifesto</span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground/10 transition-transform duration-300 ease-spring group-hover:translate-x-1 group-hover:scale-105">
                      <ArrowUpRight className="h-4 w-4 stroke-[1.5]" />
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* End-of-page conversion CTA: product recommendations + Shop Now.
          Prevents the About page from being a conversion dead-end. */}
      <ProductRecommendations
        heading="Continue Your Journey."
        subheading="Carry the story forward — explore pieces crafted with the same integrity you just read about."
        variant="light"
      />
    </div>
  );
}
