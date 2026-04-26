#!/bin/sh
# Copia lógica del bloque `redis-cluster-init` en docker-compose.yml (command: |).
# No uses "\" al final de línea: con CRLF de Windows, ash falla con exit 2.
# Preferible: `docker compose up` (el init va en el YAML, no montar este archivo).
set -u

echo "redis-cluster-init: esperando PING en los tres nodos..."
i=0
while [ "$i" -lt 60 ]; do
  ok=0
  if redis-cli -h redis-node1 -p 7000 PING 2>/dev/null | grep -q PONG; then
    if redis-cli -h redis-node2 -p 7000 PING 2>/dev/null | grep -q PONG; then
      if redis-cli -h redis-node3 -p 7000 PING 2>/dev/null | grep -q PONG; then
        ok=1
      fi
    fi
  fi
  if [ "$ok" -eq 1 ]; then break; fi
  i=$((i + 1))
  sleep 1
done

if ! redis-cli -h redis-node1 -p 7000 PING 2>/dev/null | grep -q PONG; then
  echo "redis-cluster-init: error — redis-node1 no respondió a tiempo." >&2
  exit 1
fi

if redis-cli -h redis-node1 -p 7000 CLUSTER INFO 2>/dev/null | grep -q "cluster_state:ok"; then
  echo "redis-cluster-init: cluster ya operativo (cluster_state:ok)."
  exit 0
fi

echo "redis-cluster-init: creando cluster..."
set +e
out=$(echo yes | redis-cli --cluster create redis-node1:7000 redis-node2:7000 redis-node3:7000 --cluster-replicas 0 2>&1)
rc=$?
echo "$out"

if redis-cli -h redis-node1 -p 7000 CLUSTER INFO 2>/dev/null | grep -q "cluster_state:ok"; then
  echo "redis-cluster-init: listo (cluster_state:ok)."
  exit 0
fi

if [ "$rc" -ne 0 ]; then
  echo "redis-cluster-init: redis-cli terminó con código $rc" >&2
else
  echo "redis-cluster-init: create no dejó cluster en estado ok." >&2
fi
redis-cli -h redis-node1 -p 7000 CLUSTER INFO 2>&1 >&2 || true
redis-cli -h redis-node1 -p 7000 CLUSTER NODES 2>&1 >&2 || true
exit 1
