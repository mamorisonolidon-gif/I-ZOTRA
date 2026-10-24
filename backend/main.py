"""
API - Taxi Brousse National & Transport Colis
FastAPI + SQLite
"""

import math
import os
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timedelta
from typing import List, Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from twilio.base.exceptions import TwilioRestException
from twilio.rest import Client
from dotenv import load_dotenv

load_dotenv()  # mamaky ny fichier .env raha misy, mba hameno ny os.environ

import random

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "taxibrousse.db")

# ─────────────────────────────────────────────
# TWILIO (vérification de numéro par OTP / SMS)
# ─────────────────────────────────────────────
# Ireto variable ireto dia tsy maintsy apetraka ao amin'ny fichier .env
# (jereo ny .env.example), fa TSY tokony hosoratana mivantana ao anaty code.
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM_NUMBER = os.environ.get("TWILIO_FROM_NUMBER", "")

# Store pending OTPs in memory (telephone -> {"code": "123456", "expire": datetime})
pending_otps = {}

# Ny fotoana maharitry ny fanamarinana ny laharana (minitra) alohan'ny
# hangatahana OTP vaovao indray.
OTP_VALIDITE_MINUTES = 30

app = FastAPI(title="Taxi Brousse National API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
# BASE DE DONNÉES
# ─────────────────────────────────────────────
@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with get_db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS villes (
                id   INTEGER PRIMARY KEY AUTOINCREMENT,
                nom  TEXT NOT NULL UNIQUE,
                region TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS trajets (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                ville_depart  TEXT NOT NULL,
                ville_arrivee TEXT NOT NULL,
                duree_heures  REAL NOT NULL,
                prix_ar       INTEGER NOT NULL,
                places_totales INTEGER DEFAULT 20,
                actif         INTEGER DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS reservations_taxi (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                code          TEXT NOT NULL UNIQUE,
                trajet_id     INTEGER NOT NULL,
                nom_passager  TEXT NOT NULL,
                prenom_passager TEXT NOT NULL,
                telephone     TEXT NOT NULL,
                email         TEXT,
                date_depart   TEXT NOT NULL,
                heure_depart  TEXT NOT NULL,
                nb_places     INTEGER NOT NULL DEFAULT 1,
                sieges        TEXT NOT NULL DEFAULT '',
                prix_total    INTEGER NOT NULL,
                acompte_ar    INTEGER NOT NULL DEFAULT 0,
                solde_ar      INTEGER NOT NULL DEFAULT 0,
                mode_paiement TEXT NOT NULL DEFAULT '',
                statut        TEXT DEFAULT 'confirmée',
                cree_le       TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (trajet_id) REFERENCES trajets(id)
            );

            CREATE TABLE IF NOT EXISTS reservations_colis (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                code            TEXT NOT NULL UNIQUE,
                ville_depart    TEXT NOT NULL,
                ville_arrivee   TEXT NOT NULL,
                expediteur_nom  TEXT NOT NULL,
                expediteur_tel  TEXT NOT NULL,
                destinataire_nom TEXT NOT NULL,
                destinataire_tel TEXT NOT NULL,
                description_colis TEXT NOT NULL,
                poids_kg        REAL NOT NULL,
                date_depot      TEXT NOT NULL,
                prix_total      INTEGER NOT NULL,
                acompte_ar      INTEGER NOT NULL DEFAULT 0,
                solde_ar        INTEGER NOT NULL DEFAULT 0,
                mode_paiement   TEXT NOT NULL DEFAULT '',
                statut          TEXT DEFAULT 'en attente',
                cree_le         TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS otp_verifications (
                telephone     TEXT PRIMARY KEY,
                verifie_le    TEXT NOT NULL,
                valide_jusqu  TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS stationnements (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                nom      TEXT NOT NULL,
                ville    TEXT NOT NULL,
                quartier TEXT NOT NULL,
                actif    INTEGER DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS reservations_navette (
                id                INTEGER PRIMARY KEY AUTOINCREMENT,
                code              TEXT NOT NULL UNIQUE,
                stationnement_id  INTEGER NOT NULL,
                nom_passager      TEXT NOT NULL,
                prenom_passager   TEXT NOT NULL,
                telephone         TEXT NOT NULL,
                adresse_domicile  TEXT NOT NULL,
                quartier_domicile TEXT NOT NULL,
                date_course       TEXT NOT NULL,
                heure_course      TEXT NOT NULL,
                distance_km       REAL NOT NULL,
                nb_passagers      INTEGER NOT NULL DEFAULT 1,
                prix_total        INTEGER NOT NULL,
                acompte_ar        INTEGER NOT NULL DEFAULT 0,
                solde_ar          INTEGER NOT NULL DEFAULT 0,
                mode_paiement     TEXT NOT NULL DEFAULT '',
                statut            TEXT DEFAULT 'confirmée',
                cree_le           TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (stationnement_id) REFERENCES stationnements(id)
            );
            """
        )
        _seed(conn)
        _seed_stationnements(conn)


def _seed(conn):
    villes = [
        ("Antananarivo", "Analamanga"),
        ("Toamasina", "Atsinanana"),
        ("Mahajanga", "Boeny"),
        ("Fianarantsoa", "Haute Matsiatra"),
        ("Toliara", "Atsimo-Andrefana"),
        ("Antsiranana", "Diana"),
        ("Antsirabe", "Vakinankaratra"),
        ("Moramanga", "Alaotra-Mangoro"),
        ("Ambositra", "Amoron'i Mania"),
        ("Manakara", "Vatovavy"),
        ("Fort-Dauphin", "Anosy"),
        ("Sambava", "SAVA"),
        ("Morondava", "Menabe"),
        ("Ambatolampy", "Vakinankaratra"),
        ("Maevatanana", "Betsiboka"),
    ]
    for nom, region in villes:
        try:
            conn.execute("INSERT INTO villes (nom, region) VALUES (?, ?)", (nom, region))
        except Exception:
            pass

    trajets = [
        ("Antananarivo", "Toamasina",    5,   30000, 20),
        ("Antananarivo", "Antsirabe",    2,    8000, 20),
        ("Antananarivo", "Fianarantsoa", 8,   30000, 20),
        ("Antananarivo", "Mahajanga",   12,   45000, 20),
        ("Antananarivo", "Toliara",     16,   55000, 20),
        ("Antananarivo", "Antsiranana", 24,   80000, 20),
        ("Antananarivo", "Morondava",   12,   42000, 20),
        ("Antananarivo", "Moramanga",    3,   12000, 20),
        ("Antananarivo", "Ambositra",    5,   18000, 20),
        ("Antananarivo", "Fort-Dauphin",22,   70000, 20),
        ("Toamasina",    "Antananarivo", 4,   25000, 20),
        ("Fianarantsoa", "Manakara",     5,   20000, 20),
        ("Fianarantsoa", "Toliara",      9,   35000, 20),
        ("Mahajanga",    "Antsiranana", 14,   55000, 20),
        ("Antsirabe",    "Antananarivo", 2,    8000, 20),
        ("Antsirabe",    "Fianarantsoa", 6,   22000, 20),
        ("Moramanga",    "Toamasina",    2,   12000, 20),
        ("Toliara",      "Morondava",   10,   38000, 20),
        ("Sambava",      "Antsiranana",  5,   22000, 20),
        ("Mahajanga",    "Maevatanana",  4,   18000, 20),
    ]
    existing = conn.execute("SELECT COUNT(*) FROM trajets").fetchone()[0]
    if existing == 0:
        conn.executemany(
            "INSERT INTO trajets (ville_depart, ville_arrivee, duree_heures, prix_ar, places_totales) VALUES (?,?,?,?,?)",
            trajets,
        )


def _seed_stationnements(conn):
    """Stationnements (gares routières / stations de taxi) où les clients
    peuvent être récupérés pour une course locale jusqu'à leur domicile."""
    stationnements = [
        ("Analakely",      "Antananarivo", "Antananarivo I"),
        ("Ambodivona",     "Antananarivo", "Antananarivo I"),
        ("67 Hectares",    "Antananarivo", "Antananarivo IV"),
        ("Anosibe",        "Antananarivo", "Antananarivo VI"),
        ("Ambohijatovo",   "Antananarivo", "Antananarivo I"),
        ("Gare routière",  "Toamasina",    "Centre-ville"),
        ("Gare routière",  "Mahajanga",    "Centre-ville"),
        ("Gare routière",  "Fianarantsoa", "Centre-ville"),
        ("Gare routière",  "Toliara",      "Centre-ville"),
        ("Gare routière",  "Antsirabe",    "Centre-ville"),
        ("Gare routière",  "Antsiranana",  "Centre-ville"),
        ("Gare routière",  "Moramanga",    "Centre-ville"),
    ]
    existing = conn.execute("SELECT COUNT(*) FROM stationnements").fetchone()[0]
    if existing == 0:
        conn.executemany(
            "INSERT INTO stationnements (nom, ville, quartier) VALUES (?,?,?)",
            stationnements,
        )


init_db()


# ─────────────────────────────────────────────
# TWILIO — fonction fanampiny
# ─────────────────────────────────────────────
def normaliser_telephone(telephone: str) -> str:
    """Mamerina ny laharana amin'ny endrika E.164 (ohatra: +261341234567),
    izay takin'i Twilio. Mandray laharana malagasy toy ny 034 XX XXX XX."""
    tel = telephone.strip().replace(" ", "").replace("-", "").replace(".", "")
    if tel.startswith("+"):
        return tel
    if tel.startswith("00"):
        return "+" + tel[2:]
    if tel.startswith("0"):
        return "+261" + tel[1:]
    if tel.startswith("261"):
        return "+" + tel
    return "+261" + tel


def get_twilio_client() -> Client:
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN or not TWILIO_VERIFY_SERVICE_SID:
        raise HTTPException(
            500,
            "Configuration Twilio tsy ampy (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / "
            "TWILIO_VERIFY_SERVICE_SID). Jereo ny fichier .env.",
        )
    return Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)


def telephone_est_verifie(conn, telephone: str) -> bool:
    """Mamerina True raha efa nanamarina ny laharany tamin'ny OTP ilay olona,
    ary mbola tsy lasa ny fetrandro (OTP_VALIDITE_MINUTES)."""
    tel = normaliser_telephone(telephone)
    row = conn.execute(
        "SELECT valide_jusqu FROM otp_verifications WHERE telephone = ?", (tel,)
    ).fetchone()
    if not row:
        return False
    return datetime.fromisoformat(row["valide_jusqu"]) > datetime.utcnow()


# ─────────────────────────────────────────────
# PYDANTIC MODELS
# ─────────────────────────────────────────────
TAUX_ACOMPTE = 0.30  # 30% du prix total à verser à l'avance pour valider la réservation
MODES_PAIEMENT = ("Mvola", "Orange Money", "Airtel Money", "Espèces")


def calcul_acompte(prix_total: int) -> dict:
    acompte = math.ceil((prix_total * TAUX_ACOMPTE) / 100) * 100
    return {"acompte_ar": acompte, "solde_ar": prix_total - acompte}


class ReservationTaxiRequest(BaseModel):
    trajet_id: int
    nom_passager: str
    prenom_passager: str
    telephone: str
    email: Optional[str] = None
    date_depart: str   # format: YYYY-MM-DD
    heure_depart: str  # ex: "07:00"
    sieges: List[int] = Field(..., min_length=1, max_length=20)
    mode_paiement: Literal["Mvola", "Orange Money", "Airtel Money", "Espèces"]


class ReservationColisRequest(BaseModel):
    ville_depart: str
    ville_arrivee: str
    expediteur_nom: str
    expediteur_tel: str
    destinataire_nom: str
    destinataire_tel: str
    description_colis: str
    poids_kg: float = Field(..., gt=0)
    date_depot: str  # YYYY-MM-DD
    mode_paiement: Literal["Mvola", "Orange Money", "Airtel Money", "Espèces"]


class OtpEnvoyerRequest(BaseModel):
    telephone: str


class OtpVerifierRequest(BaseModel):
    telephone: str
    code: str


class ReservationNavetteRequest(BaseModel):
    stationnement_id: int
    nom_passager: str
    prenom_passager: str
    telephone: str
    adresse_domicile: str
    quartier_domicile: str
    date_course: str   # YYYY-MM-DD
    heure_course: str  # ex: "07:00"
    distance_km: float = Field(..., gt=0, le=60)
    nb_passagers: int = Field(1, ge=1, le=4)
    mode_paiement: Literal["Mvola", "Orange Money", "Airtel Money", "Espèces"]


BASE_NAVETTE_AR = 4000       # prise en charge fixe au stationnement
TARIF_KM_AR = 1200           # par kilomètre
SUPPLEMENT_PASSAGER_AR = 1000  # par passager supplémentaire au-delà du premier


def prix_navette(distance_km: float, nb_passagers: int = 1) -> int:
    """Tarif d'une course stationnement → domicile :
    prise en charge fixe + tarif/km + supplément passagers supplémentaires,
    arrondi au 100 Ar supérieur."""
    brut = BASE_NAVETTE_AR + (distance_km * TARIF_KM_AR) + (max(nb_passagers - 1, 0) * SUPPLEMENT_PASSAGER_AR)
    return math.ceil(brut / 100) * 100


def prix_colis(poids_kg: float, ville_dep: str, ville_arr: str) -> int:
    """Tarif colis : base 5000 Ar + 2000 Ar/kg + 1000 Ar si longue distance."""
    base = 5000
    poids_cost = math.ceil(poids_kg) * 100
    # bonus distance (simplifié)
    villes_lointaines = {"Antsiranana", "Fort-Dauphin", "Sambava", "Toliara"}
    loin = 1500 if (ville_dep in villes_lointaines or ville_arr in villes_lointaines) else 0
    return base + poids_cost + loin


# ─────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "Taxi Brousse National API"}


@app.get("/api/villes")
def get_villes():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM villes ORDER BY nom").fetchall()
        return [dict(r) for r in rows]


@app.get("/api/trajets")
def search_trajets(depart: Optional[str] = None, arrivee: Optional[str] = None):
    with get_db() as conn:
        query = "SELECT * FROM trajets WHERE actif = 1"
        params = []
        if depart:
            query += " AND LOWER(ville_depart) LIKE LOWER(?)"
            params.append(f"%{depart}%")
        if arrivee:
            query += " AND LOWER(ville_arrivee) LIKE LOWER(?)"
            params.append(f"%{arrivee}%")
        rows = conn.execute(query, params).fetchall()
        return [dict(r) for r in rows]


@app.get("/api/trajets/{trajet_id}")
def get_trajet(trajet_id: int):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM trajets WHERE id = ?", (trajet_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Trajet introuvable")
        return dict(row)


@app.get("/api/trajets/{trajet_id}/sieges")
def get_sieges(trajet_id: int, date: str, heure: str):
    """Retourne la capacité du véhicule et la liste des places déjà occupées
    pour un trajet, une date et une heure de départ données."""
    with get_db() as conn:
        trajet = conn.execute("SELECT * FROM trajets WHERE id = ?", (trajet_id,)).fetchone()
        if not trajet:
            raise HTTPException(404, "Trajet introuvable")
        rows = conn.execute(
            """SELECT sieges FROM reservations_taxi
               WHERE trajet_id = ? AND date_depart = ? AND heure_depart = ?
               AND statut != 'annulée'""",
            (trajet_id, date, heure),
        ).fetchall()
        occupees = []
        for r in rows:
            if r["sieges"]:
                occupees.extend(int(s) for s in r["sieges"].split(",") if s)
        return {
            "places_totales": trajet["places_totales"],
            "places_occupees": sorted(set(occupees)),
        }


@app.get("/api/stationnements")
def get_stationnements(ville: Optional[str] = None):
    """Liste des stationnements (gares routières) où une navette
    peut récupérer un passager pour le déposer à son domicile."""
    with get_db() as conn:
        query = "SELECT * FROM stationnements WHERE actif = 1"
        params = []
        if ville:
            query += " AND LOWER(ville) LIKE LOWER(?)"
            params.append(f"%{ville}%")
        query += " ORDER BY ville, nom"
        rows = conn.execute(query, params).fetchall()
        return [dict(r) for r in rows]


@app.get("/api/stationnements/villes")
def get_stationnements_villes():
    """Liste des villes disposant d'au moins un stationnement actif."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT DISTINCT ville FROM stationnements WHERE actif = 1 ORDER BY ville"
        ).fetchall()
        return [r["ville"] for r in rows]


@app.post("/api/otp/envoyer")
def envoyer_otp(req: OtpEnvoyerRequest):
    """Mandefa code OTP amin'ny SMS, na amin'ny alalan'ny Twilio SMS na amin'ny simulation."""
    tel = normaliser_telephone(req.telephone)
    
    # 1. Mamorona code 6 digits
    code = f"{random.randint(100000, 999999)}"
    expiration = datetime.utcnow() + timedelta(minutes=10)
    pending_otps[tel] = {"code": code, "expire": expiration}

    # 2. Andramana handefasana SMS raha misy configuration Twilio
    if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER:
        try:
            client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            message = client.messages.create(
                body=f"Ny kaody fanamarinana Taxi Brousse anao dia: {code}",
                from_=TWILIO_FROM_NUMBER,
                to=tel
            )
            # Voalefa soa aman-tsara ny SMS
            return {
                "message": "Code OTP nalefa amin'ny SMS",
                "telephone": tel,
                "statut": "pending",
            }
        except Exception as e:
            # Fallback amin'ny simulation raha misy diso amin'ny Twilio
            print(f"\n[FALLBACK SIMULATION OTP] Twilio error: {e}")
            print(f"[FALLBACK SIMULATION OTP] Laharana: {tel} | Code: {code}\n")
            return {
                "message": "Simulation (Twilio error): Code OTP nalefa",
                "telephone": tel,
                "statut": "pending",
                "code_simulation": code
            }
    else:
        # Tsy ampy configuration dia simulation
        print(f"\n[SIMULATION OTP] Laharana: {tel} | Code: {code}\n")
        return {
            "message": "Simulation (No Twilio config): Code OTP nalefa",
            "telephone": tel,
            "statut": "pending",
            "code_simulation": code
        }


@app.post("/api/otp/verifier")
def verifier_otp(req: OtpVerifierRequest):
    """Manamarina ny code OTP nalefan'ny mpampiasa, ary raha marina,
    mitahiry io laharana io ho 'voamarina' mandritra ny OTP_VALIDITE_MINUTES."""
    tel = normaliser_telephone(req.telephone)
    code_entree = req.code.strip()

    if tel not in pending_otps:
        raise HTTPException(400, "Tsy misy code nalefa amin'io laharana io. Andramo indray.")

    otp_data = pending_otps[tel]
    if datetime.utcnow() > otp_data["expire"]:
        if tel in pending_otps:
            del pending_otps[tel]
        raise HTTPException(400, "Code efa lany daty. Andramo indray.")

    if otp_data["code"] != code_entree:
        raise HTTPException(400, "Code diso. Andramo indray.")

    # Nahomby ny fanamarinana
    if tel in pending_otps:
        del pending_otps[tel]

    with get_db() as conn:
        maintsy = datetime.utcnow()
        valide_jusqu = maintsy + timedelta(minutes=OTP_VALIDITE_MINUTES)
        conn.execute(
            """INSERT INTO otp_verifications (telephone, verifie_le, valide_jusqu)
               VALUES (?, ?, ?)
               ON CONFLICT(telephone) DO UPDATE SET
                   verifie_le = excluded.verifie_le,
                   valide_jusqu = excluded.valide_jusqu""",
            (tel, maintsy.isoformat(), valide_jusqu.isoformat()),
        )
    return {"message": "Laharana voamarina", "telephone": tel}


@app.post("/api/reservations/taxi")
def reserver_taxi(req: ReservationTaxiRequest):
    with get_db() as conn:
        if not telephone_est_verifie(conn, req.telephone):
            raise HTTPException(
                403,
                "Veuillez d'abord vérifier votre numéro de téléphone (code SMS) avant de réserver.",
            )

        trajet = conn.execute("SELECT * FROM trajets WHERE id = ?", (req.trajet_id,)).fetchone()
        if not trajet:
            raise HTTPException(404, "Trajet introuvable")

        # Vérifie que les numéros de sièges demandés sont valides et libres
        capacite = trajet["places_totales"]
        sieges_demandes = sorted(set(req.sieges))
        if any(s < 1 or s > capacite for s in sieges_demandes):
            raise HTTPException(400, f"Numéro de siège invalide (véhicule de {capacite} places)")

        rows = conn.execute(
            """SELECT sieges FROM reservations_taxi
               WHERE trajet_id = ? AND date_depart = ? AND heure_depart = ?
               AND statut != 'annulée'""",
            (req.trajet_id, req.date_depart, req.heure_depart),
        ).fetchall()
        occupees = set()
        for r in rows:
            if r["sieges"]:
                occupees.update(int(s) for s in r["sieges"].split(",") if s)
        conflit = occupees.intersection(sieges_demandes)
        if conflit:
            raise HTTPException(
                409, f"Place(s) déjà réservée(s) : {', '.join(str(s) for s in sorted(conflit))}"
            )

        nb_places = len(sieges_demandes)
        prix_total = trajet["prix_ar"] * nb_places
        paiement = calcul_acompte(prix_total)
        code = "TB-" + uuid.uuid4().hex[:8].upper()
        conn.execute(
            """INSERT INTO reservations_taxi
               (code, trajet_id, nom_passager, prenom_passager, telephone, email,
                date_depart, heure_depart, nb_places, sieges, prix_total,
                acompte_ar, solde_ar, mode_paiement)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                code, req.trajet_id, req.nom_passager, req.prenom_passager,
                req.telephone, req.email, req.date_depart, req.heure_depart,
                nb_places, ",".join(str(s) for s in sieges_demandes), prix_total,
                paiement["acompte_ar"], paiement["solde_ar"], req.mode_paiement,
            ),
        )
    return {
        "code": code,
        "message": "Réservation acceptée : acompte reçu",
        "trajet": f"{trajet['ville_depart']} → {trajet['ville_arrivee']}",
        "sieges": sieges_demandes,
        "prix_total": prix_total,
        "acompte_ar": paiement["acompte_ar"],
        "solde_ar": paiement["solde_ar"],
        "mode_paiement": req.mode_paiement,
        "date_depart": req.date_depart,
        "heure_depart": req.heure_depart,
    }


@app.post("/api/reservations/colis")
def envoyer_colis(req: ReservationColisRequest):
    prix = prix_colis(req.poids_kg, req.ville_depart, req.ville_arrivee)
    paiement = calcul_acompte(prix)
    code = "CP-" + uuid.uuid4().hex[:8].upper()
    with get_db() as conn:
        if not telephone_est_verifie(conn, req.expediteur_tel):
            raise HTTPException(
                403,
                "Veuillez d'abord vérifier votre numéro de téléphone (code SMS) avant d'envoyer un colis.",
            )

        conn.execute(
            """INSERT INTO reservations_colis
               (code, ville_depart, ville_arrivee, expediteur_nom, expediteur_tel,
                destinataire_nom, destinataire_tel, description_colis, poids_kg,
                date_depot, prix_total, acompte_ar, solde_ar, mode_paiement)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                code, req.ville_depart, req.ville_arrivee, req.expediteur_nom,
                req.expediteur_tel, req.destinataire_nom, req.destinataire_tel,
                req.description_colis, req.poids_kg, req.date_depot, prix,
                paiement["acompte_ar"], paiement["solde_ar"], req.mode_paiement,
            ),
        )
    return {
        "code": code,
        "message": "Réservation acceptée : acompte reçu",
        "trajet": f"{req.ville_depart} → {req.ville_arrivee}",
        "prix_total": prix,
        "acompte_ar": paiement["acompte_ar"],
        "solde_ar": paiement["solde_ar"],
        "mode_paiement": req.mode_paiement,
        "date_depot": req.date_depot,
    }


@app.post("/api/reservations/navette")
def reserver_navette(req: ReservationNavetteRequest):
    with get_db() as conn:
        if not telephone_est_verifie(conn, req.telephone):
            raise HTTPException(
                403,
                "Veuillez d'abord vérifier votre numéro de téléphone (code SMS) avant de réserver.",
            )

        stationnement = conn.execute(
            "SELECT * FROM stationnements WHERE id = ? AND actif = 1", (req.stationnement_id,)
        ).fetchone()
        if not stationnement:
            raise HTTPException(404, "Stationnement introuvable")

        prix_total = prix_navette(req.distance_km, req.nb_passagers)
        paiement = calcul_acompte(prix_total)
        code = "NV-" + uuid.uuid4().hex[:8].upper()
        conn.execute(
            """INSERT INTO reservations_navette
               (code, stationnement_id, nom_passager, prenom_passager, telephone,
                adresse_domicile, quartier_domicile, date_course, heure_course,
                distance_km, nb_passagers, prix_total, acompte_ar, solde_ar, mode_paiement)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                code, req.stationnement_id, req.nom_passager, req.prenom_passager,
                req.telephone, req.adresse_domicile, req.quartier_domicile,
                req.date_course, req.heure_course, req.distance_km, req.nb_passagers,
                prix_total, paiement["acompte_ar"], paiement["solde_ar"], req.mode_paiement,
            ),
        )
    return {
        "code": code,
        "message": "Réservation acceptée : acompte reçu",
        "trajet": f"{stationnement['nom']} ({stationnement['ville']}) → {req.adresse_domicile}",
        "stationnement": f"{stationnement['nom']} ({stationnement['ville']})",
        "adresse_domicile": req.adresse_domicile,
        "distance_km": req.distance_km,
        "nb_passagers": req.nb_passagers,
        "prix_total": prix_total,
        "acompte_ar": paiement["acompte_ar"],
        "solde_ar": paiement["solde_ar"],
        "mode_paiement": req.mode_paiement,
        "date_depart": req.date_course,
        "heure_depart": req.heure_course,
    }


@app.get("/api/suivi/{code}")
def suivi(code: str):
    with get_db() as conn:
        if code.startswith("TB-"):
            row = conn.execute(
                """SELECT r.*, t.ville_depart, t.ville_arrivee, t.duree_heures
                   FROM reservations_taxi r
                   JOIN trajets t ON r.trajet_id = t.id
                   WHERE r.code = ?""",
                (code,),
            ).fetchone()
            if not row:
                raise HTTPException(404, "Code introuvable")
            d = dict(row)
            d["type"] = "taxi"
            return d
        elif code.startswith("CP-"):
            row = conn.execute(
                "SELECT * FROM reservations_colis WHERE code = ?", (code,)
            ).fetchone()
            if not row:
                raise HTTPException(404, "Code introuvable")
            d = dict(row)
            d["type"] = "colis"
            return d
        elif code.startswith("NV-"):
            row = conn.execute(
                """SELECT r.*, s.nom AS stationnement_nom, s.ville AS stationnement_ville
                   FROM reservations_navette r
                   JOIN stationnements s ON r.stationnement_id = s.id
                   WHERE r.code = ?""",
                (code,),
            ).fetchone()
            if not row:
                raise HTTPException(404, "Code introuvable")
            d = dict(row)
            d["type"] = "navette"
            return d
        raise HTTPException(400, "Format de code invalide")


@app.get("/api/admin/reservations/taxi")
def admin_taxi():
    with get_db() as conn:
        rows = conn.execute(
            """SELECT r.*, t.ville_depart, t.ville_arrivee
               FROM reservations_taxi r JOIN trajets t ON r.trajet_id = t.id
               ORDER BY r.cree_le DESC""",
        ).fetchall()
        return [dict(r) for r in rows]


@app.get("/api/admin/reservations/colis")
def admin_colis():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM reservations_colis ORDER BY cree_le DESC"
        ).fetchall()
        return [dict(r) for r in rows]


