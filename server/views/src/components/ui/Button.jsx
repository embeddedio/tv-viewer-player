const variants = {
  primary: 'bg-gradient-to-br from-green to-accent text-bg hover:shadow-[0_4px_12px_rgba(34,211,238,0.3)] hover:-translate-y-px',
  danger: 'bg-red text-white hover:bg-red/80',
  secondary: 'bg-white/[0.08] text-text border border-border hover:bg-white/[0.12]',
};

export default function Button({ variant = 'primary', sm, className = '', children, ...rest }) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 font-semibold rounded-lg cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
        sm ? 'px-3 py-1.5 text-xs' : 'px-5 py-2.5 text-sm'
      } ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
