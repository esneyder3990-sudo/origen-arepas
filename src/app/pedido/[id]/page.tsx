import { Seguimiento } from "./seguimiento"

export const metadata = { title: "Tu pedido — Origen" }

export default async function PedidoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ t?: string }>
}) {
  const { id } = await params
  const { t } = await searchParams
  return <Seguimiento id={id} token={t ?? ""} />
}
