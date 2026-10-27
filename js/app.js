const SHD = window.SW_SHADERS || {};
/* === i18n: исходные строки — русские и служат ключами словаря; переводы в lang/uk.js, lang/en.js === */
const SW_LANG = (() => {
  try {
    const s = localStorage.getItem('sw-lang');
    if (s === 'ru' || s === 'uk' || s === 'en') return s;
  } catch (e) {}
  const n = String(navigator.language || 'ru')
    .slice(0, 2)
    .toLowerCase();
  return n === 'uk' ? 'uk' : n === 'ru' || n === 'be' ? 'ru' : 'en';
})();
const LOC = SW_LANG,
  DICT = SW_LANG === 'ru' ? null : (window.SW_I18N || {})[SW_LANG] || null,
  CYR = /[А-Яа-яЁё]/;
const TR = s => {
  if (!DICT || typeof s !== 'string') return s;
  const v = DICT[s];
  return v === undefined ? s : v;
};
const trSeg = x => {
  if (!DICT || typeof x !== 'string' || !CYR.test(x)) return x;
  const m = x.match(/^(\s*)([\s\S]*?)(\s*)$/),
    v = DICT[m[2]];
  return v === undefined ? x : m[1] + v + m[3];
};
const trHTML = h => {
  if (!DICT || typeof h !== 'string' || !CYR.test(h)) return h;
  return h
    .replace(/(^|>)([^<>]+)(?=<|$)/g, (m, a, x) => a + trSeg(x))
    .replace(/\b(title|placeholder|aria-label)="([^"]*)"/g, (m, a, v) => a + '="' + trSeg(v) + '"');
};
document.documentElement.lang = SW_LANG;
if (DICT) {
  const pI = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  Object.defineProperty(Element.prototype, 'innerHTML', {
    get: pI.get,
    set(v) {
      pI.set.call(this, trHTML(v));
    },
    configurable: true,
  });
  const pT = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
  Object.defineProperty(Node.prototype, 'textContent', {
    get: pT.get,
    set(v) {
      pT.set.call(this, typeof v === 'string' ? trSeg(v) : v);
    },
    configurable: true,
  });
  const pt = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'title');
  Object.defineProperty(HTMLElement.prototype, 'title', {
    get: pt.get,
    set(v) {
      pt.set.call(this, trSeg(v));
    },
    configurable: true,
  });
  const sa = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (k, v) {
    if (k === 'title' || k === 'placeholder' || k === 'aria-label') v = trSeg(v);
    return sa.call(this, k, v);
  };
  document.title = TR(document.title);
  document.querySelectorAll('#load .tx,#load [aria-label]').forEach(e => {
    if (e.hasAttribute('aria-label')) e.setAttribute('aria-label', e.getAttribute('aria-label'));
    else e.textContent = e.textContent;
  });
}
const errPanel = document.getElementById('errPanel');
let errCount = 0,
  errCollapsed = false;
function showError(msg) {
  errCount++;
  errPanel.classList.add('show');
  if (errCount === 1) {
    errPanel.innerHTML = '<div class="h">Ошибки (' + errCount + ') — тап чтобы свернуть</div>';
    errPanel.querySelector('.h').addEventListener('click', () => {
      errCollapsed = !errCollapsed;
      errPanel.querySelector('.h').textContent =
        'Ошибки (' + errCount + ') — тап чтобы ' + (errCollapsed ? 'развернуть' : 'свернуть');
      errPanel.querySelectorAll('.line').forEach(el => (el.style.display = errCollapsed ? 'none' : 'block'));
    });
  } else {
    errPanel.querySelector('.h').textContent =
      'Ошибки (' + errCount + ') — тап чтобы ' + (errCollapsed ? 'развернуть' : 'свернуть');
  }
  const line = document.createElement('div');
  line.className = 'line';
  line.textContent = msg;
  if (errCollapsed) line.style.display = 'none';
  errPanel.append(line);
  console.error(msg);
}
window.addEventListener('error', e => showError('[error] ' + (e.message || e.error || 'unknown')));
/* ошибки компиляции шейдеров three пишет только в console.error — выводим первые в панель, иначе эффект просто молча пропадает */
{
  const _ce = console.error;
  let _sh = 0;
  console.error = function (...a) {
    _ce.apply(console, a);
    const s = String(a[0]);
    if (_sh < 3 && /^THREE\.WebGL(Program|Shader)/.test(s)) {
      _sh++;
      showError('[shader] ' + s.slice(0, 200));
    }
  };
}
window.addEventListener('unhandledrejection', e =>
  showError('[promise] ' + ((e.reason && e.reason.message) || e.reason || 'unknown'))
);
const safeStorage = {
  available: false,
  get(k) {
    try {
      return window.localStorage.getItem(k);
    } catch (e) {
      return null;
    }
  },
  set(k, v) {
    try {
      window.localStorage.setItem(k, v);
      return true;
    } catch (e) {
      return false;
    }
  },
  remove(k) {
    try {
      window.localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  },
};
try {
  window.localStorage.getItem('__probe__');
  safeStorage.available = true;
} catch (e) {}
function getQualityFromHash() {
  const m = (location.hash || '').match(/[#&]?q=(auto|high|medium|low)/);
  return m ? m[1] : null;
}
let AUTO_QUALITY = 'high';
try {
  const mem = navigator.deviceMemory;
  const cores = navigator.hardwareConcurrency || 4;
  if (mem !== undefined && mem <= 2) AUTO_QUALITY = 'low';
  else if (cores <= 2) AUTO_QUALITY = 'low';
  else if (mem !== undefined && mem <= 4) AUTO_QUALITY = 'medium';
  else if (cores <= 4) AUTO_QUALITY = 'medium';
  else AUTO_QUALITY = 'high';
} catch (e) {}
const QUALITY_LEVELS = {
  high: {
    maxTexDim: 4096,
    shadowSize: 2048,
    skySize: 4096,
    dpr: 1.5,
    normalAll: true,
    normalMarsOnly: false,
    asteroidMul: 1.0,
    kuiperMul: 1.0,
    atmSteps: 5,
  },
  medium: {
    maxTexDim: 2048,
    shadowSize: 1024,
    skySize: 4000,
    dpr: 1,
    normalAll: true,
    normalMarsOnly: false,
    asteroidMul: 0.4,
    kuiperMul: 0.4,
    atmSteps: 5,
  },
  low: {
    maxTexDim: 1024,
    shadowSize: 1024,
    skySize: 1024,
    dpr: 1,
    normalAll: false,
    normalMarsOnly: true,
    asteroidMul: 0.2,
    kuiperMul: 0.2,
    atmSteps: 3,
  },
};
const QUALITY_STORAGE_KEY = 'solar-quality';
let USER_QUALITY = 'auto';
const hashQ = getQualityFromHash();
if (hashQ) {
  USER_QUALITY = hashQ;
} else {
  const storedQ = safeStorage.get(QUALITY_STORAGE_KEY);
  if (storedQ && QUALITY_LEVELS[storedQ]) USER_QUALITY = storedQ;
}
let QUALITY = USER_QUALITY === 'auto' ? AUTO_QUALITY : USER_QUALITY;
if (!QUALITY_LEVELS[QUALITY]) QUALITY = AUTO_QUALITY;
const Q = QUALITY_LEVELS[QUALITY];
const Q_LABEL = QUALITY === 'high' ? 'hi' : QUALITY === 'medium' ? 'med' : 'lo';
console.log('[quality] режим=' + USER_QUALITY + ' → активен=' + QUALITY, {
  cores: navigator.hardwareConcurrency,
  memoryGB: navigator.deviceMemory,
  maxTexDim: Q.maxTexDim,
  shadow: Q.shadowSize,
  sky: Q.skySize,
  dpr: Q.dpr,
  storageAvailable: safeStorage.available,
});
const WORKER_SRC = `self.onmessage=async(e)=>{const{url,id,timeoutMs,maxDim}=e.data;const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),timeoutMs||20000);try{const res=await fetch(url,{signal:ctl.signal,mode:'cors'});if(!res.ok)throw new Error('HTTP '+res.status);const blob=await res.blob();const bitmap=await createImageBitmap(blob);clearTimeout(timer);let W=bitmap.width,H=bitmap.height;if(maxDim&&(W>maxDim||H>maxDim)){const s=Math.min(maxDim/W,maxDim/H);W=Math.max(64,Math.floor(W*s));H=Math.max(32,Math.floor(H*s));}const canvas=new OffscreenCanvas(W,H);const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(bitmap,0,0,W,H);const imageData=ctx.getImageData(0,0,W,H);const buffer=imageData.data.buffer;self.postMessage({id,ok:true,width:W,height:H,buffer},[buffer]);}catch(err){clearTimeout(timer);self.postMessage({id,ok:false,error:(err&&(err.name==='AbortError'?'timeout':err.message))||'error'});}};`;
const workerBlob = new Blob([WORKER_SRC], { type: 'application/javascript' });
const workerUrl = URL.createObjectURL(workerBlob);
const DB_NAME = 'solar-tex-cache-v11',
  DB_VERSION = 1,
  STORE = 'textures';
/* TEX_VER: поднимай при замене файлов текстур на GitHub, иначе из кэша вернётся старая картинка */
const TEX_VER = '1';
try {
  for (let v = 1; v <= 10; v++) indexedDB.deleteDatabase('solar-tex-cache-v' + v);
} catch (e) {}
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}
async function idbPut(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
function configurePlanetTexture(tex) {
  if (!tex) return tex;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.flipY = true;
  tex.anisotropy = Math.min(
    8,
    typeof renderer !== 'undefined' && renderer.capabilities ? renderer.capabilities.getMaxAnisotropy() : 4
  );
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}
function cropTextureX(tex, px) {
  if (!tex || !tex.image || !tex.image.data) return tex;
  const w = tex.image.width,
    h = tex.image.height;
  if (px <= 0 || w - px * 2 < 8) return tex;
  const src = tex.image.data;
  const nw = w - px * 2;
  const out = new Uint8Array(nw * h * 4);
  for (let y = 0; y < h; y++) {
    const rowSrc = y * w,
      rowDst = y * nw;
    for (let x = 0; x < nw; x++) {
      const si = (rowSrc + x + px) * 4;
      const di = (rowDst + x) * 4;
      out[di] = src[si];
      out[di + 1] = src[si + 1];
      out[di + 2] = src[si + 2];
      out[di + 3] = src[si + 3];
    }
  }
  const t = new THREE.DataTexture(out, nw, h, THREE.RGBAFormat);
  t.wrapS = tex.wrapS;
  t.wrapT = tex.wrapT;
  t.flipY = tex.flipY;
  t.anisotropy = tex.anisotropy;
  t.minFilter = tex.minFilter;
  t.magFilter = tex.magFilter;
  t.generateMipmaps = tex.generateMipmaps;
  t.needsUpdate = true;
  return t;
}
let MAX_TEX_DIM = Q.maxTexDim;
let _idbProbed = false,
  _idbOk = false;
async function probeIDB() {
  if (_idbProbed) return _idbOk;
  _idbProbed = true;
  try {
    const db = await openDB();
    db.close();
    _idbOk = true;
  } catch (e) {
    _idbOk = false;
    console.warn('[idb] кэш недоступен:', e.message || e);
  }
  return _idbOk;
}
async function loadTextureNoCache(url, ctx = 'tex', timeoutMs = 20000, maxDim) {
  console.log(`${ctx}: GET ${url}`);
  const result = await new Promise((resolve, reject) => {
    const id = Math.random().toString(36).slice(2);
    const handler = e => {
      if (e.data.id !== id) return;
      worker.removeEventListener('message', handler);
      if (e.data.ok) resolve(e.data);
      else reject(new Error(e.data.error));
    };
    worker.addEventListener('message', handler);
    worker.postMessage({ url, id, timeoutMs: timeoutMs || 20000, maxDim: maxDim || MAX_TEX_DIM });
  });
  const data = new Uint8Array(result.buffer);
  const tex = new THREE.DataTexture(data, result.width, result.height, THREE.RGBAFormat);
  return configurePlanetTexture(tex);
}
async function loadTexture(url, ctx = 'tex', timeoutMs = 20000) {
  const cacheKey = 'tex:' + TEX_VER + ':' + MAX_TEX_DIM + ':' + url;
  const idbOk = await probeIDB();
  if (idbOk) {
    try {
      const cached = await idbGet(cacheKey);
      if (cached && cached.width && cached.height && cached.buffer) {
        const data = new Uint8Array(cached.buffer);
        const tex = new THREE.DataTexture(data, cached.width, cached.height, THREE.RGBAFormat);
        console.log(`${ctx}: из кэша ${cached.width}x${cached.height}`);
        return configurePlanetTexture(tex);
      }
    } catch (e) {
      console.warn(`${ctx}: кэш чтение — ${e.message || e}`);
    }
  }
  const result = await new Promise((resolve, reject) => {
    const id = Math.random().toString(36).slice(2);
    const handler = e => {
      if (e.data.id !== id) return;
      worker.removeEventListener('message', handler);
      if (e.data.ok) resolve(e.data);
      else reject(new Error(e.data.error));
    };
    worker.addEventListener('message', handler);
    worker.postMessage({ url, id, timeoutMs: timeoutMs || 20000, maxDim: MAX_TEX_DIM });
  });
  if (idbOk) {
    try {
      await idbPut(cacheKey, { width: result.width, height: result.height, buffer: result.buffer.slice(0) });
    } catch (e) {
      console.warn(`${ctx}: кэш запись — ${e.message || e}`);
    }
  }
  const data = new Uint8Array(result.buffer);
  const tex = new THREE.DataTexture(data, result.width, result.height, THREE.RGBAFormat);
  return configurePlanetTexture(tex);
}
const TH = THREE,
  PI = Math.PI,
  $ = s => document.querySelector(s),
  rnd = Math.random;
let renderer;
try {
  renderer = new TH.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
    precision: 'highp',
  });
} catch (e) {
  document.getElementById('load').innerHTML =
    '<div class="tx" style="text-align:center;padding:20px">WebGL недоступен в этом браузере.<br>Попробуйте другой браузер или устройство.</div>';
  showError('[webgl-init] ' + (e.message || e));
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, Q.dpr));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = TH.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);
MAX_TEX_DIM = Math.min(Q.maxTexDim, renderer.capabilities.maxTextureSize);
const MAX_SKY_DIM = Math.min(Q.skySize, renderer.capabilities.maxTextureSize);
(function logGpuInfo() {
  try {
    const gl = renderer.getContext();
    console.log(
      `[env] protocol=${location.protocol} origin=${location.origin || '(null)'} mobile=${/Mobi|Android/i.test(navigator.userAgent)}`
    );
    console.log(
      `[env] DPR=${devicePixelRatio}, viewport=${innerWidth}x${innerHeight}, effective DPR=${Math.min(devicePixelRatio, Q.dpr)}`
    );
    console.log(
      `[gpu] maxTextureSize=${gl.getParameter(gl.MAX_TEXTURE_SIZE)} effectiveMaxTexDim=${MAX_TEX_DIM} effectiveMaxSkyDim=${MAX_SKY_DIM}`
    );
  } catch (e) {
    console.warn('[gpu] info недоступно: ' + (e.message || e));
  }
})();
renderer.domElement.addEventListener('webglcontextlost', e => {
  e.preventDefault();
  showError('[webgl] CONTEXT LOST — ' + (e.statusMessage || 'без причины'));
});
renderer.domElement.addEventListener('webglcontextrestored', () => console.warn('[webgl] context restored'));
function makeMainThreadWorker() {
  const ls = new Set();
  const emit = d => ls.forEach(h => h({ data: d }));
  return {
    addEventListener: (t, h) => {
      if (t === 'message') ls.add(h);
    },
    removeEventListener: (t, h) => {
      ls.delete(h);
    },
    postMessage: async ({ url, id, timeoutMs, maxDim }) => {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), timeoutMs || 20000);
      try {
        const res = await fetch(url, { signal: ctl.signal, mode: 'cors' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const bmp = await createImageBitmap(await res.blob());
        clearTimeout(timer);
        let W = bmp.width,
          H = bmp.height;
        if (maxDim && (W > maxDim || H > maxDim)) {
          const k = Math.min(maxDim / W, maxDim / H);
          W = Math.max(64, Math.floor(W * k));
          H = Math.max(32, Math.floor(H * k));
        }
        const cv = document.createElement('canvas');
        cv.width = W;
        cv.height = H;
        const cx = cv.getContext('2d');
        cx.imageSmoothingEnabled = true;
        cx.imageSmoothingQuality = 'high';
        cx.drawImage(bmp, 0, 0, W, H);
        const buffer = cx.getImageData(0, 0, W, H).data.buffer;
        emit({ id, ok: true, width: W, height: H, buffer });
      } catch (err) {
        clearTimeout(timer);
        emit({
          id,
          ok: false,
          error: (err && (err.name === 'AbortError' ? 'timeout' : err.message)) || 'error',
        });
      }
    },
  };
}
let worker;
try {
  worker = new Worker(workerUrl);
  worker.onerror = e => showError('[worker] ' + (e.message || e));
} catch (err) {
  console.warn('[worker] недоступен (' + (err.message || err) + ') — декодирование в основном потоке');
  worker = makeMainThreadWorker();
}
const SUN_GLOW_BASE = 3.0;
let sunBaseScale = 8;
const SPEEDS = [0, 1 / 24, 1, 365.25 / 12, 365.25];
SPEEDS.push(1 / 1440, 1 / 86400);
const FPS_SPEED_IDX = 6;
const ORB_K = (2 * PI) / 365.25;
const ROT_DAYS = {
  mer: 58.646,
  ven: 243.025,
  earth: 0.9973,
  mars: 1.026,
  jup: 0.4135,
  sat: 0.444,
  ura: 0.7183,
  nep: 0.6713,
  cer: 0.3781,
  plu: 6.3872,
  hau: 0.163,
  mak: 0.951,
  eri: 1.08,
};
let orbitsVisible = true,
  moonLabelsVisible = true,
  planetLabelsVisible = false,
  infoPanelVisible = true,
  spinRef = 0;
let curTiltQ = new TH.Quaternion(),
  smoothTiltQ = new TH.Quaternion();
let camMode = 1,
  camMix = 1;
