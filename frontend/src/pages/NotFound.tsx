import { Link } from "react-router-dom";

const NotFound = () => (
  <div className="wrap page">
    <div className="eyebrow">Błąd 404</div>
    <h1 className="h1">Takiej strony nie ma</h1>
    <p style={{ marginBottom: 20 }}>Adres mógł się zmienić albo zawiera literówkę.</p>
    <Link className="btn" to="/">
      Wróć na stronę główną &gt;
    </Link>
  </div>
);

export default NotFound;
