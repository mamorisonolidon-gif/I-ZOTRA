import { useState } from "react";
import { API } from "../config";

const ETAPES_TAXI = [
  { key: "confirmée", label: "Réservation confirmée", sub: "Votre place est réservée" },
  { key: "embarquée", label: "En route", sub: "Le véhicule est en déplacement" },
  { key: "arrivée", label: "Arrivé à destination", sub: "Voyage terminé" },
];

const ETAPES_COLIS = [
  { key: "en attente", label: "Enregistré", sub: "Colis reçu et enregistré" },
  { key: "en transit", label: "En transit", sub: "Le colis est en route" },
  { key: "livré", label: "Livré", sub: "Colis remis au destinataire" },
];

function Timeline({ etapes, statut }) {
  const idx = etapes.findIndex(e => e.key === statut);
  return (
    <div className="tracking-steps">
      {etapes.map((e, i) => {
        const done = i < idx;
        const current = i === idx;
        const last = i === etapes.length - 1;
        return (
          <div key={e.key} className="tracking-step">
            <div className="step-line">
              <div className={`step-dot ${done ? "done" : current ? "current" : "todo"}`} />
              {!last && <div className={`step-connector ${done || current ? "done" : ""}`} />}
            </div>
            <div className="step-content">
              <div className="step-label" style={{ color: done || current ? "var(--night)" : "var(--slate)" }}>
                {e.label}
                {current && <span style={{ marginLeft: 8, fontSize: ".75rem", background: "var(--orange-l)", color: "var(--orange-d)", padding: "2px 8px", borderRadius: 99, fontWeight: 600 }}>En cours</span>}
              </div>
              <div className="step-sub">{e.sub}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Tracking({ setPage }) {
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const search = async e => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const r = await fetch(`${API}/api/suivi/${code.trim().toUpperCase()}`);
      if (!r.ok) throw new Error("Code introuvable. Vérifiez le code reçu lors de votre réservation.");
      setResult(await r.json());
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const isTaxi = result?.type === "taxi";
  const isNavette = result?.type === "navette";
  const etapes = result?.type === "colis" ? ETAPES_COLIS : ETAPES_TAXI;

  return (
    <div className="tracking-page page-enter">
      <div className="container" style={{ maxWidth: 720 }}>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.8rem", fontWeight: 800, marginBottom: 8 }}>
          Suivi de réservation
        </h1>
        <p style={{ color: "var(--slate)", marginBottom: 40 }}>Entrez votre code de réservation pour connaître l'état de votre voyage ou colis.</p>

        <form onSubmit={search} style={{ display: "flex", gap: 12, marginBottom: 32 }}>
          <input
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="Ex: TB-A1B2C3D4, NV-A1B2C3D4 ou CP-E5F6G7H8"
            style={{ flex: 1, padding: "13px 16px", borderRadius: 10, border: "1.5px solid var(--border)", fontSize: "1rem", fontFamily: "monospace", letterSpacing: ".05em" }}
          />
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : "Rechercher"}
          </button>
        </form>

        {error && <div className="alert alert-error">{error}</div>}

        {result && (
          <div className="card page-enter" style={{ padding: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <p style={{ fontSize: ".8rem", color: "var(--slate)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>
                  {isTaxi ? "Réservation Taxi Brousse" : isNavette ? "Course Taxi Station → Domicile" : "Envoi de Colis"}
                </p>
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.3rem", fontWeight: 800 }}>
                  {isTaxi || isNavette ? `${result.prenom_passager} ${result.nom_passager}` : result.expediteur_nom}
                </h2>
                <p style={{ color: "var(--slate)", fontSize: ".9rem", marginTop: 2 }}>
                  {isNavette
                    ? `${result.stationnement_nom} (${result.stationnement_ville}) → ${result.adresse_domicile}`
                    : `${result.ville_depart} → ${result.ville_arrivee}`}
                </p>
              </div>
              <div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: ".95rem", fontWeight: 800, color: "var(--night)", background: "var(--light)", padding: "6px 14px", borderRadius: 8, letterSpacing: ".05em" }}>
                  {result.code}
                </div>
                <span className={`badge ${result.statut === "confirmée" || result.statut === "en attente" ? "badge-orange" : result.statut === "livré" || result.statut === "arrivée" ? "badge-green" : "badge-sky"}`} style={{ marginTop: 8 }}>
                  ● {result.statut}
                </span>
              </div>
            </div>

            <hr className="divider" style={{ marginBottom: 24 }} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px", marginBottom: 28 }}>
              {(isTaxi ? [
                ["Date de départ : ", result.date_depart],
                ["Heure :", result.heure_depart],
                ["Nb. places :", result.nb_places],
                ["Durée :", `${result.duree_heures}h`],
                ["Téléphone : ", result.telephone],
                ["Prix total :", `${result.prix_total?.toLocaleString()} Ar`],
                ["Acompte versé :", `${result.acompte_ar?.toLocaleString()} Ar (${result.mode_paiement})`],
                ["Solde restant :", `${result.solde_ar?.toLocaleString()} Ar`],
              ] : isNavette ? [
                ["Date de la course :", result.date_course],
                ["Heure :", result.heure_course],
                ["Distance estimée: ", `${result.distance_km} km`],
                ["Nb. passagers :", result.nb_passagers],
                ["Téléphone:", result.telephone],
                ["Adresse domicile:", result.adresse_domicile],
                ["Prix total:", `${result.prix_total?.toLocaleString()} Ar`],
                ["Acompte versé:", `${result.acompte_ar?.toLocaleString()} Ar (${result.mode_paiement})`],
                ["Solde restant :", `${result.solde_ar?.toLocaleString()} Ar`],
              ] : [
                ["Date de dépôt :", result.date_depot],
                ["Poids :", `${result.poids_kg} kg`],
                ["Expéditeur : ", `${result.expediteur_nom} (${result.expediteur_tel})`],
                ["Destinataire :", `${result.destinataire_nom} (${result.destinataire_tel})`],
                ["Contenu :", result.description_colis],
                ["Prix :", `${result.prix_total?.toLocaleString()} Ar`],
                ["Acompte versé :", `${result.acompte_ar?.toLocaleString()} Ar (${result.mode_paiement})`],
                ["Solde restant :", `${result.solde_ar?.toLocaleString()} Ar`],
              ]).map(([lbl, val]) => (
                <div key={lbl} style={{ fontSize: ".86rem" }}>
                  <div style={{ color: "var(--slate)", fontSize: ".75rem", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 2 }}>{lbl}</div>
                  <div style={{ fontWeight: 600 }}>{val}</div>
                </div>
              ))}
            </div>

            <hr className="divider" style={{ marginBottom: 24 }} />

            <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: ".9rem", color: "var(--slate)", textTransform: "uppercase", letterSpacing: ".04em" }}>
              Progression
            </h3>
            <Timeline etapes={etapes} statut={result.statut} />
          </div>
        )}

        <div style={{ marginTop: 40, textAlign: "center" }}>
          <button className="btn btn-outline" onClick={() => setPage("home")}>← Retour à l'accueil</button>
        </div>
      </div>
    </div>
  );
}