@app.get("/api/admin/reservations/navette")
def admin_navette():
    with get_db() as conn:
        rows = conn.execute(
            """SELECT r.*, s.nom AS stationnement_nom, s.ville AS stationnement_ville
               FROM reservations_navette r JOIN stationnements s ON r.stationnement_id = s.id
               ORDER BY r.cree_le DESC""",
        ).fetchall()
        return [dict(r) for r in rows]


@app.patch("/api/admin/reservations/colis/{code}/statut")
def update_statut_colis(code: str, statut: str):
    valides = ["en attente", "en transit", "livré"]
    if statut not in valides:
        raise HTTPException(400, f"Statut invalide. Valeurs possibles : {valides}")
    with get_db() as conn:
        cur = conn.execute(
            "UPDATE reservations_colis SET statut = ? WHERE code = ?", (statut, code)
        )
        if cur.rowcount == 0:
            raise HTTPException(404, "Colis introuvable")
    return {"message": f"Statut mis à jour : {statut}"}


@app.get("/api/stats")
def stats():
    with get_db() as conn:
        nb_taxi = conn.execute("SELECT COUNT(*) FROM reservations_taxi").fetchone()[0]
        nb_colis = conn.execute("SELECT COUNT(*) FROM reservations_colis").fetchone()[0]
        nb_navette = conn.execute("SELECT COUNT(*) FROM reservations_navette").fetchone()[0]
        rev_taxi = conn.execute("SELECT COALESCE(SUM(prix_total),0) FROM reservations_taxi").fetchone()[0]
        rev_colis = conn.execute("SELECT COALESCE(SUM(prix_total),0) FROM reservations_colis").fetchone()[0]
        rev_navette = conn.execute("SELECT COALESCE(SUM(prix_total),0) FROM reservations_navette").fetchone()[0]
        return {
            "reservations_taxi": nb_taxi,
            "envois_colis": nb_colis,
            "reservations_navette": nb_navette,
            "revenus_taxi_ar": rev_taxi,
            "revenus_colis_ar": rev_colis,
            "revenus_navette_ar": rev_navette,
            "revenus_total_ar": rev_taxi + rev_colis + rev_navette,
        }
