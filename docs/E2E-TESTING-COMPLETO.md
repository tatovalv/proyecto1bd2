# End-to-End Testing completo — TEC Digitalito

Este documento cubre pruebas E2E funcionales, de roles y de integración entre servicios.

## 1. Objetivo

Validar que el sistema funciona de punta a punta:

- autenticación
- roles
- cursos y evaluaciones
- mensajería
- recuperación de contraseña
- bitácora admin
- integraciones Cassandra/Redis/Neo4j/MongoDB

## 2. Datos de prueba sugeridos

- Usuario A: `student`
- Usuario B: `teacher`
- Usuario C: `admin`

Checklist inicial:

- [ ] Los 3 usuarios existen.
- [ ] Cada uno tiene correo válido (al menos student y teacher para reset).
- [ ] Roles correctamente asignados.

## 3. Smoke test de infraestructura

- [ ] `docker compose ps` sin servicios críticos caídos.
- [ ] `GET /api/health` responde 200.
- [ ] Backend log muestra conexiones a Cassandra/Neo4j/Redis/Mongo.
- [ ] Frontend sin errores de proxy.

## 4. Suite E2E de autenticación

### 4.1 Registro

- [ ] Registrar usuario nuevo `student`.
- [ ] Registrar usuario nuevo `teacher` (desde selector de rol).
- [ ] Confirmar creación exitosa en UI.

### 4.2 Login

- [ ] Login correcto con credenciales válidas.
- [ ] Login falla con contraseña incorrecta (`401`).
- [ ] Bloqueo temporal tras 5 fallos (`423`).

### 4.3 Sesión

- [ ] `refresh` funciona con cookie remember (si aplica).
- [ ] Logout invalida sesión/token.

### 4.4 Recuperación de contraseña

- [ ] `forgot-password` para usuario con correo.
- [ ] Token de reset creado (logs/backend).
- [ ] `reset-password` con token válido.
- [ ] Login con nueva contraseña exitoso.

## 5. Suite E2E por rol

## 5.1 Estudiante

- [ ] Puede ver catálogo publicado.
- [ ] Puede matricularse.
- [ ] Puede enviar evaluación.
- [ ] Puede enviar consulta al docente.
- [ ] No puede crear/editar/publicar curso (`403`).
- [ ] No puede crear evaluación (`403`).
- [ ] No puede abrir admin (`403` o redirección).

## 5.2 Profesor

- [ ] Puede crear curso.
- [ ] Puede editar y publicar curso.
- [ ] Puede crear secciones y contenido.
- [ ] Puede crear evaluaciones.
- [ ] Puede ver resultados de evaluaciones.
- [ ] Puede revisar consultas de curso.
- [ ] No puede acceder a bitácora admin si no es admin.

## 5.3 Admin

- [ ] Puede acceder a bitácora admin.
- [ ] Puede consultar actividad de usuario por `userId`.
- [ ] Puede reasignar roles usando script y validar efecto.

## 6. Suite E2E de mensajería/social

- [ ] Mensaje directo user->user.
- [ ] Reply a mensaje existente.
- [ ] Bandeja inbox/sent consistente.
- [ ] Solicitud de amistad enviar/aceptar/rechazar.
- [ ] Ver cursos de amigo solo cuando hay amistad.

## 7. Validaciones de base de datos (integración)

### Cassandra

- [ ] `users_auth` contiene usuarios registrados.
- [ ] `access_log` registra eventos de login/logout/fallos.

### Redis

- [ ] Tokens `jwt:<jti>` creados y con TTL.
- [ ] Tokens de reset existen cuando aplica.

### Neo4j

- [ ] Nodos `User` con `role` correcto.
- [ ] Relación `TEACHES` al crear curso.
- [ ] Relación `ENROLLED_IN` al matricularse.

### MongoDB

- [ ] Documento de contenido de curso existe.
- [ ] Evaluaciones y resultados se guardan.
- [ ] Mensajes creados y consultables.

## 8. Criterio de aprobación E2E

Se considera aprobado cuando:

- [ ] Todas las pruebas de secciones 3, 4 y 5 pasan.
- [ ] No hay errores críticos en logs.
- [ ] Permisos por rol se cumplen sin bypass.
- [ ] Recuperación de contraseña funciona de extremo a extremo.

## 9. Registro de resultados

Para cada corrida E2E documentar:

- Fecha/hora:
- Commit/branch:
- Ambiente:
- Resultado global: `PASS` / `FAIL`
- Fallos detectados:
- Evidencias (capturas, logs, request/response):

