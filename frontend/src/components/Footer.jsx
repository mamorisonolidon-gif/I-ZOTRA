export default function Footer({ setPage }) {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}> 
              <div style={{ width: 32, height: 32, background: "#47413d", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".78rem", fontWeight: 800, color: "#fff" }}> <img
            src="/src/image/logo1.png"
            alt="logo"
            style={{
              width: "100px",   // 🔽 réduire ici
              height: "70px",
              objectFit: "cover",
              paddingRight:"10px"
              
            }}
          /></div>
              <span style={{ color: "#fff", fontWeight: 800, fontSize: "1rem" }}>I-SOTRA</span>
            </div>
            <p style={{ fontSize: ".88rem", lineHeight: 1.8, maxWidth: 300 }}>
              Votre plateforme nationale de réservation de taxi-brousse et d'envoi de colis partout à Madagascar.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              {["Facebook", "Instagram", "YouTube"].map((s) => (
                <div key={s} style={{ padding: "0 12px", height: 36, background: "rgba(255,255,255,.1)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: ".78rem", color: "#fff" }}>{s}</div>
              ))}
            </div>
          </div>
          <div>
            <h4>Services</h4>
            <ul>
              {["I-ZOTRA", "Taxi Station → Domicile", "Envoi de colis", "Suivi en temps réel"].map((s) => (
                <li key={s}><a href="#">{s}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <ul>
              <li><a href="#">+261 38 19 832 26</a></li>
              <li><a href="#">contact@taxibrousse.mg</a></li>
              <li><a href="#">Antananarivo, Madagascar</a></li>
              <li style={{ marginTop: 12 }}>
                <span style={{ fontSize: ".8rem", background: "rgba(249,115,22,.18)", color: "#FDBA74", padding: "4px 10px", borderRadius: 99 }}>Ouvert 6h – 20h</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2025 TaxiBrousse.mg — Tous droits réservés</span>
          <span>Fait pour Madagascar</span>
        </div>
      </div>
    </footer>
  );
}
