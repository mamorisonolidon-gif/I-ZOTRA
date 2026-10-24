export default function Header({ page, setPage }) {
  const links = [
    { label: "Accueil", key: "home" },
    { label: "Taxi Brousse", key: "book-taxi" },
    { label: "Taxi Station", key: "book-navette" },
    { label: "Colis", key: "book-colis" },
    { label: "Suivi", key: "tracking" },
    { label: "Admin", key: "admin" },
  ];
  return (
    <header className="header">
      <div className="header-inner">
        <a className="logo" onClick={() => setPage("home")} style={{ cursor: "pointer" }}>
          <div className="" >
            <img
            src="/src/image/logo1.png"
            alt="logo"
            style={{
              width: "100px",   // 🔽 réduire ici
              height: "70px",
              objectFit: "cover",
              paddingRight:"10px"
              
            }}
          />
            </div>
          <div>
            <span className="logo-text">I-Zotra </span>
            <span className="logo-sub">Réservation & Colis</span>
          </div>
        </a>
        <nav className="nav">
          {links.map((l) => (
            <a
              key={l.key}
              className={page === l.key ? "active" : ""}
              onClick={() => setPage(l.key)}
              style={{ cursor: "pointer" }}
            >
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
