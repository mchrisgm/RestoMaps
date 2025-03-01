const express = require('express');
const path = require('path');
const fs = require('fs/promises');
require('dotenv').config();

// Use dynamic import for fetch to support node-fetch v3 in CommonJS.
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 5001;
const RAW_LOCATIONS_PATH = path.join(__dirname, 'locations.json');

// In-memory cache for geocoding results: { query: { lat, lng } }
const geocodeCache = {};

// In-memory cache for processed locations.
let processedLocations = [];

// Helper: Geocode using Google API (with key from .env) and fallback to OSM.
async function geocode(query) {
  if (geocodeCache[query]) {
    console.log(`Cache hit for: ${query}`);
    return geocodeCache[query];
  }

  // Attempt Google Geocoding API.
  try {
    const googleRes = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${process.env.GOOGLE_API_KEY}`
    );
    const googleData = await googleRes.json();
    if (googleData.status === 'OK' && googleData.results.length > 0) {
      const { lat, lng } = googleData.results[0].geometry.location;
      console.log(`Google geocode success for: ${query}`);
      geocodeCache[query] = { lat, lng };
      return { lat, lng };
    }
  } catch (e) {
    console.error('Google Geocoding error:', e);
  }
  
  // Fallback: OpenStreetMap Nominatim.
  try {
    const osmRes = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
    );
    const osmData = await osmRes.json();
    if (osmData && osmData.length > 0) {
      const lat = parseFloat(osmData[0].lat);
      const lng = parseFloat(osmData[0].lon);
      console.log(`OSM fallback geocode success for: ${query}`);
      geocodeCache[query] = { lat, lng };
      return { lat, lng };
    }
  } catch (e) {
    console.error('OSM fallback error:', e);
  }
  
  console.warn(`Geocoding failed for: ${query}`);
  return null;
}

// Process locations: read raw data, geocode each location, and cache the results.
async function processLocations() {
  try {
    const rawData = await fs.readFile(RAW_LOCATIONS_PATH, 'utf-8');
    const locations = JSON.parse(rawData);
    for (const loc of locations) {
      let query = loc.address && loc.address.trim() !== ''
        ? `${loc.name} ${loc.address}`
        : `${loc.name} London`;
      if (!query.toLowerCase().includes('london')) {
        query += ' London';
      }
      const coords = await geocode(query);
      if (coords) {
        loc.lat = coords.lat;
        loc.lng = coords.lng;
      }
    }
    processedLocations = locations;
    console.log('Locations processed successfully.');
  } catch (error) {
    console.error('Error processing locations:', error);
  }
}

// Run processing on startup.
processLocations();

// Serve static files from the built frontend.
app.use(express.static(path.join(__dirname, '../frontend/build')));

// API endpoint to serve processed location data.
app.get('/api/locations', (req, res) => {
  // Optionally disable caching on this route:
  res.set('Cache-Control', 'no-store');
  res.json(processedLocations);
});

// Fallback: serve frontend's index.html for any unmatched routes.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});