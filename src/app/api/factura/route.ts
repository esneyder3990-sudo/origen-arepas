import { generateText, Output } from "ai"
import { z } from "zod"

import { type Insumo, rpc } from "@/lib/tienda"

// Lee la foto de una factura de compra y devuelve las líneas listas para revisar.
// Pasa por AI Gateway de Vercel (en Vercel se autentica sola con OIDC).
const MODELO = process.env.AI_GATEWAY_MODEL ?? "anthropic/claude-sonnet-5.5"

const esquema = z.object({
  es_factura: z.boolean().describe("true si la imagen es una factura, recibo o tirilla de compra legible"),
  proveedor: z.string().describe("Nombre del proveedor o almacén; vacío si no aparece"),
  fecha: z.string().describe("Fecha de la factura en formato YYYY-MM-DD; vacío si no se lee"),
  total: z.number().describe("Total pagado en pesos colombianos, sin decimales"),
  items: z.array(
    z.object({
      descripcion: z.string().describe("Producto tal como aparece, en español claro"),
      cantidad: z.number().describe("Cantidad comprada"),
      unidad: z.string().describe("Unidad: kg, g, lb, und, paquete, bulto, l…"),
      precio_total: z.number().describe("Valor total de la línea en COP (cantidad × precio unitario, con IVA si lo trae)"),
      insumo_id: z.number().nullable().describe("id del insumo del inventario que corresponde, o null si ninguno"),
    })
  ),
})

export async function POST(req: Request) {
  const { pin, imagen } = (await req.json().catch(() => ({}))) as { pin?: string; imagen?: string }
  if (!pin || !imagen) return Response.json({ error: "Falta la foto" }, { status: 400 })
  if (imagen.length > 3_000_000) return Response.json({ error: "La foto es muy pesada" }, { status: 413 })

  const ok = await rpc<boolean>("tienda_admin_login", { p_pin: pin }).catch(() => false)
  if (!ok) return Response.json({ error: "PIN incorrecto" }, { status: 401 })

  const insumos = await rpc<Insumo[]>("tienda_admin_leer", { p_pin: pin, p_tabla: "insumos" }).catch(() => [])
  const lista = insumos.map((i) => `- id ${i.id}: ${i.nombre} (se cuenta por: ${i.unidad})`).join("\n")

  try {
    const { output } = await generateText({
      model: MODELO,
      output: Output.object({ schema: esquema }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Eres el asistente de compras de Origen, un negocio de arepas y patacones en Chía, Colombia.
Lee esta factura o recibo de compra y extrae cada línea de producto.

Reglas:
- Valores en pesos colombianos (COP) sin decimales. En Colombia el punto separa miles: "16.400" = 16400.
- precio_total es el valor total de la línea, no el unitario.
- Si hay descuentos por línea, réstalos. No incluyas como ítems el subtotal, IVA, propinas ni domicilio del proveedor.
- Relaciona cada línea con el insumo del inventario que corresponda (insumo_id), solo si es claramente el mismo producto.
  Cuando lo relaciones, expresa "cantidad" en la misma unidad en que se cuenta ese insumo (por ejemplo, si el insumo se cuenta por "3 kg" y compraron 6 kg, cantidad = 2).
- Si algo no se lee, no lo inventes.

Inventario de Origen:
${lista || "(sin insumos registrados)"}`,
            },
            { type: "file", mediaType: "image", data: imagen },
          ],
        },
      ],
    })
    return Response.json(output)
  } catch (e) {
    console.error("factura: error leyendo con IA", e)
    const msg = (e as Error).message ?? ""
    const sinCreditos = /credit|insufficient|budget|402/i.test(msg)
    return Response.json(
      { error: sinCreditos ? "No hay créditos de IA disponibles en Vercel (AI Gateway)." : "No se pudo leer la factura. Intenta con una foto más clara." },
      { status: 502 }
    )
  }
}
