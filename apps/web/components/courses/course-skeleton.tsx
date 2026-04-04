'use client';

export function CourseCardSkeleton() {
  return (
    <div className="relative bg-[#0a0a0c] border border-white/5 rounded-[2rem] flex flex-col h-full overflow-hidden animate-pulse">
      {/* Image placeholder */}
      <div className="w-full h-48 bg-white/[0.04]" />

      <div className="p-6 sm:p-8 flex flex-col flex-1">
        {/* Category + shop */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-3 w-20 bg-white/[0.06] rounded-full" />
          <div className="h-3 w-1 bg-white/[0.04] rounded-full" />
          <div className="h-3 w-24 bg-white/[0.04] rounded-full" />
        </div>

        {/* Title */}
        <div className="h-7 w-[85%] bg-white/[0.06] rounded-lg mb-3" />
        <div className="h-7 w-[60%] bg-white/[0.06] rounded-lg mb-4" />

        {/* Description */}
        <div className="space-y-2 mb-6">
          <div className="h-4 w-full bg-white/[0.04] rounded" />
          <div className="h-4 w-[90%] bg-white/[0.04] rounded" />
          <div className="h-4 w-[70%] bg-white/[0.04] rounded" />
        </div>

        {/* Stats row */}
        <div className="mt-auto pt-8">
          <div className="border-t border-white/5 pt-10 grid grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="h-2 w-12 bg-white/[0.04] rounded-full" />
                <div className="h-5 w-16 bg-white/[0.06] rounded" />
              </div>
            ))}
          </div>

          {/* Button */}
          <div className="mt-8 h-14 w-full bg-white/[0.04] rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function CourseGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <CourseCardSkeleton key={`skeleton-${i}`} />
      ))}
    </>
  );
}
