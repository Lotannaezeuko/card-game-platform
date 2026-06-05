export default function Modal({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel, danger = false }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="panel shadow-lg w-full max-w-sm p-6 flex flex-col gap-4">
        <h3 className="font-semibold text-text text-lg">{title}</h3>
        {message && <p className="text-sm text-textMuted leading-relaxed">{message}</p>}
        <div className="flex gap-3 mt-2">
          <button
            onClick={onCancel}
            className="btn-secondary flex-1 py-2.5 text-sm"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-md text-sm font-semibold transition-colors ${
              danger ? 'bg-error text-white hover:opacity-90' : 'btn-primary'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
