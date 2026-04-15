# TaskFlow

Application web de gestion de tâches collaborative.
Interface Kanban avec backend Node.js et persistance Redis.

---

## Stack technique

- **Frontend** — HTML/CSS/JS vanilla, servi par Nginx
- **Backend** — Node.js (sans framework), API REST
- **Stockage** — Redis

## Structure du projet

```
taskflow/
├── frontend/
│   ├── index.html       ← interface Kanban
│   ├── nginx.conf       ← configuration Nginx
│   └── Dockerfile
├── backend/
│   ├── server.js        ← API REST
│   ├── server.test.js   ← tests unitaires
│   ├── package.json
│   └── .eslintrc.json
└── README.md
```

---

## Lancer le projet

### Prérequis

- [Node.js 18+](https://nodejs.org)
- [Docker Desktop](https://www.docker.com/products/docker-desktop) démarré

### 1. Cloner le projet

```bash
git clone https://github.com/[FORMATEUR]/taskflow.git
cd taskflow
```

### 2. Créer le fichier de configuration

Créer un fichier `.env` à la racine du projet :

```
APP_ENV=development
APP_VERSION=1.0.0
```

### 3. Lancer la stack

```bash
docker compose up --build
```

### 4. Vérifier que tout tourne

```bash
curl http://localhost:3001/health
# → { "status": "ok", "redis": "connected", ... }
```

### 5. Ouvrir l'application

- **Frontend** → [http://localhost:8080](http://localhost:8080)
- **API** → [http://localhost:3001](http://localhost:3001)

### Arrêter

```bash
docker compose down
```

---

## Tests et lint

```bash
cd backend
npm install
npm test        # tests unitaires
npm run lint    # vérification ESLint
```

---

## API Backend

| Méthode | Route | Body | Description |
|---|---|---|---|
| GET | `/health` | — | État de l'app et stats Redis |
| GET | `/tasks` | — | Liste toutes les tâches |
| POST | `/tasks` | `{ title, description?, priority? }` | Créer une tâche |
| PUT | `/tasks/:id` | `{ title?, description?, status?, priority? }` | Modifier une tâche |
| DELETE | `/tasks/:id` | — | Supprimer une tâche |

**Valeurs `status` :** `todo` · `in-progress` · `done`
**Valeurs `priority` :** `low` · `medium` · `high`

---

## Variables d'environnement

| Variable | Défaut | Description |
|---|---|---|
| `PORT` | `3001` | Port du backend |
| `APP_ENV` | `development` | Environnement |
| `APP_VERSION` | `1.0.0` | Version affichée dans `/health` |
| `REDIS_URL` | `redis://localhost:6379` | URL de connexion Redis |

---

*Ce projet est la base du projet final DevOps — Bachelor 3 Développement.*
