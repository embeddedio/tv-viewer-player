export default function Spinner({ className = '' }) {
  return (
    <span
      className={`inline-block w-[18px] h-[18px] border-2 border-text-dim/30 rounded-full border-t-accent animate-[spin_0.8s_linear_infinite] ${className}`}
    />
  );
}
