/** Nome do Elogram no topo. Trocar pelo arquivo da logo quando for enviado (um único lugar). */
export function ElogramWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`select-none text-[28px] font-extrabold italic leading-none tracking-tight ${className}`}>
      Elogram
    </span>
  );
}
