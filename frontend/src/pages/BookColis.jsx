import { useState } from "react";
import { API } from "../config";
import VerificationTelephone from "../components/VerificationTelephone";

const VILLES = ["Antananarivo","Toamasina","Mahajanga","Fianarantsoa","Toliara","Antsiranana","Antsirabe","Moramanga","Ambositra","Manakara","Fort-Dauphin","Sambava","Morondava","Ambatolampy","Maevatanana"];
const TAUX_ACOMPTE = 0.30;
const MODES_PAIEMENT = ["Mvola", "Orange Money", "Airtel Money", "Espèces"];

function calculAcompte(prixTotal) {
  const acompte = Math.ceil((prixTotal * TAUX_ACOMPTE) / 100) * 100;
  return { acompte, solde: prixTotal - acompte };
}

function prixEstime(poids) {
  if (!poids || poids <= 0) return 0;
  return 5000 + Math.ceil(poids) * 2000;
}

export default function BookColis({ setPage, setConfirmation }) {
  const [form, setForm] = useState({
    ville_depart: "", ville_arrivee: "",
    expediteur_nom: "", expediteur_tel: "",
    destinataire_nom: "", destinataire_tel: "",
    description_colis: "", poids_kg: "",
    date_depot: "", mode_paiement: "Mvola",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [telVerifie, setTelVerifie] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  const change = e => {
    const { name, value } = e.target;
    if (name === "expediteur_tel") setTelVerifie(false); // laharana vaovao = tsy maintsy averina hamarinina
    setForm(p => ({ ...p, [name]: value }));
  };

  const submit = async e => {
    e.preventDefault();
    if (form.ville_depart === form.ville_arrivee) { setError("La ville de départ et d'arrivée doivent être différentes."); return; }
    if (!telVerifie) { setError("Veuillez vérifier votre numéro de téléphone (code SMS)."); return; }
    setLoading(true); setError("");
    try {
      const payload = { ...form, poids_kg: parseFloat(form.poids_kg) };
      const r = await fetch(`${API}/api/reservations/colis`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.detail); }
      const data = await r.json();
      setConfirmation({ ...data, type: "colis", nom: form.expediteur_nom });
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

  const prix = prixEstime(parseFloat(form.poids_kg));

  return (
    <div className="booking-page page-enter">
      <div className="container">
        <div style={{ marginBottom: 32 }}>
          <button className="btn btn-outline btn-sm" onClick={() => setPage("home")}>← Retour</button>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.6rem", fontWeight: 800, marginTop: 16 }}>
            Envoyer un Colis
          </h1>
          <p style={{ color: "var(--slate)", marginTop: 4 }}>Expédiez vos colis partout à Madagascar en toute sécurité</p>
        </div>

        <div className="booking-layout">
          <form onSubmit={submit} className="form-section">
            {error && <div className="alert alert-error">{error}</div>}

            {/* Trajet */}
            <div className="card">
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.1rem", marginBottom: 16 }}>Itinéraire du colis</h2>
              <div className="form-grid-2">
                <div className="field">
                  <label>Ville de départ</label>
                  <select name="ville_depart" value={form.ville_depart} onChange={change} required>
                    <option value="">Sélectionner…</option>
                    {VILLES.map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Ville d'arrivée</label>
                  <select name="ville_arrivee" value={form.ville_arrivee} onChange={change} required>
                    <option value="">Sélectionner…</option>
                    {VILLES.filter(v => v !== form.ville_depart).map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Expéditeur */}
            <div className="card">
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.1rem", marginBottom: 16 }}>Expéditeur</h2>
              <div className="form-grid-2">
                <div className="field">
                  <label>Nom complet</label>
                  <input name="expediteur_nom" value={form.expediteur_nom} onChange={change} placeholder="RAKOTO Jean" required />
                </div>
                <div className="field">
                  <label>Téléphone</label>
                  <input name="expediteur_tel" type="tel" value={form.expediteur_tel} onChange={change} placeholder="+261 34 XX XXX XX" required />
                  <VerificationTelephone telephone={form.expediteur_tel} verifie={telVerifie} onVerifie={setTelVerifie} />
                </div>
              </div>
            </div>

            {/* Destinataire */}
            <div className="card">
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.1rem", marginBottom: 16 }}>Destinataire</h2>
              <div className="form-grid-2">
                <div className="field">
                  <label>Nom complet du destinataire</label>
                  <input name="destinataire_nom" value={form.destinataire_nom} onChange={change} placeholder="RABEARIVELO Pierre" required />
                </div>
                <div className="field">
                  <label>Téléphone du destinataire</label>
                  <input name="destinataire_tel" type="tel" value={form.destinataire_tel} onChange={change} placeholder="+261 34 XX XXX XX" required />
                </div>
              </div>
            </div>

            {/* Colis */}
            <div className="card">
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.1rem", marginBottom: 16 }}>Description du colis</h2>
              <div className="form-grid-2" style={{ marginBottom: 16 }}>
                <div className="field">
                  <label>Poids (kg)</label>
                  <input type="number" name="poids_kg" value={form.poids_kg} onChange={change} step="0.1" min="0.1" max="100" placeholder="Ex: 2.5" required />
                </div>
                <div className="field">
                  <label>Date de dépôt</label>
                  <input type="date" name="date_depot" value={form.date_depot} min={today} onChange={change} required />
                </div>
              </div>
              <div className="field">
                <label>Description du contenu</label>
                <textarea name="description_colis" value={form.description_colis} onChange={change} placeholder="Ex: Vêtements, documents, pièces de rechange, médicaments…" required />
              </div>
              <div style={{ marginTop: 14, padding: "10px 14px", background: "#FFFBEB", border: "1px solid #FEF08A", borderRadius: 8, fontSize: ".83rem", color: "#92400E" }}>
                Objets interdits : matières dangereuses, armes, produits illicites.
              </div>
            </div>

            {/* Acompte */}
            <div className="card">
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.1rem", marginBottom: 4 }}>Acompte de réservation</h2>
              <p style={{ color: "var(--slate)", fontSize: ".83rem", marginBottom: 16 }}>
                Un acompte de {Math.round(TAUX_ACOMPTE * 100)}% du prix total est demandé pour valider l'envoi. Le solde restant se règle au dépôt du colis.
              </p>
              <div className="field" style={{ marginBottom: 16 }}>
                <label>Mode de paiement de l'acompte</label>
                <select name="mode_paiement" value={form.mode_paiement} onChange={change} required>
                  {MODES_PAIEMENT.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              {prix > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "12px 14px", background: "#FFFBEB", borderRadius: 8 }}>
                  <div className="summary-row"><span className="lbl">Acompte à verser</span><span className="val" style={{ color: "#92400E", fontWeight: 700 }}>{calculAcompte(prix).acompte.toLocaleString()} Ar</span></div>
                  <div className="summary-row"><span className="lbl">Solde au dépôt</span><span className="val">{calculAcompte(prix).solde.toLocaleString()} Ar</span></div>
                </div>
              )}
              <p style={{ color: "var(--slate)", fontSize: ".8rem", marginTop: 12 }}>
                La réservation est acceptée dès réception de l'acompte.
              </p>
            </div>

            <button className="btn btn-primary btn-lg btn-full" type="submit" disabled={loading || !telVerifie}>
              {loading ? <><span className="spinner" /> Traitement…</> : !telVerifie ? "Vérifiez votre numéro pour continuer" : "Confirmer l'envoi"}
            </button>
          </form>

          {/* Summary */}
          <aside>
            <div className="card summary-card">
              <h3>Résumé du colis</h3>
              <div className="summary-row"><span className="lbl">De</span><span className="val">{form.ville_depart || "—"}</span></div>
              <div className="summary-row"><span className="lbl">Vers</span><span className="val">{form.ville_arrivee || "—"}</span></div>
              <div className="summary-row"><span className="lbl">Poids</span><span className="val">{form.poids_kg ? `${form.poids_kg} kg` : "—"}</span></div>
              <div className="summary-row"><span className="lbl">Date dépôt</span><span className="val">{form.date_depot || "—"}</span></div>
              <hr className="divider" style={{ margin: "10px 0" }} />
              <div style={{ fontSize: ".8rem", color: "var(--slate)", marginBottom: 6 }}>Tarification :</div>
              <div className="summary-row"><span className="lbl">Base</span><span className="val">5 000 Ar</span></div>
              {form.poids_kg && <div className="summary-row"><span className="lbl">Poids ({Math.ceil(parseFloat(form.poids_kg))} kg)</span><span className="val">{(Math.ceil(parseFloat(form.poids_kg))*2000).toLocaleString()} Ar</span></div>}
              <div className="summary-total">
                <span className="lbl">Estimé</span>
                <span className="val">{prix > 0 ? `${prix.toLocaleString()} Ar` : "—"}</span>
              </div>
              {prix > 0 && (
                <>
                  <hr className="divider" style={{ margin: "10px 0" }} />
                  <div className="summary-row"><span className="lbl">Acompte ({Math.round(TAUX_ACOMPTE * 100)}%)</span><span className="val" style={{ color: "var(--orange-d)", fontWeight: 700 }}>{calculAcompte(prix).acompte.toLocaleString()} Ar</span></div>
                  <div className="summary-row"><span className="lbl">Solde au dépôt</span><span className="val">{calculAcompte(prix).solde.toLocaleString()} Ar</span></div>
                </>
              )}
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    "Tarif 2 000 Ar/kg",
                    "Suivi code unique",
                    "Livraison garantie",
                  ].map(txt => (
                    <div key={txt} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: ".82rem", color: "var(--slate)" }}>
                      <span>{txt}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
