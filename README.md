# 🚐 TaxiBrousse.mg — Site de Réservation National

Site web moderne de réservation de taxi-brousse, de course de stationnement
et d'envoi de colis à Madagascar. Stack : **Python (FastAPI)** + **React (Vite)**.

## Fonctionnalités

- **Accueil** : Hero avec carte SVG animée de Madagascar, widget de recherche à onglets (trajet interurbain / station → domicile), bandeau de confiance (GPS, véhicules sécurisés, WiFi, entretien), services
- **Taxi Brousse** : Sélection du trajet, date/heure, infos passager, résumé → confirmation avec code unique
- **Taxi Station → Domicile** *(nouveau)* : Choix d'un stationnement, adresse de destination, distance estimée, tarif calculé automatiquement → confirmation avec code `NV-XXXXXXXX`
- **Envoi de Colis** : Formulaire expéditeur/destinataire, poids, tarification automatique
- **Suivi** : Recherche par code (`TB-XXXXXXXX`, `NV-XXXXXXXX` ou `CP-XXXXXXXX`), timeline de progression
- **Admin** : Dashboard stats, tableaux des réservations taxi / courses station / colis, mise à jour des statuts colis

## Structure
```
taxibrousse/
├── backend/
│   ├── main.py             # FastAPI + SQLite (villes, trajets, stationnements, réservations, colis)
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx               # Routeur principal (état)
        ├── index.css             # Design system complet
        ├── components/
        │   ├── Header.jsx
        │   └── Footer.jsx
        └── pages/
            ├── Home.jsx          # Accueil + recherche trajets/stations
            ├── BookTaxi.jsx      # Réservation taxi brousse
            ├── BookNavette.jsx   # Réservation taxi stationnement → domicile
            ├── BookColis.jsx     # Envoi de colis
            ├── Confirmation.jsx  # Page de confirmation
            ├── Tracking.jsx      # Suivi par code
            └── Admin.jsx         # Dashboard admin
```

## Lancer le backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
La base SQLite `taxibrousse.db` est créée et peuplée (15 villes, 20 trajets, 12 stationnements) au premier lancement.

## Lancer le frontend
```bash
cd frontend
npm install
npm run dev
```
Ouvrir http://localhost:5175

## API Endpoints
| Méthode | URL | Description |
|---------|-----|-------------|
| GET | /api/villes | Liste des villes |
| GET | /api/trajets?depart=&arrivee= | Recherche trajets |
| GET | /api/stationnements?ville= | Liste des stationnements |
| GET | /api/stationnements/villes | Villes disposant d'un stationnement |
| POST | /api/reservations/taxi | Nouvelle réservation taxi |
| POST | /api/reservations/navette | Nouvelle course stationnement → domicile |
| POST | /api/reservations/colis | Nouvel envoi colis |
| GET | /api/suivi/{code} | Suivi par code (TB- / NV- / CP-) |
| GET | /api/admin/reservations/taxi | Admin : tous les taxis |
| GET | /api/admin/reservations/navette | Admin : toutes les courses station |
| GET | /api/admin/reservations/colis | Admin : tous les colis |
| PATCH | /api/admin/reservations/colis/{code}/statut | Mise à jour statut colis |
| GET | /api/stats | Statistiques globales |

## Tarification colis
Base fixe 5 000 Ar + 2 000 Ar/kg arrondi au kg supérieur.

## Tarification course station → domicile
Prise en charge fixe 4 000 Ar + 1 200 Ar/km + 1 000 Ar par passager supplémentaire, arrondi à la centaine d'Ariary supérieure.

## Codes de réservation
- Taxi brousse : format `TB-XXXXXXXX` (ex: `TB-A3F92B1C`)
- Course station → domicile : format `NV-XXXXXXXX` (ex: `NV-7C21D9E4`)
- Colis : format `CP-XXXXXXXX` (ex: `CP-9D12E4F7`)

<!-- 
Eny, hazavaiko aminao tsikelikely ny syntaxe React fototra, mampiasa ny code-nao mihitsy ho ohatra, mba ho azonao mora foana.

## 1) Ny fototra: Component = fonction izay mamerina HTML

Ao amin'ny React, ny "component" dia **fonction JavaScript tsotra** izay mamerina (`return`) zavatra toy ny HTML. Ohatra ao amin'ny `Confirmation.jsx`:

```jsx
export default function Confirmation({ data, setPage }) {
  return (
    <div>
      <h1>Réservation acceptée</h1>
    </div>
  );
}
```

- `export default function Confirmation(...)` → mamorona fonction antsoina hoe `Confirmation`, ary `export default` dia manome alalana ny fichier hafa (ohatra `App.jsx`) hampiasa azy io amin'ny `import Confirmation from "./Confirmation"`.
- Izay ao anaty `return ( ... )` dia tsy HTML marina fa **JSX** — endrika manahaka HTML nefa raha ny marina dia JavaScript ihany.

## 2) JSX: fifangaroan'ny HTML sy JavaScript