# Frontend (React) 
#     ↓ HTTP request (GET/POST/PATCH)
# FastAPI route
#     ↓ Pydantic: manamarina ny angona
#     ↓ SQLite: mamaky/manoratra
# # Valiny (JSON) miverina any amin'ny frontend
# Eto misy fanazavana feno momba an'ity code ity — API ho an'ny "Taxi Brousse National" (fandehanana taxi-brousse) sy ny fandefasana colis, natao tamin'ny **FastAPI** (Python) sy **SQLite** ho tahiry angona (database).

# ## 1) Ny votoaty ankapobeny

# Ity fichier `main.py` ity dia manangana **serveur API** iray manontolo, izay:
# - mitahiry ny lisitry ny tanàna sy ny trajets (làlana ateraky ny taxi-brousse)
# - mandray reservation taxi (misafidy siege)
# - mandray reservation colis (fandefasana entana)
# - manome fomba hanaraha-maso ("suivi") ny reservation amin'ny alalan'ny kaody
# - manome statistika ho an'ny mpitantana (admin)

# ## 2) Fanomanana sy configuration

# ```python
# app = FastAPI(title="Taxi Brousse National API", version="1.0.0")
# app.add_middleware(CORSMiddleware, allow_origins=["*"], ...)
# ```

# - `FastAPI()` dia manangana ny "application" mihitsy.
# - Ny `CORSMiddleware` amin'ny `allow_origins=["*"]` dia mamela **tranokala hafa rehetra** (ohatra ny frontend Vite/React) hiantso ity API ity, na dia tsy ao amin'ny domaine mitovy aza. Ilaina io satria matetika miavaka ny "port" ampiasain'ny backend (ohatra 8000) sy ny frontend (ohatra 5173).

