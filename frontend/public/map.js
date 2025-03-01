document.addEventListener("DOMContentLoaded", async function () {
  const map = L.map("map").setView([51.5074, -0.1278], 12);

  // Add tile layer (CartoDB DarkMatter)
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 20,
    detectRetina: false,
  }).addTo(map);

  const markersLayer = L.layerGroup().addTo(map);
  const heatLayer = L.layerGroup().addTo(map);

  async function loadLocations() {
    try {
      const response = await fetch("/api/locations", {
        headers: { "Cache-Control": "no-cache" },
      });
      if (!response.ok) throw new Error("Network response was not ok");
      return await response.json();
    } catch (error) {
      console.error("Error loading locations:", error);
      return [];
    }
  }

  async function updateMap() {
    const locations = await loadLocations();

    markersLayer.clearLayers();
    heatLayer.clearLayers();

    const heatPoints = [];

    locations.forEach((loc) => {
      if (loc.lat && loc.lng) {
        const coord = [loc.lat, loc.lng];
        heatPoints.push(coord);

        // Create a dot marker
        const marker = L.circleMarker(coord, {
          radius: 5,
          fillColor: "#ff7800",
          color: "#000",
          weight: 1,
          opacity: 1,
          fillOpacity: 0.8,
        }).bindPopup(
          `<strong>${loc.name}</strong><br>${loc.theme || ""}<br>${loc.cuisine || ""}`
        );

        marker.addTo(markersLayer);
      }
    });

    // Add heatmap layer
    const heatmap = L.heatLayer(heatPoints, {
      minOpacity: 0.5,
      maxZoom: 18,
      radius: 30,
      blur: 20,
      gradient: {
        0.3: "cyan",
        0.4: "lime",
        0.6: "yellow",
        0.9: "red",
      },
    });

    heatmap.addTo(heatLayer);
  }

  // Initial map load
  updateMap();

  // Button to toggle markers
  const toggleButton = document.getElementById("toggleMarkers");
  let markersVisible = true;

  toggleButton.addEventListener("click", function () {
    if (markersVisible) {
      map.removeLayer(markersLayer);
      toggleButton.innerText = "Show Markers";
    } else {
      map.addLayer(markersLayer);
      toggleButton.innerText = "Hide Markers";
    }
    markersVisible = !markersVisible;
  });
});