Ny JSX dia mamela anao hametraka HTML sy JavaScript ao anaty fichier iray. Ny fanavahana azy dia amin'ny **antsoina hoe `{ }`**: raha misy `{ }`, dia JavaScript izay ao anatiny, tsy HTML intsony.

Ohatra ao amin'ny `Home.jsx`:

```jsx
<h1>
  Reservation Taxi et Transpor de colis<br />
  partout à <span>Madagascar</span>
</h1>
```

Fa raha misy variable tianao haseho, dia atao toy izao (ao amin'ny `Confirmation.jsx`):

```jsx
<div className="code-display">
  {data.code}
</div>
```

`{data.code}` dia midika hoe: "asehoy eto ny valin'ny variable `data.code`".

⚠️ Fanamarihana: ao amin'ny JSX, tsy `class` no ampiasaina fa **`className`** (satria `class` dia teny voatokana ao amin'ny JavaScript).

## 3) Props: ny fomba ampitana angona avy amin'ny "ray aman-dreny" mankany amin'ny "zanaka" component

Raha jerena ao amin'ny `Admin.jsx`:

```jsx
export default function Admin({ setPage }) {
```

Ilay `{ setPage }` eo anatin'ny parenthèse dia antsoina hoe **props** — angona alefan'ny component hafa mankany amin'io component io. Ohatra, ao amin'ny `App.jsx` (izay tsy hitanay eto fa mety hisy) dia mety hisy toy izao:

```jsx
<Admin setPage={setPage} />
```

Izany hoe: "mandefa ny variable `setPage` ho props any amin'ny `Admin`".

Ao amin'ny `StatCard`, ao amin'ny `Admin.jsx`, dia mahita props maromaro miaraka:

```jsx
function StatCard({ icon, label, value, sub, color }) {
  return (
    <p>{label}</p>
    <p>{value}</p>
  );
}
```

Ary ampiasaina toy izao:

```jsx
<StatCard icon="" label="Réservations taxi" value={stats.reservations_taxi} />
```

Ny `label="Réservations taxi"` dia string mivantana, fa ny `value={stats.reservations_taxi}` dia JavaScript expression (satria misy `{ }`).

## 4) `useState`: fitehirizana angona miova ao anaty component

Ity no antsoina hoe **"state"** — variable izay rehefa miova dia mahatonga ny component hiverina haseho (re-render) automatika.

Ohatra ao amin'ny `Tracking.jsx`:

```jsx
const [code, setCode] = useState("");
```

- `code` → ny sokajy (valeur) ankehitriny
- `setCode` → ny fonction ampiasaina hanova an'i `code`
- `useState("")` → manomboka amin'ny valiny tsy misy na inona na inona (`""`, string foana)

Rehefa manoratra ao anaty `<input>` ianao:

```jsx
<input
  value={code}
  onChange={e => setCode(e.target.value)}
/>
```

- `value={code}` → ny sokajy aseho ao anaty input dia avy amin'ny state `code`
- `onChange={e => setCode(e.target.value)}` → isaky ny misy manoratra ao anaty input, dia miantso ny `setCode` mba hanova ny state amin'ny lahatsoratra vaovao (`e.target.value`)

Ity no "cycle" fototra amin'ny React: **State miova → component miverina haseho → aseho ny valiny vaovao.**

## 5) Fikambanan'ny state maromaro amin'ny objet iray (toy ny form)

Ao amin'ny `BookColis.jsx`:

```jsx
const [form, setForm] = useState({
  ville_depart: "", ville_arrivee: "",
  expediteur_nom: "", expediteur_tel: "",
  ...
});
```

Eto, `form` dia objet iray misy field maro. Rehefa misy input miova:

```jsx
const change = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
```

