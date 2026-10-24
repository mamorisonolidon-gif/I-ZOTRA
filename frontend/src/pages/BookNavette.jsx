import { useState, useEffect, useMemo } from "react";
import { API } from "../config";
import VerificationTelephone from "../components/VerificationTelephone";

const HEURES = ["05:00","05:30","06:00","06:30","07:00","07:30","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00"];
const TAUX_ACOMPTE = 0.30;
const MODES_PAIEMENT = ["Mvola", "Orange Money", "Airtel Money", "Espèces"];
const BASE_NAVETTE_AR = 4000;
const TARIF_KM_AR = 1200;
const SUPPLEMENT_PASSAGER_AR = 1000;

function calculPrixNavette(distanceKm, nbPassagers) {
  const brut = BASE_NAVETTE_AR + distanceKm * TARIF_KM_AR + Math.max(nbPassagers - 1, 0) * SUPPLEMENT_PASSAGER_AR;
  return Math.ceil(brut / 100) * 100;
}

function calculAcompte(prixTotal) {
  const acompte = Math.ceil((prixTotal * TAUX_ACOMPTE) / 100) * 100;
  return { acompte, solde: prixTotal - acompte };
}

export default function BookNavette({ bookingData, setPage, setConfirmation }) {
  const [villes, setVilles] = useState([]);
  const [ville, setVille] = useState(bookingData?.stationnement?.ville || "");
  const [stationnements, setStationnements] = useState([]);
  const [stationnementId, setStationnementId] = useState(bookingData?.stationnement?.id || "");
  const [form, setForm] = useState({
    nom_passager: "", prenom_passager: "", telephone: "",
    adresse_domicile: "", quartier_domicile: "",
    date_course: "", heure_course: "07:00",
    mode_paiement: "Mvola",
  });
  const [distanceKm, setDistanceKm] = useState(5);
  const [nbPassagers, setNbPassagers] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [telVerifie, setTelVerifie] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/stationnements/villes`).then(r => r.json()).then(setVilles).catch(() => setVilles([]));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (ville) params.set("ville", ville);
    fetch(`${API}/api/stationnements?${params}`).then(r => r.json()).then(list => {
      setStationnements(list);
      if (stationnementId && !list.some(s => s.id === stationnementId)) setStationnementId("");
    }).catch(() => setStationnements([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ville]);

  const stationnementChoisi = useMemo(
    () => stationnements.find(s => s.id === Number(stationnementId)) || null,
    [stationnements, stationnementId]
  );

  const change = e => {
    const { name, value } = e.target;
    if (name === "telephone") setTelVerifie(false);
    setForm(p => ({ ...p, [name]: value }));
  };

  const submit = async e => {
    e.preventDefault();
    if (!stationnementId) { setError("Veuillez choisir un stationnement de départ."); return; }
    if (!form.adresse_domicile || !form.quartier_domicile) { setError("Veuillez indiquer votre adresse de destination."); return; }
    if (!telVerifie) { setError("Veuillez vérifier votre numéro de téléphone (code SMS)."); return; }
    setLoading(true); setError("");
    try {
      const r = await fetch(`${API}/api/reservations/navette`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stationnement_id: Number(stationnementId),
          nom_passager: form.nom_passager,
          prenom_passager: form.prenom_passager,
          telephone: form.telephone,
          adresse_domicile: form.adresse_domicile,
          quartier_domicile: form.quartier_domicile,
          date_course: form.date_course,
          heure_course: form.heure_course,
          distance_km: Number(distanceKm),
          nb_passagers: Number(nbPassagers),
          mode_paiement: form.mode_paiement,
        }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.detail); }
      const data = await r.json();
      setConfirmation({ ...data, type: "navette", nom: `${form.prenom_passager} ${form.nom_passager}` });
      setPage("confirmation");
    } catch (e) {
      if (e instanceof TypeError && e.message === "Failed to fetch") {
        setError(`Impossible de contacter le serveur (${API}). Vérifiez que le backend est démarré et accessible.`);
      } else {
        setError(e.message);
      }
    }
    setLoading(false);
  };

  const prixTotal = calculPrixNavette(Number(distanceKm) || 0, Number(nbPassagers) || 1);
  const { acompte, solde } = calculAcompte(prixTotal);
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="booking-page page-enter">
      <div className="container">
        <div style={{ marginBottom: 32 }}>
          <button className="btn btn-outline btn-sm" onClick={() => setPage("home")}>← Retour</button>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.6rem", fontWeight: 800, marginTop: 16 }}>
            Taxi Stationnement → Domicile
          </h1>
          <p style={{ color: "var(--slate)", marginTop: 4 }}>
            Un chauffeur vous récupère au stationnement de votre choix et vous dépose directement chez vous.
          </p>
        </div>

        <div className="booking-layout">
          <form onSubmit={submit} className="form-section">
            {error && <div className="alert alert-error">{error}</div>}

            {/* Choix du stationnement */}
            <div className="card">
              <h2 style={{ fontFamily: "Cambria, Cochin, Georgia, Times, 'Times New Roman', serif", fontSize: "1.1rem", marginBottom: 16 }}>
                Choisir un stationnement
              </h2>
              <div className="form-grid-2" style={{ marginBottom: 16 }}>
                <div className="field">
                  <label>Ville</label>
                  <select value={ville} onChange={e => { setVille(e.target.value); setStationnementId(""); }}>
                    <option value="">Toutes les villes</option>
                    {villes.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Stationnement de départ</label>
                  <select value={stationnementId} onChange={e => setStationnementId(e.target.value)} required>
                    <option value="">— Sélectionner —</option>
                    {stationnements.map(s => (
                      <option key={s.id} value={s.id}>{s.nom} — {s.ville} ({s.quartier})</option>
                    ))}
                  </select>
                </div>
              </div>
              {stationnements.length === 0 && (
                <p style={{ color: "var(--slate)", fontSize: ".85rem" }}>Aucun stationnement trouvé pour cette ville.</p>
              )}
            </div>

            {/* Destination */}
            <div className="card">
              <h2 style={{ fontFamily: "Cambria, Cochin, Georgia, Times, 'Times New Roman', serif", fontSize: "1.1rem", marginBottom: 16 }}>
                Votre domicile (destination)
              </h2>
              <div className="form-grid-2" style={{ marginBottom: 16 }}>
                <div className="field">
                  <label>Quartier</label>
                  <input name="quartier_domicile" value={form.quartier_domicile} onChange={change} placeholder="Ex: Ivandry" required />
                </div>
                <div className="field">
                  <label>Adresse précise</label>
                  <input name="adresse_domicile" value={form.adresse_domicile} onChange={change} placeholder="Ex: Lot II M 12 bis, près de l'école" required />
                </div>
              </div>
              <div className="form-grid-2">
                <div className="field">
                  <label>Distance estimée (km) — {distanceKm} km</label>
                  <input type="range" min="1" max="40" step="0.5" value={distanceKm} onChange={e => setDistanceKm(e.target.value)} />
                </div>
                <div className="field">
                  <label>Nombre de passagers</label>
                  <select value={nbPassagers} onChange={e => setNbPassagers(e.target.value)}>
                    {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} passager{n > 1 ? "s" : ""}</option>)}
                  </select>
                </div>
              </div>
              <p style={{ color: "var(--slate)", fontSize: ".8rem", marginTop: 12 }}>
                Indiquez une distance approximative — le chauffeur confirmera le trajet exact avec vous par téléphone.
              </p>
            </div>

            {/* Date / heure */}
            <div className="card">
              <h2 style={{ fontFamily: "Cambria, Cochin, Georgia, Times, 'Times New Roman', serif", fontSize: "1.1rem", marginBottom: 16 }}>
                Date et heure de prise en charge
              </h2>
              <div className="form-grid-2">
                <div className="field">
                  <label>Date</label>
                  <input type="date" name="date_course" value={form.date_course} min={today} onChange={change} required />
                </div>
                <div className="field">
                  <label>Heure</label>
                  <select name="heure_course" value={form.heure_course} onChange={change}>
                    {HEURES.map(h => <option key={h}>{h}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Acompte */}
            <div className="card">
              <h2 style={{ fontFamily: "Cambria, Cochin, Georgia, Times, 'Times New Roman', serif", fontSize: "1.1rem", marginBottom: 4 }}>Acompte de réservation</h2>
              <p style={{ color: "var(--slate)", fontSize: ".83rem", marginBottom: 16 }}>
                Un acompte de {Math.round(TAUX_ACOMPTE * 100)}% du prix estimé est demandé pour confirmer la course. Le solde se règle directement auprès du chauffeur.
              </p>
              <div className="field" style={{ marginBottom: 16 }}>
                <label>Mode de paiement de l'acompte</label>
                <select name="mode_paiement" value={form.mode_paiement} onChange={change} required>
                  {MODES_PAIEMENT.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "12px 14px", background: "var(--orange-l)", borderRadius: 8 }}>
                <div className="summary-row"><span className="lbl">Acompte à verser</span><span className="val" style={{ color: "var(--orange-d)", fontWeight: 700 }}>{acompte.toLocaleString()} Ar</span></div>
                <div className="summary-row"><span className="lbl">Solde à la course</span><span className="val">{solde.toLocaleString()} Ar</span></div>
              </div>
            </div>

            {/* Infos passager */}
            <div className="card">
              <h2 style={{ fontFamily: "Cambria, Cochin, Georgia, Times, 'Times New Roman', serif", fontSize: "1.1rem", marginBottom: 16 }}>Informations passager</h2>
              <div className="form-grid-2" style={{ marginBottom: 16 }}>
                <div className="field">
                  <label>Nom</label>
                  <input name="nom_passager" value={form.nom_passager} onChange={change} placeholder="RAKOTO" required />
                </div>
                <div className="field">
                  <label>Prénom</label>
                  <input name="prenom_passager" value={form.prenom_passager} onChange={change} placeholder="Jean" required />
                </div>
              </div>
              <div className="field">
                <label>Téléphone</label>
                <input name="telephone" type="tel" value={form.telephone} onChange={change} placeholder="+261 34 XX XXX XX" required />
                <VerificationTelephone telephone={form.telephone} verifie={telVerifie} onVerifie={setTelVerifie} />
              </div>
            </div>

            <button className="btn btn-primary btn-lg btn-full" type="submit" disabled={loading || !telVerifie}>
              {loading ? <><span className="spinner" /> Traitement…</> : !telVerifie ? "Vérifiez votre numéro pour continuer" : "Confirmer la course"}
            </button>
          </form>

          {/* Summary */}
          <aside>
            <div className="card summary-card">
              <h3>Résumé de la course</h3>
              <div className="summary-row"><span className="lbl">Stationnement</span><span className="val">{stationnementChoisi ? `${stationnementChoisi.nom} (${stationnementChoisi.ville})` : "—"}</span></div>
              <div className="summary-row"><span className="lbl">Destination</span><span className="val">{form.quartier_domicile || "—"}</span></div>
              <div className="summary-row"><span className="lbl">Date</span><span className="val">{form.date_course || "—"}</span></div>
              <div className="summary-row"><span className="lbl">Heure</span><span className="val">{form.heure_course}</span></div>
              <div className="summary-row"><span className="lbl">Distance</span><span className="val">{distanceKm} km</span></div>
              <div className="summary-row"><span className="lbl">Passagers</span><span className="val">{nbPassagers}</span></div>
              <div className="summary-total">
                <span className="lbl">Total estimé</span>
                <span className="val">{prixTotal.toLocaleString()} Ar</span>
              </div>
              <hr className="divider" style={{ margin: "10px 0" }} />
              <div className="summary-row"><span className="lbl">Acompte ({Math.round(TAUX_ACOMPTE * 100)}%)</span><span className="val" style={{ color: "var(--orange-d)", fontWeight: 700 }}>{acompte.toLocaleString()} Ar</span></div>
              <div className="summary-row"><span className="lbl">Solde à la course</span><span className="val">{solde.toLocaleString()} Ar</span></div>
              <div style={{ marginTop: 16, padding: "10px 14px", background: "var(--orange-l)", borderRadius: 8, fontSize: ".83rem", color: "var(--orange-d)" }}>
                Prix estimé selon la distance indiquée — ajusté au besoin avec le chauffeur.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
