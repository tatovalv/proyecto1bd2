# TEC Digitalito — Documentacion esencial para entrega universitaria

## 1. Informacion general

- **Curso:** Bases de Datos II  
- **Alumnos:** Luna Antonella Peraza, Luis Masis Perez, Juan Carlos Valverde
- **Profesor:** Erick Hernandez
- **Proyecto:** Proyecto 1 — Plataforma educativa "TEC Digitalito"  
- **Repositorio:** Proyecto local (`backend/` y `frontend/`)  

## 2. Resumen ejecutivo

TEC Digitalito es una plataforma academica que implementa autenticacion, gestion de cursos, evaluaciones, mensajeria y control de acceso por roles (`student`, `teacher`, `admin`).  
El sistema utiliza una arquitectura de datos poliglota para resolver necesidades diferentes de persistencia:

- **Cassandra:** autenticacion y bitacora de accesos.
- **Redis Cluster:** sesiones/tokens con expiracion y operaciones de alta velocidad.
- **Neo4j:** relaciones entre usuarios, cursos, matriculas, amistades y roles.
- **MongoDB:** documentos jerarquicos para contenido, evaluaciones y mensajes.

El resultado es una solucion funcional, modular y alineada con escenarios reales de sistemas distribuidos.

## 3. Objetivos del proyecto

### 3.1 Objetivo general

Diseñar e implementar una plataforma educativa que integre multiples motores de base de datos, aplicando criterios tecnicos de modelado, seguridad y rendimiento.

### 3.2 Objetivos especificos

- Implementar registro, inicio de sesion, bloqueo por intentos fallidos y recuperacion de contraseña.
- Gestionar cursos, secciones y evaluaciones con control por rol.
- Habilitar mensajeria entre usuarios y consultas de estudiante a docente.
- Implementar bitacora administrativa de actividad.
- Validar comportamiento end-to-end bajo un flujo de pruebas integral.

## 4. Alcance funcional implementado

### 4.1 Modulo de autenticacion

### 4.2 Modulo de cursos y contenido

### 4.3 Modulo de evaluaciones

### 4.4 Modulo social y mensajeria

### 4.5 Modulo administrativo

## 5. Arquitectura de la solucion

El sistema sigue una arquitectura cliente-servidor:

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Infraestructura local:** Docker Compose

### 5.1 Componentes principales

- `frontend/`: interfaz de usuario y navegacion por rol.
- `backend/`: API REST, logica de negocio y seguridad.
- `docker-compose.yml`: orquestacion de Cassandra, Redis y servicios de aplicacion.

## 6. Justificación de Bases de Datos

### 6.1 Cassandra: Base de datos NoSQL, de columnas. Distribuída

Apache Cassandra se seleccionó como una de las bases de datos principales valorando su capacidad de operar en entornos distribuidos con una alta disponibilidad y buena escalabilidad horizontal. Su arquitectura se basa en nodos, lo cual permite manejar grandes volúmenes de datos sin un único punto de falla, lo cual es bastante valioso para sistemas que requieran tolerancia a fallos.

En el contexto del proyecto Cassandra es adecuada para el almacenamiento de información con una alta frecuencia de escritura, como:
- registros de inicio de sesión
- intentos fallidos de autenticación
- actividad del usuario
- auditoría del sistema

Entendiendo que este tipo de datos no requiere relaciones complejas, pero sí un rendimiento considerable en escritura y disponibilidad, y justo estas son características en las que Cassandra destaca.

Además, su modelo distribuido permite que los datos se repliquen automáticamente entre los nodos creados, así se garantiza integridad y acceso incluso ante fallos parciales del sistema.

### 6.2 Redis: Base de datos NoSQL en memoria. Distribuída

Redis se seleccionó por su alto rendimiento al operar completamente en memoria, lo que permite tiempos de respuesta extremadamente bajos. Esto la  convierte en una solución ideal para el manejo de datos temporales o de acceso frecuente.

En el proyecto, Redis se puede aprovechar en aspectos como:
- gestión de sesiones de usuario
- almacenamiento de tokens de autenticación
- caché de datos recurrentes
- control de intentos de login

Este tipo de información requiere acceso rápido y no necesariamente persistencia a largo plazo, por lo que Redis es una elección bastante coherente.Adicionalmente, Redis fue configurada en modo cluster, lo que permite distribuir la carga entre múltiples nodos y cumplir con los requisitos de scalabilidad y disponibilidad establecidos en el proyecto.

Esta combinación de bases de datos locales permite diseñar un sistema eficiente, escalable y alineado con los diferentes patrones de uso de datos presentes en la aplicación. Además, ambas tecnologías fueron desplegadas en configuraciones distribuidas de múltiples nodos utilizando Docker, cumpliendo on los requisitos del proyecto y simulando un entorno de producción con alta disponibilidad.

### 6.3 Neo4j AuraDB: Base de datos de grafos en la nube

Neo4j AuraDB se seleccionó porque el dominio del proyecto está fuertemente basado en relaciones entre entidades, no solo en datos aislados. En la plataforma existen vínculos naturales entre usuarios, cursos, docentes, matrículas y relaciones sociales, los cuales se representan de forma mucho más  clara y eficiente en un modelo de grafos.

En el contexto del proyecto, Neo4j se utiliza para modelar y consultar:
- relación docente-curso 
- relación estudiante-curso 
- relaciones sociales entre usuarios 
- rol de cada usuario 

Este tipo de consultas sería más costoso y complejo de mantener en un modelo tabular tradicional, especialmente cuando se requieren recorridos por elaciones o filtros por contexto de usuario.

Además, al usarse como servicio cloud (AuraDB), se simplifica la administración de infraestructura, se obtiene conectividad segura por TLS y se facilita el despliegue multiusuario del proyecto académico sin depender del hardware local de cada equipo.

### 6.4 MongoDB Atlas: Base de datos documental en la nube

MongoDB Atlas se seleccionó por su flexibilidad para almacenar estructuras documentales y jerárquicas, adecuadas para contenido académico que cambia en forma y tamaño según el curso. A diferencia de modelos rígidos, el esquema documental permite iterar con rapidez sin rediseños constantes.

En el proyecto, MongoDB se utiliza para:
- estructura de contenido de cursos 
- evaluaciones y resultados
- mensajería entre usuarios

Estos componentes comparten una característica: requieren guardar objetos con estructura variable y, en muchos casos, recuperar el documento completo en una sola consulta para renderizar la interfaz de usuario. Adicionalmente, al operar en Atlas (cloud), se facilita la disponibilidad, respaldo y administración del servicio, manteniendo coherencia con una arquitectura distribuida y permitiendo pruebas del proyecto en distintas computadoras sin  espliegues manuales complejos de base de datos.

## 7. Instrucciones de ejecucion

1. Configurar `.env` y `backend/.env`.
2. Levantar servicios con `docker compose up -d`.
3. Ejecutar backend (`npm run dev` en `backend/`).
4. Ejecutar frontend (`npm run dev` en `frontend/`).

## 8. Conclusiones

El proyecto demuestra una implementacion realista de arquitectura poliglota para un dominio educativo, combinando autenticacion segura, control por roles y persistencia especializada por tipo de dato.  
La solucion cumple con los objetivos funcionales principales y ofrece una base solida para evolucion academica y tecnica.

