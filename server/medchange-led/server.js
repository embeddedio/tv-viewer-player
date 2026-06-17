const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");
const https = require("https");

// Configuration des chemins et constantes
// Storage externe partagé (survit à la désinstallation) : Documents/tv-viewer/led-media/
// TV_STORAGE_PATH est injecté par main.js (bridge RN → Node). Fallback identique au serveur principal.
const STORAGE_BASE = process.env.TV_STORAGE_PATH || "/storage/emulated/0/Documents/tv-viewer";
const UPLOADS_DIR = process.env.LED_MEDIA_DIR || path.join(STORAGE_BASE, "led-media");
// La DB vit dans led-media (inscriptible + persistante). Le database.json livré sert de seed.
const DB_PATH = path.join(UPLOADS_DIR, "database.json");
const SEED_DB_PATH = path.join(__dirname, "database.json");
const UPDATE_INTERVAL = 30 * 60 * 1000; // 30 minutes

// S'assurer que le dossier d'upload existe
fs.ensureDirSync(UPLOADS_DIR);

// Seed initial : si la DB externe n'existe pas, copier celle livrée dans l'APK
if (!fs.existsSync(DB_PATH)) {
  try {
    fs.copySync(SEED_DB_PATH, DB_PATH);
    console.log("[led] database.json initialisée depuis le seed");
  } catch (err) {
    console.error("[led] seed database.json échoué", err.message);
  }
}

// Agent HTTPS : IPv4 forcé + on N'IMPOSE PAS la validation du certificat.
// Sur nodejs-mobile, le magasin de CA ne reconnaît pas toujours le certificat du
// site → sans rejectUnauthorized:false la requête TLS échoue silencieusement
// (c'est exactement ce qui fait fonctionner le scraper principal server/lib/currency.js).
const httpsAgent = new https.Agent({ family: 4, rejectUnauthorized: false });