# ## 3) Ny tahiry angona (database)

# Mampiasa **SQLite** izy io, izany hoe fichier iray monja (`taxibrousse.db`) no tahiry ny angona rehetra, tsy mila serveur database misy mihitsy.

# ```python
# @contextmanager
# def get_db():
#     conn = sqlite3.connect(DB_PATH)
#     ...
#     yield conn
#     conn.commit()
# ```

# Ity `get_db()` ity dia "context manager" — midika izany fa isaky ny ampiasaina amin'ny `with get_db() as conn:`, dia:
# 1. Mamoha fifandraisana amin'ny database
# 2. Mamela anao hanao "query" (SELECT/INSERT/UPDATE)
# 3. Rehefa vita, `commit()` automatika (mitahiry ny fanovana) ary `close()` ny fifandraisana

# Fomba mazava sy azo antoka izany, satria tsy mety hadino ny fanidiana ny fifandraisana.

# ### Ny tabilao (tables) efatra ao anaty database

# | Tabilao | Anjara asa |
# |---|---|
# | `villes` | Lisitry ny tanàna (anarana + faritra/region) |
# | `trajets` | Lisitry ny làlana azo raisina (tanàna niaingana → tanàna hipetrahana, ora, vidiny, isan'ny siege) |
# | `reservations_taxi` | Ny reservation taxi tsirairay (mpandeha, siege nofidiny, vidiny, sns) |
# | `reservations_colis` | Ny fandefasana colis tsirairay (mpandefa, mpandray, lanjany, vidiny) |

