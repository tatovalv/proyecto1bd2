# Manual de uso — Administrador

Este documento describe el uso de la aplicacion desde la perspectiva del rol `admin`.

## 1. Inicio de sesion

1. Entrar a login.
2. Ingresar credenciales del usuario administrador.
3. Presionar **Entrar**.

Con sesion activa, el administrador tiene acceso a:

- `Panel`
- `Mis cursos`
- `Crear curso`
- `Catálogo`
- `Personas`
- `Mensajes`
- `Admin`
- `Contraseña`

## 2. Consulta de bitacora administrativa

La seccion **Admin** permite revisar actividad por usuario:

1. Abrir **Admin**.
2. En el campo de busqueda, ingresar:
   - UUID del usuario, o
   - username (ejemplo: `stickvalv6`).
3. Presionar **Consultar**.

Se mostraran eventos provenientes de Cassandra (`access_log`), por ejemplo:

- login exitoso
- intentos fallidos
- logout

## 3. Gestion de roles de usuario

La aplicacion opera con roles:

- `student`
- `teacher`
- `admin`

Actualmente la asignacion de roles administrativos se realiza por script operativo
desde `backend/`:

```powershell
node scripts/set-user-role.js <username> <student|teacher|admin>
```

Ejemplos:

```powershell
node scripts/set-user-role.js stickvalv6 teacher
node scripts/set-user-role.js stickvalv5 admin
```

Uso recomendado:

- Promover a `teacher` cuando un usuario deba gestionar cursos.
- Asignar `admin` solo a cuentas de confianza.
- Mantener un numero reducido de cuentas admin.

## 4. Operaciones generales disponibles

El administrador tambien puede utilizar funcionalidades de usuario/profesor:

- Crear y gestionar cursos.
- Gestionar evaluaciones.
- Usar mensajeria.
- Buscar personas y ver perfiles.

## 5. Buenas practicas de administracion

- Usar cuentas admin separadas de cuentas personales de uso diario.
- Cambiar contraseña de admin periodicamente.
- Revisar bitacora en busqueda de actividad inusual.
- Evitar asignar `admin` en registro publico; usar canal controlado (script).

## 6. Uso de IA

La IA se utilizo unicamente en procesos especificos, los cuales se detallan:

- Layout, colores y base grafica de la aplicacion.
- Resolucion de problemas de conexiones a bases de datos, a modo de consulta.
- Ayuda en la creacion del markup language en la documentacion.

En todos los casos se utilizo el IDE cursor, en su modo aggente para trabajar estos casos.

