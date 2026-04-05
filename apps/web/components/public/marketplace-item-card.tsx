'use client';

import { 
  Card, 
  CardHeader, 
  CardBody, 
  CardFooter,
  Image,
  Button,
  Chip
} from '@heroui/react';
import { Star, Clock, User, ArrowRight, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import Link from 'next/link';

interface MarketplaceItemCardProps {
  id: string;
  type: 'course' | 'model';
  category: string;
  title: string;
  description: string;
  imageUrl?: string | null;
  shopName: string;
  
  // Specific course props
  price?: string;
  duration?: string;
  level?: string;
  upcomingSessions?: number;
  ratingAvg?: number | null;
  reviewCount?: number;

  // Specific model props
  date?: string;
  location?: string;
  
  primaryAction: {
    label: string;
    href?: string;
    onPress?: () => void;
  };
}

export function MarketplaceItemCard({ 
  id,
  type,
  category, 
  title, 
  description, 
  imageUrl,
  shopName,
  price,
  duration,
  level,
  upcomingSessions,
  ratingAvg,
  reviewCount = 0,
  date,
  location,
  primaryAction
}: MarketplaceItemCardProps) {
  const isModel = type === 'model';

  return (
    <Card 
      className="bg-white dark:bg-[#121214] border-slate-100 dark:border-white/10 overflow-hidden group hover:border-[#c49cff]/30 transition-all duration-500 rounded-[2.5rem] shadow-[0_10px_30px_rgba(0,0,0,0.03)] dark:shadow-2xl h-full flex flex-col"
      shadow="none"
    >
      <CardHeader className="p-0 relative aspect-[16/10] overflow-hidden shrink-0">
        {imageUrl ? (
          <Image
            alt={title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            src={imageUrl}
            removeWrapper
          />
        ) : (
          <div className="w-full h-full bg-slate-50 dark:bg-gradient-to-br dark:from-[#121214] dark:to-[#0a0a0c] flex items-center justify-center relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.02)_0%,transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(196,156,255,0.05)_0%,transparent_70%)]" />
            <PlayCircle className="w-12 h-12 text-slate-200 dark:text-white/5 transition-colors group-hover:text-[#c49cff]/20" />
          </div>
        )}
        
        {/* Floating Badges */}
        <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2">
          {!isModel && ratingAvg && (
             <div className="bg-white/80 dark:bg-black/40 backdrop-blur-md border border-slate-200/50 dark:border-white/10 px-2 py-1 rounded-full flex items-center gap-1.5 shadow-xl">
               <Star className="w-3 h-3 text-[#f1bf5e] fill-[#f1bf5e]" />
               <span className="text-[10px] font-black text-slate-900 dark:text-white">{ratingAvg.toFixed(1)}</span>
               <span className="text-[8px] font-bold text-slate-400 dark:text-white/40">({reviewCount})</span>
             </div>
          )}
        </div>

        {upcomingSessions && upcomingSessions > 0 && (
          <div className="absolute top-4 right-4 z-10">
            <Chip 
              className="bg-[#c49cff] text-[#2d0a6e] font-black italic tracking-widest text-[9px] uppercase border-none shadow-xl"
              size="sm"
            >
              {upcomingSessions} {upcomingSessions === 1 ? 'SESIÓN' : 'SESIONES'}
            </Chip>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-white/40 dark:from-[#0a0a0c] via-transparent to-transparent opacity-60" />
      </CardHeader>

      <CardBody className="px-8 pt-8 pb-4 space-y-4 flex-grow">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-[#c49cff] uppercase tracking-[0.2em]">
            {category}
          </span>
          <div className="w-1 h-1 rounded-full bg-slate-200 dark:bg-white/20" />
          <span className="text-[10px] font-bold text-slate-400 dark:text-white/30 uppercase tracking-widest">
            {shopName}
          </span>
        </div>

        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight group-hover:text-[#c49cff] transition-colors h-[2.5em] line-clamp-2 uppercase">
          {title}
        </h3>

        <p className="text-[13px] text-slate-500 dark:text-white/40 leading-relaxed font-medium h-[4.5em] line-clamp-3">
          {description}
        </p>
      </CardBody>

      <CardFooter className="px-8 pb-8 pt-0 flex flex-col gap-8 mt-auto shrink-0">
        <div className="grid grid-cols-3 w-full border-t border-slate-100 dark:border-white/5 pt-6">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-black text-slate-300 dark:text-white/20 uppercase tracking-[0.1em]">
              {isModel ? 'Fecha' : 'Precio'}
            </span>
            <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight truncate">
              {isModel ? (date || 'PRÓXIMAMENTE') : price}
            </span>
          </div>
          <div className="flex flex-col gap-1 border-x border-slate-100 dark:border-white/5 px-4">
            <span className="text-[9px] font-black text-slate-300 dark:text-white/20 uppercase tracking-[0.1em]">
              {isModel ? 'Lugar' : 'Duración'}
            </span>
            <span className="text-sm font-bold text-slate-700 dark:text-white/80 truncate">
              {isModel ? (location || shopName) : duration}
            </span>
          </div>
          <div className="flex flex-col gap-1 pl-4">
            <span className="text-[9px] font-black text-slate-300 dark:text-white/20 uppercase tracking-[0.1em]">
              {isModel ? 'Cupos' : 'Nivel'}
            </span>
            <span className="text-sm font-bold text-slate-700 dark:text-white/80 truncate">
              {isModel ? (upcomingSessions ? `${upcomingSessions} DISP.` : 'DISPONIBLE') : level}
            </span>
          </div>
        </div>

        {primaryAction.href ? (
          <Button
            as={Link}
            href={primaryAction.href}
            className="w-full h-14 bg-[#c49cff] !text-white data-[hover=true]:text-white font-black tracking-widest text-[11px] uppercase rounded-[1.5rem] transition-all hover:scale-[1.01] active:scale-[0.98] shadow-[0_4px_10px_rgba(196,156,255,0.15)] hover:shadow-[0_6px_12px_rgba(196,156,255,0.2)] group/btn"
          >
            {primaryAction.label}
            <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover/btn:translate-x-1" />
          </Button>
        ) : (
          <Button
            onPress={primaryAction.onPress as any}
            className="w-full h-14 bg-[#c49cff] !text-white data-[hover=true]:text-white font-black tracking-widest text-[11px] uppercase rounded-[1.5rem] transition-all hover:scale-[1.01] active:scale-[0.98] shadow-[0_4px_10px_rgba(196,156,255,0.15)] hover:shadow-[0_6px_12px_rgba(196,156,255,0.2)] group/btn"
          >
            {primaryAction.label}
            <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover/btn:translate-x-1" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