# Ny `init_db()` dia mamorona ireo tabilao ireo raha mbola tsy misy (`CREATE TABLE IF NOT EXISTS`), ary ny `_seed()` dia mameno azy amin'ny angona "voafantina mialoha" (tanàna 15 sy trajets 20) — mba tsy ho foana ilay app rehefa vao alefa voalohany.

# ## 4) Ny modely Pydantic (validation)

# ```python
# class ReservationTaxiRequest(BaseModel):
#     trajet_id: int
#     ...
#     sieges: List[int] = Field(..., min_length=1, max_length=20)
#     mode_paiement: Literal["Mvola", "Orange Money", "Airtel Money", "Espèces"]
# ```

# Ireto dia "schema" mamaritra ny endriky ny angona tokony halefan'ny frontend rehefa manao reservation. FastAPI dia:
# - Manamarina automatika raha ara-dalàna ny angona nalefa (ohatra: `sieges` dia lisitry isa, `mode_paiement` dia tsy maintsy iray amin'ireo efatra voatondro)
# - Mamoaka hafatra erreur mazava raha diso ny angona nalefa

# ## 5) Ny fikajiana vidiny sy acompte

# ```python
# TAUX_ACOMPTE = 0.30  # 30%

# def calcul_acompte(prix_total: int) -> dict:
#     acompte = math.ceil((prix_total * TAUX_ACOMPTE) / 100) * 100
#     return {"acompte_ar": acompte, "solde_ar": prix_total - acompte}
# ```

