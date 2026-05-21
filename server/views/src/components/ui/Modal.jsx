export default function Modal({ children, onClose, maxWidth = '600px' }) {
  const handleOverlay = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-5"
      onClick={handleOverlay}
    >
      <div
        className="bg-bg-card border border-border rounded-2xl p-6 max-h-[80vh] overflow-y-auto w-full"
        style={{ maxWidth }}
      >
        <button
          onClick={onClose}
          className="float-right bg-transparent border-none text-text-dim text-2xl cursor-pointer leading-none hover:text-text"
        >
          &times;
        </button>
        {children}
      </div>
    </div>
  );
}
