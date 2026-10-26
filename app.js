/* Standards Captain — clean-sheet demo (static, browser-only). */
(function () {
  'use strict';
  const { buildSeed, TEM_CODES } = window.SC_SEED;
  const KEY = 'standards-captain-demo-v1';
  const UIKEY = 'standards-captain-ui-v1';
  const app = document.getElementById('app');

  /* ---------- tiny sync SHA-256 (for the audit hash chain) ---------- */
  function sha256(ascii) {
    function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
    const maxWord = Math.pow(2, 32);
    let result = '';
    const words = [];
    const asciiBitLength = ascii.length * 8;
    const hash = [], k = [];
    let primeCounter = 0;
    const isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (let i = 0; i < 313; i += candidate) isComposite[i] = candidate;
        hash[primeCounter] = (Math.pow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    ascii += '\x80';
    while (ascii.length % 64 - 56) ascii += '\x00';
    for (let i = 0; i < ascii.length; i++) {
      const j = ascii.charCodeAt(i);
      if (j >> 8) return '';
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words.length] = ((asciiBitLength / maxWord) | 0);
    words[words.length] = (asciiBitLength);
    let H = hash.slice(0, 8);
    for (let j = 0; j < words.length;) {
      const w = words.slice(j, j += 16);
      const oldHash = H;
      H = H.slice(0, 8);
      for (let i = 0; i < 64; i++) {
        const w15 = w[i - 15], w2 = w[i - 2];
        const a = H[0], e = H[4];
        const temp1 = H[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & H[5]) ^ ((~e) & H[6])) + k[i] +
          (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
        const temp2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & H[1]) ^ (a & H[2]) ^ (H[1] & H[2]));
        H = [(temp1 + temp2) | 0].concat(H);
        H[4] = (H[4] + temp1) | 0;
        H.length = 8;
      }
      for (let i = 0; i < 8; i++) H[i] = (H[i] + oldHash[i]) | 0;
    }
    for (let i = 0; i < 8; i++) for (let j = 3; j + 1; j--) { const b = (H[i] >> (j * 8)) & 255; result += ((b < 16) ? 0 : '') + b.toString(16); }
    return result;
  }
  const utf8 = s => unescape(encodeURIComponent(s));

  /* ---------- helpers ---------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const todayStr = () => new Date().toISOString().slice(0, 10);
  const addDays = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 86400000);
  const fmtDate = d => d ? new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '—';
  const pct = (a, b) => b ? Math.round((a / b) * 100) : 0;
  const rid = p => p + '-' + Array.from(crypto.getRandomValues(new Uint8Array(4))).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  const quarterOf = period => { const [y, m] = period.split('-').map(Number); return y + ' Q' + (Math.floor((m - 1) / 3) + 1); };
  const allTem = [...TEM_CODES.threats, ...TEM_CODES.errors, ...TEM_CODES.states];
  const temLabel = c => (allTem.find(t => t.code === c) || { label: c }).label;

  /* ---------- state ---------- */
  let S, UI;
  let lastReceipt = null; // in memory only: never persist both record IDs together
  function load() {
    try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; }
    if (!S || S.schema !== 1) { S = buildSeed(todayStr()); audit('System', 'Demo data seeded', 'Fictional department, 14 pilots, 38 observations'); save(); }
    try { UI = JSON.parse(localStorage.getItem(UIKEY)) || {}; } catch (e) { UI = {}; }
    UI.role = UI.role || 'captain';
    UI.crewPilot = UI.crewPilot || 'P03';
    UI.filters = UI.filters || { fleet: 'All', version: 'All', period: '12' };
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(S)); localStorage.setItem(UIKEY, JSON.stringify(UI)); }
  function audit(actor, action, detail) {
    const prev = S.audit.length ? S.audit[S.audit.length - 1].hash : '0'.repeat(64);
    const ts = new Date().toISOString();
    const body = [prev, ts, actor, action, detail || ''].join('|');
    S.audit.push({ ts, actor, action, detail: detail || '', prev, hash: sha256(utf8(body)) });
  }
  function verifyChain() {
    let prev = '0'.repeat(64);
    for (let i = 0; i < S.audit.length; i++) {
      const a = S.audit[i];
      if (a.prev !== prev) return { ok: false, at: i };
      if (sha256(utf8([a.prev, a.ts, a.actor, a.action, a.detail].join('|'))) !== a.hash) return { ok: false, at: i };
      prev = a.hash;
    }
    return { ok: true, n: S.audit.length };
  }

  /* ---------- roles ---------- */
  const ROLES = {
    captain: { label: 'Standards Captain / Observer', actor: 'Standards Captain', nav: ['dashboard', 'personnel', 'schedule', 'observe', 'analysis', 'agenda', 'recognition', 'reports', 'about'] },
    crew: { label: 'Flight Crewmember', actor: 'Crewmember', nav: ['crew', 'recognition', 'about'] },
    committee: { label: 'Standards Committee / Safety Manager', actor: 'Safety Manager', nav: ['analysis', 'agenda', 'feedback', 'recognition', 'reports', 'about'] },
    management: { label: 'Management / Leadership', actor: 'Management', nav: ['reports', 'recognition', 'about'] },
    admin: { label: 'Administrator', actor: 'Administrator', nav: ['personnel', 'templates', 'settings', 'users', 'audit', 'about'] }
  };
  const VIEWS = {
    dashboard: { label: 'Dashboard', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
    personnel: { label: 'Personnel', icon: 'M16 11a4 4 0 10-4-4 4 4 0 004 4zm-8 0a3 3 0 10-3-3 3 3 0 003 3zm0 2c-2.7 0-8 1.3-8 4v3h8v-3c0-1 .4-2 1.1-2.8A12 12 0 008 13zm8 0c-2.7 0-8 1.3-8 4v3h16v-3c0-2.7-5.3-4-8-4z' },
    schedule: { label: 'Schedule', icon: 'M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zm0 16H5V9h14v11z' },
    observe: { label: 'Observe', icon: 'M9 2h6v2h3a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h3V2zm1 13l-3-3-1.4 1.4L10 17.8l8.4-8.4L17 8l-7 7z' },
    crew: { label: 'My observations', icon: 'M12 12a5 5 0 10-5-5 5 5 0 005 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z' },
    analysis: { label: 'Analysis', icon: 'M3 3v18h18v-2H5V3H3zm4 12h2v3H7v-3zm4-5h2v8h-2v-8zm4-4h2v12h-2V6z' },
    agenda: { label: 'Committee agenda', icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z' },
    feedback: { label: 'Manual feedback', icon: 'M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z' },
    recognition: { label: 'Recognition', icon: 'M12 17.3l6.2 3.7-1.6-7 5.4-4.7-7.1-.6L12 2 9.1 8.7 2 9.3l5.4 4.7-1.6 7z' },
    reports: { label: 'Management reports', icon: 'M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zm5.6 8H19v6h-2.8v-6z' },
    templates: { label: 'FOM templates', icon: 'M4 6H2v14a2 2 0 002 2h14v-2H4V6zm16-4H8a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z' },
    settings: { label: 'Settings', icon: 'M19.4 13a7.5 7.5 0 000-2l2.1-1.6-2-3.5-2.5 1a7.6 7.6 0 00-1.7-1L15 3h-4l-.4 2.7a7.6 7.6 0 00-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 000 2l-2.1 1.6 2 3.5 2.5-1a7.6 7.6 0 001.7 1L11 21h4l.4-2.7a7.6 7.6 0 001.7-1l2.5 1 2-3.5-2.2-1.8zM13 15.5a3.5 3.5 0 113.5-3.5 3.5 3.5 0 01-3.5 3.5z' },
    users: { label: 'Users & roles', icon: 'M12 1L3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5l-9-4z' },
    audit: { label: 'Audit log', icon: 'M13 3a9 9 0 00-9 9H1l4 4 4-4H6a7 7 0 112 4.9l-1.4 1.4A9 9 0 1013 3zm-1 5v5l4.3 2.5.7-1.2-3.5-2.1V8H12z' },
    about: { label: 'About this demo', icon: 'M11 7h2v2h-2V7zm0 4h2v6h-2v-6zm1-9a10 10 0 100 20 10 10 0 000-20z' }
  };
  const can = v => ROLES[UI.role].nav.includes(v) || (v === 'receipt' && UI.role === 'captain');
  const actor = () => ROLES[UI.role].actor;

  /* ---------- derived data ---------- */
  function pilotById(id) { return S.pilots.find(p => p.id === id); }
  function pilotStatus(p) {
    const done = S.completions.filter(c => c.crew.some(m => m.pilotId === p.id)).sort((a, b) => b.date.localeCompare(a.date));
    const last = done[0] ? done[0].date : null;
    const interval = S.settings.intervalDays[p.position] || 180;
    const nextDue = last ? addDays(last, interval) : S.seededAt;
    const d = daysBetween(todayStr(), nextDue);
    const sched = S.scheduled.find(s => s.crewIds.includes(p.id));
    let status = 'Current', cls = 'ok';
    if (d < 0) { status = 'Overdue'; cls = 'bad'; } else if (d <= S.settings.dueSoonDays) { status = 'Due soon'; cls = 'warn'; }
    return { last, nextDue, daysToDue: d, status, cls, count: done.length, history: done, sched };
  }
  function currentTemplate() { return S.templates.find(t => t.status === 'published'); }
  function tplByKey(k) { return S.templates.find(t => t.key === k); }
  function itemIndex() {
    const map = {};
    S.templates.slice().sort((a, b) => a.version.localeCompare(b.version, undefined, { numeric: true })).forEach(t =>
      t.sections.forEach(sec => sec.items.forEach(it => { map[it.id] = { text: it.text, fomRef: it.fomRef, section: sec.name, sectionId: sec.id }; })));
    return map;
  }
  function filteredPool(f) {
    f = f || UI.filters;
    const cutoff = f.period === 'all' ? '0000-00' : addDays(todayStr(), -Math.round(Number(f.period) * 30.4)).slice(0, 7);
    return S.performance.filter(r => (f.fleet === 'All' || r.fleet === f.fleet) && (f.version === 'All' || r.templateVersion === f.version) && r.period >= cutoff);
  }
  function itemStats(pool) {
    const idx = itemIndex();
    const m = {};
    pool.forEach(r => r.ratings.forEach(x => {
      if (!x.rating) return;
      const s = m[x.itemId] || (m[x.itemId] = { itemId: x.itemId, n: 0, sum: 0, low: 0, high: 0, tem: {}, fleets: {}, notes: [] });
      s.n++; s.sum += x.rating; if (x.rating <= 2) { s.low++; s.fleets[r.fleet] = (s.fleets[r.fleet] || 0) + 1; } if (x.rating === 4) s.high++;
      (x.tem || []).forEach(t => { s.tem[t] = (s.tem[t] || 0) + 1; });
      if (x.note) s.notes.push(x.note);
    }));
    return Object.values(m).map(s => Object.assign(s, idx[s.itemId] || { text: s.itemId, section: '—' }, { mean: s.sum / s.n, lowPct: pct(s.low, s.n), highPct: pct(s.high, s.n) }));
  }
  function sectionStats(pool) {
    const idx = itemIndex(), m = {};
    pool.forEach(r => r.ratings.forEach(x => {
      if (!x.rating) return;
      const sec = (idx[x.itemId] || {}).section || x.sectionId;
      const s = m[sec] || (m[sec] = { section: sec, n: 0, sum: 0, low: 0 });
      s.n++; s.sum += x.rating; if (x.rating <= 2) s.low++;
    }));
    return Object.values(m).map(s => Object.assign(s, { mean: s.sum / s.n, lowPct: pct(s.low, s.n) }));
  }
  function temStats(pool) {
    const th = {}, er = {};
    pool.forEach(r => {
      r.threats.forEach(t => { const s = th[t.code] || (th[t.code] = { code: t.code, n: 0, mis: 0 }); s.n++; if (!t.managed) s.mis++; });
      r.errors.forEach(e => { const s = er[e.code] || (er[e.code] = { code: e.code, n: 0, untrapped: 0 }); s.n++; if (!e.trapped) s.untrapped++; });
    });
    return { threats: Object.values(th).sort((a, b) => b.n - a.n), errors: Object.values(er).sort((a, b) => b.n - a.n) };
  }
  function coverage() {
    const ps = S.pilots.filter(p => p.active).map(pilotStatus);
    const current = ps.filter(s => s.status !== 'Overdue').length;
    return { total: ps.length, current, pct: pct(current, ps.length), overdue: ps.filter(s => s.status === 'Overdue').length, dueSoon: ps.filter(s => s.status === 'Due soon').length };
  }

  /* ---------- charts (inline SVG) ---------- */
  function barsH(rows, opts) {
    opts = opts || {};
    const max = opts.max || Math.max(1, ...rows.map(r => r.value));
    return '<div class="barsh">' + rows.map(r => `
      <div class="barsh-row">
        <div class="barsh-label" title="${esc(r.label)}">${esc(r.label)}</div>
        <div class="barsh-track"><div class="barsh-fill ${r.cls || ''}" style="width:${Math.max(2, (r.value / max) * 100)}%"></div></div>
        <div class="barsh-val">${esc(r.display != null ? r.display : r.value)}</div>
      </div>`).join('') + '</div>';
  }
  function columnChart(points, opts) {
    opts = opts || {};
    const W = 640, H = 200, P = 28;
    const max = opts.max || Math.max(1, ...points.map(p => p.value));
    const bw = (W - P * 2) / Math.max(1, points.length);
    let svg = `<svg viewBox="0 0 ${W} ${H + 24}" class="chart" role="img" aria-label="${esc(opts.label || 'chart')}">`;
    [0, 0.5, 1].forEach(f => { const y = H - f * (H - P); svg += `<line x1="${P}" x2="${W - P}" y1="${y}" y2="${y}" class="grid"/><text x="${P - 6}" y="${y + 4}" class="axis" text-anchor="end">${Math.round(max * f)}${opts.suffix || ''}</text>`; });
    points.forEach((p, i) => {
      const h = (p.value / max) * (H - P);
      const x = P + i * bw + bw * 0.18;
      svg += `<rect x="${x}" y="${H - h}" width="${bw * 0.64}" height="${Math.max(0, h)}" rx="3" class="${p.cls || 'col'}"><title>${esc(p.label)}: ${p.value}${opts.suffix || ''}</title></rect>`;
      svg += `<text x="${x + bw * 0.32}" y="${H + 16}" class="axis" text-anchor="middle">${esc(p.short || p.label)}</text>`;
      if (opts.showVal) svg += `<text x="${x + bw * 0.32}" y="${H - h - 5}" class="val" text-anchor="middle">${p.value}${opts.suffix || ''}</text>`;
    });
    return svg + '</svg>';
  }

  /* ---------- layout ---------- */
  function shell(view, inner) {
    const nav = ROLES[UI.role].nav.map(v => `<a href="#/${v}" class="nav-item ${view === v ? 'active' : ''}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${VIEWS[v].icon}"/></svg><span>${VIEWS[v].label}</span></a>`).join('');
    const awaiting = S.completions.filter(c => c.status !== 'Complete').length;
    return `
    <div class="layout">
      <aside class="sidebar" id="sidebar">
        <div class="brand">
          <svg viewBox="0 0 40 40" class="logo" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M20 6 L23 18 L34 20 L23 22 L20 34 L17 22 L6 20 L17 18 Z" fill="currentColor"/></svg>
          <div><div class="brand-name">Standards Captain</div><div class="brand-sub">${esc(S.settings.deptName)}</div></div>
        </div>
        <label class="role-switch"><span>Viewing as</span>
          <select id="roleSel">${Object.entries(ROLES).map(([k, r]) => `<option value="${k}" ${UI.role === k ? 'selected' : ''}>${r.label}</option>`).join('')}</select>
        </label>
        <nav class="nav">${nav}</nav>
        <div class="side-foot">
          <div class="regime">Part ${S.settings.part135 ? '91 + 135 module' : '91'} · IS-BAO</div>
          <div class="netstate" id="netstate"></div>
        </div>
      </aside>
      <div class="main">
        <header class="topbar">
          <button class="icon-btn menu-btn" id="menuBtn" aria-label="Open menu"><svg viewBox="0 0 24 24"><path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z"/></svg></button>
          <div class="demo-pill">Demo · fictional data · stored only in this browser</div>
          ${UI.role === 'captain' && awaiting ? `<a class="top-note" href="#/dashboard">${awaiting} awaiting crew attestation</a>` : ''}
        </header>
        <main class="content" id="content">${inner}</main>
      </div>
    </div>`;
  }
  function page(title, sub, body, actions) {
    return `<div class="page-head"><div><h1>${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div>${actions ? `<div class="head-actions">${actions}</div>` : ''}</div>${body}`;
  }
  const kpi = (label, value, note, cls) => `<div class="kpi ${cls || ''}"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div>${note ? `<div class="kpi-note">${note}</div>` : ''}</div>`;
  const chip = (t, cls) => `<span class="chip ${cls || ''}">${esc(t)}</span>`;
  const deid = '<span class="chip deid" title="Permanently de-identified dataset">De-identified</span>';
  const ident = '<span class="chip ident" title="Identifiable flight completion record">Identifiable</span>';

  /* ---------- views ---------- */
  function vDashboard() {
    const cov = coverage();
    const yr = S.completions.filter(c => daysBetween(c.date, todayStr()) <= 365).length;
    const awaiting = S.completions.filter(c => c.status !== 'Complete');
    const suggestions = S.pilots.map(p => ({ p, s: pilotStatus(p) })).filter(x => x.s.status !== 'Current' && !x.s.sched).sort((a, b) => a.s.daysToDue - b.s.daysToDue).slice(0, 6);
    const draft = S.draft;
    return page('Dashboard', 'Program status for the Standards Captain. Scheduling uses identifiable completion records only; performance data lives in a separate de-identified pool.', `
      ${draft ? `<div class="banner info"><strong>Observation in progress.</strong> Saved locally on this device (offline-safe). <a class="btn sm" href="#/observe/${esc(draft.schedId)}">Resume</a></div>` : ''}
      <div class="kpis">
        ${kpi('Observation coverage', cov.pct + '%', `${cov.current} of ${cov.total} pilots within interval`, cov.pct >= 85 ? 'good' : 'warn')}
        ${kpi('Overdue', cov.overdue, 'Pilots past next due date', cov.overdue ? 'bad' : '')}
        ${kpi('Due within ' + S.settings.dueSoonDays + ' days', cov.dueSoon, 'Plan these next')}
        ${kpi('Observations, last 12 months', yr, 'Flight completion records')}
      </div>
      <div class="grid2">
        <section class="card">
          <div class="card-head"><h2>Upcoming observations</h2><a class="btn sm ghost" href="#/schedule">Schedule</a></div>
          ${S.scheduled.length ? `<div class="list">${S.scheduled.map(s => `
            <div class="list-row">
              <div><div class="strong">${fmtDate(s.date)} · ${esc(s.fleet)} ${esc(s.tail)}</div><div class="muted">${esc(s.route)} · ${s.crewIds.map(id => esc(pilotById(id).name)).join(' / ')}</div></div>
              <a class="btn sm" href="#/observe/${s.id}">${draft && draft.schedId === s.id ? 'Resume' : 'Start'}</a>
            </div>`).join('')}</div>` : '<p class="empty">Nothing scheduled.</p>'}
        </section>
        <section class="card">
          <div class="card-head"><h2>Suggested next observations</h2><span class="muted sm">Based on configurable due dates</span></div>
          ${suggestions.length ? `<div class="list">${suggestions.map(x => `
            <div class="list-row">
              <div><div class="strong">${esc(x.p.name)} <span class="muted">${x.p.position} · ${x.p.quals.join(', ')}</span></div><div class="muted">Next due ${fmtDate(x.s.nextDue)}</div></div>
              <div class="row-end">${chip(x.s.status, x.s.cls)}<a class="btn sm ghost" href="#/schedule?pilot=${x.p.id}">Schedule</a></div>
            </div>`).join('')}</div>` : '<p class="empty">Everyone is current or already scheduled.</p>'}
        </section>
      </div>
      <section class="card">
        <div class="card-head"><h2>Awaiting crew attestation</h2>${ident}</div>
        ${awaiting.length ? `<div class="list">${awaiting.map(c => `
          <div class="list-row"><div><div class="strong">${fmtDate(c.date)} · ${esc(c.fleet)} ${esc(c.tail)} · ${esc(c.route)}</div>
          <div class="muted">${c.crew.map(m => `${esc(m.name)} ${m.attested ? '✓' : '(pending)'}`).join(' · ')}</div></div>
          <span class="muted sm">Switch to “Flight Crewmember” to attest</span></div>`).join('')}</div>` : '<p class="empty">All debriefs attested.</p>'}
      </section>`);
  }

  function vPersonnel(q) {
    const f = { fleet: q.fleet || 'All', status: q.status || 'All' };
    const fleets = ['All', ...new Set(S.pilots.flatMap(p => p.quals))];
    const rows = S.pilots.map(p => ({ p, s: pilotStatus(p) }))
      .filter(x => (f.fleet === 'All' || x.p.quals.includes(f.fleet)) && (f.status === 'All' || x.s.status === f.status))
      .sort((a, b) => a.s.daysToDue - b.s.daysToDue);
    const open = q.open;
    const p135 = S.settings.part135;
    return page('Personnel & scheduling status', 'Completion status only — no performance data is shown or stored here.', `
      <div class="filters">
        <label>Fleet <select data-q="fleet">${fleets.map(x => `<option ${f.fleet === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        <label>Status <select data-q="status">${['All', 'Overdue', 'Due soon', 'Current'].map(x => `<option ${f.status === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        <span class="muted sm">Interval: PIC ${S.settings.intervalDays.PIC} d · SIC ${S.settings.intervalDays.SIC} d (Settings)</span>
      </div>
      <div class="card flush"><div class="table-wrap"><table class="table">
        <thead><tr><th>Pilot</th><th>Position</th><th>Aircraft</th><th>Last observation</th><th>Next due</th><th>Status</th>${p135 ? '<th>Line check due (135)</th>' : ''}<th>History</th></tr></thead>
        <tbody>${rows.map(({ p, s }) => `
          <tr class="clickable" data-open="${p.id}">
            <td class="strong">${esc(p.name)}<div class="muted sm">${esc(p.employeeNo)}</div></td><td>${p.position}</td><td>${p.quals.join(', ')}</td>
            <td>${fmtDate(s.last)}</td><td>${fmtDate(s.nextDue)}<div class="muted sm">${s.daysToDue < 0 ? Math.abs(s.daysToDue) + ' d overdue' : 'in ' + s.daysToDue + ' d'}</div></td>
            <td>${chip(s.status, s.cls)}${s.sched ? ' ' + chip('Scheduled ' + fmtDate(s.sched.date), 'info') : ''}</td>
            ${p135 ? `<td>${fmtDate(p.lineCheckDue)} ${daysBetween(todayStr(), p.lineCheckDue) < 0 ? chip('Overdue', 'bad') : ''}</td>` : ''}
            <td>${s.count} ${open === p.id ? '▴' : '▾'}</td>
          </tr>
          ${open === p.id ? `<tr class="detail"><td colspan="${p135 ? 8 : 7}">
            <div class="hist-head">${ident} Completed observations for ${esc(p.name)} (completion status only)</div>
            ${s.history.length ? `<table class="table inner"><thead><tr><th>Date</th><th>Aircraft</th><th>Route</th><th>Observer</th><th>FOM version</th><th>Status</th></tr></thead><tbody>
              ${s.history.map(c => `<tr><td>${fmtDate(c.date)}</td><td>${esc(c.fleet)} ${esc(c.tail)}</td><td>${esc(c.route)}</td><td>${esc(c.observer)}</td><td>v${esc(c.templateVersion)} · ${esc(c.fomRev)}</td><td>${chip(c.status, c.status === 'Complete' ? 'ok' : 'warn')}</td></tr>`).join('')}
            </tbody></table>` : '<p class="empty">No observations yet.</p>'}
            ${UI.role === 'captain' ? `<a class="btn sm" href="#/schedule?pilot=${p.id}">Schedule observation</a>` : ''}
          </td></tr>` : ''}`).join('')}
        </tbody></table></div></div>`);
  }

  function vSchedule(q) {
    const fleets = [...new Set(S.pilots.flatMap(p => p.quals))];
    const pre = q.pilot ? pilotById(q.pilot) : null;
    const fleet = q.fleet || (pre ? pre.quals[0] : fleets[0]);
    const pics = S.pilots.filter(p => p.position === 'PIC' && p.quals.includes(fleet));
    const sics = S.pilots.filter(p => p.position === 'SIC' && p.quals.includes(fleet));
    const byDue = arr => arr.map(p => ({ p, s: pilotStatus(p) })).sort((a, b) => a.s.daysToDue - b.s.daysToDue);
    const picDef = pre && pre.position === 'PIC' ? pre.id : byDue(pics)[0].p.id;
    const sicDef = pre && pre.position === 'SIC' ? pre.id : byDue(sics)[0].p.id;
    const tails = [...new Set(S.completions.filter(c => c.fleet === fleet).map(c => c.tail))];
    const opt = (list, def) => byDue(list).map(({ p, s }) => `<option value="${p.id}" ${p.id === def ? 'selected' : ''}>${esc(p.name)} — ${s.status}${s.status !== 'Current' ? '' : ', due ' + fmtDate(s.nextDue)}</option>`).join('');
    return page('Schedule an observation', 'The crew pair is pre-filled with the pilots most due for this fleet. Adjust as needed.', `
      <div class="grid2">
        <form class="card form" id="schedForm">
          <h2>New observation</h2>
          <label>Fleet <select name="fleet" id="schedFleet">${fleets.map(x => `<option ${x === fleet ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
          <div class="two"><label>Date <input type="date" name="date" required value="${addDays(todayStr(), 3)}"></label>
          <label>Tail <input name="tail" required value="${esc(tails[0] || '')}" list="tailList"><datalist id="tailList">${tails.map(t => `<option>${t}</option>`).join('')}</datalist></label></div>
          <label>Route <input name="route" required placeholder="KTEB–KPBI" value="KTEB–KPBI"></label>
          <label>Pilot in command <select name="pic">${opt(pics, picDef)}</select></label>
          <label>Second in command <select name="sic">${opt(sics, sicDef)}</select></label>
          <label>Observer <input name="observer" required value="Capt. Dana Mercer (Standards)"></label>
          <button class="btn" type="submit">Add to schedule</button>
        </form>
        <section class="card">
          <h2>Scheduled</h2>
          ${S.scheduled.length ? `<div class="list">${S.scheduled.map(s => `
            <div class="list-row"><div><div class="strong">${fmtDate(s.date)} · ${esc(s.fleet)} ${esc(s.tail)}</div><div class="muted">${esc(s.route)} · ${s.crewIds.map(id => esc(pilotById(id).name)).join(' / ')}</div><div class="muted sm">${esc(s.observer)}</div></div>
            <div class="row-end"><a class="btn sm" href="#/observe/${s.id}">Start</a><button class="btn sm ghost" data-act="unsched" data-id="${s.id}">Remove</button></div></div>`).join('')}</div>` : '<p class="empty">Nothing scheduled.</p>'}
        </section>
      </div>`);
  }

  function vObservePicker() {
    return page('Observe', 'Choose a scheduled flight to begin. Drafts are saved on this device so entry works offline.', `
      <section class="card">${S.scheduled.length ? `<div class="list">${S.scheduled.map(s => `
        <div class="list-row"><div><div class="strong">${fmtDate(s.date)} · ${esc(s.fleet)} ${esc(s.tail)} · ${esc(s.route)}</div><div class="muted">${s.crewIds.map(id => esc(pilotById(id).name)).join(' / ')}</div></div>
        <a class="btn sm" href="#/observe/${s.id}">${S.draft && S.draft.schedId === s.id ? 'Resume' : 'Start'}</a></div>`).join('')}</div>` : `<p class="empty">Nothing scheduled. <a href="#/schedule">Schedule an observation</a>.</p>`}</section>`);
  }

  const STEPS = ['Flight & checklist version', 'Non-punitive pre-brief', 'Observation checklist', 'TEM & highlights', 'Debrief & submit'];
  function ensureDraft(sched) {
    if (!S.draft || S.draft.schedId !== sched.id) {
      if (S.draft && S.draft.schedId !== sched.id && !confirm('Another observation draft is in progress. Discard it and start this one?')) return false;
      S.draft = { schedId: sched.id, step: 0, templateKey: currentTemplate().key, prebrief: false, ratings: {}, threats: [], uas: 0, recognitions: '', opportunities: '', debrief: {}, duty: false, startedAt: new Date().toISOString() };
      audit(actor(), 'Observation started', `Schedule ${sched.id}`);
      save();
    }
    return true;
  }
  function identifiers(sched) {
    const ids = [];
    S.pilots.forEach(p => { ids.push(p.name); p.name.split(' ').forEach(n => { if (n.length > 2) ids.push(n); }); });
    S.completions.forEach(c => ids.push(c.tail)); ids.push(sched.tail);
    sched.route.split(/[–-]/).forEach(a => ids.push(a.trim()));
    return [...new Set(ids)].sort((a, b) => b.length - a.length);
  }
  function scrub(text, sched) {
    if (!text) return { text: '', hits: [] };
    let out = text; const hits = [];
    identifiers(sched).forEach(id => {
      const re = new RegExp('\\b' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
      if (re.test(out)) { hits.push(id); out = out.replace(re, '[redacted]'); }
    });
    const patterns = [/\bN\d{1,5}[A-Z]{0,2}\b/g, /\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g, /\b20\d\d-\d\d-\d\d\b/g, /\b(flight|trip)\s*#?\s*\d{2,5}\b/gi];
    patterns.forEach(re => { const m = out.match(re); if (m) { hits.push(...m); out = out.replace(re, '[redacted]'); } });
    return { text: out, hits };
  }

  function vObserve(id) {
    const sched = S.scheduled.find(s => s.id === id);
    if (!sched) return page('Observation not found', '', '<p class="empty">This scheduled flight no longer exists. <a href="#/observe">Back</a></p>');
    if (!ensureDraft(sched)) { location.hash = '#/observe'; return ''; }
    const d = S.draft;
    const tpl = tplByKey(d.templateKey);
    const crew = sched.crewIds.map(pilotById);
    const stepper = `<ol class="stepper">${STEPS.map((s, i) => `<li class="${i === d.step ? 'cur' : i < d.step ? 'done' : ''}"><button data-act="step" data-step="${i}" ${i > d.step + 1 ? 'disabled' : ''}><span>${i + 1}</span>${s}</button></li>`).join('')}</ol>`;
    const total = tpl.sections.reduce((n, s) => n + s.items.length, 0);
    const rated = Object.keys(d.ratings).filter(k => d.ratings[k].rating != null && tpl.sections.some(s => s.items.some(i => i.id === k))).length;
    let body = '';
    if (d.step === 0) {
      body = `<section class="card">
        <h2>Flight</h2>
        <dl class="dl"><dt>Date</dt><dd>${fmtDate(sched.date)}</dd><dt>Aircraft</dt><dd>${esc(sched.fleet)} ${esc(sched.tail)}</dd><dt>Route</dt><dd>${esc(sched.route)}</dd><dt>Crew</dt><dd>${crew.map(p => esc(p.name) + ' (' + p.position + ')').join(', ')}</dd><dt>Observer</dt><dd>${esc(sched.observer)}</dd></dl>
        <p class="muted sm">${ident} These details go only to the Flight Completion Record.</p>
      </section>
      <section class="card">
        <h2>Confirm FOM-aligned checklist version</h2>
        <div class="radio-list">${S.templates.filter(t => t.status !== 'draft').map(t => `
          <label class="radio-card ${d.templateKey === t.key ? 'sel' : ''}"><input type="radio" name="tpl" value="${t.key}" ${d.templateKey === t.key ? 'checked' : ''}>
          <div><div class="strong">${esc(t.name)} v${esc(t.version)} ${t.status === 'published' ? chip('Current', 'ok') : chip('Superseded', 'muted')}</div>
          <div class="muted">${esc(t.fomRev)} · ${t.sections.reduce((n, s) => n + s.items.length, 0)} items in ${t.sections.length} sections</div></div></label>`).join('')}</div>
        <p class="muted sm">The selected version is recorded with both records so results stay tied to the FOM revision in force.</p>
      </section>`;
    } else if (d.step === 1) {
      body = `<section class="card prebrief">
        <h2>Standard pre-brief</h2>
        <blockquote>
          <p>“Thanks for having me on the jump seat today. I'm here as a peer observer, not an evaluator — this isn't a check ride and nothing I record carries your names.</p>
          <p>I'll note how our ${esc(S.settings.deptName)} SOPs and FOM procedures work in normal line operations. Your names, the tail and the route go only on a completion record that shows the observation happened. The performance notes go into a separate, permanently de-identified pool that nobody — including the administrators — can link back to you.</p>
          <p>Please fly exactly as you normally would. I won't interfere unless there's a safety issue. Afterwards we'll debrief together, and you can add comments when you attest.”</p>
        </blockquote>
        <label class="check"><input type="checkbox" id="prebriefChk" ${d.prebrief ? 'checked' : ''}> Pre-brief delivered to both crewmembers</label>
      </section>`;
    } else if (d.step === 2) {
      const codes = [...TEM_CODES.threats, ...TEM_CODES.errors, ...TEM_CODES.states];
      body = `<div class="progress-line"><div class="bar"><div style="width:${pct(rated, total)}%"></div></div><span>${rated} / ${total} rated</span></div>
      <div class="legend">Scale: <b>4</b> Outstanding · <b>3</b> Meets standard · <b>2</b> Marginal · <b>1</b> Below standard · <b>N/O</b> Not observed</div>
      ${tpl.sections.map(sec => `<section class="card sec">
        <div class="card-head"><h2>${esc(sec.name)}</h2><span class="muted sm">${esc(sec.phase)}</span></div>
        ${sec.items.map(it => { const r = d.ratings[it.id] || {}; return `
          <div class="obs-item ${r.rating != null ? 'rated' : ''}" id="it-${it.id}">
            <div class="obs-text"><div>${esc(it.text)}</div><span class="fomref">${esc(it.fomRef)}</span></div>
            <div class="seg" role="group" aria-label="Rating">${[['0', 'N/O'], ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4']].map(([v, l]) => `<button type="button" data-act="rate" data-item="${it.id}" data-v="${v}" class="${String(r.rating) === v ? 'on r' + v : ''}">${l}</button>`).join('')}</div>
            <button type="button" class="icon-btn star ${r.positive ? 'on' : ''}" data-act="star" data-item="${it.id}" title="Positive recognition"><svg viewBox="0 0 24 24"><path d="${VIEWS.recognition.icon}"/></svg></button>
            <details class="obs-more" ${r.note || (r.tem && r.tem.length) ? 'open' : ''}><summary>Notes & TEM</summary>
              <textarea data-note="${it.id}" rows="2" placeholder="Describe the behavior, not the person. Names, tails and dates are redacted on submit.">${esc(r.note || '')}</textarea>
              <div class="tem-chips">${codes.map(c => `<button type="button" class="tchip ${(r.tem || []).includes(c.code) ? 'on' : ''}" data-act="tem" data-item="${it.id}" data-code="${c.code}" title="${esc(c.label)}">${c.code}</button>`).join('')}</div>
            </details>
          </div>`; }).join('')}
      </section>`).join('')}`;
    } else if (d.step === 3) {
      body = `<section class="card">
        <div class="card-head"><h2>Threats observed</h2><button class="btn sm ghost" data-act="addThreat">Add threat</button></div>
        ${d.threats.length ? d.threats.map((t, i) => `<div class="threat-row">
          <select data-threat="${i}">${TEM_CODES.threats.map(c => `<option value="${c.code}" ${t.code === c.code ? 'selected' : ''}>${c.code} — ${esc(c.label)}</option>`).join('')}</select>
          <label class="check"><input type="checkbox" data-managed="${i}" ${t.managed ? 'checked' : ''}> Managed effectively</label>
          <button class="btn sm ghost" data-act="rmThreat" data-i="${i}">Remove</button></div>`).join('') : '<p class="empty">No threats added yet.</p>'}
        <label class="inline">Undesired aircraft states <input type="number" min="0" max="9" id="uasN" value="${d.uas}"></label>
        ${S.settings.part135 ? `<label class="check"><input type="checkbox" id="dutyChk" ${d.duty ? 'checked' : ''}> Part 135 module: duty-time awareness flag (crew near duty limit)</label>` : ''}
      </section>
      <section class="card">
        <h2>Positive performance</h2>
        <p class="muted sm">Feeds safety promotion (IS-BAO 3.4). Starred checklist items are added automatically.</p>
        <textarea id="recogTxt" rows="3" placeholder="Excellent threat briefing for a mountainous approach, including go-around energy plan.">${esc(d.recognitions)}</textarea>
      </section>
      <section class="card">
        <h2>Improvement opportunities</h2>
        <textarea id="oppTxt" rows="3" placeholder="Systemic observations, SOP ambiguities, training ideas.">${esc(d.opportunities)}</textarea>
      </section>`;
    } else {
      const allText = Object.values(d.ratings).map(r => r.note || '').concat([d.recognitions, d.opportunities]).join(' \n ');
      const sc = scrub(allText, sched);
      const low = Object.entries(d.ratings).filter(([, r]) => r.rating && r.rating <= 2).length;
      const pos = Object.values(d.ratings).filter(r => r.positive || r.rating === 4).length;
      const prompts = ['Crew self-assessment first: what went well, what would you change?', 'Positive behaviors noted (lead with these).', 'Opportunities discussed in terms of SOP/FOM, not individuals.', 'Any systemic issues — procedures, tools, scheduling — that made the SOP hard to follow?', 'Remind crew how the de-identified data is used and how to attest.'];
      body = `<section class="card">
        <h2>Facilitative debrief</h2>
        ${prompts.map((p, i) => `<label class="check"><input type="checkbox" data-deb="${i}" ${d.debrief[i] ? 'checked' : ''}> ${p}</label>`).join('')}
      </section>
      <section class="card">
        <h2>Ready to submit</h2>
        <div class="kpis small">${kpi('Items rated', rated + ' / ' + total)}${kpi('Marginal / below', low)}${kpi('Positive items', pos)}${kpi('Threats', d.threats.length)}</div>
        ${!d.prebrief ? '<div class="banner warn">Pre-brief has not been marked as delivered (step 2).</div>' : ''}
        ${sc.hits.length ? `<div class="banner warn"><strong>De-identification scan:</strong> ${sc.hits.length} possible identifier${sc.hits.length > 1 ? 's' : ''} found in notes (${sc.hits.map(esc).slice(0, 6).join(', ')}). They will be replaced with “[redacted]” before the notes enter the de-identified pool.</div>` : '<div class="banner ok">De-identification scan: no names, tails, airports from this route, or dates detected in notes.</div>'}
        <div class="split-preview">
          <div class="rec ident-rec"><div class="rec-title">${ident} Flight Completion Record</div><ul><li>Date, aircraft, route</li><li>Crew names and observer</li><li>FOM version v${esc(tpl.version)}</li><li>Pre-brief / debrief attestation</li><li>Crew comments (added at attestation)</li></ul></div>
          <div class="rec-gap" aria-hidden="true"><span>no link</span></div>
          <div class="rec deid-rec"><div class="rec-title">${deid} Performance Observation</div><ul><li>Ratings, TEM codes, notes (scrubbed)</li><li>Recognitions and opportunities</li><li>Fleet type, month only</li><li>FOM version v${esc(tpl.version)}</li><li>Random ID, random position in pool</li></ul></div>
        </div>
        <button class="btn lg" data-act="submitObs" ${rated === 0 ? 'disabled' : ''}>Submit — create both records</button>
        ${rated === 0 ? '<p class="muted sm">Rate at least one item to submit.</p>' : ''}
      </section>`;
    }
    const nav = `<div class="wiz-nav">${d.step > 0 ? '<button class="btn ghost" data-act="prev">Back</button>' : '<span></span>'}${d.step < 4 ? '<button class="btn" data-act="next">Next</button>' : ''}</div>`;
    return page('Observation', `${esc(sched.fleet)} ${esc(sched.tail)} · ${esc(sched.route)} · ${tpl.name} v${tpl.version}`, stepper + body + nav,
      '<button class="btn sm ghost" data-act="discard">Discard draft</button>');
  }

  function submitObservation() {
    const d = S.draft; const sched = S.scheduled.find(s => s.id === d.schedId); const tpl = tplByKey(d.templateKey);
    const crew = sched.crewIds.map(pilotById);
    const fcr = {
      id: rid('FCR'), date: sched.date, tail: sched.tail, fleet: sched.fleet, route: sched.route, observer: sched.observer,
      templateKey: tpl.key, templateVersion: tpl.version, fomRev: tpl.fomRev, prebrief: !!d.prebrief, debriefAt: todayStr(),
      crew: crew.map(p => ({ pilotId: p.id, name: p.name, position: p.position, attested: false, attestedAt: null, comment: '' })),
      status: 'Awaiting attestation'
    };
    const ratings = [];
    const recognitions = [];
    tpl.sections.forEach(sec => sec.items.forEach(it => {
      const r = d.ratings[it.id]; if (!r || r.rating == null) return;
      const note = scrub(r.note, sched).text;
      ratings.push({ itemId: it.id, sectionId: sec.id, rating: r.rating, tem: r.tem || [], note });
      if (r.positive) recognitions.push(it.text + (note ? ' — ' + note : ''));
    }));
    d.recognitions.split('\n').map(s => s.trim()).filter(Boolean).forEach(s => recognitions.push(scrub(s, sched).text));
    const errors = ratings.filter(x => x.rating && x.rating <= 2).flatMap(x => x.tem.filter(c => c.startsWith('E-')).map(code => ({ code, trapped: x.rating === 2 })));
    const pod = {
      rid: rid('POD'), period: sched.date.slice(0, 7), fleet: sched.fleet, templateKey: tpl.key, templateVersion: tpl.version, fomRev: tpl.fomRev,
      ratings, threats: d.threats.map(t => ({ code: t.code, managed: !!t.managed })), errors, uas: Number(d.uas) || 0,
      recognitions, opportunities: d.opportunities.split('\n').map(s => scrub(s.trim(), sched).text).filter(Boolean),
      duty: S.settings.part135 ? !!d.duty : null
    };
    S.completions.unshift(fcr);
    S.performance.splice(Math.floor(Math.random() * (S.performance.length + 1)), 0, pod);
    S.scheduled = S.scheduled.filter(s => s.id !== sched.id);
    S.draft = null;
    audit(actor(), 'Flight completion record created', `${fcr.id} · FOM v${tpl.version}`);
    audit('System', 'De-identified observation added to analysis pool', `Pool size ${S.performance.length} (record ID not logged)`);
    lastReceipt = { fcr: fcr.id, pod: pod.rid, ratings: ratings.length };
    save();
    location.hash = '#/receipt';
  }

  function vReceipt() {
    const r = lastReceipt;
    if (!r) return page('Receipt', '', '<p class="empty">No recent submission.</p>');
    const fcr = S.completions.find(c => c.id === r.fcr);
    return page('Observation submitted', 'Two records were created. They share no key, and the de-identified record was placed at a random position in the pool.', `
      <div class="split-preview big">
        <div class="rec ident-rec"><div class="rec-title">${ident} Flight Completion Record</div>
          <dl class="dl"><dt>Record</dt><dd>${esc(fcr.id)}</dd><dt>Flight</dt><dd>${fmtDate(fcr.date)} · ${esc(fcr.fleet)} ${esc(fcr.tail)} · ${esc(fcr.route)}</dd><dt>Crew</dt><dd>${fcr.crew.map(m => esc(m.name)).join(', ')}</dd><dt>FOM</dt><dd>v${esc(fcr.templateVersion)} · ${esc(fcr.fomRev)}</dd><dt>Status</dt><dd>${chip(fcr.status, 'warn')}</dd></dl>
          <p class="muted sm">Next due dates for both pilots advanced automatically.</p></div>
        <div class="rec-gap" aria-hidden="true"><span>no link</span></div>
        <div class="rec deid-rec"><div class="rec-title">${deid} Performance Observation</div>
          <dl class="dl"><dt>Record</dt><dd>${esc(r.pod)}</dd><dt>Contents</dt><dd>${r.ratings} ratings, TEM, notes</dd><dt>Identifiers</dt><dd>None — fleet type and month only</dd></dl>
          <p class="muted sm">This ID is shown once, here, and is not written to the audit log or the completion record.</p></div>
      </div>
      <div class="row-gap"><a class="btn" href="#/dashboard">Back to dashboard</a><button class="btn ghost" data-act="toCrew">Attest as crew</button></div>`);
  }

  function vCrew() {
    const me = pilotById(UI.crewPilot) || S.pilots[0];
    const s = pilotStatus(me);
    const pending = S.completions.filter(c => c.crew.some(m => m.pilotId === me.id && !m.attested));
    return page('My observations', 'Your schedule and completion history. Your performance data is de-identified and is not visible here — to you or anyone else.', `
      <div class="filters"><label>Signed in as (demo) <select id="crewSel">${S.pilots.map(p => `<option value="${p.id}" ${p.id === me.id ? 'selected' : ''}>${esc(p.name)} · ${p.position}</option>`).join('')}</select></label></div>
      <div class="kpis">${kpi('Status', s.status, '', s.cls === 'bad' ? 'bad' : s.cls === 'warn' ? 'warn' : 'good')}${kpi('Next due', fmtDate(s.nextDue), s.daysToDue < 0 ? Math.abs(s.daysToDue) + ' days overdue' : 'in ' + s.daysToDue + ' days')}${kpi('Last observation', fmtDate(s.last))}${kpi('Scheduled', s.sched ? fmtDate(s.sched.date) : 'Not yet', s.sched ? esc(s.sched.route) : '')}</div>
      <section class="card">
        <div class="card-head"><h2>Debrief attestation</h2>${ident}</div>
        ${pending.length ? pending.map(c => `<form class="attest" data-fcr="${c.id}">
          <div class="strong">${fmtDate(c.date)} · ${esc(c.fleet)} ${esc(c.tail)} · ${esc(c.route)}</div><div class="muted">Observer: ${esc(c.observer)} · FOM v${esc(c.templateVersion)}</div>
          <label class="check"><input type="checkbox" name="ok" required> I attest that the observation and debrief were completed.</label>
          <label>Comments or additional data points (optional — stays on this completion record only)<textarea name="comment" rows="2"></textarea></label>
          <button class="btn" type="submit">Attest</button></form>`).join('') : '<p class="empty">Nothing waiting for your attestation.</p>'}
      </section>
      <section class="card">
        <h2>History</h2>
        ${s.history.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Aircraft</th><th>Route</th><th>FOM version</th><th>Your attestation</th><th>Your comment</th></tr></thead><tbody>
        ${s.history.map(c => { const m = c.crew.find(x => x.pilotId === me.id); return `<tr><td>${fmtDate(c.date)}</td><td>${esc(c.fleet)} ${esc(c.tail)}</td><td>${esc(c.route)}</td><td>v${esc(c.templateVersion)}</td><td>${m.attested ? chip('Attested ' + fmtDate(m.attestedAt), 'ok') : chip('Pending', 'warn')}</td><td class="muted">${esc(m.comment) || '—'}</td></tr>`; }).join('')}
        </tbody></table></div>` : '<p class="empty">No observations yet.</p>'}
      </section>`);
  }

  function analysisFilters() {
    const f = UI.filters;
    const fleets = ['All', ...new Set(S.performance.map(r => r.fleet))];
    const versions = ['All', ...new Set(S.performance.map(r => r.templateVersion))].sort();
    return `<div class="filters">
      <label>Fleet <select data-filter="fleet">${fleets.map(x => `<option ${f.fleet === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      <label>FOM template <select data-filter="version">${versions.map(x => `<option value="${x}" ${f.version === x ? 'selected' : ''}>${x === 'All' ? 'All versions' : 'v' + x}</option>`).join('')}</select></label>
      <label>Period <select data-filter="period">${[['6', 'Last 6 months'], ['12', 'Last 12 months'], ['all', 'All data']].map(([v, l]) => `<option value="${v}" ${f.period === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      ${deid}</div>`;
  }

  function vAnalysis() {
    const pool = filteredPool();
    const minCell = S.settings.minCell;
    if (pool.length < minCell) return page('Analysis', 'De-identified performance dataset', analysisFilters() + `<div class="banner warn">Only ${pool.length} observation${pool.length === 1 ? '' : 's'} match these filters. Results are suppressed below ${minCell} to prevent re-identification by inference.</div>`);
    const items = itemStats(pool).filter(s => s.n >= minCell).sort((a, b) => b.lowPct - a.lowPct || a.mean - b.mean);
    const secs = sectionStats(pool).sort((a, b) => b.lowPct - a.lowPct);
    const tem = temStats(pool);
    const allR = pool.flatMap(r => r.ratings.filter(x => x.rating));
    const lowAll = allR.filter(x => x.rating <= 2).length;
    const qs = {};
    pool.forEach(r => { const q = quarterOf(r.period); const s = qs[q] || (qs[q] = { n: 0, low: 0, obs: 0 }); s.obs++; r.ratings.forEach(x => { if (x.rating) { s.n++; if (x.rating <= 2) s.low++; } }); });
    const qkeys = Object.keys(qs).sort();
    // version comparison for shared items
    const v31 = itemStats(S.performance.filter(r => r.templateVersion === '3.1'));
    const v32 = itemStats(S.performance.filter(r => r.templateVersion === '3.2'));
    const cmp = v32.filter(b => v31.some(a => a.itemId === b.itemId)).map(b => ({ b, a: v31.find(a => a.itemId === b.itemId) })).filter(x => x.a.n >= minCell && x.b.n >= minCell).sort((x, y) => (y.a.lowPct - y.b.lowPct) - (x.a.lowPct - x.b.lowPct)).slice(0, 5);
    return page('Analysis', 'Trends against FOM standards from the permanently de-identified dataset. Cells with fewer than ' + minCell + ' observations are suppressed.', analysisFilters() + `
      <div class="kpis">${kpi('Observations in pool', pool.length)}${kpi('Items rated', allR.length)}${kpi('Marginal / below standard', pct(lowAll, allR.length) + '%', lowAll + ' ratings of 1–2', pct(lowAll, allR.length) > 12 ? 'warn' : 'good')}${kpi('Positive recognitions', pool.reduce((n, r) => n + r.recognitions.length, 0))}</div>
      <div class="grid2">
        <section class="card"><h2>Non-standard rate by section</h2><p class="muted sm">Share of ratings at 1–2</p>${barsH(secs.map(s => ({ label: s.section, value: s.lowPct, display: s.lowPct + '%', cls: s.lowPct >= 15 ? 'bad' : s.lowPct >= 8 ? 'warn' : 'ok' })), { max: Math.max(25, ...secs.map(s => s.lowPct)) })}</section>
        <section class="card"><h2>Trend by quarter</h2><p class="muted sm">Non-standard rate, all sections</p>${columnChart(qkeys.map(k => ({ label: k + ' (' + qs[k].obs + ' obs)', short: k.replace('20', "'"), value: pct(qs[k].low, qs[k].n), cls: qs[k].obs < minCell ? 'col dim' : 'col' })), { suffix: '%', showVal: true, max: 20, label: 'Quarterly non-standard rate' })}</section>
      </div>
      <section class="card flush"><div class="card-head pad"><h2>Items ranked by non-standard rate</h2><button class="btn sm ghost" data-act="csv">Export de-identified CSV</button></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Item</th><th>FOM ref</th><th>n</th><th>Mean</th><th>1–2</th><th>4</th><th>Common TEM</th></tr></thead><tbody>
        ${items.slice(0, 14).map(s => `<tr><td><div>${esc(s.text)}</div><div class="muted sm">${esc(s.section)}</div></td><td><span class="fomref">${esc(s.fomRef)}</span></td><td>${s.n}</td><td>${s.mean.toFixed(2)}</td><td>${chip(s.lowPct + '%', s.lowPct >= S.settings.agendaThreshold ? 'bad' : s.lowPct >= 10 ? 'warn' : 'ok')}</td><td>${s.highPct}%</td><td>${Object.entries(s.tem).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([c]) => chip(c, 'muted')).join(' ') || '—'}</td></tr>`).join('')}
        </tbody></table></div></section>
      <div class="grid2">
        <section class="card"><h2>Threats</h2><p class="muted sm">Frequency; red share = not managed effectively</p>${barsH(tem.threats.map(t => ({ label: t.code + ' ' + temLabel(t.code), value: t.n, display: t.n + (t.mis ? ' · ' + pct(t.mis, t.n) + '% mism.' : ''), cls: pct(t.mis, t.n) >= 20 ? 'bad' : 'info' })))}</section>
        <section class="card"><h2>Errors</h2><p class="muted sm">Frequency; share not trapped by crew</p>${tem.errors.length ? barsH(tem.errors.map(e => ({ label: e.code + ' ' + temLabel(e.code), value: e.n, display: e.n + ' · ' + pct(e.untrapped, e.n) + '% untrapped', cls: 'warn' }))) : '<p class="empty">No coded errors.</p>'}</section>
      </div>
      <section class="card"><h2>FOM revision effect (v3.1 → v3.2)</h2><p class="muted sm">Items present in both template versions, all fleets, all periods.</p>
        <div class="table-wrap"><table class="table"><thead><tr><th>Item</th><th>v3.1 non-std</th><th>v3.2 non-std</th><th>Change</th></tr></thead><tbody>
        ${cmp.map(x => { const dlt = x.b.lowPct - x.a.lowPct; return `<tr><td>${esc(x.b.text)}</td><td>${x.a.lowPct}% <span class="muted sm">(n ${x.a.n})</span></td><td>${x.b.lowPct}% <span class="muted sm">(n ${x.b.n})</span></td><td>${chip((dlt > 0 ? '+' : '') + dlt + ' pts', dlt < 0 ? 'ok' : dlt > 0 ? 'bad' : 'muted')}</td></tr>`; }).join('')}
        </tbody></table></div></section>`);
  }

  function buildAgenda() {
    const pool = filteredPool();
    const minCell = S.settings.minCell;
    const items = itemStats(pool).filter(s => s.n >= minCell);
    const th = S.settings.agendaThreshold;
    const findings = items.filter(s => s.lowPct >= th).sort((a, b) => b.lowPct - a.lowPct);
    const watch = items.filter(s => s.lowPct >= Math.round(th / 2) && s.lowPct < th).sort((a, b) => b.lowPct - a.lowPct).slice(0, 4);
    const grouped = {};
    findings.forEach(f => { (grouped[f.section] = grouped[f.section] || []).push(f); });
    const tem = temStats(pool);
    const positives = items.filter(s => s.highPct >= 25).sort((a, b) => b.highPct - a.highPct).slice(0, 4);
    const recs = [...new Set(pool.flatMap(r => r.recognitions))].slice(0, 4);
    return { pool, findings, grouped, watch, tem, positives, recs, cov: coverage() };
  }
  function vAgenda() {
    const a = buildAgenda();
    const nextMeeting = addDays(todayStr(), 14);
    let n = 0;
    const H = () => ++n;
    const actionFor = f => { const nf = Object.keys(f.fleets).length; return (nf >= 2 && f.lowPct >= S.settings.agendaThreshold * 1.5) ? { tag: 'FOM / SOP revision candidate', cls: 'bad', why: 'consistently high across ' + nf + ' fleets — suggests the procedure itself may need revision' } : { tag: 'Training emphasis', cls: 'warn', why: nf >= 2 ? 'moderate rate across ' + nf + ' fleets — consider recurrent-training emphasis before revising the manual' : 'concentrated in one fleet — consider fleet-specific training emphasis' }; };
    return page('Suggested standards committee agenda', 'Generated from the de-identified dataset using the current analysis filters. Edit before circulating.', analysisFilters() + `
      <article class="card agenda" id="agenda">
        <header class="agenda-head"><div><div class="eyebrow">${esc(S.settings.deptName)}</div><h2>Standards Committee — suggested agenda</h2><div class="muted">Proposed meeting ${fmtDate(nextMeeting)} · Data: ${a.pool.length} de-identified observations · Threshold ${S.settings.agendaThreshold}% non-standard</div></div>${deid}</header>
        <h3>${H()}. Program status</h3>
        <p>Coverage ${a.cov.pct}% (${a.cov.current}/${a.cov.total} pilots within interval); ${a.cov.overdue} overdue, ${a.cov.dueSoon} due within ${S.settings.dueSoonDays} days. Counts only — no individual names on this agenda.</p>
        <h3>${H()}. Recurring opportunities against FOM standards</h3>
        ${a.findings.length ? Object.entries(a.grouped).map(([sec, list]) => `<div class="ag-group"><div class="ag-sec">${esc(sec)}</div>${list.map(f => { const act = actionFor(f); return `
          <div class="ag-item"><div class="ag-title">${esc(f.text)} <span class="fomref">${esc(f.fomRef)}</span> ${chip(act.tag, act.cls)}</div>
          <div class="muted">${f.lowPct}% rated marginal or below (n ${f.n}); ${act.why}.</div>
          ${f.notes.length ? `<div class="ag-quote">Representative note: “${esc(f.notes[0])}”</div>` : ''}
          <div class="ag-prompt">Discuss: Is ${esc(f.fomRef)} clear and practical as written? Does training cover it? Proposed action: ${act.tag === 'Training emphasis' ? 'add a scenario to the next recurrent module and re-measure next quarter' : 'draft a revision proposal for the FOM/SOP owner and log in the manual feedback loop'}.</div>
          ${UI.role === 'committee' || UI.role === 'captain' ? `<button class="btn sm ghost noprint" data-act="toFeedback" data-ref="${esc(f.fomRef)}" data-text="${esc(f.text)}">Add to manual feedback loop</button>` : ''}
          </div>`; }).join('')}</div>`).join('') : '<p>No items above threshold.</p>'}
        ${a.watch.length ? `<h3>${H()}. Watch list</h3><ul>${a.watch.map(w => `<li>${esc(w.text)} <span class="fomref">${esc(w.fomRef)}</span> — ${w.lowPct}% (n ${w.n})</li>`).join('')}</ul>` : ''}
        <h3>${H()}. Threat & error trends (SMS input)</h3>
        <ul>${a.tem.threats.slice(0, 3).map(t => `<li>${esc(t.code)} ${esc(temLabel(t.code))}: ${t.n} occurrences, ${pct(t.mis, t.n)}% not managed effectively</li>`).join('')}
        ${a.tem.errors.slice(0, 2).map(e => `<li>${esc(e.code)} ${esc(temLabel(e.code))}: ${e.n} errors, ${pct(e.untrapped, e.n)}% not trapped</li>`).join('')}</ul>
        <p class="muted sm">Recommend review against the hazard register (IS-BAO Chapter 3 safety assurance).</p>
        <h3>${H()}. Positive patterns for safety promotion</h3>
        <ul>${a.positives.map(p => `<li>${esc(p.text)} — ${p.highPct}% rated outstanding</li>`).join('')}${a.recs.map(r => `<li class="muted">“${esc(r)}”</li>`).join('')}</ul>
        <h3>${H()}. Open manual feedback items</h3>
        <ul>${S.feedback.map(f => `<li>${esc(f.ref)}: ${esc(f.text)} — ${chip(f.status, 'info')}</li>`).join('') || '<li>None</li>'}</ul>
        <h3>${H()}. Actions and next review</h3>
        <p>Assign owners for each revision candidate and training emphasis; re-measure at the next quarterly review.</p>
      </article>
      <div class="row-gap noprint"><button class="btn" data-act="print">Print / save as PDF</button><button class="btn ghost" data-act="smsExport">Export SMS data package (JSON)</button></div>`);
  }

  function vFeedback() {
    return page('SOP / manual feedback loop', 'Suggested FOM, SOP, AOM or checklist revisions arising from observation trends.', `
      <form class="card form" id="fbForm"><h2>New suggestion</h2>
        <div class="two"><label>Manual reference <input name="ref" required placeholder="SOP 5.4.3"></label><label>Source <select name="source"><option>Committee</option><option>Standards Captain</option><option>Line feedback</option></select></label></div>
        <label>Suggestion <textarea name="text" rows="2" required></textarea></label><button class="btn" type="submit">Add</button></form>
      <section class="card flush"><div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Ref</th><th>Suggestion</th><th>Source</th><th>Status</th></tr></thead><tbody>
      ${S.feedback.map(f => `<tr><td>${fmtDate(f.date)}</td><td><span class="fomref">${esc(f.ref)}</span></td><td>${esc(f.text)}</td><td>${esc(f.source)}</td><td><select data-fb="${f.id}">${['Open', 'Under review', 'Approved for next revision', 'Incorporated', 'Declined'].map(s => `<option ${f.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td></tr>`).join('')}
      </tbody></table></div></section>`);
  }

  function vRecognition() {
    const recs = [];
    S.performance.forEach(r => r.recognitions.forEach(t => recs.push({ t, q: quarterOf(r.period) })));
    recs.sort((a, b) => b.q.localeCompare(a.q));
    const items = itemStats(S.performance).filter(s => s.n >= S.settings.minCell).sort((a, b) => b.highPct - a.highPct).slice(0, 6);
    return page('Positive performance recognition', 'Exemplary CRM, proactive risk management and excellent SOP execution — shared with the line to reinforce what good looks like (IS-BAO 3.4).', `
      <div class="kpis">${kpi('Recognitions logged', recs.length)}${kpi('Rated outstanding', pct(S.performance.flatMap(r => r.ratings).filter(x => x.rating === 4).length, S.performance.flatMap(r => r.ratings).filter(x => x.rating).length) + '%', 'of all rated items')}</div>
      <section class="card"><h2>Most frequently outstanding</h2>${barsH(items.map(s => ({ label: s.text, value: s.highPct, display: s.highPct + '%', cls: 'ok' })), { max: 60 })}</section>
      <div class="recog-grid">${recs.slice(0, 18).map(r => `<div class="recog"><svg viewBox="0 0 24 24"><path d="${VIEWS.recognition.icon}"/></svg><p>${esc(r.t)}</p><span class="muted sm">${esc(r.q)}</span></div>`).join('')}</div>`);
  }

  function vReports() {
    const cov = coverage();
    const months = [];
    for (let i = 11; i >= 0; i--) { const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - i); months.push(d.toISOString().slice(0, 7)); }
    const perMonth = months.map(m => ({ label: m, short: new Date(m + '-15T12:00:00Z').toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }), value: S.completions.filter(c => c.date.slice(0, 7) === m).length }));
    const yr = S.completions.filter(c => daysBetween(c.date, todayStr()) <= 365);
    const fleets = [...new Set(S.pilots.flatMap(p => p.quals))];
    const covFleet = fleets.map(f => { const ps = S.pilots.filter(p => p.quals.includes(f)).map(pilotStatus); const ok = ps.filter(s => s.status !== 'Overdue').length; return { label: f, value: pct(ok, ps.length), display: pct(ok, ps.length) + '% (' + ok + '/' + ps.length + ')', cls: pct(ok, ps.length) >= 85 ? 'ok' : 'warn' }; });
    const allR = S.performance.flatMap(r => r.ratings.filter(x => x.rating));
    const recs = S.performance.reduce((n, r) => n + r.recognitions.length, 0);
    const attested = S.completions.filter(c => c.status === 'Complete').length;
    const isbao = [
      ['Ch. 3 — SMS / safety assurance', `${S.performance.length} de-identified observations; quarterly TEM trends; SMS export package`],
      ['Ch. 3.4 — Safety promotion', `${recs} positive recognitions captured`],
      ['Ch. 6 — Company manuals', `${S.templates.length} versioned templates; ${S.feedback.length} manual feedback item(s)`],
      ['Ch. 7 — Organization & personnel', 'Standards Captain duties and data-use roles defined (Users & roles)'],
      ['Ch. 8 — Training & proficiency', 'Training-emphasis items generated from recurring findings'],
      ['Ch. 13 — Flight operations', `${yr.length} line observations of SOP/checklist adherence in 12 months`]
    ];
    return page('Management reports', 'High-level program statistics suitable for management review and IS-BAO Stage 2/3 evidence.', `
      <div class="kpis">${kpi('Observations, 12 months', yr.length)}${kpi('Coverage', cov.pct + '%', cov.current + ' of ' + cov.total + ' pilots', cov.pct >= 85 ? 'good' : 'warn')}${kpi('Debriefs attested', pct(attested, S.completions.length) + '%', attested + ' of ' + S.completions.length)}${kpi('Positive recognitions', recs)}${kpi('Mean rating', (allR.reduce((n, x) => n + x.rating, 0) / allR.length).toFixed(2), 'of 4.00')}</div>
      <div class="grid2">
        <section class="card"><h2>Observations per month</h2>${columnChart(perMonth, { showVal: true, label: 'Observations per month' })}</section>
        <section class="card"><h2>Coverage by fleet</h2>${barsH(covFleet, { max: 100 })}</section>
      </div>
      <section class="card"><h2>IS-BAO evidence summary</h2><div class="table-wrap"><table class="table"><thead><tr><th>IS-BAO element</th><th>Evidence from this program</th></tr></thead><tbody>${isbao.map(r => `<tr><td class="strong">${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</tbody></table></div></section>
      <div class="row-gap noprint"><button class="btn" data-act="print">Print / save as PDF</button></div>`);
  }

  function vTemplates(q) {
    const sel = q.t ? tplByKey(q.t) : (S.templates.find(t => t.status === 'draft') || currentTemplate());
    const editing = sel.status === 'draft';
    const used = S.completions.filter(c => c.templateKey === sel.key).length;
    return page('FOM-aligned observation templates', 'Create, version and publish observation instruments that reference your FOM and SOP paragraphs. Completed observations stay tied to the version used.', `
      <div class="grid-side">
        <section class="card"><h2>Versions</h2><div class="list">${S.templates.slice().reverse().map(t => `
          <a class="list-row link ${t.key === sel.key ? 'sel' : ''}" href="#/templates?t=${encodeURIComponent(t.key)}"><div><div class="strong">v${esc(t.version)}</div><div class="muted sm">${esc(t.fomRev)}</div></div>${chip(t.status, t.status === 'published' ? 'ok' : t.status === 'draft' ? 'info' : 'muted')}</a>`).join('')}</div>
          ${S.templates.some(t => t.status === 'draft') ? '' : `<button class="btn sm" data-act="newDraft">New draft from v${esc(currentTemplate().version)}</button>`}
        </section>
        <section class="card">
          <div class="card-head"><h2>${esc(sel.name)} v${esc(sel.version)}</h2>${chip(sel.status, sel.status === 'published' ? 'ok' : sel.status === 'draft' ? 'info' : 'muted')}</div>
          <p class="muted sm">${esc(sel.fomRev)} · ${used} completed observation${used === 1 ? '' : 's'} recorded against this version${sel.publishedAt ? ' · published ' + fmtDate(sel.publishedAt) : ''}</p>
          ${editing ? `<div class="two"><label>Version <input id="tplVer" value="${esc(sel.version)}"></label><label>FOM revision <input id="tplFom" value="${esc(sel.fomRev)}"></label></div>` : '<p class="muted sm">Published and superseded versions are read-only. Create a draft to make changes.</p>'}
          ${sel.sections.map((sec, si) => `<div class="tpl-sec"><div class="tpl-sec-head">${editing ? `<input data-secname="${si}" value="${esc(sec.name)}">` : `<strong>${esc(sec.name)}</strong>`}<span class="muted sm">${esc(sec.phase)}</span></div>
            ${sec.items.map((it, ii) => `<div class="tpl-item">${editing ? `<input class="grow" data-itext="${si}.${ii}" value="${esc(it.text)}"><input class="ref" data-iref="${si}.${ii}" value="${esc(it.fomRef)}"><button class="icon-btn" data-act="rmItem" data-si="${si}" data-ii="${ii}" title="Remove item">✕</button>` : `<span class="grow">${esc(it.text)}</span><span class="fomref">${esc(it.fomRef)}</span>`}</div>`).join('')}
            ${editing ? `<button class="btn sm ghost" data-act="addItem" data-si="${si}">Add item</button>` : ''}</div>`).join('')}
          ${editing ? `<div class="row-gap"><button class="btn" data-act="publish">Publish v<span id="pubVer">${esc(sel.version)}</span></button><button class="btn ghost" data-act="delDraft">Delete draft</button></div>` : ''}
        </section>
      </div>`);
  }

  function vSettings() {
    const st = S.settings;
    return page('Settings', 'Operating regime, due-date rules, privacy thresholds and retention.', `
      <form class="card form" id="setForm">
        <h2>Department</h2>
        <label>Department name <input name="deptName" value="${esc(st.deptName)}"></label>
        <h2>Operating regime</h2>
        <label class="check"><input type="checkbox" name="part135" ${st.part135 ? 'checked' : ''}> Enable optional Part 135 module (line-check tracking, duty-time awareness flag)</label>
        <h2>Due-date rules</h2>
        <div class="two"><label>PIC interval (days) <input type="number" name="PIC" min="30" max="730" value="${st.intervalDays.PIC}"></label><label>SIC interval (days) <input type="number" name="SIC" min="30" max="730" value="${st.intervalDays.SIC}"></label></div>
        <label>“Due soon” window (days) <input type="number" name="dueSoonDays" min="0" max="120" value="${st.dueSoonDays}"></label>
        <h2>Analysis & privacy</h2>
        <div class="two"><label>Minimum cell size for reporting <input type="number" name="minCell" min="2" max="10" value="${st.minCell}"></label><label>Agenda threshold (% non-standard) <input type="number" name="agendaThreshold" min="5" max="60" value="${st.agendaThreshold}"></label></div>
        <label>Data retention (months) <input type="number" name="retentionMonths" min="6" max="120" value="${st.retentionMonths}"></label>
        <div class="row-gap"><button class="btn" type="submit">Save settings</button><button class="btn ghost" type="button" data-act="applyRetention">Apply retention now</button></div>
      </form>
      <section class="card form">
        <h2>Demo data</h2>
        <p class="muted">Everything lives in this browser's local storage. To share a scenario, export a file and import it on another device.</p>
        <div class="row-gap"><button class="btn ghost" data-act="exportAll">Export demo file</button><label class="btn ghost file">Import demo file<input type="file" id="importFile" accept="application/json"></label><button class="btn danger" data-act="reset">Reset to fresh demo data</button></div>
      </section>`);
  }

  function vUsers() {
    const caps = {
      'Standards Captain / Observer': 'Schedule & conduct observations, debrief, analysis, agendas, recognition',
      'Flight Crewmember': 'Own schedule & due dates, attest debrief, comment on own completion record',
      'Standards Committee / Safety Manager': 'Agendas, aggregated trends, de-identified data packages, manual feedback',
      'Management / Leadership': 'High-level dashboards and IS-BAO evidence',
      'Administrator': 'Users, roles, templates & versions, due-date rules, regime, configuration'
    };
    return page('Users & roles', 'Role-based access. A production build would use SSO; this demo uses the “Viewing as” switcher.', `
      <section class="card"><h2>Role capabilities</h2><div class="table-wrap"><table class="table"><thead><tr><th>Role</th><th>Capabilities</th><th>Performance-data access</th></tr></thead><tbody>
      ${Object.entries(caps).map(([r, c]) => `<tr><td class="strong">${r}</td><td>${c}</td><td>${r === 'Flight Crewmember' ? 'None (not even own)' : r === 'Administrator' ? 'Configuration only — cannot re-link' : 'Aggregated, de-identified'}</td></tr>`).join('')}
      </tbody></table></div></section>
      <section class="card flush"><div class="table-wrap"><table class="table"><thead><tr><th>User</th><th>Role</th><th>Authentication</th></tr></thead><tbody>
      ${S.users.map(u => `<tr><td>${esc(u.name)}</td><td>${esc(u.role)}</td><td class="muted">${esc(u.sso)}</td></tr>`).join('')}
      </tbody></table></div></section>`);
  }

  function vAudit() {
    return page('Audit log', 'Append-only, hash-chained log of program activity for IS-BAO evidence. Entries never contain de-identified record IDs.', `
      <div class="row-gap"><button class="btn" data-act="verify">Verify chain integrity</button><span id="verifyOut" class="muted"></span></div>
      <section class="card flush"><div class="table-wrap"><table class="table"><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Detail</th><th>Hash</th></tr></thead><tbody>
      ${S.audit.slice().reverse().map(a => `<tr><td class="nowrap">${new Date(a.ts).toLocaleString()}</td><td>${esc(a.actor)}</td><td>${esc(a.action)}</td><td class="muted">${esc(a.detail)}</td><td><code>${a.hash.slice(0, 12)}…</code></td></tr>`).join('')}
      </tbody></table></div></section>`);
  }

  function vAbout() {
    return page('About this demo', 'A clean-sheet, browser-only demonstrator of the Standards Captain Support Application specification.', `
      <section class="card prose">
        <h2>Try this path</h2>
        <ol>
          <li>As <b>Standards Captain</b>, open Dashboard → start an upcoming observation. Walk through the five steps; try typing a pilot's name or a tail number in a note and watch the de-identification scan catch it.</li>
          <li>Submit and look at the receipt: two records, no shared key.</li>
          <li>Switch to <b>Flight Crewmember</b>, pick one of the observed pilots, and attest with a comment.</li>
          <li>Switch to <b>Standards Committee</b> → Analysis and Committee agenda. Change filters; note small groups are suppressed.</li>
          <li>As <b>Administrator</b>, create a template draft, edit an item, publish it, then toggle the Part 135 module in Settings.</li>
        </ol>
        <h2>How the non-punitive separation works here</h2>
        <ul>
          <li>Every submission writes a Flight Completion Record (names, tail, route, FOM version, attestation) and a Performance Observation (ratings, TEM, scrubbed notes, fleet type and month only).</li>
          <li>The two records share no ID. The performance record gets a random ID and a random position in the pool, and its ID is never logged.</li>
          <li>Crew comments stay on the completion record. Analysis suppresses any slice with fewer than ${S.settings.minCell} observations.</li>
        </ul>
        <h2>Demo limits</h2>
        <ul>
          <li>All data is fictional and stored only in your browser. There is no server, sync, SSO or encryption at rest — those are production requirements in the spec, simulated here by the role switcher and local storage.</li>
          <li>Two people using the link each get their own copy. Use Settings → Export / Import to pass a scenario back and forth.</li>
          <li>FOM paragraph numbers are placeholders; a real deployment would load the department's own FOM and SOP references.</li>
        </ul>
      </section>`);
  }

  /* ---------- router ---------- */
  function parseHash() {
    const h = location.hash.replace(/^#\/?/, '');
    const [path, qs] = h.split('?');
    const parts = path.split('/').filter(Boolean);
    const q = Object.fromEntries(new URLSearchParams(qs || ''));
    return { view: parts[0] || '', arg: parts[1], q };
  }
  function render() {
    const { view, arg, q } = parseHash();
    const def = ROLES[UI.role].nav[0];
    let v = view || def;
    if (!VIEWS[v] && v !== 'receipt') v = def;
    let inner;
    if (!can(v)) inner = page('Not available for this role', '', `<div class="banner warn">${esc(VIEWS[v] ? VIEWS[v].label : v)} isn't available to ${esc(ROLES[UI.role].label)}. <a href="#/${def}">Go to ${esc(VIEWS[def].label)}</a></div>`);
    else {
      inner = ({
        dashboard: vDashboard, personnel: () => vPersonnel(q), schedule: () => vSchedule(q), observe: () => arg ? vObserve(arg) : vObservePicker(),
        receipt: vReceipt, crew: vCrew, analysis: vAnalysis, agenda: vAgenda, feedback: vFeedback, recognition: vRecognition, reports: vReports,
        templates: () => vTemplates(q), settings: vSettings, users: vUsers, audit: vAudit, about: vAbout
      })[v]();
    }
    if (inner === '') return;
    const y = window.__keepScroll ? window.scrollY : 0;
    app.innerHTML = shell(v === 'receipt' ? 'observe' : v, inner);
    document.title = (VIEWS[v] ? VIEWS[v].label : 'Observation') + ' · Standards Captain';
    updateNet();
    window.scrollTo(0, y); window.__keepScroll = false;
  }
  function rerender(keep) { window.__keepScroll = keep !== false; render(); }
  function setQ(k, val) { const { view, q } = parseHash(); q[k] = val; if (k !== 'open') delete q.open; location.hash = '#/' + view + '?' + new URLSearchParams(q).toString(); }
  function updateNet() { const el = document.getElementById('netstate'); if (el) el.innerHTML = navigator.onLine ? '<span class="dot ok"></span>Online · saved locally' : '<span class="dot warn"></span>Offline · entries saved on device'; }
  function download(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }

  /* ---------- events ---------- */
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'roleSel') { UI.role = t.value; save(); location.hash = '#/' + ROLES[UI.role].nav[0]; render(); return; }
    if (t.id === 'crewSel') { UI.crewPilot = t.value; save(); rerender(); return; }
    if (t.dataset.q) { setQ(t.dataset.q, t.value); return; }
    if (t.dataset.filter) { UI.filters[t.dataset.filter] = t.value; save(); rerender(); return; }
    if (t.id === 'schedFleet') { location.hash = '#/schedule?fleet=' + encodeURIComponent(t.value); return; }
    const d = S.draft;
    if (t.name === 'tpl' && d) { d.templateKey = t.value; save(); rerender(); return; }
    if (t.id === 'prebriefChk' && d) { d.prebrief = t.checked; save(); return; }
    if (t.dataset.threat != null && d) { d.threats[+t.dataset.threat].code = t.value; save(); return; }
    if (t.dataset.managed != null && d) { d.threats[+t.dataset.managed].managed = t.checked; save(); return; }
    if (t.id === 'uasN' && d) { d.uas = +t.value || 0; save(); return; }
    if (t.id === 'dutyChk' && d) { d.duty = t.checked; save(); return; }
    if (t.dataset.deb != null && d) { d.debrief[t.dataset.deb] = t.checked; save(); return; }
    if (t.dataset.fb) { const f = S.feedback.find(x => x.id === t.dataset.fb); f.status = t.value; audit(actor(), 'Manual feedback status changed', `${f.ref} → ${t.value}`); save(); return; }
    if (t.id === 'importFile' && t.files[0]) {
      const fr = new FileReader();
      fr.onload = () => { try { const x = JSON.parse(fr.result); if (x.schema !== 1 || !x.performance) throw new Error('bad'); S = x; audit(actor(), 'Demo file imported', ''); save(); alert('Demo file imported.'); render(); } catch (err) { alert('That file is not a Standards Captain demo export.'); } };
      fr.readAsText(t.files[0]);
    }
    const draftTpl = S.templates.find(x => x.status === 'draft');
    if (draftTpl) {
      if (t.id === 'tplVer') { draftTpl.version = t.value.trim(); draftTpl.key = draftTpl.id + '@' + draftTpl.version; save(); location.hash = '#/templates?t=' + encodeURIComponent(draftTpl.key); return; }
      if (t.id === 'tplFom') { draftTpl.fomRev = t.value; save(); return; }
      if (t.dataset.secname != null) { draftTpl.sections[+t.dataset.secname].name = t.value; save(); return; }
      if (t.dataset.itext) { const [si, ii] = t.dataset.itext.split('.').map(Number); draftTpl.sections[si].items[ii].text = t.value; save(); return; }
      if (t.dataset.iref) { const [si, ii] = t.dataset.iref.split('.').map(Number); draftTpl.sections[si].items[ii].fomRef = t.value; save(); return; }
    }
  });
  document.addEventListener('input', e => {
    const t = e.target, d = S.draft;
    if (!d) return;
    if (t.dataset.note) { (d.ratings[t.dataset.note] = d.ratings[t.dataset.note] || {}).note = t.value; save(); }
    if (t.id === 'recogTxt') { d.recognitions = t.value; save(); }
    if (t.id === 'oppTxt') { d.opportunities = t.value; save(); }
  });
  document.addEventListener('click', e => {
    const menu = e.target.closest('#menuBtn');
    if (menu) { document.getElementById('sidebar').classList.toggle('open'); return; }
    if (e.target.closest('.nav-item')) { const sb = document.getElementById('sidebar'); if (sb) sb.classList.remove('open'); }
    const row = e.target.closest('[data-open]');
    if (row) { const { q } = parseHash(); setQ('open', q.open === row.dataset.open ? '' : row.dataset.open); return; }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act, d = S.draft;
    switch (act) {
      case 'step': d.step = +b.dataset.step; save(); rerender(false); break;
      case 'next': d.step = Math.min(4, d.step + 1); save(); rerender(false); break;
      case 'prev': d.step = Math.max(0, d.step - 1); save(); rerender(false); break;
      case 'discard': if (confirm('Discard this observation draft?')) { S.draft = null; audit(actor(), 'Observation draft discarded', ''); save(); location.hash = '#/dashboard'; } break;
      case 'rate': { const r = d.ratings[b.dataset.item] = d.ratings[b.dataset.item] || {}; const v = +b.dataset.v; r.rating = r.rating === v ? null : v; save(); rerender(); break; }
      case 'star': { const r = d.ratings[b.dataset.item] = d.ratings[b.dataset.item] || {}; r.positive = !r.positive; save(); rerender(); break; }
      case 'tem': { const r = d.ratings[b.dataset.item] = d.ratings[b.dataset.item] || {}; r.tem = r.tem || []; const c = b.dataset.code; r.tem = r.tem.includes(c) ? r.tem.filter(x => x !== c) : r.tem.concat(c); save(); rerender(); break; }
      case 'addThreat': d.threats.push({ code: 'T-WX', managed: true }); save(); rerender(); break;
      case 'rmThreat': d.threats.splice(+b.dataset.i, 1); save(); rerender(); break;
      case 'submitObs': submitObservation(); break;
      case 'toCrew': { const fcr = S.completions.find(c => c.id === lastReceipt.fcr); lastReceipt = null; UI.role = 'crew'; UI.crewPilot = fcr.crew[0].pilotId; save(); location.hash = '#/crew'; render(); break; }
      case 'unsched': S.scheduled = S.scheduled.filter(s => s.id !== b.dataset.id); if (d && d.schedId === b.dataset.id) S.draft = null; audit(actor(), 'Scheduled observation removed', b.dataset.id); save(); rerender(); break;
      case 'csv': {
        const idx = itemIndex();
        const lines = [['period', 'fleet', 'template_version', 'fom_revision', 'section', 'item_id', 'item', 'fom_ref', 'rating', 'tem_codes', 'note'].join(',')];
        filteredPool().forEach(r => r.ratings.forEach(x => { const it = idx[x.itemId] || {}; lines.push([r.period, r.fleet, r.templateVersion, r.fomRev, it.section, x.itemId, it.text, it.fomRef, x.rating || 'N/O', (x.tem || []).join(' '), x.note].map(v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(',')); }));
        download('deidentified-observations.csv', lines.join('\n'), 'text/csv'); audit(actor(), 'De-identified dataset exported (CSV)', `${filteredPool().length} observations`); save(); break;
      }
      case 'smsExport': {
        const a = buildAgenda();
        const pkg = { generated: new Date().toISOString(), department: S.settings.deptName, dataset: 'de-identified line observations', observations: a.pool.length,
          hazards: a.findings.map(f => ({ title: f.text, fomRef: f.fomRef, section: f.section, nonStandardPct: f.lowPct, n: f.n, fleetsAffected: Object.keys(f.fleets).length })),
          threats: a.tem.threats.map(t => ({ code: t.code, label: temLabel(t.code), occurrences: t.n, mismanagedPct: pct(t.mis, t.n) })),
          errors: a.tem.errors.map(x => ({ code: x.code, label: temLabel(x.code), occurrences: x.n, untrappedPct: pct(x.untrapped, x.n) })) };
        download('sms-data-package.json', JSON.stringify(pkg, null, 2), 'application/json'); audit(actor(), 'SMS data package exported', `${pkg.hazards.length} hazard inputs`); save(); break;
      }
      case 'toFeedback': S.feedback.unshift({ id: rid('FB'), date: todayStr(), source: 'Committee', ref: b.dataset.ref, text: 'Review wording/practicality: ' + b.dataset.text, status: 'Open' }); audit(actor(), 'Manual feedback item added', b.dataset.ref); save(); b.textContent = 'Added ✓'; b.disabled = true; break;
      case 'print': window.print(); break;
      case 'newDraft': {
        const cur = currentTemplate(); const parts = cur.version.split('.'); parts[parts.length - 1] = String(+parts[parts.length - 1] + 1);
        const t = JSON.parse(JSON.stringify(cur)); t.version = parts.join('.'); t.key = t.id + '@' + t.version; t.status = 'draft'; t.publishedAt = null; t.fomRev = 'FOM Rev — (draft)';
        S.templates.push(t); audit(actor(), 'Template draft created', `v${t.version} from v${cur.version}`); save(); location.hash = '#/templates?t=' + encodeURIComponent(t.key); break;
      }
      case 'addItem': { const t = S.templates.find(x => x.status === 'draft'); const sec = t.sections[+b.dataset.si]; sec.items.push({ id: sec.id + '-' + Date.now().toString(36), text: 'New observation item', fomRef: 'FOM x.x.x' }); save(); rerender(); break; }
      case 'rmItem': { const t = S.templates.find(x => x.status === 'draft'); t.sections[+b.dataset.si].items.splice(+b.dataset.ii, 1); save(); rerender(); break; }
      case 'publish': {
        const t = S.templates.find(x => x.status === 'draft');
        if (S.templates.some(x => x !== t && x.version === t.version)) { alert('Version v' + t.version + ' already exists. Change the version number first.'); break; }
        S.templates.forEach(x => { if (x.status === 'published') x.status = 'superseded'; });
        t.status = 'published'; t.publishedAt = todayStr(); audit(actor(), 'Template published', `v${t.version} · ${t.fomRev}`); save(); rerender(); break;
      }
      case 'delDraft': S.templates = S.templates.filter(x => x.status !== 'draft'); audit(actor(), 'Template draft deleted', ''); save(); location.hash = '#/templates'; break;
      case 'applyRetention': {
        const cutoff = addDays(todayStr(), -Math.round(S.settings.retentionMonths * 30.4));
        const b1 = S.performance.length, b2 = S.completions.length;
        S.performance = S.performance.filter(r => r.period >= cutoff.slice(0, 7)); S.completions = S.completions.filter(c => c.date >= cutoff);
        audit(actor(), 'Retention policy applied', `${b1 - S.performance.length} de-identified and ${b2 - S.completions.length} completion records purged (> ${S.settings.retentionMonths} months)`); save(); alert(`Retention applied: ${b1 - S.performance.length} de-identified and ${b2 - S.completions.length} completion records older than ${S.settings.retentionMonths} months removed.`); rerender(); break;
      }
      case 'exportAll': download('standards-captain-demo.json', JSON.stringify(S, null, 2), 'application/json'); break;
      case 'reset': if (confirm('Reset all demo data to the fresh fictional dataset?')) { localStorage.removeItem(KEY); lastReceipt = null; S = null; load(); render(); } break;
      case 'verify': { const r = verifyChain(); document.getElementById('verifyOut').innerHTML = r.ok ? `<span class="chip ok">Chain intact — ${r.n} entries verified</span>` : `<span class="chip bad">Chain broken at entry ${r.at + 1}</span>`; break; }
    }
  });
  document.addEventListener('submit', e => {
    const f = e.target; e.preventDefault();
    const fd = Object.fromEntries(new FormData(f));
    if (f.id === 'schedForm') {
      const s = { id: rid('SCH'), date: fd.date, fleet: fd.fleet, tail: fd.tail.toUpperCase(), route: fd.route, crewIds: [fd.pic, fd.sic], observer: fd.observer, status: 'Scheduled' };
      S.scheduled.push(s); S.scheduled.sort((a, b) => a.date.localeCompare(b.date)); audit(actor(), 'Observation scheduled', `${s.id} · ${s.date} · ${s.fleet}`); save(); location.hash = '#/dashboard';
    } else if (f.classList.contains('attest')) {
      const c = S.completions.find(x => x.id === f.dataset.fcr); const m = c.crew.find(x => x.pilotId === UI.crewPilot);
      m.attested = true; m.attestedAt = todayStr(); m.comment = fd.comment || '';
      if (c.crew.every(x => x.attested)) c.status = 'Complete';
      audit('Crewmember', 'Debrief attested', `${c.id}${fd.comment ? ' · comment added to completion record' : ''}`); save(); rerender();
    } else if (f.id === 'fbForm') {
      S.feedback.unshift({ id: rid('FB'), date: todayStr(), source: fd.source, ref: fd.ref, text: fd.text, status: 'Open' }); audit(actor(), 'Manual feedback item added', fd.ref); save(); rerender();
    } else if (f.id === 'setForm') {
      const st = S.settings;
      st.deptName = fd.deptName || st.deptName; st.part135 = !!fd.part135; st.intervalDays = { PIC: +fd.PIC, SIC: +fd.SIC };
      st.dueSoonDays = +fd.dueSoonDays; st.minCell = Math.max(2, +fd.minCell); st.agendaThreshold = +fd.agendaThreshold; st.retentionMonths = +fd.retentionMonths;
      audit(actor(), 'Settings changed', `Part 135 module ${st.part135 ? 'on' : 'off'} · PIC ${st.intervalDays.PIC} d · SIC ${st.intervalDays.SIC} d · min cell ${st.minCell}`); save(); rerender();
      const btn = document.querySelector('#setForm .btn'); if (btn) { btn.textContent = 'Saved ✓'; setTimeout(() => { btn.textContent = 'Save settings'; }, 1500); }
    }
  });
  window.addEventListener('hashchange', () => render());
  window.addEventListener('online', updateNet); window.addEventListener('offline', updateNet);

  load(); render();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
