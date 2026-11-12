# Yenko — Spécification V1

> *Yɛnkɔ* = « allons-y ! » en Twi. App pour les étudiants de l'University of Ghana (Legon) :
> partager un trajet (taxi / Bolt / Uber), trouver un groupe d'étude ou une activité.

Ce document est la référence unique du développement. Toute décision non listée ici est prise
par le développeur selon les conventions Laravel / Ionic, sans bloquer l'avancement.

---

## 1. Stack & structure

```
~/Bureau/Yenko/
├── SPEC.md          ← ce document
├── README.md        ← installation & lancement
├── backend/         ← Laravel 13 (API REST + panel admin Filament)
└── app/             ← Ionic 9 + Angular (standalone), Capacitor configuré, PWA
```

| Élément | Choix |
|---|---|
| Backend | Laravel 13, PHP 8.4 |
| Auth API | Laravel Sanctum (tokens Bearer) |
| Admin | Filament (dernière version stable compatible), chemin `/admin` |
| Base de données | SQLite (`database/database.sqlite`) — passage à PostgreSQL possible par `.env` |
| Tests | Pest (tests Feature sur toute l'API) |
| Emails | mailer `log` en dev ; SMTP (Brevo/Resend) configurable via `.env` |
| Push | Notifications stockées en base (cloche in-app) + service FCM prêt, inactif tant que `FIREBASE_CREDENTIALS` est vide |
| Frontend | Ionic 9 + Angular standalone, Capacitor configuré (Android ajouté plus tard), PWA |
| Langue | **Tout en anglais** (app, API, admin) |
| Fuseau / monnaie | `Africa/Accra` / GHS (₵) |
| Git | dépôt local unique à la racine, un commit par grande étape, aucun push |

---

## 2. Comptes & authentification

### Inscription
Champs : `student_id`, `name`, `email`, `password` (+ confirmation).
- `student_id` : chiffres uniquement, 8 à 10 caractères, **unique**.
- `email` : **doit se terminer par `@st.ug.edu.gh`** (domaine configurable : `YENKO_EMAIL_DOMAIN`), unique, stocké en minuscules.
- `password` : min. 8 caractères.
- À l'inscription : le compte est créé, un **token Sanctum** est renvoyé, un **code à 6 chiffres** est envoyé par email.

### Vérification email
- Code valable **15 min**, **5 tentatives** max, renvoi possible toutes les **60 s**.
- Succès → `email_verified_at` rempli, `is_verified = true`, `verification_method = email`.

### Plan B : carte étudiante
- L'utilisateur non vérifié envoie une photo de sa carte (jpg/png/webp, max 5 Mo).
- Une seule demande `pending` à la fois. L'admin approuve/refuse (avec motif) dans Filament.
- Approuvée → `is_verified = true`, `verification_method = card`. Notification envoyée.

### Connexion
- Identifiant = **email OU student_id** + mot de passe.
- Rate limit : 5 tentatives / minute.
- Déconnexion = révocation du token courant.

### Mot de passe oublié
- Code à 6 chiffres envoyé par email (mêmes règles que la vérification), puis nouveau mot de passe.

### Profil
`name`, `hall_id`, `whatsapp`, `gender` (male / female), `avatar` (jpg/png/webp, max 3 Mo), `bio` (optionnel, 160 car.).
- `whatsapp` : format ghanéen accepté `0XXXXXXXXX` ou `+233XXXXXXXXX` → **stocké en E.164 `+233XXXXXXXXX`**.
- **Profil complet** = `hall_id` + `whatsapp` + `gender` renseignés.
- Suppression de compte possible (soft delete + anonymisation).
- `student_id` et `email` ne sont **jamais** visibles par les autres utilisateurs.

### Droits
| Action | Condition |
|---|---|
| Parcourir les plans | connecté |
| Créer / rejoindre un plan | vérifié **et** profil complet **et** non suspendu |
| Plan « women only » (créer ou rejoindre) | en plus : `gender = female` |
| Panel admin | `is_admin = true` (créé via `php artisan yenko:admin`, domaine email libre) |

---

## 3. Plans

### Types
| Type | Champs spécifiques |
|---|---|
| `ride` (trajet) | `destination_id` **requis**, `price_per_person` optionnel (GHS), places 1–10 |
| `study` (étude) | `course` optionnel (ex. « UGBS 201 »), places 1–50 |
| `activity` | `category` : football, basketball, outing, party, gym, other — places 1–50 |

### Champs communs
`title` (3–80), `description` (optionnel, 500), `meeting_point` (requis, ex. « Akuafo Hall gate »),
`starts_at` (futur, max **30 jours**), `seats_total` (places pour les autres, créateur non compté),
`women_only` (bool), `auto_accept` (bool, défaut false),
`whatsapp_group_link` (optionnel, doit commencer par `https://chat.whatsapp.com/`),
`status`, `is_boosted` (géré par l'admin uniquement).

### Statuts
`open` → `full` (places atteintes) → `open` (si une place se libère)
`open|full` → `cancelled` (par le créateur ou l'admin) — notification à tous les membres
`open|full` → `done` (automatique 3 h après `starts_at`)

### Règles
- Max **5 plans actifs** (`open|full`) par utilisateur.
- Modification par le créateur : tous les champs sauf `type` ; `seats_total` ≥ nb d'acceptés ; seulement si `open|full`.
- Liste publique : uniquement `open` à venir, tri **`is_boosted` desc puis `starts_at` asc**, pagination 20.
- Filtres : `type`, `destination_id`, `date` (jour), `women_only`, `category`, recherche texte (`q` sur titre/lieu/cours).
- Les plans « women only » sont visibles par tous mais seules les femmes peuvent rejoindre.

---

## 4. Demandes pour rejoindre (`plan_requests`)

- Une demande par (plan, utilisateur) — contrainte unique ; après annulation/refus, on peut redemander (la ligne est réutilisée).
- Interdit : rejoindre son propre plan, un plan non `open`, un plan commencé.
- Message optionnel (200 car.).
- `auto_accept = true` → acceptée immédiatement s'il reste une place.
- Sinon `pending` → le créateur **accepte** ou **refuse**.
- Le créateur peut **retirer** un membre accepté (→ `removed`).
- Le demandeur peut **annuler** sa demande / quitter le plan (→ `cancelled`).
- Plan `done` ou `cancelled` → demandes `pending` passent en `expired`.
- Statuts : `pending`, `accepted`, `rejected`, `cancelled`, `removed`, `expired`.
- Max **10 demandes `pending`** simultanées par utilisateur.

### Visibilité des contacts (règle centrale)
| Qui regarde | Voit |
|---|---|
| Créateur | WhatsApp de chaque membre **accepté** |
| Membre accepté | WhatsApp du créateur + `whatsapp_group_link` + liste des autres membres (nom, hall, avatar — pas leur numéro) |
| Tous les autres | Nom, avatar, hall et badge du créateur, nb de places restantes. **Aucun numéro, aucun lien.** |

L'app ouvre WhatsApp via `https://wa.me/233XXXXXXXXX?text=...` (message pré-rempli : « Hi, I'm {name} from Yenko about "{plan title}" »).

---

## 5. Notifications

Stockées en base (table `notifications` de Laravel) + push FCM si configuré.

| Événement | Destinataire |
|---|---|
| Nouvelle demande | créateur |
| Demande acceptée / refusée / retiré du plan | demandeur |
| Membre a quitté le plan | créateur |
| Plan annulé | membres acceptés + demandes pending |
| Rappel 1 h avant le départ | créateur + acceptés |
| Carte étudiante approuvée / refusée | utilisateur |
| Compte suspendu | utilisateur |

App : badge non-lus, liste, marquer lu / tout lire. Rafraîchissement toutes les **60 s** quand l'app est au premier plan + à la reprise.

---

## 6. Signalements & modération

- Motifs : `wrong_number`, `harassment`, `no_show`, `scam`, `other` + détails (500).
- Un utilisateur ne peut signaler la même personne qu'une fois par motif ; pas d'auto-signalement.
- **3 signalements distincts `open`** sur une même personne → **suspension automatique** (en attente de revue admin).
- Suspendu : peut se connecter et parcourir, ne peut ni créer ni rejoindre ; ses plans actifs restent mais sont masqués de la liste publique.
- Admin : résout (`resolved` / `dismissed`), suspend / réactive manuellement.

---

## 7. Données

**users** — id, student_id (unique), name, email (unique), password, hall_id (nullable), whatsapp (nullable), gender (nullable), avatar_path, bio, is_verified, verification_method (nullable: email|card), email_verified_at, is_admin, is_suspended, suspended_at, suspension_reason, timestamps, soft deletes.

**verification_codes** — id, user_id, purpose (email_verification|password_reset), code_hash, attempts, expires_at, timestamps.

**card_verifications** — id, user_id, photo_path, status (pending|approved|rejected), rejection_reason, reviewed_by, reviewed_at, timestamps.

**halls** — id, name, is_active, sort_order. *(seed : Commonwealth, Legon, Akuafo, Mensah Sarbah, Volta, Elizabeth Frances Sey, Hilla Limann, Jean Nelson Aka, Alexander Kwapong, Jubilee, Pent, Bani, Off-campus / Other — modifiable dans l'admin)*

**destinations** — id, name, zone (campus|off_campus), is_active, sort_order. *(seed : Madina, Accra Mall, Kotoka Airport, Kwame Nkrumah Circle, Osu, East Legon, Shiashie, Achimota Mall, Kaneshie, Spintex, Tema, Atomic Junction, Okponglo, VIP Bus Station (Circle), STC Station ; campus : Main Gate, Night Market, Balme Library, Great Hall, UGBS, Sports Stadium — modifiable dans l'admin)*

**plans** — id, user_id, type, title, description, destination_id, course, category, meeting_point, starts_at, seats_total, price_per_person, women_only, auto_accept, whatsapp_group_link, status, is_boosted, reminder_sent_at, cancelled_at, timestamps. Index : (status, starts_at), type, destination_id.

**plan_requests** — id, plan_id, user_id, status, message, responded_at, timestamps. Unique (plan_id, user_id).

**reports** — id, reporter_id, reported_user_id, plan_id (nullable), reason, details, status (open|resolved|dismissed), resolved_by, resolved_at, timestamps.

**device_tokens** — id, user_id, token (unique), platform (android|ios|web), last_used_at, timestamps.

**notifications** — table standard Laravel.

---

## 8. API (préfixe `/api/v1`, JSON)

Erreurs : format Laravel standard (`message` + `errors`), codes 401/403/404/422/429.

**Public**
- `POST /auth/register` · `POST /auth/login` · `POST /auth/forgot-password` · `POST /auth/reset-password`
- `GET /halls` · `GET /destinations`

**Authentifié (Bearer)**
- `POST /auth/logout` · `POST /auth/verify-email` · `POST /auth/resend-code`
- `GET /me` · `PUT /me` · `POST /me/avatar` · `PUT /me/password` · `DELETE /me`
- `GET /me/card-verification` · `POST /me/card-verification`
- `GET /plans` · `POST /plans` · `GET /plans/{id}` · `PUT /plans/{id}` · `POST /plans/{id}/cancel`
- `GET /me/plans?scope=created|joined|past`
- `POST /plans/{id}/join` · `POST /plans/{id}/leave`
- `GET /plans/{id}/requests` (créateur) · `POST /requests/{id}/accept` · `POST /requests/{id}/reject` · `POST /requests/{id}/remove`
- `POST /reports`
- `GET /notifications` · `GET /notifications/unread-count` · `POST /notifications/{id}/read` · `POST /notifications/read-all`
- `POST /device-tokens` · `DELETE /device-tokens`

Rate limits : auth 5/min, API 60/min par utilisateur.
CORS : autorisé pour `http://localhost:8100` et origines configurables (`CORS_ALLOWED_ORIGINS`).

---

## 9. Tâches planifiées (`schedule:run` chaque minute)

- Toutes les 5 min : rappels 1 h avant `starts_at`.
- Toutes les 15 min : plans passés de 3 h → `done`, demandes pending → `expired`.
- Quotidien : purge des codes de vérification expirés.

---

## 10. Panel admin (Filament, `/admin`, en anglais)

- **Dashboard** : utilisateurs (total / vérifiés / suspendus), plans actifs par type, demandes des 7 derniers jours, cartes en attente, signalements ouverts.
- **Users** : liste, filtres, voir profil + plans + signalements, actions *verify*, *suspend / unsuspend*, *make admin*.
- **Card verifications** : photo en grand, *approve* / *reject (motif)*, filtre pending par défaut.
- **Plans** : liste, filtres type/statut, toggle *boost*, action *cancel*.
- **Plan requests** : lecture seule.
- **Reports** : *resolve*, *dismiss*, lien vers l'utilisateur signalé, action *suspend user*.
- **Halls** / **Destinations** : CRUD, activation, ordre.

---

## 11. App Ionic

**Navigation**
- Non connecté : *Welcome* → *Login* / *Register* → *Verify email* (ou *Upload student card*) → *Complete profile*.
- Connecté : onglets **Explore** · **My Plans** · **(+) Create** · **Notifications** · **Profile**.

**Écrans**
1. **Welcome** : logo, slogan « Yenko! Share your ride, find your squad. », boutons Login / Sign up.
2. **Register / Login / Forgot password / Reset password**.
3. **Verify email** : saisie du code 6 chiffres, renvoi (compte à rebours), lien « Use my student card instead ».
4. **Card verification** : photo (caméra ou galerie), statut de la demande.
5. **Complete profile** : hall, WhatsApp, genre, avatar.
6. **Explore** : segments All / Rides / Study / Activities, filtres (destination, date, women only), recherche, pull-to-refresh, scroll infini, cartes de plan (type, titre, destination/lieu, date, places restantes, prix, créateur + badge).
7. **Plan detail** : infos, créateur, places, bouton Join / Leave / statut de la demande ; si accepté : boutons *Chat on WhatsApp* et *Open WhatsApp group* ; si créateur : *Manage requests*, *Edit*, *Cancel* ; menu *Report*.
8. **Manage requests** : pending (accept / reject), acceptés (WhatsApp, remove).
9. **Create / Edit plan** : formulaire adapté au type.
10. **My Plans** : segments Created / Joined / Past.
11. **Notifications** : liste, non-lus, tout lire ; tap → plan concerné.
12. **Profile** : infos, badge, édition, changer mot de passe, logout, supprimer le compte, à propos / règles de sécurité.

**Technique**
- Angular standalone + signals, services `ApiService`, `AuthService` (token dans Capacitor Preferences), interceptor HTTP (token + gestion 401), guards (auth, verified, profile complete).
- `environment.apiUrl` (dev : `http://localhost:8000/api/v1`).
- Bannière visible si non vérifié / profil incomplet / suspendu.
- **DA : piste A « Kente Pop »** (maquette : https://claude.ai/artifact/PyyqMJFFeeFL9fzxxkM5ML) :
  - Couleurs : primaire or `#F5A623` (texte foncé dessus, jamais blanc), secondaire vert profond `#0B6E4F`,
    accent rouge kente `#C21F1F`, fond crème `#FFF9F0`, texte `#1F1A17`, texte secondaire `#5C4F46` / `#6B5E55`,
    bordures `#E9DCC8`. Mode sombre : fond `#1A1410`, surfaces `#2A211B`, texte `#FFF4E6`.
  - Couleur par type : ride = or (icône/étiquette `#8A5A00` sur fond `#FDEBC8`), study = bleu `#1D4ED8` sur `#DCE7FD`,
    activity = vert `#15803D` sur `#DCF5E3`.
  - Typo : titres **Bricolage Grotesque** 800, texte **DM Sans** 400/500/700, polices embarquées (`@fontsource`, pas de CDN).
  - Formes : rayons 14–22 px, boutons et chips en pilule, cartes blanches avec ombre plate `0 2px 0 #F0E2CC`,
    séparateur pointillé dans les cartes, en-tête vert avec bande kente (rayures or/noir/rouge/vert) en dessous.
  - Barre d'onglets : blanche, onglet actif or foncé, bouton (+) central or, surélevé, ombre verte.
  - Logo texte « yenko**!** » (le « ! » en or). Icônes Ionicons.
  - Ton : microcopy en anglais simple avec touches ghanéennes (« Akwaaba », « Where you dey go today? »,
    « Chale, no plans yet. Be the first — Yenko! », « Network dey play. Try again. »).
- PWA (manifest + service worker), Capacitor configuré (`com.yenko.app`), plateforme Android à ajouter quand le SDK sera installé.
- Données légères : images d'avatar redimensionnées côté serveur (256 px), pagination.

---

## 12. Hors V1 (plus tard)

Revente d'objets (prix + offres), notes après un trajet, paiements MoMo (boosts), cartes sponsorisées,
OTP SMS, géolocalisation, extension à d'autres campus, chat in-app.

---

## 13. Ordre de développement

1. **Backend** : installation Laravel + Sanctum + Filament → migrations/modèles/seeders → auth → profil & vérification → plans & demandes → notifications & FCM → signalements → scheduler → admin Filament → tests Pest verts.
2. **Frontend** : installation Ionic → thème & structure → auth & onboarding → Explore & détail → création/gestion → My Plans → notifications → profil → PWA/Capacitor → build OK.
3. **README** avec les commandes de lancement.

---

## 14. Décisions prises pendant le développement

- **Port de dev : 8010** (le 8000 est déjà utilisé sur la machine de dev).
- **Genre non modifiable** une fois renseigné (protège les plans « women only ») ; seul l'admin peut le changer.
- **Membre retiré** par l'organisateur : ne peut pas redemander à rejoindre ce plan (un refus simple le permet).
- **Plans « women only »** : à l'édition, impossible de les activer si un membre accepté n'est pas une femme.
- **Inscription** : le token est renvoyé dès l'inscription ; l'utilisateur non vérifié peut parcourir mais pas créer/rejoindre.
- **Carte étudiante en attente** : l'utilisateur peut finir son profil et parcourir en attendant la validation.
- **Photos de cartes** stockées en privé (disque `local`), servies à l'admin seulement via `/admin/card-photos/{id}`.
- **Avatars** recadrés 256 px en WebP ; photos de carte réduites à 1400 px de large.
- **Tests** : 53 tests Pest (API + admin) et 16 parcours Playwright de bout en bout (navigateur en français).
- **Responsive** : barre d'onglets sur mobile, grille de cartes dès 768 px, barre latérale dès 992 px.
- **Photos compressées dans l'app** avant envoi (avatar 600 px, carte 1600 px, JPEG).
- **Hors ligne** : bandeau, dernières réponses API gardées en cache local (vidé à la déconnexion), état « Try again ».
- **Partage d'un plan** : feuille de partage du système, sinon WhatsApp ; un lien partagé ouvert sans être connecté
  ramène sur le plan après connexion.
- **PWA** : message « nouvelle version » avec bouton Recharger.
- **Limites de requêtes** réglables (`YENKO_AUTH_PER_MINUTE`, `YENKO_API_PER_MINUTE`).
