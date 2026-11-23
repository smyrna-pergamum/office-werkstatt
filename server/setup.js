/* Office Werkstatt – first-run setup
 * A server that is reachable from the network but has no account yet does not refuse to start any more.
 * It starts in setup mode instead: every request is sent to /setup, where the first administrator is created
 * in the browser. To prove that the person is the one who runs the server, a one-time setup code is printed
 * in the server console (docker logs …) and written to <data>/SETUP-CODE.txt. OW_SETUP_CODE sets it yourself.
 *   GET  /setup            setup page (5 languages)
 *   POST /api/setup        { code, name, password } → first administrator, setup mode ends
 * Only /api/health and the logo are served besides these while setup is pending. */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // no 0/O, 1/I
const newCode = () => { const b = crypto.randomBytes(8); let s = ''; for (let i = 0; i < 8; i++) s += ALPHABET[b[i] % ALPHABET.length]; return s.slice(0, 4) + '-' + s.slice(4); };
const norm = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

module.exports = function makeSetup({ DATA, users, log, readBody, send }) {
  const FILE = path.join(DATA, 'SETUP-CODE.txt');
  let active = false, code = '';
  const fails = new Map();

  function begin(url) {
    active = true;
    code = process.env.OW_SETUP_CODE ? String(process.env.OW_SETUP_CODE) : newCode();
    try { fs.writeFileSync(FILE, `Office Werkstatt setup code: ${code}\nOpen ${url}/setup and create the first administrator.\nThis file is deleted when the setup is done.\n`, { mode: 0o600 }); } catch { /* read-only disk */ }
    const line = '═'.repeat(62);
    console.log(`\n${line}\n  Office Werkstatt – first-run setup\n\n  Open  ${url}/setup\n  Setup code:  ${code}\n\n  (also in ${FILE})\n${line}\n`);
    log.warn('setup.pending', { url });
  }
  function finish() { active = false; code = ''; try { fs.rmSync(FILE, { force: true }); } catch { /* ignore */ } }

  const tooMany = ip => { const t = Date.now() - 15 * 60000, a = (fails.get(ip) || []).filter(x => x > t); fails.set(ip, a); return a.length >= 10; };

  async function submit(req, res) {
    const ip = req.socket.remoteAddress || '?';
    if (req.headers['x-ow-request'] !== '1') return send(res, 403, { error: 'bad request' });
    if (tooMany(ip)) return send(res, 429, { error: 'too many attempts', code: 'locked' });
    let b; try { b = JSON.parse(await readBody(req, 8192)); } catch { return send(res, 400, { error: 'bad request' }); }
    const want = Buffer.from(norm(code)), got = Buffer.from(norm(b.code));
    if (!(want.length && want.length === got.length && crypto.timingSafeEqual(want, got))) {
      fails.set(ip, (fails.get(ip) || []).concat(Date.now()));
      log.warn('setup.wrongCode', { ip });
      return send(res, 403, { error: 'wrong setup code', code: 'wrong_code' });
    }
    try { users.add({ name: String(b.name || '').trim(), password: b.password, role: 'admin' }); }
    catch (e) { return send(res, 400, { error: e.message, code: e.code }); }
    log.warn('setup.done', { user: String(b.name).trim(), ip });
    finish();
    return send(res, 200, { ok: true });
  }

  /* → true when the request was answered here */
  function handle(req, res, urlPath) {
    if (!active) return false;
    if (users.count() > 0) { finish(); return false; }               // an account was added another way (owctl)
    if (urlPath === '/api/health' || urlPath === '/assets/logo.svg') return false;
    if (urlPath === '/setup' && req.method === 'GET') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY' }); res.end(PAGE); return true; }
    if (urlPath === '/api/setup' && req.method === 'POST') { submit(req, res).catch(() => send(res, 500, { error: 'server error' })); return true; }
    if (urlPath.startsWith('/api/')) { send(res, 503, { error: 'setup required', setup: '/setup' }); return true; }
    res.writeHead(302, { Location: '/setup', 'Cache-Control': 'no-store' }); res.end(); return true;
  }

  return { begin, finish, handle, get active() { return active; }, get code() { return code; } };
};

