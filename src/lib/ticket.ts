import { type Pedido, TIPO_LABEL, formatCOP, numeroPedido } from "@/lib/tienda"

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!)

/** Abre una ventana con el ticket en formato de impresora térmica (80 mm) y lanza imprimir. */
export function imprimirTicket(p: Pedido) {
  const w = window.open("", "_blank", "width=380,height=640")
  if (!w) return
  const items = p.items
    .map(
      (i) =>
        `<tr><td>${i.cantidad}x ${esc(i.nombre)}${i.adiciones.map((a) => `<br><small>+ ${esc(a.nombre)}</small>`).join("")}${
          i.nota ? `<br><small><i>${esc(i.nota)}</i></small>` : ""
        }</td><td class="r">${formatCOP(i.total)}</td></tr>`
    )
    .join("")
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Pedido ${numeroPedido(p.numero)}</title>
<style>
  @page { size: 80mm auto; margin: 4mm }
  body { font: 12px/1.35 ui-monospace, Menlo, Consolas, monospace; color: #000; margin: 0; width: 72mm }
  h1 { font-size: 20px; margin: 0 0 2px; text-align: center }
  .c { text-align: center } .r { text-align: right; white-space: nowrap; vertical-align: top }
  table { width: 100%; border-collapse: collapse } td { padding: 3px 0; vertical-align: top }
  hr { border: 0; border-top: 1px dashed #000; margin: 6px 0 } small { font-size: 11px }
  .t { font-size: 15px; font-weight: bold }
</style></head><body>
<h1>ORIGEN</h1><div class="c">Arepas y patacones artesanales</div><hr>
<div class="t">Pedido ${numeroPedido(p.numero)} · ${TIPO_LABEL[p.tipo]}${p.mesa_nombre ? ` · ${esc(p.mesa_nombre)}` : ""}</div>
<div>${new Date(p.creado).toLocaleString("es-CO")}</div>
${p.cliente_nombre ? `<div>${esc(p.cliente_nombre)} · ${esc(p.cliente_celular)}</div>` : ""}
${p.tipo === "domicilio" ? `<div>${esc(p.direccion)} — ${esc(p.zona_nombre)}</div>${p.nota_domiciliario ? `<div><i>${esc(p.nota_domiciliario)}</i></div>` : ""}` : ""}
<hr><table>${items}</table><hr><table>
<tr><td>Subtotal</td><td class="r">${formatCOP(p.subtotal)}</td></tr>
${p.descuento ? `<tr><td>Descuento ${esc(p.cupon)}</td><td class="r">-${formatCOP(p.descuento)}</td></tr>` : ""}
${p.domicilio ? `<tr><td>Domicilio</td><td class="r">${formatCOP(p.domicilio)}</td></tr>` : ""}
<tr class="t"><td>TOTAL</td><td class="r">${formatCOP(p.total)}</td></tr></table>
<div>Pago: ${p.metodo_pago ?? "—"}${p.metodo_pago === "transferencia" ? (p.pago_confirmado ? " (confirmado)" : " (SIN CONFIRMAR)") : ""}</div>
<hr><div class="c">¡Gracias por pedir en Origen!</div>
<script>window.onload = () => { window.print(); setTimeout(() => window.close(), 300) }</script>
</body></html>`)
  w.document.close()
}
