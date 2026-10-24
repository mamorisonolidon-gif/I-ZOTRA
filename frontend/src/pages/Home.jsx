import { useState, useEffect } from "react";
import { API } from "../config";

function MadagascarSVG() {
  return (
    <svg viewBox="0 0 200 340" style={{ width: 200, opacity: .18, position: "absolute", right: 80, top: "50%", transform: "translateY(-50%)" }} fill="none">
      <path d="M105 12 C130 14 148 30 152 55 C158 80 162 110 155 140 C150 165 142 188 130 210 C120 230 108 248 95 270 C82 290 72 308 68 326 C64 340 58 342 52 330 C46 316 48 295 55 272 C62 248 68 225 62 200 C56 175 42 155 38 130 C34 105 38 80 50 60 C62 38 80 10 105 12Z" stroke="#F97316" strokeWidth="2" fill="rgba(249,115,22,.08)" />
      {[
        [88, 80, "Antananarivo"],
        [130, 110, "Toamasina"],
        [50, 90, "Mahajanga"],
        [85, 175, "Fianarantsoa"],
        [60, 265, "Toliara"],
        [110, 28, "Antsiranana"],
        [85, 130, "Antsirabe"],
      ].map(([x, y, name]) => (
        <g key={name}>
          <circle cx={x} cy={y} r="4" fill="#F97316" opacity=".9" />
          <circle cx={x} cy={y} r="8" fill="none" stroke="#F97316" strokeWidth="1" opacity=".3">
            <animate attributeName="r" values="4;12;4" dur="2.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values=".6;0;.6" dur="2.5s" repeatCount="indefinite" />
          </circle>
        </g>
      ))}
      <line x1="88" y1="80" x2="130" y2="110" stroke="#e4dad2" strokeWidth="1" strokeDasharray="4 3" opacity=".5" />
      <line x1="88" y1="80" x2="50" y2="90" stroke="#F97316" strokeWidth="1" strokeDasharray="4 3" opacity=".5" />
      <line x1="88" y1="80" x2="85" y2="175" stroke="#F97316" strokeWidth="1" strokeDasharray="4 3" opacity=".5" />
      <line x1="85" y1="175" x2="60" y2="265" stroke="#F97316" strokeWidth="1" strokeDasharray="4 3" opacity=".5" />
      <line x1="88" y1="80" x2="85" y2="130" stroke="#F97316" strokeWidth="1" strokeDasharray="4 3" opacity=".5" />
    </svg>
  );
}

