require("dotenv").config();

const express = require("express");
const compression = require("compression");
const path = require("path");
const { enviarQrHandler } = require("./enviar-qr");
const { getEvento, registrar } = require("./api");

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, "public");

app.use(compression());
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(PUBLIC, { maxAge: "1d", etag: true }));

function sendForm(_req, res) {
  res.sendFile(path.join(PUBLIC, "registro-forms.html"));
}

app.get("/", sendForm);
app.get("/registro-forms", sendForm);
app.get("/registro-forms/favicon.ico", (_req, res) => {
  res.sendFile(path.join(PUBLIC, "favicon.ico"));
});
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/evento/:id", getEvento);
app.post("/api/registrar", registrar);
app.post("/enviar-qr", enviarQrHandler);

// Alias de las rutas que usaba la intranet, por si se monta detrás de /registro-forms.
app.get("/registro-forms/api/evento/:id", getEvento);
app.post("/registro-forms/api/registrar", registrar);
app.post("/registro-forms/enviar-qr", enviarQrHandler);

app.listen(PORT, () => {
  console.log(`[registro-forms] escuchando en http://localhost:${PORT}`);
});
