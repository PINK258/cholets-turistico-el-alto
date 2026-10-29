// Tarjeta gris con brillo mientras cargan los locales (misma forma que LocalCard).
export default function EsqueletoTarjeta() {
  return (
    <div aria-hidden>
      <div className="esqueleto aspect-[4/3] rounded-2xl" />
      <div className="pt-3 space-y-2">
        <div className="esqueleto h-4 w-3/4 rounded-full" />
        <div className="esqueleto h-3 w-1/2 rounded-full" />
      </div>
    </div>
  );
}
