#!/usr/bin/env sh
# Inicializa el cluster Redis la primera vez (3 masters, 0 réplicas).
# Requisitos: los tres contenedores redis-node* en marcha y accesibles por nombre
# (por ejemplo: docker compose up -d redis-node1 redis-node2 redis-node3).
#
# Desde el host con puertos mapeados (7000,7001,7002):
#   redis-cli --cluster create 127.0.0.1:7000 127.0.0.1:7001 127.0.0.1:7002 --cluster-replicas 0
#
# Con Docker Compose el cluster se crea solo al subir el stack (servicio redis-cluster-init).
# Este script sirve si inicializas Redis solo con compose parcial o desde el host.

set -e
echo "Si usas el compose completo del proyecto: basta con docker compose up (redis-cluster-init corre solo)."
echo yes | redis-cli --cluster create \
  "${REDIS_CLUSTER_HOST1:-127.0.0.1}:${REDIS_CLUSTER_PORT1:-7000}" \
  "${REDIS_CLUSTER_HOST2:-127.0.0.1}:${REDIS_CLUSTER_PORT2:-7001}" \
  "${REDIS_CLUSTER_HOST3:-127.0.0.1}:${REDIS_CLUSTER_PORT3:-7002}" \
  --cluster-replicas 0
