# TaskFlow

[![CI/CD Pipeline](https://github.com/eliiimk/taskflow/actions/workflows/ci.yml/badge.svg)](https://github.com/eliiimk/taskflow/actions/workflows/ci.yml)

Application web de gestion de tâches. Interface Kanban avec backend Node.js et persistance Redis.

## Stack technique

| Couche   | Technologie              | Rôle                                   |
|----------|--------------------------|----------------------------------------|
| Frontend | HTML/CSS/JS vanilla      | Interface Kanban, servie par Nginx     |
| Backend  | Node.js (sans framework) | API REST — logique métier              |
| Stockage | Redis 7                  | Persistance des tâches et stats        |

## Structure du projet

```
taskflow/
├── frontend/
│   ├── index.html          ← interface Kanban
│   └── Dockerfile          ← Image frontend Nginx
├── backend/
│   ├── server.js           ← API REST
│   ├── server.test.js      ← tests unitaires
│   ├── package.json
│   └── Dockerfile          ← Image backend Node
├── k8s/                    ← Manifests Kubernetes
├── .env.example
├── docker-compose.yml
├── .dockerignore
└── README.md
```

## Lancer le projet en local (Production-Ready)

Plus besoin d'installer Node.js ou de configurer Redis manuellement. L'application complète (frontend, backend, Redis) démarre avec une seule commande :

```bash
# Copier le fichier d'environnement (si ce n'est pas fait)
cp .env.example .env

# Démarrer les 3 services
docker compose up --build -d
```

L'interface sera accessible sur : http://localhost
L'API répondra sur : http://localhost:3001
Redis tourne en arrière-plan sur son propre réseau interne.

Pour arrêter les services :
```bash
docker compose down
```

### 4. Vérifier que l'API répond

```bash
curl http://localhost:3001/health
# → { "status": "ok", "redis": "connected", ... }
```

## Tests et lint

```bash
cd backend
npm test        # tests unitaires — aucune connexion Redis requise
npm run lint    # vérification ESLint
```

## API

| Méthode | Route        | Body                                           | Description             |
|---------|--------------|------------------------------------------------|-------------------------|
| GET     | /health      | —                                              | État de l'app           |
| GET     | /tasks       | —                                              | Liste toutes les tâches |
| POST    | /tasks       | `{ title, description?, priority? }`           | Créer une tâche         |
| PUT     | /tasks/:id   | `{ title?, description?, status?, priority? }` | Modifier une tâche      |
| DELETE  | /tasks/:id   | —                                              | Supprimer une tâche     |

Valeurs `status` : `todo` · `in-progress` · `done`  
Valeurs `priority` : `low` · `medium` · `high`

## Variables d'environnement

| Variable      | Défaut                   | Description                   |
|---------------|--------------------------|-------------------------------|
| `PORT`        | `3001`                   | Port du backend               |
| `APP_ENV`     | `development`            | Environnement                 |
| `APP_VERSION` | `1.0.0`                  | Version affichée dans /health |
| `REDIS_URL`   | `redis://localhost:6379` | URL de connexion Redis        |

---

Ce projet est la base du projet final DevOps — Bachelor 3 Développement.  
Votre mission : le containeriser, automatiser sa livraison, et le déployer sur Kubernetes.
