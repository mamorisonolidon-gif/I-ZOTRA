import { useState, useEffect } from "react";
import { API } from "../config";
import VerificationTelephone from "../components/VerificationTelephone";

const HEURES = ["05:00","05:30","06:00","06:30","07:00","07:30","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"];
const VILLES = ["Antananarivo","Toamasina","Mahajanga","Fianarantsoa","Toliara","Antsiranana","Antsirabe","Moramanga","Ambositra","Manakara","Fort-Dauphin","Sambava","Morondava","Ambatolampy","Maevatanana"];
const TAUX_ACOMPTE = 0.30;
const MODES_PAIEMENT = ["Mvola", "Orange Money", "Airtel Money", "Espèces"];

function calculAcompte(prixTotal) {
  const acompte = Math.ceil((prixTotal * TAUX_ACOMPTE) / 100) * 100;
  return { acompte, solde: prixTotal - acompte };
}

function SiegeBtn({ n, occupe, selectionne, onClick }) {
  const etat = occupe ? "occupee" : selectionne ? "selectionne" : "libre";
  const icone = occupe ? "🚫" : selectionne ? "✅" : "💺";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={occupe}
      aria-pressed={selectionne}
      aria-label={occupe ? `Place ${n}, occupée` : selectionne ? `Place ${n}, sélectionnée` : `Place ${n}, libre`}
      title={occupe ? `Place ${n} — déjà réservée` : selectionne ? `Place ${n} — sélectionnée` : `Place ${n} — disponible`}
      className={`siege ${etat}`}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1.1, gap: 2 }}
    >
      <span style={{ fontSize: "1.70em" }} aria-hidden="true">{icone}</span>
      <span style={{ fontSize: ".70em", fontWeight: 700 }}>{n}</span>
    </button>
  );
}

