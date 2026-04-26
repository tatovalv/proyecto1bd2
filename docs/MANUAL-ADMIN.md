# Manual de uso — Administrador

Guía para validar las funciones del rol `admin`.

## 1. Precondiciones

- [ ] Sistema levantado.
- [ ] Cuenta con rol `admin`.
- [ ] Existen usuarios y actividad de prueba.

## 2. Checklist de acceso

- [ ] Login exitoso como admin.
- [ ] Menú muestra acceso a "Admin".
- [ ] Puede entrar a `/admin/activity`.

## 3. Pruebas funcionales obligatorias

### 3.1 Bitácora de actividad

- [ ] Abrir pantalla de bitácora admin.
- [ ] Consultar por `userId` válido.
- [ ] Ver eventos de login/logout/fallos.

Resultado esperado:

- [ ] Datos provenientes de Cassandra `access_log`.
- [ ] Respuesta consistente con actividad reciente.

### 3.2 Gestión de roles (por script)

Desde `backend/`:

```powershell
node scripts/set-user-role.js <username> <student|teacher|admin>
```

Pruebas:

- [ ] Promover un usuario a `teacher`.
- [ ] Promover un usuario a `admin`.
- [ ] Degradar un usuario a `student`.
- [ ] Verificar cambios con login y menú.

### 3.3 Validación de seguridad

- [ ] Usuario no-admin recibe `403` en `/api/admin/activity-log`.
- [ ] Usuario admin sí recibe `200` con datos.

## 4. Pruebas de operación recomendadas

- [ ] Validar recuperación de contraseña para usuario con correo.
- [ ] Validar que roles persisten tras reinicio de backend.
- [ ] Validar que cambios de rol reflejan permisos en frontend.

## 5. Evidencias sugeridas

- [ ] Captura de bitácora en UI.
- [ ] Captura de comando de promoción de rol.
- [ ] Captura de 403 para usuario no-admin.

