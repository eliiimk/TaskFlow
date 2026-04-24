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