const SKY_SUN_A = 0.55;
const SKY_FAR_A = 0.85;
const SKY_K = 0.35;
let SIM_SKY_BRIGHT = 0.85;
const _sstep = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
const dotPxTarget = 4;
const minPix = 3;
(async () => {
  const ld = $('#load'),
    lb = ld.querySelector('i'),
    lt = ld.querySelector('.tx');
  const tick = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
  let _lastProg = 0;
  const prog = async (p, t) => {
    const v = Math.max(_lastProg, Math.min(100, Number(p) || 0));
    _lastProg = v;
    lb.style.width = v + '%';
    if (t) lt.textContent = t;
    await tick();
  };
  try {
    console.log('[phase] scene init');
    const S = new TH.Scene(),
      C = new TH.PerspectiveCamera(55, innerWidth / innerHeight, 0.001, 2000000);
    const H = (x, y, z) => {
      const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
      return n - Math.floor(n);
    };
    const sm = t => t * t * (3 - 2 * t),
      L = (u, v, t) => u + (v - u) * t;
    const HR = 72,
      HS = 2 * HR + 1,
      HV = new Float32Array(HS * HS * HS),
      HFl = new Uint8Array(HS * HS * HS);
    const hf = (i, j, k) => {
      let n = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 1274126177);
      n = Math.imul(n ^ (n >>> 13), 1274126177);
      return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
    };
    const Hc = (i, j, k) => {
      if (i < -HR || i > HR || j < -HR || j > HR || k < -HR || k > HR) return hf(i, j, k);
      const id = ((i + HR) * HS + (j + HR)) * HS + (k + HR);
      return HFl[id] ? HV[id] : ((HFl[id] = 1), (HV[id] = H(i, j, k)));
    };
    function N(x, y, z) {
      const i = Math.floor(x),
        j = Math.floor(y),
        k = Math.floor(z),
        a = sm(x - i),
        b = sm(y - j),
        c = sm(z - k),
        h = (p, q, r) => Hc(i + p, j + q, k + r),
        m = (q, r) => L(h(0, q, r), h(1, q, r), a),
        n = r => L(m(0, r), m(1, r), b);
      return L(n(0), n(1), c);
    }
    const F = (x, y, z, o = 5) => {
      let s = 0,
        a = 0.5;
      for (let i = 0; i < o; i++) {
        s += a * N(x, y, z);
        x *= 2;
        y *= 2;
        z *= 2;
        a /= 2;
      }
      return s * 1.03;
    };
    const tx = {};
    const MTEX = {
      'Ио': 'io',
      'Европа': 'europa',
      'Ганимед': 'ganymede',
      'Каллисто': 'callisto',
      'Фобос': 'phobos',
      'Деймос': 'deimos',
      'Титан': 'titan',
      'Харон': 'cha',
      'Рея': 'rhea',
      'Диона': 'dione',
      'Титания': 'titania',
      'Оберон': 'oberon',
      'Тритон': 'triton',
      'Никта': 'nix',
      'Гидра': 'hydra',
      'Намака': 'namaka',
      'Хииака': 'hiiaka',
      'Дисномия': 'dysnomia',
    };
    const NL_RAW = 'https://raw.githubusercontent.com/VladislavMardashov/WebSolarSystem/main/textures/';
    /* Текстуры берём с того же origin (GitHub Pages/localhost); абсолютный URL нужен воркеру (blob:), а с file:// остаётся raw */
    const NL = location.protocol === 'file:' ? NL_RAW : new URL('textures/', location.href).href;
    const TEX_URLS = {
      sun: [NL + 'sun.jpg'],
      mer: [NL + 'mercury.jpg'],
      ven: [NL + 'venus_surface.jpg'],
      earth: [NL + 'earth_daymap.jpg'],
      moon: [NL + 'earth_moon.jpg'],
      mars: [NL + 'mars.jpg'],
      jup: [NL + 'jupiter.jpg'],
      sat: [NL + 'saturn.jpg'],
      ura: [NL + 'uranus.jpg'],
      nep: [NL + 'neptune.jpg'],
      io: [NL + 'jupiter_io.jpg'],
      europa: [NL + 'jupiter_europa.jpg'],
      ganymede: [NL + 'jupiter_ganymede.jpg'],
      callisto: [NL + 'jupiter_callisto.jpg'],
      phobos: [NL + 'mars_phobos.jpg'],
      deimos: [NL + 'mars_deimos.jpg'],
      rhea: [NL + 'saturn_rhea.jpg'],
      dione: [NL + 'dione.jpg'],
      titan: [NL + 'saturn_titan.jpg'],
      oberon: [NL + 'uranus_oberon.jpg'],
      titania: [NL + 'uranus_titania.jpg'],
      triton: [NL + 'neptune_triton.jpg'],
      nix: [NL + 'nix.jpg'],
      hydra: [NL + 'hydra.jpg'],
      plu: [NL + 'pluto.jpg'],
      cha: [NL + 'pluto_charon.jpg'],
      cer: [NL + 'ceres_fictional.jpg'],
      hau: [NL + 'haumea_fictional.jpg'],
      mak: [NL + 'makemake_fictional.jpg'],
      eri: [NL + 'eris_fictional.jpg'],
      namaka: [NL + 'haumea_namaka.jpg'],
      hiiaka: [NL + 'haumea_hiiaka.jpg'],
      dysnomia: [NL + 'eris_dysnomia.jpg'],
      cl: [NL + 'earth_clouds.jpg'],
      cit: [NL + 'earth_nightmap.jpg'],
      ven_atm: [NL + 'venus_atmosphere.jpg'],
    };
    const NORMAL_URLS = {};
    if (Q.normalAll) {
      NORMAL_URLS.earth_normal = [NL + 'earth_normal.jpg'];
      NORMAL_URLS.moon_normal = [NL + 'moon_normal.jpg'];
      NORMAL_URLS.mars_normal = [NL + 'mars_normal.png'];
    } else if (Q.normalMarsOnly) {
      NORMAL_URLS.mars_normal = [NL + 'mars_normal.png'];
    }
    if (NL !== NL_RAW) {
      for (const o of [TEX_URLS, NORMAL_URLS])
        for (const k in o) o[k] = o[k].concat(o[k].map(u => NL_RAW + u.slice(NL.length)));
    }
    const texKeys = Object.keys(TEX_URLS);
    for (let i = 0; i < texKeys.length; i++) {
      const k = texKeys[i],
        urls = TEX_URLS[k];
      await prog(Math.round(((i + 1) / texKeys.length) * 60), 'Текстуры: ' + k + '…');
      let loaded = false;
      for (let u = 0; u < urls.length; u++) {
        try {
          const tex = await loadTexture(urls[u], `[tex] ${k}${u > 0 ? ' (alt)' : ''}`, 20000);
          if (MTEX[k]) tx[MTEX[k]] = tex;
          else tx[k] = tex;
          loaded = true;
          break;
        } catch (e) {
          console.warn(`[tex] ${k}: FAIL ${urls[u]} — ${e.message || e}`);
        }
      }
      if (!loaded) console.error(`[tex] ${k}: все URL недоступны`);
    }
    const normalTextures = {};
    for (const [k, urls] of Object.entries(NORMAL_URLS)) {
      for (let u = 0; u < urls.length; u++) {
        try {
          const nt = await loadTexture(urls[u], `[norm] ${k}${u > 0 ? ' (alt)' : ''}`, 20000);
          normalTextures[k] = nt;
          break;
        } catch (e) {
          console.warn(`[norm] ${k}: FAIL ${urls[u]} — ${e.message || e}`);
        }
      }
    }
    const nrmGlobal = {
      opacity: 0.5,
      depth: 1.0,
      gamma: 1.0,
      swapRG: false,
      cropX: 5,
      litFrom: -0.7,
      litTo: 0.7,
    };
    const makeNrmU = (rot180, opacity) => ({
      uOpacity: { value: opacity != null ? opacity : nrmGlobal.opacity },
      uDepth: { value: nrmGlobal.depth },
      uGamma: { value: nrmGlobal.gamma },
      uSwapRG: { value: nrmGlobal.swapRG ? 1 : 0 },
      uFrom: { value: nrmGlobal.litFrom },
      uTo: { value: nrmGlobal.litTo },
      uNrmRot180: { value: rot180 ? 1 : 0 },
    });
    if (normalTextures.mars_normal && nrmGlobal.cropX > 0) {
      normalTextures.mars_normal = cropTextureX(normalTextures.mars_normal, nrmGlobal.cropX);
    }
    const LIGHT_MUL_REAL = 1.6,
      LIGHT_BASE_SUN = 0.5,
      LIGHT_BASE_AMB = 0.21;
    const G = (a, b) => {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const x = c.getContext('2d'),
        g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, a);
      g.addColorStop(0.3, b);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g;
      x.fillRect(0, 0, 128, 128);
      return new TH.CanvasTexture(c);
    };
    const spr = (t, s, o) => {
      const p = new TH.Sprite(
        new TH.SpriteMaterial({
          map: t,
          blending: TH.AdditiveBlending,
          depthWrite: false,
          transparent: true,
          opacity: o,
        })
      );
      p.scale.set(s, s, 1);
      p.userData.s = s;
      return p;
    };
    function domTexColor(tex, step) {
      step = step || 32;
      if (!tex || !tex.image || !tex.image.data) return new TH.Color(1, 1, 1);
      const d = tex.image.data;
      let r = 0,
        g = 0,
        b = 0,
        wsum = 0;
      for (let i = 0; i < d.length; i += 4 * step) {
        const lum = (d[i] + d[i + 1] + d[i + 2]) / 765;
        const w = lum * lum + 0.0005;
        r += d[i] * w;
        g += d[i + 1] * w;
        b += d[i + 2] * w;
        wsum += w;
      }
      if (wsum < 0.001) return new TH.Color(1, 1, 1);
      return new TH.Color(r / wsum / 255, g / wsum / 255, b / wsum / 255);
    }
    await prog(65, 'Карта неба…');
    const sky = new TH.Group();
    sky.rotation.x = -0.4;
    S.add(sky);
    const SKY_SOURCES = [
      { url: NL + 'milky_way_alt.jpg', src: 'GitHub-alt' },
      ...(NL !== NL_RAW ? [{ url: NL_RAW + 'milky_way_alt.jpg', src: 'GitHub-raw' }] : []),
      { url: 'https://upload.wikimedia.org/wikipedia/commons/6/60/ESO_-_Milky_Way.jpg', src: 'ESO' },
    ];
    let skyTexture = null;
    for (let i = 0; i < SKY_SOURCES.length; i++) {
      const entry = SKY_SOURCES[i];
      try {
        skyTexture = await loadTextureNoCache(entry.url, `[sky] ${entry.src}`, 25000, MAX_SKY_DIM);
        break;
      } catch (e) {
        console.warn(`[sky] ${entry.src}: FAIL — ${e.message || e}`);
      }
    }
    if (!skyTexture) console.error('[sky] все источники недоступны');
    let skySphere = null;
    if (skyTexture) {
      skyTexture.wrapS = TH.RepeatWrapping;
      skyTexture.wrapT = TH.ClampToEdgeWrapping;
      skyTexture.flipY = false;
      skyTexture.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
      skyTexture.minFilter = TH.LinearMipmapLinearFilter;
      skyTexture.magFilter = TH.LinearFilter;
      skyTexture.generateMipmaps = true;
      skyTexture.encoding = TH.sRGBEncoding;
      skyTexture.needsUpdate = true;
      const skyUni = {
        uTex: { value: skyTexture },
        uBright: { value: 1.0 },
        uDim: { value: 1.0 },
        uLinear: { value: 0 },
        uSkyGamma: { value: 1.0 },
      };
      skySphere = new TH.Mesh(
        new TH.SphereGeometry(3000, 96, 64),
        new TH.ShaderMaterial({
          uniforms: skyUni,
          vertexShader: SHD.uvVert,
          fragmentShader: SHD.skyTexFrag,
          side: TH.BackSide,
          depthWrite: false,
          fog: false,
        })
      );
      skySphere.renderOrder = -2;
      skySphere.userData.uni = skyUni;
      sky.add(skySphere);
    } else {
      sky.add(
        new TH.Mesh(
          new TH.SphereGeometry(3000, 32, 16),
          new TH.MeshBasicMaterial({ color: 0x000000, side: TH.BackSide, depthWrite: false })
        )
      );
    }
    const sunM = new TH.Mesh(
      new TH.SphereGeometry(1, 64, 48),
      new TH.MeshBasicMaterial({ map: tx.sun, color: new TH.Color(1.55, 1.45, 1.35) })
    );
    const glow = spr(G('rgba(255,252,240,1)', 'rgba(255,200,100,.8)'), 1, 1);
    const gl2 = spr(G('rgba(255,200,120,.55)', 'rgba(255,130,40,.2)'), 1, 1);
    const gl3 = spr(G('rgba(255,180,80,.35)', 'rgba(255,100,20,.08)'), 1, 1);
    const gl4 = spr(G('rgba(255,160,60,.2)', 'rgba(255,80,10,.04)'), 1, 1);
    const gl5 = spr(G('rgba(255,140,40,.12)', 'rgba(255,60,5,.015)'), 1, 1);
    const glFar = spr(G('rgba(255,200,120,.4)', 'rgba(255,120,40,.06)'), 1, 0);
    glow.renderOrder = 4;
    gl2.renderOrder = 3;
    gl3.renderOrder = 2;
    gl4.renderOrder = 1;
    gl5.renderOrder = 0;
    sunM.renderOrder = 5;
    glFar.renderOrder = -1;
    const sunLight = new TH.PointLight(0xfff1de, 3, 0, 1);
    sunLight.castShadow = true;
    const SHADOW_MAP_SIZE = (m => (m ? Math.min(+m[1], renderer.capabilities.maxTextureSize) : Q.shadowSize))(
      location.hash.match(/[#&]shadow=(\d{3,4})/)
    );
    sunLight.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
    /* Карта теней зависит только от положений тел (а не от камеры), поэтому её не нужно перерисовывать каждый кадр: обновляем, когда время симуляции сдвинулось на SH_DT суток или что-то изменилось (shDirty). #shadowlive в адресе — старое поведение (каждый кадр). */
    let shDirty = true,
      shLastTm = NaN,
      _shAllowed = true,
      shUpdN = 0,
      shWall = 0;
    const SH_MIN_MS = 50,
      SH_DT = 0.004,
      SHADOW_CACHE = !/[#&]shadowlive/.test(location.hash);
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.radius = 3;
    sunLight.shadow.normalBias = 0.015;
    console.log(`[shadow] mapSize=${SHADOW_MAP_SIZE}`);
    const ambLight = new TH.AmbientLight(0x2a3050, 0.35);
    S.add(sunM, glow, gl2, gl3, gl4, gl5, glFar, sunLight, ambLight);
    const ATM = {
      plu: { H: 0.1, k: 3, b: [0.45, 1.1, 3.4], m: 0.15, i: 0.5 },
      ven: { H: 0.07, k: 3, b: [1.55, 1.25, 0.8], m: 0.8, i: 1.1 },
      earth: { H: 0.05, k: 4, b: [0.58, 1.35, 3.31], m: 0.12, i: 1 },
      mars: { H: 0.04, k: 3.5, b: [1.3, 0.95, 0.7], m: 0.6, i: 0.5 },
      jup: { H: 0.04, k: 4, b: [1.2, 1, 0.8], m: 0.5, i: 0.45 },
      sat: { H: 0.04, k: 4, b: [1.3, 1.05, 0.75], m: 0.5, i: 0.45 },
      ura: { H: 0.045, k: 4, b: [0.9, 1.9, 2.2], m: 0.1, i: 0.8 },
      nep: { H: 0.045, k: 4, b: [0.5, 1.2, 3.2], m: 0.1, i: 0.9 },
    };
    const ZA = new TH.Vector3(0, 0, 1);
    const ATM_STEPS = Q.atmSteps;
    const makeAtm = (p, q) => {
      const Qf = 1 - (q || 0),
        Rp = 1 / Math.cbrt(Qf),
        gm = new TH.SphereGeometry(Rp + p.H, 48, 32);
      gm.scale(1, Qf, 1);
      return new TH.Mesh(
        gm,
        new TH.ShaderMaterial({
          uniforms: {
            uC: { value: new TH.Vector3(0, 0, 10) },
            uS: { value: new TH.Vector3(1, 0, 0) },
            uB: { value: new TH.Vector3(...p.b) },
            uRp: { value: Rp },
            uQ: { value: Qf },
            uH: { value: p.H },
            uK: { value: p.k },
            uM: { value: p.m },
            uI: { value: p.i },
          },
          vertexShader: SHD.atmVert,
          fragmentShader: SHD.atmFrag(ATM_STEPS),
          transparent: true,
          blending: TH.AdditiveBlending,
          depthWrite: false,
        })
      );
    };
    const DB = (window.SW_DATA || {}).DB;
    if (!DB) throw new Error('data/bodies.js не загрузился');
    const SUN_REAL_KM = 696340,
      EARTH_KM = 6371,
      AU_KM = 149597871,
      KM_PER_UNIT = EARTH_KM / 1.6,
      AU_TO_UNITS = AU_KM / KM_PER_UNIT;
    const ov = Math.max(180, Math.min(520, 100 / (Math.tan(0.48) * Math.min(innerWidth / innerHeight, 1))));
    let wasP = false,
      real = 0;
    const SIM_LIGHT_MUL = 0.6;
    const SKY_REF = 67.8;
    const bodies = [
      { n: 'Обзор', g: new TH.Object3D(), r: 8, d: ov, isRoot: true },
      {
        n: 'Солнце',
        g: sunM,
        r: 8,
        isSun: true,
        info: 'Центральная звезда Солнечной системы — жёлтый карлик спектрального класса G2V. Название происходит от древнерусского и общеиндоевропейских корней, связанных с «солнцем/светом». Масса — 99,8 % всей системы. Энергия вырабатывается термоядерным синтезом водорода в гелий. Возраст ≈ 4,6 млрд лет; через ≈ 5 млрд лет станет красным гигантом. В мифологии многих народов — божество или око бога.',
      },
    ];
    const planetLabels = [];
    await prog(75, 'Планеты и спутники…');
    const MINC = {
      'Луна': 5.145,
      'Фобос': 1.08,
      'Деймос': 1.79,
      'Ио': 0.04,
      'Европа': 0.47,
      'Ганимед': 0.2,
      'Каллисто': 0.19,
      'Диона': 0.03,
      'Рея': 0.35,
      'Титан': 0.33,
      'Титания': 0.08,
      'Оберон': 0.07,
      'Тритон': 157.3,
      'Намака': 113,
      'Хииака': 126.4,
      'Дисномия': 78.3,
    };
    const rock = (ax, seed, amp, cr) => () => {
      const m = Math.cbrt(ax[0] * ax[1] * ax[2]),
        A = ax.map(v => v / m),
        C0 = cr.map(([x, y, z, ar, dp]) => {
          const l = Math.hypot(x, y, z);
          return [x / l, y / l, z / l, ar, dp];
        });
      const g = new TH.SphereGeometry(1, 96, 64),
        p = g.attributes.position,
        nr = g.attributes.normal;
      const P = (x, y, z) => {
        const l = Math.hypot(x, y, z);
        x /= l;
        y /= l;
        z /= l;
        let r =
          1 +
          amp * (F(x * 1.8 + seed, y * 1.8, z * 1.8, 4) - 0.5) * 2 +
          0.01 * (F(x * 10 + seed, y * 10, z * 10, 3) - 0.5) * 2;
        for (const [cx, cy, cz, ar, dp] of C0) {
          const c = Math.acos(Math.max(-1, Math.min(1, x * cx + y * cy + z * cz))) / ar;
          if (c < 1) r -= dp * (1 - c * c);
          if (c < 1.8) r += dp * 0.12 * Math.exp((-(c - 1) * (c - 1)) / 0.04);
        }
        return [x * r * A[0], y * r * A[1], z * r * A[2]];
      };
      const v = new TH.Vector3(),
        t1 = new TH.Vector3(),
        t2 = new TH.Vector3(),
        a = new TH.Vector3(),
        b = new TH.Vector3(),
        c = new TH.Vector3(),
        e = 0.012;
      for (let i = 0; i < p.count; i++) {
        v.set(p.getX(i), p.getY(i), p.getZ(i)).normalize();
        t1.set(Math.abs(v.y) < 0.9 ? 0 : 1, Math.abs(v.y) < 0.9 ? 1 : 0, 0)
          .cross(v)
          .normalize();
        t2.copy(v).cross(t1);
        const p0 = P(v.x, v.y, v.z),
          p1 = P(v.x + e * t1.x, v.y + e * t1.y, v.z + e * t1.z),
          p2 = P(v.x + e * t2.x, v.y + e * t2.y, v.z + e * t2.z);
        a.set(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
        b.set(p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]);
        c.crossVectors(a, b).normalize();
        if (c.x * p0[0] + c.y * p0[1] + c.z * p0[2] < 0) c.negate();
        p.setXYZ(i, p0[0], p0[1], p0[2]);
        nr.setXYZ(i, c.x, c.y, c.z);
      }
      g.computeBoundingSphere();
      return g;
    };
    const AXS = { hau: [1161 / 798, 513 / 798, 852 / 798] };
    const ROCK = {
      'Фобос': rock([13, 9.1, 11.4], 3.1, 0.035, [
        [-0.66, 0.02, 0.75, 0.46, 0.2],
        [0.5, -0.2, 0.84, 0.2, 0.06],
        [-0.1, 0.6, -0.8, 0.17, 0.05],
        [0.8, 0.3, 0.5, 0.14, 0.04],
      ]),
      'Никта': rock([24.9, 15.55, 16.6], 5.2, 0.04, [
        [0.3, 0.6, 0.7, 0.3, 0.08],
        [-0.7, -0.2, 0.6, 0.2, 0.05],
      ]),
      'Гидра': rock([32.5, 12.5, 22.5], 9.1, 0.045, [
        [0.5, 0.3, 0.8, 0.25, 0.07],
        [-0.4, 0.6, -0.7, 0.2, 0.05],
      ]),
      'Деймос': rock([7.5, 5.2, 6.1], 7.7, 0.02, [
        [0.2, 0.5, 0.84, 0.3, 0.07],
        [-0.6, -0.3, 0.74, 0.22, 0.05],
        [0.7, -0.5, -0.5, 0.18, 0.04],
        [-0.3, 0.7, -0.65, 0.15, 0.035],
      ]),
    };
    const earthU = { uSunV: { value: new TH.Vector3(1, 0, 0) } };
    const SUNU = { uSunDir: { value: new TH.Vector3(1, 0, 0) } },
      sunV = new TH.Vector3();
    const LPS = TH.ShaderChunk.lights_pars_begin.replace(
      'vec3 lVector = pointLight.position - geometry.position;',
      'vec3 lVector = uSunDir;'
    );
    const sunPatch = sh => {
      sh.uniforms.uSunDir = SUNU.uSunDir;
      sh.fragmentShader = sh.fragmentShader.replace(
        '#include <lights_pars_begin>',
        'uniform vec3 uSunDir;\n' + LPS
      );
    };
    function chainPatch(mat, fn) {
      const prev = mat.onBeforeCompile;
      const hasPrev = typeof prev === 'function' && prev !== TH.Material.prototype.onBeforeCompile;
      mat.onBeforeCompile = function (sh) {
        if (hasPrev) prev.call(this, sh);
        fn.call(this, sh);
      };
      mat.needsUpdate = true;
    }
    function applyNormalPatches(mat, u) {
      chainPatch(mat, function (sh) {
        sh.uniforms.uNormLitFrom = u.uFrom;
        sh.uniforms.uNormLitTo = u.uTo;
        sh.uniforms.uNrmOpacity = u.uOpacity;
        sh.uniforms.uNrmGamma = u.uGamma;
        sh.uniforms.uNrmDepth = u.uDepth;
        sh.uniforms.uNrmSwapRG = u.uSwapRG;
        sh.uniforms.uNrmRot180 = u.uNrmRot180;
        sh.fragmentShader = SHD.normUniforms + sh.fragmentShader;
        sh.fragmentShader = sh.fragmentShader.replace(
          '#include <normal_fragment_begin>',
          '#include <normal_fragment_begin>\nvec3 _nSaved = normal;'
        );
        sh.fragmentShader = sh.fragmentShader.replace(
          'vec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;',
          [
            'vec2 _nrmUv = vUv;',
            'if (uNrmRot180 > 0.5) _nrmUv = vec2(fract(vUv.x + 0.5), vUv.y);',
            'vec3 mapN = texture2D( normalMap, _nrmUv ).xyz;',
            'if (uNrmSwapRG > 0.5) { mapN = mapN.grb; }',
            'mapN.r = pow(max(mapN.r, 0.0), uNrmGamma);',
            'mapN.g = pow(max(mapN.g, 0.0), uNrmGamma);',
            'mapN = mapN * 2.0 - 1.0;',
            'mapN.z *= uNrmDepth;',
          ].join('\n')
        );
        sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_maps>', SHD.normFragMaps);
      });
    }
    function patchSunLighting() {
      const seen = new Set(),
        M0 = TH.Material.prototype.onBeforeCompile;
      let idCounter = 0;
      const wrap = mat => {
        if (seen.has(mat)) return;
        seen.add(mat);
        const prev = mat.onBeforeCompile,
          custom = prev !== M0,
          key = 'sun|' + (custom ? prev.toString() : '') + '|' + idCounter++;
        mat.onBeforeCompile = function (sh) {
          if (custom) prev.call(this, sh);
          sunPatch(sh);
        };
        mat.customProgramCacheKey = () => key;
        mat.needsUpdate = true;
      };
      const obj = mesh => {
        if (!mesh) return;
        wrap(mesh.material);
        mesh.onBeforeRender = function (r, sc, cam) {
          const e = this.matrixWorld.elements;
          sunV.set(-e[12], -e[13], -e[14]);
          const Lv = sunV.length();
          sunV.transformDirection(cam.matrixWorldInverse);
          SUNU.uSunDir.value.copy(sunV).multiplyScalar(real ? 1 : Lv);
        };
      };
      for (const b of bodies) {
        if (!b.m) continue;
        obj(b.m);
        obj(b.cloudsMesh);
        obj(b.vatm);
        obj(b.ringMesh);
        for (const p of b.mo) obj(p.children[0]);
      }
    }
    const PLs = SHD.ringShadowFrag;
    const RGs = SHD.ellipsoidShadowFrag;
    const RPs = SHD.ringShadowUniforms;
    const patchV = sh => {
      sh.vertexShader =
        'varying vec3 vRel;\n' +
        sh.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\nvRel=mat3(modelMatrix)*transformed;'
        );
    };
    const dotTex = G('rgba(255,255,255,1)', 'rgba(255,255,255,0.45)');
    DB.forEach(([n, a0, r0, Tp, tilt, k, tint, ms, ring, kmR, au, ecc, orbInc, info, dw]) => {
      const g = new TH.Group(),
        tg = new TH.Group();
      const matOpts = {
        map: tx[k],
        color: tint,
        roughness: 0.92,
        metalness: 0,
        emissive: 0x0a0a0a,
        emissiveIntensity: 0.08,
      };
      const realNormalKey = k === 'earth' ? 'earth_normal' : k === 'mars' ? 'mars_normal' : null;
      let hasNormal = false;
      let myNrmU = null;
      if (realNormalKey && normalTextures[realNormalKey]) {
        matOpts.normalMap = normalTextures[realNormalKey];
        matOpts.normalScale = k === 'mars' ? new TH.Vector2(-1, 1) : new TH.Vector2(1, 1);
        myNrmU = k === 'earth' ? makeNrmU(false, 0.55) : makeNrmU(false);
        hasNormal = true;
      }
      const m = new TH.Mesh(new TH.SphereGeometry(1, 48, 32), new TH.MeshStandardMaterial(matOpts));
      m.castShadow = true;
      m.receiveShadow = true;
      let cloudsMesh = null,
        vatm = null;
      tg.rotation.z = (tilt * PI) / 180;
      tg.add(m);
      g.add(tg);
      if (k === 'earth') {
        m.material.color.setRGB(1.0, 1.0, 0.98);
        if (tx.cl) {
          cloudsMesh = new TH.Mesh(
            new TH.SphereGeometry(1, 48, 32),
            new TH.MeshStandardMaterial({
              color: 0xffffff,
              alphaMap: tx.cl,
              transparent: true,
              depthWrite: false,
              roughness: 1,
              metalness: 0,
              opacity: 0.95,
              side: TH.FrontSide,
            })
          );
          cloudsMesh.renderOrder = 1;
          tg.add(cloudsMesh);
        }
        const em = m.material;
        if (tx.cit) {
          em.emissiveMap = tx.cit;
          em.emissive.set(0xffcc88);
          em.emissiveIntensity = 0.95;
          chainPatch(em, sh => {
            sh.uniforms.uSunV = earthU.uSunV;
            sh.fragmentShader =
              'uniform vec3 uSunV;\n' +
              sh.fragmentShader.replace('#include <emissivemap_fragment>', SHD.nightEmissiveFrag);
          });
        }
      }
      if (k === 'ven' && tx.ven_atm) {
        vatm = new TH.Mesh(
          new TH.SphereGeometry(1, 48, 32),
          new TH.MeshStandardMaterial({
            map: tx.ven_atm,
            transparent: true,
            depthWrite: false,
            roughness: 1,
            metalness: 0,
            opacity: 0.92,
            side: TH.FrontSide,
          })
        );
        vatm.renderOrder = 1;
        tg.add(vatm);
      }
      if (hasNormal) applyNormalPatches(m.material, myNrmU);
      let atm = null;
      {
        const ap = ATM[k];
        if (ap) {
          atm = makeAtm(ap, { jup: 0.06487, sat: 0.09796 }[k]);
          atm.renderOrder = 3;
          atm.userData.I0 = ap.i;
          atm.rotation.z = (tilt * PI) / 180;
          g.add(atm);
        }
      }
      let ringMesh = null,
        ringTex = null,
        rU = null;
      if (ring) {
        const RING_CFG = {
          sat: {
            inner: 1.22,
            outer: 2.35,
            em: 0x2a241a,
            gen: t => {
              let al = 0;
              if (t < 0.03 || t > 0.97) al = 0;
              else if (t < 0.18) al = 0.12 + 0.25 * Math.sin(t * 40);
              else if (t < 0.42) al = 0.55 + 0.35 * Math.abs(Math.sin(t * 22));
              else if (t < 0.48) al = 0.02;
              else if (t < 0.78) al = 0.35 + 0.3 * Math.abs(Math.sin(t * 28 + 1));
              else if (t < 0.82) al = 0.08;
              else al = 0.15 + 0.1 * Math.sin(t * 50);
              const r = (210 - t * 25) | 0,
                g = (185 - t * 20) | 0,
                b = (145 - t * 15) | 0;
              return [r, g, b, al];
            },
          },
          jup: {
            inner: 1.55,
            outer: 1.95,
            em: 0x12110f,
            gen: t => {
              let al = 0;
              const core = Math.exp(-Math.pow((t - 0.45) / 0.12, 2));
              const halo = 0.15 * Math.exp(-Math.pow((t - 0.45) / 0.35, 2));
              al = (0.18 * core + halo) * (0.7 + 0.3 * Math.sin(t * 60));
              if (t < 0.08 || t > 0.92) al *= 0.3;
              const r = (170 - t * 15) | 0,
                g = (165 - t * 12) | 0,
                b = (155 - t * 10) | 0;
              return [r, g, b, al * 0.55];
            },
          },
          ura: {
            inner: 1.45,
            outer: 2.15,
            em: 0x101418,
            gen: t => {
              const bands = [
                [0.12, 0.03, 0.25],
                [0.22, 0.025, 0.22],
                [0.32, 0.02, 0.18],
                [0.42, 0.035, 0.28],
                [0.55, 0.02, 0.15],
                [0.68, 0.04, 0.35],
                [0.78, 0.015, 0.12],
                [0.88, 0.02, 0.1],
              ];
              let al = 0.015;
              for (const [c, w, a] of bands) {
                const d = Math.abs(t - c);
                if (d < w) al = Math.max(al, a * (1 - d / w));
              }
              al *= 0.7 + 0.3 * Math.sin(t * 90);
              const r = (90 + t * 20) | 0,
                g = (100 + t * 25) | 0,
                b = (110 + t * 30) | 0;
              return [r, g, b, al];
            },
          },
          nep: {
            inner: 1.5,
            outer: 2.45,
            em: 0x0c1018,
            gen: t => {
              const bands = [
                [0.15, 0.04, 0.12],
                [0.28, 0.03, 0.1],
                [0.42, 0.025, 0.08],
                [0.58, 0.035, 0.14],
                [0.78, 0.06, 0.28],
              ];
              let al = 0.01;
              for (const [c, w, a] of bands) {
                const d = Math.abs(t - c);
                if (d < w) al = Math.max(al, a * (1 - d / w) * (0.75 + 0.25 * Math.sin(t * 40 + c * 10)));
              }
              const r = (80 + t * 25) | 0,
                g = (95 + t * 30) | 0,
                b = (130 + t * 20) | 0;
              return [r, g, b, al];
            },
          },
        };
        const cfg = RING_CFG[k] || RING_CFG.sat;
        const ri = cfg.inner,
          ro = cfg.outer,
          rw = ro - ri;
        const rg = new TH.RingGeometry(ri, ro, 160),
          p = rg.attributes.position,
          u = rg.attributes.uv,
          v = new TH.Vector3();
        for (let i = 0; i < p.count; i++) {
          v.fromBufferAttribute(p, i);
          u.setXY(i, (v.length() - ri) / rw, 0);
        }
        const rc = document.createElement('canvas');
        rc.width = 512;
        rc.height = 1;
        const x = rc.getContext('2d');
        for (let i = 0; i < 512; i++) {
          const t = i / 511;
          const [r, g, b, al] = cfg.gen(t);
          x.fillStyle = `rgba(${r},${g},${b},${Math.max(0, Math.min(1, al))})`;
          x.fillRect(i, 0, 1, 1);
        }
        ringTex = new TH.CanvasTexture(rc);
        ringTex.minFilter = TH.LinearFilter;
        ringTex.magFilter = TH.LinearFilter;
        ringMesh = new TH.Mesh(
          rg,
          new TH.MeshStandardMaterial({
            map: ringTex,
            emissive: cfg.em,
            roughness: 1,
            metalness: 0,
            transparent: true,
            side: TH.DoubleSide,
            depthWrite: false,
            opacity: 1,
          })
        );
        ringMesh.rotation.x = PI / 2;
        tg.add(ringMesh);
        rU = {
          uSun: { value: new TH.Vector3() },
          uN: { value: new TH.Vector3(0, 1, 0).applyAxisAngle(new TH.Vector3(0, 0, 1), (tilt * PI) / 180) },
          uS: { value: 1 },
          uA: { value: 1 },
          uCc: { value: 1 },
          uRT: { value: ringTex },
        };
        m.material.onBeforeCompile = sh => {
          Object.assign(sh.uniforms, rU);
          patchV(sh);
          sh.fragmentShader =
            RPs +
            sh.fragmentShader.replace(
              '#include <lights_fragment_end>',
              '#include <lights_fragment_end>\n' + PLs
            );
        };
        ringMesh.material.onBeforeCompile = sh => {
          Object.assign(sh.uniforms, rU);
          patchV(sh);
          sh.fragmentShader =
            RPs +
            sh.fragmentShader.replace(
              '#include <lights_fragment_end>',
              '#include <lights_fragment_end>\n' + RGs
            );
        };
      }
      const mo = ms.map(([d, mr, orbP, col, mkm, mdist, mname]) => {
        const pv = new TH.Group();
        const moonNrmKey = mname === 'Луна' ? 'moon_normal' : null;
        const mmOpts = {
          map: tx[MTEX[mname] || 'moon'],
          color: col,
          roughness: 0.95,
          metalness: 0,
          emissive: 0x050505,
          emissiveIntensity: 0.05,
        };
        let moonNrmU = null;
        if (moonNrmKey && normalTextures[moonNrmKey]) {
          mmOpts.normalMap = normalTextures[moonNrmKey];
          mmOpts.normalScale = new TH.Vector2(1, 1);
          moonNrmU = makeNrmU(false, 0.45);
        }
        const mm = new TH.Mesh(
          ROCK[mname] ? ROCK[mname]() : new TH.SphereGeometry(1, 24, 16),
          new TH.MeshStandardMaterial(mmOpts)
        );
        if (moonNrmU) applyNormalPatches(mm.material, moonNrmU);
        mm.castShadow = true;
        mm.receiveShadow = true;
        if (mname === 'Луна') mm.rotation.y = PI;
        pv.rotation.order = 'ZXY';
        pv.rotation.z = ((k === 'earth' ? 0 : tilt) * PI) / 180;
        pv.rotation.x = ((MINC[mname] || 0) * PI) / 180;
        mm.position.x = d;
        mm.scale.setScalar(mr);
        pv.add(mm);
        const mPts = [];
        for (let i = 0; i <= 128; i++) {
          const t = (i / 128) * 2 * PI;
          mPts.push(new TH.Vector3(Math.cos(t) * d, 0, Math.sin(t) * d));
        }
        const mLn = new TH.Line(
          new TH.BufferGeometry().setFromPoints(mPts),
          new TH.LineBasicMaterial({ color: 0x8899bb, transparent: true, opacity: 0.14, depthWrite: false })
        );
        mLn.visible = false;
        mLn.renderOrder = -2;
        pv.add(mLn);
        pv.userData = {
          orbPeriod: orbP,
          ph: rnd() * 6.28,
          d,
          mr,
          mkm: mkm || 1737,
          mdist: mdist || 400000,
          name: mname || 'Спутник',
          orbit: mLn,
          nrmU: moonNrmU,
        };
        g.add(pv);
        return pv;
      });
      const pts = [];
      for (let i = 0; i <= 512; i++) {
        const t = (i / 512) * 2 * PI;
        pts.push(new TH.Vector3(Math.cos(t), 0, Math.sin(t)));
      }
      const ln = new TH.Line(
        new TH.BufferGeometry().setFromPoints(pts),
        new TH.LineBasicMaterial({ color: 0x7a8aab, transparent: true, opacity: 0.32, depthWrite: false })
      );
      const incRad = ((orbInc || 0) * PI) / 180;
      if (dw) ln.material.color.set(0xa88f6e);
      ln.rotation.x = incRad;
      S.add(g, ln);
      let dot = null;
      if (!dw && tx[k]) {
        const dotCol = domTexColor(tx[k]);
        dot = new TH.Sprite(
          new TH.SpriteMaterial({
            map: dotTex,
            blending: TH.AdditiveBlending,
            depthWrite: false,
            depthTest: true,
            transparent: true,
            opacity: 0,
            color: dotCol,
          })
        );
        dot.scale.set(0.0001, 0.0001, 1);
        dot.visible = false;
        dot.renderOrder = 4;
        g.add(dot);
      }
      const plbl = document.createElement('div');
      plbl.className = 'label';
      plbl.textContent = n;
      document.body.appendChild(plbl);
      planetLabels.push({ el: plbl, obj: g, isPlanet: true });
      bodies.push({
        n,
        g,
        ln,
        r: r0,
        r0,
        a: a0,
        a0,
        kmR,
        au,
        ecc: ecc || 0,
        orbInc: orbInc || 0,
        incRad,
        T: Tp,
        k,
        m,
        mo,
        ph: rnd() * 6.28,
        moonData: ms,
        ringMesh,
        atm,
        tg,
        baseA0: a0,
        baseR0: r0,
        info,
        tilt,
        dw,
        axes: AXS[k],
        cloudsMesh,
        vatm,
        flat: { jup: 0.06487, sat: 0.09796 }[k] || 0,
        ringU: rU,
        hasNormal,
        nrmU: myNrmU,
        dot: dot,
        baseMScale: null,
      });
    });
    const satB = bodies.find(b => b.k === 'sat'),
      earthB = bodies.find(b => b.k === 'earth'),
      venB = bodies.find(b => b.k === 'ven');
    patchSunLighting();
    const VEN_MAX_REAL = 0.92;
    const venCtl = document.createElement('div');
    venCtl.id = 'venAtmCtl';
    venCtl.innerHTML =
      '<label>Атмосфера</label><input type="range" id="venAtmSlider" min="0" max="100" step="1" value="100"><span class="v" id="venAtmVal">100%</span>';
    document.body.append(venCtl);
    const venSlider = document.getElementById('venAtmSlider'),
      venVal = document.getElementById('venAtmVal');
    venSlider.addEventListener('input', () => {
      const p = parseInt(venSlider.value, 10);
      venVal.textContent = p + '%';
      if (venB && venB.vatm) venB.vatm.material.opacity = (p / 100) * VEN_MAX_REAL;
    });
    ['pointerdown', 'click', 'touchstart'].forEach(ev =>
      venSlider.addEventListener(
        ev,
        e => e.stopPropagation(),
        ev === 'touchstart' ? { passive: true } : false
      )
    );
    await prog(85, 'Пояса астероидов…');
    const BC = [
      { c: 2.3, s: 0.14, n: Math.max(30, Math.floor(760 * Q.asteroidMul)) },
      { c: 2.65, s: 0.12, n: Math.max(30, Math.floor(900 * Q.asteroidMul)) },
      { c: 3, s: 0.14, n: Math.max(30, Math.floor(840 * Q.asteroidMul)) },
    ];
    const BGm = new TH.DodecahedronGeometry(1, 0),
      BMt = new TH.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true }),
      o = new TH.Object3D(),
      bcol = new TH.Color(),
      G3 = () => (rnd() + rnd() + rnd() - 1.5) * 2;
    const belts = [],
      bms = [],
      bps = [],
      bmArr = [];
    BC.forEach((cc, k) => {
      const m = new TH.InstancedMesh(BGm, BMt.clone(), cc.n);
      m.frustumCulled = false;
      m.userData.w = 0.0157 / Math.pow(cc.c, 1.5);
      belts.push(m);
      bps.push(
        Array.from({ length: cc.n }, () => [
          rnd() * 2 * PI,
          Math.min(3.32, Math.max(2.08, cc.c + cc.s * G3())),
          rnd() - 0.5,
          0.05 + rnd() ** 3 * 0.35,
          0.6 + rnd() * 0.6,
          0.7 + rnd() * 0.5,
          rnd() * 6,
          rnd() * 6,
        ])
      );
      const arr = new Float32Array(cc.n * 3),
        g = new TH.BufferGeometry();
      g.setAttribute('position', new TH.BufferAttribute(arr, 3));
      bmArr.push(arr);
      const bm = new TH.Points(
        g,
        new TH.PointsMaterial({
          color: 0x56524b,
          size: 1.25,
          sizeAttenuation: false,
          transparent: true,
          opacity: 0.36,
        })
      );
      bm.visible = false;
      bm.frustumCulled = false;
      bms.push(bm);
    });
    const KC = [
      { c: 34, s: 3.4, n: Math.max(60, Math.floor(1100 * Q.kuiperMul)) },
      { c: 41, s: 3, n: Math.max(60, Math.floor(1100 * Q.kuiperMul)) },
      { c: 47, s: 3, n: Math.max(40, Math.floor(800 * Q.kuiperMul)) },
    ];
    const kbs = [],
      kqs = [],
      kps = [],
      kbMat = new TH.PointsMaterial({
        color: 0x5a6578,
        size: 1.25,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.48,
      });
    KC.forEach(cc => {
      const arr = new Float32Array(cc.n * 3),
        g = new TH.BufferGeometry();
      g.setAttribute('position', new TH.BufferAttribute(arr, 3));
      const mat = kbMat.clone();
      const pt = new TH.Points(g, mat);
      pt.frustumCulled = false;
      pt.userData.w = 0.0157 / Math.pow(cc.c, 1.5);
      kbs.push(pt);
      kps.push(arr);
      kqs.push(
        Array.from({ length: cc.n }, () => [
          rnd() * 2 * PI,
          Math.min(50, Math.max(30, cc.c + cc.s * G3())),
          rnd() - 0.5,
        ])
      );
    });
    S.add(...belts, ...kbs, ...bms);
    function fill() {
      const R = real;
      belts.forEach((bt, k) => {
        bt.visible = !R;
        bms[k].visible = false;
      });
      kbs.forEach(kb => (kb.visible = !R));
      belts.forEach((bt, k) => {
        bps[k].forEach(([a, au, y, sc, sy, sz, rx, ry], i) => {
          const r = R ? au * AU_TO_UNITS : 43 + (au - 2.2) * 14,
            t = Math.min(1, Math.max(0, (au - 2.2) / 1.0)),
            v = 0.82 + (rx % 1) * 0.3;
          o.position.set(Math.cos(a) * r, y * (R ? 0.4 * AU_TO_UNITS : 2.4), Math.sin(a) * r);
          o.rotation.set(rx, ry, 0);
          o.scale.set(sc * (R ? 0.3 : 1), sc * sy * (R ? 0.3 : 1), sc * sz * (R ? 0.3 : 1));
          o.updateMatrix();
          bt.setMatrixAt(i, o.matrix);
          bcol.setRGB((0.64 - 0.2 * t) * v, (0.56 - 0.15 * t) * v, (0.47 - 0.09 * t) * v);
          bt.setColorAt(i, bcol);
          bmArr[k][i * 3] = o.position.x;
          bmArr[k][i * 3 + 1] = o.position.y;
          bmArr[k][i * 3 + 2] = o.position.z;
        });
        bt.instanceMatrix.needsUpdate = true;
        bt.instanceColor.needsUpdate = true;
        bms[k].geometry.attributes.position.needsUpdate = true;
      });
      kqs.forEach((q, k) => {
        q.forEach(([a, au, y], i) => {
          const r = R ? au * AU_TO_UNITS : 150 + (au - 30) * 2;
          kps[k].set([Math.cos(a) * r, y * (R ? 0.25 * r : (14 * r) / 170), Math.sin(a) * r], i * 3);
        });
        kbs[k].geometry.attributes.position.needsUpdate = true;
      });
    }
    const targets = [];
    bodies.forEach(b => {
      targets.push(b);
      if (b.mo && b.mo.length)
        b.mo
          .map(p => ({
            isMoon: true,
            n: p.userData.name,
            g: p.children[0],
            grp: p,
            parent: b,
            ud: p.userData,
            get r() {
              return this.g.scale.x;
            },
          }))
          .sort((x, y) => x.n.localeCompare(y.n, 'ru'))
          .forEach(t => targets.push(t));
    });
    let ci = 0,
      spI = 6,
      tm = Date.now() / 86400000 + 2440587.5 - 2451545,
      last = performance.now(),
      th = 0.4,
      ph = 1.3,
      dist = ov,
      dd = ov,
      cur = bodies[0];
    const wv = new TH.Vector3();
    const wpos = b => {
      if (b.isMoon) {
        b.g.updateWorldMatrix(true, false);
        return b.g.getWorldPosition(wv);
      }
      return b.g.position;
    };
    function objSpin(b) {
      if (!b || b.isRoot) return 0;
      if (b.isMoon) return b.grp ? b.grp.rotation.y : 0;
      if (b.isSun) return b.g.rotation.y;
      return b.m ? b.m.rotation.y : 0;
    }
    function normalizeAngle(a) {
      a = ((a % (2 * PI)) + 2 * PI) % (2 * PI);
      if (a > PI) a -= 2 * PI;
      return a;
    }
    function objTiltQ(b) {
      if (!b || b.isRoot || b.isSun || b.isMoon) return null;
      const d = b.tilt;
      if (d == null || d === 0) return null;
      return new TH.Quaternion().setFromAxisAngle(ZA, (d * PI) / 180);
    }
    const tgv = new TH.Vector3(),
      off = new TH.Vector3(),
      camOff = new TH.Vector3(),
      pt = new Map(),
      el = renderer.domElement;
    const qId = new TH.Quaternion(),
      appliedQ = new TH.Quaternion();
    const cl = v => Math.min(real ? 2e7 : 900, Math.max(cur.isMoon ? cur.r * 1.5 : cur.r * 1.6 + 0.5, v));
    let pd = 0;
    const pinch = () => {
      if (pt.size < 2) return 0;
      const [a, b] = [...pt.values()];
      return Math.hypot(a[0] - b[0], a[1] - b[1]);
    };
    let gyroDragAcc = 0;
    el.addEventListener('pointerdown', e => {
      gyroDragAcc = 0;
      el.setPointerCapture(e.pointerId);
      pt.set(e.pointerId, [e.clientX, e.clientY]);
      pd = pinch();
      if (fpsState === 'select' && pt.size === 1) {
        fpsSelDownX = e.clientX;
        fpsSelDownY = e.clientY;
      }
    });
    el.addEventListener('pointermove', e => {
      const o = pt.get(e.pointerId);
      if (!o) return;
      const _dx = e.clientX - o[0],
        _dy = e.clientY - o[1];
      if (fpsState === 'stand' || fpsState === 'fly') {
        if (pt.size === 2) {
          pt.set(e.pointerId, [e.clientX, e.clientY]);
          const d = pinch();
          if (pd && d) fpsZoom(pd / d);
          pd = d;
          return;
        }
        if (fpsState === 'stand' && pt.size === 1) {
          gyroDragAcc += Math.hypot(_dx, _dy);
          if (gyro.on && gyroDragAcc > 8) gyroStop();
          fpsYaw -= _dx * 0.0035;
          fpsPitch = Math.max(-1.45, Math.min(1.45, fpsPitch + _dy * 0.0035));
        }
        pt.set(e.pointerId, [e.clientX, e.clientY]);
        return;
      }
      if (fpsState === 'exit') {
        pt.set(e.pointerId, [e.clientX, e.clientY]);
        return;
      }
      if (pt.size == 1) {
        th -= _dx * 0.006;
        ph = Math.min(3, Math.max(0.15, ph - _dy * 0.006));
      }
      pt.set(e.pointerId, [e.clientX, e.clientY]);
      if (pt.size == 2) {
        const d = pinch();
        if (pd && d) dd = cl((dd * pd) / d);
        pd = d;
      }
    });
    ['pointerup', 'pointercancel'].forEach(t =>
      el.addEventListener(t, e => {
        if (t === 'pointerup' && fpsState === 'select' && fpsSelDownX != null) {
          const _dx = e.clientX - fpsSelDownX,
            _dy = e.clientY - fpsSelDownY;
          if (_dx * _dx + _dy * _dy < 49) trySelectSurface(e.clientX, e.clientY);
          fpsSelDownX = null;
        }
        pt.delete(e.pointerId);
        pd = pinch();
      })
    );
    el.addEventListener(
      'wheel',
      e => {
        if (fpsState === 'fly' || fpsState === 'stand') {
          fpsZoom(1 + Math.sign(e.deltaY) * 0.08);
          return;
        }
        if (fpsState === 'exit') return;
        dd = cl(dd * (1 + Math.sign(e.deltaY) * 0.1));
      },
      { passive: true }
    );
    window.addEventListener('resize', () => {
      C.aspect = innerWidth / innerHeight;
      C.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });
    /* === Эфемериды: реальные положения и ориентация орбит планет (элементы PLE) === */
    let EPH = null;
    const D2R = Math.PI / 180,
      _oM = new TH.Matrix4(),
      _oX = new TH.Vector3(),
      _oY = new TH.Vector3(),
      _oZ = new TH.Vector3(),
      _oV = new TH.Vector3();
    /* кватернион «перифокальная система -> мир»: локально x — к перигелию, y — нормаль орбиты, z = -y_перифокальная; экл. (X,Y,Z) -> мир (-Y,Z,-X) */
    function orbQuat(I, O, om, out) {
      const cO = Math.cos(O),
        sO = Math.sin(O),
        cI = Math.cos(I),
        sI = Math.sin(I),
        co = Math.cos(om),
        so = Math.sin(om);
      const px = [cO * co - sO * so * cI, sO * co + cO * so * cI, so * sI],
        py = [-cO * so - sO * co * cI, -sO * so + cO * co * cI, co * sI],
        pz = [sO * sI, -cO * sI, cI];
      _oX.set(-px[1], px[2], -px[0]);
      _oY.set(-pz[1], pz[2], -pz[0]);
      _oZ.set(py[1], -py[2], py[0]);
      _oM.makeBasis(_oX, _oY, _oZ);
      return out.setFromRotationMatrix(_oM);
    }
    const moonRotY = tm => {
      const v = moonGeoEcl(tm);
      return Math.atan2(v[1], v[0]) + Math.PI / 2;
    };
    function place() {
      for (const b of bodies) {
        if (!b.a && b.a !== 0) continue;
        if (b.isRoot || b.isSun) continue;
        const ep = EPH && b !== earthB ? EPH[b.k] : null;
        let M,
          el = null;
        if (ep) {
          el = eph(b.k, tm / 36525);
          M = el.M;
          orbQuat(el.I, el.O, el.w - el.O, b.oq || (b.oq = new TH.Quaternion()));
          b.ln.quaternion.copy(b.oq);
        } else M = b.absM ? b.absM(tm) : b.ph + (tm * ORB_K) / b.T;
        const e = b.ecc || 0,
          eT = el ? el.e : e;
        let E = M + eT * Math.sin(M);
        for (let i = 0; i < 4; i++) E -= (E - eT * Math.sin(E) - M) / (1 - eT * Math.cos(E));
        /* направление на тело — по актуальному e(T), а радиус — по эллипсу линии (e на J2000), чтобы тело всегда лежало на своей линии */
        if (el && eT !== e) {
          const nu = 2 * Math.atan2(Math.sqrt(1 + eT) * Math.sin(E / 2), Math.sqrt(1 - eT) * Math.cos(E / 2));
          E = 2 * Math.atan2(Math.sqrt(1 - e) * Math.sin(nu / 2), Math.sqrt(1 + e) * Math.cos(nu / 2));
        }
        b.E = E;
        let x = b.a * (Math.cos(E) - e),
          y = 0,
          z = -b.a * Math.sqrt(Math.max(0, 1 - e * e)) * Math.sin(E);
        if (ep) {
          _oV.set(x, 0, z).applyQuaternion(b.oq);
          x = _oV.x;
          y = _oV.y;
          z = _oV.z;
        } else {
          const inc = b.incRad || 0;
          if (inc) {
            const cy = y * Math.cos(inc) - z * Math.sin(inc),
              cz = y * Math.sin(inc) + z * Math.cos(inc);
            y = cy;
            z = cz;
          }
          if (b.rotY) {
            const c = Math.cos(b.rotY),
              sn = Math.sin(b.rotY),
              x2 = x * c + z * sn;
            z = -x * sn + z * c;
            x = x2;
          }
        }
        b.g.position.set(x, y, z);
      }
    }
    const LL = new TH.Line(
        new TH.BufferGeometry(),
        new TH.LineBasicMaterial({ transparent: true, depthWrite: false })
      ),
      LLbuf = new Float32Array(3 * 2400);
    LL.geometry.setAttribute('position', new TH.BufferAttribute(LLbuf, 3));
    LL.renderOrder = -1;
    LL.visible = false;
    LL.frustumCulled = false;
    S.add(LL);
    let llFor = null;
    function updateLocalOrbit() {
      if (!orbitsVisible) {
        if (llFor) {
          llFor.ln.visible = false;
          llFor = null;
        }
        LL.visible = false;
        return;
      }
      const fb = real ? (cur.isMoon ? cur.parent : cur) : null,
        ok = !!(fb && fb.ln && fb.au);
      if (llFor && (llFor !== fb || !ok)) {
        llFor.ln.visible = orbitsVisible && llFor.k !== 'cer';
        llFor = null;
        LL.visible = false;
      }
      if (!ok) return;
      if (llFor !== fb) {
        llFor = fb;
        LL.material.color.copy(fb.ln.material.color);
        LL.material.opacity = fb.ln.material.opacity;
        LL.visible = true;
      }
      if (fb.oq) LL.quaternion.copy(fb.oq);
      else {
        LL.quaternion.identity();
        LL.rotation.y = fb.rotY || 0;
      }
      fb.ln.visible = false;
      const e = fb.ecc || 0,
        a = fb.a,
        bb = a * Math.sqrt(1 - e * e),
        inc = fb.oq ? 0 : fb.incRad || 0,
        si = Math.sin(inc),
        ci = Math.cos(inc),
        E0 = fb.E;
      const P = E => {
        const sE = Math.sin(E);
        return [a * (Math.cos(E) - e), bb * sE * si, -bb * sE * ci];
      };
      const p0 = P(E0),
        dEdS = 1 / (a * Math.sqrt(1 - e * e * Math.cos(E0) * Math.cos(E0))),
        offs = [];
      for (let s = Math.max(dist * 0.04, 1e-4); ; s *= 1.08) {
        const dE = s * dEdS;
        if (dE >= PI || offs.length > 1100) {
          offs.push(PI);
          break;
        }
        offs.push(dE);
      }
      let k = 0;
      const put = E => {
        const q = P(E);
        LLbuf[k++] = q[0] - p0[0];
        LLbuf[k++] = q[1] - p0[1];
        LLbuf[k++] = q[2] - p0[2];
      };
      for (let i = offs.length - 1; i >= 0; i--) put(E0 - offs[i]);
      put(E0);
      for (let i = 0; i < offs.length; i++) put(E0 + offs[i]);
      LL.geometry.setDrawRange(0, k / 3);
      LL.geometry.attributes.position.needsUpdate = true;
      LL.position.copy(fb.g.position);
    }
    const setPl = (b, f) => {
      if (b.axes) {
        b.m.scale.set(f * b.axes[0], f * b.axes[1], f * b.axes[2]);
        return;
      }
      const q = b.flat || 0,
        a = f / Math.cbrt(1 - q);
      b.m.scale.set(a, a * (1 - q), a);
    };
    function sunLightSetup(base) {
      if (real) {
        sunLight.decay = 0;
        sunLight.distance = 0;
        sunLight.userData.fm = 1;
        sunLight.intensity = base;
        return;
      }
      const ds = bodies.filter(b => b.au),
        me = ds.find(b => b.n === 'Меркурий'),
        d = b => (real ? b.au * AU_TO_UNITS : b.a0),
        dFar = Math.max(...ds.map(b => d(b) * (1 + b.ecc))),
        dRef = d(me),
        D = (dFar - 0.1 * dRef) / 0.9;
      sunLight.decay = 1;
      sunLight.distance = D;
      sunLight.userData.fm = 1 - dRef / D;
      sunLight.intensity = base / sunLight.userData.fm;
    }
    /*LOD-BEGIN*/
    /* LOD сфер по экранному размеру: дальние планеты, атмосферы, облака и спутники рисуются сферой с меньшим числом сегментов (геометрии общие). Earth не трогаем в режиме прогулки (там свой LOD). */
    const LOD_T1 = 40,
      LOD_T2 = 12,
      LOD_K = 1.25,
      _lodCache = new Map(),
      _lodW = new TH.Vector3();
    function lodWant(px, cur) {
      const w = px >= LOD_T1 ? 0 : px >= LOD_T2 ? 1 : 2;
      if (w > cur && px > (cur === 0 ? LOD_T1 : LOD_T2) / LOD_K) return cur;
      if (w < cur && px < (cur === 2 ? LOD_T2 : LOD_T1) * LOD_K) return cur;
      return w;
    }
    function lodSwap(mesh, want) {
      const u = mesh.userData;
      let lb = u.lodBase;
      if (!lb) {
        const g = mesh.geometry,
          p = g && g.type === 'SphereGeometry' && g.parameters;
        if (!p) {
          u.lodBase = lb = { skip: true };
        } else
          u.lodBase = lb = {
            skip: false,
            geo0: g,
            r: p.radius,
            w: p.widthSegments,
            h: p.heightSegments,
            cur: 0,
          };
      }
      if (lb.skip || lb.cur === want) return false;
      let g;
      if (want === 0) g = lb.geo0;
      else {
        const f = want === 1 ? 2 : 4,
          w = Math.max(8, Math.round(lb.w / f)),
          h = Math.max(6, Math.round(lb.h / f)),
          key = lb.r.toFixed(6) + '|' + w + '|' + h;
        g = _lodCache.get(key);
        if (!g) {
          g = new TH.SphereGeometry(lb.r, w, h);
          _lodCache.set(key, g);
        }
      }
      mesh.geometry = g;
      lb.cur = want;
      return true;
    }
    /* Вернуть тело (и его облака/атмосферу) к полной детализации — нужно при входе в режим прогулки: там Землю дальше ведёт её собственный LOD, а «грубой» геометрией он считает ту, что стоит в этот момент. */
  function lodForceFull(b) {
    for (const m of [b.m, b.cloudsMesh, b.vatm, b.atm]) if (m) lodSwap(m, 0);
    shDirty = true;
  }
  function lodPx(pos, R) {
      const d = Math.max(1e-9, pos.distanceTo(C.position));
      return (R * innerHeight) / (2 * Math.tan((C.fov * PI) / 360) * d);
    }
    function lodUpdate() {
      let ch = false;
      for (const b of bodies) {
        if (!b.m || b.isRoot || b.isSun) continue;
        if (b === earthB && fpsState !== 'off') continue;
        const px = lodPx(b.g.position, b.m.matrixWorld.getMaxScaleOnAxis()),
          u = b.m.userData.lodBase,
          w = lodWant(px, u && !u.skip ? u.cur : 0);
        ch = lodSwap(b.m, w) || ch;
        if (b.cloudsMesh) lodSwap(b.cloudsMesh, w);
        if (b.vatm) lodSwap(b.vatm, w);
        if (b.atm) lodSwap(b.atm, w);
        for (const p of b.mo) {
          const mm = p.children[0];
          if (!mm) continue;
          mm.getWorldPosition(_lodW);
          const mu = mm.userData.lodBase,
            mw = lodWant(lodPx(_lodW, mm.matrixWorld.getMaxScaleOnAxis()), mu && !mu.skip ? mu.cur : 0);
          ch = lodSwap(mm, mw) || ch;
        }
      }
      if (ch) shDirty = true;
    }
    /*LOD-END*/
    function apply() {
      shDirty = true;
      let sunScale;
      if (real) {
        sunScale = SUN_REAL_KM / KM_PER_UNIT;
        sunLightSetup(LIGHT_BASE_SUN * LIGHT_MUL_REAL);
        sunLight.castShadow = false;
        ambLight.intensity = LIGHT_BASE_AMB * LIGHT_MUL_REAL;
      } else {
        sunScale = 8;
        sunLightSetup(2.6 * SIM_LIGHT_MUL);
        sunLight.castShadow = true;
        ambLight.intensity = 0.4 * SIM_LIGHT_MUL;
      }
      sunBaseScale = sunScale;
      sunM.scale.setScalar(sunScale);
      if (real) {
        glow.scale.set(sunScale * 12, sunScale * 12, 1);
        gl2.scale.set(sunScale * 35, sunScale * 35, 1);
        gl3.scale.set(sunScale * 70, sunScale * 70, 1);
        gl4.scale.set(sunScale * 140, sunScale * 140, 1);
        gl5.scale.set(sunScale * 280, sunScale * 280, 1);
        glow.material.opacity = 1.0;
        gl2.material.opacity = 0.95;
        gl3.material.opacity = 0.55;
        gl4.material.opacity = 0.32;
        gl5.material.opacity = 0.18;
      } else {
        glow.scale.set(sunScale * 7, sunScale * 7, 1);
        gl2.scale.set(sunScale * 21, sunScale * 21, 1);
        gl3.scale.set(sunScale * 45, sunScale * 45, 1);
        gl4.scale.set(sunScale * 90, sunScale * 90, 1);
        gl5.scale.set(sunScale * 160, sunScale * 160, 1);
        glow.material.opacity = 0.9;
        gl2.material.opacity = 0.55;
        gl3.material.opacity = 0.3;
        gl4.material.opacity = 0.18;
        gl5.material.opacity = 0.1;
      }
      glFar.scale.set(sunScale * 30, sunScale * 30, 1);
      glFar.material.opacity = 0.4;
      for (const b of bodies) {
        if (b.isRoot || b.isSun) continue;
        b.a = real ? b.au * AU_TO_UNITS : b.baseA0;
        const e = b.ecc || 0;
        const segs = real ? 4096 : 512;
        const pts = [];
        for (let i = 0; i <= segs; i++) {
          const M = (i / segs) * 2 * PI;
          let E = M;
          for (let k = 0; k < 5; k++) E = M + e * Math.sin(E);
          pts.push(
            new TH.Vector3(b.a * (Math.cos(E) - e), 0, -b.a * Math.sqrt(Math.max(0, 1 - e * e)) * Math.sin(E))
          );
        }
        b.ln.geometry.dispose();
        b.ln.geometry = new TH.BufferGeometry().setFromPoints(pts);
        b.ln.scale.set(1, 1, 1);
        b.ln.material.depthWrite = false;
        b.ln.renderOrder = -1;
        b.ln.material.opacity = real ? 0.22 : 0.32;
        if (real) {
          const f = b.kmR / KM_PER_UNIT;
          setPl(b, f);
          if (b.atm) b.atm.scale.setScalar(f);
          if (b.cloudsMesh) b.cloudsMesh.scale.setScalar(f * 1.006);
          if (b.vatm) b.vatm.scale.setScalar(f * 1.015);
          if (b.ringMesh) b.ringMesh.scale.setScalar(f);
          b.mo.forEach(p => {
            const ud = p.userData;
            const dist = (ud.mdist || 384400) / KM_PER_UNIT;
            p.children[0].scale.setScalar((ud.mkm || 1737) / KM_PER_UNIT);
            p.children[0].position.x = dist;
            if (ud.orbit) {
              const pts = [];
              for (let i = 0; i <= 128; i++) {
                const t = (i / 128) * 2 * PI;
                pts.push(new TH.Vector3(Math.cos(t) * dist, 0, Math.sin(t) * dist));
              }
              ud.orbit.geometry.dispose();
              ud.orbit.geometry = new TH.BufferGeometry().setFromPoints(pts);
            }
          });
          b.r = f;
        } else {
          setPl(b, b.baseR0);
          if (b.atm) b.atm.scale.setScalar(b.baseR0);
          if (b.cloudsMesh) b.cloudsMesh.scale.setScalar(b.baseR0 * 1.012);
          if (b.vatm) b.vatm.scale.setScalar(b.baseR0 * 1.02);
          if (b.ringMesh) b.ringMesh.scale.setScalar(b.baseR0);
          b.mo.forEach(p => {
            const ud = p.userData;
            p.children[0].scale.setScalar(ud.mr);
            p.children[0].position.x = ud.d;
            if (ud.orbit) {
              const pts = [];
              for (let i = 0; i <= 128; i++) {
                const t = (i / 128) * 2 * PI;
                pts.push(new TH.Vector3(Math.cos(t) * ud.d, 0, Math.sin(t) * ud.d));
              }
              ud.orbit.geometry.dispose();
              ud.orbit.geometry = new TH.BufferGeometry().setFromPoints(pts);
            }
          });
          b.r = b.baseR0;
        }
        b.baseMScale = b.m.scale.clone();
      }
      bodies[0].d = real ? AU_TO_UNITS * 2.5 : ov;
      bodies[0].r = real ? sunScale : 8;
      bodies[1].r = real ? sunScale : 8;
      fill();
    }
    const labels = [];
    function clearLabels() {
      labels.forEach(l => l.el.remove());
      labels.length = 0;
    }
    function makeLabel(text, isMoon) {
      const el = document.createElement('div');
      el.className = 'label' + (isMoon ? ' moon' : '');
      el.textContent = text;
      document.body.appendChild(el);
      return el;
    }
    const _labelRay = new TH.Raycaster();
    const _labelDir = new TH.Vector3();
    const _labelOrigin = new TH.Vector3();
    let _occluders = null;
    function getOccluders() {
      if (_occluders) return _occluders;
      _occluders = [];
      for (const b of bodies) {
        if (b.isSun && b.g) _occluders.push(b.g);
        if (b.m) _occluders.push(b.m);
        if (b.mo) for (const p of b.mo) if (p.children[0]) _occluders.push(p.children[0]);
      }
      return _occluders;
    }
    const _ocC = new TH.Vector3();
    function isOccluded(obj) {
      /* Аналитический луч–сфера по ограничивающим сферам тел: раньше был Raycaster по мешам (у Земли в режиме неба ~590 тыс. треугольников → до ~20 мс на подпись) */
      obj.getWorldPosition(_labelOrigin);
      _labelDir.subVectors(_labelOrigin, C.position);
      const D = _labelDir.length();
      if (D < 1e-9) return false;
      _labelDir.multiplyScalar(1 / D);
      for (const m of getOccluders()) {
        if (m === obj || m.parent === obj || !m.geometry) continue;
        const bs =
          m.geometry.boundingSphere || (m.geometry.computeBoundingSphere(), m.geometry.boundingSphere);
        if (!bs) continue;
        _ocC.copy(bs.center).applyMatrix4(m.matrixWorld).sub(C.position);
        const r = bs.radius * m.matrixWorld.getMaxScaleOnAxis(),
          tca = _ocC.dot(_labelDir);
        if (tca <= 0) continue;
        const d2 = _ocC.lengthSq() - tca * tca;
        if (d2 >= r * r) continue;
        if (tca - Math.sqrt(r * r - d2) < D * 0.97) return true;
      }
      return false;
    }
    function updateLabels() {
      if (fpsState === 'stand' || fpsState === 'fly') return;
      const v = new TH.Vector3();
      const isCurrentTarget = l => {
        if (!cur || cur.isRoot) return false;
        if (cur.isMoon) return l.obj === cur.g;
        return l.obj === cur.g;
      };
      const doOne = (l, visible) => {
        if (!visible || isCurrentTarget(l)) {
          l.el.classList.remove('show');
          return;
        }
        l.obj.getWorldPosition(v);
        v.project(C);
        const x = (v.x * 0.5 + 0.5) * innerWidth,
          y = (-v.y * 0.5 + 0.5) * innerHeight;
        if (
          v.z > 1 ||
          !isFinite(x) ||
          !isFinite(y) ||
          x < -24 ||
          x > innerWidth + 24 ||
          y < -12 ||
          y > innerHeight + 12
        ) {
          l.el.classList.remove('show');
          return;
        }
        if (isOccluded(l.obj)) {
          l.el.classList.remove('show');
          return;
        }
        l.el.style.left = x + 'px';
        l.el.style.top = y + 'px';
        l.el.classList.add('show');
      };
      labels.forEach(l => doOne(l, !(l.isMoon && !moonLabelsVisible)));
      planetLabels.forEach(l => doOne(l, planetLabelsVisible));
    }
    let infoCollapsed = true;
    function showInfo(b) {
      const el = $('#info');
      if (!infoPanelVisible) {
        el.classList.remove('show');
        return;
      }
      if (b.isMoon) {
        const moonFacts = {
          'Луна':
            'Единственный естественный спутник Земли. Имя — общеславянское и индоевропейское. Вызывает приливы; поверхность покрыта кратерами и «морями» из застывшей лавы. Среднее расстояние 384 400 км. Первые люди ступили на неё в 1969 году (Аполлон-11).',
          'Фобос':
            'Ближайший спутник Марса, назван в честь сына Ареса (Страх). Имеет неправильную форму и покрыт кратерами; орбита постепенно снижается — через десятки миллионов лет упадёт или разрушится.',
          'Деймос':
            'Внешний спутник Марса, назван в честь другого сына Ареса (Ужас). Маленький и слабо отражающий; вероятно, захваченный астероид. Открыт Асафом Холлом в 1877 году вместе с Фобосом.',
          'Ио': 'Самый вулканически активный объект Солнечной системы. Назван в честь возлюбленной Зевса. Поверхность непрерывно обновляется потоками серы. Открыт Галилеем в 1610 году.',
          'Европа':
            'Ледяная кора скрывает подповерхностный океан жидкой воды — один из главных кандидатов на поиск жизни. Названа в честь финикийской царевны, возлюбленной Зевса. Открыта Галилеем в 1610 году.',
          'Ганимед':
            'Крупнейший спутник в Солнечной системе (больше Меркурия). Имеет собственное магнитное поле. Назван в честь виночерпия богов. Открыт Галилеем в 1610 году.',
          'Каллисто':
            'Самый кратерированный спутник Юпитера. Древняя поверхность почти не обновлялась. Названа в честь нимфы, возлюбленной Зевса. Открыта Галилеем в 1610 году.',
          'Титан':
            'Единственный спутник с плотной атмосферой. Озёра и реки из жидкого метана и этана. Назван в честь титанов греческой мифологии. Открыт Христианом Гюйгенсом в 1655 году.',
          'Рея':
            'Второй по размеру спутник Сатурна. Ледяная поверхность с яркими кратерами. Названа в честь титаниды, матери олимпийских богов. Открыта Джованни Кассини в 1672 году.',
          'Диона':
            'Ледяной спутник Сатурна с системой ярких разломов («полосы»). Названа в честь титаниды. Открыта Кассини в 1684 году.',
          'Титания':
            'Крупнейший спутник Урана. Имеет каньоны и следы древней тектоники. Названа в честь царицы фей из «Сна в летнюю ночь» Шекспира. Открыта Уильямом Гершелем в 1787 году.',
          'Оберон':
            'Внешний крупный спутник Урана. Покрыт кратерами и тёмным материалом. Назван в честь короля фей (Шекспир). Открыт Гершелем в 1787 году.',
          'Тритон':
            'Крупнейший спутник Нептуна. Ретроградная орбита; активные гейзеры азота. Назван в честь сына Посейдона. Открыт Уильямом Ласселлом в 1846 году, всего через 17 дней после открытия самого Нептуна.',
          'Харон':
            'Крупнейший спутник Плутона; образует с ним почти двойную систему (центр масс вне Плутона). Назван в честь перевозчика душ в подземном мире. Открыт Джеймсом Кристи в 1978 году.',
          'Никта':
            'Маленький неправильный спутник Плутона. Названа в честь греческой богини ночи. Открыта в 2005 году телескопом «Хаббл».',
          'Гидра':
            'Внешний маленький спутник Плутона. Названа в честь мифической многоголовой гидры. Открыта в 2005 году вместе с Никтой.',
          'Намака':
            'Внутренний спутник Хаумеа. Названа в честь дочери гавайской богини Хаумеа. Открыт в 2005 году.',
          'Хииака':
            'Внешний и более крупный спутник Хаумеа. Назван в честь сестры Намаки. Открыт в 2005 году.',
          'Дисномия':
            'Единственный известный спутник Эриды. Названа в честь дочери богини раздора Эриды (греч. «беззаконие»). Открыта в 2005 году.',
        };
        const fact = moonFacts[b.n] || 'Естественный спутник.';
        const KM = TR('км');
        el.innerHTML = `<div class="info-head"><h3>${b.n}</h3><span class="info-tri">▼</span></div><div class="info-body"><p>${TR(fact)}</p><p>${TR('Спутник планеты:')} ${TR(b.parent.n)}</p><div class="row"><span class="k">Радиус</span><span>${b.ud.mkm.toLocaleString(LOC)} ${KM}</span></div><div class="row"><span class="k">Расстояние до планеты</span><span>${b.ud.mdist.toLocaleString(LOC)} ${KM}</span></div></div>`;
        el.classList.toggle('collapsed', infoCollapsed);
        el.classList.add('show');
        el.querySelector('.info-head').onclick = () => {
          infoCollapsed = !infoCollapsed;
          el.classList.toggle('collapsed', infoCollapsed);
        };
        return;
      }
      if (b.isRoot) {
        el.classList.remove('show');
        return;
      }
      let body = '';
      if (b.isSun) {
        body = `<p>${TR(b.info || '')}</p><div class="row"><span class="k">Радиус</span><span>696 340 км</span></div><div class="row"><span class="k">Масса</span><span>1,989×10³⁰ кг</span></div><div class="row"><span class="k">Темп. поверхности</span><span>≈ 5500 °C</span></div>`;
      } else {
        body = `<p>${TR(b.info || '')}</p><div class="row"><span class="k">Радиус</span><span>${b.kmR.toLocaleString(LOC)} ${TR('км')}</span></div><div class="row"><span class="k">Орбита</span><span>${b.au} ${TR('а.е.')}</span></div><div class="row"><span class="k">Период</span><span>${b.T} ${TR('лет')}</span></div><div class="row"><span class="k">Эксцентриситет</span><span>${b.ecc}</span></div><div class="row"><span class="k">Свет Солнца</span><span>${(v => (v >= 100 ? Math.round(v) : v >= 1 ? v.toFixed(1) : v.toPrecision(2)))(100 / (b.au * b.au))}${TR('% от земного')}</span></div><div class="row"><span class="k">Наклон оси</span><span>${b.tilt == null ? '—' : b.tilt + '°'}</span></div>`;
        if (b.mo && b.mo.length)
          body += `<div class="row"><span class="k">Спутники</span><span>${b.mo.map(p => TR(p.userData.name)).join(', ')}</span></div>`;
      }
      el.innerHTML = `<div class="info-head"><h3>${b.n}</h3><span class="info-tri">▼</span></div><div class="info-body">${body}</div>`;
      el.classList.toggle('collapsed', infoCollapsed);
      el.classList.add('show');
      el.querySelector('.info-head').onclick = () => {
        infoCollapsed = !infoCollapsed;
        el.classList.toggle('collapsed', infoCollapsed);
      };
    }
    const bar = $('#bar');
    const fpsEl = document.createElement('div');
    fpsEl.id = 'fps';
    fpsEl.textContent = '— FPS · ' + Q_LABEL;
    ($('#topRight') || document.body).append(fpsEl);
    let _fFrames = 0,
      _fLast = performance.now(),
      _wallLast = Date.now();
    const setBtn = document.createElement('button');
    setBtn.id = 'setBtn';
    setBtn.title = 'Настройки';
    setBtn.innerHTML =
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
    bar.append(setBtn);
    const setMenu = document.createElement('div');
    setMenu.id = 'settingsMenu';
    setMenu.innerHTML =
      '<div class="section"><div class="section-label">Скорость</div><div class="seg" id="speedSeg">' +
      '<button data-sp="6" class="on" title="Реальное время">Реальная</button>' +
      '<button data-sp="1" title="1 секунда = 1 час">1 ч/с</button>' +
      '<button data-sp="2" title="1 секунда = 1 сутки">1 д/с</button>' +
      '<button data-sp="3" title="1 секунда = 1 месяц">1 мес/с</button>' +
      '<button data-sp="4" title="1 секунда = 1 год">1 год/с</button>' +
      '</div><div class="seg" id="fpsSpeedSeg" style="display:none"><button data-sp="0" title="Пауза">⏸</button><button data-sp="6" title="Реальное время">Реальная</button><button data-sp="5" title="1 секунда = 1 минута">1 мин/с</button><button data-sp="1" title="1 секунда = 1 час">1 ч/с</button></div></div>' +
      '<div class="section"><div class="section-label">Режим</div><div class="toggle" id="modeToggle"><div class="thumb"></div><div class="opt" data-mode="0">Упрощённый</div><div class="opt" data-mode="1">Реализм</div></div></div>' +
      '<div class="section"><div class="section-label">Камера</div><div class="toggle real" id="camToggle"><div class="thumb"></div><div class="opt" data-cam="0">Мировая</div><div class="opt" data-cam="1">Планетарная</div></div></div>' +
      '<div class="section"><div class="section-label">Язык</div><div class="seg" id="langSeg"><button data-lang="ru">Рус</button><button data-lang="uk">Укр</button><button data-lang="en">Eng</button></div></div>' +
      '<div class="divider"></div>' +
      '<div class="section"><div class="row"><span>Линии орбит</span><label class="sw"><input type="checkbox" id="orbitsChk" checked><span></span></label></div><div class="row"><span>Подписи планет</span><label class="sw"><input type="checkbox" id="planetLabelsChk"><span></span></label></div><div class="row"><span>Подписи спутников</span><label class="sw"><input type="checkbox" id="moonLabelsChk" checked><span></span></label></div><div class="row"><span>Панель информации</span><label class="sw"><input type="checkbox" id="infoChk" checked><span></span></label></div></div>';
    document.body.append(setMenu);
    setMenu.querySelectorAll('#langSeg button').forEach(b => {
      b.classList.toggle('on', b.dataset.lang === SW_LANG);
      b.onclick = e => {
        e.stopPropagation();
        try {
          localStorage.setItem('sw-lang', b.dataset.lang);
        } catch (err) {}
        location.reload();
      };
    });

    if (!window.SW_EPH) throw new Error('js/ephemeris.js не загрузился');
    const {
      DEG,
      EPS0,
      PLE,
      PLE2,
      PLE2B,
      earthOrbitAt,
      earthSpinAngle,
      eph,
      helioEcl,
      planetGeoEcl,
      moonGeoEcl,
    } = window.SW_EPH;
    const latLonToAnchor = (la, lo) =>
      new TH.Vector3(Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo));
    const anchorToLatLon = p => [Math.asin(Math.max(-1, Math.min(1, p.y))), Math.atan2(-p.z, p.x)];
    const ecl2w = v => new TH.Vector3(-v[1], v[2], -v[0]);
    EPH = PLE;
    for (const b of bodies) {
      const q = EPH[b.k];
      if (q && b !== earthB) b.ecc = q[2];
    }
    earthB.absM = function (t) {
      const o = earthOrbitAt(t);
      this.rotY = o.rotY;
      this.ln.rotation.y = o.rotY;
      return o.M;
    };
    earthB.tilt = EPS0;
    earthB.tg.rotation.z = EPS0 * DEG;
    if (earthB.atm) earthB.atm.rotation.z = EPS0 * DEG;
    function fpsSetObserver(la, lo) {
      if (
        !isFinite(la) ||
        !isFinite(lo) ||
        (fpsState !== 'select' && fpsState !== 'stand' && fpsState !== 'fly')
      )
        return;
      la = Math.max(-90, Math.min(90, la));
      const p = latLonToAnchor(la * DEG, lo * DEG);
      if (fpsState === 'select') {
        fpsAnchorLocal = p;
        fpsYaw = 0;
        fpsPitch = FPS_PITCH0;
        fpsFlyFromPos.copy(C.position);
        fpsFlyFromQuat.copy(C.quaternion);
        fpsFlyStart = performance.now();
        fpsState = 'fly';
        document.body.classList.remove('fps-select');
        document.body.classList.add('fps-stand');
      } else fpsAnchorLocal = p;
    }
    const nowTm = () => Date.now() / 86400000 + 2440587.5 - 2451545;
    const skySec = document.createElement('div');
    skySec.className = 'section';
    skySec.id = 'skySec';
    skySec.style.display = 'none';
    skySec.innerHTML =
      '<div class="section-label">Место и время (время устройства)</div><div class="sky-grid"><input id="skyLat" class="sky-in" type="number" step="0.01" min="-90" max="90" placeholder="Широта °"><input id="skyLon" class="sky-in" type="number" step="0.01" min="-180" max="180" placeholder="Долгота °"></div><input id="skyDt" class="sky-in" type="datetime-local" step="1" style="margin-top:6px"><button id="skyNow" class="sky-btn" type="button">Сейчас</button><div class="row" style="margin-top:8px"><span>Атмосфера</span><label class="sw"><input type="checkbox" id="atmChk" checked><span></span></label></div>';
    let atmOn = true,
      moonOn = true;
    skySec.querySelector('#atmChk').onchange = e => {
      atmOn = e.target.checked;
    };
    setMenu.insertBefore(skySec, setMenu.querySelector('.divider'));
    const inLat = skySec.querySelector('#skyLat'),
      inLon = skySec.querySelector('#skyLon'),
      inDt = skySec.querySelector('#skyDt'),
      btnNow = skySec.querySelector('#skyNow');
    const timeSec = document.createElement('div');
    timeSec.className = 'section';
    timeSec.innerHTML = '<div class="section-label">Дата и время (время устройства)</div>';
    timeSec.append(inDt, btnNow);
    const dtNote = document.createElement('div');
    dtNote.style.cssText = 'font-size:11px;opacity:.7;margin-top:6px;display:none';
    dtNote.textContent = TR('Вне 1800–2050 гг. положения планет приблизительные');
    timeSec.append(dtNote);
    setMenu.insertBefore(timeSec, setMenu.querySelector('#modeToggle').closest('.section'));
    skySec.querySelector('.section-label').textContent = 'Место';
    const skyHud = document.createElement('div');
    skyHud.id = 'skyHud';
    skyHud.style.display = 'none';
    document.body.append(skyHud);
    const onLL = () => {
      if (inLat.value !== '' && inLon.value !== '')
        fpsSetObserver(parseFloat(inLat.value), parseFloat(inLon.value));
    };
    inLat.onchange = onLL;
    inLon.onchange = onLL;
    let dtTimer = 0,
      dtPending = false;
    const dtCommit = () => {
      const v = inDt.value;
      if (!v) return;
      const t = new Date(v).getTime();
      if (isFinite(t)) tm = t / 86400000 + 2440587.5 - 2451545;
    };
    /* применяем и по input (с задержкой), и по change: при выборе в календаре и клике вне меню change может не прийти */
    inDt.addEventListener('input', () => {
      dtPending = true;
      clearTimeout(dtTimer);
      dtTimer = setTimeout(() => {
        dtCommit();
        dtPending = false;
      }, 400);
    });
    inDt.onchange = () => {
      clearTimeout(dtTimer);
      dtCommit();
      dtPending = false;
    };
    btnNow.onclick = e => {
      e.stopPropagation();
      clearTimeout(dtTimer);
      dtPending = false;
      tm = nowTm();
    };
    let _skyT = 0;
    function skySync() {
      if (fpsState === 'off') skyHud.style.display = 'none';
      const now = performance.now();
      if (now - _skyT < 250) return;
      _skyT = now;
      const d = new Date((tm + 2451545 - 2440587.5) * 86400000);
      let la = '',
        lo = '',
        txt = '';
      if (fpsAnchorLocal) {
        const ll = anchorToLatLon(fpsAnchorLocal);
        la = (ll[0] / DEG).toFixed(3);
        lo = (ll[1] / DEG).toFixed(3);
        txt =
          ' · ' +
          Math.abs(la) +
          '°' +
          (la >= 0 ? ' ' + TR('с.ш.') + ' ' : ' ' + TR('ю.ш.') + ' ') +
          Math.abs(lo) +
          '°' +
          (lo >= 0 ? ' ' + TR('в.д.') : ' ' + TR('з.д.'));
      }
      const ae = document.activeElement;
      if (ae !== inLat) inLat.value = la;
      if (ae !== inLon) inLon.value = lo;
      if (ae !== inDt && !dtPending) {
        const v = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
        if (inDt.value !== v) inDt.value = v;
      }
      {
        const y = d.getUTCFullYear(),
          off = tm - nowTm(),
          ao = Math.abs(off);
        let s;
        if (ao < 5 / 86400) s = TR('Текущее время');
        else {
          const dp = v => {
            const r = v.toFixed(1);
            return LOC === 'en' ? r : r.replace('.', ',');
          };
          const f =
            ao < 1
              ? ao * 24 < 1
                ? Math.round(ao * 1440) + ' ' + TR('мин')
                : dp(ao * 24) + ' ' + TR('ч')
              : ao < 365.25
                ? Math.round(ao) + ' ' + TR('дн.')
                : dp(ao / 365.25) + ' ' + TR('г.');
          s = TR('Своя дата:') + ' ' + (off > 0 ? '+' : '−') + f + ' ' + TR('от текущего времени');
        }
        if (y < 1800 || y > 2050) s += ' · ' + TR('вне 1800–2050 гг. положения планет приблизительные');
        if (dtNote.textContent !== s) dtNote.textContent = s;
        dtNote.style.display = '';
      }
      skyHud.textContent =
        d.toLocaleString(LOC === 'en' ? 'en-GB' : LOC === 'uk' ? 'uk-UA' : 'ru-RU', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + txt;
      skyHud.style.display = fpsState === 'stand' ? '' : 'none';
    }

    const PROF = (() => {
      const P = {
        on: false,
        off: {
          sky: false,
          dome: false,
          msw: false,
          clouds: false,
          vatm: false,
          sun: false,
          shadows: false,
          ground: false,
        },
      };
      const gl = renderer.getContext(),
        ext = gl.getExtension('EXT_disjoint_timer_query_webgl2'),
        dbg = gl.getExtension('WEBGL_debug_renderer_info'),
        gpuName = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '?';
      const dts = [],
        spikes = [],
        pend = [],
        bs = new TH.Vector2();
      let last = 0,
        t0 = 0,
        tR0 = 0,
        tR1 = 0,
        q = null,
        tShow = 0,
        medDt = 16.7,
        lastHeap = 0,
        info = { c: 0, t: 0, p: 0, l: 0, g: 0, x: 0, pr: 0 },
        ms = { l: 0, r: 0, p: 0, g: 0, gn: 0, n: 0, a: 0, b: 0, c: 0 },
        tm0 = 0;
      const el = document.createElement('div');
      el.id = 'prof';
      el.style.display = 'none';
      const bar = document.createElement('div');
      bar.className = 'pbar';
      const pre = document.createElement('pre');
      el.append(bar, pre);
      document.body.append(el);
      const mk = (label, fn) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        b.onclick = e => {
          e.stopPropagation();
          fn(b);
        };
        bar.append(b);
        return b;
      };
      const closeB = mk('✕', () => {
        P.set(false);
        const c = document.getElementById('profChk');
        if (c) c.checked = false;
      });
      closeB.title = 'Скрыть профайлер';
      const rest = {
        sky: () => {},
        dome: () => {},
        msw: () => {
          if (skySphere) skySphere.visible = true;
        },
        clouds: () => {
          if (earthB.cloudsMesh) earthB.cloudsMesh.visible = true;
        },
        vatm: () => {
          if (earthB.vatm) earthB.vatm.visible = true;
        },
        sun: () => {
          [glow, gl2, gl3, gl4, gl5, glFar].forEach(o => {
            if (o) o.visible = true;
          });
        },
        shadows: () => {},
        ground: () => {},
      };
      const chips = {};
      [
        ['sky', 'Небо/звёзды'],
        ['dome', 'Купол'],
        ['msw', 'Млечный Путь'],
        ['clouds', 'Облака'],
        ['vatm', 'Атм.Земли'],
        ['sun', 'Свет Солнца'],
        ['shadows', 'Тени'],
        ['ground', 'Фейк-земля'],
      ].forEach(([k, t]) => {
        chips[k] = mk(t, b => {
          P.off[k] = !P.off[k];
          b.classList.toggle('off', P.off[k]);
          if (!P.off[k]) rest[k]();
        });
      });
      const dprs = [
        ...new Set([0.75, 1, 1.25, 1.5, 2, 2.5, 3, Math.round((devicePixelRatio || 1) * 100) / 100]),
      ].sort((a, b) => a - b);
      const dprB = mk('Разр.', b => {
        let i = dprs.findIndex(v => Math.abs(v - renderer.getPixelRatio()) < 0.01);
        i = (i + 1) % dprs.length;
        renderer.setPixelRatio(dprs[i]);
        renderer.setSize(innerWidth, innerHeight);
        b.textContent = 'Разр. ×' + dprs[i];
      });
      dprB.textContent = 'Разр. ×' + Math.round(renderer.getPixelRatio() * 100) / 100;
      mk('Сброс', () => {
        dts.length = 0;
        spikes.length = 0;
        ms.l = ms.r = ms.p = ms.g = ms.gn = ms.n = ms.a = ms.b = ms.c = 0;
      });
      const cpB = mk('Копировать отчёт', () => {
        const t = reportText();
        const done = () => {
          cpB.textContent = 'Скопировано ✓';
          setTimeout(() => (cpB.textContent = 'Копировать отчёт'), 1500);
        };
        if (navigator.clipboard && window.isSecureContext)
          navigator.clipboard.writeText(t).then(done, () => fb(t, done));
        else fb(t, done);
      });
      function fb(t, done) {
        const ta = document.createElement('textarea');
        ta.value = t;
        ta.style.cssText = 'position:fixed;left:0;top:0;opacity:0';
        document.body.append(ta);
        ta.select();
        try {
          document.execCommand('copy');
          done();
        } catch (e) {
          prompt('Скопируй отчёт:', t);
        }
        ta.remove();
      }
      function poll() {
        for (let i = pend.length - 1; i >= 0; i--) {
          const x = pend[i];
          if (gl.getQueryParameter(x, gl.QUERY_RESULT_AVAILABLE)) {
            if (!gl.getParameter(ext.GPU_DISJOINT_EXT)) {
              const v = gl.getQueryParameter(x, gl.QUERY_RESULT) / 1e6;
              ms.g += v;
              ms.gn++;
              info.gpu = v;
            }
            gl.deleteQuery(x);
            pend.splice(i, 1);
          }
        }
      }
      function stats() {
        const d = dts.slice(-300),
          n = d.length;
        if (!n) return null;
        const a = d.reduce((x, y) => x + y, 0) / n,
          so = d.slice().sort((x, y) => x - y);
        return {
          n,
          fps: 1000 / a,
          low1: 1000 / so[Math.min(n - 1, Math.floor(0.99 * n))],
          max: so[n - 1],
          med: so[n >> 1],
          n33: d.filter(x => x > 33.4).length,
        };
      }
      function reportText() {
        const S = stats(),
          f = v => v.toFixed(1),
          n = Math.max(1, ms.n);
        bs.set(0, 0);
        renderer.getDrawingBufferSize(bs);
        const mem = performance.memory
          ? (performance.memory.usedJSHeapSize / 1048576).toFixed(0) + ' МБ'
          : 'n/a';
        let t =
          'FPS ' +
          (S ? f(S.fps) : '-') +
          ' (ср.)  1%-low ' +
          (S ? f(S.low1) : '-') +
          '  макс.кадр ' +
          (S ? f(S.max) + ' мс' : '-') +
          '  кадров>33мс: ' +
          (S ? S.n33 + '/' + S.n : '-') +
          '\n';
        t +=
          'CPU/кадр: логика ' +
          f(ms.l / n) +
          '  рендер(отправка) ' +
          f(ms.r / n) +
          '  пост ' +
          f(ms.p / n) +
          ' мс\n';
        t +=
          'пост по частям: подписи DOM ' +
          f(ms.a / n) +
          '  горизонт ' +
          f(ms.b / n) +
          '  небо(canvas+созвездия) ' +
          f(ms.c / n) +
          ' мс\n';
        t +=
          'GPU/кадр: ' +
          (ext ? (ms.gn ? f(ms.g / ms.gn) + ' мс' : 'ждём…') : 'n/a (нет EXT_disjoint_timer_query)') +
          '\n';
        t +=
          'Вызовы ' +
          info.c +
          '  Треуг. ' +
          info.t +
          '  Точки ' +
          info.p +
          '  Линии ' +
          info.l +
          '\nГеометрий ' +
          info.g +
          '  Текстур ' +
          info.x +
          '  Программ ' +
          info.pr +
          '\n';
        t +=
          'Буфер ' +
          bs.x +
          '×' +
          bs.y +
          ' (dpr ' +
          renderer.getPixelRatio().toFixed(2) +
          ') Q=' +
          Q_LABEL +
          '  тени ' +
          (renderer.shadowMap.enabled
            ? SHADOW_CACHE
              ? 'кэш (обн. ' + shUpdN + ')'
              : renderer.shadowMap.autoUpdate
                ? 'вкл'
                : 'заморожены'
            : 'выкл') +
          ' ' +
          Q.shadowSize +
          '\n';
        t += 'JS heap ' + mem + '  состояние ' + fpsState + '  real=' + real + '\n';
        t +=
          'A/B выкл: ' +
          (Object.keys(P.off)
            .filter(k => P.off[k])
            .join(', ') || '—') +
          '\n';
        t +=
          'Всплески (последние):\n' +
          (spikes.length
            ? spikes
                .slice(0, 8)
                .map(x => x)
                .join('\n')
            : '—') +
          '\n';
        t +=
          'GPU: ' +
          gpuName +
          '\nUA: ' +
          navigator.userAgent +
          '\nядра ' +
          navigator.hardwareConcurrency +
          ', RAM ' +
          (navigator.deviceMemory || '?') +
          ' ГБ, экран ' +
          screen.width +
          '×' +
          screen.height +
          ' dpr ' +
          devicePixelRatio;
        return t;
      }
      P.m = i => {
        if (!P.on) return;
        const t = performance.now();
        if (i === 1) ms.a += t - tm0;
        else if (i === 2) ms.b += t - tm0;
        tm0 = t;
      };
      P.begin = now => {
        if (!P.on) return;
        t0 = performance.now();
        if (last) dts.push(now - last);
        if (dts.length > 600) dts.shift();
        last = now;
      };
      P.r0 = () => {
        if (!P.on) return;
        if (P.off.msw && skySphere) skySphere.visible = false;
        if (P.off.clouds && earthB.cloudsMesh) earthB.cloudsMesh.visible = false;
        if (P.off.vatm && earthB.vatm) earthB.vatm.visible = false;
        if (P.off.sun)
          [glow, gl2, gl3, gl4, gl5, glFar].forEach(o => {
            if (o) o.visible = false;
          });
        tR0 = performance.now();
        if (ext && !q && pend.length < 6) {
          q = gl.createQuery();
          gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
        }
      };
      P.r1 = () => {
        if (!P.on) return;
        tR1 = performance.now();
        if (q) {
          gl.endQuery(ext.TIME_ELAPSED_EXT);
          pend.push(q);
          q = null;
        }
        const r = renderer.info;
        info.c = r.render.calls;
        info.t = r.render.triangles;
        info.p = r.render.points;
        info.l = r.render.lines;
        info.g = r.memory.geometries;
        info.x = r.memory.textures;
        info.pr = r.programs ? r.programs.length : 0;
      };
      P.end = () => {
        if (!P.on) return;
        const te = performance.now(),
          L = tR0 - t0,
          R = tR1 - tR0,
          Ps = te - tR1;
        ms.c += te - tm0;
        ms.l += L;
        ms.r += R;
        ms.p += Ps;
        ms.n++;
        const dt = dts.length ? dts[dts.length - 1] : 0,
          heap = performance.memory ? performance.memory.usedJSHeapSize / 1048576 : 0;
        if (dts.length > 20 && (dt > 33.4 || dt > 2.2 * medDt)) {
          spikes.unshift(
            '+' +
              ((performance.now() / 1000) | 0) +
              'с  кадр ' +
              dt.toFixed(0) +
              'мс  (лог ' +
              L.toFixed(1) +
              ' рендер ' +
              R.toFixed(1) +
              ' пост ' +
              Ps.toFixed(1) +
              (info.gpu ? ' gpu ' + info.gpu.toFixed(1) : '') +
              ')  [' +
              fpsState +
              ']' +
              (heap && lastHeap - heap > 1.5 ? '  GC?' : '')
          );
          if (spikes.length > 40) spikes.pop();
        }
        lastHeap = heap;
        if (ext) poll();
        if (te - tShow > 500) {
          tShow = te;
          const S = stats();
          if (S) medDt = S.med;
          pre.textContent = reportText();
        }
      };
      P.set = v => {
        P.on = v;
        el.style.display = v ? '' : 'none';
        if (!v) {
          for (const k in P.off) {
            P.off[k] = false;
            chips[k].classList.remove('off');
            rest[k]();
          }
          last = 0;
        } else {
          last = 0;
          dts.length = 0;
          spikes.length = 0;
        }
      };
      return P;
    })();

    const SkyW = (() => {
      const { STAR_B64 = '', CON_B64 = '', CON_NAMES = [], CON_CNT = [] } = window.SW_DATA || {};
      if (!STAR_B64 || !CON_B64 || !CON_CNT.length)
        showError(
          '[data] data/stars.js или data/constellations.js не загрузились — звёзд и созвездий не будет'
        );
      if (!window.SW_SHADERS)
        showError('[shaders] shaders/shaders.js не загрузился — планеты и небо не отрисуются');
      const g = new TH.Group();
      g.visible = false;
      S.add(g);
      const u8 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
      const eps = ((earthB.tilt || 23.44) * PI) / 180,
        ce = Math.cos(eps),
        se = Math.sin(eps);
      const eqv = (x, y, z) => {
        const ye = y * ce + z * se,
          ze = -y * se + z * ce;
        return new TH.Vector3(-ye, ze, -x);
      };
      const eq2w = (ra, de, o, i, R) => {
        const v = eqv(Math.cos(de) * Math.cos(ra), Math.cos(de) * Math.sin(ra), Math.sin(de));
        o[i] = v.x * R;
        o[i + 1] = v.y * R;
        o[i + 2] = v.z * R;
      };
      const AG = [
        [-0.066988739, -0.872755766, -0.483538915],
        [0.492728466, -0.450346958, 0.744584633],
        [-0.867600811, -0.188374602, 0.460199784],
      ];
      const W = AG.map(r => eqv(r[0], r[1], r[2]));
      sky.quaternion.setFromRotationMatrix(new TH.Matrix4().makeBasis(W[0], W[2].clone().negate(), W[1]));
      const bv2rgb = bv => {
        const T = (4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62))) / 100;
        let r = T <= 66 ? 255 : 329.7 * Math.pow(T - 60, -0.1332),
          gg = T <= 66 ? 99.47 * Math.log(T) - 161.1 : 288.1 * Math.pow(T - 60, -0.0755),
          b = T >= 66 ? 255 : T <= 19 ? 0 : 138.5 * Math.log(T - 10) - 305.04;
        return [r, gg, b].map(v => 0.5 + (0.5 * Math.max(0, Math.min(255, v))) / 255);
      };
      const sb = u8(STAR_B64),
        n = (sb.length / 6) | 0,
        dv = new DataView(sb.buffer);
      const pos = new Float32Array(n * 3),
        col = new Float32Array(n * 3),
        mg = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const o = i * 6;
        eq2w(
          (dv.getUint16(o, true) / 65535) * 2 * PI,
          (((dv.getUint16(o + 2, true) / 65535) * 180 - 90) * PI) / 180,
          pos,
          i * 3,
          2900
        );
        mg[i] = sb[o + 4] / 25 - 2;
        col.set(bv2rgb(sb[o + 5] / 100 - 0.5), i * 3);
      }
      const geo = new TH.BufferGeometry();
      geo.setAttribute('position', new TH.BufferAttribute(pos, 3));
      geo.setAttribute('aCol', new TH.BufferAttribute(col, 3));
      geo.setAttribute('aMag', new TH.BufferAttribute(mg, 1));
      const mat = new TH.ShaderMaterial({
        uniforms: { uPx: { value: 1 }, uLim: { value: 7 } },
        vertexShader: SHD.starVert,
        fragmentShader: SHD.starFrag,
        transparent: true,
        blending: TH.AdditiveBlending,
        depthWrite: false,
      });
      const pts = new TH.Points(geo, mat);
      pts.frustumCulled = false;
      pts.renderOrder = -1;
      g.add(pts);
      const cb = u8(CON_B64),
        cdv = new DataView(cb.buffer),
        m = (cb.length / 8) | 0,
        lp = new Float32Array(m * 6);
      for (let i = 0; i < m; i++)
        for (let k = 0; k < 2; k++) {
          const o = i * 8 + k * 4;
          eq2w(
            (cdv.getUint16(o, true) / 65535) * 2 * PI,
            (((cdv.getUint16(o + 2, true) / 65535) * 180 - 90) * PI) / 180,
            lp,
            i * 6 + k * 3,
            2890
          );
        }
      const lg = new TH.BufferGeometry();
      lg.setAttribute('position', new TH.BufferAttribute(lp, 3));
      const lines = new TH.LineSegments(
        lg,
        new TH.LineBasicMaterial({ color: 0x4f86d6, transparent: true, opacity: 0.4, depthWrite: false })
      );
      lines.frustumCulled = false;
      lines.visible = false;
      lines.renderOrder = -1;
      g.add(lines);
      const CS = [];
      {
        let o = 0;
        for (let k = 0; k < CON_CNT.length; k++) {
          const c = new TH.Vector3();
          for (let q = 0; q < CON_CNT[k]; q++)
            c.add(new TH.Vector3(lp[(o + q) * 6], lp[(o + q) * 6 + 1], lp[(o + q) * 6 + 2]).normalize());
          c.normalize();
          CS.push({ o, n: CON_CNT[k], c, p: c.clone().multiplyScalar(2890) });
          o += CON_CNT[k];
        }
      }
      const SA = [],
        SB = [],
        SN = [],
        SC = [];
      for (let k = 0; k < CS.length; k++)
        for (let q = 0; q < CS[k].n; q++) {
          const i = CS[k].o + q,
            a = new TH.Vector3(lp[i * 6], lp[i * 6 + 1], lp[i * 6 + 2]).normalize(),
            b = new TH.Vector3(lp[i * 6 + 3], lp[i * 6 + 4], lp[i * 6 + 5]).normalize();
          SA.push(a);
          SB.push(b);
          SN.push(new TH.Vector3().crossVectors(a, b).normalize());
          SC.push(k);
        }
      const hg = new TH.BufferGeometry();
      hg.setAttribute('position', lg.getAttribute('position'));
      const hl = new TH.LineSegments(
        hg,
        new TH.LineBasicMaterial({ color: 0xa8e4ff, transparent: true, opacity: 0, depthWrite: false })
      );
      hl.frustumCulled = false;
      hl.visible = false;
      hl.renderOrder = -1;
      g.add(hl);
      const _v = new TH.Vector3(),
        _lv = new TH.Vector3();
      for (let i = 0; i < SA.length; i++) {
        const q = CS[SC[i]],
          c = q.c;
        q.r = Math.max(
          q.r || 0.05,
          Math.acos(Math.min(1, c.dot(SA[i]))),
          Math.acos(Math.min(1, c.dot(SB[i])))
        );
      }
      let want = -1,
        shown = -1,
        hA = 0,
        lastT = performance.now(),
        lastScan = 0;
      function scan() {
        C.getWorldDirection(_v);
        let best = -1,
          bs = 9,
          cs = 9;
        for (let k = 0; k < CS.length; k++) {
          const q = Math.acos(Math.max(-1, Math.min(1, CS[k].c.dot(_v)))) / CS[k].r;
          if (k === want) cs = q;
          if (q < 0.8 && q < bs) {
            bs = q;
            best = k;
          }
        }
        if (want >= 0 && cs < 0.95 && bs > cs * 0.6) best = want;
        want = best;
      }
      function fadeStep(now) {
        const dt = Math.min(0.1, (now - lastT) / 1000);
        lastT = now;
        if (shown !== want) {
          hA -= dt / 0.22;
          if (hA <= 0) {
            hA = 0;
            shown = want;
            if (shown >= 0) {
              hg.setDrawRange(CS[shown].o * 2, CS[shown].n * 2);
            }
          }
        } else if (shown >= 0 && hA < 1) hA = Math.min(1, hA + dt / 0.35);
        hl.visible = shown >= 0 && hA > 0.002;
        hl.material.opacity = hA;
      }
      const PK = ['mer', 'ven', 'mars', 'jup', 'sat', 'ura', 'nep'],
        PV1 = [-0.42, -4.4, -1.52, -9.4, -8.88, -7.19, -6.87],
        PCOL = [
          [0.85, 0.8, 0.75],
          [1, 0.97, 0.86],
          [1, 0.58, 0.42],
          [1, 0.93, 0.8],
          [1, 0.9, 0.66],
          [0.72, 0.95, 0.95],
          [0.62, 0.72, 1],
        ];
      const ppos = new Float32Array(21),
        pmag = new Float32Array(7),
        pcol = new Float32Array(21);
      PCOL.forEach((c, i) => pcol.set(c, i * 3));
      const pg = new TH.BufferGeometry();
      pg.setAttribute('position', new TH.BufferAttribute(ppos, 3));
      pg.setAttribute('aCol', new TH.BufferAttribute(pcol, 3));
      pg.setAttribute('aMag', new TH.BufferAttribute(pmag, 1));
      const ppts = new TH.Points(pg, mat);
      ppts.frustumCulled = false;
      ppts.renderOrder = -1;
      g.add(ppts);
      const moonR = 2880 * Math.tan((0.26 * PI) / 180);
      const moon = new TH.Mesh(
        new TH.SphereGeometry(moonR, 28, 18),
        new TH.ShaderMaterial({
          uniforms: { uSun: { value: new TH.Vector3(1, 0, 0) } },
          vertexShader: SHD.moonVert,
          fragmentShader: SHD.moonFrag,
        })
      );
      moon.frustumCulled = false;
      moon.renderOrder = -1;
      g.add(moon);
      const sm = (a, b, x) => {
        x = Math.max(0, Math.min(1, (x - a) / (b - a)));
        return x * x * (3 - 2 * x);
      };
      const LIMP = [
        [0, -4.6],
        [-3, -3.5],
        [-6, -0.5],
        [-9, 2.2],
        [-12, 4],
        [-15, 5.5],
        [-18, 7],
      ];
      const limMag = a => {
        if (a >= 0) return -4.6;
        if (a <= -18) return 7;
        for (let i = 0; i < LIMP.length - 1; i++) {
          const p = LIMP[i],
            q = LIMP[i + 1];
          if (a <= p[0] && a >= q[0]) return p[1] + ((q[1] - p[1]) * (a - p[0])) / (q[0] - p[0]);
        }
        return 7;
      };
      const dome = new TH.Mesh(
        new TH.SphereGeometry(2850, 32, 20),
        new TH.ShaderMaterial({
          uniforms: {
            uSun: { value: new TH.Vector3(1, 0, 0) },
            uUp: { value: new TH.Vector3(0, 1, 0) },
            uMoon: { value: new TH.Vector3(0, 1, 0) },
            uMK: { value: 0 },
            uK: { value: 0 },
          },
          vertexShader: SHD.posVert,
          fragmentShader: SHD.skyDomeFrag,
          side: TH.BackSide,
          depthTest: false,
          depthWrite: false,
          blending: TH.AdditiveBlending,
        })
      );
      dome.frustumCulled = false;
      dome.renderOrder = -1.9;
      dome.visible = false;
      g.add(dome);
      const _ep = new TH.Vector3(),
        _U = new TH.Vector3(),
        _Sd = new TH.Vector3(),
        _Md = new TH.Vector3();
      function atmo() {
        let k = 0,
          alt = -90,
          mk = 0;
        const inSky = (fpsState === 'stand' || fpsState === 'fly') && fpsAnchorLocal,
          act = atmOn && inSky;
        if (inSky) {
          const mw = earthB.m.matrixWorld;
          _ep.setFromMatrixPosition(mw);
          const R = mw.getMaxScaleOnAxis(),
            h = C.position.distanceTo(_ep) / R - 1;
          if (act) k = 1 - Math.max(0, Math.min(1, (h - 6e-4) / 0.03));
          _U.copy(fpsAnchorLocal).transformDirection(mw);
          _Sd.copy(_ep).negate().normalize();
          alt = (Math.asin(Math.max(-1, Math.min(1, _U.dot(_Sd)))) * 180) / PI;
        }
        if (act) {
          dome.material.uniforms.uSun.value.copy(_Sd);
          dome.material.uniforms.uUp.value.copy(_U);
          _Md.copy(moon.position).normalize();
          mk = moonOn
            ? ((1 - _Md.dot(_Sd)) / 2) *
              sm(-0.05, 0.35, _Md.dot(_U)) *
              (1 - sm(-0.12, 0.05, Math.sin((alt * PI) / 180)))
            : 0;
          dome.material.uniforms.uMoon.value.copy(_Md);
        }
        dome.visible = k > 0.001 && !PROF.off.dome;
        dome.material.uniforms.uK.value = k;
        dome.material.uniforms.uMK.value = mk;
        mat.uniforms.uLim.value = k > 0 ? 7 + (limMag(alt) - 7) * k - 2.2 * mk * k : 7;
        if (skySphere) skySphere.userData.uni.uDim.value = (1 - k * sm(-16, -6, alt)) * (1 - 0.45 * mk * k);
      }
      let _hid = false,
        _ekHid = false;
      const _bodies = bodies.filter(b => !b.isRoot && !b.isSun && b !== earthB);
      function upd(t) {
        const hide = fpsState === 'stand' || fpsState === 'fly';
        {
          const wantA = !hide && !PROF.off.shadows;
          if (!SHADOW_CACHE) {
            if (renderer.shadowMap.autoUpdate !== wantA) {
              renderer.shadowMap.autoUpdate = wantA;
              if (!wantA) renderer.shadowMap.needsUpdate = true;
            }
          } else {
            if (renderer.shadowMap.autoUpdate) renderer.shadowMap.autoUpdate = false;
            if (wantA && !_shAllowed) shDirty = true;
            if (!wantA && _shAllowed) {
              renderer.shadowMap.needsUpdate = true;
              shUpdN++;
            }
            _shAllowed = wantA;
            const nowW = performance.now();
            /* по изменению состояния — сразу; по ходу времени — не чаще ~20 раз в секунду (на больших скоростях тень всё равно «размазана») */
            if (
              wantA &&
              sunLight.castShadow &&
              (shDirty || (!(Math.abs(t - shLastTm) <= SH_DT) && nowW - shWall >= SH_MIN_MS))
            ) {
              renderer.shadowMap.needsUpdate = true;
              shLastTm = t;
              shWall = nowW;
              shDirty = false;
              shUpdN++;
            }
          }
        }
        if (hide || _hid) {
          _bodies.forEach(b => {
            if (b.g) b.g.visible = !hide;
            if (b.ln) b.ln.visible = (hide ? skyOrbits : orbitsVisible) && b.k !== 'cer';
          });
          earthB.mo.forEach(m => {
            m.visible = !hide;
          });
          _hid = hide;
        }
        {
          if (fpsState !== 'off') {
            earthB.ln.visible = false;
            LL.visible = false;
            _ekHid = true;
          } else if (_ekHid) {
            _ekHid = false;
            earthB.ln.visible = orbitsVisible;
            LL.visible = !!llFor && orbitsVisible;
          }
        }
        const he = helioEcl('earth', t);
        for (let i = 0; i < 7; i++) {
          const hp = helioEcl(PK[i], t),
            gv = [hp[0] - he[0], hp[1] - he[1], hp[2] - he[2]],
            D = Math.hypot(...gv),
            r = Math.hypot(...hp);
          const w = ecl2w(gv).multiplyScalar(2900 / D);
          ppos[i * 3] = w.x;
          ppos[i * 3 + 1] = w.y;
          ppos[i * 3 + 2] = w.z;
          pmag[i] = PV1[i] + 5 * Math.log10(r * D) - 1.5;
        }
        pg.attributes.position.needsUpdate = true;
        pg.attributes.aMag.needsUpdate = true;
        moon.position.copy(ecl2w(moonGeoEcl(t))).multiplyScalar(2880);
        moon.material.uniforms.uSun.value.copy(ecl2w([-he[0], -he[1], -he[2]])).normalize();
      }
      let on = false,
        namesOn = false,
        skyOrbits = false,
        starNm = false,
        planNm = true,
        lblDirty = false;
      const btn = document.createElement('button');
      btn.id = 'consBtn';
      btn.type = 'button';
      btn.title = 'Линии созвездий';
      btn.textContent = '✧';
      btn.onclick = e => {
        e.stopPropagation();
        e.preventDefault();
        on = !on;
        btn.classList.toggle('on', on);
        if (!on) want = -1;
      };
      const gMat = new TH.ShaderMaterial({
        uniforms: {
          uTex: { value: null },
          uHas: { value: 0 },
          uA: { value: 0 },
          uMK: { value: 0 },
          uE: { value: new TH.Vector3(1, 0, 0) },
          uN: { value: new TH.Vector3(0, 0, 1) },
          uUp: { value: new TH.Vector3(0, 1, 0) },
          uSun: { value: new TH.Vector3(1, 0, 0) },
          uMoon: { value: new TH.Vector3(0, 1, 0) },
        },
        vertexShader: SHD.posVert,
        fragmentShader: SHD.horizonFrag,
        side: TH.BackSide,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        premultipliedAlpha: true,
      });
      const gMesh = new TH.Mesh(new TH.SphereGeometry(1, 40, 28), gMat);
      gMesh.scale.setScalar(1500);
      gMesh.frustumCulled = false;
      gMesh.renderOrder = 100;
      gMesh.visible = false;
      S.add(gMesh);
      let gReq = false,
        gEarthOff = false;
      const gSaved = [],
        _gN = new TH.Vector3(),
        _gE = new TH.Vector3(),
        _gM = new TH.Vector3();
      function gLoad() {
        gReq = true;
        const _go = (u, alt) =>
          new TH.TextureLoader().setCrossOrigin('anonymous').load(
            u,
            t => {
              t.generateMipmaps = false;
              t.minFilter = TH.LinearFilter;
              t.magFilter = TH.LinearFilter;
              t.premultiplyAlpha = true;
              t.needsUpdate = true;
              gMat.uniforms.uTex.value = t;
              gMat.uniforms.uHas.value = 1;
            },
            undefined,
            () => {
              if (alt) _go(alt);
              else console.warn('egarden.png не загрузился — используется плоская заливка');
            }
          );
        _go(NL + 'egarden.png', NL !== NL_RAW ? NL_RAW + 'egarden.png' : null);
      }
      function gEarth(off) {
        const L = [earthB.m, earthB.cloudsMesh, earthB.vatm, earthB.atm];
        if (off && !gEarthOff) {
          gSaved.length = 0;
          L.forEach(o => {
            if (o) gSaved.push([o, o.visible]);
          });
        }
        if (!off && gEarthOff)
          gSaved.forEach(([o, v]) => {
            o.visible = v;
          });
        if (off)
          L.forEach(o => {
            if (o) o.visible = false;
          });
        gEarthOff = off;
      }
      /* LOD Земли по высоте камеры (в радиусах Земли): >1R — базовая 96×64 (12 тыс. треуг.), 0.1–1R — 192×96 (36 тыс.), <0.1R — 384×192 (147 тыс.).
   Края силуэта: отклонение полигона R·π²/(2N²) < 0.25 px на любом уровне в своём диапазоне высот. Когда Земля скрыта фейковой землёй — всегда базовая. */
      let _lodCur = 0;
      function earthLOD() {
        if (fpsState === 'off' || fpsState === 'exit' || !fpsGeoCoarse) {
          _lodCur = 0;
          return;
        }
        let want;
        if (gEarthOff && !PROF.off.ground) want = 0;
        else {
          const mw = earthB.m.matrixWorld;
          _ep.setFromMatrixPosition(mw);
          const h = C.position.distanceTo(_ep) / mw.getMaxScaleOnAxis() - 1;
          want = _lodCur;
          if (_lodCur === 0) {
            if (h < 0.85) want = 1;
          } else if (_lodCur === 1) {
            if (h > 1.2) want = 0;
            else if (h < 0.085) want = 2;
          } else if (h > 0.12) want = 1;
          if (_lodCur === 0 && h < 0.085) want = 2;
        }
        if (want === _lodCur && earthB.m.geometry !== fpsGeoCoarse) return;
        if (want === 1 && !fpsGeoMid) fpsGeoMid = new TH.SphereGeometry(1, 192, 96);
        if (want === 2 && !fpsGeoFine) fpsGeoFine = new TH.SphereGeometry(1, FPS_SEG_W, FPS_SEG_H);
        const g2 = want === 0 ? fpsGeoCoarse : want === 1 ? fpsGeoMid : fpsGeoFine;
        if (earthB.m.geometry !== g2) earthB.m.geometry = g2;
        _lodCur = want;
      }
      function groundSync() {
        earthLOD();
        const act = (fpsState === 'stand' || fpsState === 'fly') && fpsAnchorLocal && !PROF.off.ground;
        const a = act
          ? fpsState === 'stand'
            ? 1
            : sm(0.78, 1, (performance.now() - fpsFlyStart) / 3000)
          : 0;
        if (!gReq && fpsState !== 'off') gLoad();
        gMesh.visible = a > 0.001;
        if (a > 0.001) {
          const mw = earthB.m.matrixWorld,
            n = fpsAnchorLocal;
          _gN.set(0, 1, 0).addScaledVector(n, -n.y);
          if (_gN.lengthSq() < 1e-10) _gN.set(1, 0, 0).addScaledVector(n, -n.x);
          _gN.normalize();
          _gE.crossVectors(_gN, n).normalize();
          const u = gMat.uniforms;
          u.uN.value.copy(_gN).transformDirection(mw);
          u.uE.value.copy(_gE).transformDirection(mw);
          u.uUp.value.copy(_U);
          u.uSun.value.copy(_Sd);
          _gM.copy(moon.position).normalize();
          u.uMoon.value.copy(_gM);
          u.uMK.value = moonOn
            ? ((1 - _gM.dot(_Sd)) / 2) * sm(-0.05, 0.35, _gM.dot(_U)) * (1 - sm(-0.12, 0.05, _Sd.dot(_U)))
            : 0;
          u.uA.value = a;
          gMesh.position.copy(C.position);
        }
        gEarth(a > 0.985);
      }
      function conLabels() {
        const now = performance.now();
        if (!(g.visible && on && namesOn && fpsState === 'stand')) want = -1;
        else if (now - lastScan > 120) {
          lastScan = now;
          scan();
        }
        fadeStep(now);
      }

      const SNM = [
        [101.287, -16.716, 'Сириус', -1.44],
        [95.988, -52.696, 'Канопус', -0.62],
        [213.915, 19.182, 'Арктур', -0.05],
        [219.902, -60.834, 'Ригиль Кентаурус', -0.01],
        [279.235, 38.784, 'Вега', 0.03],
        [79.172, 45.998, 'Капелла', 0.08],
        [78.635, -8.202, 'Ригель', 0.18],
        [114.826, 5.225, 'Процион', 0.4],
        [24.428, -57.237, 'Ахернар', 0.45],
        [88.793, 7.407, 'Бетельгейзе', 0.45],
        [210.956, -60.373, 'Хадар', 0.61],
        [297.696, 8.868, 'Альтаир', 0.76],
        [186.65, -63.099, 'Акрукс', 0.77],
        [68.98, 16.509, 'Альдебаран', 0.87],
        [201.298, -11.161, 'Спика', 0.98],
        [247.352, -26.432, 'Антарес', 1.06],
        [116.329, 28.026, 'Поллукс', 1.16],
        [344.413, -29.622, 'Фомальгаут', 1.17],
        [191.93, -59.689, 'Мимоза', 1.25],
        [310.358, 45.28, 'Денеб', 1.25],
        [219.896, -60.837, 'Толиман', 1.35],
        [152.093, 11.967, 'Регул', 1.36],
        [104.656, -28.972, 'Адара', 1.5],
        [113.649, 31.888, 'Кастор', 1.58],
        [187.792, -57.113, 'Гакрукс', 1.59],
        [263.402, -37.104, 'Шаула', 1.62],
        [81.283, 6.35, 'Беллатрикс', 1.64],
        [81.573, 28.608, 'Эльнатх', 1.65],
        [138.3, -69.717, 'Миаплацид', 1.67],
        [84.053, -1.202, 'Альнилам', 1.69],
        [332.058, -46.961, 'Альнаир', 1.73],
        [85.19, -1.943, 'Альнитак', 1.74],
        [122.383, -47.337, 'Регор', 1.75],
        [193.507, 55.96, 'Алиот', 1.76],
        [51.081, 49.861, 'Мирфак', 1.79],
        [276.043, -34.385, 'Каус Аустралис', 1.79],
        [165.932, 61.751, 'Дубхе', 1.81],
        [107.098, -26.393, 'Везен', 1.83],
        [206.885, 49.313, 'Алькаид', 1.85],
        [125.629, -59.51, 'Авиор', 1.86],
        [264.33, -42.998, 'Саргас', 1.86],
        [89.882, 44.947, 'Менкалинан', 1.9],
        [252.166, -69.028, 'Атрия', 1.91],
        [99.428, 16.399, 'Альхена', 1.93],
        [131.176, -54.709, 'Альзефина', 1.93],
        [306.412, -56.735, 'Павлин', 1.94],
        [37.955, 89.264, 'Полярная', 1.97],
        [95.675, -17.956, 'Мирзам', 1.98],
        [141.897, -8.659, 'Альфард', 1.99],
        [31.793, 23.462, 'Гамаль', 2.01],
        [154.993, 19.841, 'Альгиеба', 2.01],
        [10.897, -17.987, 'Дифда', 2.04],
        [283.816, -26.297, 'Нунки', 2.05],
        [211.671, -36.37, 'Менкент', 2.06],
        [2.097, 29.09, 'Альферац', 2.07],
        [17.433, 35.621, 'Мирах', 2.07],
        [86.939, -9.67, 'Сайф', 2.07],
        [222.676, 74.156, 'Кохаб', 2.07],
        [340.667, -46.885, 'Тиаки', 2.07],
        [263.734, 12.56, 'Рас Альхаг', 2.08],
        [47.042, 40.956, 'Алголь', 2.09],
        [30.975, 42.33, 'Альмах', 2.1],
        [177.265, 14.572, 'Денебола', 2.14],
        [14.177, 60.717, 'Нави', 2.15],
        [190.379, -48.96, 'Мюлифайн', 2.17],
        [139.273, -59.275, 'Аспидиске', 2.21],
        [136.999, -43.433, 'Сухаиль', 2.21],
        [233.672, 26.715, 'Альфекка', 2.23],
        [83.002, -0.299, 'Минтака', 2.23],
        [305.557, 40.257, 'Садр', 2.23],
        [269.152, 51.489, 'Эльтанин', 2.23],
        [10.127, 56.537, 'Шедар', 2.24],
        [120.896, -40.003, 'Наос', 2.25],
        [2.294, 59.15, 'Каф', 2.27],
        [200.981, 54.925, 'Мицар', 2.23],
        [240.083, -22.622, 'Дшубба', 2.31],
        [252.541, -34.293, 'Лараваг', 2.29],
        [220.482, -47.388, 'Альфа Волка', 2.3],
        [221.247, 27.074, 'Иззар', 2.37],
        [165.932, 56.383, 'Мерак', 2.37],
        [6.571, -42.306, 'Анкаа', 2.39],
        [265.622, -39.03, 'Гиртаб', 2.39],
        [326.046, 9.875, 'Эниф', 2.39],
        [345.944, 28.083, 'Шеат', 2.42],
        [263.734, -15.725, 'Сабик', 2.43],
        [178.457, 53.695, 'Фекда', 2.44],
        [319.645, 62.586, 'Альдерамин', 2.45],
        [111.024, -29.303, 'Алудра', 2.45],
        [140.528, -55.011, 'Маркеб', 2.5],
        [346.19, 15.205, 'Маркаб', 2.49],
        [311.553, 33.97, 'Альджанах', 2.48],
        [45.57, 4.09, 'Менкар', 2.54],
        [249.29, -10.567, 'Хан', 2.54],
        [168.527, 20.524, 'Зосма', 2.56],
        [83.183, -17.822, 'Арнеб', 2.58],
        [285.653, -29.88, 'Асцелла', 2.59],
        [236.067, 6.426, 'Унукальхай', 2.63],
        [183.952, -17.542, 'Гиена', 2.58],
        [188.597, -23.397, 'Краз', 2.65],
        [84.912, -34.074, 'Факт', 2.64],
        [208.671, 18.398, 'Муфрид', 2.68],
        [21.454, 60.235, 'Ручба', 2.68],
        [275.249, -29.828, 'Каус Медиа', 2.7],
        [262.691, -37.296, 'Лезат', 2.69],
        [161.693, -49.42, 'Мю Велорум', 2.69],
        [241.359, -19.806, 'Акраб', 2.62],
        [296.564, 10.613, 'Тарапед', 2.72],
        [243.587, -3.694, 'Йед Приор', 2.73],
        [190.415, -1.45, 'Поррима', 2.74],
        [160.739, -64.394, 'Тета Киля', 2.76],
        [265.868, 4.567, 'Цебалрай', 2.76],
        [262.608, 52.301, 'Растабан', 2.79],
        [247.555, 21.49, 'Корнефорос', 2.78],
        [83.858, -5.91, 'Хатиса', 2.77],
        [76.962, -5.086, 'Курса', 2.79],
        [276.043, -25.422, 'Каус Бореалис', 2.81],
        [248.526, 31.603, 'Дзета Геркулеса', 2.81],
        [245.297, -25.593, 'Альният', 2.89],
        [248.971, -28.216, 'Пайкаухале', 2.82],
        [86.739, -20.759, 'Нихаль', 2.84],
        [195.544, 10.959, 'Виндемиатрикс', 2.85],
        [261.325, -55.53, 'Бета Жертвенника', 2.85],
        [234.18, -63.431, 'Бета Юж. Треугольника', 2.85],
        [3.309, 15.184, 'Альгениб', 2.83],
        [59.463, 31.884, 'Менкиб', 2.85],
        [296.244, 45.131, 'Фаварис', 2.86],
        [334.625, -60.26, 'Альфа Тукана', 2.86],
        [29.692, -61.57, 'Альфа Юж. Гидры', 2.86],
        [95.74, 22.514, 'Теджат', 2.87],
        [322.89, -5.571, 'Садальсууд', 2.9],
        [331.446, -0.32, 'Садальмелик', 2.95],
        [187.466, -16.516, 'Альгораб', 2.94],
        [59.507, -13.508, 'Заурак', 2.95],
        [263.04, -49.876, 'Альфа Жертвенника', 2.95],
        [146.776, -65.072, 'Ипсилон Киля', 2.97],
        [146.463, 23.774, 'Эпсилон Льва', 2.98],
        [271.452, -30.424, 'Альнасль', 2.98],
        [133.116, -23.172, 'Гамма Гидры', 2.99],
        [44.565, -40.305, 'Акамар', 2.88],
        [84.411, 21.143, 'Дзета Тельца', 3.0],
        [182.532, -22.62, 'Минкар', 3.02],
        [95.078, -30.063, 'Фуруд', 3.02],
        [292.68, 27.96, 'Альбирео', 3.05],
        [75.492, 43.823, 'Эпсилон Возничего', 3.03],
        [218.02, 38.308, 'Сегинус', 3.04],
        [100.983, 25.131, 'Мебсута', 3.06],
        [155.582, 41.499, 'Тания Австралис', 3.06],
        [288.139, 67.661, 'Альтаис', 3.07],
        [87.74, -35.768, 'Вазна', 3.12],
        [134.802, 48.042, 'Талита', 3.12],
        [258.762, 36.809, 'Пи Геркулеса', 3.16],
        [262.182, 65.714, 'Альдиба', 3.17],
        [75.088, 41.234, 'Хедус', 3.18],
        [354.837, 77.632, 'Эррай', 3.21],
        [322.165, 70.561, 'Альфирк', 3.23],
        [244.58, -4.692, 'Йед Постериор', 3.24],
        [231.232, 58.966, 'Эдасих', 3.29],
        [183.857, 57.033, 'Мегрец', 3.32],
        [168.56, 15.43, 'Чертан', 3.33],
        [332.713, 58.201, 'Дзета Цефея', 3.35],
        [101.322, 12.896, 'Альзирр', 3.35],
        [127.566, 60.718, 'Мусцида', 3.36],
        [203.673, -0.596, 'Хезе', 3.38],
        [28.599, 63.67, 'Сегин', 3.38],
      ].map(a => {
        const t = new Float32Array(3);
        eq2w(a[0] * DEG, a[1] * DEG, t, 0, 1);
        const d = new TH.Vector3(t[0], t[1], t[2]);
        return { d, p: d.clone().multiplyScalar(2890), n: a[2], m: a[3] };
      });
      const PN = ['Меркурий', 'Венера', 'Марс', 'Юпитер', 'Сатурн', 'Уран', 'Нептун'];
      const cvl = document.createElement('canvas');
      cvl.id = 'skyLbl';
      document.body.append(cvl);
      const cx = cvl.getContext('2d');
      let cw = 0,
        ch = 0,
        cdpr = 1;
      const _nv = new TH.Vector3(),
        _pd = new TH.Vector3(),
        _sp = new TH.Vector3();
      const LBL = new Map(),
        mcx = document.createElement('canvas').getContext('2d');
      function lblSprite(txt, col) {
        txt = TR(txt);
        const key = col + '|' + txt;
        let c = LBL.get(key);
        if (c) return c;
        const d = cdpr,
          F = '600 12px system-ui,sans-serif';
        mcx.font = F;
        const w = Math.ceil(mcx.measureText(txt).width) + 8,
          h = 20,
          cv = document.createElement('canvas');
        cv.width = Math.ceil(w * d);
        cv.height = Math.ceil(h * d);
        const x = cv.getContext('2d');
        x.scale(d, d);
        x.font = F;
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.lineWidth = 3;
        x.lineJoin = 'round';
        x.strokeStyle = 'rgba(0,0,0,.65)';
        x.strokeText(txt, w / 2, h / 2);
        x.fillStyle = col;
        x.fillText(txt, w / 2, h / 2);
        c = { cv, w, h };
        LBL.set(key, c);
        return c;
      }
      function fitCv() {
        const d = Math.min(devicePixelRatio || 1, 2);
        if (cw !== innerWidth || ch !== innerHeight || cdpr !== d) {
          if (cdpr !== d) LBL.clear();
          cw = innerWidth;
          ch = innerHeight;
          cdpr = d;
          cvl.width = Math.round(cw * d);
          cvl.height = Math.round(ch * d);
          cvl.style.width = cw + 'px';
          cvl.style.height = ch + 'px';
        }
      }
      function drawNames() {
        const want = g.visible && fpsState === 'stand' && fpsAnchorLocal && (starNm || planNm || namesOn);
        fitCv();
        if (!want) {
          if (lblDirty) {
            cx.setTransform(1, 0, 0, 1, 0, 0);
            cx.clearRect(0, 0, cvl.width, cvl.height);
            lblDirty = false;
          }
          return;
        }
        lblDirty = true;
        cx.setTransform(cdpr, 0, 0, cdpr, 0, 0);
        cx.clearRect(0, 0, cw, ch);
        g.updateMatrixWorld(true);
        const mw = g.matrixWorld,
          hw = cw / 2,
          hh = ch / 2,
          rn = Math.min(hw, hh),
          lim = mat.uniforms.uLim.value;
        const put = (v, txt, col, dy, hiCol, hiA) => {
          _nv.copy(v).applyMatrix4(mw).project(C);
          if (_nv.z > 1) return;
          const x = (_nv.x * 0.5 + 0.5) * cw,
            y = (-_nv.y * 0.5 + 0.5) * ch,
            r = Math.hypot(x - hw, y - hh) / rn,
            a = Math.max(0, Math.min(1, 1.25 - 0.85 * r));
          if (a < 0.05) return;
          const sp = lblSprite(txt, col);
          cx.globalAlpha = a;
          cx.drawImage(sp.cv, x - sp.w / 2, y + dy - sp.h / 2, sp.w, sp.h);
          /* подсветка: тот же размер, поверх основной подписи (основная не гаснет — мигания нет) */
          if (hiA > 0.01) {
            const hs = lblSprite(txt, hiCol);
            cx.globalAlpha = a * hiA;
            cx.drawImage(hs.cv, x - hs.w / 2, y + dy - hs.h / 2, hs.w, hs.h);
          }
        };
        /* названия созвездий: все, что в поле зрения и над горизонтом (как названия звёзд); у созвездия в центре плавно разгорается подсветка того же кегля */
        if (namesOn)
          for (let k = 0; k < CS.length; k++) {
            if (CS[k].c.dot(_U) < -0.05) continue;
            put(CS[k].p, CON_NAMES[k], '#e8b53f', 0, '#fff0b8', k === shown ? hA : 0);
          }
        if (starNm)
          for (let i = 0; i < SNM.length; i++) {
            const s = SNM[i];
            if (s.m > lim - 0.4 || s.d.dot(_U) < 0.01) continue;
            put(s.p, s.n, '#cfe6ff', 13);
          }
        if (planNm) {
          for (let i = 0; i < 7; i++) {
            if (pmag[i] > lim + 0.3) continue;
            _pd.set(ppos[i * 3], ppos[i * 3 + 1], ppos[i * 3 + 2]);
            if (_pd.dot(_U) < 0.01 * 2900) continue;
            put(_pd, PN[i], '#ffe0a0', 13);
          }
          if (moon.position.dot(_U) > 0.01 * 2880) put(moon.position, 'Луна', '#ffffff', 18);
          _sp.copy(_Sd).multiplyScalar(2890);
          if (_Sd.dot(_U) > 0.01) put(_sp, 'Солнце', '#ffd27a', 18);
        }
        cx.globalAlpha = 1;
      }
      return {
        setCons(v) {
          on = v;
          if (!on) want = -1;
        },
        setNames(v) {
          namesOn = v;
          lblDirty = true;
          if (!v) want = -1;
        },
        setStarNames(v) {
          starNm = v;
          lblDirty = true;
        },
        setPlanetNames(v) {
          planNm = v;
          lblDirty = true;
        },
        setOrbits(v) {
          skyOrbits = v;
        },
        labels() {
          conLabels();
          drawNames();
        },
        groundSync,
        update() {
          g.visible = fpsState !== 'off' && !PROF.off.sky;
          lines.visible = on;
          btn.classList.toggle('show', g.visible);
          mat.uniforms.uPx.value = renderer.getPixelRatio();
          g.position.copy(C.position);
          g.scale.copy(sky.scale);
          upd(tm);
          atmo();
        },
      };
    })();

    const layersBtn = document.createElement('button');
    layersBtn.id = 'layersBtn';
    layersBtn.title = 'Слои и отображение';
    {
      const NS = 'http://www.w3.org/2000/svg',
        sv = document.createElementNS(NS, 'svg');
      [
        ['width', '20'],
        ['height', '20'],
        ['viewBox', '0 0 24 24'],
        ['fill', 'none'],
        ['stroke', 'currentColor'],
        ['stroke-width', '2'],
        ['stroke-linecap', 'round'],
        ['stroke-linejoin', 'round'],
      ].forEach(a => sv.setAttribute(a[0], a[1]));
      ['M12 3 3 8l9 5 9-5-9-5Z', 'M3 12.2l9 5 9-5', 'M3 16.2l9 5 9-5'].forEach(d => {
        const pa = document.createElementNS(NS, 'path');
        pa.setAttribute('d', d);
        sv.appendChild(pa);
      });
      layersBtn.appendChild(sv);
    }
    const layersMenu = document.createElement('div');
    layersMenu.id = 'layersMenu';
    const lrow = (id, t, c) =>
      '<div class="row"><span>' +
      t +
      '</span><label class="sw"><input type="checkbox" id="' +
      id +
      '"' +
      (c ? ' checked' : '') +
      '><span></span></label></div>';
    layersMenu.innerHTML =
      '<div class="section" id="layGen"><div class="section-label">Отображение</div></div><div class="section" id="laySky" style="display:none"><div class="section-label">Небосвод</div>' +
      lrow('consChk', 'Линии созвездий', false) +
      lrow('namesChk', 'Названия созвездий', false) +
      lrow('starNmChk', 'Названия звёзд', false) +
      lrow('planNmChk', 'Названия планет', true) +
      lrow('compassChk', 'Стороны света', true) +
      lrow('moonChk', 'Лунный свет', true) +
      '</div><div class="section" id="layDbg"><div class="section-label">Отладка</div>' +
      lrow('profChk', 'Профайлер (временный)', false) +
      '</div>';
    {
      const gen = layersMenu.querySelector('#layGen'),
        osec = setMenu.querySelector('#orbitsChk').closest('.section');
      Array.from(osec.querySelectorAll('.row')).forEach(r => gen.append(r));
      osec.remove();
      const dv = setMenu.querySelector('.divider');
      if (dv) dv.remove();
      const atm = skySec.querySelector('#atmChk').closest('.row');
      layersMenu
        .querySelector('#laySky')
        .insertBefore(atm, layersMenu.querySelector('#consChk').closest('.row'));
    }
    layersMenu.querySelector('#consChk').onchange = e => SkyW.setCons(e.target.checked);
    layersMenu.querySelector('#namesChk').onchange = e => SkyW.setNames(e.target.checked);
    layersMenu.querySelector('#compassChk').onchange = e =>
      document.body.classList.toggle('no-compass', !e.target.checked);
    layersMenu.querySelector('#moonChk').onchange = e => {
      moonOn = e.target.checked;
    };
    layersMenu.querySelector('#starNmChk').onchange = e => SkyW.setStarNames(e.target.checked);
    layersMenu.querySelector('#planNmChk').onchange = e => SkyW.setPlanetNames(e.target.checked);
    layersMenu.querySelector('#profChk').onchange = e => PROF.set(e.target.checked);
    document.body.append(layersBtn, layersMenu);
    layersBtn.onclick = e => {
      e.stopPropagation();
      const o = !layersMenu.classList.contains('open');
      layersMenu.classList.toggle('open', o);
      layersBtn.classList.toggle('open', o);
      if (o) {
        setMenu.classList.remove('open');
        setBtn.classList.remove('open');
        drop.classList.remove('open');
      }
    };
    setBtn.addEventListener('click', () => {
      layersMenu.classList.remove('open');
      layersBtn.classList.remove('open');
    });
    document.addEventListener('click', e => {
      if (
        layersMenu.classList.contains('open') &&
        !layersMenu.contains(e.target) &&
        !layersBtn.contains(e.target)
      ) {
        layersMenu.classList.remove('open');
        layersBtn.classList.remove('open');
      }
    });

    const fpsHint = document.createElement('div');
    fpsHint.id = 'fpsHint';
    fpsHint.innerHTML = '<div>Выбери место наблюдения: <b>тапни по Земле</b></div>';
    const locBtn = document.createElement('button');
    locBtn.type = 'button';
    locBtn.className = 'loc-btn';
    {
      const NS = 'http://www.w3.org/2000/svg',
        sv = document.createElementNS(NS, 'svg');
      [
        ['width', '16'],
        ['height', '16'],
        ['viewBox', '0 0 24 24'],
        ['fill', 'none'],
        ['stroke', 'currentColor'],
        ['stroke-width', '2'],
        ['stroke-linecap', 'round'],
        ['stroke-linejoin', 'round'],
      ].forEach(a => sv.setAttribute(a[0], a[1]));
      const pa = document.createElementNS(NS, 'path');
      pa.setAttribute('d', 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z');
      const ci2 = document.createElementNS(NS, 'circle');
      ci2.setAttribute('cx', '12');
      ci2.setAttribute('cy', '10');
      ci2.setAttribute('r', '2.5');
      sv.append(pa, ci2);
      locBtn.append(sv, document.createTextNode(' ' + TR('Определить автоматически')));
    }
    const locSt = document.createElement('div');
    locSt.className = 'st';
    fpsHint.append(document.createTextNode(''), locBtn, locSt);
    document.body.append(fpsHint);
    locBtn.onclick = e => {
      e.stopPropagation();
      if (!navigator.geolocation || !window.isSecureContext) {
        locSt.textContent = 'Геолокация здесь недоступна (нужен https). Выбери место тапом по Земле.';
        return;
      }
      locSt.textContent = 'Определяю местоположение…';
      navigator.geolocation.getCurrentPosition(
        p => {
          locSt.textContent = '';
          fpsSetObserver(p.coords.latitude, p.coords.longitude);
        },
        err => {
          locSt.textContent = 'Не удалось определить. Выбери место тапом по Земле.';
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 }
      );
    };

    const FPS_SEG_W = 384,
      FPS_SEG_H = 192; /* самый детальный уровень LOD Земли (раньше 768×384 = 588 тыс. треугольников) */
    const FPS_H_MIN = 2e-5,
      FPS_H_MAX = 6e-4;
    const FPS_H_DEFAULT = 3e-5;
    let fpsHRel = FPS_H_DEFAULT;
    let fpsGeoFine = null,
      fpsGeoCoarse = null,
      fpsGeoMid = null;
    let fpsState = 'off';
    const FPS_PITCH0 = 0.87;
    let fpsInfoSaved = null;
    function fpsInfoOff() {
      if (fpsInfoSaved === null) {
        fpsInfoSaved = infoPanelVisible;
        infoPanelVisible = false;
        $('#info').classList.remove('show');
        const c = document.getElementById('infoChk');
        if (c) c.checked = false;
      }
    }
    function fpsInfoRestore() {
      if (fpsInfoSaved !== null) {
        infoPanelVisible = fpsInfoSaved;
        fpsInfoSaved = null;
        const c = document.getElementById('infoChk');
        if (c) c.checked = infoPanelVisible;
        if (infoPanelVisible && cur) showInfo(cur);
      }
    }
    let fpsAnchorLocal = null,
      fpsYaw = 0,
      fpsPitch = 0,
      fpsRoll = 0,
      fpsSavedSpI = 1;
    let fpsFlyStart = 0,
      fpsExitStart = 0,
      fpsSelDownX = null,
      fpsSelDownY = null;
    const fpsFlyFromPos = new TH.Vector3(),
      fpsFlyFromQuat = new TH.Quaternion();
    const _fpsTargetPos = new TH.Vector3(),
      _fpsTargetQuat = new TH.Quaternion();

    const fpsBtn = document.createElement('button');
    fpsBtn.id = 'fpsBtn';
    fpsBtn.type = 'button';
    fpsBtn.title = 'Прогулка по поверхности Земли';
    fpsBtn.textContent = '✦';
    document.body.append(fpsBtn);

    const HORIZON_LABELS = [
      { az: 0, text: 'С' },
      { az: Math.PI / 4, text: 'СВ', minor: true },
      { az: Math.PI / 2, text: 'В' },
      { az: (3 * Math.PI) / 4, text: 'ЮВ', minor: true },
      { az: Math.PI, text: 'Ю' },
      { az: (5 * Math.PI) / 4, text: 'ЮЗ', minor: true },
      { az: (3 * Math.PI) / 2, text: 'З' },
      { az: (7 * Math.PI) / 4, text: 'СЗ', minor: true },
    ].map(c => {
      const el = document.createElement('div');
      el.className = 'horizon-label' + (c.minor ? ' minor' : '');
      el.textContent = c.text;
      document.body.appendChild(el);
      return { el, az: c.az };
    });
    const _hlN = new TH.Vector3(),
      _hlE = new TH.Vector3(),
      _hlU = new TH.Vector3(),
      _hlP = new TH.Vector3(),
      _hlQ = new TH.Quaternion(),
      _hlS = new TH.Vector3(),
      _hlDir = new TH.Vector3(),
      _hlProj = new TH.Vector3(),
      _hlObs = new TH.Vector3(),
      _hlCamF = new TH.Vector3(),
      _hlToLabel = new TH.Vector3();

    function updateHorizonLabels() {
      if ((fpsState !== 'stand' && fpsState !== 'fly') || !fpsAnchorLocal || !earthB) {
        for (const l of HORIZON_LABELS) l.el.classList.remove('show');
        return;
      }
      const mm = earthB.m;
      mm.updateWorldMatrix(true, false);
      mm.matrixWorld.decompose(_hlP, _hlQ, _hlS);
      const R = _hlS.x,
        H = R * fpsHRel;
      const nL = fpsAnchorLocal;
      _hlU.copy(nL).applyQuaternion(_hlQ).normalize();
      const nLocal = new TH.Vector3(0, 1, 0).addScaledVector(nL, -nL.y);
      if (nLocal.lengthSq() < 1e-10) nLocal.set(0, 0, 1);
      nLocal.normalize();
      _hlN.copy(nLocal).applyQuaternion(_hlQ).normalize();
      _hlE.crossVectors(_hlN, _hlU).normalize();
      _hlObs.copy(_hlP).addScaledVector(_hlU, R + H);
      const cosA = R / (R + H);
      const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
      const K = R * 100;
      C.getWorldDirection(_hlCamF);
      for (const l of HORIZON_LABELS) {
        const c = Math.cos(l.az),
          s = Math.sin(l.az);
        _hlDir
          .copy(_hlN)
          .multiplyScalar(c * cosA)
          .addScaledVector(_hlE, s * cosA)
          .addScaledVector(_hlU, -sinA);
        _hlToLabel.copy(_hlObs).addScaledVector(_hlDir, K);
        _hlProj.copy(_hlToLabel).project(C);
        if (_hlProj.z > 1) {
          l.el.classList.remove('show');
          continue;
        }
        _hlToLabel.sub(C.position).normalize();
        if (_hlCamF.dot(_hlToLabel) < 0.15) {
          l.el.classList.remove('show');
          continue;
        }
        const x = (_hlProj.x * 0.5 + 0.5) * innerWidth,
          y = (-_hlProj.y * 0.5 + 0.5) * innerHeight;
        if (
          !isFinite(x) ||
          !isFinite(y) ||
          x < -40 ||
          x > innerWidth + 40 ||
          y < -30 ||
          y > innerHeight + 30
        ) {
          l.el.classList.remove('show');
          continue;
        }
        l.el.style.left = x + 'px';
        l.el.style.top = y + 'px';
        l.el.classList.add('show');
      }
    }

    function setSettingsEnabled(en) {
      {
        const sk = setMenu.querySelector('#skySec');
        if (sk) sk.style.display = en ? 'none' : '';
        const lg = document.getElementById('layGen'),
          ls = document.getElementById('laySky');
        if (lg) lg.style.display = en ? '' : 'none';
        if (ls) ls.style.display = en ? 'none' : '';
      }
      ['#modeToggle', '#camToggle'].forEach(q => {
        const sec = setMenu.querySelector(q).closest('.section');
        if (sec) sec.style.display = en ? '' : 'none';
      });
      setMenu.querySelector('#speedSeg').style.display = en ? '' : 'none';
      setMenu.querySelector('#fpsSpeedSeg').style.display = en ? 'none' : '';
    }
    function updateFpsBtn() {
      const can = (cur && cur.k === 'earth') || fpsState !== 'off';
      fpsBtn.classList.toggle('show', !!can);
      fpsBtn.classList.toggle('on', fpsState !== 'off');
      setMenu.classList.toggle('fpsOffset', !!can);
    }
    function fpsZoom(factor) {
      if (fpsState !== 'select' && fpsState !== 'fly' && fpsState !== 'stand') return;
      fpsHRel = Math.max(FPS_H_MIN, Math.min(FPS_H_MAX, fpsHRel * factor));
    }
    /* слои неба при входе в режим — всегда по умолчанию (названия созвездий выключены) */
    function applySkyDefaults() {
      const D = { consChk: false, namesChk: false, starNmChk: false, planNmChk: true, compassChk: true, moonChk: true };
      for (const id in D) {
        const c = layersMenu.querySelector('#' + id);
        if (c && c.checked !== D[id]) {
          c.checked = D[id];
          c.dispatchEvent(new Event('change'));
        }
      }
    }
    function enterFpsMode() {
      if (!cur || cur.k !== 'earth') return;
      applySkyDefaults();
      fpsInfoOff();
      if (!real) {
        real = 1;
        modeToggle.classList.add('real');
        apply();
        pick(ci);
      }
      lodForceFull(earthB);
      if (!fpsGeoCoarse)
        fpsGeoCoarse = earthB.m.geometry; /* уровень детализации выбирает earthLOD() по высоте камеры */
      earthB._savedCastShadow = earthB.m.castShadow;
      earthB.m.castShadow = false;
      fpsSavedSpI = spI;
      spI = FPS_SPEED_IDX;
      fpsHRel = FPS_H_DEFAULT;
      fpsState = 'select';
      enforceSpeedLimit();
      setSettingsEnabled(false);
      document.body.classList.add('fps-select');
      {
        const vf = (C.fov * PI) / 180,
          hf = 2 * Math.atan(Math.tan(vf / 2) * C.aspect),
          half = (Math.min(vf, hf) / 2) * 0.82;
        dd = cl(earthB.r / Math.sin(half));
      }
      updateFpsBtn();
    }
    function exitFpsMode(animated) {
      if (fpsState === 'off') return;
      fpsFlyFromPos.copy(C.position);
      fpsFlyFromQuat.copy(C.quaternion);
      fpsExitStart = performance.now();
      if (fpsGeoCoarse) {
        earthB.m.geometry = fpsGeoCoarse;
        fpsGeoCoarse = null;
      }
      if (earthB._savedCastShadow !== undefined) {
        earthB.m.castShadow = earthB._savedCastShadow;
        delete earthB._savedCastShadow;
      }
      fpsAnchorLocal = null;
      fpsSelDownX = null;
      const oldSpin = objSpin(cur);
      spinRef = oldSpin;
      const _q = objTiltQ(cur);
      if (_q) curTiltQ.copy(_q);
      else curTiltQ.identity();
      smoothTiltQ.copy(curTiltQ);
      const rel = C.position.clone().sub(wpos(cur));
      const relLen = Math.max(1e-4, rel.length());
      const relLocal = rel.clone().applyQuaternion(curTiltQ.clone().invert());
      ph = Math.max(0.15, Math.min(3, Math.acos(Math.max(-1, Math.min(1, relLocal.y / relLen)))));
      th = Math.atan2(relLocal.x, relLocal.z);
      const newDist = cur.d || 100;
      dist = newDist;
      dd = newDist;
      off.set(0, 0, 0);
      fpsState = animated ? 'exit' : 'off';
      gyroStop();
      if (!animated) finishFpsExit();
      else updateFpsBtn();
    }
    /* то, что возвращается к обычному виду, — только когда анимация отдаления закончилась */
    function finishFpsExit() {
      spI = fpsSavedSpI;
      setSettingsEnabled(true);
      document.body.classList.remove('fps-select', 'fps-stand');
      enforceSpeedLimit();
      fpsInfoRestore();
      updateFpsBtn();
    }
    fpsBtn.onclick = e => {
      e.stopPropagation();
      e.preventDefault();
      if (fpsState === 'exit') return;
      if (fpsState === 'off') enterFpsMode();
      else exitFpsMode(true);
    };

    const _fpP = new TH.Vector3(),
      _fpQ = new TH.Quaternion(),
      _fpS = new TH.Vector3();
    const _fpRollQ = new TH.Quaternion(),
      _fpZAxis = new TH.Vector3(0, 0, 1);
    const _fpN = new TH.Vector3(),
      _fpE = new TH.Vector3(),
      _fpF = new TH.Vector3();
    const _fpU = new TH.Vector3(),
      _fpW = new TH.Vector3(),
      _fpZ = new TH.Vector3(),
      _fpX = new TH.Vector3(),
      _fpY = new TH.Vector3(),
      _fpM = new TH.Matrix4();
    function computeFpsPose(outP, outQ) {
      const mm = earthB.m;
      mm.updateWorldMatrix(true, false);
      mm.matrixWorld.decompose(_fpP, _fpQ, _fpS);
      const R = _fpS.x,
        H = R * fpsHRel;
      const nL = fpsAnchorLocal;
      _fpN.set(0, 1, 0).addScaledVector(nL, -nL.y);
      if (_fpN.lengthSq() < 1e-10) _fpN.set(0, 0, 1);
      _fpN.normalize();
      _fpE.crossVectors(_fpN, nL).normalize();
      const cp = Math.cos(fpsPitch),
        sp = Math.sin(fpsPitch),
        cy = Math.cos(fpsYaw),
        sy = Math.sin(fpsYaw);
      _fpF
        .set(0, 0, 0)
        .addScaledVector(_fpN, cp * cy)
        .addScaledVector(_fpE, cp * sy)
        .addScaledVector(nL, sp)
        .normalize();
      _fpU.copy(nL).applyQuaternion(_fpQ).normalize();
      _fpW.copy(_fpF).applyQuaternion(_fpQ).normalize();
      outP.copy(_fpP).addScaledVector(_fpU, R + H);
      _fpZ.copy(_fpW).negate();
      _fpX.crossVectors(_fpU, _fpZ);
      if (_fpX.lengthSq() < 1e-10) _fpX.set(1, 0, 0);
      else _fpX.normalize();
      _fpY.crossVectors(_fpZ, _fpX).normalize();
      _fpM.makeBasis(_fpX, _fpY, _fpZ);
      outQ.setFromRotationMatrix(_fpM);
      if (fpsRoll) outQ.multiply(_fpRollQ.setFromAxisAngle(_fpZAxis, -fpsRoll));
    }
    const _fpRay = new TH.Raycaster(),
      _fpNdc = new TH.Vector2(),
      _fpInv = new TH.Matrix4();
    function trySelectSurface(cx, cy) {
      if (!earthB || !earthB.m) return;
      _fpNdc.set((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1);
      _fpRay.setFromCamera(_fpNdc, C);
      earthB.m.updateWorldMatrix(true, false);
      _fpInv.copy(earthB.m.matrixWorld).invert();
      const _o = _fpRay.ray.origin.clone().applyMatrix4(_fpInv),
        _d = _fpRay.ray.direction.clone().transformDirection(_fpInv);
      const _b = _o.dot(_d),
        _disc = _b * _b - (_o.lengthSq() - 1);
      if (_disc < 0) return;
      const _t = -_b - Math.sqrt(_disc);
      if (_t < 0) return;
      const p = _o.addScaledVector(_d, _t);
      if (p.lengthSq() < 1e-12) return;
      p.normalize();
      fpsAnchorLocal = p;
      earthB.m.matrixWorld.decompose(_fpP, _fpQ, _fpS);
      const curFwd = new TH.Vector3();
      C.getWorldDirection(curFwd);
      const localFwd = curFwd.applyQuaternion(_fpQ.clone().invert()).normalize();
      const northL = new TH.Vector3(0, 1, 0).addScaledVector(p, -p.y);
      let yaw0 = 0;
      if (northL.lengthSq() > 1e-10) {
        northL.normalize();
        const eastL = new TH.Vector3().crossVectors(northL, p).normalize();
        const tFwd = localFwd.clone().addScaledVector(p, -localFwd.dot(p));
        if (tFwd.lengthSq() > 1e-10) {
          tFwd.normalize();
          yaw0 = Math.atan2(tFwd.dot(eastL), tFwd.dot(northL));
        }
      }
      fpsYaw = yaw0;
      fpsPitch = FPS_PITCH0;
      fpsFlyFromPos.copy(C.position);
      fpsFlyFromQuat.copy(C.quaternion);
      fpsFlyStart = performance.now();
      fpsState = 'fly';
      document.body.classList.remove('fps-select');
      document.body.classList.add('fps-stand');
    }

    const toggleMenu = () => {
      setMenu.classList.toggle('open');
      setBtn.classList.toggle('open');
    };
    setBtn.onclick = e => {
      e.stopPropagation();
      toggleMenu();
      drop.classList.remove('open');
    };
    document.addEventListener('click', e => {
      if (setMenu.classList.contains('open') && !setMenu.contains(e.target) && !setBtn.contains(e.target)) {
        setMenu.classList.remove('open');
        setBtn.classList.remove('open');
      }
    });
    function isSpeedRestricted() {
      return camMode === 1 && cur && !cur.isSun && !cur.isRoot;
    }
    function enforceSpeedLimit() {
      const fpsActive = fpsState !== 'off' && fpsState !== 'exit';
      const restricted = isSpeedRestricted();
      if (!fpsActive && restricted && SPEEDS[spI] > 1) {
        spI = 2;
      }
      setMenu.querySelectorAll('#speedSeg button').forEach(btn => {
        const v = parseInt(btn.dataset.sp, 10);
        const disabled = fpsActive || (restricted && SPEEDS[v] > 1);
        btn.disabled = disabled;
        btn.style.opacity = disabled ? 0.35 : '';
        btn.style.pointerEvents = disabled ? 'none' : '';
        btn.classList.toggle('on', !fpsActive && v === spI);
      });
      setMenu
        .querySelectorAll('#fpsSpeedSeg button')
        .forEach(b => b.classList.toggle('on', parseInt(b.dataset.sp, 10) === spI));
    }
    setMenu.querySelectorAll('#speedSeg button').forEach(btn => {
      btn.onclick = () => {
        const v = parseInt(btn.dataset.sp, 10);
        if (isSpeedRestricted() && SPEEDS[v] > 1) return;
        spI = v;
        enforceSpeedLimit();
      };
    });
    setMenu.querySelectorAll('#fpsSpeedSeg button').forEach(b => {
      b.onclick = () => {
        spI = parseInt(b.dataset.sp, 10);
        enforceSpeedLimit();
      };
    });
    const modeToggle = setMenu.querySelector('#modeToggle');
    modeToggle.classList.toggle('real', !!real);
    modeToggle.querySelectorAll('.opt').forEach(opt => {
      opt.onclick = () => {
        const m = parseInt(opt.dataset.mode, 10);
        if (!!m === !!real) return;
        real = m;
        modeToggle.classList.toggle('real', !!real);
        apply();
        pick(ci);
      };
    });
    const camToggle = setMenu.querySelector('#camToggle');
    camToggle.classList.toggle('real', camMode === 1);
    camToggle.querySelectorAll('.opt').forEach(opt => {
      opt.onclick = () => {
        const m = parseInt(opt.dataset.cam, 10);
        if (m === camMode) return;
        camMode = m;
        camToggle.classList.toggle('real', camMode === 1);
        enforceSpeedLimit();
      };
    });

    function refreshOrbitLines() {
      for (const b of bodies) {
        if (b.ln) b.ln.visible = orbitsVisible && b.k !== 'cer';
        if (b.mo)
          for (const p of b.mo) {
            if (!p.userData.orbit) continue;
            const pb = cur.isMoon ? cur.parent : cur;
            p.userData.orbit.visible = orbitsVisible && b === pb;
          }
      }
    }
    document.getElementById('orbitsChk').addEventListener('change', e => {
      orbitsVisible = e.target.checked;
      refreshOrbitLines();
      if (fpsState === 'off') pick(ci);
    });
    document.getElementById('planetLabelsChk').addEventListener('change', e => {
      planetLabelsVisible = e.target.checked;
      updateLabels();
    });
    document.getElementById('moonLabelsChk').addEventListener('change', e => {
      moonLabelsVisible = e.target.checked;
      updateLabels();
    });
    document.getElementById('infoChk').addEventListener('change', e => {
      infoPanelVisible = e.target.checked;
      if (infoPanelVisible) showInfo(cur);
      else $('#info').classList.remove('show');
    });
    const drop = document.createElement('div');
    drop.className = 'dd';
    const dropBtn = document.createElement('button');
    dropBtn.className = 'dd-btn';
    const dropList = document.createElement('div');
    dropList.className = 'dd-list';
    function pick(i) {
      shDirty = true;
      if (fpsState === 'select' || fpsState === 'fly' || fpsState === 'stand') {
        if (fpsGeoCoarse) {
          earthB.m.geometry = fpsGeoCoarse;
          fpsGeoCoarse = null;
        }
        if (earthB._savedCastShadow !== undefined) {
          earthB.m.castShadow = earthB._savedCastShadow;
          delete earthB._savedCastShadow;
        }
        fpsAnchorLocal = null;
        spI = fpsSavedSpI;
        setSettingsEnabled(true);
        fpsInfoRestore();
        document.body.classList.remove('fps-select', 'fps-stand');
        fpsState = 'off';
      }
      const b = targets[i];
      ci = i;
      off.copy(tgv).sub(wpos(b));
      cur = b;
      spinRef = objSpin(b);
      const _q = objTiltQ(b);
      if (_q) curTiltQ.copy(_q);
      else curTiltQ.identity();
      dd =
        b.d ||
        (b.isSun
          ? real
            ? sunBaseScale * 3.5
            : 100
          : b.isMoon
            ? real
              ? b.r * 8
              : b.r * 7 + 6
            : b.r * (real ? 5 : 7) + (real ? Math.min(6, b.r * 8) : 6));
      dropBtn.innerHTML = b.n + ' <span class="tri">▲</span>';
      dropList.querySelectorAll('.dd-item').forEach((el, j) => el.classList.toggle('on', j === i));
      clearLabels();
      refreshOrbitLines();
      const pb = b.isMoon ? b.parent : b;
      if (pb.mo && pb.mo.length) {
        pb.mo.forEach(p => {
          const ml = makeLabel(p.userData.name, true);
          labels.push({ el: ml, obj: p.children[0], isMoon: true });
        });
      }
      venCtl.classList.toggle('show', !b.isMoon && b.k === 'ven');
      showInfo(b);
      enforceSpeedLimit();
      updateFpsBtn();
    }
    dropBtn.innerHTML = 'Обзор <span class="tri">▲</span>';
    const hd = t => {
      const e = document.createElement('div');
      e.className = 'dd-head';
      e.textContent = t;
      return e;
    };
    const fp = bodies.find(b => !b.isRoot && !b.isSun && !b.dw),
      fd = bodies.find(b => b.dw);
    targets.forEach((b, i) => {
      if (b === fp) dropList.append(hd('Планеты'));
      if (b === fd) dropList.append(hd('Карликовые планеты'));
      const item = document.createElement('button');
      item.className = 'dd-item' + (b.isMoon ? ' moon' : '');
      if (b.isMoon) {
        const bl = document.createElement('span');
        bl.className = 'bl';
        bl.textContent = '•';
        const it = document.createElement('i');
        it.textContent = b.n;
        item.append(bl, it);
      } else item.textContent = b.n;
      item.onclick = e => {
        e.stopPropagation();
        pick(i);
        drop.classList.remove('open');
      };
      dropList.append(item);
    });
    dropBtn.onclick = e => {
      e.stopPropagation();
      drop.classList.toggle('open');
      if (drop.classList.contains('open')) {
        setMenu.classList.remove('open');
        setBtn.classList.remove('open');
        const on = dropList.querySelector('.dd-item.on');
        if (on) on.scrollIntoView({ block: 'center' });
      }
    };
    drop.append(dropBtn, dropList);
    bar.append(drop);
    document.addEventListener('click', () => drop.classList.remove('open'));
    {
      const fsBtn = document.createElement('button');
      fsBtn.id = 'fsBtn';
      fsBtn.title = 'Полноэкранный режим';
      const fsEnter = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`;
      const fsExit = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>`;
      fsBtn.innerHTML = fsEnter;
      fsBtn.style.marginLeft = 'auto';
      fsBtn.onclick = () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.() ||
            document.documentElement.webkitRequestFullscreen?.();
        } else {
          document.exitFullscreen?.() || document.webkitExitFullscreen?.();
        }
      };
      document.addEventListener('fullscreenchange', () => {
        fsBtn.innerHTML = document.fullscreenElement ? fsExit : fsEnter;
      });
      document.addEventListener('webkitfullscreenchange', () => {
        fsBtn.innerHTML = document.fullscreenElement ? fsExit : fsEnter;
      });
      bar.append(fsBtn);
    }
    apply();
    pick(0);
    enforceSpeedLimit();
    console.log('[phase] ready');
    function loop(now) {
      requestAnimationFrame(loop);
      PROF.begin(now);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      _fFrames++;
      const _fElapsed = now - _fLast;
      if (_fElapsed >= 500) {
        fpsEl.textContent = Math.round((_fFrames * 1000) / _fElapsed) + ' FPS · ' + Q_LABEL;
        _fFrames = 0;
        _fLast = now;
      }
      const s = SPEEDS[spI];
      const _wn = Date.now(),
        _wdt = Math.max(0, (_wn - _wallLast) / 1000);
      _wallLast = _wn;
      tm += (spI === 6 ? _wdt : dt) * s;
      sunM.rotation.y += (dt * s * (2 * PI)) / 25.05;
      const M = SUN_GLOW_BASE;
      if (real) {
        glow.material.opacity = Math.min(1, (0.95 + 0.05 * Math.sin(now / 600)) * M);
        gl2.material.opacity = Math.min(1, (0.88 + 0.05 * Math.sin(now / 700)) * M);
        gl3.material.opacity = Math.min(1, (0.5 + 0.05 * Math.sin(now / 800)) * M);
        gl4.material.opacity = Math.min(1, (0.28 + 0.04 * Math.sin(now / 900)) * M);
        gl5.material.opacity = Math.min(1, (0.15 + 0.03 * Math.sin(now / 1100)) * M);
      } else {
        glow.material.opacity = Math.min(1, (0.85 + 0.1 * Math.sin(now / 600)) * M);
        gl2.material.opacity = Math.min(1, 0.55 * M);
        gl3.material.opacity = Math.min(1, (0.28 + 0.04 * Math.sin(now / 900)) * M);
        gl4.material.opacity = Math.min(1, (0.16 + 0.03 * Math.sin(now / 1000)) * M);
        gl5.material.opacity = Math.min(1, (0.09 + 0.02 * Math.sin(now / 1200)) * M);
      }
      {
        const distSun = C.position.distanceTo(sunM.position);
        const minPx = 3;
        const minAng = (minPx * ((C.fov * PI) / 180)) / innerHeight;
        const sunRvis = Math.max(sunBaseScale, distSun * minAng * 0.5);
        sunM.scale.setScalar(sunRvis);
        const refDist = real ? AU_TO_UNITS * 3 : 40;
        const grow = 1 + Math.min(distSun / refDist, 2);
        const glFarScale = Math.max(sunM.scale.x * 1.5, distSun * 0.04 * grow);
        glFar.scale.set(glFarScale, glFarScale, 1);
        const bBase = real ? 0.38 : 0.26;
        const bMul = 1 + Math.min(distSun / refDist, 2);
        const pulse = (real ? 0.06 : 0.04) * Math.sin(now / 700);
        glFar.material.opacity = Math.max(0, Math.min(1, (bBase * bMul + pulse) * M));
      }
      place();
      for (const b of bodies) {
        if (b.ln) b.ln.visible = orbitsVisible && b.k !== 'cer';
      }
      updateLocalOrbit();
      for (const b of bodies) {
        if (b.isRoot || b.isSun) continue;
        const rc = (2 * PI) / (ROT_DAYS[b.k] || 1);
        b.m.rotation.y += dt * s * rc;
        if (b === earthB) b.m.rotation.y = earthSpinAngle(tm);
        if (b.cloudsMesh) b.cloudsMesh.rotation.y = b.m.rotation.y * 1.06 + 0.7;
        if (b.vatm) b.vatm.rotation.y = b.m.rotation.y * 1.15 + 0.3;
        for (const p of b.mo)
          p.rotation.y =
            b === earthB && p.userData.name === 'Луна'
              ? moonRotY(tm)
              : p.userData.ph + (tm * (2 * PI)) / p.userData.orbPeriod;
        if (b.ringMesh) b.ringMesh.rotation.z += dt * s * 0.08;
      }
      if (!real) {
        belts.forEach((bt, k) => {
          bt.rotation.y = tm * bt.userData.w;
          bms[k].rotation.y = bt.rotation.y;
        });
        kbs.forEach(k => {
          k.rotation.y = tm * k.userData.w;
        });
      }
      {
        const camAU = C.position.length() / AU_TO_UNITS;
        if (!real) {
          belts.forEach((bt, k) => {
            bms[k].material.opacity = 0.36;
          });
          kbs.forEach((kb, k) => {
            kb.material.opacity = 0.48;
          });
        } else {
          belts.forEach((bt, k) => {
            const dAU = Math.abs(camAU - BC[k].c);
            const fade = Math.max(0.05, Math.min(1, 1 - (dAU - 3) / 17));
            bms[k].material.opacity = 0.36 * fade;
          });
          kbs.forEach((kb, k) => {
            const dAU = Math.abs(camAU - KC[k].c);
            const fade = Math.max(0.05, Math.min(1, 1 - (dAU - 3) / 17));
            kb.material.opacity = 0.48 * fade;
          });
        }
      }
      {
        const fovTan = Math.tan((C.fov * PI) / 360);
        for (const b of bodies) {
          if (b.isRoot || b.isSun || b.isMoon) continue;
          if (!b.m) continue;
          if (real) {
            const dCam = C.position.distanceTo(b.g.position);
            const pixDiam = dCam > 0.01 ? (innerHeight * b.r) / (dCam * fovTan) : 1e9;
            if (b.baseMScale) {
              const minMul = pixDiam > 0.01 ? Math.max(1, minPix / pixDiam) : 1;
              b.m.scale.set(b.baseMScale.x * minMul, b.baseMScale.y * minMul, b.baseMScale.z * minMul);
            }
            if (b.dot) {
              const fade = 1 - _sstep(1, 6, pixDiam);
              if (fade > 0.01 && dCam > 0.01) {
                const dotUnit = (2 * dCam * fovTan * dotPxTarget) / innerHeight;
                b.dot.scale.set(dotUnit, dotUnit, 1);
                b.dot.material.opacity = fade * 0.85;
                b.dot.visible = true;
              } else {
                b.dot.visible = false;
                b.dot.material.opacity = 0;
              }
            }
          } else {
            if (b.baseMScale) b.m.scale.copy(b.baseMScale);
            if (b.dot) {
              b.dot.visible = false;
              b.dot.material.opacity = 0;
            }
          }
        }
      }
      off.multiplyScalar(Math.exp(-dt * 4));
      tgv.copy(wpos(cur)).add(off);
      dist += (dd - dist) * Math.min(1, dt * 6);
      smoothTiltQ.slerp(curTiltQ, Math.min(1, dt * 4));
      camMix += (camMode - camMix) * Math.min(1, dt * 3);
      if (camMix >= 0.999) appliedQ.copy(smoothTiltQ);
      else if (camMix <= 0.001) appliedQ.copy(qId);
      else {
        appliedQ.copy(qId).slerp(smoothTiltQ, camMix);
      }
      const thSpin = th + normalizeAngle(objSpin(cur) - spinRef) * camMix;
      const sp0 = Math.sin(ph),
        cp0 = Math.cos(ph);
      camOff.set(dist * sp0 * Math.sin(thSpin), dist * cp0, dist * sp0 * Math.cos(thSpin));
      camOff.applyQuaternion(appliedQ);
      C.position.set(tgv.x + camOff.x, tgv.y + camOff.y, tgv.z + camOff.z);
      C.up.set(0, 1, 0).applyQuaternion(appliedQ);
      C.lookAt(tgv);
      gyroApply(dt);
      if (fpsState === 'fly' || fpsState === 'stand') {
        computeFpsPose(_fpsTargetPos, _fpsTargetQuat);
        if (fpsState === 'fly') {
          const _t = Math.min(1, (now - fpsFlyStart) / 3000);
          const _e = _t * _t * (3 - 2 * _t);
          C.position.lerpVectors(fpsFlyFromPos, _fpsTargetPos, _e);
          C.quaternion.copy(fpsFlyFromQuat).slerp(_fpsTargetQuat, _e);
          if (_t >= 1) fpsState = 'stand';
        } else {
          C.position.copy(_fpsTargetPos);
          C.quaternion.copy(_fpsTargetQuat);
        }
        C.near = Math.max(earthB.m.scale.x * fpsHRel * 0.5, 1e-7);
        C.far = 60000;
        C.updateProjectionMatrix();
      } else if (fpsState === 'exit') {
        const _tp = C.position.clone(),
          _tq = C.quaternion.clone();
        const _t = Math.min(1, (now - fpsExitStart) / 900);
        const _e = _t * _t * (3 - 2 * _t);
        C.position.lerpVectors(fpsFlyFromPos, _tp, _e);
        C.quaternion.copy(fpsFlyFromQuat).slerp(_tq, _e);
        C.near = Math.max(dist * 0.004, 0.0005);
        C.far = 1e8;
        C.updateProjectionMatrix();
        if (_t >= 1) {
          fpsState = 'off';
          finishFpsExit();
        }
      } else {
        C.near = Math.max(dist * 0.004, 0.0005);
        C.far = 1e8;
        C.updateProjectionMatrix();
      }
      sky.scale.setScalar(Math.max(1, dist / 1000));
      sky.position.copy(C.position);
      SkyW.update();
      skySync();
      glow.position.copy(sunM.position);
      gl2.position.copy(sunM.position);
      gl3.position.copy(sunM.position);
      gl4.position.copy(sunM.position);
      gl5.position.copy(sunM.position);
      glFar.position.copy(sunM.position);
      C.updateMatrixWorld();
      C.matrixWorldInverse.copy(C.matrixWorld).invert();
      earthU.uSunV.value
        .copy(earthB.g.position)
        .negate()
        .normalize()
        .transformDirection(C.matrixWorldInverse);
      if (skySphere) {
        const U = skySphere.userData.uni;
        if (real) {
          const camR = C.position.length() / AU_TO_UNITS;
          const t = Math.min(camR / SKY_REF, 1);
          const gamma = 1 + SKY_K * (1 - t);
          const amp = SKY_SUN_A + (SKY_FAR_A - SKY_SUN_A) * t;
          U.uBright.value = Math.max(0, amp);
          U.uLinear.value = 1;
          U.uSkyGamma.value = gamma;
        } else {
          U.uBright.value = Math.max(0.01, SIM_SKY_BRIGHT);
          U.uLinear.value = 0;
          U.uSkyGamma.value = 1;
        }
      }
      let sOf = null;
      {
        if (real) {
          sOf = pos => Math.min(1e4, Math.pow(1 / Math.max(0.02, pos / AU_TO_UNITS), 0.5));
        }
        if (real || wasP) {
          const sc = (mat, s) => {
            if (!mat) return;
            const u = mat.userData,
              c0 = u.c0 || (u.c0 = mat.color.clone());
            mat.color.copy(c0).multiplyScalar(s);
            if (!mat.emissiveMap) {
              if (u.e0 === undefined) u.e0 = mat.emissiveIntensity;
              mat.emissiveIntensity = u.e0 * s;
            }
          };
          for (const b of bodies) {
            if (!b.m) continue;
            const s = real ? sOf(b.g.position.length()) : 1;
            sc(b.m.material, s);
            if (b.cloudsMesh) sc(b.cloudsMesh.material, s);
            if (b.vatm) sc(b.vatm.material, s);
            if (b.ringMesh) sc(b.ringMesh.material, s);
            for (const p of b.mo) sc(p.children[0].material, s);
          }
          belts.forEach((bt, k) => sc(bt.material, real ? sOf(BC[k].c * AU_TO_UNITS) : 1));
          wasP = real;
        }
      }
      for (const b of bodies) {
        if (!b.atm) continue;
        const U = b.atm.material.uniforms;
        U.uI.value =
          b.atm.userData.I0 *
          (real
            ? sOf(b.g.position.length())
            : Math.max(0, 1 - b.g.position.length() / sunLight.distance) / sunLight.userData.fm);
        const ta = (-b.tilt * PI) / 180;
        U.uC.value.copy(C.position).sub(b.g.position).divideScalar(b.atm.scale.x).applyAxisAngle(ZA, ta);
        U.uS.value.copy(b.g.position).negate().normalize().applyAxisAngle(ZA, ta);
      }
      for (const b of bodies) {
        if (!b.ringU || !b.ringMesh) continue;
        const R = b.ringU;
        R.uSun.value.copy(b.g.position).negate();
        R.uA.value = b.m.scale.x;
        R.uCc.value = b.m.scale.y;
        R.uS.value = b.ringMesh.scale.x;
      }
      lodUpdate();
      document.body.classList.toggle('fps-on', fpsState !== 'off');
      document.body.classList.toggle('fps-sky', fpsState === 'fly' || fpsState === 'stand');
      SkyW.groundSync();
      PROF.r0();
      renderer.render(S, C);
      PROF.r1();
      PROF.m(0);
      updateLabels();
      PROF.m(1);
      updateHorizonLabels();
      PROF.m(2);
      SkyW.labels();
      PROF.end();
    }
    /*GYRO-BEGIN*/
    /* --- определение устройства и управление поворотом телефона (гироскоп), как «режим датчиков» в Stellarium --- */
    const DEVICE = (() => {
      const ua = navigator.userAgent || '',
        uad = navigator.userAgentData,
        pts = navigator.maxTouchPoints || 0;
      const iPadOS = /Macintosh/.test(ua) && pts > 1;
      const tablet = /iPad|Tablet/i.test(ua) || iPadOS || (/Android/i.test(ua) && !/Mobile/i.test(ua));
      const phone = !tablet && (uad && typeof uad.mobile === 'boolean' ? uad.mobile : /Android|iPhone|iPod|Mobi/i.test(ua));
      const forced = (location.hash.match(/[#&]device=(phone|tablet|desktop)/) || [])[1];
      const kind = forced || (tablet ? 'tablet' : phone ? 'phone' : 'desktop');
      return {
        kind,
        isPhone: kind === 'phone',
        isTablet: kind === 'tablet',
        mobile: kind !== 'desktop',
        touch: pts > 0,
        sensors: typeof DeviceOrientationEvent !== 'undefined',
      };
    })();
    console.log('[device]', JSON.stringify(DEVICE));
    const wrapPi = a => {
      a = (a + PI) % (2 * PI);
      if (a < 0) a += 2 * PI;
      return a - PI;
    };
    /* углы датчика (W3C: alpha, beta, gamma, градусы) и поворот экрана → оси камеры в системе Восток-Север-Зенит:
       right — вправо по экрану, up — вверх по экрану, f — направление взгляда («в экран») */
    function orientBasis(aD, bD, gD, sD) {
      const r = PI / 180,
        a = aD * r,
        b = bD * r,
        g = gD * r,
        s = sD * r;
      const ca = Math.cos(a),
        sa = Math.sin(a),
        cb = Math.cos(b),
        sb = Math.sin(b),
        cg = Math.cos(g),
        sg = Math.sin(g);
      /* оси устройства в ВСЗ: X — вправо, Y — вверх по экрану, Z — из экрана; R = Rz(a)·Rx(b)·Ry(g) */
      const X = [ca * cg - sa * sb * sg, sa * cg + ca * sb * sg, -cb * sg],
        Y = [-sa * cb, ca * cb, sb],
        Z = [ca * sg + sa * sb * cg, sa * sg - ca * sb * cg, cb * cg];
      const cs = Math.cos(s),
        sn = Math.sin(s);
      return {
        f: [-Z[0], -Z[1], -Z[2]],
        up: [X[0] * sn + Y[0] * cs, X[1] * sn + Y[1] * cs, X[2] * sn + Y[2] * cs],
        right: [X[0] * cs - Y[0] * sn, X[1] * cs - Y[1] * sn, X[2] * cs - Y[2] * sn],
      };
    }
    /* азимут (от севера к востоку), высота и крен вида по направлению взгляда f и верху экрана up */
    function viewFromBasis(f, up) {
      const yaw = Math.atan2(f[0], f[1]),
        pitch = Math.asin(Math.max(-1, Math.min(1, f[2])));
      /* крен: угол от «горизонтального верха» до верха экрана вокруг направления взгляда */
      let lu = [-f[0] * f[2], -f[1] * f[2], 1 - f[2] * f[2]];
      const ln = Math.hypot(lu[0], lu[1], lu[2]);
      let roll = 0;
      if (ln > 1e-4) {
        lu = [lu[0] / ln, lu[1] / ln, lu[2] / ln];
        const cr = [lu[1] * up[2] - lu[2] * up[1], lu[2] * up[0] - lu[0] * up[2], lu[0] * up[1] - lu[1] * up[0]];
        roll = Math.atan2(cr[0] * f[0] + cr[1] * f[1] + cr[2] * f[2], lu[0] * up[0] + lu[1] * up[1] + lu[2] * up[2]);
      }
      return { yaw, pitch, roll };
    }
    function orientToView(aD, bD, gD, sD) {
      const B = orientBasis(aD, bD, gD, sD);
      return viewFromBasis(B.f, B.up);
    }
    /*GYRO-END*/
    /* --- фильтр ориентации: адаптивное сглаживание (в покое — сильное, убирает дрожь рук; при быстром повороте — слабое, чтобы не отставать) --- */
    /*GYRO-FILTER-BEGIN*/
    const _gy = (typeof location !== 'undefined' ? location.hash : '').match(/[#&]gy=([\d.]+),([\d.]+),([\d.]+)/);
    const GY_FCMIN = _gy ? +_gy[1] : 1.2 /* Гц: частота среза в покое (было 0.8 — вид «желейный») */,
      GY_BETA = _gy ? +_gy[2] : 8.0 /* Гц на рад/с: насколько срез растёт со скоростью поворота */,
      GY_FLOOR = _gy ? +_gy[3] : 0.6 /* рад/с: «шум» скорости, который не считаем движением */,
      GY_FCD = 1.0, /* Гц: сглаживание оценки скорости */
      GY_PMAX = 1.553; /* рад (~89°): предел наклона вида; раньше 1.5 давало до ~4° ошибки направления у самого зенита */
    const gyro = { on: false, starting: false, have: false, abs: false, absEvt: false, settled: false, firstT: 0, glideUntil: 0, absWarn: 0, haveTimer: 0, needCal: false, offs: 0, iosOff: 0, hasQ: false, lastT: 0, dv: 0 };
    gyro.fq = new TH.Quaternion(); /* сглаженная ориентация камеры (оси: x вправо, y вверх, z назад) в системе ВСЗ */
    gyro.lastQ = new TH.Quaternion();
    const _gM = new TH.Matrix4(),
      _gR = new TH.Vector3(),
      _gU = new TH.Vector3(),
      _gB = new TH.Vector3(),
      _gTq = new TH.Quaternion();
    function gyroFeed(a, b, g, s, tSec) {
      const B = orientBasis(a, b, g, s);
      _gR.fromArray(B.right);
      _gU.fromArray(B.up);
      _gB.set(-B.f[0], -B.f[1], -B.f[2]);
      _gTq.setFromRotationMatrix(_gM.makeBasis(_gR, _gU, _gB));
      if (!gyro.hasQ) {
        gyro.fq.copy(_gTq);
        gyro.lastQ.copy(_gTq);
        gyro.lastT = tSec;
        gyro.dv = 0;
        gyro.hasQ = true;
        return;
      }
      if (tSec - gyro.lastT > 0.5) {
        /* долгая пауза в событиях — начинаем заново с текущего положения */
        gyro.fq.copy(_gTq);
        gyro.lastQ.copy(_gTq);
        gyro.lastT = tSec;
        gyro.dv = 0;
        return;
      }
      const dt = Math.max(1e-3, tSec - gyro.lastT);
      gyro.lastT = tSec;
      const ang = 2 * Math.acos(Math.min(1, Math.abs(gyro.lastQ.dot(_gTq)))); /* угол между соседними отсчётами */
      const sp = Math.max(0, ang / dt - GY_FLOOR); /* скорость поворота за вычетом шума датчика */
      gyro.dv += (1 / (1 + 1 / (2 * Math.PI * GY_FCD) / dt)) * (sp - gyro.dv); /* сглаженная скорость, рад/с */
      const fc = GY_FCMIN + GY_BETA * gyro.dv,
        k = 1 / (1 + 1 / (2 * Math.PI * fc) / dt);
      gyro.fq.slerp(_gTq, k);
      gyro.lastQ.copy(_gTq);
    }
    /* углы вида из сглаженной ориентации */
    const _gF = new TH.Vector3(),
      _gUp = new TH.Vector3();
    function gyroView() {
      _gF.set(0, 0, -1).applyQuaternion(gyro.fq);
      _gUp.set(0, 1, 0).applyQuaternion(gyro.fq);
      return viewFromBasis([_gF.x, _gF.y, _gF.z], [_gUp.x, _gUp.y, _gUp.z]);
    }
    /*GYRO-FILTER-END*/
    const screenAngle = () =>
      screen.orientation && typeof screen.orientation.angle === 'number' ? screen.orientation.angle : window.orientation || 0;
    const toastEl = document.createElement('div');
    toastEl.id = 'toast';
    document.body.append(toastEl);
    let toastT = 0;
    function toast(msg) {
      toastEl.textContent = msg;
      toastEl.classList.add('show');
      clearTimeout(toastT);
      toastT = setTimeout(() => toastEl.classList.remove('show'), 2800);
    }
    const gyroBtn = document.createElement('button');
    gyroBtn.id = 'gyroBtn';
    gyroBtn.type = 'button';
    gyroBtn.title = 'Управление гироскопом';
    gyroBtn.innerHTML =
      '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="4" width="8" height="16" rx="2"/><path d="M4.5 9a9 9 0 0 0 0 6M19.5 9a9 9 0 0 1 0 6"/></svg>';
    setBtn.insertAdjacentElement('afterend', gyroBtn);
    document.body.classList.toggle('has-gyro', (DEVICE.mobile && DEVICE.sensors) || /[#&]gyro\b/.test(location.hash));
    /* Компас телефона (deviceorientationabsolute на Android, webkitCompassHeading на iOS) отсчитывает от МАГНИТНОГО севера, а небо в приложении — по истинному.
       Поправка = магнитное склонение в точке наблюдателя (WMM2025, js/geomag.js); для центральной Украины около +8° (восточное).
       #decl=градусы — задать вручную, #decl=0 — выключить поправку. */
    const _dm = location.hash.match(/[#&]decl=(-?[\d.]+)/),
      DECL_FORCED = _dm ? +_dm[1] * DEG : null;
    let _declP = [NaN, NaN, NaN],
      _declVal = 0;
    function magDecl() {
      if (DECL_FORCED !== null) return DECL_FORCED;
      const p = fpsAnchorLocal;
      if (!p || !window.SW_GEOMAG) return 0;
      if (p.x !== _declP[0] || p.y !== _declP[1] || p.z !== _declP[2]) {
        _declP = [p.x, p.y, p.z];
        const ll = anchorToLatLon(p);
        _declVal = SW_GEOMAG.declination(ll[0] / DEG, ll[1] / DEG) * DEG;
        console.log('[gyro] magnetic declination', (_declVal / DEG).toFixed(2) + '°');
      }
      return _declVal;
    }
    /* появился абсолютный север: фильтр стартует заново, вид плавно «довернётся» к настоящему направлению */
    function setAbs() {
      if (gyro.abs) return;
      gyro.abs = true;
      gyro.offs = magDecl();
      gyro.needCal = false;
      gyro.hasQ = false;
      gyro.glideUntil = performance.now() + 900;
      clearTimeout(gyro.absWarn);
    }
    function onAbs(e) {
      if (e.alpha == null || e.beta == null || e.gamma == null) return;
      gyro.absEvt = true; /* дальше относительные события deviceorientation игнорируем */
      setAbs();
      gyroFeed(e.alpha, e.beta, e.gamma, screenAngle(), (e.timeStamp || performance.now()) / 1000);
      if (!gyro.have) gyro.firstT = performance.now();
      gyro.have = true;
    }
    function onRel(e) {
      if (gyro.absEvt || e.alpha == null || e.beta == null || e.gamma == null) return;
      let a = e.alpha;
      if (e.absolute === true) {
        setAbs(); /* Firefox и часть браузеров отдают абсолютный курс прямо в deviceorientation */
      } else if (typeof e.webkitCompassHeading === 'number') {
        const acc = e.webkitCompassAccuracy; /* iOS: до калибровки компаса курс скачет ±30–60° */
        if (!(typeof acc === 'number' && (acc < 0 || acc > 25))) {
          a = 360 - e.webkitCompassHeading;
          gyro.iosOff = a - e.alpha; /* привязка относительного alpha к северу */
          setAbs();
        } else if (gyro.abs) a = e.alpha + gyro.iosOff; /* компас временно плох — держим последнюю привязку, а не подставляем alpha из другой системы отсчёта (вид «прыгнул» бы) */
      }
      gyroFeed(a, e.beta, e.gamma, screenAngle(), (e.timeStamp || performance.now()) / 1000);
      if (!gyro.have) gyro.firstT = performance.now();
      gyro.have = true;
    }
    async function gyroStart() {
      if (gyro.on || gyro.starting || (fpsState !== 'stand' && fpsState !== 'fly')) return;
      if (typeof DeviceOrientationEvent === 'undefined') return toast(TR('Датчики ориентации недоступны'));
      if (!window.isSecureContext) return toast(TR('Для датчиков нужен https'));
      gyro.starting = true; /* защита от второго тапа, пока открыт запрос разрешения */
      try {
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
          const r = await DeviceOrientationEvent.requestPermission();
          if (r !== 'granted') return toast(TR('Нет доступа к датчикам'));
        }
      } catch (err) {
        return toast(TR('Нет доступа к датчикам'));
      } finally {
        gyro.starting = false;
      }
      if (fpsState !== 'stand' && fpsState !== 'fly') return; /* пока шёл запрос, из режима вышли */
      gyro.on = true;
      gyro.iosOff = 0;
      gyro.have = false;
      gyro.abs = false;
      gyro.absEvt = false;
      gyro.settled = false;
      gyro.needCal = false;
      gyro.hasQ = false;
      window.addEventListener('deviceorientationabsolute', onAbs, true);
      window.addEventListener('deviceorientation', onRel, true);
      gyroBtn.classList.add('on');
      clearTimeout(gyro.absWarn);
      gyro.absWarn = setTimeout(() => {
        if (gyro.on && gyro.have && !gyro.abs) toast(TR('Нет компаса: вид продолжается от текущего направления'));
      }, 4000);
      clearTimeout(gyro.haveTimer);
      gyro.haveTimer = setTimeout(() => {
        if (gyro.on && !gyro.have) {
          gyroStop();
          toast(TR('Датчики ориентации недоступны'));
        }
      }, 3500);
    }
    function gyroStop() {
      window.removeEventListener('deviceorientationabsolute', onAbs, true);
      window.removeEventListener('deviceorientation', onRel, true);
      gyro.on = false;
      gyro.have = false;
      gyro.hasQ = false;
      clearTimeout(gyro.absWarn);
      clearTimeout(gyro.haveTimer);
      gyroBtn.classList.remove('on');
    }
    gyroBtn.onclick = e => {
      e.stopPropagation();
      e.preventDefault();
      if (gyro.on) gyroStop();
      else gyroStart();
    };
    function gyroApply(dt) {
      if (gyro.on && gyro.have && gyro.hasQ && (fpsState === 'stand' || fpsState === 'fly')) {
        /* ждём ~0,25 с после первого события: абсолютный курс (если он есть) успевает прийти до калибровки */
        if (!gyro.settled) {
          if (performance.now() - gyro.firstT < 250) return;
          gyro.settled = true;
          gyro.needCal = !gyro.abs;
        }
        const v = gyroView();
        if (gyro.abs) gyro.offs = magDecl(); /* с компасом сдвиг = склонение (меняется только при смене места наблюдателя) */
        if (gyro.needCal) {
          gyro.offs = wrapPi(fpsYaw - v.yaw); /* нет абсолютного севера — продолжаем от текущего направления взгляда */
          gyro.needCal = false;
        }
        const nearPole = Math.abs(v.pitch) > 1.2; /* у зенита/надира азимут и крен сильно «качаются» — здесь угол к углу не сглаживаем */
        const glide = performance.now() < gyro.glideUntil;
        const k = nearPole ? 1 : 1 - Math.exp(-Math.min(dt, 0.1) * (glide ? 6 : 40));
        fpsYaw += wrapPi(v.yaw + gyro.offs - fpsYaw) * k;
        fpsPitch += (Math.max(-GY_PMAX, Math.min(GY_PMAX, v.pitch)) - fpsPitch) * k;
        fpsRoll += wrapPi(v.roll - fpsRoll) * k;
      } else if (fpsRoll !== 0) {
        fpsRoll *= Math.exp(-Math.min(dt, 0.1) * 6);
        if (Math.abs(fpsRoll) < 1e-4) fpsRoll = 0;
      }
    }
    /* после возврата из фона датчик без компаса мог «уйти» — продолжаем от текущего вида; с компасом вид должен совпадать с реальностью */
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && gyro.on && !gyro.abs) gyro.needCal = true;
    });
    if (/[#&]test\b/.test(location.hash))
      window.SW_TEST = {
        orient: orientToView,
        view: () => ({ state: fpsState, yaw: fpsYaw, pitch: fpsPitch, roll: fpsRoll, gyro: gyro.on, have: gyro.have, abs: gyro.abs, absEvt: gyro.absEvt, settled: gyro.settled, offs: gyro.offs, declDeg: magDecl() / DEG, iosOff: gyro.iosOff, device: DEVICE }),
        /* базис местного горизонта и направления камеры в мировых координатах (для проверки) */
        basis: () => {
          if (!fpsAnchorLocal) return null;
          computeFpsPose(new TH.Vector3(), new TH.Quaternion());
          const q = _fpQ.clone();
          const N = _fpN.clone().applyQuaternion(q).toArray(),
            E = _fpE.clone().applyQuaternion(q).toArray(),
            U = fpsAnchorLocal.clone().applyQuaternion(q).toArray();
          C.updateMatrixWorld();
          const fwd = new TH.Vector3();
          C.getWorldDirection(fwd);
          const up = new TH.Vector3(0, 1, 0).applyQuaternion(C.quaternion);
          return { N, E, U, fwd: fwd.toArray(), up: up.toArray() };
        },
      };
    /*WARM-BEGIN*/
    /* Предзагрузка на экране загрузки: компилируем шейдеры для обоих состояний света (с тенями — упрощённый режим, без — реализм), заливаем текстуры в видеопамять и делаем один прогон с тенями,
   чтобы эти паузы не случались позже при первом показе объекта или смене режима. Отключение: #nopre (всё) или #nopretex (только текстуры). */
    async function warmup() {
      if (/[#&]nopre\b/.test(location.hash)) return;
      const t0 = performance.now(),
        info = {},
        castWas = sunLight.castShadow;
      try {
        const pc = () => (renderer.info.programs ? renderer.info.programs.length : 0),
          p0 = pc();
        let a = performance.now();
        for (const st of castWas ? [true, false] : [false, true]) {
          sunLight.castShadow = st;
          await prog(96, st ? 'Компиляция шейдеров…' : 'Компиляция шейдеров…');
          renderer.compile(S, C);
        }
        sunLight.castShadow = castWas;
        info.prog = pc() - p0;
        info.progMs = Math.round(performance.now() - a);
        if (!/[#&]nopretex\b/.test(location.hash)) {
          a = performance.now();
          const texs = new Set();
          S.traverse(o => {
            const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
            for (const m of ms) {
              for (const k in m) {
                const v = m[k];
                if (v && v.isTexture) texs.add(v);
              }
              if (m.uniforms)
                for (const k in m.uniforms) {
                  const v = m.uniforms[k] && m.uniforms[k].value;
                  if (v && v.isTexture) texs.add(v);
                }
            }
          });
          let last = performance.now(),
            n = 0;
          for (const tx of texs) {
            renderer.initTexture(tx);
            n++;
            if (performance.now() - last > 40) {
              await prog(98, 'Текстуры в видеопамять…');
              last = performance.now();
            }
          }
          info.tex = n;
          info.texMs = Math.round(performance.now() - a);
        }
        if (castWas) {
          a = performance.now();
          renderer.shadowMap.needsUpdate = true;
          renderer.render(S, C);
          info.shMs = Math.round(performance.now() - a);
        }
      } catch (e) {
        console.warn('[precompile] пропущено:', e);
      } finally {
        sunLight.castShadow = castWas;
      }
      shDirty = true;
      info.totalMs = Math.round(performance.now() - t0);
      console.log('[precompile]', JSON.stringify(info));
    }
    /*WARM-END*/
    await warmup();
    await prog(100, 'Готово');
    ld.classList.add('done');
    setTimeout(() => ld.remove(), 800);
    requestAnimationFrame(loop);
  } catch (e) {
    showError('[fatal] ' + ((e && e.message) || e));
    lt.textContent = TR('Ошибка загрузки:') + ' ' + ((e && e.message) || e);
    console.error(e);
  }
})();
