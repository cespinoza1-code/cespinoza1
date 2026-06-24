// Importar Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

// CONFIG FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyCc7plOXTuRVUuQtf8zujyWeENNk31TvKk",
  authDomain: "esp32-gps-lectura.firebaseapp.com",
  databaseURL: "https://esp32-gps-lectura-default-rtdb.firebaseio.com",
  projectId: "esp32-gps-lectura",
  storageBucket: "esp32-gps-lectura.firebasestorage.app",
  messagingSenderId: "650800860810",
  appId: "1:650800860810:web:6d4b17ba2385397e93e773"
};

// Esperar carga
window.onload = () => {

  // Inicializar Firebase
  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);

  // Crear mapa
  const map = L.map('map').setView([19.0, -103.0], 5);

  // Capa OpenStreetMap
  L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      attribution: 'Mapa'
    }
  ).addTo(map);

  // Marcador inicial
  let marker = L.marker([19.0, -103.0])
    .addTo(map)
    .bindPopup("Esperando datos...");

  // Centrar solo una vez
  let primeraCarga = true;

  // Referencia Firebase
  const contenedorRef = ref(db, 'gps');

  // Profundidad real del bote (cm)
  const PROFUNDIDAD = 30;

  // Escuchar cambios
  onValue(contenedorRef, (snapshot) => {

    const data = snapshot.val();

    if (!data) return;

    //--------------------------------
    // GPS
    //--------------------------------
    const lat = parseFloat(data.lat);
    const lng = parseFloat(data.lng);

    marker.setLatLng([lat, lng]);

    if (primeraCarga) {
      map.setView([lat, lng], 18);
      primeraCarga = false;
    }

    //--------------------------------
    // SENSOR ULTRASONICO
    //--------------------------------
    const distancia = parseFloat(data.distancia);

    // Convertir a porcentaje
    let nivel =
      ((PROFUNDIDAD - distancia) / PROFUNDIDAD) * 100;

    // Limitar 0–100
    nivel = Math.max(0, Math.min(100, nivel));

    //--------------------------------
    // Mostrar texto
    //--------------------------------
    document.getElementById("nivelTexto")
      .innerText =
      nivel.toFixed(1) + "%";

    //--------------------------------
    // Actualizar barra
    //--------------------------------
    const barra =
      document.getElementById("relleno");

    barra.style.width =
      nivel + "%";

    //--------------------------------
    // Color automático
    //--------------------------------
    if (nivel < 50) {
      barra.style.background = "green";
    }
    else if (nivel < 80) {
      barra.style.background = "orange";
    }
    else {
      barra.style.background = "red";
    }

    //--------------------------------
    // Popup marcador
    //--------------------------------
    marker.setPopupContent(`
      Lat: ${lat.toFixed(6)}<br>
      Lng: ${lng.toFixed(6)}<br>
      Distancia: ${distancia.toFixed(1)} cm<br>
      Nivel de llenado: ${nivel.toFixed(1)}%
    `);

    //--------------------------------
    // Consola
    //--------------------------------
    console.log("LAT:", lat);
    console.log("LNG:", lng);
    console.log("Distancia:", distancia);
    console.log("Nivel:", nivel);

  });

};