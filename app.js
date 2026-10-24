/* Apertura PARAMETRI indipendente dal resto dell'applicazione.
   Questo handler inline resta operativo anche se un errore JavaScript
   successivo impedisce l'inizializzazione di altri moduli. */
function AVDESK_apriParametri(){
  var modal = document.getElementById("modal-parametri");
  if(!modal) return false;
  modal.classList.add("open");

  // Precarica i parametri correnti direttamente da localStorage.
  try{
    var raw = localStorage.getItem("avdesk_config_v2");
    var c = raw ? JSON.parse(raw) : {};
    var d = {timeLed:3000, timeoutBarra:2000, numStimoli:100, percSx:80, percCentro:5, raggio:20, suono:"errore", autosave:true, trace:true, randomLed:true};
    Object.assign(d,c||{});
    var set = function(id,val){ var e=document.getElementById(id); if(e && val!==undefined) e.value=val; };
    set("p-timeLed",d.timeLed); set("p-timeoutBarra",d.timeoutBarra);
    // 0 non è ammesso per il numero di stimoli: correggi eventuali vecchi salvataggi.
    d.numStimoli = (Number(d.numStimoli) >= 1) ? Math.floor(Number(d.numStimoli)) : 100;
    set("p-numStimoli",d.numStimoli); set("p-percSx",d.percSx);
    set("p-percCentro",d.percCentro); set("p-raggio",d.raggio); set("p-suono",d.suono);
    var e=document.getElementById("p-autosave"); if(e) e.checked=!!d.autosave;
    e=document.getElementById("p-trace"); if(e) e.checked=!!d.trace;
    e=document.getElementById("p-randomLed"); if(e) e.checked=!!d.randomLed;
  }catch(err){}
  /* Popola combo piani/profili, colori bersaglio e sliders dal modulo principale
     (prima non veniva mai chiamato: il combo dei piani restava vuoto). */
  try{
    if(typeof window.AVDESK_popolaForm==="function") window.AVDESK_popolaForm();
  }catch(err){ console.error("AVDESK_popolaForm:",err); }
  return false;
}
/* Salvataggio PARAMETRI indipendente dal resto dell\'applicazione. */
function AVDESK_salvaParametri(){
  try{
    var get=function(id){return document.getElementById(id);};
    var num=function(id,def){
      var e=get(id), n=Number(e && e.value);
      return Number.isFinite(n) ? n : def;
    };
    var cfg={};
    var raw=localStorage.getItem("avdesk_config_v2");
    if(raw){ try{ cfg=JSON.parse(raw)||{}; }catch(e){ cfg={}; } }

    cfg.timeLed=Math.max(200,num("p-timeLed",3000));
    cfg.timeoutBarra=Math.max(100,num("p-timeoutBarra",2000));
    /* STIMOLI è un parametro indipendente: salva esattamente il valore
       presente nel campo quando la modalità è random. */
    var randomEl=get("p-randomLed");
    var isRandom=randomEl ? !!randomEl.checked : true;
    if(isRandom){
      cfg.numStimoli=Math.max(1,Math.floor(num("p-numStimoli",100)));
    } else {
      var planSel=get("p-piano-select");
      var planId=planSel ? (planSel.value||"") : "";
      cfg.activePlanId=planId||null;
      /* In modalità piano il numero di stimoli deriva dal piano. */
      cfg.numStimoli=cfg.numStimoli||100;
    }
    cfg.percSx=Math.min(100,Math.max(0,num("p-percSx",80)));
    cfg.percCentro=Math.min(100-cfg.percSx,Math.max(0,num("p-percCentro",5)));
    cfg.raggio=Math.max(6,num("p-raggio",20));
    var suono=get("p-suono"); if(suono) cfg.suono=suono.value;
    var autosave=get("p-autosave"); if(autosave) cfg.autosave=!!autosave.checked;
    var trace=get("p-trace"); if(trace) cfg.trace=!!trace.checked;
    var random=get("p-randomLed"); if(random) cfg.randomLed=!!random.checked;

    var target=document.querySelector('input[name="p-target"]:checked');
    if(target) cfg.targetColor=target.value;
    var profSel=get("p-profile-select");
    if(profSel) cfg.activeProfileId=profSel.value||null;
    var planSel=get("p-piano-select");
    if(planSel) cfg.activePlanId=planSel.value||null;

    var profile={};
    document.querySelectorAll("#p-color-profile input[type=range]").forEach(function(inp){
      profile[inp.dataset.color]=Number(inp.value)||0;
    });
    var sum=Object.keys(profile).reduce(function(a,k){return a+profile[k];},0);
    if(sum>0){
      Object.keys(profile).forEach(function(k){ profile[k]=Math.round(profile[k]*100/sum); });
      cfg.profile=profile;
    }

    var serialized=JSON.stringify(cfg);
    localStorage.setItem("avdesk_config_v2",serialized);

    /* Verifica immediata del valore STIMOLI appena scritto. */
    var checkRaw=localStorage.getItem("avdesk_config_v2");
    var checkCfg=checkRaw ? JSON.parse(checkRaw) : null;
    if(!checkCfg || Number(checkCfg.numStimoli)!==Number(cfg.numStimoli)){
      throw new Error("Il parametro STIMOLI non è stato memorizzato correttamente.");
    }

    /* Aggiorna anche CONFIG, se il codice principale è attivo. */
    try{ if(typeof window.AVDESK_aggiornaConfig==="function") window.AVDESK_aggiornaConfig(cfg); }catch(e){}

    var btn=get("p-save");
    if(btn){
      var old=btn.textContent;
      btn.textContent="Salvato ✓";
      setTimeout(function(){btn.textContent=old;},1200);
    }
    var modal=get("modal-parametri");
    if(modal) modal.classList.remove("open");
  }catch(err){
    alert("Errore nel salvataggio dei parametri: "+err.message);
  }
  return false;
}

/* =========================================================
   GESTIONE FILE .INI — esportazione/importazione dei parametri
   ========================================================= */
function AVDESK_esportaINI(){
  try{
    /* Costruisce il file dai valori correnti della maschera, senza
       richiedere un salvataggio preliminare in localStorage. */
    var get=function(id){ return document.getElementById(id); };
    var val=function(id,def){ var e=get(id); return e ? e.value : def; };
    var checked=function(id,def){ var e=get(id); return e ? (e.checked ? "true" : "false") : def; };
    var target=document.querySelector('input[name="p-target"]:checked');
    var profile={};
    document.querySelectorAll("#p-color-profile input[type=range]").forEach(function(inp){
      profile[inp.dataset.color]=Number(inp.value)||0;
    });

    var lines=[
      "; AVDESK · Stimolazione Visiva",
      "; File parametri .INI — versione 1",
      "; Generato automaticamente da AVDESK",
      "",
      "[AVDESK]",
      "version=1",
      "timeLed="+val("p-timeLed",3000),
      "timeoutBarra="+val("p-timeoutBarra",2000),
      "numStimoli="+val("p-numStimoli",100),
      "percSx="+val("p-percSx",80),
      "percCentro="+val("p-percCentro",5),
      "raggio="+val("p-raggio",20),
      "suono="+val("p-suono","errore"),
      "autosave="+checked("p-autosave","true"),
      "trace="+checked("p-trace","true"),
      "targetColor="+(target ? target.value : "rosso"),
      "randomLed="+checked("p-randomLed","true"),
      "activeProfileId="+val("p-profile-select",""),
      "activePlanId="+val("p-piano-select",""),
      "",
      "[PROFILE]"
    ];
    ["rosso","grigio","nero","blu","giallo","verde","bianco"].forEach(function(k){
      lines.push(k+"="+(profile[k] !== undefined ? profile[k] : 0));
    });

    /* Piani di modulazione (da localStorage "avdesk_plans_v1"). */
    var plans=[];
    try{ plans=JSON.parse(localStorage.getItem("avdesk_plans_v1")||"[]")||[]; }catch(e){ plans=[]; }
    lines.push("");
    lines.push("[PLANS]");
    lines.push("count="+plans.length);
    plans.forEach(function(pl,i){
      var st=pl.stimuli||[];
      lines.push("");
      lines.push("[PLAN"+(i+1)+"]");
      lines.push("id="+String(pl.id||"").replace(/[\r\n]/g," "));
      lines.push("name="+String(pl.name||"").replace(/[\r\n]/g," "));
      lines.push("count="+st.length);
      /* formato stimolo: xPct;yPct;colore;fascia */
      st.forEach(function(pt,j){
        lines.push("s"+(j+1)+"="+pt.xPct+";"+pt.yPct+";"+pt.colore+";"+pt.fascia);
      });
    });

    var blob=new Blob([lines.join("\r\n")+"\r\n"],{type:"text/plain;charset=utf-8"});
    var a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="AVDESK_parametri.ini";
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },1000);
  }catch(err){
    alert("Errore nell'esportazione .INI: "+err.message);
  }
  return false;
}