export default function BookTaxi({ bookingData, setPage, setConfirmation }) {
  const [trajets, setTrajets] = useState([]);
  const [selectedTrajet, setSelectedTrajet] = useState(bookingData?.trajet || null);
  const [villeDepart, setVilleDepart] = useState(bookingData?.trajet?.ville_depart || "");
  const [villeArrivee, setVilleArrivee] = useState(bookingData?.trajet?.ville_arrivee || "");
  const [form, setForm] = useState({ nom_passager: "", prenom_passager: "", telephone: "", email: "", date_depart: "", heure_depart: "07:00", mode_paiement: "Mvola" });
  const [sieges, setSieges] = useState([]);
  const [placesOccupees, setPlacesOccupees] = useState([]);
  const [loadingSieges, setLoadingSieges] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [telVerifie, setTelVerifie] = useState(false);

  const capacite = selectedTrajet?.places_totales || 20;

  // Charge les places déjà réservées dès qu'on connaît le trajet, la date et l'heure
  useEffect(() => {
    if (!selectedTrajet || !form.date_depart || !form.heure_depart) { setPlacesOccupees([]); return; }
    setLoadingSieges(true);
    const params = new URLSearchParams({ date: form.date_depart, heure: form.heure_depart });
    fetch(`${API}/api/trajets/${selectedTrajet.id}/sieges?${params}`)
      .then(r => r.json())
      .then(d => {
        setPlacesOccupees(d.places_occupees || []);
        // Retire de la sélection toute place qui viendrait d'être prise
        setSieges(prev => prev.filter(s => !(d.places_occupees || []).includes(s)));
      })
      .catch(() => setPlacesOccupees([]))
      .finally(() => setLoadingSieges(false));
  }, [selectedTrajet, form.date_depart, form.heure_depart]);

  const choisirTrajet = t => {
    setSelectedTrajet(t);
    setSieges([]);
  };

  const toggleSiege = n => {
    if (placesOccupees.includes(n)) return;
    setSieges(prev => prev.includes(n) ? prev.filter(s => s !== n) : [...prev, n]);
  };

  const chargerTrajets = (dep = villeDepart, arr = villeArrivee) => {
    const params = new URLSearchParams();
    if (dep) params.set("depart", dep);
    if (arr) params.set("arrivee", arr);
    fetch(`${API}/api/trajets?${params}`).then(r => r.json()).then(list => {
      setTrajets(list);
      if (selectedTrajet && !list.some(t => t.id === selectedTrajet.id)) {
        setSelectedTrajet(null);
      }
    }).catch(() => {});
  };

  useEffect(() => {
    chargerTrajets();
    
  }, []);

  const handleFiltre = (dep, arr) => {
    setVilleDepart(dep);
    setVilleArrivee(arr);
    chargerTrajets(dep, arr);
  };

  const inverserVilles = () => {
    const nouveauDep = villeArrivee, nouvelArr = villeDepart;
    setVilleDepart(nouveauDep);
    setVilleArrivee(nouvelArr);
    chargerTrajets(nouveauDep, nouvelArr);
  };

  const change = e => {
    const { name, value } = e.target;
    if (name === "telephone") setTelVerifie(false); // laharana vaovao = tsy maintsy averina hamarinina
    setForm(p => ({ ...p, [name]: value }));
  };

  const submit = async e => {
    e.preventDefault();
    if (!selectedTrajet) { setError("Veuillez sélectionner un trajet."); return; }
    if (sieges.length === 0) { setError("Veuillez choisir au moins une place."); return; }
    if (!telVerifie) { setError("Veuillez vérifier votre numéro de téléphone (code SMS)."); return; }
    setLoading(true); setError("");
    try {
      const r = await fetch(`${API}/api/reservations/taxi`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trajet_id: selectedTrajet.id, ...form, sieges }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.detail); }
      const data = await r.json();
      setConfirmation({ ...data, type: "taxi", nom: `${form.prenom_passager} ${form.nom_passager}` });
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

  const prixTotal = selectedTrajet ? selectedTrajet.prix_ar * sieges.length : 0;
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="booking-page page-enter">
      <div className="container">
        <div style={{ marginBottom: 32 }}>
          <button className="btn btn-outline btn-sm" onClick={() => setPage("home")}>← Retour</button>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.6rem", fontWeight: 800, marginTop: 16 }}>
            Réserver un Taxi Brousse
          </h1>
          <p style={{ color: "var(--slate)", marginTop: 4 }}>Remplissez le formulaire pour confirmer votre place</p>
        </div>

        <div className="booking-layout">
          <form onSubmit={submit} className="form-section">
            {error && <div className="alert alert-error">{error}</div>}

            {/* Choix du trajet */}
            <div className="card">
              <h2 style={{ fontFamily:  "Cambria, Cochin, Georgia, Times, 'Times New Roman', serif", fontSize: "1.1rem", marginBottom: 16 }}>Choisir un trajet</h2>

              {/* Départ / Destination */}
              <div className="form-grid-2" style={{ marginBottom: 16, alignItems: "end" }}>
                <div className="field">
                  <label>Départ</label>
                  <select value={villeDepart} onChange={e => handleFiltre(e.target.value, villeArrivee)}>
                    <option value="">Toutes les villes</option>
                    {VILLES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Destination</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <select style={{ flex: 1 }} value={villeArrivee} onChange={e => handleFiltre(villeDepart, e.target.value)}>
                      <option value="">Toutes les villes</option>
                      {VILLES.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      title="Inverser départ / destination"
                      onClick={inverserVilles}
                      style={{ padding: "0 12px" }}
                    >
                      ⇄
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ maxHeight: 300, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                {trajets.length === 0 && (
                  <p style={{ color: "var(--slate)", fontSize: ".88rem", padding: "8px 0" }}>
                    Aucun trajet ne correspond à cette recherche.
                  </p>
                )}
                {trajets.map(t => (
                  <div key={t.id}
                    onClick={() => choisirTrajet(t)}
                    style={{
                      padding: "12px 16px", borderRadius: 8, cursor: "pointer",
                      border: `2px solid ${selectedTrajet?.id === t.id ? "var(--orange)" : "var(--border)"}`,
                      background: selectedTrajet?.id === t.id ? "var(--orange-l)" : "var(--white)",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      transition: "all .15s",
                    }}>
                    <span style={{ fontWeight: 600 }}>{t.ville_depart} → {t.ville_arrivee}</span>
                    <div style={{ display: "flex", gap: 14, alignItems: "center", fontSize: ".85rem", color: "var(--slate)" }}>
                      <span>{t.duree_heures}h</span>
                      <span style={{ fontWeight: 700, color: "var(--orange)", fontSize: "1rem" }}>{t.prix_ar.toLocaleString()} Ar</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Infos voyage */}
            <div className="card">
              <h2 style={{ fontFamily: " Cambria, Cochin, Georgia, Times, 'Times New Roman', serif", fontSize: "1.1rem", marginBottom: 16 }}>Détails du voyage</h2>
              <div className="form-grid-2" style={{ marginBottom: 16 }}>
                <div className="field">
                  <label>Date de départ</label>
                  <input type="date" name="date_depart" value={form.date_depart} min={today} onChange={change} required />
                </div>
                <div className="field">
                  <label>Heure de départ</label>
                  <select name="heure_depart" value={form.heure_depart} onChange={change}>
                    {HEURES.map(h => <option key={h}>{h}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Plan des sièges */}
            <div className="card">
              <h2 style={{ fontFamily: " Cambria, Cochin, Georgia, Times, 'Times New Roman', serif", fontSize: "1.1rem", marginBottom: 4 }}>Choisir vos places</h2>
              <p style={{ color: "var(--slate)", fontSize: ".83rem", marginBottom: 16 }}>
                Véhicule de {capacite} places — cliquez sur les sièges libres.
              </p>

              {!selectedTrajet ? (
                <p style={{ color: "var(--slate)", fontSize: ".88rem" }}>Sélectionnez d'abord un trajet ci-dessus.</p>
              ) : !form.date_depart ? (
                <p style={{ color: "var(--slate)", fontSize: ".88rem" }}>Choisissez une date de départ pour voir les places disponibles.</p>
              ) : (
                <>
                  {/* Légende */}
                  <div style={{ display: "flex", gap: 18, marginBottom: 16, fontSize: ".8rem", color: "var(--slate)", flexWrap: "wrap" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span aria-hidden="true">💺</span>Libre</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span aria-hidden="true">✅</span>Sélectionné</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span aria-hidden="true">🚫</span>Occupé</span>
                  </div>

                  {/* Cabine conducteur */}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8, paddingRight: 4 }}>
                    <div style={{ fontSize: ".75rem", color: "var(--slate)", padding: "4px 10px", border: "1px dashed var(--border)", borderRadius: 6 }}>
                      
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10, opacity: loadingSieges ? 0.5 : 1 }}>
                    {Array.from({ length: Math.ceil(capacite / 4) }).map((_, rowIdx) => {
                      const base = rowIdx * 4;
                      const numeros = [base + 1, base + 2, base + 3, base + 4].filter(n => n <= capacite);
                      return (
                        <div key={rowIdx} style={{ display: "flex", gap: 24, justifyContent: "center" }}>
                          <div style={{ display: "flex", gap: 8 }}>
                            {numeros.slice(0, 2).map(n => (
                              (n === 1 || n === 2)
                                ? <div key={n} style={{ width: 40, height: 40 }} />
                                : <SiegeBtn key={n} n={n} occupe={placesOccupees.includes(n)} selectionne={sieges.includes(n)} onClick={() => toggleSiege(n)} />
                            ))}
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            {numeros.slice(2, 4).map(n => (
                              <SiegeBtn key={n} n={n} occupe={placesOccupees.includes(n)} selectionne={sieges.includes(n)} onClick={() => toggleSiege(n)} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: 16, fontSize: ".85rem", color: "var(--slate)" }}>
                    {sieges.length > 0
                      ? <>Places sélectionnées : <strong style={{ color: "var(--charcoal)" }}>{sieges.slice().sort((a,b)=>a-b).join(", ")}</strong></>
                      : "Aucune place sélectionnée."}
                  </div>
                </>
              )}
            </div>

            {/* Acompte */}
            <div className="card">
              <h2 style={{ fontFamily: " Cambria, Cochin, Georgia, Times, 'Times New Roman', serif", fontSize: "1.1rem", marginBottom: 4 }}>Acompte de réservation</h2>
              <p style={{ color: "var(--slate)", fontSize: ".83rem", marginBottom: 16 }}>
                Un acompte de {Math.round(TAUX_ACOMPTE * 100)}% du prix total est demandé pour valider la réservation. Le solde restant se règle directement auprès du chauffeur le jour du départ.
              </p>
              <div className="field" style={{ marginBottom: 16 }}>
                <label>Mode de paiement de l'acompte</label>
                <select name="mode_paiement" value={form.mode_paiement} onChange={change} required>
                  {MODES_PAIEMENT.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              {sieges.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "12px 14px", background: "var(--orange-l)", borderRadius: 8 }}>
                  <div className="summary-row"><span className="lbl">Acompte à verser</span><span className="val" style={{ color: "var(--orange-d)", fontWeight: 700 }}>{calculAcompte(prixTotal).acompte.toLocaleString()} Ar</span></div>
                  <div className="summary-row"><span className="lbl">Solde au départ</span><span className="val">{calculAcompte(prixTotal).solde.toLocaleString()} Ar</span></div>
                </div>
              )}
              <p style={{ color: "var(--slate)", fontSize: ".8rem", marginTop: 12 }}>
                La réservation est acceptée dès réception de l'acompte.
              </p>
            </div>

            {/* Infos passager */}
            <div className="card">
              <h2 style={{ fontFamily: " Cambria, Cochin, Georgia, Times, 'Times New Roman', serif", fontSize: "1.1rem", marginBottom: 16 }}>Informations passager</h2>
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
              <div className="form-grid-2">
                <div className="field">
                  <label>Téléphone</label>
                  <input name="telephone" type="tel" value={form.telephone} onChange={change} placeholder="+261 34 XX XXX XX" required />
                  <VerificationTelephone telephone={form.telephone} verifie={telVerifie} onVerifie={setTelVerifie} />
                </div>
                <div className="field">
                  <label>Email (optionnel)</label>
                  <input name="email" type="email" value={form.email} onChange={change} placeholder="exemple@mail.com" />
                </div>
              </div>
            </div>

            <button className="btn btn-primary btn-lg btn-full" type="submit" disabled={loading || !telVerifie}>
              {loading ? <><span className="spinner" /> Traitement…</> : !telVerifie ? "Vérifiez votre numéro pour continuer" : "Confirmer la réservation"}
            </button>
          </form>

          {/* Summary */}
          <aside>
            <div className="card summary-card">
              <h3>Résumé de la réservation</h3>
              {selectedTrajet ? (
                <>
                  <div className="summary-row"><span className="lbl">Trajet</span><span className="val">{selectedTrajet.ville_depart} → {selectedTrajet.ville_arrivee}</span></div>
                  <div className="summary-row"><span className="lbl">Durée</span><span className="val">{selectedTrajet.duree_heures}h</span></div>
                  <div className="summary-row"><span className="lbl">Date</span><span className="val">{form.date_depart || "—"}</span></div>
                  <div className="summary-row"><span className="lbl">Heure</span><span className="val">{form.heure_depart}</span></div>
                  <div className="summary-row"><span className="lbl">Places</span><span className="val">{sieges.length > 0 ? sieges.slice().sort((a,b)=>a-b).join(", ") : "—"}</span></div>
                  <div className="summary-row"><span className="lbl">Prix/place</span><span className="val">{selectedTrajet.prix_ar.toLocaleString()} Ar</span></div>
                  <div className="summary-total">
                    <span className="lbl">Total</span>
                    <span className="val">{prixTotal.toLocaleString()} Ar</span>
                  </div>
                  {sieges.length > 0 && (
                    <>
                      <hr className="divider" style={{ margin: "10px 0" }} />
                      <div className="summary-row"><span className="lbl">Acompte ({Math.round(TAUX_ACOMPTE * 100)}%)</span><span className="val" style={{ color: "var(--orange-d)", fontWeight: 700 }}>{calculAcompte(prixTotal).acompte.toLocaleString()} Ar</span></div>
                      <div className="summary-row"><span className="lbl">Solde au départ</span><span className="val">{calculAcompte(prixTotal).solde.toLocaleString()} Ar</span></div>
                    </>
                  )}
                  <div style={{ marginTop: 16, padding: "10px 14px", background: "var(--orange-l)", borderRadius: 8, fontSize: ".83rem", color: "var(--orange-d)" }}>
                    La réservation est acceptée dès versement de l'acompte. Le solde se règle auprès du chauffeur le jour du départ.
                  </div>
                </>
              ) : (
                <p style={{ color: "var(--slate)", fontSize: ".88rem" }}>Sélectionnez un trajet pour voir le résumé.</p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
