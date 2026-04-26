# Manual de uso — Profesor

Guía para validar las funciones del rol `teacher`.

## 1. Precondiciones

- [ ] El sistema está levantado (ver `docs/MANUAL-LEVANTAMIENTO.md`).
- [ ] La cuenta tiene rol `teacher` (o `admin`).
- [ ] Existen datos de prueba o se crearán durante el flujo.

## 2. Checklist de acceso

- [ ] Login exitoso.
- [ ] Menú muestra opciones de profesor (crear curso, consultas de curso, evaluaciones).
- [ ] No se muestra el menú Admin si no es `admin`.

## 3. Pruebas funcionales obligatorias

### 3.1 Crear curso

- [ ] Ir a "Crear curso".
- [ ] Crear curso con datos válidos.
- [ ] Validar que aparece en "Mis cursos".

Resultado esperado:

- [ ] Curso creado en Neo4j.
- [ ] Documento de contenido inicial creado en MongoDB.

### 3.2 Editar y publicar curso

- [ ] Editar nombre/descripcion/fechas.
- [ ] Publicar curso.
- [ ] Verificar que aparece en catálogo publicado.

### 3.3 Gestionar secciones y contenido

- [ ] Crear sección.
- [ ] Editar sección.
- [ ] Agregar contenido (`text`, `video`, `document`, `image`).

### 3.4 Evaluaciones

- [ ] Crear evaluación.
- [ ] Ver listado de evaluaciones del curso.
- [ ] Ver resultados agregados de evaluación.

### 3.5 Consultas del curso

- [ ] Abrir bandeja de consultas del curso.
- [ ] Ver mensajes `course_query` enviados por estudiantes.
- [ ] Responder al menos una consulta.

## 4. Pruebas de seguridad del rol

- [ ] Un usuario `student` no puede crear/editar/publicar cursos.
- [ ] Un usuario `student` no puede crear evaluación.
- [ ] Endpoint responde `403` en intentos no autorizados.

## 5. Evidencias sugeridas para entrega

- [ ] Captura de creación de curso.
- [ ] Captura de publicación.
- [ ] Captura de evaluación creada.
- [ ] Captura de consultas del curso.
- [ ] Evidencia de bloqueo 403 para rol incorrecto.