# Isaky ny reservation, ny mpandeha dia tsy maintsy mandoa **30% amin'ny vidiny** ho "acompte" (mba hanamafisana ny reservation), ary ny sisa (`solde_ar`) no aloa aoriana. Ny `math.ceil(...)*100` dia manao "rounding" ho isa boribory eo amin'ny 100 Ariary (tsy misy santimo hafahafa).

# Ny vidin'ny colis kosa dia kajiana toy izao:

# ```python
# def prix_colis(poids_kg, ville_dep, ville_arr):
#     base = 5000
#     poids_cost = math.ceil(poids_kg) * 100
#     loin = 1500 if (...) else 0
#     return base + poids_cost + loin
# ```
# Vidiny fototra 5000 Ar + saran'ny lanja + tambin-karama fanampiny raha lavitra ny tanàna (ohatra Antsiranana, Toliara).

# ## 6) Ny "routes" (endpoints) — ny asa lehibe

# ### a) Fikarohana angona

# - `GET /api/villes` → mamoaka ny tanàna rehetra
# - `GET /api/trajets?depart=...&arrivee=...` → mikaroka trajets, misy "filtre" azo ampiasaina na tsia (`LIKE` ka mahita na dia sombiny amin'ny anarana ihany)
# - `GET /api/trajets/{id}` → antsipirihan'ny trajet iray