function AVDESK_importaINI(){
  var input=document.getElementById("avdesk-ini-file");
  if(!input) return false;
  input.value="";
  input.onchange=function(){
    var file=input.files && input.files[0];
    if(!file) return;
    var reader=new FileReader();
    reader.onload=function(){
      try{
        var parsed=AVDESK_parseINI(String(reader.result||""));
        var nPiani=AVDESK_applicaINI(parsed)||0;
        alert("Parametri .INI importati"+(nPiani ? " ("+nPiani+" piani di modulazione salvati)" : "")+
              ". Premi 'Salva parametri' per renderli attivi e permanenti.");
      }catch(err){
        alert("Errore nell'importazione .INI: "+err.message);
      }
    };
    reader.onerror=function(){ alert("Impossibile leggere il file .INI."); };
    reader.readAsText(file,"UTF-8");
  };
  input.click();
  return false;
}

function AVDESK_parseINI(text){
  var section="";
  var out={AVDESK:{},PROFILE:{},PLANLIST:[]};
  var planIdx=-1;
  text.replace(/^\uFEFF/,"").split(/\r?\n/).forEach(function(raw){
    var line=raw.trim();
    if(!line || line.charAt(0)===";" || line.charAt(0)==="#") return;
    var sec=line.match(/^\[([^\]]+)\]$/);
    if(sec){
      section=sec[1].trim().toUpperCase();
      var pm=section.match(/^PLAN(\d+)$/);
      if(pm){ planIdx=out.PLANLIST.length; out.PLANLIST.push({}); } else { planIdx=-1; }
      return;
    }
    var pos=line.indexOf("=");
    if(pos<1) return;
    var key=line.slice(0,pos).trim();
    var value=line.slice(pos+1).trim();
    if(planIdx>=0){ out.PLANLIST[planIdx][key]=value; return; }
    if(section!=="AVDESK" && section!=="PROFILE") return;
    out[section][key]=value;
  });
  if(!Object.keys(out.AVDESK).length) throw new Error("Sezione [AVDESK] non trovata.");
  return out;
}

function AVDESK_applicaINI(data){
  var d=data.AVDESK||{}, p=data.PROFILE||{};
  var nPiani=0;
  if(data.PLANLIST && data.PLANLIST.length && typeof window.AVDESK_importaPiani==="function"){
    nPiani=window.AVDESK_importaPiani(data.PLANLIST);
  }
  var set=function(id,v){ var e=document.getElementById(id); if(e && v!==undefined) e.value=v; };
  var bool=function(v,def){
    if(v===undefined) return def;
    return String(v).toLowerCase()==="true" || String(v)==="1";
  };
  var num=function(v,def,min){
    var n=Number(v);
    if(!Number.isFinite(n)) n=def;
    return min!==undefined ? Math.max(min,n) : n;
  };

  set("p-timeLed",num(d.timeLed,3000,200));
  set("p-timeoutBarra",num(d.timeoutBarra,2000,100));
  set("p-numStimoli",Math.max(1,Math.floor(num(d.numStimoli,100,1))));
  set("p-percSx",Math.min(100,Math.max(0,num(d.percSx,80))));
  var sx=Number(document.getElementById("p-percSx").value);
  set("p-percCentro",Math.min(100-sx,Math.max(0,num(d.percCentro,5))));
  set("p-raggio",num(d.raggio,20,6));
  set("p-suono",d.suono||"errore");
  var e=document.getElementById("p-autosave"); if(e) e.checked=bool(d.autosave,true);
  e=document.getElementById("p-trace"); if(e) e.checked=bool(d.trace,true);
  e=document.getElementById("p-randomLed"); if(e) e.checked=bool(d.randomLed,true);

  document.querySelectorAll('input[name="p-target"]').forEach(function(r){ r.checked=(r.value===(d.targetColor||"rosso")); });
  set("p-profile-select",d.activeProfileId||"");
  set("p-piano-select",d.activePlanId||"");

  document.querySelectorAll("#p-color-profile input[type=range]").forEach(function(inp){
    if(p[inp.dataset.color]!==undefined) inp.value=num(p[inp.dataset.color],Number(inp.value),0);
    var lbl=document.querySelector('[data-color-val="'+inp.dataset.color+'"]');
    if(lbl) lbl.textContent=inp.value+"%";
  });
  if(typeof window.AVDESK_aggiornaSommaProfilo==="function") window.AVDESK_aggiornaSommaProfilo();

  if(typeof updatePercLabels==="function") updatePercLabels();
  if(typeof applyModeFieldsetsState==="function") applyModeFieldsetsState();
  return nPiani;
}

