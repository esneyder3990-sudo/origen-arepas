import { rpc } from "@/lib/tienda"

// Fotos subidas desde el panel (Admin → Menú → Editar → Subir foto).
// Cada foto tiene un id único y nunca cambia, así que se cachea por un año.
export async function GET(_req: Request, ctx: RouteContext<"/fotos/[id]">) {
  const { id } = await ctx.params
  const uuid = id.replace(/\.(jpg|jpeg|png|webp)$/i, "")
  if (!/^[0-9a-f-]{36}$/i.test(uuid)) return new Response("No encontrada", { status: 404 })

  const foto = await rpc<{ tipo: string; datos: string } | null>("tienda_imagen", { p_id: uuid }).catch(() => null)
  if (!foto) return new Response("No encontrada", { status: 404 })

  return new Response(Buffer.from(foto.datos, "base64"), {
    headers: {
      "Content-Type": foto.tipo,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}
