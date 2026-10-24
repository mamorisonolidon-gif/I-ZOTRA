export default function Confirmation({ data, setPage }) {
  if (!data) { setPage("home"); return null; }
  const isTaxi = data.type === "taxi";
  const isNavette = data.type === "navette";

  const copyCode = () => {
    navigator.clipboard?.writeText(data.code);
  };

  return (
    <div className="page-enter" style={{ padding: "60px 0 100px" }}>
      <div className="container">
        <div className="confirmation">
          <div className="confirm-icon">✓</div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "2rem", fontWeight: 800, marginBottom: 8 }}>
            {isTaxi ? "Réservation acceptée" : isNavette ? "Course réservée" : "Colis enregistré"}
          </h1>
          <p style={{ color: "var(--slate)", fontSize: "1.05rem", marginBottom: 24 }}>
            {isTaxi
              ? `Votre place sur le trajet ${data.trajet} est réservée. L'acompte a été reçu.`
              : isNavette
              ? `Votre taxi vous récupérera à ${data.stationnement} pour vous déposer à votre domicile. L'acompte a été reçu.`
              : `Votre colis ${data.trajet} a été enregistré. L'acompte a été reçu.`}
          </p>

          <div>
            <p style={{ color: "var(--slate)", fontSize: ".9rem", marginBottom: 8 }}>Votre code de réservation</p>
            <div className="code-display" onClick={copyCode} style={{ cursor: "pointer" }} title="Cliquer pour copier">
              {data.code}
            </div>
            <p style={{ fontSize: ".8rem", color: "var(--slate)", marginTop: 6 }}>Cliquez pour copier • Conservez ce code précieusement</p>
          </div>

          <div style={{ display: "flex", gap: 16, justifyContent: "center", margin: "36px 0", flexWrap: "wrap" }}>
            {[
              [isTaxi ? "Trajet" : isNavette ? "Itinéraire" : "Itinéraire", data.trajet],
              [isTaxi ? "Date" : isNavette ? "Date" : "Date de dépôt", data[isTaxi || isNavette ? "date_depart" : "date_depot"]],
              ...(isTaxi || isNavette ? [["Heure", data.heure_depart]] : []),
              ...(isNavette ? [["Distance estimée", `${data.distance_km} km`]] : []),
              ["Prix total", `${data.prix_total?.toLocaleString()} Ar`],
              ["Acompte versé", `${data.acompte_ar?.toLocaleString()} Ar`],
              ["Solde restant", `${data.solde_ar?.toLocaleString()} Ar`],
            ].map(([lbl, val]) => (
              <div key={lbl} style={{ background: "#fff", border: "1.5px solid var(--border)", borderRadius: 12, padding: "16px 24px", minWidth: 150, textAlign: "center" }}>
                <div style={{ fontSize: ".76rem", color: "var(--slate)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>{lbl}</div>
                <div style={{ fontWeight: 700, fontSize: ".95rem" }}>{val}</div>
              </div>
            ))}
          </div>

          <div style={{ background: "#fff", border: "1.5px solid var(--border)", borderRadius: 12, padding: "18px 24px", maxWidth: 480, margin: "0 auto 36px", textAlign: "left" }}>
            <p style={{ fontWeight: 700, color: "var(--night)", marginBottom: 8 }}>Informations importantes</p>
            {isTaxi ? (
              <ul style={{ color: "var(--slate)", fontSize: ".88rem", paddingLeft: 18, lineHeight: 2 }}>
                <li>Présentez-vous 15 minutes avant le départ</li>
                <li>Apportez votre pièce d'identité</li>
                <li>Le solde restant se règle auprès du chauffeur</li>
                <li>Code de réservation à présenter : <strong>{data.code}</strong></li>
              </ul>
            ) : isNavette ? (
              <ul style={{ color: "var(--slate)", fontSize: ".88rem", paddingLeft: 18, lineHeight: 2 }}>
                <li>Soyez présent au stationnement à l'heure indiquée</li>
                <li>Le chauffeur vous appellera au numéro fourni</li>
                <li>Le solde restant se règle directement au chauffeur</li>
                <li>Code de réservation à présenter : <strong>{data.code}</strong></li>
              </ul>
            ) : (
              <ul style={{ color: "var(--slate)", fontSize: ".88rem", paddingLeft: 18, lineHeight: 2 }}>
                <li>Déposez votre colis bien emballé</li>
                <li>Présentez ce code au dépôt : <strong>{data.code}</strong></li>
                <li>Le solde restant se règle au dépôt</li>
                <li>Utilisez le suivi pour connaître l'état de votre colis</li>
              </ul>
            )}
          </div>

          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn btn-primary btn-lg" onClick={() => setPage("tracking")}>
              Suivre ma {isTaxi ? "réservation" : isNavette ? "course" : "colis"}
            </button>
            <button className="btn btn-outline btn-lg" onClick={() => setPage("home")}>
              ← Retour à l'accueil
            </button>
            <button className="btn btn-outline btn-lg" onClick={() => setPage(isTaxi ? "book-taxi" : isNavette ? "book-navette" : "book-colis")}>
              + Nouvelle réservation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
