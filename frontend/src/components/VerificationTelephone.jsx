import { useState } from "react";
import { API } from "../config";

/**
 * Component fanamarinana laharana telefaonina amin'ny OTP (Twilio Verify).
 *
 * Props :
 *  - telephone : ny laharana (string) tokony hamarinina
 *  - verifie   : boolean, midika hoe efa voamarina io laharana io
 *  - onVerifie : fonction (boolean) => void, antsoina rehefa vita fanamarinana
 */
export default function VerificationTelephone({ telephone, verifie, onVerifie }) {
  const [etape, setEtape] = useState("initial"); // "initial" | "envoye"
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const envoyerCode = async () => {
    if (!telephone || telephone.trim().length < 6) {
      setError("Feno aloha ny laharana telefaonina.");
      return;
    }
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const r = await fetch(`${API}/api/otp/envoyer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telephone }),
      });
      if (!r.ok) {
        const e = await r.json();
        throw new Error(e.detail || "Tsy voalefa ny code.");
      }
      const data = await r.json();
      setEtape("envoye");
      if (data.code_simulation) {
        setInfo(`[SIMULATION] Code: ${data.code_simulation} (Ampidiro eto ambany)`);
      } else {
        setInfo("Code nalefa tamin'ny SMS. Ampidiro eto izy.");
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const verifierCode = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`${API}/api/otp/verifier`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telephone, code: code.trim() }),
      });
      if (!r.ok) {
        const e = await r.json();
        throw new Error(e.detail || "Code diso.");
      }
      onVerifie(true);
      setInfo("");
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  // Endrika rehefa efa voamarina
  if (verifie) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: ".83rem",
          fontWeight: 600,
          color: "#15803D",
          background: "#DCFCE7",
          padding: "8px 12px",
          borderRadius: 8,
          marginTop: 8,
        }}
      >
        ✓ Laharana voamarina
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: 10,
        padding: "12px 14px",
        background: "#F8FAFC",
        border: "1px solid var(--border)",
        borderRadius: 8,
      }}
    >
      {error && <div className="alert alert-error" style={{ marginBottom: 10 }}>{error}</div>}
      {info && !error && (
        <p style={{ fontSize: ".82rem", color: "var(--slate)", marginBottom: 10 }}>{info}</p>
      )}

      {etape === "initial" ? (
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={envoyerCode}
          disabled={loading}
        >
          {loading ? "Alefa…" : "Vérifier mon numéro (code SMS)"}
        </button>
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code 6 chiffres"
            style={{
              padding: "8px 10px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              width: 140,
              fontFamily: "monospace",
              letterSpacing: ".08em",
            }}
          />
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={verifierCode}
            disabled={loading || code.trim().length === 0}
          >
            {loading ? "Fanamarinana…" : "Confirmer le code"}
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={envoyerCode}
            disabled={loading}
          >
            Renvoyer
          </button>
        </div>
      )}
    </div>
  );
}