/* ---------- the page (self-contained, no app code needed) ---------- */
const T = {
  en: ['Set up Office Werkstatt', 'This server has no account yet. Create the first administrator – afterwards everybody signs in, and you add more people in Control center › Users.', 'Setup code', 'It is shown in the server console when the server starts (Docker: docker logs office-werkstatt) and in the file SETUP-CODE.txt in the data folder.', 'Administrator name', 'Password', 'at least 8 characters', 'Repeat password', 'Create administrator', 'Done! Sign in with your new account.', 'Open Office Werkstatt', 'The setup code is wrong.', 'The passwords are not the same.', 'Too many wrong attempts – wait 15 minutes.', 'Name: letters, digits and . _ @ - only.', 'The password is too short.', 'Something went wrong:'],
  de: ['Office Werkstatt einrichten', 'Dieser Server hat noch kein Konto. Lege den ersten Administrator an – danach melden sich alle an, und weitere Personen fügst du im Kontrollzentrum › Benutzer hinzu.', 'Einrichtungscode', 'Er steht beim Start in der Server-Konsole (Docker: docker logs office-werkstatt) und in der Datei SETUP-CODE.txt im Datenordner.', 'Name des Administrators', 'Passwort', 'mindestens 8 Zeichen', 'Passwort wiederholen', 'Administrator anlegen', 'Fertig! Melde dich mit dem neuen Konto an.', 'Office Werkstatt öffnen', 'Der Einrichtungscode ist falsch.', 'Die Passwörter stimmen nicht überein.', 'Zu viele Fehlversuche – bitte 15 Minuten warten.', 'Name: nur Buchstaben, Ziffern und . _ @ -.', 'Das Passwort ist zu kurz.', 'Etwas ist schiefgelaufen:'],
  tr: ['Office Werkstatt kurulumu', 'Bu sunucuda henüz hesap yok. İlk yöneticiyi oluşturun – bundan sonra herkes giriş yapar; diğer kişileri Kontrol merkezi › Kullanıcılar bölümünden eklersiniz.', 'Kurulum kodu', 'Sunucu başlarken konsolda gösterilir (Docker: docker logs office-werkstatt) ve veri klasöründeki SETUP-CODE.txt dosyasında yazar.', 'Yönetici adı', 'Parola', 'en az 8 karakter', 'Parolayı tekrarla', 'Yöneticiyi oluştur', 'Tamam! Yeni hesabınızla giriş yapın.', 'Office Werkstatt\'ı aç', 'Kurulum kodu yanlış.', 'Parolalar aynı değil.', 'Çok fazla hatalı deneme – 15 dakika bekleyin.', 'Ad: yalnızca harf, rakam ve . _ @ -', 'Parola çok kısa.', 'Bir sorun oluştu:'],
  es: ['Configurar Office Werkstatt', 'Este servidor aún no tiene cuentas. Crea el primer administrador; después todos inician sesión y añades más personas en Centro de control › Usuarios.', 'Código de configuración', 'Aparece en la consola del servidor al iniciarse (Docker: docker logs office-werkstatt) y en el archivo SETUP-CODE.txt de la carpeta de datos.', 'Nombre del administrador', 'Contraseña', 'al menos 8 caracteres', 'Repetir contraseña', 'Crear administrador', '¡Listo! Inicia sesión con tu nueva cuenta.', 'Abrir Office Werkstatt', 'El código de configuración es incorrecto.', 'Las contraseñas no coinciden.', 'Demasiados intentos fallidos: espera 15 minutos.', 'Nombre: solo letras, cifras y . _ @ -', 'La contraseña es demasiado corta.', 'Algo salió mal:'],
  fr: ['Configurer Office Werkstatt', 'Ce serveur n\'a pas encore de compte. Créez le premier administrateur – ensuite tout le monde se connecte et vous ajoutez d\'autres personnes dans Centre de contrôle › Utilisateurs.', 'Code de configuration', 'Il s\'affiche dans la console du serveur au démarrage (Docker : docker logs office-werkstatt) et dans le fichier SETUP-CODE.txt du dossier de données.', 'Nom de l\'administrateur', 'Mot de passe', 'au moins 8 caractères', 'Répéter le mot de passe', 'Créer l\'administrateur', 'Terminé ! Connectez-vous avec votre nouveau compte.', 'Ouvrir Office Werkstatt', 'Le code de configuration est incorrect.', 'Les mots de passe ne correspondent pas.', 'Trop de tentatives – attendez 15 minutes.', 'Nom : lettres, chiffres et . _ @ - uniquement.', 'Le mot de passe est trop court.', 'Une erreur est survenue :'],
};
const PAGE = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Office Werkstatt – Setup</title><link rel="icon" href="/assets/logo.svg">
<style>
:root{--c:#6B5CF0;--ink:#161A33;--ink2:#555B78;--line:#D5D9E8;--bg:#F5F6FC;--panel:#fff}
@media (prefers-color-scheme:dark){:root{--ink:#ECEEF8;--ink2:#A9AFC8;--line:#313857;--bg:#0F1220;--panel:#181C2E}}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(900px 400px at 80% -10%,rgba(139,124,248,.18),transparent 60%),var(--bg);color:var(--ink);font:15px/1.5 "Segoe UI",system-ui,-apple-system,Arial,sans-serif}
.card{width:min(460px,100%);background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:28px;box-shadow:0 10px 40px rgba(22,26,51,.08)}
.head{display:flex;align-items:center;gap:12px;margin-bottom:6px}.head img{width:42px;height:42px}h1{font-size:22px;margin:0}
p{color:var(--ink2);margin:6px 0 18px}label{display:block;font-weight:600;font-size:13px;margin:14px 0 6px}small{display:block;color:var(--ink2);font-size:12px;margin-top:4px}
input{width:100%;height:44px;border:1px solid var(--line);border-radius:12px;padding:0 14px;font:inherit;background:transparent;color:inherit;outline:none}input:focus{border-color:var(--c);box-shadow:0 0 0 3px rgba(107,92,240,.15)}
#code{font:600 18px/1 Consolas,ui-monospace,monospace;letter-spacing:.15em;text-transform:uppercase}
button,.btn{margin-top:20px;width:100%;height:46px;border:0;border-radius:12px;background:var(--c);color:#fff;font-family:inherit;font-weight:600;font-size:15px;line-height:46px;padding:0;cursor:pointer;text-align:center;text-decoration:none;display:block}button:hover,.btn:hover{background:#5A4BE0}button:disabled{opacity:.6}
.err{color:#D93A32;margin:12px 0 0;min-height:1em;font-size:14px}.ok{text-align:center}.ok b{display:block;font-size:40px;color:#1E9E5A}
.lang{float:right;border:0;background:transparent;color:var(--ink2);font:inherit}
</style></head><body>
<main class="card">
<select class="lang" id="lang" aria-label="Language"><option value="en">English</option><option value="de">Deutsch</option><option value="tr">Türkçe</option><option value="es">Español</option><option value="fr">Français</option></select>
<div class="head"><img src="/assets/logo.svg" alt=""><h1 data-t="0"></h1></div>
<form id="f" autocomplete="off">
<p data-t="1"></p>
<label for="code" data-t="2"></label><input id="code" required autocomplete="one-time-code" placeholder="XXXX-XXXX"><small data-t="3"></small>
<label for="name" data-t="4"></label><input id="name" required maxlength="64" value="admin" autocomplete="username">
<label for="pw" data-t="5"></label><input id="pw" type="password" required minlength="8" autocomplete="new-password"><small data-t="6"></small>
<label for="pw2" data-t="7"></label><input id="pw2" type="password" required minlength="8" autocomplete="new-password">
<div class="err" id="err" role="alert"></div>
<button id="go" data-t="8"></button>
</form>
<div class="ok" id="ok" hidden><b>✓</b><p data-t="9"></p><a class="btn" href="/" data-t="10"></a></div>
</main>
<script>
const T=${JSON.stringify(T)};
const nav=(navigator.language||'en').slice(0,2);let L=localStorage.getItem('ow-lang')||(T[nav]?nav:'en');
const $=id=>document.getElementById(id);
function apply(){document.documentElement.lang=L;$('lang').value=L;document.querySelectorAll('[data-t]').forEach(e=>e.textContent=T[L][+e.dataset.t]);}
$('lang').onchange=e=>{L=e.target.value;try{localStorage.setItem('ow-lang',L)}catch(x){}apply();};apply();
$('f').onsubmit=async e=>{e.preventDefault();const err=$('err'),t=T[L];err.textContent='';
 if($('pw').value!==$('pw2').value)return err.textContent=t[12];
 $('go').disabled=true;
 try{const r=await fetch('/api/setup',{method:'POST',headers:{'Content-Type':'application/json','X-OW-Request':'1'},body:JSON.stringify({code:$('code').value,name:$('name').value,password:$('pw').value})});
  const j=await r.json().catch(()=>({}));
  if(r.ok){$('f').hidden=true;$('ok').hidden=false;return;}
  err.textContent=({wrong_code:t[11],locked:t[13],bad_name:t[14],weak_password:t[15]})[j.code]||(t[16]+' '+(j.error||r.status));
 }catch(x){err.textContent=t[16]+' '+x.message;}
 $('go').disabled=false;};
</script></body></html>`;
module.exports.newCode = newCode;
