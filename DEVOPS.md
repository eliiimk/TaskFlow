# Documentation DevOps - TaskFlow

## 1. Choix Techniques

### Choix 1 : Images de Base (Node 18 Alpine & Nginx Alpine)
**Option évaluée :** Utiliser les images standard `node:18` (basées sur Debian) ou `ubuntu`.
**Justification :** L'utilisation de versions `alpine` permet de réduire drastiquement la surface d'attaque et la taille de l'image finale. Un build multi-stage a été implémenté pour le backend, garantissant que seul l'essentiel (fichiers compilés et `node_modules` de production) se retrouve dans l'image finale. Pour garantir l'exigence d'une taille < 150MB, nous avons basculé l'image finale sur un `alpine` natif avec l'installation manuelle de Node.js via `apk`, nous permettant d'obtenir une image backend de seulement **115 MB**. L'application tourne avec un utilisateur non-root (`node`).

### Choix 2 : Déploiement et Stratégie (RollingUpdate et HPA)
**Option évaluée :** Stratégie Recreate classique ou NodePort.
**Justification :** Pour assurer l'exigence "production-ready" sans interruption (zéro downtime), la stratégie `RollingUpdate` (avec `maxUnavailable: 1` et `maxSurge: 1`) a été privilégiée pour Kubernetes. De plus, pour gérer la variabilité de la charge sur l'environnement de production de façon réactive, nous avons intégré un HorizontalPodAutoscaler (HPA), configuré pour osciller entre 2 et 6 réplicas si l'utilisation CPU du backend excède 50%.

### Choix 3 : Sécurisation Réseau Interne (NetworkPolicy)
**Option évaluée :** Laisser la communication ouverte sur l'ensemble du namespace entre tous les Pods.
**Justification :** Une ressource de type `NetworkPolicy` a été mise en place afin de restreindre l'accès au service Redis. Ce dernier ne peut être requêté **que par le pod backend** sur le port 6379, ce qui limite les risques d'exposition de données en cas de compromission du composant frontend ou d'une mauvaise configuration Ingress.

### Choix 4 : Sécurité du CI/CD et Build Multi-Arch
**Option évaluée :** Build de conteneur simple par l'agent CI et tests classiques.
**Justification :** L'intégration continue a été durcie avec l'ajout de **Trivy** pour scanner les CVEs bloquantes avant la publication. Par ailleurs, nous utilisons `docker buildx` avec une stratégie multi-plateforme (`linux/amd64`, `linux/arm64`). L'intérêt est que l'image est compatible nativement avec les puces ARM (comme les puces M1/M2) des développeurs tout en pouvant tourner sur des nœuds serveurs cloud standards en x86.

## 2. Scan de Sécurité Trivy

**Ce que Trivy a trouvé :**
Lors du scan de l'image de build local avec l'outil Trivy via GitHub Actions, il se peut que certaines vulnérabilités système dans la base Alpine ou certaines dépendances obsolètes issues du package `redis` ou `dotenv` de Node.js remontent.

**Comment cela a été géré :**
1. Nous ciblons strictement les vulnérabilités système (`os`) et applicatives (`library`) avec une sévérité **CRITICAL**. Le pipeline est configuré pour se bloquer si de telles failles sont trouvées et non corrigées.
2. Un job en amont `npm audit --audit-level=high` empêche même la construction de l'image si les modules npm comportent des CVEs importantes.
3. Le paramètre `ignore-unfixed: true` a été appliqué, afin de ne pas bloquer le pipeline sur des vulnérabilités qui n'ont pas encore de correctif fourni par les éditeurs officiels d'Alpine, ce qui est la norme de l'industrie pour les pipelines de livraison continue.

## 3. Difficulté Rencontrée

**La difficulté :** 
Lors de la configuration du pipeline GitHub Actions pour le "smoke-test", attendre que l'environnement Staging soit prêt pour tester l'API (`GET /health`) posait un problème de synchronicité. Le job tentait de contacter l'application via cURL avant même que le `RollingUpdate` ne soit réellement terminé ou que le container passe à l'état *Ready*, causant des faux négatifs dans la CI.

**La résolution :**
Nous avons ajouté l'étape `kubectl rollout status deployment/backend -n staging --timeout=120s`. Cette commande native Kubernetes suspend le processus GitHub Actions jusqu'à ce que tous les Pods soient certifiés `Ready` selon les critères exigeants de la `readinessProbe` du backend. Ce n'est qu'après ce feu vert que nous établissons un tunnel (`kubectl port-forward svc/backend`) pour valider que le code HTTP de `/health` est bien un succès `200 ok`.

## 4. Bonus Réalisés

### Bonus A — Route `/stats` (+2 pts)
**Ce qui a été implémenté :**
Une nouvelle route `GET /stats` a été ajoutée dans le backend (`server.js`). Elle agrège les données en temps réel depuis Redis et retourne un objet JSON contenant :
- `total` : le nombre total de tâches
- `byStatus` : la répartition par statut (`todo`, `in-progress`, `done`)
- `completionRate` : le taux de complétion en pourcentage, calculé comme `(done / total) * 100`

Le frontend (`app.js`) appelle cette route via la fonction `fetchStats()` déclenchée après chaque modification. Le résultat est affiché en temps réel dans le tableau de bord via un 5ème bloc de statistiques "📈 Complétion".

**Justification :** Cette route est séparée de `/tasks` intentionnellement, selon le principe de séparation des responsabilités. Elle peut être appelée indépendamment et mise en cache si nécessaire, sans devoir charger l'ensemble des tâches.

---

### Bonus C — Monitoring avec `kubectl top` (+2 pts)
**Ce qui a été implémenté :**
Le **Metrics Server** de Kubernetes a été activé via `minikube addons enable metrics-server`. Ce composant collecte les métriques CPU et mémoire de chaque Pod à intervalles réguliers (toutes les 15 secondes).

La commande `kubectl top pods -n production` retourne en temps réel la consommation de chaque Pod. Exemple de résultat obtenu lors des tests :

```
NAME                        CPU(cores)   MEMORY(bytes)
backend-585d5bf886-4plvk    1m           31Mi
frontend-7dd69cfcd5-czbr9   1m           8Mi
redis-c46d5dffc-x8ckm       8m           9Mi
```

**Justification :** Le Metrics Server est également une dépendance fonctionnelle du `HorizontalPodAutoscaler` (HPA) configuré en production. Sans lui, le HPA ne peut pas lire l'utilisation CPU des Pods et ne sait donc pas quand scaler. Son activation est donc doublement justifiée : pour l'observabilité et pour le bon fonctionnement de l'autoscaling.

---

### Bonus D — Ingress nginx avec routing complet (+1 pt)
**Ce qui a été implémenté :**
L'Ingress Controller nginx de Minikube a été activé (`minikube addons enable ingress`). Le fichier `k8s/production/5-network.yaml` configure deux règles de routage sur le domaine `taskflow.local` :
- `/ → Service frontend (port 80)` : sert l'interface web statique via Nginx
- `/api → Service backend (port 3001)` : route les appels API vers le serveur Node.js

**Justification :** L'Ingress remplace avantageusement le `NodePort` ou le `kubectl port-forward` utilisés en développement. En production, c'est le standard pour exposer plusieurs services derrière une seule adresse IP, avec la possibilité d'ajouter du TLS/HTTPS, du rate-limiting ou de l'authentification au niveau de l'Ingress Controller sans toucher au code applicatif.
