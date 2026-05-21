export default function FormGroup({ label, children, className = '' }) {
  return (
    <div className={`mb-4 ${className}`}>
      <label className="block mb-1.5 font-medium text-text-muted text-sm">{label}</label>
      {children}
    </div>
  );
}
