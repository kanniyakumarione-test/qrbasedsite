export default function Card({ children, className = '' }) {
  return (
    <section className={`rounded-3xl border border-white/60 bg-white/75 p-5 shadow-soft backdrop-blur ${className}`}>
      {children}
    </section>
  );
}
