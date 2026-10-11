"use client"

import { useState } from "react"
import Image from "next/image"

import { CategoriaIcono, ICONOS_DISPONIBLES } from "@/components/tienda/ui"
import { type Adicion, type Categoria, type Producto, formatCOP } from "@/lib/tienda"
import { type Campo, ListaEditable, Pestanas, useTabla } from "./comun"

const APLICA = [
  { valor: "arepa", label: "Adiciones de arepa" },
  { valor: "patacon", label: "Adiciones de patacón" },
  { valor: "ninguna", label: "Sin adiciones" },
]

export function SeccionMenu() {
  const [tab, setTab] = useState<"productos" | "categorias" | "adiciones">("productos")
  const { filas: categorias } = useTabla<Categoria & Record<string, unknown>>("categorias")
  const [filtro, setFiltro] = useState<number | "todas">("todas")

  const camposProducto: Campo[] = [
    { k: "nombre", label: "Nombre", tipo: "texto" },
    { k: "descripcion", label: "Descripción", tipo: "area" },
    { k: "precio", label: "Precio (COP)", tipo: "numero" },
    { k: "costo", label: "Costo de producción (para márgenes)", tipo: "numero" },
    { k: "categoria_id", label: "Categoría", tipo: "select", opciones: (categorias ?? []).map((c) => ({ valor: c.id, label: c.nombre })) },
    { k: "aplica_adiciones", label: "Adiciones que se ofrecen", tipo: "select", opciones: APLICA },
    { k: "imagen", label: "Foto", tipo: "imagen" },
    { k: "sugerido", label: "Sugerir en “¿Le agregas algo más?”", tipo: "bool" },
    { k: "activo", label: "Disponible", tipo: "bool" },
    { k: "orden", label: "Orden", tipo: "numero" },
  ]

  return (
    <div>
      <Pestanas
        valor={tab}
        onCambiar={setTab}
        opciones={[
          { id: "productos", label: "Productos" },
          { id: "categorias", label: "Categorías" },
          { id: "adiciones", label: "Adiciones" },
        ]}
      />

      {tab === "productos" && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            {[{ id: "todas" as const, nombre: "Todas" }, ...(categorias ?? [])].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setFiltro(c.id)}
                className={`border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] ${filtro === c.id ? "border-achiote text-tostado" : "border-paper/15 text-paper/55"}`}
              >
                {c.nombre}
              </button>
            ))}
          </div>
          <ListaEditable<Producto & Record<string, unknown>>
            tabla="productos"
            nombre="producto"
            campos={camposProducto}
            nueva={{ nombre: "", descripcion: "", precio: 0, costo: 0, categoria_id: categorias?.[0]?.id ?? 1, aplica_adiciones: "ninguna", imagen: "/img/hero-poster.jpg", sugerido: false, activo: true, orden: 0 }}
            filtrar={(p) => filtro === "todas" || p.categoria_id === filtro}
            render={(p) => (
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden border border-paper/15">
                  <Image src={p.imagen} alt="" fill sizes="48px" className="object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.nombre}</p>
                  <p className="font-mono text-xs text-tostado">
                    {formatCOP(p.precio)}
                    {!p.activo && <span className="ml-2 text-paper/50">· agotado</span>}
                  </p>
                </div>
              </div>
            )}
          />
        </>
      )}

      {tab === "categorias" && (
        <ListaEditable<Categoria & Record<string, unknown>>
          tabla="categorias"
          nombre="categoría"
          campos={[
            { k: "nombre", label: "Nombre", tipo: "texto" },
            { k: "icono", label: "Ícono", tipo: "select", opciones: ICONOS_DISPONIBLES.map((i) => ({ valor: i, label: i })) },
            { k: "orden", label: "Orden en el menú", tipo: "numero" },
            { k: "activo", label: "Visible", tipo: "bool" },
          ]}
          nueva={{ nombre: "", icono: "arepa", orden: 0, activo: true }}
          render={(c) => (
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center border border-paper/15 text-tostado">
                <CategoriaIcono icono={c.icono} className="h-5 w-5" />
              </span>
              <p className="text-sm font-medium">{c.nombre}</p>
            </div>
          )}
        />
      )}

      {tab === "adiciones" && (
        <ListaEditable<Adicion & Record<string, unknown>>
          tabla="adiciones"
          nombre="adición"
          campos={[
            { k: "nombre", label: "Nombre", tipo: "texto" },
            { k: "precio", label: "Precio (COP)", tipo: "numero" },
            { k: "imagen", label: "Foto", tipo: "imagen" },
            { k: "aplica", label: "Aplica a", tipo: "select", opciones: [{ valor: "todos", label: "Arepas y patacones" }, { valor: "arepa", label: "Solo arepas" }, { valor: "patacon", label: "Solo patacones" }] },
            { k: "orden", label: "Orden", tipo: "numero" },
            { k: "activo", label: "Disponible", tipo: "bool" },
          ]}
          nueva={{ nombre: "", precio: 0, imagen: "", aplica: "todos", orden: 0, activo: true }}
          render={(a) => (
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-paper/15 font-display text-tostado">
                {a.imagen ? <Image src={a.imagen} alt="" fill sizes="40px" className="object-cover" /> : a.nombre.charAt(0)}
              </div>
              <p className="text-sm">
                {a.nombre} <span className="font-mono text-xs text-tostado">+ {formatCOP(a.precio)}</span>
              </p>
            </div>
          )}
        />
      )}
    </div>
  )
}