function TrajetSearchTab({ onSearch }) {
  const [dep, setDep] = useState("");
  const [arr, setArr] = useState("");
  const villes = ["Antananarivo","Toamasina","Mahajanga","Fianarantsoa","Toliara","Antsiranana","Antsirabe","Moramanga","Ambositra","Manakara","Fort-Dauphin","Sambava","Morondava"];
  return (
    <div className="search-form">
      <div className="field">
        <label>Départ</label>
        <select value={dep} onChange={e => setDep(e.target.value)}>
          <option value="">Toutes les villes</option>
          {villes.map(v => <option key={v}>{v}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Destination</label>
        <select value={arr} onChange={e => setArr(e.target.value)}>
          <option value="">Toutes les villes</option>
          {villes.map(v => <option key={v}>{v}</option>)}
        </select>
      </div>
      <button className="btn btn-primary btn-full" onClick={() => onSearch(dep, arr)}> <img
            src="/src/image/recherche.png"
            alt="logo"
            style={{
              width: "100px",   // 🔽 réduire ici
              height: "35px",
              objectFit: "cover",
              paddingRight:"10px"
              
            }}
          />
        Rechercher les trajets
      </button>
    </div>
  );
}

function NavetteSearchTab({ setPage, setBookingData }) {
  const [villes, setVilles] = useState([]);
  const [ville, setVille] = useState("");
  const [stationnements, setStationnements] = useState([]);
  const [stationnementId, setStationnementId] = useState("");

  useEffect(() => {
    fetch(`${API}/api/stationnements/villes`).then(r => r.json()).then(setVilles).catch(() => setVilles([]));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (ville) params.set("ville", ville);
    fetch(`${API}/api/stationnements?${params}`).then(r => r.json()).then(setStationnements).catch(() => setStationnements([]));
  }, [ville]);

  const reserver = () => {
    const s = stationnements.find(st => st.id === Number(stationnementId));
    setBookingData({ stationnement: s || null });
    setPage("book-navette");
  };

  return (
    <div className="search-form">
      <div className="field">
        <label>Ville du stationnement</label>
        <select value={ville} onChange={e => { setVille(e.target.value); setStationnementId(""); }}>
          <option value="">Toutes les villes</option>
          {villes.map(v => <option key={v}>{v}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Stationnement</label>
        <select value={stationnementId} onChange={e => setStationnementId(e.target.value)}>
          <option value="">— Sélectionner —</option>
          {stationnements.map(s => <option key={s.id} value={s.id}>{s.nom} ({s.ville})</option>)}
        </select>
      </div>
      <button className="btn btn-primary btn-full" onClick={reserver}>
        Réserver ma course vers chez moi
      </button>
    </div>
  );
}

function SearchCard({ onSearch, setPage, setBookingData }) {
  const [tab, setTab] = useState("trajet");
  return (
    <div className="search-card">
      <h3>Que cherchez-vous ?</h3>
      <div className="search-tabs">
        <button type="button" className={`search-tab ${tab === "trajet" ? "active" : ""}`} onClick={() => setTab("trajet")}>
           Trajet interurbain
        </button>
        <button type="button" className={`search-tab ${tab === "navette" ? "active" : ""}`} onClick={() => setTab("navette")}>
           Station → Domicile
        </button>
      </div>
      {tab === "trajet"
        ? <TrajetSearchTab onSearch={onSearch} />
        : <NavetteSearchTab setPage={setPage} setBookingData={setBookingData} />}
    </div>
  );
}

const TRUST_ITEMS = [
  { icon: "", title: "GPS intégré", sub: "Suivi en temps réel" },
  { icon: "", title: "Véhicules sécurisés", sub: "Propres et contrôlés" },
  { icon: "", title: "WiFi à bord", sub: "Sur les longs trajets" },
  { icon: "", title: "Pièces d'origine", sub: "Entretien fiable" },
  { icon: "", title: "Entretien assuré", sub: "Ateliers partenaires agréés" },
];

export default function Home({ setPage, setBookingData }) {
  const [trajets, setTrajets] = useState([]);
  const [filtre, setFiltre] = useState({ dep: "", arr: "" });
  const [loading, setLoading] = useState(false);

  const chargerTrajets = async (dep = "", arr = "") => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dep) params.set("depart", dep);
      if (arr) params.set("arrivee", arr);
      const r = await fetch(`${API}/api/trajets?${params}`);
      setTrajets(await r.json());
    } catch { setTrajets([]); }
    setLoading(false);
  };

  useEffect(() => { chargerTrajets(); }, []);

  const scrollToTrajets = () => {
    // On attend le prochain repaint pour être sûr que la section est bien affichée
    // (utile notamment après la mise à jour de la liste des trajets)
    requestAnimationFrame(() => {
      document.getElementById("trajets-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleSearch = async (dep, arr) => {
    setFiltre({ dep, arr });
    await chargerTrajets(dep, arr);
    scrollToTrajets();
  };

  const choisirTrajet = (t) => {
    setBookingData({ type: "taxi", trajet: t });
    setPage("book-taxi");
  };

  return (
    <div className="page-enter">
      {/* Hero */}
      <section className="hero">
        <MadagascarSVG />
        <div className="hero-inner" style={{ position: "relative", zIndex: 1 }}>
          <div>
           
            <h1>
              Voyagez autrement à <span>Madagascar</span>
            </h1>
            <p className="hero-desc">
              Réservez votre place de taxi-brousse pour vos trajets interurbains, une course
              depuis un stationnement jusqu'à votre domicile, ou expédiez vos colis —
              rapidement, simplement, en toute sécurité.
            </p>
            <div style={{ display: "flex", gap: 12, marginBottom: 40, flexWrap: "wrap" }}>
              <button className="btn btn-primary btn-lg" onClick={() => setPage("book-taxi")}>
                 <img
            src="/src/image/reserves.png"
            alt="logo"
            style={{
              width: "50px",   // 🔽 réduire ici
              height: "20px",
              objectFit: "cover",
              paddingRight:"10px"
              
            }}
          />
                 Réserver un trajet
              </button>
              <button className="btn btn-ghost btn-lg" onClick={() => setPage("book-navette")}>
                 Taxi station → domicile
              </button>
            </div>
            <div className="hero-stats">
              
            </div>
          </div>
          <SearchCard onSearch={handleSearch} setPage={setPage} setBookingData={setBookingData} />
        </div>
      </section>

      {/* Bandeau de confiance — inspiré du stationnement */}
      <section className="trust-strip">
        <div className="container">
          <div className="trust-strip-inner">
            {TRUST_ITEMS.map(t => (
              <div className="trust-item" key={t.title}>
                <div className="icon">{t.icon}</div>
                <div className="txt">{t.title}<small>{t.sub}</small></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="section-sm" style={{ background: "#fff", borderBottom: "1.5px solid var(--border)" }}>
        <div className="container">
          <div className="services-grid">
            {[
              { icon: "", bg: "v", label: "Taxi Brousse", desc: "Réservez votre place sur les meilleures lignes nationales.", page: "book-taxi" },
              { icon: "", bg: "", label: "Taxi Station → Domicile", desc: "Un chauffeur vous récupère au stationnement et vous dépose chez vous.", page: "book-navette" },
              { icon: "", bg: "", label: "Envoi de Colis", desc: "Expédiez vos colis en toute sécurité partout à Madagascar.", page: "book-colis" },
              { icon: "", bg: "var(--orange-l)", label: "Suivi en ligne", desc: "Suivez votre réservation ou colis grâce à votre code unique.", page: "tracking" },
            ].map((s) => (
              <div key={s.label} className="service-card card-hover" onClick={() => s.page && setPage(s.page)}>
                <div className="service-icon" style={{ background: s.bg, fontSize: "1.4rem" }}>{s.icon}</div>
                <div>
                  <h3>{s.label}</h3>
                  <p>{s.desc}</p>
                </div>
                {s.page && <div className="arrow">En savoir plus →</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stationnement mis en avant */}
      <section className="section">
        <div className="container">
          <div style={{
            display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 40, alignItems: "center",
            background: "var(--night)", borderRadius: 20, padding: "44px 48px", color: "#fff", overflow: "hidden", position: "relative"
          }}>
            <div style={{ position: "relative", zIndex: 1 }}>
             
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.6rem", fontWeight: 800, marginBottom: 12 }}>
                Un chauffeur vous attend, où que vous soyez
              </h2>
              <p style={{ color: "rgba(255,255,255,.7)", marginBottom: 24, maxWidth: 460 }}>
                Nos stationnements sont répartis dans les principales villes de Madagascar.
                Choisissez le plus proche de vous et réservez une course directe jusqu'à votre domicile,
                sans attendre sur place.
              </p>
              <button className="btn btn-primary btn-lg" onClick={() => setPage("book-navette")}>
                 Trouver un stationnement
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "relative", zIndex: 1 }}>
              {[
                ["", "Disponible 6h – 20h", "Tous les jours de la semaine"],
                ["", "Paiement flexible", "Mvola, Orange Money, Airtel Money, Espèces"],
                ["", "Chauffeur vérifié", "Contact direct après confirmation"],
              ].map(([icon, title, sub]) => (
                <div key={title} style={{ display: "flex", gap: 14, alignItems: "flex-start", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, padding: "14px 18px" }}>
                  <span style={{ fontSize: "1.3rem" }}>{icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: ".92rem" }}>{title}</div>
                    <div style={{ fontSize: ".8rem", color: "rgba(255,255,255,.55)" }}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trajets populaires */}
      <section className="section" id="trajets-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Trajets disponibles</h2>
            <p className="section-sub">Sélectionnez un trajet pour réserver votre place</p>
          </div>
          {loading ? (
            <p style={{ color: "var(--slate)" }}>Chargement des trajets…</p>
          ) : trajets.length === 0 ? (
            <p style={{ color: "var(--slate)" }}>Aucun trajet trouvé. Modifiez votre recherche.</p>
          ) : (
            trajets.slice(0, 10).map((t) => (
              <div key={t.id} className="trajet-card" onClick={() => choisirTrajet(t)}>
                <div className="trajet-route">
                  <div className="trajet-cities">
                    <span className="city-pill city-from">{t.ville_depart}</span>
                    <span className="trajet-arrow">→</span>
                    <span className="city-pill city-to">{t.ville_arrivee}</span>
                  </div>
                </div>
                <div className="trajet-meta">
                  <div className="trajet-info">
                    <div className="val">{t.duree_heures}h</div>
                    <div className="key">Durée</div>
                  </div>
                  <div className="trajet-info">
                    <div className="val">{t.places_totales}</div>
                    <div className="key">Places</div>
                  </div>
                  <div className="trajet-price">{t.prix_ar.toLocaleString()} Ar</div>
                  <button className="btn btn-primary btn-sm">Réserver</button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Features */}
      <section className="section" style={{ background: "#fff" }}>
        <div className="container">
          <h2 className="section-title" style={{ textAlign: "center", marginBottom: 48 }}>Pourquoi choisir TaxiBrousse</h2>
          <div className="features-grid">
            {[
              ["", "Réservation rapide", "Réservez en moins de 2 minutes, depuis n'importe où au monde."],
              ["", "Paiement sécurisé", "Vos données personnelles et paiements sont protégés."],
              ["", "Code de suivi unique", "Chaque réservation reçoit un code pour suivre son statut."],
              ["", "Véhicules contrôlés", "Nos partenaires chauffeurs sont sélectionnés et vérifiés."],
              ["", "Couverture nationale", "15+ villes desservies dans tout Madagascar."],
              ["", "Colis assurés", "Vos envois sont pris en charge avec soin."],
            ].map(([icon, title, desc]) => (
              <div key={title} className="feature-item">
                <span className="feature-icon" style={{ fontSize: "1.2rem" }}>{icon}</span>
                <h4>{title}</h4>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
