import { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE;

const weatherText = (code) => {
  const m = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Depositing rime fog", 51: "Light drizzle", 53: "Drizzle",
    55: "Heavy drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain",
    71: "Light snow", 73: "Snow", 75: "Heavy snow", 80: "Rain showers",
    81: "Rain showers", 82: "Heavy showers", 95: "Thunderstorm"
  };
  return m[code] ?? "—";
};

export default function App() {
  const [typed, setTyped] = useState("");
  const [detected, setDetected] = useState(null); // {name, country}
  const [coords, setCoords] = useState(null);     // {lat, lon}
  const [card, setCard] = useState(null);         // rendered weather
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Detect location on load (browser geolocation)
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setCoords({ lat, lon });
        try {
          const r = await fetch(`${API_BASE}/reverse?lat=${lat}&lon=${lon}`);
          if (r.ok) {
            const place = await r.json();
            setDetected(place); // {name, country}
          } else {
            setDetected(null);
          }
        } catch {
          setDetected(null);
        }
      },
      () => setDetected(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  const sameCity = useMemo(() => {
    if (!detected?.name || !typed) return false;
    return detected.name.toLowerCase().trim() === typed.toLowerCase().trim();
  }, [detected, typed]);

  async function fetchWeatherForCity(name) {
    setError(null);
    setLoading(true);
    setCard(null);
    try {
      const g = await fetch(`${API_BASE}/geocode?name=${encodeURIComponent(name)}`);
      if (!g.ok) throw new Error("City not found");
      const place = await g.json(); // {name, lat, lon, country}

      const w = await fetch(`${API_BASE}/weather?lat=${place.lat}&lon=${place.lon}`);
      if (!w.ok) throw new Error("Weather fetch failed");
      const data = await w.json();

      const cur = data.current;
      setCard({
        title: `${place.name}${place.country ? ` (${place.country})` : ""}`,
        desc: weatherText(cur.weather_code),
        temp: Math.round(cur.temperature_2m),
        feels: Math.round(cur.apparent_temperature),
        wind: Math.round(cur.wind_speed_10m)
      });
    } catch (e) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function onCheck() {
    if (!typed.trim()) return setError("Please type a city");
    if (sameCity) {
      setCard({ joke: `😂 You are literally in ${typed}. Just go look outside!` });
      setError(null);
      return;
    }
    fetchWeatherForCity(typed.trim());
  }

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 16, fontFamily: "system-ui, Arial" }}>
      <h1>Weather Checker</h1>
      <p style={{ color: "#555" }}>
        Type a city and hit “Check”. If you search your own city, you’ll get a cheeky reminder 😉
      </p>

      <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
        <input
          value={typed}
          onChange={e => setTyped(e.target.value)}
          placeholder="Enter city (e.g., Colombo)"
          style={{ flex: 1, padding: "10px 12px", fontSize: 16 }}
          onKeyDown={(e) => e.key === "Enter" && onCheck()}
        />
        <button onClick={onCheck} style={{ padding: "10px 16px", fontSize: 16, cursor: "pointer" }}>
          {loading ? "…" : "Check"}
        </button>
      </div>

      <div style={{ fontSize: 14, color: "#666", marginBottom: 8 }}>
        {detected?.name
          ? <>Detected city: <strong>{detected.name}</strong>{detected.country ? ` (${detected.country})` : ""}</>
          : "Could not detect city from location."}
      </div>

      {error && (
        <div style={{ color: "#b00020", border: "1px solid #ffd0d0", padding: 12, borderRadius: 8, marginTop: 8 }}>
          ⚠️ {error}
        </div>
      )}

      {card && card.joke && (
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14, marginTop: 10 }}>
          {card.joke}
        </div>
      )}

      {card && !card.joke && (
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14, marginTop: 10 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{card.title}</div>
          <div style={{ color: "#555" }}>{card.desc}</div>
          <div style={{ marginTop: 8, fontSize: 28 }}>
            {card.temp}°C <span style={{ fontSize: 14, color: "#666" }}>(feels {card.feels}°C)</span>
          </div>
          <div style={{ marginTop: 6, color: "#444" }}>Wind: {card.wind} km/h</div>
        </div>
      )}
    </div>
  );
}