Sombisombiko izao:
- `e => setForm(...)` → arrow function mandray ny event `e`
- `p => ({ ...p, [e.target.name]: e.target.value })` → arrow function hafa, mandray ny state teo aloha (`p`), dia mamorona objet vaovao
- `...p` → **spread operator**: adikao daholo ny angona rehetra tao amin'ny `p` teo aloha
- `[e.target.name]: e.target.value` → manova ny field iray manokana (izay anarany dia ao amin'ny `e.target.name`, ohatra "expediteur_nom") amin'ny valiny vaovao

Izany dia mahatonga ny `<input name="expediteur_nom" onChange={change} />` tokana ihany no mahavita manova field maro samihafa, satria ny `name="..."` no mamaritra hoe field inona no ovaina.

## 6) `useEffect`: manao zavatra rehefa vao "mipoitra" ny component

Ao amin'ny `Home.jsx`:

```jsx
useEffect(() => { chargerTrajets(); }, []);
```

- Ny fonction voalohany `() => { chargerTrajets(); }` dia izay tianao hatao
- Ny `[]` (tabilao foana) faharoa dia midika hoe: **"ataovy indray mandeha ihany, rehefa vao miseho voalohany ilay component"** (mitovy amin'ny `useEffect` ao amin'ny `Admin.jsx` sy `Tracking.jsx` koa)

Raha misy zavatra ao anaty `[]`, ohatra `[trajet_id]`, dia hiverina hatao ny fonction isaky ny miova ny `trajet_id`.

## 7) Fiantsoana ny API (fetch + async/await)

Ao amin'ny `Home.jsx`:

```jsx
const chargerTrajets = async (dep = "", arr = "") => {
  setLoading(true);
  try {
    const r = await fetch(`${API}/api/trajets?${params}`);
    setTrajets(await r.json());
  } catch { setTrajets([]); }
  setLoading(false);
};
```

- `async (...)` → mampahafantatra fa ity fonction ity dia hiandry ("await") zavatra
- `await fetch(...)` → mandefa "requête" any amin'ny backend (FastAPI), ary miandry ny valiny
- `await r.json()` → manova ny valiny (izay format JSON) ho objet JavaScript azo ampiasaina
- `try { ... } catch { ... }` → raha misy erreur (ohatra tsy misy internet, na tsy mandeha ny backend), dia tsy hikorontana ilay app fa hankany amin'ny `catch`

`${API}` ao anaty `` ` ` `` (backtick) dia antsoina hoe **template literal** — fomba hampidirana variable ao anaty string, tsy mila `+` intsony.

## 8) Fampiharana ny event (onClick, onSubmit)

Ao amin'ny `BookColis.jsx`:

```jsx
const submit = async e => {
  e.preventDefault();
  ...
};

<form onSubmit={submit}>
```

- `onSubmit={submit}` → rehefa manindry "submit" (ohatra bokotra "Confirmer") ianao, dia miantso ny fonction `submit`
- `e.preventDefault()` → misakana ny fihetsika mahazatry ny form (izay hanova pejy amin'ny HTML tsotra); ampiasaina isaky ny React mba hitantanan'ny JavaScript ny fandefasana

Ao amin'ny `Admin.jsx`:

```jsx
<button onClick={() => { load(); }}>↺ Actualiser</button>
```

`onClick={() => { load(); }}` → rehefa tsindriana ilay bokotra, dia miantso `load()`.

## 9) Conditional rendering: maneho zavatra samihafa arakaraka ny toe-javatra

Fomba roa mahazatra:

**a) Ternary (`condition ? A : B`)** — ao amin'ny `Tracking.jsx`:
```jsx
{loading ? <span className="spinner" /> : "Rechercher"}
```
Raha `loading` no `true`, aseho ny spinner; raha tsia, aseho ny teny "Rechercher".

**b) `&&`** — ao amin'ny `Admin.jsx`:
```jsx
{stats && (
  <div>...</div>
)}
```
Raha misy `stats` (tsy `null`/`undefined`), dia aseho ilay `<div>`; raha tsy misy, tsy misy aseho mihitsy.

## 10) `.map()`: mamorona lisitry element avy amin'ny tabilao (array)

Ity no fomba ampisehoana lisitry zavatra (ohatra lisitry trajets) ao amin'ny `Home.jsx`:

```jsx
trajets.slice(0, 10).map((t) => (
  <div key={t.id} className="trajet-card" onClick={() => choisirTrajet(t)}>
    <span>{t.ville_depart}</span>
    <span>{t.ville_arrivee}</span>
  </div>
))
```

- `trajets.map((t) => (...))` → mandeha ao anaty tabilao `trajets` iray iray, ary mamorona `<div>` iray ho an'ny `t` tsirairay
- `key={t.id}` → **tsy maintsy misy** isaky ny mamorona lisitry element amin'ny `.map()`; ilaina izany mba hahafahan'ny React mahafantatra hoe element inona no ovaina/afindra/fafana

## 11) Destructuring: fisintonana angona avy anaty objet

Hita betsaka ao amin'ny code-nao:

```jsx
export default function Confirmation({ data, setPage }) { ... }
```

Mitovy amin'ny hoe:

```jsx
function Confirmation(props) {
  const data = props.data;
  const setPage = props.setPage;
}
```

Fa fohy kokoa sy mazava kokoa ny fomba `{ data, setPage }` mivantana.

## 12) Fintina — ny "vocabulary" tokony ho fantatrao

| Teny | Dikany |
|---|---|
| Component | Fonction mamerina JSX |
| Props | Angona alefa avy amin'ny "ray aman-dreny" mankany amin'ny "zanaka" |
| State (`useState`) | Angona miova ao anaty component, mahatonga re-render |
| `useEffect` | Manao zavatra rehefa miseho na miova ny component |
| JSX | HTML + JavaScript miharo |
| `{ }` | "Eto no misy code JavaScript, tsy HTML intsony" |
| `.map()` | Mamorona lisitry component avy amin'ny array |
| `key` | ID tokana ilaina isaky ny `.map()` |
| Event handler (`onClick`, `onChange`) | Fonction miasa rehefa misy fihetsika |

---

Raha mila **ohatra tsotra kokoa** ianao (ohatra: component fohy 10 andalana, tsy misy angona avy amin'API), na raha misy `syntaxe` iray manokana tao amin'ny code-nao tsy azonao mihitsy (ohatra `?.`, `||`, `??`), dia lazao ahy fa hazavaiko amin'ny ohatra fanampiny. -->