# ### b) Fahitana ny siege malalaka

# ```python
# @app.get("/api/trajets/{trajet_id}/sieges")
# def get_sieges(trajet_id, date, heure):
# ```
# Mikaroka ireo reservation efa nisy tamin'ilay trajet, daty, ary ora, dia manangona ny "sieges" rehetra efa lasa (`extend`), ary mamoaka lisitry ny siege efa lasa (`places_occupees`) mba ho hitan'ny frontend hoe iza no mbola malalaka.

# ### c) Fanaovana reservation taxi — ny lojika manan-danja indrindra

# ```python
# @app.post("/api/reservations/taxi")
# def reserver_taxi(req: ReservationTaxiRequest):
# ```
# Dingana ataony:
# 1. Mizaha raha misy ilay `trajet_id`
# 2. Mizaha raha ao anatin'ny toerana 1–capacité ny siege nofidina (tsy maintsy eo anelanelan'ny 1 ka hatramin'ny isan'ny siege ao anaty fiara)
# 3. Mizaha raha misy fifanindrian'ny siege (`conflit`) amin'ireo efa reservation — raha misy, mamoaka erreur `409 Conflict`
# 4. Raha mety daholo, mikajy ny vidiny, mamorona kaody tokana (`TB-XXXXXXXX` amin'ny alalan'ny `uuid`), dia mitahiry ilay reservation ao amin'ny database
# 5. Mamerina valiny misy ny kaody, ny fintina ny reservation, ny vidiny sy acompte

