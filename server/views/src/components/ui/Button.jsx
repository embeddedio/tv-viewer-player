const variants = {
  primary: 'bg-gradient-to-br from-accent to-accent2 text-white hover:shadow-[0_4px_14px_rgb(var(--color-accent)/0.35)] hover:-translate-y-px',
  danger: 'bg-red text-white hover:bg-red/80',
  secondary: 'bg-surface text-text border border-border hover:border-border-hover hover:bg-card2',
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
