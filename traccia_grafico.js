/* AVDESK · Grafico Traccia stimoli
 * Replica il grafico "Mappa Spaziale Posizione Stimoli (%)" di Prospetto_Grafico_AVDesk.xlsm
 * Nessuna dipendenza: canvas + CSS iniettato dal modulo.
 *
 * Uso:
 *   AvdeskTracciaGrafico.apri(righeTraccia);
 *   AvdeskTracciaGrafico.aggiungiPulsante(contenitoreDOM, () => righeTraccia);
 *
 * Ogni riga della traccia può avere (nomi accettati, maiuscole/spazi indifferenti):
 *   x | "X (%)"           -> posizione orizzontale 0-100
 *   y | "Y (%)"           -> posizione verticale 0-100
 *   categoria | "Categoria Mappa" | esito | "Esito Stimolo"
 *        valori: beccato, distrattori (o nullo), falso positivo, timeout, interrotto
 */
(function (global) {
  'use strict';

  // Serie e stile identici al grafico del .xlsm
  var SERIE = [
    { key: 'beccato',        label: 'Beccato (Target Intercettato)', simbolo: 'cerchio',   size: 7,  fill: '#2E8B57', line: '#228B22' },
    { key: 'distrattori',    label: 'Distrattori (Non Target)',      simbolo: 'cerchio',   size: 4,  fill: '#C8C8C8', line: '#A0A0A0' },
    { key: 'falso positivo', label: 'Falso Positivo',                simbolo: 'triangolo', size: 9,  fill: '#FF8C00', line: '#FF4500' },
    { key: 'timeout',        label: 'Timeout (Target Mancato)',      simbolo: 'x',         size: 10, fill: null,      line: '#DC143C' }
  ];
  var RIEPILOGO = [
    { key: 'beccato', nome: 'Beccato' },
    { key: 'distrattori', nome: 'Distrattori' },
    { key: 'falso positivo', nome: 'Falso Positivo' },
    { key: 'timeout', nome: 'Timeout' },
    { key: 'interrotto', nome: 'Interrotto' }
  ];

  function norm(s) {
    return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  function leggi(riga, nomi) {
    var mappa = {};
    Object.keys(riga).forEach(function (k) { mappa[norm(k)] = riga[k]; });
    for (var i = 0; i < nomi.length; i++) {
      var v = mappa[norm(nomi[i])];
      if (v !== undefined && v !== null && v !== '') return v;
    }
    return null;
  }
  function num(v) {
    if (v === null) return null;
    var n = parseFloat(String(v).replace(',', '.'));
    return isFinite(n) ? n : null;
  }
  function categoria(riga) {
    var c = leggi(riga, ['Categoria Mappa', 'categoria', 'Esito Stimolo', 'esito']);
    c = String(c || '').toLowerCase().trim();
    if (c === 'nullo') c = 'distrattori';
    if (c === 'falsopositivo' || c === 'falso_positivo') c = 'falso positivo';
    return c;
  }

  function elabora(righe) {
    var punti = {}, conteggi = {};
    SERIE.forEach(function (s) { punti[s.key] = []; });
    RIEPILOGO.forEach(function (r) { conteggi[r.key] = 0; });
    (righe || []).forEach(function (r) {
      var c = categoria(r);
      if (!(c in conteggi)) return;
      conteggi[c]++;
      var x = num(leggi(r, ['x', 'X (%)', 'posx'])), y = num(leggi(r, ['y', 'Y (%)', 'posy']));
      if (punti[c] && x !== null && y !== null) punti[c].push([x, y]);
    });
    var totale = 0;
    RIEPILOGO.forEach(function (r) { totale += conteggi[r.key]; });
    return { punti: punti, conteggi: conteggi, totale: totale };
  }

  // ---- disegno -------------------------------------------------------------
  function marker(ctx, s, cx, cy) {
    var r = s.size / 2;
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = s.line;
    if (s.simbolo === 'cerchio') {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = s.fill; ctx.fill(); ctx.stroke();
    } else if (s.simbolo === 'triangolo') {
      ctx.beginPath();
      ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy + r); ctx.lineTo(cx - r, cy + r); ctx.closePath();
      ctx.fillStyle = s.fill; ctx.fill(); ctx.stroke();
    } else {
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy + r);
      ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r);
      ctx.stroke();
    }
  }

  function disegna(canvas, dati, opz) {
    var dpr = global.devicePixelRatio || 1;
    var W = canvas.clientWidth, H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);

    var L = 58, R = 16, T = 44, B = 52;
    var pw = W - L - R, ph = H - T - B;
    function px(x) { return L + (x / 100) * pw; }
    function py(y) { return opz.yDalAlto ? T + (y / 100) * ph : T + ph - (y / 100) * ph; }

    ctx.font = 'bold 15px system-ui, Arial, sans-serif';
    ctx.fillStyle = '#222'; ctx.textAlign = 'center';
    ctx.fillText('Mappa Spaziale Posizione Stimoli (%)', L + pw / 2, 26);

    ctx.font = '11px system-ui, Arial, sans-serif';
    ctx.strokeStyle = '#d9d9d9'; ctx.lineWidth = 1; ctx.fillStyle = '#595959';
    for (var v = 0; v <= 100; v += 10) {
      ctx.beginPath(); ctx.moveTo(px(v), T); ctx.lineTo(px(v), T + ph); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(L, py(v)); ctx.lineTo(L + pw, py(v)); ctx.stroke();
      ctx.textAlign = 'center'; ctx.fillText(v, px(v), T + ph + 16);
      ctx.textAlign = 'right';  ctx.fillText(v.toFixed(2), L - 6, py(v) + 4);
    }
    ctx.strokeStyle = '#8c8c8c';
    ctx.strokeRect(L, T, pw, ph);

    ctx.fillStyle = '#333'; ctx.font = '12px system-ui, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Posizione Orizzontale X (%)', L + pw / 2, H - 10);
    ctx.save(); ctx.translate(14, T + ph / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText('Posizione Verticale Y (%)', 0, 0); ctx.restore();

    // Ordine come nel foglio: l'ultima serie sta sopra
    SERIE.forEach(function (s) {
      dati.punti[s.key].forEach(function (p) { marker(ctx, s, px(p[0]), py(p[1])); });
    });
  }

  // ---- interfaccia ---------------------------------------------------------
  var CSS = '' +
    '.avtg-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:12px}' +
    '.avtg-box{background:var(--panel,#fff);color:var(--text,#222);border:1px solid var(--border,#ccc);border-radius:10px;max-width:960px;width:100%;max-height:96vh;overflow:auto;padding:14px 16px;box-shadow:0 10px 40px rgba(0,0,0,.4);font-family:system-ui,Arial,sans-serif}' +
    '.avtg-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}' +
    '.avtg-head h3{margin:0;font-size:16px}' +
    '.avtg-x{border:0;background:var(--panel-2,#eee);color:inherit;border-radius:6px;font-size:18px;line-height:1;padding:4px 10px;cursor:pointer}' +
    '.avtg-body{display:flex;gap:16px;flex-wrap:wrap}' +
    '.avtg-canvas{flex:1 1 520px;min-width:300px;aspect-ratio:1/0.8;height:auto;border:1px solid #ddd;border-radius:6px}' +
    '.avtg-side{flex:0 1 270px;min-width:230px}' +
    '.avtg-leg{display:flex;align-items:center;gap:8px;font-size:13px;margin:0 0 6px}' +
    '.avtg-side table{border-collapse:collapse;width:100%;margin-top:12px;font-size:13px;color:inherit}' +
    '.avtg-side th{background:var(--accent-dim,#1f4e79);color:#fff;padding:5px 8px;text-align:left}' +
    '.avtg-side td{padding:4px 8px;border-bottom:1px solid var(--border,#e3e3e3)}' +
    '.avtg-side td+td,.avtg-side th+th{text-align:right}' +
    '.avtg-side tr.tot td{font-weight:700;background:var(--panel-2,#f2f2f2)}' +
    '.avtg-vuoto{padding:30px;text-align:center;color:var(--text-dim,#666)}' +
    '.avtg-btn{cursor:pointer}';

  function iniettaCss() {
    if (document.getElementById('avtg-css')) return;
    var st = document.createElement('style'); st.id = 'avtg-css'; st.textContent = CSS;
    document.head.appendChild(st);
  }

  function iconaLegenda(s) {
    var c = document.createElement('canvas'); c.width = 22; c.height = 22;
    marker(c.getContext('2d'), s, 11, 11);
    return c;
  }

  function apri(righe, opz) {
    opz = opz || {};
    iniettaCss();
    chiudi();
    var dati = elabora(righe);

    var ov = document.createElement('div'); ov.className = 'avtg-overlay'; ov.id = 'avtg-overlay';
    var box = document.createElement('div'); box.className = 'avtg-box';
    ov.appendChild(box);

    var head = document.createElement('div'); head.className = 'avtg-head';
    var h = document.createElement('h3');
    h.textContent = opz.titolo || 'Traccia stimoli · Mappa spaziale X-Y';
    var x = document.createElement('button'); x.className = 'avtg-x'; x.textContent = '\u00d7';
    x.setAttribute('aria-label', 'Chiudi'); x.onclick = chiudi;
    head.appendChild(h); head.appendChild(x); box.appendChild(head);

    if (!dati.totale) {
      var v = document.createElement('div'); v.className = 'avtg-vuoto';
      v.textContent = 'Nessun dato di traccia disponibile per questa sessione.';
      box.appendChild(v);
    } else {
      var body = document.createElement('div'); body.className = 'avtg-body'; box.appendChild(body);
      var canvas = document.createElement('canvas'); canvas.className = 'avtg-canvas'; body.appendChild(canvas);
      var side = document.createElement('div'); side.className = 'avtg-side'; body.appendChild(side);

      SERIE.forEach(function (s) {
        var p = document.createElement('p'); p.className = 'avtg-leg';
        p.appendChild(iconaLegenda(s));
        p.appendChild(document.createTextNode(s.label));
        side.appendChild(p);
      });

      var t = '<table><thead><tr><th>Esito / Categoria</th><th>N.</th><th>% totale</th></tr></thead><tbody>';
      RIEPILOGO.forEach(function (r) {
        var n = dati.conteggi[r.key];
        t += '<tr><td>' + r.nome + '</td><td>' + n + '</td><td>' +
             (dati.totale ? (n / dati.totale * 100).toFixed(1) : '0.0') + '%</td></tr>';
      });
      t += '<tr class="tot"><td>TOTALE</td><td>' + dati.totale + '</td><td>100.0%</td></tr></tbody></table>';
      side.insertAdjacentHTML('beforeend', t);

      document.body.appendChild(ov);
      var ridisegna = function () { disegna(canvas, dati, opz); };
      ridisegna();
      ov._resize = ridisegna; global.addEventListener('resize', ridisegna);
    }
    if (!ov.parentNode) document.body.appendChild(ov);
    ov.addEventListener('click', function (e) { if (e.target === ov) chiudi(); });
    document.addEventListener('keydown', escChiudi);
  }

  function escChiudi(e) { if (e.key === 'Escape') chiudi(); }
  function chiudi() {
    var ov = document.getElementById('avtg-overlay');
    if (ov) {
      if (ov._resize) global.removeEventListener('resize', ov._resize);
      ov.remove();
    }
    document.removeEventListener('keydown', escChiudi);
  }

  // Crea il pulsante "Grafico traccia stimoli" dentro un contenitore
  function aggiungiPulsante(contenitore, getRighe, opz) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'avtg-btn ' + ((opz && opz.classe) || '');
    b.textContent = (opz && opz.testo) || '📊 Grafico traccia stimoli';
    b.addEventListener('click', function () { apri(getRighe(), opz); });
    contenitore.appendChild(b);
    return b;
  }

  global.AvdeskTracciaGrafico = { apri: apri, chiudi: chiudi, aggiungiPulsante: aggiungiPulsante };
})(window);
