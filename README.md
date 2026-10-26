# Standards Captain — clean-sheet demo

Browser-only demonstrator of the **Standards Captain Support Application** functional specification: non-punitive, FOM-aligned Line Operation Observations (LOSA-style) for a Part 91 / IS-BAO corporate flight department, with an optional Part 135 module.

**Live demo:** https://flas-tech.github.io/standards-captain/

## What's in it
- **Role switcher** — Standards Captain, Flight Crewmember, Standards Committee / Safety Manager, Management, Administrator.
- **Personnel & scheduling** — configurable PIC/SIC intervals, due-soon window, suggested crew pairs, completion history only.
- **Observation wizard** — confirm FOM-versioned checklist → standard non-punitive pre-brief → phase-of-flight checklist (1–4 / N/O, notes, TEM codes, FOM refs, positive stars) → threats & highlights → facilitative debrief & submit. Drafts persist locally (offline-safe).
- **Dual-record architecture** — every submission creates an identifiable Flight Completion Record and a separate de-identified Performance Observation with no shared key, a random ID, random pool position, fleet + month only, and automatic redaction of names, tails, route airports and dates in notes.
- **Crew attestation** — crew attest and comment; comments stay on the completion record.
- **Analysis** — section and item non-standard rates, quarterly trend, TEM threat/error stats, v3.1→v3.2 revision effect, minimum-cell suppression, CSV export.
- **Committee agenda** — auto-generated, printable; flags FOM/SOP revision candidates vs. training emphasis; SMS JSON export; manual feedback loop.
- **Recognition, management reports, IS-BAO evidence summary.**
- **Admin** — template drafting/versioning/publishing, Part 135 toggle (line-check due, duty-time flag), retention, hash-chained audit log with integrity check, export/import of demo data.

## Demo limits
All data is fictional and stored in your browser's local storage. No server, SSO, sync or encryption at rest — each visitor gets their own copy. Use Settings → Export / Import to share a scenario. FOM/SOP paragraph numbers are placeholders.

Static HTML/CSS/JS, no build step. Run locally with `python3 -m http.server`.
