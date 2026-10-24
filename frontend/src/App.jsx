
import { useState } from 'react';
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import Home from "./pages/Home.jsx";
import BookTaxi from "./pages/BookTaxi.jsx";
import BookNavette from "./pages/BookNavette.jsx";
import BookColis from "./pages/BookColis.jsx";
import Confirmation from "./pages/Confirmation.jsx";
import Tracking from "./pages/Tracking.jsx";
import Admin from "./pages/Admin.jsx";

export default function App() {
  const [page, setPage] = useState("home");
  const [bookingData, setBookingData] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

  const navigate = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div>
      <Header page={page} setPage={navigate} />
      <main>
        {page === "home"         && <Home setPage={navigate} setBookingData={setBookingData} />}
        {page === "book-taxi"    && <BookTaxi bookingData={bookingData} setPage={navigate} setConfirmation={setConfirmation} />}
        {page === "book-navette" && <BookNavette bookingData={bookingData} setPage={navigate} setConfirmation={setConfirmation} />}
        {page === "book-colis"   && <BookColis setPage={navigate} setConfirmation={setConfirmation} />}
        {page === "confirmation" && <Confirmation data={confirmation} setPage={navigate} />}
        {page === "tracking"     && <Tracking setPage={navigate} />}
        {page === "admin"        && <Admin setPage={navigate} />}
      </main>
      <Footer setPage={navigate} />
    </div>
  );
}
