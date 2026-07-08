import { useEffect } from 'react';

/**
 * ConfirmModal — replaces window.confirm() everywhere.
 *
 * Usage:
 *   const [confirmState, setConfirmState] = useState(null);
 *
 *   // Trigger:
 *   setConfirmState({
 *     title: 'Delete Item',
 *     message: 'Are you sure you want to delete this item?',
 *     confirmLabel: 'Delete',       // optional, default 'Confirm'
 *     confirmColor: 'red',          // 'red' | 'indigo' | 'emerald' — default 'red'
 *     onConfirm: () => doDelete(),
 *   });
 *
 *   // Render:
 *   {confirmState && <ConfirmModal {...confirmState} onClose={() => setConfirmState(null)} />}
 */
const ConfirmModal = ({
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  confirmColor = 'red',
  onConfirm,
  onClose,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const colorMap = {
    red:     'bg-red-600 hover:bg-red-700 shadow-red-600/20',
    indigo:  'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20',
    emerald: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20',
  };
  const btnClass = colorMap[confirmColor] || colorMap.red;

  const iconMap = {
    red:     { bg: 'bg-red-50', icon: '🗑️' },
    indigo:  { bg: 'bg-indigo-50', icon: '⚠️' },
    emerald: { bg: 'bg-emerald-50', icon: '✅' },
  };
  const { bg, icon } = iconMap[confirmColor] || iconMap.red;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-[fadeIn_0.15s_ease-out]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-5 animate-[scaleUp_0.15s_ease-out]">
        {/* Icon + Title */}
        <div className="flex items-start gap-4">
          <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center text-2xl flex-shrink-0`}>
            {icon}
          </div>
          <div>
            <h3 id="confirm-title" className="text-base font-extrabold text-slate-800">{title}</h3>
            {message && <p className="text-sm text-slate-500 font-medium mt-1 leading-relaxed">{message}</p>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`flex-1 py-2.5 text-white font-bold rounded-xl text-sm transition-all shadow-md ${btnClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
