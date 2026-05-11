/**
 * DashboardSkeleton — Animated skeleton placeholders for dashboard sections.
 * Shows immediately while API data streams in, creating an "instant" feel.
 */

const shimmer = `relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent`;

export const SkeletonCard = () => (
  <div className={`bg-white dark:bg-[#111] rounded-xl p-3 border border-gray-100 dark:border-[#222] shadow-sm ${shimmer}`}>
    <div className="flex items-center justify-between mb-3">
      <div className="h-2.5 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
    </div>
    <div className="h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
  </div>
);

export const SkeletonSummaryCards = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
    {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
  </div>
);

export const SkeletonChart = ({ height = 'h-40 md:h-56' }: { height?: string }) => (
  <div className={`bg-white dark:bg-[#111] rounded-xl p-4 border border-gray-100 dark:border-[#222] shadow-sm ${shimmer}`}>
    <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
    <div className={`${height} flex items-end gap-2 px-4`}>
      {[40, 65, 50, 80, 55, 70, 45].map((h, i) => (
        <div key={i} className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-t" style={{ height: `${h}%` }} />
      ))}
    </div>
  </div>
);

export const SkeletonPieChart = () => (
  <div className={`bg-white dark:bg-[#111] rounded-xl p-4 border border-gray-100 dark:border-[#222] shadow-sm ${shimmer}`}>
    <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
    <div className="h-40 md:h-52 flex items-center justify-center">
      <div className="w-28 h-28 rounded-full border-8 border-gray-200 dark:border-gray-700" />
    </div>
  </div>
);

export const SkeletonClassroomMonitor = () => (
  <div className={`bg-white dark:bg-[#111] rounded-xl border border-gray-100 dark:border-[#222] shadow-sm overflow-hidden ${shimmer}`}>
    <div className="px-4 py-3 border-b border-gray-100 dark:border-[#222] bg-gray-50/50 dark:bg-white/[0.02] flex items-center justify-between">
      <div className="h-4 w-44 bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="flex gap-2">
        <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
        <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
      </div>
    </div>
    <div className="p-3 space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 dark:border-[#222]">
          <div className="h-3 w-10 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-2 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="h-5 w-14 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonActivityFeed = () => (
  <div className={`bg-white dark:bg-[#111] rounded-xl border border-gray-100 dark:border-[#222] shadow-sm overflow-hidden ${shimmer}`}>
    <div className="px-4 py-3 border-b border-gray-100 dark:border-[#222] bg-gray-50/50 dark:bg-white/[0.02]">
      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
    <div className="p-3 space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg">
          <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded mt-0.5" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-2 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="h-2.5 w-10 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      ))}
    </div>
  </div>
);
