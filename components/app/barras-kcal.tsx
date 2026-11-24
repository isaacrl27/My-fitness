import { conComa, ddMM } from "@/lib/calculos";

/** El día siguiente en ISO, a mediodía para que el cambio de hora no lo mueva. */
function diaSiguiente(fechaIso: string): string {
  const d = new Date(`${fechaIso}T12:00:00`);
  d.setDate(d.getDate() + 1);
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** La inicial del día, como se escribe en un calendario español. */
const INICIALES_DIA = ["D", "L", "M", "X", "J", "V", "S"];

function inicialDia(fechaIso: string): string {
  return INICIALES_DIA[new Date(`${fechaIso}T12:00:00`).getDay()] ?? "";
}

/** Barra simple, dibujada a mano, sin librerías de gráficas. */
export function Barras({
  datos,
  etiqueta,
  fechas,
  objetivo,
  unidad = "kcal",
}: {
  datos: { dia: string; valor: number }[];
  etiqueta: string;
  fechas: string[];
  objetivo: number;
  unidad?: string;
}) {
  const max = Math.max(1, objetivo, ...datos.map((d) => d.valor));
  const pctObjetivo = Math.min(100, (objetivo / max) * 100);
  return (
    <div className="flex gap-2">
      <div className="flex w-12 flex-col justify-between py-0.5 text-right text-xs text-muted tabular-nums">
        <span data-eje>{conComa(max, 0)}</span>
        <span>0</span>
      </div>
      <div className="flex-1">
        {/* El objetivo se lee encima de la gráfica: dentro se quedaba detrás
            de las barras y no había quien lo leyera. */}
        {objetivo > 0 ? (
          <p className="pb-1 text-right text-xs text-muted tabular-nums">
            Objetivo {Math.round(objetivo)} {unidad}
          </p>
        ) : null}
        <div role="group" aria-label={etiqueta} className="relative h-32">
          {objetivo > 0 ? (
            /* La línea del objetivo: discontinua, a la altura que toca. */
            <div
              className="absolute left-0 right-0 border-t border-dashed border-muted/60"
              style={{ bottom: `${pctObjetivo}%` }}
            />
          ) : null}
          <div className="absolute inset-0 flex items-end gap-1">
            {datos.map((d, idx) => {
              const pasada = objetivo > 0 && d.valor > objetivo;
              const valor =
                `${d.dia}: ${conComa(Math.round(d.valor))} ${unidad}` +
                (pasada ? ", por encima del objetivo" : "") +
                (d.valor === 0 ? ", sin nada anotado" : "");
              return (
                <div
                  key={d.dia}
                  className="relative flex-1 h-full flex items-end justify-center group"
                >
                  {/* Barra guía translúcida de fondo para estructurar los 7 días */}
                  <div className="absolute inset-x-0 bottom-0 top-0 rounded-sm bg-border/25 pointer-events-none" />
                  <div
                    data-supera={pasada ? "si" : "no"}
                    role="img"
                    aria-label={valor}
                    tabIndex={0}
                    title={valor}
                    className={[
                      "relative z-10 w-full rounded-sm barra-suave hover:brightness-110 active:scale-95 cursor-pointer",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                      pasada ? "bg-warning" : d.valor > 0 ? "bg-accent" : "opacity-0",
                    ].join(" ")}
                    style={{
                      height: d.valor > 0 ? `${(d.valor / max) * 100}%` : "0%",
                      transitionDelay: `${Math.min(300, idx * 25)}ms`,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <div
          className={datos.length > 10 ? "relative h-4 pt-1" : "flex gap-1 pt-1"}
          aria-hidden="true"
        >
          {datos.length > 10
            ? // En 30 días, treinta iniciales seguidas no se leen: no hay forma
              // de saber a qué fecha pertenece una barra del medio. Se ponen
              // cinco fechas, una cada siete días, colocadas encima de su barra.
              // Antes iban repartidas a partes iguales y no coincidían con la
              // barra que etiquetaban.
              [0, 7, 14, 21, datos.length - 1]
                .filter((i, pos, todos) => i < datos.length && todos.indexOf(i) === pos)
                .map((i) => (
                  <span
                    key={`marca-${datos[i].dia}`}
                    data-marca
                    className="absolute top-0 text-[10px] text-muted"
                    style={{
                      left: `${datos.length > 1 ? (i / (datos.length - 1)) * 100 : 0}%`,
                      transform:
                        i === 0
                          ? "translateX(0)"
                          : i === datos.length - 1
                            ? "translateX(-100%)"
                            : "translateX(-50%)",
                    }}
                  >
                    {ddMM(datos[i].dia)}
                  </span>
                ))
            : datos.map((d) => (
                <span
                  key={`inicial-${d.dia}`}
                  data-inicial
                  className="min-w-0 flex-1 text-center text-[10px] text-muted"
                >
                  {inicialDia(d.dia)}
                </span>
              ))}
        </div>
        {datos.length > 10 ? null : (
          <div className="flex justify-between pt-0.5 text-xs text-muted">
            <span>{fechas[0] ? ddMM(fechas[0]) : ""}</span>
            <span>{fechas[fechas.length - 1] ? ddMM(fechas[fechas.length - 1]) : ""}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/** Los días del periodo, con un cero en los que no hay nada anotado. */
export function diasDelRango(
  kcalPorDia: { dia: string; kcal: number }[],
  desde: string,
  hasta: string,
): { dia: string; valor: number }[] {
  const mapa = new Map(
    kcalPorDia.filter((d) => d.dia >= desde && d.dia <= hasta).map((d) => [d.dia, d.kcal]),
  );
  const dias: { dia: string; valor: number }[] = [];
  let f = desde;
  while (f <= hasta) {
    dias.push({ dia: f, valor: mapa.get(f) ?? 0 });
    f = diaSiguiente(f);
  }
  return dias;
}
