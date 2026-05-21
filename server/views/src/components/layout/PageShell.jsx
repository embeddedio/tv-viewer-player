export default function PageShell({ children, className = '', scroll = true }) {
  return (
    <div className={`max-w-container mx-auto p-5 w-full ${scroll ? 'overflow-y-auto flex-1' : ''} ${className}`}>
      {children}
    </div>
  );
}
