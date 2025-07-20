// radio107-backend/index.js

const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

// Inizializza Firebase Admin SDK con la variabile d'ambiente (Render supporta le variabili d'ambiente)
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
if (Object.keys(serviceAccount).length > 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const app = express();
app.use(bodyParser.json());

// In memoria: mappa token => array di preferiti
const userFavorites = {};

// Endpoint per ricevere i preferiti
app.post('/favorites', (req, res) => {
  const { token, favorites } = req.body;
  if (!token || !Array.isArray(favorites)) {
    return res.status(400).json({ error: 'token e favorites sono obbligatori' });
  }
  userFavorites[token] = favorites;
  res.json({ ok: true });
});

// Endpoint per simulare una canzone in onda
app.post('/nowplaying', async (req, res) => {
  const { song } = req.body;
  if (!song) return res.status(400).json({ error: 'song obbligatorio' });

  // Trova tutti i token che hanno la canzone tra i preferiti
  const tokens = Object.entries(userFavorites)
    .filter(([token, favs]) => favs.includes(song))
    .map(([token]) => token);

  if (tokens.length === 0) return res.json({ message: 'Nessun utente interessato' });

  // Invia la notifica push a tutti i token
  const message = {
    notification: {
      title: 'La tua canzone preferita è in onda!',
      body: `${song} sta suonando ora su Radio 107 Network!`,
    },
    tokens,
  };

  try {
    const response = await admin.messaging().sendMulticast(message);
    res.json({ sent: response.successCount, failed: response.failureCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('Radio107 Backend attivo!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server avviato su http://localhost:${PORT}`);
});
