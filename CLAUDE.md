@AGENTS.md

# Reglas de diseño

## Componentes UI
- Para TODOS los componentes de UI, usá primero los de Cult UI (@cult-ui).
- El registry está configurado en components.json.
- Para instalar: npx shadcn@latest add @cult-ui/[nombre]
- Consultá el catálogo completo en https://cult-ui.com/docs

## Prioridad de componentes
1. Cult UI (animados, premium)
2. shadcn/ui (base, sin animación)
3. Custom (solo si no existe en ninguno de los anteriores)

## Estilo
- Usar Framer Motion para animaciones custom
- Preferir componentes con animación sobre estáticos
- Mantener el branding del proyecto en todo momento