const app = express();
const httpServer = http.createServer(app);
const io = socketIo(httpServer, {
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Fix CORS pour Socket.io v2 (permettre toutes les origines)
// io.origins('*:*');

// Middleware
app.use(cors());
app.use(express.json());

// Servir les fichiers de l'application AngularJS (views) comme racine statique
app.use(express.static(path.join(__dirname, "views"), { maxAge: "1d" }));

// Servir les fichiers uploadés
app.use("/uploads", express.static(UPLOADS_DIR, { maxAge: "1d" }));

// Configuration Multer pour les uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    // Garder l'extension originale et ajouter un timestamp pour l'unicité
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

// Helper pour lire la DB
async function readDb() {
  try {
    return await fs.readJson(DB_PATH);
  } catch (err) {
    console.error("Erreur lecture DB", err);
    return { settings: {}, rates: [] };
  }
}

// Helper pour écrire la DB
async function writeDb(data) {
  try {
    await fs.writeJson(DB_PATH, data, { spaces: 2 });
    return true;
  } catch (err) {
    console.error("Erreur écriture DB", err);
    return false;
  }
}

// --- LOGIQUE DE SCRAPING BESTCHANGE TANGER ---

async function fetchAndRefreshRates() {
  console.log("Démarrage du scraping BestChange Tanger...");
  const url =
    "https://bestchangetanger.com/cours-des-billets-de-banques-etrangers/";
  const cln = (value) => {
    const val = value || "";
    return val.toString().replace(/\s+/g, " ").trim();
  };

  try {
    // 1. Fetch HTML — mêmes en-têtes que le scraper principal (UA réel + Accept),
    //    timeout pour ne pas rester bloqué si le réseau de la box pend.
    const response = await axios.get(url, {
      httpsAgent: httpsAgent,
      timeout: 15000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    const $ = cheerio.load(response.data);
    const table = $("table");

    if (table.length === 0) {
      console.error("Aucune table trouvée sur bestchangetanger.com");
      return;
    }

    // 2. Parser le tableau pour extraire les données brutes
    const scrapedRates = {};

    table.find("tr").each((i, row) => {
      let rowData = [];
      $(row)
        .find("td")
        .each((j, cell) => {
          let cellText = $(cell).text().trim();
          rowData.push(cellText);
        });

      // Structure attendue: [Unité, Description, Achat, Vente]
      // Ex: ["1", "Europe : Euro - EUR", "10.43", "11.06"]
      const cells = rowData
        .join("|||")
        .split("|||")
        .map((s) => s.trim());

      if (cells.length >= 4) {
        // Extraction du code depuis la description "Europe : Euro - EUR"
        // On prend la partie après le dernier tiret
        const descriptionParts = cells[1].split("-");
        const extractedCode =
          descriptionParts[descriptionParts.length - 1].trim();

        if (extractedCode && extractedCode.length === 3) {
          const code = extractedCode.toUpperCase();
          const buy = parseFloat(cln(cells[2]));
          const sell = parseFloat(cln(cells[3]));

          // Nom lisible depuis la description "Europe : Euro - EUR" → "Euro"
          let name = cells[1].replace(/\s*-\s*[A-Za-z]{3}\s*$/, "").trim();
          const colon = name.lastIndexOf(":");
          if (colon !== -1) name = name.slice(colon + 1).trim();

          if (!isNaN(buy) && !isNaN(sell)) {
            scrapedRates[code] = { buy: buy, sell: sell, name: name || code };
          }
        }
      }
    });

    console.log("Taux récupérés :", Object.keys(scrapedRates).join(", "));

    // 3. Mettre à jour la base de données locale
    const dbData = await readDb();
    if (!Array.isArray(dbData.rates)) dbData.rates = [];

    let hasChanges = false;
    // Utilisation de Promise.all car la map est synchrone mais on est dans une fonction async (bon pratique)
    const updatedRates = dbData.rates.map((localRate) => {
      const remoteData = scrapedRates[localRate.code];

      if (remoteData) {
        const newBuy = remoteData.buy;
        const newSell = remoteData.sell;

        // Détermination de la tendance
        let trend = "stable";
        if (newBuy > localRate.buy) trend = "up";
        else if (newBuy < localRate.buy) trend = "down";

        if (newBuy !== localRate.buy || newSell !== localRate.sell) {
          hasChanges = true;
        }

        return Object.assign({}, localRate, {
          buy: newBuy,
          sell: newSell,
          trend: trend,
        });
      } else {
        return localRate;
      }
    });

    // 3b. Ajouter les devises scrapées absentes de la DB. Sans ça, une DB au
    //     "rates": [] (ou une nouvelle devise) ne s'affiche JAMAIS — l'ancien code
    //     ne faisait que mettre à jour les entrées déjà présentes.
    const existingCodes = {};
    updatedRates.forEach((r) => {
      existingCodes[r.code] = true;
    });
    Object.keys(scrapedRates).forEach((code) => {
      if (!existingCodes[code]) {
        const sr = scrapedRates[code];
        updatedRates.push({
          code: code,
          name: sr.name || code,
          flag: "assets/img/" + code.toLowerCase() + ".png",
          buy: sr.buy,
          sell: sr.sell,
          trend: "stable",
        });
        hasChanges = true;
      }
    });

    // 4. Sauvegarder et diffuser
    if (hasChanges) {
      dbData.rates = updatedRates;
      await writeDb(dbData);
      io.emit("ratesUpdated", updatedRates);
      console.log("Base de données mise à jour avec les taux BestChange.");
    } else {
      console.log("Aucun changement de taux par rapport à la base locale.");
    }
  } catch (err) {
    console.error(
      "Erreur lors du scraping BestChange:",
      err.code || "",
      err.message
    );
  }
}

// Planification de la mise à jour
setInterval(fetchAndRefreshRates, UPDATE_INTERVAL);
// Lancement immédiat au démarrage (après un court délai pour laisser le serveur s'initialiser)
setTimeout(fetchAndRefreshRates, 5000);

// --- API ROUTES ---

// Endpoint pour forcer la mise à jour manuelle
app.post("/api/refresh-rates", async (req, res) => {
  await fetchAndRefreshRates();
  const data = await readDb();
  res.json({ success: true, rates: data.rates });
});

// Récupérer toute la config
app.get("/api/data", async (req, res) => {
  const data = await readDb();
  res.json(data);
});

// Mettre à jour les settings
app.post("/api/settings", async (req, res) => {
  const settings = req.body.settings; // Destructuring not fully safe in Node 8 if body undefined
  const data = await readDb();

  data.settings = settings;
  await writeDb(data);

  // Diffuser le changement à tous les clients connectés
  io.emit("settingsUpdated", data.settings);

  res.json({ success: true, settings: data.settings });
});

// Upload de média
app.post("/api/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  // Construire l'URL publique
  const fileUrl = "/uploads/" + req.file.filename;

  res.json({ url: fileUrl });
});

// Fallback pour AngularJS : toutes les autres routes renvoient index.html du dossier views
// Utilisation d'un regex simple compatible
app.get("*", (req, res) => {
  // Ignorer les requêtes API qui n'ont pas matché (évite de renvoyer du HTML pour une API 404)
  if (req.url.indexOf("/api") === 0 || req.url.indexOf("/uploads") === 0) {
    return res.status(404).send("Not found");
  }
  res.sendFile(path.join(__dirname, "views/index.html"));
});

// --- SOCKET.IO ---

io.on("connection", (socket) => {
  console.log(`Client connecté [id=${socket.id}]`);

  socket.on("disconnect", (reason) => {
    console.log(`Client déconnecté [id=${socket.id}] Raison: ${reason}`);
  });
});

const PORT = process.env.LED_PORT || process.env.PORT || 9000;

// Isolé du serveur principal : une erreur ici ne doit pas tuer le process Node embarqué.
httpServer.on("error", (err) => {
  console.error("[led] httpServer error:", err && err.message);
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log("[led] Serveur médias démarré sur le port " + PORT + " (uploads: " + UPLOADS_DIR + ")");
});
