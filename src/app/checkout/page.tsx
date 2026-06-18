"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Truck, ShieldCheck, ArrowLeft, ArrowUpRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { products } from "@/data/products";
import Link from "next/link";

export default function CheckoutPage() {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [state, setState] = useState("TX");
  const [shippingMethod, setShippingMethod] = useState("ups_ground");
  const [error, setError] = useState<string | null>(null);

  // Mock calculation
  const subtotal = 180.00;
  const isTexas = state === "TX";
  const taxRate = isTexas ? 0.0825 : 0;
  const taxAmount = subtotal * taxRate;
  const shippingCost = shippingMethod === "ups_ground" ? 9.95 : 24.95;
  const total = subtotal + taxAmount + shippingCost;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !firstName || !lastName || !address || !city || !zip) {
      setError("Please fill in all required fields.");
      return;
    }
    setError(null);
    alert("Order submitted successfully (mock)!");
  };

  return (
    <div className="w-full bg-background min-h-screen selection:bg-primary selection:text-primary-foreground pt-32 pb-24">
      <div className="container mx-auto px-4 md:px-8 max-w-6xl">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
          className="flex flex-col items-center text-center mb-16"
        >
          <Link href="/cart" className="group inline-flex items-center text-[10px] uppercase tracking-[0.2em] text-foreground/50 hover:text-foreground transition-colors mb-8">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-foreground/5 mr-3 transition-transform group-hover:-translate-x-1">
              <ArrowLeft className="w-3 h-3" />
            </span>
            Return to Cart
          </Link>
          <h1 className="text-4xl md:text-5xl font-heading font-light tracking-tight">Secure <span className="italic text-foreground/60">Checkout.</span></h1>
        </motion.div>

        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-16 lg:gap-24 items-start">
          {/* Left Column - Forms */}
          <div className="w-full lg:w-3/5 space-y-16">
            
            {/* Contact Info */}
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.8, ease: [0.32, 0.72, 0, 1] }}>
              <div className="flex items-center mb-8 border-b border-foreground/10 pb-4">
                <span className="w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-[10px] mr-4">1</span>
                <h2 className="text-xs uppercase tracking-[0.2em] font-medium text-foreground/70">Contact Information</h2>
              </div>
              <div className="space-y-6">
                <div className="grid w-full items-center gap-3">
                  <Label htmlFor="email" className="text-xs uppercase tracking-widest text-foreground/50 ml-1">Email Address</Label>
                  <Input type="email" id="email" placeholder="client@drma.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 bg-foreground/5 border-transparent focus-visible:ring-1 focus-visible:ring-foreground focus-visible:border-transparent rounded-xl px-4 font-light placeholder:text-foreground/30 transition-all" />
                </div>
              </div>
            </motion.div>
            
            {/* Shipping Address */}
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8, ease: [0.32, 0.72, 0, 1] }}>
              <div className="flex items-center mb-8 border-b border-foreground/10 pb-4">
                <span className="w-6 h-6 rounded-full bg-foreground/10 text-foreground flex items-center justify-center text-[10px] mr-4">2</span>
                <h2 className="text-xs uppercase tracking-[0.2em] font-medium text-foreground/70">Shipping Address</h2>
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="grid w-full items-center gap-3">
                    <Label htmlFor="firstName" className="text-xs uppercase tracking-widest text-foreground/50 ml-1">First Name</Label>
                    <Input type="text" id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-12 bg-foreground/5 border-transparent focus-visible:ring-1 focus-visible:ring-foreground rounded-xl px-4 font-light transition-all" />
                  </div>
                  <div className="grid w-full items-center gap-3">
                    <Label htmlFor="lastName" className="text-xs uppercase tracking-widest text-foreground/50 ml-1">Last Name</Label>
                    <Input type="text" id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-12 bg-foreground/5 border-transparent focus-visible:ring-1 focus-visible:ring-foreground rounded-xl px-4 font-light transition-all" />
                  </div>
                </div>
                <div className="grid w-full items-center gap-3">
                  <Label htmlFor="address" className="text-xs uppercase tracking-widest text-foreground/50 ml-1">Address</Label>
                  <Input type="text" id="address" value={address} onChange={(e) => setAddress(e.target.value)} className="h-12 bg-foreground/5 border-transparent focus-visible:ring-1 focus-visible:ring-foreground rounded-xl px-4 font-light transition-all" />
                </div>
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-3 grid w-full items-center gap-3">
                    <Label htmlFor="city" className="text-xs uppercase tracking-widest text-foreground/50 ml-1">City</Label>
                    <Input type="text" id="city" value={city} onChange={(e) => setCity(e.target.value)} className="h-12 bg-foreground/5 border-transparent focus-visible:ring-1 focus-visible:ring-foreground rounded-xl px-4 font-light transition-all" />
                  </div>
                  <div className="col-span-2 grid w-full items-center gap-3">
                    <Label htmlFor="state" className="text-xs uppercase tracking-widest text-foreground/50 ml-1">State</Label>
                    <Select value={state} onValueChange={(val) => val && setState(val)}>
                      <SelectTrigger className="h-12 bg-foreground/5 border-transparent focus:ring-1 focus:ring-foreground rounded-xl px-4 font-light transition-all">
                        <SelectValue placeholder="State" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-foreground/10 rounded-xl">
                        <SelectItem value="TX">Texas</SelectItem>
                        <SelectItem value="CA">California</SelectItem>
                        <SelectItem value="NY">New York</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 grid w-full items-center gap-3">
                    <Label htmlFor="zip" className="text-xs uppercase tracking-widest text-foreground/50 ml-1">ZIP</Label>
                    <Input type="text" id="zip" value={zip} onChange={(e) => setZip(e.target.value)} className="h-12 bg-foreground/5 border-transparent focus-visible:ring-1 focus-visible:ring-foreground rounded-xl px-4 font-light transition-all" />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Shipping Method */}
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8, ease: [0.32, 0.72, 0, 1] }}>
              <div className="flex items-center mb-8 border-b border-foreground/10 pb-4">
                <span className="w-6 h-6 rounded-full bg-foreground/10 text-foreground flex items-center justify-center text-[10px] mr-4">3</span>
                <h2 className="text-xs uppercase tracking-[0.2em] font-medium text-foreground/70">Shipping Method</h2>
              </div>
              <RadioGroup value={shippingMethod} onValueChange={setShippingMethod} className="space-y-4">
                <div className="flex items-center justify-between border border-foreground/10 p-5 rounded-2xl bg-foreground/5 cursor-pointer hover:border-foreground/30 transition-colors relative overflow-hidden group">
                  <div className="absolute inset-y-0 left-0 w-1 bg-foreground transform -translate-x-full transition-transform group-has-[[data-state=checked]]:translate-x-0"></div>
                  <div className="flex items-center space-x-4 pl-2">
                    <RadioGroupItem value="ups_ground" id="ups_ground" className="border-foreground/30 text-foreground" />
                    <Label htmlFor="ups_ground" className="cursor-pointer font-light text-foreground/80">UPS Ground (5-7 Days)</Label>
                  </div>
                  <span className="text-sm font-medium tracking-widest">$9.95</span>
                </div>
                <div className="flex items-center justify-between border border-foreground/10 p-5 rounded-2xl bg-foreground/5 cursor-pointer hover:border-foreground/30 transition-colors relative overflow-hidden group">
                  <div className="absolute inset-y-0 left-0 w-1 bg-foreground transform -translate-x-full transition-transform group-has-[[data-state=checked]]:translate-x-0"></div>
                  <div className="flex items-center space-x-4 pl-2">
                    <RadioGroupItem value="ups_next_day" id="ups_next_day" className="border-foreground/30 text-foreground" />
                    <Label htmlFor="ups_next_day" className="cursor-pointer font-light text-foreground/80">UPS Next Day Air</Label>
                  </div>
                  <span className="text-sm font-medium tracking-widest">$24.95</span>
                </div>
              </RadioGroup>
            </motion.div>

            {/* Payment */}
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8, ease: [0.32, 0.72, 0, 1] }}>
              <div className="flex items-center mb-8 border-b border-foreground/10 pb-4">
                <span className="w-6 h-6 rounded-full bg-foreground/10 text-foreground flex items-center justify-center text-[10px] mr-4">4</span>
                <h2 className="text-xs uppercase tracking-[0.2em] font-medium text-foreground/70">Payment</h2>
              </div>
              <div className="p-1 rounded-[1.5rem] bg-foreground/5 ring-1 ring-foreground/10">
                <div className="bg-background rounded-[calc(1.5rem-0.25rem)] p-8">
                  <div className="flex items-center justify-between mb-8">
                     <div className="flex items-center text-foreground/60">
                        <ShieldCheck className="w-5 h-5 mr-3" />
                        <span className="text-xs uppercase tracking-widest font-medium">Encrypted Gateway</span>
                     </div>
                     <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-5 opacity-40 grayscale" />
                  </div>
                  
                  <div className="bg-foreground/5 p-8 flex flex-col items-center justify-center rounded-xl border border-foreground/10 border-dashed">
                    <p className="text-sm text-foreground/60 font-light text-center leading-relaxed max-w-sm">
                      You will be securely redirected to PayPal to complete your purchase. You can use your PayPal account or a credit card.
                    </p>
                  </div>
                  {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
                </div>
              </div>
            </motion.div>
            
          </div>

          {/* Right Column - Summary: Double Bezel Card */}
          <div className="w-full lg:w-2/5">
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 1, ease: [0.32, 0.72, 0, 1] }}
              className="sticky top-32"
            >
              <div className="p-1.5 rounded-[2rem] bg-foreground/5 ring-1 ring-foreground/10">
                <div className="rounded-[calc(2rem-0.375rem)] bg-background p-8 md:p-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
                  <h2 className="text-sm font-medium uppercase tracking-[0.2em] mb-8 text-foreground/50 border-b border-foreground/10 pb-4">Order Summary</h2>
                  
                  <div className="space-y-6 mb-8">
                    {/* Item 1 */}
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-24 rounded-lg bg-foreground/5 overflow-hidden flex-shrink-0 relative ring-1 ring-foreground/10">
                        <img src={products[0].images[0]} alt="Oasis Linen Abaya" className="w-full h-full object-cover" />
                        <span className="absolute -top-1 -right-1 bg-foreground text-background text-[9px] w-5 h-5 rounded-full flex items-center justify-center border border-background">1</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-heading text-lg mb-1">{products[0].name}</p>
                        <div className="flex gap-2">
                           <span className="text-[9px] uppercase tracking-widest text-foreground/50 border border-foreground/10 px-2 py-0.5 rounded-full">Sand</span>
                           <span className="text-[9px] uppercase tracking-widest text-foreground/50 border border-foreground/10 px-2 py-0.5 rounded-full">M</span>
                        </div>
                      </div>
                      <p className="text-sm font-light tracking-widest">$85.00</p>
                    </div>

                    {/* Item 2 */}
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-24 rounded-lg bg-foreground/5 overflow-hidden flex-shrink-0 relative ring-1 ring-foreground/10">
                        <img src={products[4].images[0]} alt="Atlas Kimono Cardigan" className="w-full h-full object-cover" />
                        <span className="absolute -top-1 -right-1 bg-foreground text-background text-[9px] w-5 h-5 rounded-full flex items-center justify-center border border-background">1</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-heading text-lg mb-1">{products[4].name}</p>
                        <div className="flex gap-2">
                           <span className="text-[9px] uppercase tracking-widest text-foreground/50 border border-foreground/10 px-2 py-0.5 rounded-full">Beige</span>
                           <span className="text-[9px] uppercase tracking-widest text-foreground/50 border border-foreground/10 px-2 py-0.5 rounded-full">One Size</span>
                        </div>
                      </div>
                      <p className="text-sm font-light tracking-widest">$95.00</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4 text-sm font-light border-t border-foreground/10 pt-8 mb-8">
                    <div className="flex justify-between">
                      <span className="text-foreground/70">Subtotal</span>
                      <span className="tracking-widest">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/70 flex items-center">
                        Shipping <Truck className="w-3 h-3 ml-2 text-foreground/40" />
                      </span>
                      <span className="tracking-widest">${shippingCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/70">Taxes {isTexas && <span className="text-[10px] uppercase ml-2 text-foreground/40">(TX 8.25%)</span>}</span>
                      <span className="tracking-widest">${taxAmount.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-end border-t border-foreground/10 pt-6 mb-10">
                    <span className="text-sm uppercase tracking-[0.2em] font-medium text-foreground/50">Total</span>
                    <span className="font-heading text-4xl">${total.toFixed(2)}</span>
                  </div>
                  
                  {/* PayPal Yellow but elevated */}
                  <button type="submit" className="group relative w-full inline-flex items-center justify-center gap-4 rounded-full bg-[#FFC439] pl-8 pr-2 py-2 text-sm font-bold tracking-wide text-[#003087] transition-all active:scale-[0.98] hover:bg-[#F4BB33] hover:shadow-[0_0_20px_rgba(255,196,57,0.3)]">
                    <span className="py-3">Pay with PayPal</span>
                    <div className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/30 transition-transform duration-300 ease-spring group-hover:scale-105">
                      <ArrowUpRight className="h-4 w-4 stroke-[2]" />
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

        </form>
      </div>
    </div>
  );
}
