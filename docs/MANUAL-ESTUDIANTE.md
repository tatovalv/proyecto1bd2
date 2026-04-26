# Manual de uso — Estudiante

Guía para validar las funciones del rol `student`.

## 1. Precondiciones

- [ ] Sistema levantado correctamente.
- [ ] Cuenta con rol `student`.
- [ ] Existe al menos un curso publicado.

## 2. Checklist de acceso

- [ ] Login exitoso.
- [ ] Menú muestra opciones de estudiante (catálogo, mis cursos, mensajes, personas).
- [ ] Menú no muestra opciones de Admin.
- [ ] Rutas de profesor/admin no accesibles.

## 3. Pruebas funcionales obligatorias

### 3.1 Ver catálogo y matricularse

- [ ] Entrar al catálogo de cursos publicados.
- [ ] Abrir detalle de un curso publicado.
- [ ] Matricularse exitosamente.
- [ ] Ver curso en "Mis cursos".

### 3.2 Navegar contenido

- [ ] Ver secciones del curso matriculado.
- [ ] Abrir contenido asociado en secciones.

### 3.3 Evaluaciones

- [ ] Abrir una evaluación del curso.
- [ ] Enviar respuestas.
- [ ] Ver resultado propio.

### 3.4 Consultas al docente

- [ ] Enviar mensaje de consulta de curso (`course_query`).
- [ ] Confirmar que aparece en bandeja de enviados.

### 3.5 Perfil y social

- [ ] Buscar usuarios.
- [ ] Enviar solicitud de amistad.
- [ ] Aceptar/rechazar solicitud en otra cuenta de prueba.
- [ ] Ver cursos de amigo (solo si son amigos).

### 3.6 Recuperación de contraseña

- [ ] Solicitar `forgot-password` con usuario que tenga correo.
- [ ] Completar `reset-password` con token válido.
- [ ] Iniciar sesión con la nueva contraseña.

## 4. Pruebas de seguridad del rol

- [ ] `student` no puede crear curso.
- [ ] `student` no puede publicar curso.
- [ ] `student` no puede crear evaluaciones.
- [ ] `student` no accede a `/admin/activity`.

## 5. Evidencias sugeridas

- [ ] Captura de matrícula.
- [ ] Captura de evaluación enviada y resultado.
- [ ] Captura de consulta enviada al docente.
- [ ] Captura de 403 en ruta de profesor/admin.

