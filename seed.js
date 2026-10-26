/* Standards Captain demo — fictional seed data.
   All people, tail numbers, routes and FOM references are invented for demonstration. */
(function () {
  'use strict';

  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s += 0x6D2B79F5;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const TEM_CODES = {
    threats: [
      { code: 'T-WX', label: 'Weather' },
      { code: 'T-ATC', label: 'ATC / clearance change' },
      { code: 'T-APT', label: 'Airport / terrain' },
      { code: 'T-ACFT', label: 'Aircraft malfunction / MEL' },
      { code: 'T-GND', label: 'Ground / ramp / FBO' },
      { code: 'T-PAX', label: 'Passenger / schedule change' },
      { code: 'T-PRES', label: 'Operational pressure' },
      { code: 'T-DOC', label: 'Trip paperwork / permits' }
    ],
    errors: [
      { code: 'E-CHK', label: 'Checklist error' },
      { code: 'E-CALL', label: 'Callout omitted / late' },
      { code: 'E-AUTO', label: 'Automation / FMS error' },
      { code: 'E-HAND', label: 'Manual handling' },
      { code: 'E-SOP', label: 'SOP deviation' },
      { code: 'E-COMM', label: 'Crew / ATC communication' }
    ],
    states: [
      { code: 'UAS', label: 'Undesired aircraft state' }
    ]
  };

  function item(id, text, fomRef) { return { id, text, fomRef }; }

  const SECTIONS_V32 = [
    { id: 'prep', name: 'Flight preparation & briefing', phase: 'Preflight', items: [
      item('prep-1', 'Trip threats reviewed (weather, NOTAMs, airport familiarity, permits)', 'FOM 4.2.1'),
      item('prep-2', 'Performance and weight & balance computed and cross-checked', 'FOM 4.3.2'),
      item('prep-3', 'Crew briefing interactive; roles and duties assigned', 'FOM 4.2.4'),
      item('prep-4', 'Passenger / cabin coordination per department standard', 'FOM 4.6.1')
    ]},
    { id: 'chk', name: 'Checklist discipline', phase: 'All phases', items: [
      item('chk-1', 'Challenge–response method used per SOP', 'SOP 2.1.3'),
      item('chk-2', 'Checklists initiated at designated points without prompting', 'SOP 2.1.4'),
      item('chk-3', 'Flow-then-check sequence followed', 'SOP 2.1.5'),
      item('chk-4', 'Interruptions managed; checklist resumed at correct point', 'SOP 2.1.7')
    ]},
    { id: 'auto', name: 'Automation / FMS management', phase: 'All phases', items: [
      item('auto-1', 'Route, performance and loading data cross-verified by both pilots', 'SOP 3.2.1'),
      item('auto-2', 'FMA mode changes verbalized and acknowledged', 'SOP 3.2.4'),
      item('auto-3', 'Appropriate level of automation selected for conditions', 'FOM 5.3.1'),
      item('auto-4', 'FMS changes executed only after crew confirmation', 'SOP 3.2.6')
    ]},
    { id: 'tko', name: 'Takeoff & climb', phase: 'Takeoff / climb', items: [
      item('tko-1', 'Takeoff briefing includes reject criteria and departure threats', 'SOP 4.1.2'),
      item('tko-2', 'Standard takeoff callouts made', 'SOP 4.1.5'),
      item('tko-3', 'Sterile flight deck maintained below 10,000 ft', 'FOM 5.1.4')
    ]},
    { id: 'app', name: 'Descent, approach & landing', phase: 'Approach / landing', items: [
      item('app-1', 'Approach briefing completed before top of descent, threats included', 'SOP 5.1.1'),
      item('app-2', 'Stabilized approach criteria met by 1,000 ft IMC / 500 ft VMC', 'FOM 5.6.2'),
      item('app-3', 'Standard callouts at 1,000 / 500 / 100 above / minimums', 'SOP 5.4.3'),
      item('app-4', 'Go-around readiness discussed and executed if criteria not met', 'FOM 5.6.4')
    ]},
    { id: 'crm', name: 'CRM & communication', phase: 'All phases', items: [
      item('crm-1', 'Leadership sets an open, inclusive flight-deck climate', 'FOM 7.1.2'),
      item('crm-2', 'Workload planned and distributed; tasks prioritized', 'FOM 7.1.4'),
      item('crm-3', 'Monitoring and cross-checking effective', 'FOM 7.1.5'),
      item('crm-4', 'Concerns voiced and resolved (inquiry / assertion)', 'FOM 7.1.6')
    ]},
    { id: 'tem', name: 'Threat & error management', phase: 'All phases', items: [
      item('tem-1', 'Threats anticipated and verbalized proactively', 'FOM 7.3.1'),
      item('tem-2', 'Errors detected and trapped by the crew', 'FOM 7.3.3'),
      item('tem-3', 'Undesired states recognized and recovered promptly', 'FOM 7.3.4')
    ]},
    { id: 'post', name: 'Post-flight & securing', phase: 'Post-flight', items: [
      item('post-1', 'Shutdown and securing checklists complete', 'SOP 6.2.1'),
      item('post-2', 'Discrepancies, fuel and trip records documented', 'FOM 4.9.2')
    ]}
  ];

  function cloneSections(s) { return JSON.parse(JSON.stringify(s)); }

  // v3.1 (FOM Rev 13): before FMA callouts were added and stabilized criteria were restated.
  const SECTIONS_V31 = cloneSections(SECTIONS_V32);
  SECTIONS_V31.find(s => s.id === 'auto').items = SECTIONS_V31.find(s => s.id === 'auto').items.filter(i => i.id !== 'auto-2');
  SECTIONS_V31.find(s => s.id === 'app').items[1].text = 'Approach stabilized per FOM criteria';
  SECTIONS_V31.find(s => s.id === 'app').items[1].fomRef = 'FOM 5.6.1';
  SECTIONS_V31.find(s => s.id === 'prep').items[0].text = 'Trip threats reviewed';

  const PILOTS = [
    ['Avery Collins', 'PIC', ['G650ER']], ['Jordan Pike', 'SIC', ['G650ER']],
    ['Morgan Hale', 'PIC', ['G650ER']], ['Riley Okafor', 'SIC', ['G650ER']],
    ['Casey Brandt', 'PIC', ['GL7500']], ['Taylor Nguyen', 'SIC', ['GL7500']],
    ['Drew Castellano', 'PIC', ['GL7500']], ['Sam Whitaker', 'SIC', ['GL7500']],
    ['Quinn Delaney', 'PIC', ['CL350']], ['Reese Moreau', 'SIC', ['CL350']],
    ['Parker Lindqvist', 'PIC', ['CL350', 'G650ER']], ['Jamie Santos', 'SIC', ['CL350']],
    ['Logan Ferris', 'PIC', ['G650ER', 'GL7500']], ['Emerson Tate', 'SIC', ['GL7500', 'G650ER']]
  ];

  const TAILS = { 'G650ER': ['N650DM', 'N651DM'], 'GL7500': ['N750DM', 'N751DM'], 'CL350': ['N350DM'] };
  const ROUTES = ['KTEB–KPBI', 'KTEB–EGGW', 'KHPN–KASE', 'KTEB–KSFO', 'KPBI–MYNN', 'KHPN–KORD', 'KTEB–LFPB',
    'KSFO–KTEB', 'KASE–KHPN', 'KTEB–KDAL', 'KOPF–KTEB', 'KHPN–CYUL', 'KTEB–KBED', 'EGGW–KTEB'];
  const OBSERVERS = ['Capt. Dana Mercer (Standards)', 'Capt. Lee Ramsey (Standards)'];

  // Items that are systematically weaker in the fictional dataset (gives the analysis something to find).
  const WEAK = { 'app-3': 0.38, 'auto-1': 0.30, 'chk-4': 0.28, 'prep-1': 0.22, 'auto-2': 0.26, 'crm-4': 0.18 };
  const STRONG = { 'crm-1': 0.45, 'prep-3': 0.35, 'tem-1': 0.25, 'tko-3': 0.3 };

  const POSITIVE_NOTES = [
    'Captain briefed a specific plan for a late runway change and the crew executed it calmly.',
    'First officer caught a transposed waypoint during FMS cross-check before departure.',
    'Excellent threat briefing for mountainous approach, including go-around energy plan.',
    'Crew proactively requested a longer runway after reviewing contaminated-runway performance.',
    'Clear, assertive callout of an unstable approach at 1,000 ft followed by a textbook go-around.',
    'Model passenger coordination when the schedule changed; no compression of checklist flows.',
    'Superb workload management during an MEL item on an international leg.',
    'Sterile flight deck held firmly despite a passenger request from the cabin.'
  ];
  const OPPORTUNITY_NOTES = {
    'app-3': 'The 500 ft callout was late; both pilots were heads-down on a runway change.',
    'auto-1': 'Performance data entered by one pilot and not independently verified.',
    'chk-4': 'After an FBO interruption, the Before Start checklist resumed one item late.',
    'prep-1': 'Destination NOTAM about a closed taxiway was not discussed until taxi-in.',
    'auto-2': 'Several FMA changes were not verbalized during the climb.',
    'crm-4': 'SIC hesitated to question a descent clearance; resolved after a prompt.'
  };

  function iso(d) { return d.toISOString().slice(0, 10); }
  function addDays(dateStr, n) { const d = new Date(dateStr + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d); }
  function uid(prefix, r) { return prefix + '-' + Math.floor(r() * 0xFFFFFF).toString(16).padStart(6, '0').toUpperCase(); }

  function buildSeed(today) {
    const r = rng(20261026);
    const todayStr = today || iso(new Date());
    const pilots = PILOTS.map((p, i) => ({
      id: 'P' + String(i + 1).padStart(2, '0'),
      name: p[0], position: p[1], quals: p[2],
      employeeNo: 'FD-' + (1040 + i * 7), active: true,
      lineCheckDue: addDays(todayStr, Math.floor(r() * 300) - 40)
    }));

    const templates = [
      { id: 'TPL-LOO', name: 'Line Operation Observation', version: '3.1', fomRev: 'FOM Rev 13 (Jan 2026)', status: 'superseded',
        publishedAt: addDays(todayStr, -300), sections: SECTIONS_V31 },
      { id: 'TPL-LOO', name: 'Line Operation Observation', version: '3.2', fomRev: 'FOM Rev 14 (May 2026)', status: 'published',
        publishedAt: addDays(todayStr, -170), sections: SECTIONS_V32 }
    ];
    templates.forEach(t => { t.key = t.id + '@' + t.version; });

    const completions = [];
    const performance = [];
    const usedPairs = [];
    const N = 38;
    for (let k = 0; k < N; k++) {
      const daysAgo = Math.floor(8 + (k / N) * 350 + r() * 6);
      const date = addDays(todayStr, -daysAgo);
      const fleets = Object.keys(TAILS);
      const fleet = fleets[Math.floor(r() * fleets.length)];
      const pics = pilots.filter(p => p.position === 'PIC' && p.quals.includes(fleet));
      const sics = pilots.filter(p => p.position === 'SIC' && p.quals.includes(fleet));
      const pic = pics[Math.floor(r() * pics.length)];
      const sic = sics[Math.floor(r() * sics.length)];
      usedPairs.push([pic.id, sic.id]);
      const tail = TAILS[fleet][Math.floor(r() * TAILS[fleet].length)];
      const tpl = daysAgo > 170 ? templates[0] : templates[1];
      const awaiting = k < 2; // two most recent still awaiting crew attestation
      completions.push({
        id: uid('FCR', r), date, tail, fleet, route: ROUTES[Math.floor(r() * ROUTES.length)],
        observer: OBSERVERS[Math.floor(r() * OBSERVERS.length)],
        templateKey: tpl.key, templateVersion: tpl.version, fomRev: tpl.fomRev,
        prebrief: true, debriefAt: date,
        crew: [pic, sic].map(p => ({
          pilotId: p.id, name: p.name, position: p.position,
          attested: !awaiting, attestedAt: awaiting ? null : addDays(date, Math.floor(r() * 3)),
          comment: (!awaiting && r() < 0.2) ? 'Useful debrief — appreciated the focus on the approach plan.' : ''
        })),
        status: awaiting ? 'Awaiting attestation' : 'Complete'
      });

      // De-identified performance record — no crew, tail, route, day, or completion-record reference.
      const ratings = [];
      tpl.sections.forEach(sec => sec.items.forEach(it => {
        if (r() < 0.07) { ratings.push({ itemId: it.id, sectionId: sec.id, rating: 0, tem: [], note: '' }); return; }
        let base = 3;
        const roll = r();
        const weak = WEAK[it.id] || 0.07;
        const improved = (it.id === 'app-3' && tpl.version === '3.2') ? 0.6 : 1;
        const strong = STRONG[it.id] || 0.15;
        if (roll < weak * improved * 0.25) base = 1;
        else if (roll < weak * improved) base = 2;
        else if (roll > 1 - strong) base = 4;
        const tem = [];
        let note = '';
        if (base <= 2) {
          if (it.sectionId === 'app' || it.id === 'app-3') tem.push('E-CALL');
          if (it.id.startsWith('auto')) tem.push('E-AUTO');
          if (it.id.startsWith('chk')) tem.push('E-CHK');
          if (it.id === 'prep-1') tem.push('T-DOC');
          if (OPPORTUNITY_NOTES[it.id] && r() < 0.55) note = OPPORTUNITY_NOTES[it.id];
        }
        ratings.push({ itemId: it.id, sectionId: sec.id, rating: base, tem, note });
      }));
      const threatPool = TEM_CODES.threats.map(t => t.code);
      const threats = [];
      const nT = 1 + Math.floor(r() * 3);
      for (let t = 0; t < nT; t++) {
        const code = r() < 0.3 ? 'T-WX' : threatPool[Math.floor(r() * threatPool.length)];
        threats.push({ code, managed: r() < 0.84 });
      }
      const errors = ratings.filter(x => x.rating && x.rating <= 2 && x.tem.length).map(x => ({ code: x.tem[0], trapped: r() < 0.7 }));
      const recognitions = r() < 0.55 ? [POSITIVE_NOTES[Math.floor(r() * POSITIVE_NOTES.length)]] : [];
      const opportunities = ratings.filter(x => x.note).map(x => x.note).slice(0, 2);
      performance.push({
        rid: uid('POD', r), period: date.slice(0, 7), fleet, templateKey: tpl.key,
        templateVersion: tpl.version, fomRev: tpl.fomRev,
        ratings, threats, errors, uas: r() < 0.08 ? 1 : 0, recognitions, opportunities,
        duty: null
      });
    }
    // Shuffle the de-identified pool so record order cannot be used to re-link to completion records.
    for (let i = performance.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [performance[i], performance[j]] = [performance[j], performance[i]]; }
    completions.sort((a, b) => b.date.localeCompare(a.date));

    const scheduled = [
      { id: 'SCH-1001', date: addDays(todayStr, 2), fleet: 'G650ER', tail: 'N650DM', route: 'KTEB–KPBI', crewIds: ['P03', 'P04'], observer: OBSERVERS[0], status: 'Scheduled' },
      { id: 'SCH-1002', date: addDays(todayStr, 6), fleet: 'GL7500', tail: 'N751DM', route: 'KTEB–EGGW', crewIds: ['P07', 'P08'], observer: OBSERVERS[1], status: 'Scheduled' },
      { id: 'SCH-1003', date: addDays(todayStr, 11), fleet: 'CL350', tail: 'N350DM', route: 'KHPN–KASE', crewIds: ['P09', 'P12'], observer: OBSERVERS[0], status: 'Scheduled' }
    ];

    const users = [
      { name: 'Capt. Dana Mercer', role: 'Standards Captain / Observer', sso: 'Demo role switcher' },
      { name: 'Capt. Lee Ramsey', role: 'Standards Captain / Observer', sso: 'Demo role switcher' },
      { name: 'Pat Alvarez', role: 'Standards Committee / Safety Manager', sso: 'Demo role switcher' },
      { name: 'Chris Holloway', role: 'Management / Leadership', sso: 'Demo role switcher' },
      { name: 'Kai Bennett', role: 'Administrator', sso: 'Demo role switcher' }
    ].concat(pilots.map(p => ({ name: p.name, role: 'Flight Crewmember', sso: 'Demo role switcher' })));

    return {
      schema: 1,
      seededAt: todayStr,
      settings: {
        deptName: 'Demo Corporate Flight Department',
        regime: '91', part135: false,
        intervalDays: { PIC: 180, SIC: 180 },
        dueSoonDays: 30,
        minCell: 3,
        retentionMonths: 60,
        agendaThreshold: 20
      },
      pilots, templates, completions, performance, scheduled, users,
      feedback: [
        { id: 'FB-01', date: addDays(todayStr, -40), source: 'Committee', ref: 'SOP 5.4.3', text: 'Consider moving the 500 ft callout responsibility to PM for all fleets.', status: 'Under review' }
      ],
      audit: [],
      draft: null
    };
  }

  window.SC_SEED = { buildSeed, TEM_CODES };
})();
