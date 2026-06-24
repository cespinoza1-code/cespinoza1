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

// ===============================
// CONFIGURACION GENERAL
// ===============================

const PROFUNDIDAD = 30;

const PUNTO_PARTIDA = {
  lat: 19.124102079967024,
  lng: -104.40004299017038
};

// Esperar carga
window.onload = () => {

  // Firebase
  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);

  // ===============================
  // MAPA
  // ===============================

  const map = L.map('map').setView([19.10, -104.35], 12);

  L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      attribution: 'OpenStreetMap'
    }
  ).addTo(map);

  // ===============================
  // PUNTO DE PARTIDA
  // ===============================

  L.marker([
    PUNTO_PARTIDA.lat,
    PUNTO_PARTIDA.lng
  ])
  .addTo(map)
  .bindPopup("PUNTO DE PARTIDA REAL COUNTRY");

  // ===============================
  // VARIABLES
  // ===============================

  let primeraCarga = true;

  let puntosFijos = {};

  let marcadoresFijos = {};

  let rutaControl = null;

  let gpsActual = null;

  // ===============================
  // CONTENEDOR MOVIL
  // ===============================

  const marker = L.marker([19.0, -103.0])
    .addTo(map)
    .bindPopup("Esperando datos...");

  // ===============================
  // FUNCION NIVEL
  // ===============================

  function calcularNivel(distancia) {

    let nivel =
      ((PROFUNDIDAD - distancia) /
      PROFUNDIDAD) * 100;

    return Math.max(
      0,
      Math.min(100, nivel)
    );
  }

  // ===============================
  // COLOR NIVEL
  // ===============================

  function colorNivel(nivel) {

    if (nivel < 50)
      return "green";

    if (nivel < 80)
      return "orange";

    return "red";
  }

  // ===============================
  // DISTANCIA ENTRE COORDENADAS
  // ===============================

  function calcularDistancia(
    lat1,
    lon1,
    lat2,
    lon2
  ) {

    const R = 6371;

    const dLat =
      (lat2 - lat1) *
      Math.PI / 180;

    const dLon =
      (lon2 - lon1) *
      Math.PI / 180;

    const a =
      Math.sin(dLat / 2) *
      Math.sin(dLat / 2) +

      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *

      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
      );

    return R * c;
  }

  // ===============================
  // ORDENAR RUTA
  // ===============================

  function obtenerRutaOptima(
    puntos
  ) {

    let ruta = [];

    let actual = {
      lat: PUNTO_PARTIDA.lat,
      lng: PUNTO_PARTIDA.lng
    };

    let pendientes =
      [...puntos];

    while (
      pendientes.length > 0
    ) {

      let indice = 0;

      let menor =
        calcularDistancia(
          actual.lat,
          actual.lng,
          pendientes[0].lat,
          pendientes[0].lng
        );

      for (
        let i = 1;
        i < pendientes.length;
        i++
      ) {

        let d =
          calcularDistancia(
            actual.lat,
            actual.lng,
            pendientes[i].lat,
            pendientes[i].lng
          );

        if (d < menor) {

          menor = d;
          indice = i;
        }
      }

      ruta.push(
        pendientes[indice]
      );

      actual =
        pendientes[indice];

      pendientes.splice(
        indice,
        1
      );
    }

    return ruta;
  }

  // ===============================
  // PUNTOS FIJOS
  // ===============================

  const puntosRef =
    ref(db, 'puntos_fijos');

  onValue(
    puntosRef,
    (snapshot) => {

      const data =
        snapshot.val();

      if (!data)
        return;

      puntosFijos = data;

      const contenedor =
        document.getElementById(
          "contenedores"
        );

      contenedor.innerHTML = "";

      Object.keys(data)
      .forEach(nombre => {

        const punto =
          data[nombre];

        const nivel =
          calcularNivel(
            parseFloat(
              punto.distancia
            )
          );

        if (
          !marcadoresFijos[nombre]
        ) {

          marcadoresFijos[nombre] =
            L.marker([
              punto.lat,
              punto.lng
            ])
            .addTo(map);
        }

       const info = `
<b>${nombre}</b><br>
Latitud: ${punto.lat}<br>
Longitud: ${punto.lng}<br>
Distancia: ${punto.distancia} cm<br>
Nivel: ${nivel.toFixed(1)}%
`;

marcadoresFijos[nombre].bindPopup(info);

marcadoresFijos[nombre].bindTooltip(
  info,
  {
    permanent: false,
    direction: "top"
  });

        contenedor.innerHTML += `
        <div class="panel">

          <h2>
          NIVEL DE LLENADO DE
          CONTENEDOR
          ${nombre.toUpperCase()}
          </h2>

          <div class="barra">

            <div
              style="
              width:${nivel}%;
              height:100%;
              background:
              ${colorNivel(nivel)};
              ">
            </div>

          </div>

          <p>
          ${nivel.toFixed(1)}%
          </p>

        </div>
        `;
      });
    }
  );

  // ===============================
  // GPS
  // ===============================

  const gpsRef =
    ref(db, 'gps');

  onValue(
    gpsRef,
    (snapshot) => {

      const data =
        snapshot.val();

      if (!data)
        return;

      const lat =
        parseFloat(data.lat);

      const lng =
        parseFloat(data.lng);

      const distancia =
        parseFloat(
          data.distancia
        );

      const nivel =
        calcularNivel(
          distancia
        );

      gpsActual = {
        lat,
        lng,
        nivel
      };

      marker.setLatLng([
        lat,
        lng
      ]);

      if (
        primeraCarga
      ) {

        map.setView(
          [lat, lng],
          15
        );

        primeraCarga =
          false;
      }

      document
      .getElementById(
        "nivelTexto"
      )
      .innerText =
      nivel.toFixed(1)
      + "%";

      const barra =
      document
      .getElementById(
        "relleno"
      );

      barra.style.width =
      nivel + "%";

      barra.style.background =
      colorNivel(nivel);

      marker.setPopupContent(`
        <b>
        CONTENEDOR MOVIL
        </b><br>

        Lat:
        ${lat.toFixed(6)}
        <br>

        Lng:
        ${lng.toFixed(6)}
        <br>

        Distancia:
        ${distancia.toFixed(1)}
        cm<br>

        Nivel:
        ${nivel.toFixed(1)}
        %
      `);
    }
  );

  // ===============================
  // TRAZAR RUTA
  // ===============================

  document
  .getElementById(
    "btnRuta"
  )
  .addEventListener(
    "click",
    () => {

      if (
        rutaControl
      ) {

        map.removeControl(
          rutaControl
        );

        rutaControl =
          null;
      }

      let candidatos =
        [];

      Object.keys(
        puntosFijos
      )
      .forEach(nombre => {

        const p =
          puntosFijos[nombre];

        const nivel =
          calcularNivel(
            parseFloat(
              p.distancia
            )
          );

        if (
          nivel >= 75
        ) {

          candidatos.push({

            nombre,

            lat: p.lat,

            lng: p.lng

          });
        }
      });

      if (
        gpsActual &&
        gpsActual.nivel >= 80
      ) {

        candidatos.push({

          nombre:
          "CONTENEDOR MOVIL",

          lat:
          gpsActual.lat,

          lng:
          gpsActual.lng

        });
      }

      if (
        candidatos.length === 0
      ) {

        alert(
          "No existen contenedores con nivel mayor al 80%"
        );

        return;
      }

      const ruta =
        obtenerRutaOptima(
          candidatos
        );

      let waypoints =
      [];

      waypoints.push(
        L.latLng(
          PUNTO_PARTIDA.lat,
          PUNTO_PARTIDA.lng
        )
      );

      ruta.forEach(
        p => {

          waypoints.push(
            L.latLng(
              p.lat,
              p.lng
            )
          );
        }
      );

      rutaControl =
      L.Routing.control({

        waypoints:
        waypoints,

        routeWhileDragging:
        false,

        addWaypoints:
        false,

        draggableWaypoints:
        false,

        fitSelectedRoutes:
        true,

        show:
        false

      })
      .addTo(map);
    }
  );

  // ===============================
  // LIMPIAR RUTA
  // ===============================

  document
  .getElementById(
    "btnLimpiar"
  )
  .addEventListener(
    "click",
    () => {

      if (
        rutaControl
      ) {

        map.removeControl(
          rutaControl
        );

        rutaControl =
          null;
      }
    }
  );

};
