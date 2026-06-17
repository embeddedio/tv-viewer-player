export default function Card({ children, className = '', title }) {
  return (
    <div className={`bg-gradient-to-br from-bg-card to-bg-card2 border border-border rounded-xl shadow-card p-6 ${className}`}>
      {title && <h2 className="text-[1.15rem] mb-4 text-text">{title}</h2>}
      {children}
    </div>
  );
}
