"use client";



import { useState } from "react";

import { Button } from "@/components/ui/button";

import { SearchField, TextField } from "@/components/ui/field";

import { Badge, RatingButtons, SegmentedControl, Switch, type Rating } from "@/components/ui/controls";

import { EmptyState, Skeleton, Toast } from "@/components/ui/feedback";


import { LineChart, MacroBar, ProgressRing } from "@/components/ui/data-viz";

import { BottomNav, MealCard } from "@/components/ui/app-parts";



const COLORES = [

  ["bg", "Fondo"],

  ["surface", "Superficie"],

  ["border", "Borde"],

  ["border-input", "Borde de campo"],

  ["ink", "Texto"],

  ["muted", "Texto suave"],

  ["accent", "Acento"],

  ["accent-soft", "Acento suave"],

  ["on-accent", "Sobre acento"],

  ["danger", "Peligro"],

  ["success", "Éxito"],

  ["warning", "Aviso"],

  ["track", "Carril gráfico"],

] as const;



const LETRAS = [

  ["text-display", "40 / 700"],

  ["text-xl", "28 / 700"],

  ["text-lg", "20 / 600"],

  ["text-base", "16 / 400"],

  ["text-sm", "14 / 400"],

  ["text-xs", "12 / 500"],

] as const;



function Section({ title, children }: { title: string; children: React.ReactNode }) {

  return (

    <section className="flex flex-col gap-4 border-t border-border pt-6">

      <h2 className="text-lg text-ink">{title}</h2>

      {children}

    </section>

  );

}



export default function DesignPage() {

  const [seg, setSeg] = useState("comida");

  const [sw, setSw] = useState(true);

  const [rating, setRating] = useState<Rating>("like");

  const [q, setQ] = useState("avena");

  const [nav, setNav] = useState("hoy");



  return (

    <main className="mx-auto flex w-full max-w-[390px] flex-col gap-6 border-x border-border px-5 py-8">

      <header className="flex flex-col gap-1">

        <p className="text-sm text-muted">Sistema de diseño</p>

        <h1 className="text-xl text-ink">My Fitness</h1>

        <p className="text-sm text-muted">

          Página de control: aquí se ven los componentes antes de montar las pantallas. El color

          verde es provisional.

        </p>

      </header>



      <Section title="Colores">

        <div className="grid grid-cols-3 gap-2">

          {COLORES.map(([rol, nombre]) => (

            <div key={rol} className="flex flex-col gap-1.5">

              <div

                className="h-14 rounded-md border border-border"

                style={{ background: `var(--color-${rol})` }}

              />

              <span className="text-xs text-muted">{nombre}</span>

            </div>

          ))}

        </div>

      </Section>



      <Section title="Letras">

        <div className="flex flex-col gap-2">

          {LETRAS.map(([t, meta]) => (

            <div key={t} className="flex items-baseline justify-between gap-4">

              <span className={`${t} text-ink`}>Bajar de peso</span>

              <span className="text-xs text-muted">{meta}</span>

            </div>

          ))}

        </div>

      </Section>



      <Section title="Botones">

        <div className="flex flex-wrap items-center gap-3">

          <Button>Guardar</Button>

          <Button variant="secondary">Cancelar</Button>

          <Button variant="ghost">Ahora no</Button>

          <Button variant="danger">Borrar</Button>

        </div>

        <div className="flex flex-wrap items-center gap-3">

          <Button size="sm">Pequeño</Button>

          <Button size="lg">Grande</Button>

          <Button loading>Guardando</Button>

          <Button disabled>Desactivado</Button>

        </div>

      </Section>



      <Section title="Campos">

        <TextField label="Peso de hoy" type="text" inputMode="decimal" suffix="kg" defaultValue="78,4" />

        <TextField label="Altura" suffix="cm" hint="La usaré para calcular tu gasto." defaultValue="178" />

        <TextField label="Peso objetivo" suffix="kg" error="Escribe un peso mayor que 0." defaultValue="0" />

        <SearchField value={q} onChange={setQ} results={q ? 3 : null} />

      </Section>



      <Section title="Controles">

        <SegmentedControl

          label="Comida"

          value={seg}

          onChange={setSeg}

          options={[

            { value: "desayuno", label: "Desayuno" },

            { value: "comida", label: "Comida" },

            { value: "cena", label: "Cena" },

            { value: "snack", label: "Snack" },

          ]}

        />

        <Switch checked={sw} onChange={setSw} label="Avisarme para pesarme por la mañana" />

        <div className="flex flex-wrap gap-2">

          <Badge>vegano</Badge>

          <Badge tone="neutral">sin gluten</Badge>

          <Badge tone="success">hecho</Badge>

          <Badge tone="warning">te pasaste un poco</Badge>

          <Badge tone="danger">no encontrado</Badge>

        </div>

        <RatingButtons value={rating} onChange={setRating} />

      </Section>



      <Section title="Avisos y estados">

        <Toast tone="success">Comida anotada. ¡Buen trabajo!</Toast>

        <Toast tone="warning">Te has pasado 120 kcal. Sin drama, mañana seguimos.</Toast>

        <Toast tone="danger">No he podido leer el código. Prueba otra vez.</Toast>

        <div className="flex flex-col gap-2">

          <Skeleton className="h-4 w-3/4" />

          <Skeleton className="h-4 w-1/2" />

          <Skeleton className="h-24 w-full" rounded="rounded-lg" />

        </div>

        <EmptyState

          title="Aún no hay nada hoy"

          body="Anota lo primero que comas y empezamos a contar."

          action={<Button>Añadir comida</Button>}

        />

      </Section>



      <Section title="Datos">

        <div className="flex items-center justify-around gap-4">

          <ProgressRing value={1240} max={1900} label="Calorías de hoy" />

          <ProgressRing value={2100} max={1900} size={120} stroke={10} label="Calorías de hoy" />

        </div>

        <div className="flex flex-col gap-3">

          <MacroBar name="Proteína" value={92} max={140} />

          <MacroBar name="Carbohidrato" value={150} max={180} />

          <MacroBar name="Grasa" value={68} max={60} />

        </div>

        <LineChart

          label="Peso"

          points={[82.4, 82.1, 82.3, 81.8, 81.6, 81.7, 81.2, 80.9]}

        />

      </Section>



      <Section title="Piezas de la app">

        <MealCard

          meal="Desayuno"

          items={[

            { name: "Avena", qty: "60 g", kcal: 228 },

            { name: "Plátano", qty: "1 unidad", kcal: 105 },

            { name: "Café con leche", qty: "200 ml", kcal: 62 },

          ]}

          onAdd={() => {}}

        />

        <MealCard meal="Cena" items={[]} onAdd={() => {}} />

      </Section>



      <Section title="Navegación">

        <div className="overflow-hidden rounded-lg border border-border">

          <BottomNav active={nav} onChange={setNav} onAdd={() => {}} />

        </div>

      </Section>

    </main>

  );

}