# ### d) Fandefasana colis

# Mitovitovy amin'ny ambony ihany, saingy tsy misy fizahana siege — mikajy fotsiny ny vidiny arahin'ny fitahirizana.

# ### e) Fanaraha-maso ("suivi")

# ```python
# @app.get("/api/suivi/{code}")
# def suivi(code: str):
# ```
# Miankina amin'ny santionany voalohany ao amin'ny kaody (`TB-` na `CP-`) izy no mahalala hoe tabilao inona no tokony hokarohina — clever satria samy manana kaody miavaka ny taxi sy ny colis.

# ### f) Admin

# - `GET /api/admin/reservations/taxi` / `.../colis` → mamoaka ny reservation rehetra, misy `JOIN` amin'ny `trajets` mba hanampiana ny anaran'ny tanàna
# - `PATCH /api/admin/reservations/colis/{code}/statut` → manova ny "statut"-n'ny colis (en attente / en transit / livré), miaraka amin'ny fanamarinana raha ara-dalàna ilay statut nomena

# ### g) Statistika

# `GET /api/stats` → manisa ny reservation sy ny revenus (miditra vola) rehetra, avy amin'ny `SUM()` ao amin'ny SQL.

# ## 7) Fintina — ny lalana arahin'ny angona

# ```
# Frontend (React) 
#     ↓ HTTP request (GET/POST/PATCH)
# FastAPI route
#     ↓ Pydantic: manamarina ny angona
#     ↓ SQLite: mamaky/manoratra
# Valiny (JSON) miverina any amin'ny frontend
# ```

# Raha mila fanazavana lalindalina kokoa momba ny fizarana iray manokana (ohatra ny `contextmanager`, na ny fomba fiasan'ny `uuid`, na ny fomba tokony hiantsoan'ny frontend an'ireto route ireto), mba ambarao fa hazavaiko bebe kokoa.