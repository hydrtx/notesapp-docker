const express = require("express");
const mysql = require("mysql2/promise");

const app = express();
app.use(express.urlencoded({ extended: false }));

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function initDb() {
  for (let i = 0; i < 20; i++) {
    try {
      await pool.query(
        "CREATE TABLE IF NOT EXISTS notes (id INT AUTO_INCREMENT PRIMARY KEY, content VARCHAR(255) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"
      );
      console.log("Database siap");
      return;
    } catch (e) {
      console.log("Menunggu database...", e.code);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  process.exit(1);
}

const css = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,sans-serif;min-height:100vh;color:#e2e8f0;
background:linear-gradient(135deg,#0f172a,#1e1b4b 60%,#312e81);padding:40px 16px}
.wrap{max-width:640px;margin:0 auto}
h1{font-size:2rem;text-align:center;background:linear-gradient(90deg,#818cf8,#c084fc);
-webkit-background-clip:text;background-clip:text;color:transparent}
.sub{text-align:center;color:#94a3b8;margin:6px 0 28px}
form{display:flex;gap:10px;margin-bottom:24px}
input{flex:1;padding:14px 16px;border-radius:12px;border:1px solid #334155;background:#0f172a;
color:#fff;font-size:1rem;outline:none;transition:.2s}
input:focus{border-color:#818cf8;box-shadow:0 0 0 3px rgba(129,140,248,.25)}
.btn{padding:14px 22px;border:0;border-radius:12px;font-weight:600;cursor:pointer;color:#fff;
background:linear-gradient(90deg,#6366f1,#a855f7);transition:.2s}
.btn:hover{transform:translateY(-1px);opacity:.92}
.card{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:16px 18px;
margin-bottom:12px;border-radius:14px;background:rgba(255,255,255,.06);
border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(6px)}
.txt{word-break:break-word}
.date{display:block;font-size:.75rem;color:#94a3b8;margin-top:4px}
.del{background:rgba(239,68,68,.15);color:#f87171;border:0;border-radius:8px;padding:8px 12px;cursor:pointer}
.del:hover{background:rgba(239,68,68,.3)}
.empty{text-align:center;color:#64748b;padding:30px}
.count{text-align:center;color:#94a3b8;font-size:.85rem;margin-bottom:14px}
`;

app.get("/", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM notes ORDER BY id DESC");
  const items = rows.length
    ? rows.map((r) => `<div class="card"><div class="txt">${esc(r.content)}<span class="date">${r.created_at.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}</span></div>
<form method="POST" action="/delete/${r.id}" style="margin:0"><button class="del">Hapus</button></form></div>`).join("")
    : '<div class="empty">Belum ada catatan. Tulis yang pertama!</div>';
  res.send(`<!DOCTYPE html><html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Catatan Haydar</title><style>${css}</style></head>
<body><div class="wrap"><h1>Catatan Haydar</h1><p class="sub">Node.js + MySQL di Docker, Azure VM</p>
<form method="POST" action="/add"><input name="content" placeholder="Tulis catatan..." required maxlength="255" autofocus>
<button class="btn">Simpan</button></form>
<p class="count">${rows.length} catatan</p>${items}</div></body></html>`);
});

app.post("/add", async (req, res) => {
  const content = (req.body.content || "").trim();
  if (content) await pool.query("INSERT INTO notes (content) VALUES (?)", [content]);
  res.redirect("/");
});

app.post("/delete/:id", async (req, res) => {
  await pool.query("DELETE FROM notes WHERE id = ?", [req.params.id]);
  res.redirect("/");
});

initDb().then(() => app.listen(3000, () => console.log("App jalan di port 3000")));