(function(){
  "use strict";

  /* =========================================================
     COSTANTI E PALETTE COLORI  (equivalente enColor / vb* in ModuleProcedura.bas)
     ordine: Rosso, Grigio, Nero, Blu, Giallo, Verde, Bianco  (enCol_Rosso..enCol_White)
     ========================================================= */
  var COLORS = {
    rosso:  { hex:"#ff2b2b", label:"rosso"  },
    grigio: { hex:"#9aa0ab", label:"grigio" },
    nero:   { hex:"#000000", label:"nero"   },
    blu:    { hex:"#3b6bff", label:"blu"    },
    giallo: { hex:"#ffe14d", label:"giallo" },
    verde:  { hex:"#3ecf8e", label:"verde"  },
    bianco: { hex:"#ffffff", label:"bianco" }
  };
  var COLOR_KEYS = Object.keys(COLORS);

  /* Stati sessione — equivalente enum StatoSESSIONE */
  var STATO = {
    WAIT_INI: "WAIT_INI",
    COUNTDOWN: "COUNTDOWN",
    SESSIONE_ON: "SESSIONE_ON",
    WAIT_PRESS: "WAIT_PRESS",
    SESSIONE_OFF: "SESSIONE_OFF"
  };

  /* Valori di default — equivalente cmdDefault_Click in FormParametri.frm */
  var DEFAULT_CONFIG = {
    timeLed: 3000,
    timeoutBarra: 2000,
    numStimoli: 100,
    percSx: 80,
    percCentro: 5,          // percDx = 100 - sx - centro = 15
    raggio: 20,
    suono: "errore",        // ssHand nel form originale
    autosave: true,
    trace: true,
    targetColor: "rosso",
    randomLed: true,
    activeProfileId: null,
    activePlanId: null,
    profile: { rosso:34, grigio:18, nero:0, blu:14, giallo:14, verde:12, bianco:8 }
  };

  var LS_CONFIG   = "avdesk_config_v2";
  var LS_SESSIONS = "avdesk_sessions_v1";
  var LS_PROFILES = "avdesk_profiles_v1";
  var LS_PLANS    = "avdesk_plans_v1";

  function loadJSON(key, fallback){
    try{
      var raw = localStorage.getItem(key);
      if(!raw) return fallback;
      return JSON.parse(raw);
    }catch(e){ return fallback; }
  }
  function saveJSON(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

  function loadConfig(){
    var c = loadJSON(LS_CONFIG, null);
    var merged = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    if(c) Object.assign(merged, c);

    // Numero stimoli: 0 non è un valore valido per il parametro random.
    // Se un salvataggio precedente contiene 0, ripristina il default (100).
    if(!Number.isFinite(Number(merged.numStimoli)) || Number(merged.numStimoli) < 1){
      merged.numStimoli = DEFAULT_CONFIG.numStimoli;
    } else {
      merged.numStimoli = Math.floor(Number(merged.numStimoli));
    }
    return merged;
  }
  function saveConfig(c){ saveJSON(LS_CONFIG, c); }

  var CONFIG   = loadConfig();
  var SESSIONS = loadJSON(LS_SESSIONS, []);
  var PROFILES = loadJSON(LS_PROFILES, []);   // [{id,name,percentages:{...}}]
  var PLANS    = loadJSON(LS_PLANS, []);      // [{id,name,stimuli:[{progressivo,xPct,yPct,colore,fascia}]}]

  function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

  /* =========================================================
     STATO RUNTIME  (equivalente variabili modulo del form)
     ========================================================= */
  var stato = STATO.WAIT_INI;
  var flagModeTraining = false;

  var contaProve = 0;
  var esito = null;
  var ultimoTick = 0;
  var stimoloCorrente = null; // { x, y, colorKey, posiz }
  var tickTimer = null;
  var reactionTimes = [];
  var reazioneGestita = false;
  var traceLog = [];       // traccia per stimolo della sessione in corso (se CONFIG.trace)
  var sessioneT0 = 0;      // istante di avvio sessione (performance.now)

  function nuovoEsito(){
    return { stimoli:0, viste:0, perse:0, falsoPositivo:0, nulli:0,
             contaSx:0, contaCentro:0, contaDx:0, tempoTotale:0 };
  }

  /* =========================================================
     DOM helpers
     ========================================================= */
  var $ = function(id){ return document.getElementById(id); };

  var stage = $("stage");
  var countdownEl = $("countdown");
  var idlePanel = $("idle-panel");
  var infoText = $("info-text");
  var stopBtn = $("stop-btn");
  var startBtn = $("start-btn");
  var clockEl = $("clock");
  var trainingToggle = $("training-toggle");
  var modeBadge = $("mode-badge");

  function updateClock(){
    var d = new Date();
    var pad = function(n){ return String(n).padStart(2,"0"); };
    clockEl.textContent = pad(d.getDate())+"/"+pad(d.getMonth()+1)+"/"+d.getFullYear()+" "+pad(d.getHours())+":"+pad(d.getMinutes())+":"+pad(d.getSeconds());
  }
  setInterval(updateClock, 1000); updateClock();

  function refreshIdlePanel(){
    var c = COLORS[CONFIG.targetColor];
    $("target-swatch").style.color = c.hex;
    $("target-swatch").style.background = c.hex;
    $("target-name").textContent = c.label;
    if(CONFIG.randomLed){
      modeBadge.textContent = "colore random";
    } else {
      var plan = PLANS.filter(function(p){ return p.id === CONFIG.activePlanId; })[0];
      modeBadge.textContent = plan ? "piano: " + plan.name : "piano non selezionato";
    }
  }
  refreshIdlePanel();

  /* =========================================================
     AUDIO — equivalente SUONA / enModalitaSuono (ModuleProcedura.bas)
     I suoni di sistema Windows non sono riproducibili nel browser:
     ogni tipo viene reso con un tono sintetizzato distinto.
     ========================================================= */
  var actx = null;
  function tone(freq, dur, delay, type){
    try{
      if(!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      var t0 = actx.currentTime + (delay||0)/1000;
      var o = actx.createOscillator();
      var g = actx.createGain();
      o.type = type || "sine"; o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.18, t0+0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0+dur/1000);
      o.connect(g); g.connect(actx.destination);
      o.start(t0); o.stop(t0+dur/1000+0.02);
    }catch(e){}
  }
  var SOUND_PATTERNS = {
    nullo:       function(){},
    informativo: function(){ tone(1046,80,0); tone(1568,90,90); },
    avviso:      function(){ tone(700,160,0,"square"); },
    errore:      function(){ tone(220,260,0,"sawtooth"); },
    domanda:     function(){ tone(660,90,0); tone(880,140,100); },
    default:     function(){ tone(700,110,0); },
    beep:        function(){ tone(800,70,0,"square"); }
  };
  function suonaStimolo(){ (SOUND_PATTERNS[CONFIG.suono] || SOUND_PATTERNS.default)(); }
  function suonaInizio(){ SOUND_PATTERNS.domanda(); }   // SUONA ssQuestion, incondizionato all'avvio
  function suonaFine(){ tone(520,80,0); tone(340,180,110); }

  /* =========================================================
     GENERAZIONE STIMOLO — equivalente GeneraLED / generaCOLORE_led_RND / ReadModulazione
     ========================================================= */
  function generaColoreRND(){
    var n = Math.random() * 100;
    var lim = 0;
    for(var i=0;i<COLOR_KEYS.length;i++){
      var k = COLOR_KEYS[i];
      lim += (CONFIG.profile[k] || 0);
      if(n <= lim) return k;
    }
    return COLOR_KEYS[0];
  }

  function stageRect(){ return stage.getBoundingClientRect(); }

  function generaLedRandom(){
    var rect = stageRect();
    var w = rect.width, h = rect.height;
    var r = CONFIG.raggio;
    var margine = 4;
    var terzo = w/3;

    var colorKey = generaColoreRND();

    var rr = Math.random()*100;
    var x, posiz;
    if(rr < CONFIG.percSx){
      x = margine + r + Math.random()*Math.max(0, terzo - r*2 - margine*2);
      posiz = "sx"; esito.contaSx++;
    } else if(rr < CONFIG.percSx + CONFIG.percCentro){
      x = terzo + margine + r + Math.random()*Math.max(0, terzo - r*2 - margine*2);
      posiz = "centro"; esito.contaCentro++;
    } else {
      x = terzo*2 + margine + r + Math.random()*Math.max(0, terzo - r*2 - margine*2);
      posiz = "dx"; esito.contaDx++;
    }
    var y = margine + r + Math.random()*Math.max(0, h - r*2 - margine*2);

    return { x:x, y:y, colorKey:colorKey, posiz:posiz };
  }

  function generaLedModulazione(){
    var plan = PLANS.filter(function(p){ return p.id === CONFIG.activePlanId; })[0];
    if(!plan || !plan.stimuli[contaProve-1]) return null; // equivalente ReadModulazione = False
    var pt = plan.stimuli[contaProve-1];
    var rect = stageRect();
    var x = pt.xPct * rect.width;
    var y = pt.yPct * rect.height;
    if(pt.fascia === "sx") esito.contaSx++;
    else if(pt.fascia === "centro") esito.contaCentro++;
    else esito.contaDx++;
    return { x:x, y:y, colorKey:pt.colore, posiz:pt.fascia };
  }

  function generaLed(){
    return CONFIG.randomLed ? generaLedRandom() : generaLedModulazione();
  }

  var ledEl = null;
  function disegnaSchermo(){
    if(ledEl){ ledEl.remove(); ledEl = null; }
  }
  function disegnaLed(s){
    disegnaSchermo();
    var c = COLORS[s.colorKey];
    ledEl = document.createElement("div");
    ledEl.className = "led";
    var d = CONFIG.raggio*2;
    ledEl.style.width = d+"px";
    ledEl.style.height = d+"px";
    ledEl.style.left = (s.x - CONFIG.raggio)+"px";
    ledEl.style.top = (s.y - CONFIG.raggio)+"px";
    ledEl.style.background = c.hex;
    ledEl.style.color = c.hex;
    if(s.colorKey === "nero") ledEl.style.boxShadow = "none";
    stage.appendChild(ledEl);
  }

  /* =========================================================
     INFO BAR —  DisegnaInfoSTIMOLO
     ========================================================= */
  var LABEL_ESITO = {
    nullo: "nullo", preso: "beccato", errTimeout: "timeout", errLed: "falso positivo"
  };
  /* Totale stimoli della sessione: in modalità piano è la lunghezza del piano
     attivo, in modalità random è il parametro "Numero stimoli". */
  function totaleStimoli(){
    if(!CONFIG.randomLed){
      var plan = PLANS.filter(function(p){ return p.id === CONFIG.activePlanId; })[0];
      if(plan && plan.stimuli) return plan.stimuli.length;
    }
    return CONFIG.numStimoli;
  }
  function disegnaInfo(modo){
    var s = "stimolo "+contaProve+" di "+totaleStimoli();
    if(!flagModeTraining && modo){ s += "\n"+LABEL_ESITO[modo]; }
    infoText.textContent = s;
  }

  /* =========================================================
     LOGICA ESITO  — equivalente aggiungiStimolo
     ========================================================= */
  function ctrlColoreLed(stimoloKey, okKey){ return stimoloKey === okKey; }

  function aggiungiStimolo(modo, rtMs){
    if(traceLog.length){
      var te = traceLog[traceLog.length-1];
      if(te.e === null){
        te.e = modo;
        te.rt = (rtMs !== undefined && rtMs !== null) ? Math.round(rtMs) : null;
      }
    }
    if(modo === "preso") esito.viste++;
    else if(modo === "errTimeout") esito.perse++;
    else if(modo === "errLed") esito.falsoPositivo++;
    else if(modo === "nullo") esito.nulli++;
    disegnaInfo(modo);
  }

  /* =========================================================
     CICLO SESSIONE —  TimerSTIMOLI_Timer / NuovoSTIMOLO
     ========================================================= */
  function nuovoStimolo(){
    esito.stimoli++;
    stato = STATO.WAIT_PRESS;
    stimoloCorrente = generaLed();
    if(!stimoloCorrente){ chiudiSessione(); return; }
    ultimoTick = performance.now();
    reazioneGestita = false;
    if(CONFIG.trace){
      var rc = stageRect();
      traceLog.push({
        n: contaProve,
        t: Math.round(ultimoTick - sessioneT0),
        c: stimoloCorrente.colorKey,
        p: stimoloCorrente.posiz,
        x: Math.round(stimoloCorrente.x / rc.width * 10000) / 10000,
        y: Math.round(stimoloCorrente.y / rc.height * 10000) / 10000,
        b: stimoloCorrente.colorKey === CONFIG.targetColor,
        e: null,
        rt: null
      });
    }
    disegnaLed(stimoloCorrente);
    suonaStimolo();
    disegnaInfo(null);
  }

  function tick(){
    if(stato === STATO.WAIT_PRESS && stimoloCorrente){
      if(!ctrlColoreLed(stimoloCorrente.colorKey, CONFIG.targetColor)){
        aggiungiStimolo("nullo");
      } else {
        aggiungiStimolo("errTimeout");
      }
    }

    if(contaProve + 1 > totaleStimoli()){
      chiudiSessione();
    } else {
      contaProve++;
      nuovoStimolo();
    }
  }

  function iniziaSessione(){
    esito = nuovoEsito();
    contaProve = 0;
    traceLog = [];
    sessioneT0 = performance.now();
    disegnaSchermo();
    stato = STATO.SESSIONE_ON;
    contaProve = 1;
    nuovoStimolo();
    if(stato !== STATO.SESSIONE_OFF){
      tickTimer = setInterval(tick, CONFIG.timeLed);
    }
  }

  function chiudiSessione(){
    if(tickTimer){ clearInterval(tickTimer); tickTimer = null; }
    disegnaSchermo();
    stato = STATO.SESSIONE_OFF;
    stopBtn.style.display = "none";
    idlePanel.style.display = "flex";
    suonaFine();

    if(traceLog.length && traceLog[traceLog.length-1].e === null){
      traceLog[traceLog.length-1].e = "interrotto";
    }
    if(!flagModeTraining && esito){
      var rec = buildSessionRecord();
      if(CONFIG.autosave){
        SESSIONS.unshift(rec);
        try{
          saveJSON(LS_SESSIONS, SESSIONS);
        }catch(err){
          /* memoria del browser piena: salva la sessione senza traccia */
          delete rec.trace;
          try{ saveJSON(LS_SESSIONS, SESSIONS); }catch(e2){}
          alert("Spazio del browser insufficiente: la traccia degli stimoli di questa sessione non è stata salvata. Esporta ed elimina le sessioni vecchie.");
        }
      }
      mostraEsitoSessione(rec);
    }
    stato = STATO.WAIT_INI;
  }

  function buildSessionRecord(){
    var avgMs = reactionTimes.length ? Math.round(reactionTimes.reduce(function(a,b){return a+b;},0)/reactionTimes.length) : null;
    return {
      data: new Date().toISOString(),
      stimoli: esito.stimoli,
      viste: esito.viste,
      perse: esito.perse,
      falsoPositivo: esito.falsoPositivo,
      nulli: esito.nulli,
      contaSx: esito.contaSx,
      contaCentro: esito.contaCentro,
      contaDx: esito.contaDx,
      tempoMedioReazioneMs: avgMs,
      target: CONFIG.targetColor,
      modo: CONFIG.randomLed ? "random" : "modulazione",
      trace: (CONFIG.trace && traceLog.length) ? traceLog.slice() : undefined
    };
  }

  /* =========================================================
     REAZIONE UTENTE —               Form_KeyPress(vbKeySpace)
     ========================================================= */
  function gestisciReazione(){
    if(stato !== STATO.WAIT_PRESS || !stimoloCorrente || reazioneGestita) return;
    reazioneGestita = true;

    var okColore = ctrlColoreLed(stimoloCorrente.colorKey, CONFIG.targetColor);
    var dt = performance.now() - ultimoTick;
    if(!okColore){
      aggiungiStimolo("errLed", dt);
    } else {
      esito.tempoTotale += dt;
      reactionTimes.push(dt);
      if(dt <= CONFIG.timeoutBarra) aggiungiStimolo("preso", dt);
      else aggiungiStimolo("errTimeout", dt);
    }
    stato = STATO.SESSIONE_ON;
  }

  stage.addEventListener("pointerdown", function(){
    if(stato === STATO.WAIT_PRESS) gestisciReazione();
  });
  window.addEventListener("keydown", function(e){
    if(e.code === "Space"){
      e.preventDefault();
      if(stato === STATO.WAIT_PRESS) gestisciReazione();
    } else if(e.code === "Escape"){
      if(stato === STATO.COUNTDOWN || stato === STATO.SESSIONE_ON || stato === STATO.WAIT_PRESS){
        chiudiSessione();
      }
    }
  });
  stopBtn.addEventListener("click", function(){ chiudiSessione(); });

  /* =========================================================
     COUNTDOWN + AVVIO —  cmdAvvia_Click / AvviaCountdown
     ========================================================= */
  function avviaCountdown(cb){
    var j = 3;
    countdownEl.style.display = "flex";
    idlePanel.style.display = "none";
    (function step(){
      if(j < 0){
        countdownEl.style.display = "none";
        cb();
        return;
      }
      countdownEl.textContent = j === 0 ? "" : String(j);
      j--;
      setTimeout(step, 500);
    })();
  }

  function avviaSessione(){
    if(!CONFIG.randomLed){
      var plan = PLANS.filter(function(p){ return p.id === CONFIG.activePlanId; })[0];
      if(!plan || !plan.stimuli.length){
        alert("Seleziona un piano di modulazione valido nei parametri prima di avviare (oppure attiva il colore casuale).");
        return;
      }
    }
    reactionTimes = [];
    stato = STATO.COUNTDOWN;
    stopBtn.style.display = "inline-block";
    infoText.textContent = "";
    disegnaSchermo();
    avviaCountdown(function(){
      suonaInizio();
      iniziaSessione();
    });
  }
  startBtn.addEventListener("click", avviaSessione);

  /* =========================================================
     TRAINING TOGGLE —  mnuTraining_Click
     ========================================================= */
  trainingToggle.addEventListener("click", function(){
    flagModeTraining = !flagModeTraining;
    trainingToggle.classList.toggle("on", flagModeTraining);
    trainingToggle.textContent = flagModeTraining ? "Training ●" : "Training";
  });

  /* =========================================================
     ESITO SESSIONE — modal finale
     ========================================================= */
  function mostraEsitoSessione(rec){
    var rows = [
      ["Modalità", rec.modo === "random" ? "colore random" : "piano di modulazione"],
      ["Stimoli totali", rec.stimoli],
      ["Individuati (beccato)", rec.viste],
      ["Mancati (timeout)", rec.perse],
      ["Falsi positivi", rec.falsoPositivo],
      ["Non bersaglio (nullo)", rec.nulli],
      ["Sinistra / Centro / Destra", rec.contaSx+" / "+rec.contaCentro+" / "+rec.contaDx],
      ["Tempo medio reazione", rec.tempoMedioReazioneMs !== null ? rec.tempoMedioReazioneMs+" ms" : "—"]
    ];
    var html = rows.map(function(r){
      return "<tr><th>"+r[0]+"</th><td>"+r[1]+"</td></tr>";
    }).join("");
    $("esito-table").innerHTML = html;
    openModal("modal-esito");
  }

  /* =========================================================
     MODALI generiche
     ========================================================= */
  function openModal(id){ $(id).classList.add("open"); }
  function closeModal(id){ $(id).classList.remove("open"); }
  document.querySelectorAll("[data-close]").forEach(function(btn){
    btn.addEventListener("click", function(){
      btn.closest(".modal-overlay").classList.remove("open");
    });
  });
  document.querySelectorAll(".modal-overlay").forEach(function(ov){
    ov.addEventListener("click", function(e){ if(e.target === ov) ov.classList.remove("open"); });
  });

  /* =========================================================
     PANNELLO PARAMETRI — equivalente FormParametri.frm
     ========================================================= */
  function buildTargetColorPicker(){
    var wrap = $("p-target-colors");
    wrap.innerHTML = "";
    COLOR_KEYS.forEach(function(k){
      var c = COLORS[k];
      var lbl = document.createElement("label");
      lbl.innerHTML = '<input type="radio" name="p-target" value="'+k+'"> <span class="dot" style="background:'+c.hex+';color:'+c.hex+'"></span> '+c.label;
      wrap.appendChild(lbl);
    });
  }
  buildTargetColorPicker();

  function buildProfileEditor(){
    var wrap = $("p-color-profile");
    wrap.innerHTML = "";
    COLOR_KEYS.forEach(function(k){
      var c = COLORS[k];
      var row = document.createElement("div");
      row.className = "pctrow";
      row.innerHTML =
        '<span class="dot" style="background:'+c.hex+';color:'+c.hex+'"></span>'+
        '<span style="width:56px">'+c.label+'</span>'+
        '<input type="range" min="0" max="100" data-color="'+k+'" style="flex:1">'+
        '<span class="val" data-color-val="'+k+'"></span>';
      wrap.appendChild(row);
    });
    wrap.querySelectorAll("input[type=range]").forEach(function(inp){
      inp.addEventListener("input", function(){
        document.querySelector('[data-color-val="'+inp.dataset.color+'"]').textContent = inp.value+"%";
        updateProfileSum();
      });
    });
  }
  buildProfileEditor();

  function updateProfileSum(){
    var sum = 0;
    document.querySelectorAll("#p-color-profile input[type=range]").forEach(function(inp){ sum += Number(inp.value); });
    var el = $("p-profile-sum");
    el.textContent = "Somma attuale: "+sum+"%"+(sum !== 100 ? "  (verrà normalizzata a 100 al salvataggio)" : "");
    el.style.color = sum === 100 ? "var(--text-dim)" : "var(--warn)";
  }

  function setProfileSliders(percentages){
    document.querySelectorAll("#p-color-profile input[type=range]").forEach(function(inp){
      var k = inp.dataset.color;
      inp.value = percentages[k] || 0;
      document.querySelector('[data-color-val="'+k+'"]').textContent = inp.value+"%";
    });
    updateProfileSum();
  }

  function refreshProfileSelect(){
    var sel = $("p-profile-select");
    var cur = sel.value;
    sel.innerHTML = '<option value="">— nessuno (modifica libera) —</option>';
    PROFILES.forEach(function(p){
      var o = document.createElement("option");
      o.value = p.id; o.textContent = p.name;
      sel.appendChild(o);
    });
    sel.value = PROFILES.some(function(p){return p.id===cur;}) ? cur : "";
  }

  function refreshPlanSelect(){
    var sel = $("p-piano-select");
    var cur = sel.value;
    sel.innerHTML = '<option value="">— nessun piano —</option>';
    PLANS.forEach(function(p){
      var o = document.createElement("option");
      o.value = p.id; o.textContent = p.name + " (" + p.stimuli.length + " stimoli)";
      sel.appendChild(o);
    });
    sel.value = PLANS.some(function(p){return p.id===cur;}) ? cur : (CONFIG.activePlanId || "");
  }

  function applyModeFieldsetsState(){
    var random = $("p-randomLed").checked;
    $("p-fieldset-posizione").classList.toggle("disabled", !random);
    $("p-fieldset-profilo").classList.toggle("disabled", !random);
    $("p-piano-wrap").style.opacity = random ? .42 : 1;
    $("p-piano-wrap").style.pointerEvents = random ? "none" : "auto";
    var numInput = $("p-numStimoli");
    if(!random){
      var sel = $("p-piano-select");
      var plan = PLANS.filter(function(p){ return p.id === sel.value; })[0];
      numInput.value = plan ? plan.stimuli.length : numInput.value;
      numInput.disabled = true;
      $("p-numStimoli-hint").textContent = "(impostato dal piano selezionato)";
    } else {
      numInput.disabled = false;
      $("p-numStimoli-hint").textContent = "";
    }
  }

  function fillParametriForm(){
    $("p-timeLed").value = CONFIG.timeLed;
    $("p-timeoutBarra").value = CONFIG.timeoutBarra;
    $("p-numStimoli").value = CONFIG.numStimoli;
    $("p-percSx").value = CONFIG.percSx;
    $("p-percCentro").value = CONFIG.percCentro;
    $("p-raggio").value = CONFIG.raggio;
    $("p-suono").value = CONFIG.suono;
    $("p-autosave").checked = CONFIG.autosave;
    $("p-trace").checked = CONFIG.trace;
    $("p-randomLed").checked = CONFIG.randomLed;
    updatePercLabels();
    document.querySelectorAll('input[name="p-target"]').forEach(function(r){ r.checked = (r.value === CONFIG.targetColor); });

    refreshProfileSelect();
    $("p-profile-select").value = CONFIG.activeProfileId || "";
    setProfileSliders(CONFIG.profile);

    refreshPlanSelect();
    $("p-piano-select").value = CONFIG.activePlanId || "";

    applyModeFieldsetsState();
  }

  function updatePercLabels(){
    var sx = Number($("p-percSx").value);
    var c = Number($("p-percCentro").value);
    if(sx + c > 100){ c = 100 - sx; $("p-percCentro").value = c; }
    var dx = Math.max(0, 100 - sx - c);
    $("p-percSx-val").textContent = sx+"%";
    $("p-percCentro-val").textContent = c+"%";
    $("p-percDx-val").textContent = "Destra: "+dx+"%";
  }
  $("p-percSx").addEventListener("input", updatePercLabels);
  $("p-percCentro").addEventListener("input", updatePercLabels);
  $("p-randomLed").addEventListener("change", applyModeFieldsetsState);
  $("p-piano-select").addEventListener("change", applyModeFieldsetsState);

  $("p-profile-select").addEventListener("change", function(){
    var prof = PROFILES.filter(function(p){ return p.id === this.value; }, this)[0];
    if(prof) setProfileSliders(prof.percentages);
  });

  $("p-profile-save").addEventListener("click", function(){
    var name = prompt("Nome del profilo colori:");
    if(!name) return;
    var percentages = {};
    document.querySelectorAll("#p-color-profile input[type=range]").forEach(function(inp){
      percentages[inp.dataset.color] = Number(inp.value);
    });
    var prof = { id: uid(), name: name, percentages: percentages };
    PROFILES.push(prof);
    saveJSON(LS_PROFILES, PROFILES);
    refreshProfileSelect();
    $("p-profile-select").value = prof.id;
  });

  $("p-profile-del").addEventListener("click", function(){
    var id = $("p-profile-select").value;
    if(!id) return;
    if(!confirm("Eliminare il profilo colori selezionato?")) return;
    PROFILES = PROFILES.filter(function(p){ return p.id !== id; });
    saveJSON(LS_PROFILES, PROFILES);
    refreshProfileSelect();
  });

  $("p-piano-manage").addEventListener("click", function(){ openPlanManager(); });

  /* Ripristino default: legge AVDESK_parametri_STIMOLAZIONI.ini dallo stesso
     percorso web dell'app (es. https://avdesk.netlify.app/AVDESK_parametri_STIMOLAZIONI.ini).
     Se il file non è raggiungibile (offline, file:// ecc.) si ricade sui
     valori interni DEFAULT_CONFIG. */
  var INI_DEFAULT_URL = "AVDESK_parametri_STIMOLAZIONI.ini";

  function ripristinaDaDefaultInterni(){
    CONFIG = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    fillParametriForm();
  }

  $("p-reset-default").addEventListener("click", function(){
    if(!confirm("Ripristinare i parametri di base dal file "+INI_DEFAULT_URL+"?")) return;
    var btn = this, label = btn.textContent;
    btn.disabled = true; btn.textContent = "Caricamento default…";
    var url = INI_DEFAULT_URL + "?t=" + Date.now();   // evita la cache del browser/CDN
    fetch(url, { cache: "no-store" })
      .then(function(r){
        if(!r.ok) throw new Error("HTTP "+r.status);
        return r.text();
      })
      .then(function(text){
        var parsed = AVDESK_parseINI(text);
        var nPiani = AVDESK_applicaINI(parsed) || 0;
        // riallinea CONFIG in memoria al form appena popolato (nessun salvataggio automatico)
        PLANS = loadJSON(LS_PLANS, []);
        refreshPlanSelect();
        $("p-piano-select").value = parsed.AVDESK.activePlanId || "";
        applyModeFieldsetsState();
        alert("Parametri default caricati da "+INI_DEFAULT_URL+
              (nPiani ? " ("+nPiani+" piani di modulazione)" : "")+
              ".\nPremi 'Salva parametri' per renderli attivi.");
      })
      .catch(function(err){
        console.error("Ripristino default da INI:", err);
        ripristinaDaDefaultInterni();
        alert("Impossibile leggere "+INI_DEFAULT_URL+" ("+err.message+").\n"+
              "Sono stati applicati i valori di default interni.");
      })
      .then(function(){ btn.disabled = false; btn.textContent = label; });
  });

  /* Il pulsante configurazione è già collegato all'inizio dell'inizializzazione. */

  /* Il salvataggio dei parametri è gestito esclusivamente da AVDESK_salvaParametri(),
     collegata direttamente al pulsante HTML. Evitiamo un secondo handler che
     potrebbe sovrascrivere STIMOLI subito dopo il salvataggio. */

  /* =========================================================
     GESTIONE PIANI DI MODULAZIONE — equivalente ComboModulazione /
     ReadModulazione / tabella Pianistimolazione (ModuleProcedura.bas)
     ========================================================= */
  var planEditing = null; // { id|null, name, stimuli:[...] }
  var planRecordColor = "rosso";

  function openPlanManager(){
    renderPlanList();
    var current = PLANS.filter(function(p){ return p.id === $("p-piano-select").value; })[0];
    loadPlanIntoEditor(current || null);
    buildPlanPalette();
    openModal("modal-piani");
  }

  function buildPlanPalette(){
    var wrap = $("plan-palette");
    wrap.innerHTML = "";
    COLOR_KEYS.forEach(function(k){
      var c = COLORS[k];
      var d = document.createElement("div");
      d.className = "rec-swatch" + (k === planRecordColor ? " selected" : "");
      d.style.background = c.hex; d.style.color = c.hex;
      d.title = c.label;
      d.addEventListener("click", function(){
        planRecordColor = k;
        wrap.querySelectorAll(".rec-swatch").forEach(function(el){ el.classList.remove("selected"); });
        d.classList.add("selected");
      });
      wrap.appendChild(d);
    });
  }

  function loadPlanIntoEditor(plan){
    if(plan){
      planEditing = { id: plan.id, name: plan.name, stimuli: JSON.parse(JSON.stringify(plan.stimuli)) };
    } else {
      planEditing = { id: null, name: "", stimuli: [] };
    }
    $("plan-name").value = planEditing.name;
    renderPlanPreview();
    renderPlanPoints();
  }

  function renderPlanList(){
    var wrap = $("plan-list");
    wrap.innerHTML = "";
    if(!PLANS.length){
      wrap.innerHTML = '<div class="empty-note" style="padding:8px 0;">Nessun piano salvato.</div>';
      return;
    }
    PLANS.forEach(function(p){
      var chip = document.createElement("div");
      chip.className = "list-chip" + (planEditing && planEditing.id === p.id ? " active" : "");
      chip.innerHTML = '<span>'+p.name+' <span style="color:var(--text-dim)">('+p.stimuli.length+')</span></span>' +
                        '<button class="del" data-id="'+p.id+'">&times;</button>';
      chip.addEventListener("click", function(e){
        if(e.target.closest(".del")) return;
        loadPlanIntoEditor(p);
        renderPlanList();
      });
      chip.querySelector(".del").addEventListener("click", function(){
        if(!confirm('Eliminare il piano "'+p.name+'"?')) return;
        PLANS = PLANS.filter(function(x){ return x.id !== p.id; });
        saveJSON(LS_PLANS, PLANS);
        if(planEditing && planEditing.id === p.id) loadPlanIntoEditor(null);
        renderPlanList();
      });
      wrap.appendChild(chip);
    });
  }

  function fasciaFromX(xPct){
    if(xPct < 1/3) return "sx";
    if(xPct < 2/3) return "centro";
    return "dx";
  }

  function renderPlanPreview(){
    var prev = $("plan-preview");
    prev.querySelectorAll(".pdot").forEach(function(d){ d.remove(); });
    planEditing.stimuli.forEach(function(pt, i){
      var c = COLORS[pt.colore];
      var d = document.createElement("div");
      d.className = "pdot";
      d.style.left = (pt.xPct*100)+"%";
      d.style.top = (pt.yPct*100)+"%";
      d.style.background = c.hex; d.style.color = c.hex;
      d.innerHTML = "<span>"+(i+1)+"</span>";
      prev.appendChild(d);
    });
  }

  function renderPlanPoints(){
    $("plan-count").textContent = planEditing.stimuli.length;
    var wrap = $("plan-points");
    wrap.innerHTML = "";
    if(!planEditing.stimuli.length){
      wrap.innerHTML = '<div class="empty-note" style="padding:14px 0;">Nessuno stimolo registrato: tocca l\'anteprima per aggiungerne.</div>';
      return;
    }
    planEditing.stimuli.forEach(function(pt, i){
      var c = COLORS[pt.colore];
      var row = document.createElement("div");
      row.className = "point-row";
      row.innerHTML =
        '<span class="idx">#'+(i+1)+'</span>'+
        '<span class="dot" style="background:'+c.hex+';color:'+c.hex+'"></span>'+
        '<span>'+c.label+' · '+pt.fascia+'</span>'+
        '<span class="coords">'+Math.round(pt.xPct*100)+'%, '+Math.round(pt.yPct*100)+'%</span>'+
        '<button class="del" data-i="'+i+'">&times;</button>';
      row.querySelector(".del").addEventListener("click", function(){
        planEditing.stimuli.splice(i,1);
        renderPlanPreview(); renderPlanPoints();
      });
      wrap.appendChild(row);
    });
  }

  $("plan-preview").addEventListener("click", function(e){
    if(!planEditing) return;
    var rect = this.getBoundingClientRect();
    var xPct = (e.clientX - rect.left) / rect.width;
    var yPct = (e.clientY - rect.top) / rect.height;
    xPct = Math.min(1, Math.max(0, xPct));
    yPct = Math.min(1, Math.max(0, yPct));
    planEditing.stimuli.push({
      progressivo: planEditing.stimuli.length+1,
      xPct: xPct, yPct: yPct,
      colore: planRecordColor,
      fascia: fasciaFromX(xPct)
    });
    renderPlanPreview();
    renderPlanPoints();
  });

  $("plan-new").addEventListener("click", function(){ loadPlanIntoEditor(null); renderPlanList(); });

  $("plan-save").addEventListener("click", function(){
    var name = $("plan-name").value.trim();
    if(!name){ alert("Assegna un nome al piano."); return; }
    if(!planEditing.stimuli.length){ alert("Aggiungi almeno uno stimolo prima di salvare."); return; }
    planEditing.stimuli.forEach(function(pt,i){ pt.progressivo = i+1; });
    if(planEditing.id){
      var idx = PLANS.findIndex(function(p){ return p.id === planEditing.id; });
      PLANS[idx] = { id: planEditing.id, name: name, stimuli: planEditing.stimuli };
    } else {
      planEditing.id = uid();
      PLANS.push({ id: planEditing.id, name: name, stimuli: planEditing.stimuli });
    }
    saveJSON(LS_PLANS, PLANS);
    refreshPlanSelect();
    $("p-piano-select").value = planEditing.id;
    applyModeFieldsetsState();
    renderPlanList();
  });

  $("plan-delete").addEventListener("click", function(){
    if(!planEditing || !planEditing.id) return;
    if(!confirm('Eliminare il piano "'+planEditing.name+'"?')) return;
    PLANS = PLANS.filter(function(p){ return p.id !== planEditing.id; });
    saveJSON(LS_PLANS, PLANS);
    loadPlanIntoEditor(null);
    refreshPlanSelect();
    renderPlanList();
  });

  /* Importazione piani da file .INI (usata da AVDESK_applicaINI).
     Unisce per id: un piano con lo stesso id viene sostituito, gli altri restano. */
  window.AVDESK_importaPiani = function(list){
    var ok = 0;
    list.forEach(function(r){
      var stimuli = [];
      var n = Math.max(0, Math.floor(Number(r.count)) || 0);
      for(var j = 1; j <= n; j++){
        var parts = String(r["s"+j] || "").split(";");
        if(parts.length < 3) continue;
        var x = Number(parts[0]), y = Number(parts[1]), col = (parts[2] || "").trim();
        if(!Number.isFinite(x) || !Number.isFinite(y) || !COLORS[col]) continue;
        x = Math.min(1, Math.max(0, x)); y = Math.min(1, Math.max(0, y));
        stimuli.push({ progressivo: stimuli.length+1, xPct: x, yPct: y, colore: col, fascia: fasciaFromX(x) });
      }
      var name = String(r.name || "").trim();
      if(!name || !stimuli.length) return;
      var id = String(r.id || "").trim() || uid();
      var idx = PLANS.findIndex(function(p){ return p.id === id; });
      var plan = { id: id, name: name, stimuli: stimuli };
      if(idx >= 0) PLANS[idx] = plan; else PLANS.push(plan);
      ok++;
    });
    saveJSON(LS_PLANS, PLANS);
    refreshPlanSelect();
    if(planEditing) { renderPlanList(); }
    return ok;
  };
  /* Rende visibili alle funzioni .INI (fuori dall'IIFE) queste utilità già esistenti. */
  window.updatePercLabels = updatePercLabels;
  window.AVDESK_aggiornaSommaProfilo = updateProfileSum;
  window.applyModeFieldsetsState = applyModeFieldsetsState;
  window.AVDESK_popolaForm = function(){
    CONFIG = loadConfig();
    PLANS = loadJSON(LS_PLANS, []);
    PROFILES = loadJSON(LS_PROFILES, []);
    fillParametriForm();
  };
  window.AVDESK_aggiornaConfig = function(cfg){
    CONFIG = loadConfig();
    refreshIdlePanel();
  };

  /* =========================================================
     PRIMO AVVIO — se sul device/browser non esiste ancora alcuna
     configurazione salvata, esegue automaticamente "ripristina default"
     (lettura di AVDESK_parametri_STIMOLAZIONI.ini dallo stesso percorso
     web dell'app) e "salva parametri", senza aprire la maschera.
     Se il file non è raggiungibile non salva nulla: l'app usa i default
     interni e riprova al prossimo avvio.
     ========================================================= */
  function primoAvvioDaINI(){
    try{ if(localStorage.getItem(LS_CONFIG) !== null) return; }catch(e){ return; }

    fetch(INI_DEFAULT_URL + "?t=" + Date.now(), { cache: "no-store" })
      .then(function(r){
        if(!r.ok) throw new Error("HTTP "+r.status);
        return r.text();
      })
      .then(function(text){
        // nel frattempo l'utente ha già salvato dei parametri: non sovrascrivere
        if(localStorage.getItem(LS_CONFIG) !== null) return;

        var ini = AVDESK_parseINI(text);
        var d = ini.AVDESK || {}, p = ini.PROFILE || {};

        if(ini.PLANLIST && ini.PLANLIST.length) window.AVDESK_importaPiani(ini.PLANLIST);

        var num = function(v, def, min){
          var n = Number(v);
          if(!Number.isFinite(n)) n = def;
          return min !== undefined ? Math.max(min, n) : n;
        };
        var bool = function(v, def){
          if(v === undefined) return def;
          return String(v).toLowerCase() === "true" || String(v) === "1";
        };

        var cfg = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
        cfg.timeLed      = num(d.timeLed, cfg.timeLed, 200);
        cfg.timeoutBarra = num(d.timeoutBarra, cfg.timeoutBarra, 100);
        cfg.numStimoli   = Math.max(1, Math.floor(num(d.numStimoli, cfg.numStimoli, 1)));
        cfg.percSx       = Math.min(100, Math.max(0, num(d.percSx, cfg.percSx)));
        cfg.percCentro   = Math.min(100 - cfg.percSx, Math.max(0, num(d.percCentro, cfg.percCentro)));
        cfg.raggio       = num(d.raggio, cfg.raggio, 6);
        if(d.suono) cfg.suono = d.suono;
        cfg.autosave     = bool(d.autosave, cfg.autosave);
        cfg.trace        = bool(d.trace, cfg.trace);
        cfg.randomLed    = bool(d.randomLed, cfg.randomLed);
        if(COLORS[d.targetColor]) cfg.targetColor = d.targetColor;

        var planId = (d.activePlanId || "").trim();
        cfg.activePlanId = PLANS.some(function(pl){ return pl.id === planId; }) ? planId : null;
        cfg.activeProfileId = null;

        var profile = {}, sum = 0;
        COLOR_KEYS.forEach(function(k){
          profile[k] = Math.max(0, num(p[k], 0));
          sum += profile[k];
        });
        if(sum > 0){
          COLOR_KEYS.forEach(function(k){ profile[k] = Math.round(profile[k] * 100 / sum); });
          cfg.profile = profile;
        }

        saveConfig(cfg);
        CONFIG = loadConfig();
        PLANS = loadJSON(LS_PLANS, []);
        refreshIdlePanel();
        console.info("AVDESK: primo avvio — parametri default caricati da "+INI_DEFAULT_URL);
      })
      .catch(function(err){
        console.warn("AVDESK: primo avvio, default da INI non disponibili ("+err.message+"). Uso i default interni.");
      });
  }
  primoAvvioDaINI();

  /* =========================================================
     PANNELLO RISULTATI
     ========================================================= */
  /* ---------- Traccia stimoli (visualizzazione ed esportazione) ---------- */
  var ESITO_TRACE = { preso:"beccato", errTimeout:"timeout", errLed:"falso positivo", nullo:"nullo", interrotto:"interrotto" };
  function fmtDataOra(iso, conSecondi){
    var d = new Date(iso);
    var pad = function(n){ return String(n).padStart(2,"0"); };
    return pad(d.getDate())+"/"+pad(d.getMonth()+1)+"/"+d.getFullYear()+" "+pad(d.getHours())+":"+pad(d.getMinutes())+(conSecondi ? ":"+pad(d.getSeconds()) : "");
  }
  function scaricaFile(nome, testo, tipo){
    var blob = new Blob([testo], { type: tipo });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = nome;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  }
  /* CSV con separatore ";", decimali con virgola e BOM UTF-8 (apertura corretta in Excel italiano). */
  function costruisciTracciaCSV(lista){
    var dec = function(v){ return String(v).replace(".", ","); };
    var righe = ["data_sessione;modo;target;n;t_ms;colore;fascia;x_perc;y_perc;bersaglio;esito;rt_ms"];
    lista.forEach(function(s){
      (s.trace || []).forEach(function(t){
        righe.push([
          fmtDataOra(s.data, true), s.modo, s.target, t.n, t.t, t.c, t.p,
          dec(Math.round(t.x*10000)/100), dec(Math.round(t.y*10000)/100),
          t.b ? "si" : "no", ESITO_TRACE[t.e] || t.e, (t.rt === null || t.rt === undefined) ? "" : t.rt
        ].join(";"));
      });
    });
    return "\uFEFF" + righe.join("\r\n") + "\r\n";
  }
  function esportaTraccia(lista, nome){
    var conTraccia = lista.filter(function(s){ return s.trace && s.trace.length; });
    if(!conTraccia.length){
      alert("Nessuna traccia disponibile. Attiva 'Log dettagliato per stimolo' nei parametri ed esegui una nuova sessione (non in modalità Training, con salvataggio automatico attivo).");
      return;
    }
    scaricaFile(nome, costruisciTracciaCSV(conTraccia), "text/csv;charset=utf-8;");
  }

  function renderTraccia(idx){
    var s = SESSIONS[idx];
    if(!s || !s.trace) return;
    var body = $("risultati-body");
    var rows = s.trace.map(function(t){
      var c = COLORS[t.c] || { hex:"#888", label:t.c };
      return "<tr>"+
        "<td>"+t.n+"</td>"+
        "<td>"+t.t+"</td>"+
        '<td><span class="dot" style="background:'+c.hex+';color:'+c.hex+';display:inline-block;vertical-align:middle;margin-right:5px"></span>'+c.label+"</td>"+
        "<td>"+t.p+"</td>"+
        "<td>"+Math.round(t.x*100)+"% , "+Math.round(t.y*100)+"%</td>"+
        "<td>"+(t.b ? "sì" : "no")+"</td>"+
        "<td>"+(ESITO_TRACE[t.e] || t.e)+"</td>"+
        "<td>"+((t.rt === null || t.rt === undefined) ? "—" : t.rt+" ms")+"</td>"+
      "</tr>";
    }).join("");
    body.innerHTML =
      '<div style="display:flex;gap:8px;margin-bottom:10px;">'+
        '<button class="btn small" id="tr-back" type="button">← Sessioni</button>'+
        '<button class="btn small primary" id="tr-export" type="button">Esporta traccia CSV</button>'+
      '</div>'+
      '<div style="font-size:12px;color:var(--text-dim);margin-bottom:8px;">Sessione del '+fmtDataOra(s.data, true)+
        ' · '+(s.modo === "random" ? "colore random" : "piano di modulazione")+' · bersaglio: '+s.target+'</div>'+
      '<div style="overflow-x:auto;"><table><thead><tr><th>#</th><th>t (ms)</th><th>Colore</th><th>Fascia</th><th>Posizione</th><th>Bersaglio</th><th>Esito</th><th>Reazione</th></tr></thead>'+
      "<tbody>"+rows+"</tbody></table></div>";
    $("tr-back").addEventListener("click", renderRisultati);
    $("tr-export").addEventListener("click", function(){
      esportaTraccia([s], "avdesk_traccia_sessione.csv");
    });
  }

  function renderRisultati(){
    var body = $("risultati-body");
    if(!SESSIONS.length){
      body.innerHTML = '<div class="empty-note">Nessuna sessione salvata.</div>';
      return;
    }
    var rows = SESSIONS.map(function(s, idx){
      var d = new Date(s.data);
      var pad = function(n){ return String(n).padStart(2,"0"); };
      var dstr = pad(d.getDate())+"/"+pad(d.getMonth()+1)+"/"+d.getFullYear()+" "+pad(d.getHours())+":"+pad(d.getMinutes());
      return "<tr>"+
        "<td>"+dstr+"</td>"+
        "<td>"+s.viste+"/"+s.stimoli+"</td>"+
        "<td>"+s.perse+"</td>"+
        "<td>"+s.falsoPositivo+"</td>"+
        "<td>"+(s.tempoMedioReazioneMs!==null?s.tempoMedioReazioneMs+"ms":"—")+"</td>"+
        '<td class="sess-actions">'+
          ((s.trace && s.trace.length) ? '<button data-trace="'+idx+'">traccia ('+s.trace.length+')</button>' : '')+
          '<button data-del="'+idx+'">elimina</button></td>'+
      "</tr>";
    }).join("");
    body.innerHTML =
      "<table><thead><tr><th>Data</th><th>Individuati</th><th>Persi</th><th>Falsi pos.</th><th>T. medio</th><th></th></tr></thead>"+
      "<tbody>"+rows+"</tbody></table>";
    body.querySelectorAll("[data-trace]").forEach(function(btn){
      btn.addEventListener("click", function(){ renderTraccia(Number(btn.dataset.trace)); });
    });
    body.querySelectorAll("[data-del]").forEach(function(btn){
      btn.addEventListener("click", function(){
        SESSIONS.splice(Number(btn.dataset.del), 1);
        saveJSON(LS_SESSIONS, SESSIONS);
        renderRisultati();
      });
    });
  }

  $("btn-risultati").addEventListener("click", function(){
    renderRisultati();
    openModal("modal-risultati");
  });

  $("r-clear").addEventListener("click", function(){
    if(!SESSIONS.length) return;
    if(confirm("Cancellare tutta la cronologia dei risultati?")){
      SESSIONS = [];
      saveJSON(LS_SESSIONS, SESSIONS);
      renderRisultati();
    }
  });

  $("r-export-trace").addEventListener("click", function(){
    esportaTraccia(SESSIONS, "avdesk_traccia.csv");
  });

  $("r-export").addEventListener("click", function(){
    if(!SESSIONS.length) return;
    var header = ["data","modo","stimoli","viste","perse","falsoPositivo","nulli","contaSx","contaCentro","contaDx","tempoMedioReazioneMs","target"];
    var lines = [header.join(";")];
    SESSIONS.forEach(function(s){
      lines.push(header.map(function(h){ return s[h] === null || s[h] === undefined ? "" : s[h]; }).join(";"));
    });
    var blob = new Blob([lines.join("\n")], { type:"text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = "avdesk_risultati.csv";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  });

  /* =========================================================
     INFO / CONTATTI — frame con dati di contatto e chiusura
     Modifica qui i dati da mostrare.
     ========================================================= */
  var INFO_CONTATTI = {
    nome:      "Rossano Fracassa",           
    email:     "rossano.fracassa@gmail.com",
    mobile:    "+39 331 2007325",         
    procedura: "AVDESK · Stimolazione Visiva — versione web 2.1.0 " +
               "Per informazioni sulla procedura, supporto o richieste di utilizzo, " +
               "contattare l'autore ai recapiti indicati."
  };

  function esc(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }

  function costruisciModalInfo(){
    if($("modal-info")) return;
    var ov = document.createElement("div");
    ov.className = "modal-overlay";
    ov.id = "modal-info";
    ov.innerHTML =
      '<div class="modal">' +
        '<header class="modal-head">' +
          '<h2>Informazioni e contatti</h2>' +
          '<button type="button" class="close-x" id="info-close-x" aria-label="Chiudi">&times;</button>' +
        '</header>' +
        '<div class="modal-body">' +
          '<dl class="info-list">' +
            '<dt>Nome</dt><dd>' + esc(INFO_CONTATTI.nome) + '</dd>' +
            '<dt>E-mail</dt><dd><a href="mailto:' + esc(INFO_CONTATTI.email) + '">' + esc(INFO_CONTATTI.email) + '</a></dd>' +
            '<dt>Mobile</dt><dd><a href="tel:' + esc(INFO_CONTATTI.mobile.replace(/\s+/g,"")) + '">' + esc(INFO_CONTATTI.mobile) + '</a></dd>' +
          '</dl>' +
          '<div class="info-proc">' + esc(INFO_CONTATTI.procedura) + '</div>' +
        '</div>' +
        '<div class="btnrow">' +
          '<button type="button" class="btn primary" id="info-close-btn">Chiudi</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ov);
    $("info-close-x").addEventListener("click", function(){ closeModal("modal-info"); });
    $("info-close-btn").addEventListener("click", function(){ closeModal("modal-info"); });
    ov.addEventListener("click", function(e){ if(e.target === ov) closeModal("modal-info"); });
  }

  $("btn-info").addEventListener("click", function(e){
    e.stopPropagation();
    costruisciModalInfo();
    openModal("modal-info");
  });
  /* evita che il tocco sul pulsante info arrivi allo stage (reazione) */
  $("btn-info").addEventListener("pointerdown", function(e){ e.stopPropagation(); });
  window.addEventListener("keydown", function(e){
    if(e.code === "Escape" && $("modal-info") && $("modal-info").classList.contains("open")){
      closeModal("modal-info");
    }
  });

  /* Impedisce lo zoom con doppio tap / gesture su mobile durante l'uso */
  document.addEventListener("gesturestart", function(e){ e.preventDefault(); });

})();
