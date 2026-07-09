# RepuestoIA 🚗

> Plataforma Integral de Servicios Automotrices — Marketplace que conecta clientes con repuestos, talleres mecánicos, grúas y asistencia por IA.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 15 + React 19 + TypeScript |
| Estilos | TailwindCSS v4 + ShadCN/UI |
| Backend | NestJS 11 + TypeScript |
| Base de datos | PostgreSQL 16 + Prisma ORM |
| Contenedores | Docker + Docker Compose |

---

## Requisitos Previos

- Node.js 20+
- Docker Desktop ([Descargar aquí](https://www.docker.com/products/docker-desktop/))
- npm o pnpm

---

## Instalación y Configuración

### 1. Clonar / abrir el proyecto

```bash
cd RepuestoIA
```

### 2. Instalar Docker Desktop

Descarga e instala Docker Desktop desde: https://www.docker.com/products/docker-desktop/

Reinicia tu equipo si es necesario.

### 3. Levantar la base de datos

```bash
docker compose up -d
```

Esto inicia:
- **PostgreSQL 16** en `localhost:5432`
- **pgAdmin** en `http://localhost:5050` (admin@repuestoia.com / admin123)

### 4. Configurar el Backend

```bash
cd apps/api
```

El archivo `.env` ya está configurado. Ejecutar migraciones:

```bash
npm run prisma:migrate
# Cuando pida nombre de migración: "initial_schema"

npm run prisma:generate
npm run prisma:seed
```

### 5. Iniciar el Backend

```bash
npm run start:dev
```

API disponible en: http://localhost:3001  
Swagger docs en: http://localhost:3001/api/docs

### 6. Configurar el Frontend

```bash
cd apps/web
npm install
npm run dev
```

Frontend en: http://localhost:3000

---

## Credenciales Demo

| Usuario | Email | Contraseña |
|---------|-------|-----------|
| Admin | admin@repuestoia.com | admin123 |
| Cliente | juan@demo.com | client123 |
| Proveedor 1 | autopartes@demo.com | prov123 |
| Proveedor 2 | repuestos_norte@demo.com | prov123 |
| Taller | taller_elite@demo.com | workshop123 |
| Grúa | gruas_rapid@demo.com | tow123 |

---

## Estructura del Proyecto

```
RepuestoIA/
├── apps/
│   ├── api/          # NestJS Backend
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── vehicles/
│   │   │   ├── requests/
│   │   │   ├── parts/
│   │   │   ├── quotes/
│   │   │   ├── providers/
│   │   │   ├── workshops/
│   │   │   ├── tows/
│   │   │   └── ai/          # IA Mock (sin API externa)
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       └── seed.ts
│   └── web/          # Next.js Frontend
├── docker-compose.yml
└── README.md
```

---

## API Endpoints Principales

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/vehicles
POST   /api/vehicles

POST   /api/requests          ← Solicitud con parser IA
GET    /api/requests

GET    /api/parts?marca=Toyota&modelo=Hilux&anio=2019

GET    /api/providers/nearby?lat=10.48&lng=-66.90&radius=50
GET    /api/workshops/nearby?lat=10.48&lng=-66.90
GET    /api/tows/nearby?lat=10.48&lng=-66.90

POST   /api/ai/chat
POST   /api/ai/parse-request
```

---

## Módulo IA (Demo)

El módulo de IA funciona **sin ninguna API externa**. Implementa:

- **Parser de texto libre**: Detecta categoría, marca, modelo, año y pieza desde lenguaje natural
- **Chatbot contextual**: Responde sobre repuestos, talleres, grúas y diagnósticos básicos
- **Búsqueda inteligente**: Cruza la información parseada con la base de datos

Ejemplo:
```
Input: "Necesito una bomba de gasolina para mi Hilux 2019"
Output: { categoria: "REPUESTO", marca: "Toyota", modelo: "Hilux", anio: 2019, pieza: "bomba de gasolina" }
```

---

## Fase Actual: MVP (Fase 1)

- ✅ Auth completo (JWT)
- ✅ Perfil vehicular
- ✅ Solicitudes inteligentes con IA Mock
- ✅ Catálogo de repuestos
- ✅ Cotizaciones
- ✅ Proveedores, talleres, grúas
- ✅ Geolocalización (haversine)
- ✅ Chatbot demo
- 🔜 Frontend Next.js (en desarrollo)
