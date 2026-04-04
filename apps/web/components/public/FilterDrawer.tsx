'use client';

import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerBody, 
  DrawerFooter,
  Button
} from "@heroui/react";
import { X, Check } from "lucide-react";
import { useState } from "react";

interface FilterDrawerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const CATEGORIES = [
  "ALL SERVICES",
  "HAIRCUT",
  "BEARD TRIM",
  "SHAVE",
  "COLORING",
  "FACIAL CARE"
];

const LOCATIONS = [
  "ALL LOCATIONS",
  "MONTEVIDEO",
  "PUNTA DEL ESTE",
  "ROCHA",
  "COLONIA",
  "SALTO"
];

export function FilterDrawer({ isOpen, onOpenChange }: FilterDrawerProps) {
  const [activeCategory, setActiveCategory] = useState("ALL SERVICES");
  const [activeLocation, setActiveLocation] = useState("ALL LOCATIONS");

  return (
    <Drawer 
      isOpen={isOpen} 
      onOpenChange={onOpenChange}
      placement="right"
      backdrop="blur"
      className="bg-[#0e0e0f]/90 backdrop-blur-3xl border-l border-white/5"
    >
      <DrawerContent>
        {(onClose) => (
          <>
            <DrawerHeader className="flex flex-col gap-1 border-b border-white/5 py-8">
              <span className="text-[10px] font-black text-[#c49cff] uppercase tracking-widest mb-2 px-1">Curated Search</span>
              <h2 className="text-3xl font-[1000] text-white uppercase tracking-tighter">Refine Selection</h2>
            </DrawerHeader>
            
            <DrawerBody className="py-12 flex flex-col gap-12">
              {/* Category Filter */}
              <div className="flex flex-col gap-6">
                <h3 className="text-[11px] font-black text-white/30 uppercase tracking-[0.2em] px-1">Specialty</h3>
                <div className="flex flex-col gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`flex items-center justify-between h-14 px-6 rounded-2xl transition-all duration-300 border ${
                        activeCategory === cat 
                          ? "bg-[#c49cff] border-transparent text-[#2d0a6e]" 
                          : "bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span className="text-[11px] font-black uppercase tracking-widest">{cat}</span>
                      {activeCategory === cat && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location Filter */}
              <div className="flex flex-col gap-6">
                <h3 className="text-[11px] font-black text-white/30 uppercase tracking-[0.2em] px-1">Area</h3>
                <div className="flex flex-wrap gap-2">
                  {LOCATIONS.map((loc) => (
                    <button
                      key={loc}
                      onClick={() => setActiveLocation(loc)}
                      className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all duration-300 ${
                        activeLocation === loc 
                          ? "bg-white text-black border-transparent" 
                          : "bg-transparent border-white/10 text-white/40 hover:border-white/40 hover:text-white"
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>
            </DrawerBody>

            <DrawerFooter className="border-t border-white/5 py-10 px-8 flex gap-4">
              <Button 
                variant="light" 
                onPress={onClose}
                className="flex-1 h-16 text-white font-black text-[11px] uppercase tracking-widest hover:bg-white/5 rounded-[2rem]"
              >
                Close
              </Button>
              <Button 
                onPress={onClose}
                className="flex-1 h-16 bg-[#c49cff] text-[#2d0a6e] font-black text-[11px] uppercase tracking-widest rounded-[2rem]"
              >
                Apply Filters
              </Button>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
