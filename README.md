# kilo-server

API de **Kilo** — sistema de predicción de demanda de insumos y recomendación de compras para restaurantes pequeños y medianos en Lima.

Stack: [Bun](https://bun.sh) + [Elysia](https://elysiajs.com) + Postgres.

## Requisitos

- Bun 1.4 o superior
- Postgres (local o remoto)

## Cómo levantarlo

```bash
bun install
cp .env.example .env   # y llena los valores
bun run dev
```

La API queda en http://localhost:3000

## Scripts

| Comando | Qué hace |
|---|---|
| `bun run dev` | Servidor con recarga automática |
| `bun run start` | Servidor sin recarga (producción) |
| `bun test` | Tests |
| `bun run typecheck` | Verifica tipos sin compilar |

## Documentación del producto

La documentación completa (flujo operativo, arquitectura, decisiones de producto) vive en [`docs/`](./docs) y se levanta aparte:

```bash
cd docs
bun install
bun run dev
```

Queda en http://localhost:4321

## Estructura

```
src/            código de la API
docs/           documentación del producto (Astro + Starlight)
.env.example    variables de entorno necesarias
```
