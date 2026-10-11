import { permanentRedirect } from "next/navigation"

// El menú para pedir ahora vive en la página principal; los enlaces viejos a /pedir siguen funcionando.
export default function PedirRedirect() {
  permanentRedirect("/")
}
