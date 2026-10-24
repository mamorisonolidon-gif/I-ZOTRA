import { useState, useEffect } from "react";
import { API } from "../config";

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div style={{ background: "#fff", border: "1.5px solid var(--border)", borderRadius: 12, padding: "8px 8px", display: "flex", gap: 16, alignItems: "flex-start" }}>
      <div style={{ width: 48, height: 48, borderRadius: 10, background: color + "18", color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".30rem", fontWeight: 800, letterSpacing: "-.02em", flexShrink: 0 }}>{icon}</div>
      <div>
        <p style={{ fontSize: ".8rem", color: "var(--slate)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>{label}</p>
        <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.6rem", fontWeight: 800, lineHeight: 1 }}>{value}</p>
        {sub && <p style={{ fontSize: ".8rem", color: "var(--slate)", marginTop: 4 }}>{sub}</p>}
      </div>
    </div>
  );
}

export default function Admin({ setPage }) {
  const [tab, setTab] = useState("taxi");
  const [taxiData, setTaxiData] = useState([]);
  const [navetteData, setNavetteData] = useState([]);
  const [colisData, setColisData] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [t, n, c, s] = await Promise.all([
        fetch(`${API}/api/admin/reservations/taxi`).then(r => r.json()),
        fetch(`${API}/api/admin/reservations/navette`).then(r => r.json()),
        fetch(`${API}/api/admin/reservations/colis`).then(r => r.json()),
        fetch(`${API}/api/stats`).then(r => r.json()),
      ]);
      setTaxiData(t); setNavetteData(n); setColisData(c); setStats(s);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatut = async (code, statut) => {
    await fetch(`${API}/api/admin/reservations/colis/${code}/statut?statut=${encodeURIComponent(statut)}`, { method: "PATCH" });
    load();
  };

  return (
    <div className="page-enter" style={{ padding: "48px 0 80px" }}>
      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div>
            <p style={{ fontSize: ".8rem", color: "var(--slate)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Dashboard</p>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.7rem", fontWeight: 800 }}>Administration</h1>
          </div>
          <button className="btn btn-outline" onClick={() => { load(); }}>↺ Actualiser</button>
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 1, marginBottom: 1 ,fontSize: ".88rem"}}>
            <StatCard icon="" color="#14202E" label="Réservations :" value={stats.reservations_taxi} />
            <StatCard icon="" color="#14202E" label="Courses station :" value={stats.reservations_navette} />
            <StatCard icon="" color="#14202E" label="Envois colis :" value={stats.envois_colis} />
            <StatCard icon="" color="#14202E" label="Revenus taxi :" value={`${stats.revenus_taxi_ar?.toLocaleString()} Ar`} />
            <StatCard icon="" color="#14202E" label="Total revenus: " value={`${stats.revenus_total_ar?.toLocaleString()} Ar`} />
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#F1F5F9", padding: 4, borderRadius: 10, width: "fit-content" }}>
          {[["taxi", "Réservations Taxi"], ["navette", "Courses Station"], ["colis", "Envois Colis"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: ".88rem", transition: "all .15s",
                background: tab === key ? "#fff" : "transparent",
                color: tab === key ? "var(--night)" : "var(--slate)",
                boxShadow: tab === key ? "0 1px 4px rgba(0,0,0,.1)" : "none",
              }}>
              {label} <span style={{ fontWeight: 800 }}>({key === "taxi" ? taxiData.length : key === "navette" ? navetteData.length : colisData.length})</span>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {loading ? (
            <p style={{ padding: 32, color: "var(--slate)" }}>Chargement…</p>
          ) : tab === "taxi" ? (
            <div style={{ overflowX: "auto" }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Code</th><th>Passager</th><th>Trajet</th><th>Date</th><th>Heure</th><th>Places</th><th>Total</th><th>Acompte</th><th>Solde</th><th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {taxiData.length === 0 ? (
                    <tr><td colSpan={10} style={{ textAlign: "center", padding: 32, color: "var(--slate)" }}>Aucune réservation</td></tr>
                  ) : taxiData.map(r => (
                    <tr key={r.id}>
                      <td><code style={{ fontWeight: 700, color: "var(--orange)", fontSize: ".85rem" }}>{r.code}</code></td>
                      <td>{r.prenom_passager} {r.nom_passager}<br /><span style={{ fontSize: ".78rem", color: "var(--slate)" }}>{r.telephone}</span></td>
                      <td><strong>{r.ville_depart}</strong> →  {r.ville_arrivee}</td>
                      <td>{r.date_depart}</td>
                      <td>{r.heure_depart}</td>
                      <td style={{ textAlign: "center" }}>{r.nb_places}</td>
                      <td style={{ fontWeight: 700 }}>{r.prix_total?.toLocaleString()} Ar</td>
                      <td>{r.acompte_ar?.toLocaleString()} Ar<br /><span style={{ fontSize: ".76rem", color: "var(--slate)" }}>{r.mode_paiement}</span></td>
                      <td>{r.solde_ar?.toLocaleString()} Ar</td>
                      <td><span className="badge badge-green">{r.statut}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : tab === "navette" ? (
            <div style={{ overflowX: "auto" }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Code</th><th>Passager</th><th>Stationnement</th><th>Destination</th><th>Date</th><th>Heure</th><th>Distance</th><th>Total</th><th>Acompte</th><th>Solde</th><th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {navetteData.length === 0 ? (
                    <tr><td colSpan={11} style={{ textAlign: "center", padding: 32, color: "var(--slate)" }}>Aucune course</td></tr>
                  ) : navetteData.map(r => (
                    <tr key={r.id}>
                      <td><code style={{ fontWeight: 700, color: "var(--orange)", fontSize: ".85rem" }}>{r.code}</code></td>
                      <td>{r.prenom_passager} {r.nom_passager}<br /><span style={{ fontSize: ".78rem", color: "var(--slate)" }}>{r.telephone}</span></td>
                      <td>{r.stationnement_nom} ({r.stationnement_ville})</td>
                      <td>{r.adresse_domicile}<br /><span style={{ fontSize: ".78rem", color: "var(--slate)" }}>{r.quartier_domicile}</span></td>
                      <td>{r.date_course}</td>
                      <td>{r.heure_course}</td>
                      <td style={{ textAlign: "center" }}>{r.distance_km} km</td>
                      <td style={{ fontWeight: 700 }}>{r.prix_total?.toLocaleString()} Ar</td>
                      <td>{r.acompte_ar?.toLocaleString()} Ar<br /><span style={{ fontSize: ".76rem", color: "var(--slate)" }}>{r.mode_paiement}</span></td>
                      <td>{r.solde_ar?.toLocaleString()} Ar</td>
                      <td><span className="badge badge-green">{r.statut}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Code</th><th>Expéditeur</th><th>Trajet</th><th>Poids</th><th>Dépôt</th><th>Prix</th><th>Acompte</th><th>Solde</th><th>Statut</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {colisData.length === 0 ? (
                    <tr><td colSpan={10} style={{ textAlign: "center", padding: 32, color: "var(--slate)" }}>Aucun colis</td></tr>
                  ) : colisData.map(c => (
                    <tr key={c.id}>
                      <td><code style={{ fontWeight: 700, color: "var(--sky)", fontSize: ".85rem" }}>{c.code}</code></td>
                      <td>{c.expediteur_nom}<br /><span style={{ fontSize: ".78rem", color: "var(--slate)" }}>{c.expediteur_tel}</span></td>
                      <td>{c.ville_depart} → {c.ville_arrivee}</td>
                      <td>{c.poids_kg} kg</td>
                      <td>{c.date_depot}</td>
                      <td style={{ fontWeight: 700 }}>{c.prix_total?.toLocaleString()} Ar</td>
                      <td>{c.acompte_ar?.toLocaleString()} Ar<br /><span style={{ fontSize: ".76rem", color: "var(--slate)" }}>{c.mode_paiement}</span></td>
                      <td>{c.solde_ar?.toLocaleString()} Ar</td>
                      <td>
                        <span className={`badge ${c.statut === "en attente" ? "badge-red" : c.statut === "en transit" ? "badge-sky" : "badge-green"}`}>
                          {c.statut}
                        </span>
                      </td>
                      <td>
                        <select
                          value={c.statut}
                          onChange={e => updateStatut(c.code, e.target.value)}
                          style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)", fontSize: ".8rem", cursor: "pointer" }}>
                          <option>en attente</option>
                          <option>en transit</option>
                          <option>livré</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
