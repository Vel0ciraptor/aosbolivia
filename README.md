# RepuestoIA

> Plataforma Integral de Servicios Automotrices — Marketplace que conecta clientes con repuestos, talleres mecanicos, gruas y asistencia por IA.

---

## Stack Tecnologico

| Capa | Tecnologia |
|------|-----------|
| Frontend | Next.js 16 + React 19 + TypeScript |
| Estilos | TailwindCSS v4 |
| Backend | NestJS 11 + TypeScript |
| Base de datos | PostgreSQL 16 + Prisma ORM |
| Contenedores | Docker + Docker Compose |

---

## Puertos

| Servicio | Puerto |
|----------|--------|
| Frontend (Next.js) | 3003 |
| API (NestJS) | 3004 |
| PostgreSQL | 5432 |
| pgAdmin | 5050 |

---

## Instalacion y Configuracion

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
- **API** en `http://localhost:3004`
- **PostgreSQL** en `localhost:5432`
- **pgAdmin** en `http://localhost:5050`

### 3. Configurar la Base de Datos

```bash
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma db seed
```

### 4. Credenciales pgAdmin

| Campo | Valor |
|-------|-------|
| Email | admin@repuestoia.com |
| Password | PgAdm1n_R3pU3st0!2024 |

---

## Instalacion Local (sin Docker)

### Backend

```bash
cd apps/api
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run start:dev
```

API disponible en: http://localhost:3004
Swagger docs en: http://localhost:3004/api/docs

### Frontend

```bash
cd apps/web
npm install
npm run dev
```

Frontend en: http://localhost:3003

---

## Credenciales Demo

| Usuario | Email | Contrasena |
|---------|-------|-----------|
| Admin | admin@repuestoia.com | admin123 |
| Cliente | juan@demo.com | client123 |
| Proveedor 1 | autopartes@demo.com | prov123 |
| Proveedor 2 | repuestos_norte@demo.com | prov123 |
| Taller | taller_elite@demo.com | workshop123 |
| Grua | gruas_rapid@demo.com | tow123 |

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

## Despliegue en Dokploy (VPS Hostinger)

### 1. Clonar el repo en el VPS

```bash
git clone https://github.com/Vel0ciraptor/aosbolivia.git
cd aosbolivia
```

### 2. Configurar servicios en Dokploy

En el dashboard de Dokploy, crear **2 servicios Docker**:

#### Servicio: API

- **Tipo**: Dockerfile
- **Build Context**: `apps/api`
- **Dockerfile**: `Dockerfile`
- **Puerto**: 3004
- **Variables de entorno**:
  ```
  DATABASE_URL=postgresql://repuestoia:TU_PASSWORD@TU_HOST:5432/repuestoia_dev?schema=public
  JWT_SECRET=tu_jwt_secret_seguro
  JWT_EXPIRES_IN=15m
  JWT_REFRESH_SECRET=tu_refresh_secret_seguro
  JWT_REFRESH_EXPIRES_IN=7d
  PORT=3004
  NODE_ENV=production
  FRONTEND_URL=https://tudominio.com
  APP_URL=https://tu-api-domain.com
  ```

#### Servicio: Web

- **Tipo**: Dockerfile
- **Build Context**: `apps/web`
- **Dockerfile**: `Dockerfile`
- **Puerto**: 3003
- **Variables de entorno**:
  ```
  NEXT_PUBLIC_API_URL=https://tu-api-domain.com/api
  NEXT_PUBLIC_INSFORGE_URL=https://389836id.us-east.insforge.app
  NEXT_PUBLIC_INSFORGE_ANON_KEY=ik_82c6d672ca94de47c3cce12d93fb9378
  ```

### 3. Configurar PostgreSQL en Dokploy

En Dokploy, crear un servicio de **PostgreSQL**:
- **Imagen**: `postgres:16-alpine`
- **Puerto**: 5432
- **Variables**:
  ```
  POSTGRES_USER=repuestoia
  POSTGRES_PASSWORD=tu_password_seguro
  POSTGRES_DB=repuestoia_dev
  ```

### 4. Ejecutar migraciones

Una vez desplegado el servicio API:

```bash
# Acceder al contenedor del API
docker exec -it repuestoia_api sh

# Ejecutar migraciones
npx prisma migrate deploy
npx prisma db seed
```

### 5. Variables de Entorno para Produccion

Cambia `.env.docker` como `.env` y ajusta:

```bash
# Cambia por tu dominio o IP del VPS
FRONTEND_URL=https://tudominio.com
NEXT_PUBLIC_API_URL=https://tu-api-domain.com/api

# Cambia las contraseñas por seguras
POSTGRES_PASSWORD=tu_password_seguro
JWT_SECRET=tu_jwt_secret_seguro
PGADMIN_PASSWORD=tu_pgadmin_password
```

---

## Despliegue con Docker Compose (alternativa)

```bash
# Clonar el repo
git clone https://github.com/Vel0ciraptor/aosbolivia.git
cd aosbolivia

# Configurar variables de entorno
cp .env.docker .env
# Editar .env con tus valores de produccion

# Levantar servicios
docker compose up -d --build

# Ejecutar migraciones
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma db seed
```
