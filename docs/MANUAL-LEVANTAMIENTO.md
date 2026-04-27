# Manual de levantamiento — TEC Digitalito

Este documento describe el arranque completo del proyecto en entorno local.

## 1. Requisitos

- [ ] Docker Desktop instalado y encendido.
- [ ] Node.js 20+ y npm disponibles.
- [ ] Repositorio clonado localmente.
- [ ] Acceso a servicios externos configurados (Neo4j AuraDB y MongoDB Atlas).

## 2. Configuración de variables

### 2.1 Archivos requeridos

- [ ] Existe `.env` en la raíz (copiado desde `.env.example`).
- [ ] Existe `backend/.env` con valores de backend.

### 2.2 Variables críticas

- [ ] `AUTH_STORE=distributed`
- [ ] `JWT_SECRET` definido
- [ ] `CASSANDRA_CONTACT_POINTS` y `CASSANDRA_DATACENTER` correctos
- [ ] `REDIS_NODES` con 3 nodos
- [ ] `NEO4J_URI`, `NEO4J_USER`/`NEO4J_USERNAME`, `NEO4J_PASSWORD`
- [ ] `MONGODB_URI`
- [ ] SMTP para recuperación de contraseña (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`)

## 3. Levantar infraestructura con Docker

Ejecutar en la raíz del proyecto:

```powershell
docker compose up -d
```

Validar estado:

```powershell
docker compose ps
```

## 4. Correr backend y frontend en modo desarrollo local

### 4.1 Backend

```powershell
cd backend
npm install
npm run dev
```


### 4.2 Frontend

```powershell
cd frontend
npm install
npm run dev
```