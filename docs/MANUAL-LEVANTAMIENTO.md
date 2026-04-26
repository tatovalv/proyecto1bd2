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

Checklist:

- [ ] `cassandra-node1/2/3` en estado healthy/up.
- [ ] `redis-node1/2/3` levantados.
- [ ] `redis-cluster-init` completó sin error.
- [ ] `tec-backend` y `tec-frontend` levantados (si corres stack completo por Docker).

## 4. Correr backend y frontend en modo desarrollo local

### 4.1 Backend

```powershell
cd backend
npm install
npm run dev
```

Checklist backend:

- [ ] Log `Cassandra listo`.
- [ ] Log `Neo4j listo`.
- [ ] Log `Redis listo`.
- [ ] Log `MongoDB conectado`.
- [ ] Log `TEC Digitalito API -> http://localhost:<puerto>`.

### 4.2 Frontend

```powershell
cd frontend
npm install
npm run dev
```

Checklist frontend:

- [ ] Vite levanta en `http://localhost:5173`.
- [ ] Sin errores de proxy (`ECONNRESET`/`ECONNREFUSED`).

## 5. Pruebas mínimas de funcionamiento

- [ ] `GET /api/health` responde 200.
- [ ] Registro de usuario exitoso.
- [ ] Login exitoso y acceso al dashboard.
- [ ] Logout exitoso.
- [ ] Recuperación de contraseña responde mensaje genérico sin romper frontend.

Prueba rápida health:

```powershell
curl http://localhost:3000/api/health
```

## 6. Solución de problemas comunes

### 6.1 Puerto ocupado

Síntoma: backend cambia de `3000` a `3005`.

- [ ] Cerrar procesos Node duplicados.
- [ ] Dejar solo un `npm run dev` del backend.

### 6.2 Redis cluster no converge

- [ ] Revisar logs: `docker compose logs redis-cluster-init --tail=200`.
- [ ] Confirmar `cluster_state:ok`.

### 6.3 Frontend no conecta backend

- [ ] Confirmar puerto real del backend en consola.
- [ ] Revisar `frontend/vite.config.js` y `VITE_API_URL` si aplica.

