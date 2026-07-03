// Reusable skeleton loaders for different page layouts

// Single line shimmer
export const SkeletonLine = ({ w = 'w-full', h = 'h-4', className = '' }) => (
  <div className={`${w} ${h} bg-slate-200 rounded-lg animate-pulse ${className}`} />
);

// Card skeleton (used in grids)
export const SkeletonCard = ({ rows = 3 }) => (
  <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-slate-200 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-slate-200 rounded-lg w-3/4" />
        <div className="h-3 bg-slate-100 rounded-lg w-1/2" />
      </div>
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className={`h-3 bg-slate-100 rounded-lg ${i % 2 === 0 ? 'w-full' : 'w-4/5'}`} />
    ))}
  </div>
);

// Table row skeleton
export const SkeletonTableRow = ({ cols = 5 }) => (
  <tr className="border-b border-slate-50">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="py-4 px-2">
        <div className={`h-3.5 bg-slate-100 rounded-lg animate-pulse ${i === 0 ? 'w-24' : i === cols - 1 ? 'w-16' : 'w-full'}`} />
      </td>
    ))}
  </tr>
);

// Full page loading spinner
export const PageLoader = ({ message = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center h-64 gap-4">
    <div className="relative w-14 h-14">
      <div className="w-14 h-14 border-4 border-slate-200 rounded-full" />
      <div className="absolute inset-0 w-14 h-14 border-4 border-[#f97316] border-t-transparent rounded-full animate-spin" />
    </div>
    <p className="text-sm font-bold text-slate-400 animate-pulse">{message}</p>
  </div>
);

// Button with loading state
export const LoadingButton = ({
  loading = false,
  children,
  loadingText = 'Saving...',
  className = '',
  disabled = false,
  type = 'button',
  onClick,
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={loading || disabled}
    className={`flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
  >
    {loading ? (
      <>
        <svg className="animate-spin w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <span>{loadingText}</span>
      </>
    ) : children}
  </button>
);

// Empty state
export const EmptyState = ({ icon = '📭', title = 'No data found', subtitle = '', action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="text-5xl mb-4">{icon}</div>
    <h3 className="text-base font-bold text-slate-700 mb-1">{title}</h3>
    {subtitle && <p className="text-sm text-slate-400 font-medium mb-4">{subtitle}</p>}
    {action}
  </div>
);

// Inline error message
export const FieldError = ({ message }) =>
  message ? <p className="text-xs text-red-500 font-semibold mt-1 flex items-center gap-1">⚠️ {message}</p> : null;
