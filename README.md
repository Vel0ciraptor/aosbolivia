# RepuestoIA 🚗

> Plataforma Integral de Servicios Automotrices — Marketplace que conecta clientes con repuestos, talleres mecánicos, grúas y asistencia por IA.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 16 + React 19 + TypeScript |
| Estilos | TailwindCSS v4 |
| Backend | NestJS 11 + TypeScript |
| Base de datos | PostgreSQL 16 + Prisma ORM |
| Contenedores | Docker + Docker Compose |

---

## Requisitos Previos

- Node.js 20+
- Docker Desktop ([Descargar aquí](https://www.docker.com/products/docker-desktop/))
- pnpm

---

## Instalación y Configuración

### 1. Clonar el proyecto

```bash
git clone https://github.com/Vel0ciraptor/aosbolivia.git
cd aosbolivia
```

### 2. Levantar con Docker (Recomendado)

```bash
cp .env.docker .env
docker compose up -d
```

Esto inicia:
- **Frontend** en `http://localhost:3003`
- **API** en `http://localhost:3001`
- **PostgreSQL** en `localhost:5432`
- **pgAdmin** en `http://localhost:5050`

### 3. Configurar la Base de Datos

```bash
cd apps/api
npx prisma migrate dev --name init
npx prisma db seed
```

### 4. Credenciales pgAdmin

| Campo | Valor |
|-------|-------|
| Email | admin@repuestoia.com |
| Password | PgAdm1n_R3pU3st0!2024 |

---

## Instalación Local (sin Docker)

### Backend

```bash
cd apps/api
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run start:dev
```

API disponible en: http://localhost:3001
Swagger docs en: http://localhost:3001/api/docs

### Frontend

```bash
cd apps/web
npm install
npm run dev
```

Frontend en: http://localhost:3003

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
aosbolivia/
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
│   │   │   └── ai/
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       └── seed.ts
│   └── web/          # Next.js Frontend
├── docker-compose.yml
├── .env.docker
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

POST   /api/requests
GET    /api/requests

GET    /api/parts?marca=Toyota&modelo=Hilux&anio=2019

GET    /api/providers/nearby?lat=10.48&lng=-66.90&radius=50
GET    /api/workshops/nearby?lat=10.48&lng=-66.90
GET    /api/tows/nearby?lat=10.48&lng=-66.90

POST   /api/ai/chat
POST   /api/ai/parse-request
```

---

## Variables de Entorno para Producción

Copia `.env.docker` como `.env` y ajusta:

```bash
# Cambia por tu dominio o IP del VPS
FRONTEND_URL=https://tudominio.com
NEXT_PUBLIC_API_URL=https://tudominio.com/api

# Cambia las contraseñas por seguras
POSTGRES_PASSWORD=tu_password_seguro
JWT_SECRET=tu_jwt_secret_seguro
PGADMIN_PASSWORD=tu_pgadmin_password
```

---

## Despliegue en VPS

```bash
# Clonar el repo
git clone https://github.com/Vel0ciraptor/aosbolivia.git
cd aosbolivia

# Configurar variables de entorno
cp .env.docker .env
# Editar .env con tus valores de producción

# Levantar servicios
docker compose up -d --build

# Ejecutar migraciones
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma db seed
```

