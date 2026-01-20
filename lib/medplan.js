'use strict';

const { ioUtil } = require('./ioUtil');

// --- defaults (Phase 1) ---
const DEFAULT_SLOT_TIMES = {
    morning: { h: 8, m: 0 }, // 08:00
    noon: { h: 12, m: 30 }, // 12:30
    evening: { h: 18, m: 30 }, // 18:30
    night: { h: 22, m: 30 }, // 22:30
};

// Grace period after slot time until we auto-mark "missed" (only for "today")
const MISSED_GRACE_MINUTES = 120;

// On adapter start, backfill the last N past days (yesterday..N days back).
// For past days we mark all due+planned-but-not-recorded slots as "missed".
const BACKFILL_DAYS = 7;

// Canonical patients index state id (recommended)
const PATIENTS_INDEX_STATE = '_patients';
// Reminder output state (single event, overwritten)
const REMINDER_STATE = '_reminder';

// Cache medication list -> id->name (optional, but recommended)
const MEDICATION_LIST_STATE = '_medication';

class medplanclassnew {
    constructor(adapter) {
        this.adapter = adapter;
        this.ioUtil = new ioUtil(adapter);
        this._missedTimer = null;
        this._reminderTimer = null;
        this._lastReminderSnapshotKey = null;
        this._medNameCache = { ts: 0, map: new Map() };
    }

    init() {
        this.ioUtil.logdebug('med-plan init');

        // Backfill missed intakes for past days (in case adapter was offline)
        this._backfillMissedIntakesOnStart().catch(e => this.adapter.log.warn(String(e)));

        // Start periodic missed-intake checker (every minute)
        this._startMissedIntakeTimer();

        this.ensureJsonState(`${this.adapter.namespace}.${REMINDER_STATE}`, 'Reminder events').catch(e =>
            this.adapter.log.warn(String(e)),
        );

        this._startReminderTimer();
    }

    closeConnections() {
        this._stopMissedIntakeTimer();
        this._stopReminderTimer();
        this.ioUtil.closeConnections();
    }

    /* ------------------------------------------------------------------
     * Missed-intake checker
     * ------------------------------------------------------------------ */

    _startMissedIntakeTimer() {
        this._stopMissedIntakeTimer();

        // run immediately, then every minute
        this._checkAllPatientsForMissedIntakesToday().catch(e => this.adapter.log.warn(String(e)));

        this._missedTimer = setInterval(() => {
            this._checkAllPatientsForMissedIntakesToday().catch(e => this.adapter.log.warn(String(e)));
        }, 60 * 1000);
    }

    _stopMissedIntakeTimer() {
        if (this._missedTimer) {
            clearInterval(this._missedTimer);
            this._missedTimer = null;
        }
    }

    _todayKeyLocal(d = new Date()) {
        // Local time YYYY-MM-DD
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    _dateKeyAddDays(dateKey, deltaDays) {
        const parts = String(dateKey).split('-');
        if (parts.length !== 3) {
            return dateKey;
        }

        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
            return dateKey;
        }

        const dt = new Date(y, m - 1, d, 12, 0, 0, 0); // midday to avoid DST edge cases
        dt.setDate(dt.getDate() + deltaDays);
        return this._todayKeyLocal(dt);
    }

    _slotDueDateTimeLocal(dateKey, slot) {
        const t = DEFAULT_SLOT_TIMES[slot];
        if (!t) {
            return null;
        }

        const parts = String(dateKey).split('-');
        if (parts.length !== 3) {
            return null;
        }

        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
            return null;
        }

        return new Date(y, m - 1, d, t.h, t.m, 0, 0);
    }

    _parseTimeHHMM(s) {
        const m = /^(\d{2}):(\d{2})$/.exec(String(s || '').trim());
        if (!m) {
            return null;
        }
        const h = Number(m[1]);
        const min = Number(m[2]);
        if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 23 || min < 0 || min > 59) {
            return null;
        }
        return { h, m: min };
    }

    _slotDueDateTimeLocalFromDef(dateKey, slotDef) {
        const t = this._parseTimeHHMM(slotDef?.time);
        if (!t) {
            return null;
        }

        const parts = String(dateKey).split('-');
        if (parts.length !== 3) {
            return null;
        }

        const y = parseInt(parts[0], 10);
        const mo = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) {
            return null;
        }

        return new Date(y, mo - 1, d, t.h, t.m, 0, 0);
    }

    _getSlotGraceMin(slotDef) {
        const n = Number(slotDef?.graceMin);
        return Number.isFinite(n) && n >= 0 ? n : MISSED_GRACE_MINUTES;
    }

    _getSlotDefs(patientObj) {
        const defs = patientObj?.plan?.slotDefs;
        return defs && typeof defs === 'object' && !Array.isArray(defs) ? defs : null;
    }

    _ensureDefaultSlotDefs(patientObj) {
        if (!patientObj.plan || typeof patientObj.plan !== 'object') {
            patientObj.plan = {};
        }

        const existing = this._getSlotDefs(patientObj);
        if (existing) {
            return false;
        }

        // Migration-light: defaults + optional PRN (disabled by default in meds.times)
        patientObj.plan.slotDefs = {
            morning: {
                type: 'standard',
                label: 'Morning',
                time: '08:00',
                graceMin: MISSED_GRACE_MINUTES,
                icon: 'morning',
            },
            noon: {
                type: 'standard',
                label: 'Noon',
                time: '12:30',
                graceMin: MISSED_GRACE_MINUTES,
                icon: 'noon',
            },
            evening: {
                type: 'standard',
                label: 'Evening',
                time: '18:30',
                graceMin: MISSED_GRACE_MINUTES,
                icon: 'evening',
            },
            night: {
                type: 'standard',
                label: 'Night',
                time: '22:30',
                graceMin: MISSED_GRACE_MINUTES,
                icon: 'night',
            },
            // Optional PRN definition (UI can enable per medication)
            prn: {
                type: 'prn',
                label: 'PRN',
                time: '00:00',
                graceMin: 24 * 60,
                icon: 'custom',
            },
        };
        return true;
    }

    _dateDiffDays(aKey, bKey) {
        // difference b-a in full days, in local time
        const aParts = String(aKey)
            .split('-')
            .map(n => parseInt(n, 10));
        const bParts = String(bKey)
            .split('-')
            .map(n => parseInt(n, 10));
        if (aParts.length !== 3 || bParts.length !== 3) {
            return 0;
        }

        const a = new Date(aParts[0], aParts[1] - 1, aParts[2], 0, 0, 0, 0);
        const b = new Date(bParts[0], bParts[1] - 1, bParts[2], 0, 0, 0, 0);
        const ms = b.getTime() - a.getTime();
        return Math.floor(ms / (24 * 60 * 60 * 1000));
    }

    _isValidDateKey(dateKey) {
        return typeof dateKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateKey);
    }

    _isMedActiveOnDateByRange(med, dateKey) {
        // startDate/endDate are optional strings "YYYY-MM-DD"
        // empty/undefined => open range (started earlier / ongoing)
        if (!med || typeof med !== 'object') {
            return false;
        }
        if (!this._isValidDateKey(dateKey)) {
            return false;
        }

        const start = String(med.startDate || '').trim();
        const end = String(med.endDate || '').trim();

        // If invalid user input: do not block (conservative)
        const startOk = !start || this._isValidDateKey(start);
        const endOk = !end || this._isValidDateKey(end);
        if (!startOk || !endOk) {
            return true;
        }

        if (start && dateKey < start) {
            return false;
        }
        if (end && dateKey > end) {
            return false;
        }

        return true;
    }

    _getRepeatAnchorDateKey(patientObj, medId, fallbackDateKey) {
        const med = patientObj?.plan?.meds?.[medId];

        // 1) prefer explicit startDate
        const startDate = String(med?.startDate || '').trim();
        if (this._isValidDateKey(startDate)) {
            return startDate;
        }

        // 2) fallback: earliest package createdTs
        const pkgs = Array.isArray(med?.packages) ? med.packages : [];
        let minTs = null;

        for (const p of pkgs) {
            const ts = typeof p?.createdTs === 'number' ? p.createdTs : null;
            if (ts && (!minTs || ts < minTs)) {
                minTs = ts;
            }
        }

        if (minTs) {
            return this._todayKeyLocal(new Date(minTs));
        }

        // 3) fallback
        return fallbackDateKey;
    }

    _isDueOnDateByRepeat(patientObj, medId, dateKey) {
        const med = patientObj?.plan?.meds?.[medId];
        if (!med) {
            return false;
        }

        const repeat = med.repeat || { type: 'daily', every: 1 };
        const every = Math.max(1, parseInt(repeat.every ?? 1, 10) || 1);

        if (repeat.type === 'daily') {
            if (every === 1) {
                return true;
            }
            const anchorKey = this._getRepeatAnchorDateKey(patientObj, medId, dateKey);
            return this._dateDiffDays(anchorKey, dateKey) % every === 0;
        }

        if (repeat.type === 'everyXDays') {
            const anchorKey = this._getRepeatAnchorDateKey(patientObj, medId, dateKey);
            return this._dateDiffDays(anchorKey, dateKey) % every === 0;
        }

        // weekly / unknown repeat => conservative
        return true;
    }

    _getIntakeStateValue(v) {
        // canonical: { state: 0|1|2, ts: number, count?: number }
        // legacy: number 1|2
        if (v == null) {
            return 0;
        }

        if (typeof v === 'number') {
            return v === 1 || v === 2 ? v : 0;
        }

        if (typeof v === 'object') {
            const s = v.state;
            return s === 0 || s === 1 || s === 2 ? s : 0;
        }

        return 0;
    }

    _getDoseForSlot(patientObj, medicationId, slot) {
        const med = patientObj?.plan?.meds?.[medicationId];
        if (!med) {
            return 1;
        }

        const dose = med.dose || {};
        const mode = dose.mode || 'fixed';

        if (mode === 'perSlot') {
            const ps = dose.perSlot || {};
            const n = Number(ps?.[slot]);
            if (Number.isFinite(n) && n >= 0) {
                return n;
            }

            const f = Number(dose.fixed);
            return Number.isFinite(f) && f >= 0 ? f : 1;
        }

        const f = Number(dose.fixed);
        return Number.isFinite(f) && f >= 0 ? f : 1;
    }

    _calcStockDelta(oldState, newState, dose) {
        if (oldState !== 1 && newState === 1) {
            return -dose;
        }
        if (oldState === 1 && newState !== 1) {
            return +dose;
        }
        return 0;
    }

    _applyPackageDelta(patientObj, medicationId, delta) {
        // delta < 0 => consume; delta > 0 => refund
        if (!delta) {
            return;
        }

        const med = patientObj?.plan?.meds?.[medicationId];
        if (!med) {
            return;
        }

        const pkgs = Array.isArray(med.packages) ? med.packages : [];
        if (!pkgs.length) {
            return;
        }

        const findOldestIdx = pred => {
            let bestIdx = -1;
            let bestTs = Number.POSITIVE_INFINITY;

            for (let i = 0; i < pkgs.length; i++) {
                const p = pkgs[i] || {};
                const createdTs = typeof p.createdTs === 'number' ? p.createdTs : Number.POSITIVE_INFINITY;
                if (!pred(p)) {
                    continue;
                }

                if (createdTs < bestTs) {
                    bestTs = createdTs;
                    bestIdx = i;
                }
            }
            return bestIdx;
        };

        if (delta < 0) {
            let remaining = -delta;

            while (remaining > 0) {
                const idx = findOldestIdx(p => {
                    const cur = Number(p.current);
                    return Number.isFinite(cur) && cur > 0;
                });

                if (idx < 0) {
                    break;
                }

                const p = pkgs[idx];
                const cur = Number(p.current) || 0;
                const take = Math.min(cur, remaining);

                p.current = cur - take;
                remaining -= take;
            }
            return;
        }

        // delta > 0: refund into non-full packages
        let remaining = delta;

        while (remaining > 0) {
            const idx = findOldestIdx(p => {
                const cur = Number(p.current);
                const tot = Number(p.total);
                return Number.isFinite(cur) && Number.isFinite(tot) && cur < tot;
            });

            if (idx < 0) {
                break;
            }

            const p = pkgs[idx];
            const cur = Number(p.current) || 0;
            const tot = Number(p.total) || 0;

            const add = Math.min(tot - cur, remaining);
            p.current = cur + add;
            remaining -= add;
        }
    }

    async _getPatientOidsFromIndex() {
        const patientsIndexId = `${this.adapter.namespace}.${PATIENTS_INDEX_STATE}`;

        const st = await this.ioUtil.getStateAsync(patientsIndexId, false, false);
        let list = [];

        try {
            list = st && st.val != null ? JSON.parse(String(st.val)) : [];
        } catch {
            list = [];
        }

        if (!Array.isArray(list) || list.length === 0) {
            return [];
        }

        // list entries can be either strings (patient OIDs) or objects { stateId, name, id }
        return list
            .map(x => (typeof x === 'string' ? x : x?.stateId))
            .filter(x => typeof x === 'string' && x.startsWith(`${this.adapter.namespace}.`));
    }

    async _backfillMissedIntakesOnStart() {
        const oids = await this._getPatientOidsFromIndex();
        if (!oids.length) {
            return;
        }

        const todayKey = this._todayKeyLocal(new Date());

        // yesterday ... N days back (exclude today)
        const dateKeys = [];
        for (let i = 1; i <= BACKFILL_DAYS; i++) {
            dateKeys.push(this._dateKeyAddDays(todayKey, -i));
        }

        for (const oid of oids) {
            await this._checkOnePatientForMissedIntakesRange(oid, dateKeys, { mode: 'past' });
        }
    }

    async _checkAllPatientsForMissedIntakesToday() {
        const oids = await this._getPatientOidsFromIndex();
        if (!oids.length) {
            return;
        }

        const now = new Date();
        const todayKey = this._todayKeyLocal(now);

        for (const oid of oids) {
            await this._checkOnePatientForMissedIntakesRange(oid, [todayKey], { mode: 'today', now });
        }
    }

    async _checkOnePatientForMissedIntakesRange(patientOid, dateKeys, opts) {
        const mode = opts?.mode; // 'today' | 'past'
        const now = opts?.now || new Date();

        const st = await this.ioUtil.getStateAsync(patientOid, false, false);
        if (!st || st.val == null) {
            return;
        }

        let patientObj;
        try {
            patientObj = JSON.parse(String(st.val));
        } catch {
            return;
        }

        if (!patientObj?.plan?.meds || typeof patientObj.plan.meds !== 'object') {
            return;
        }

        // ensure intake tree exists
        if (
            !patientObj.plan.intake ||
            typeof patientObj.plan.intake !== 'object' ||
            Array.isArray(patientObj.plan.intake)
        ) {
            patientObj.plan.intake = {};
        }

        // ensure slotDefs exist (migration-light)
        const slotDefsCreated = this._ensureDefaultSlotDefs(patientObj);

        let changed = false;

        for (const dateKey of dateKeys) {
            if (!this._isValidDateKey(dateKey)) {
                continue;
            }

            const intake = patientObj.plan.intake;

            if (!intake[dateKey] || typeof intake[dateKey] !== 'object' || Array.isArray(intake[dateKey])) {
                intake[dateKey] = {};
            }

            const intakeDay = intake[dateKey];

            const slotDefs = this._getSlotDefs(patientObj);
            const slotKeys = slotDefs ? Object.keys(slotDefs) : ['morning', 'noon', 'evening', 'night'];

            for (const medId of Object.keys(patientObj.plan.meds)) {
                const med = patientObj.plan.meds[medId];
                if (!med || typeof med !== 'object') {
                    continue;
                }

                // 0) range check
                if (!this._isMedActiveOnDateByRange(med, dateKey)) {
                    continue;
                }

                // 1) repeat check
                if (!this._isDueOnDateByRepeat(patientObj, medId, dateKey)) {
                    continue;
                }

                const times = med.times || {};

                if (!intakeDay[medId] || typeof intakeDay[medId] !== 'object' || Array.isArray(intakeDay[medId])) {
                    intakeDay[medId] = {};
                }

                for (const slot of slotKeys) {
                    // medication enables slot?
                    if (!times[slot]) {
                        continue;
                    }

                    const slotDef = slotDefs ? slotDefs[slot] : null;
                    const isPrn = slotDef && String(slotDef.type) === 'prn';

                    // already recorded?
                    const cur = intakeDay[medId][slot];
                    const curState = this._getIntakeStateValue(cur);

                    // if already final (taken/missed), do nothing
                    if (curState === 1 || curState === 2) {
                        continue;
                    }

                    // determine due time and grace
                    const due = slotDef
                        ? this._slotDueDateTimeLocalFromDef(dateKey, slotDef)
                        : this._slotDueDateTimeLocal(dateKey, slot);

                    if (!due) {
                        // If no due time can be determined, we cannot auto-miss
                        continue;
                    }

                    const graceMin = slotDef ? this._getSlotGraceMin(slotDef) : MISSED_GRACE_MINUTES;
                    const missedAfter = new Date(due.getTime() + graceMin * 60 * 1000);

                    if (mode === 'past') {
                        // past backfill: everything due but not recorded becomes missed
                        if (isPrn) {
                            intakeDay[medId][slot] = { state: 2, ts: Date.now(), count: 0 };
                        } else {
                            intakeDay[medId][slot] = { state: 2, ts: Date.now() };
                        }
                        changed = true;
                        continue;
                    }

                    // mode === 'today'
                    if (now.getTime() >= missedAfter.getTime()) {
                        if (isPrn) {
                            intakeDay[medId][slot] = { state: 2, ts: Date.now(), count: 0 };
                        } else {
                            intakeDay[medId][slot] = { state: 2, ts: Date.now() };
                        }
                        changed = true;
                    }

                    // else: do nothing (sparse intake log; no auto planned entry)
                }

                // cleanup med node if empty
                if (Object.keys(intakeDay[medId]).length === 0) {
                    delete intakeDay[medId];
                }
            }

            // cleanup day node if empty
            if (Object.keys(intakeDay).length === 0) {
                delete intake[dateKey];
            }
        }

        // if we created slotDefs or changed intake, persist
        if (changed || slotDefsCreated) {
            this.ioUtil.setState(patientOid, JSON.stringify(patientObj), '', '');
        }
    }
    _startReminderTimer() {
        this._stopReminderTimer();

        this._checkAllPatientsForRemindersNow().catch(e => this.adapter.log.warn(String(e)));

        this._reminderTimer = setInterval(() => {
            this._checkAllPatientsForRemindersNow().catch(e => this.adapter.log.warn(String(e)));
        }, 60 * 1000);
    }

    _stopReminderTimer() {
        if (this._reminderTimer) {
            clearInterval(this._reminderTimer);
            this._reminderTimer = null;
        }
    }

    _getRemindersConfig(patientObj) {
        const r = patientObj?.plan?.reminders;
        if (!r || typeof r !== 'object') {
            return { enabled: false, defaultPolicy: null, slotPolicy: null };
        }
        return {
            enabled: r.enabled !== false,
            defaultPolicy: r.defaultPolicy && typeof r.defaultPolicy === 'object' ? r.defaultPolicy : null,
            slotPolicy: r.slotPolicy && typeof r.slotPolicy === 'object' ? r.slotPolicy : null,
        };
    }

    _mergePolicy(base, override) {
        if (!override || typeof override !== 'object') {
            return base;
        }

        // shallow merge + nested severity merge
        const next = { ...(base || {}) };

        for (const [k, v] of Object.entries(override)) {
            if (v === undefined) {
                continue;
            }
            if (k === 'severity' && v && typeof v === 'object') {
                next.severity = { ...(next.severity || {}), ...v };
                continue;
            }
            next[k] = v;
        }
        return next;
    }
    _calcSeverity(policy, remainingMinutes) {
        const sev = policy?.severity;
        const thresholds = Array.isArray(sev?.thresholds) ? sev.thresholds : null;
        if (!thresholds || thresholds.length === 0) {
            return 'info';
        }

        // sort defensively by lte asc
        const sorted = [...thresholds].sort((a, b) => Number(a?.lte ?? 0) - Number(b?.lte ?? 0));

        for (const th of sorted) {
            const lte = Number(th?.lte);
            if (!Number.isFinite(lte)) {
                continue;
            }
            if (remainingMinutes <= lte) {
                return String(th?.level || 'info');
            }
        }
        return String(sorted[sorted.length - 1]?.level || 'info');
    }

    _severityRank(level) {
        // higher = more important
        if (level === 'urgent') {
            return 4;
        }
        if (level === 'warn') {
            return 3;
        }
        if (level === 'notice') {
            return 2;
        }
        return 1; // info/unknown
    }
    _computeReminderOffsetsMinutes(policy, windowMinutes) {
        const strategy = String(policy?.strategy || 'hybrid');
        const maxReminders = Math.max(1, parseInt(policy?.maxReminders ?? 5, 10) || 5);
        const minGap = Math.max(0, parseInt(policy?.minGapMinutes ?? 10, 10) || 10);

        const clampAndUnique = arr => {
            const uniq = [];
            for (const x of arr) {
                const n = Math.max(0, Math.min(windowMinutes, Math.round(Number(x))));
                if (!Number.isFinite(n)) {
                    continue;
                }
                if (uniq.includes(n)) {
                    continue;
                }
                uniq.push(n);
            }
            uniq.sort((a, b) => a - b);

            // enforce minGap
            const filtered = [];
            for (const m of uniq) {
                if (filtered.length === 0) {
                    filtered.push(m);
                    continue;
                }
                const last = filtered[filtered.length - 1];
                if (m - last >= minGap) {
                    filtered.push(m);
                }
            }
            return filtered.slice(0, maxReminders);
        };

        if (strategy === 'fixed') {
            const every = Math.max(1, parseInt(policy?.fixedEveryMinutes ?? 15, 10) || 15);
            const out = [];
            for (let m = 0; m <= windowMinutes; m += every) {
                out.push(m);
            }
            return clampAndUnique(out);
        }

        if (strategy === 'decay') {
            const out = [0];
            let remaining = windowMinutes;

            while (out.length < maxReminders) {
                const last = out[out.length - 1];
                remaining = windowMinutes - last;
                if (remaining <= 0) {
                    break;
                }

                const next = last + remaining / 2;
                if (next - last < minGap) {
                    break;
                }

                out.push(next);
            }
            return clampAndUnique(out);
        }

        // hybrid default
        const offsets = Array.isArray(policy?.hybridOffsets) ? policy.hybridOffsets : [0, 0.66, 0.83, 0.92, 0.96];
        const out = offsets
            .map(x => Number(x))
            .filter(n => Number.isFinite(n))
            .map(frac => frac * windowMinutes);

        // Ensure first is 0
        out.push(0);

        return clampAndUnique(out);
    }
    async _loadMedicationNameMap() {
        const now = Date.now();

        const cache = this._medNameCache || { ts: 0, map: new Map() };
        if (now - cache.ts < 60 * 1000 && cache.map && cache.map.size) {
            this._medNameCache = cache;
            return cache.map;
        }

        const id = `${this.adapter.namespace}.${MEDICATION_LIST_STATE}`;
        const st = await this.ioUtil.getStateAsync(id, false, false);

        let list = [];
        try {
            list = st && st.val != null ? JSON.parse(String(st.val)) : [];
        } catch {
            list = [];
        }

        const map = new Map();
        if (Array.isArray(list)) {
            for (const m of list) {
                if (m && typeof m === 'object' && typeof m.id === 'string') {
                    map.set(m.id, String(m.name || m.id));
                }
            }
        }

        this._medNameCache = { ts: now, map };
        return map;
    }

    async _checkAllPatientsForRemindersNow() {
        const oids = await this._getPatientOidsFromIndex();
        if (!oids.length) {
            await this._writeReminderSnapshot([]);
            return;
        }

        const now = new Date();
        const nowMs = now.getTime();
        const todayKey = this._todayKeyLocal(now);
        const nowMinute = Math.floor(nowMs / 60000);

        const events = [];
        const dedupeThisTick = new Set();

        // optional: name map
        const medNameMap = await this._loadMedicationNameMap().catch(() => new Map());

        for (const oid of oids) {
            const st = await this.ioUtil.getStateAsync(oid, false, false);
            if (!st || st.val == null) {
                continue;
            }

            let patientObj;
            try {
                patientObj = JSON.parse(String(st.val));
            } catch {
                continue;
            }

            if (!patientObj?.plan?.meds || typeof patientObj.plan.meds !== 'object') {
                continue;
            }

            const remindersCfg = this._getRemindersConfig(patientObj);
            if (!remindersCfg.enabled || !remindersCfg.defaultPolicy) {
                continue;
            }

            this._ensureDefaultSlotDefs(patientObj);
            const slotDefs = this._getSlotDefs(patientObj);
            if (!slotDefs) {
                continue;
            }

            const intake =
                patientObj.plan.intake && typeof patientObj.plan.intake === 'object' ? patientObj.plan.intake : {};
            const intakeDay = intake[todayKey] && typeof intake[todayKey] === 'object' ? intake[todayKey] : {};

            for (const slotKey of Object.keys(slotDefs)) {
                const slotDef = slotDefs[slotKey] || {};
                const slotType = String(slotDef.type || 'standard');

                // PRN default off (can be enabled later)
                if (slotType === 'prn') {
                    const prnPolicy = remindersCfg.slotPolicy?.prn;
                    const prnEnabled = prnPolicy && typeof prnPolicy === 'object' ? prnPolicy.enabled === true : false;
                    if (!prnEnabled) {
                        continue;
                    }
                }

                const dueDt =
                    this._slotDueDateTimeLocalFromDef(todayKey, slotDef) ||
                    this._slotDueDateTimeLocal(todayKey, slotKey);
                if (!dueDt) {
                    continue;
                }

                const baseWindowMin = this._getSlotGraceMin(slotDef);
                const windowMinutes = Number.isFinite(Number(remindersCfg.defaultPolicy.windowMinutes))
                    ? Math.max(0, Number(remindersCfg.defaultPolicy.windowMinutes))
                    : baseWindowMin;

                const windowStartMs = dueDt.getTime();
                const windowEndMs = windowStartMs + windowMinutes * 60 * 1000;

                if (nowMs < windowStartMs || nowMs > windowEndMs) {
                    continue;
                }

                // collect open meds for this patient+day+slot
                const openMeds = [];
                for (const medId of Object.keys(patientObj.plan.meds)) {
                    const med = patientObj.plan.meds[medId];
                    if (!med || typeof med !== 'object') {
                        continue;
                    }

                    if (!this._isMedActiveOnDateByRange(med, todayKey)) {
                        continue;
                    }
                    if (!this._isDueOnDateByRepeat(patientObj, medId, todayKey)) {
                        continue;
                    }

                    if (!med.times?.[slotKey]) {
                        continue;
                    }

                    const curVal = intakeDay?.[medId]?.[slotKey];
                    const curState = this._getIntakeStateValue(curVal);
                    if (curState === 1 || curState === 2) {
                        continue;
                    }

                    openMeds.push(medId);
                }

                if (!openMeds.length) {
                    continue;
                }

                // Determine if a reminder is due NOW for this bundle.
                // We trigger if ANY open med's effective policy hits nowMinute.
                let effectivePolicy = null;
                let reminderIndex = null;

                for (const medId of openMeds) {
                    const med = patientObj.plan.meds[medId];
                    const override = med?.reminderPolicyOverride;

                    const pol = override?.enabled
                        ? this._mergePolicy(remindersCfg.defaultPolicy, override.policy)
                        : remindersCfg.defaultPolicy;

                    const winMinEff = Number.isFinite(Number(pol.windowMinutes))
                        ? Math.max(0, Number(pol.windowMinutes))
                        : windowMinutes;

                    const offsets = this._computeReminderOffsetsMinutes(pol, winMinEff);
                    const reminderMinutesAbs = offsets.map(offMin =>
                        Math.floor((windowStartMs + offMin * 60000) / 60000),
                    );

                    const idx = reminderMinutesAbs.findIndex(m => m === nowMinute);
                    if (idx === -1) {
                        continue;
                    }

                    effectivePolicy = pol;
                    reminderIndex = idx;
                    break;
                }

                if (!effectivePolicy) {
                    continue;
                }

                const elapsedMinutes = Math.max(0, Math.floor((nowMs - windowStartMs) / 60000));
                const remainingMinutes = Math.max(0, Math.ceil((windowEndMs - nowMs) / 60000));

                const severity = this._calcSeverity(effectivePolicy, remainingMinutes);

                const patientId = String(patientObj.id || '');
                const dedupeKey = `${patientId || oid}|${todayKey}|${slotKey}|${nowMinute}`;

                if (dedupeThisTick.has(dedupeKey)) {
                    continue;
                }
                dedupeThisTick.add(dedupeKey);

                const labelsMeds = openMeds.map(mid => {
                    const med = patientObj.plan.meds[mid] || {};
                    const unit = String(med?.dose?.unit || 'pcs');
                    return { id: mid, name: medNameMap.get(mid) || mid, unit };
                });

                events.push({
                    type: 'medplan.reminder',
                    category: 'intake',
                    version: 1,

                    entity: {
                        patientId: patientId || oid,
                        patientOid: oid,
                        slotKey,
                        ymd: todayKey,
                        medicationIds: openMeds,
                    },

                    labels: {
                        patientName: String(patientObj.name || ''),
                        slotName: String(slotDef.label || slotKey),
                        medications: labelsMeds,
                    },

                    window: { startTs: windowStartMs, endTs: windowEndMs },

                    policy: {
                        strategy: String(effectivePolicy.strategy || 'hybrid'),
                        windowMinutes: Number.isFinite(Number(effectivePolicy.windowMinutes))
                            ? Number(effectivePolicy.windowMinutes)
                            : windowMinutes,
                        minGapMinutes: Number.isFinite(Number(effectivePolicy.minGapMinutes))
                            ? Number(effectivePolicy.minGapMinutes)
                            : 10,
                        maxReminders: Number.isFinite(Number(effectivePolicy.maxReminders))
                            ? Number(effectivePolicy.maxReminders)
                            : 5,
                    },

                    reminderIndex,
                    severity,

                    due: { remainingMinutes, elapsedMinutes },

                    bundle: { enabled: true, openItems: openMeds.length },

                    dedupeKey,
                    createdTs: Date.now(),
                });
            }
        }

        // Optional: stable sort (so snapshotKey stable + nicer for consumers)
        events.sort((a, b) => {
            const ra = this._severityRank(String(a?.severity || 'info'));
            const rb = this._severityRank(String(b?.severity || 'info'));
            if (ra !== rb) {
                return rb - ra;
            }
            return Number(a?.due?.remainingMinutes ?? 999999) - Number(b?.due?.remainingMinutes ?? 999999);
        });

        await this._writeReminderSnapshot(events);
    }

    async _writeReminderSnapshot(events) {
        const id = `${this.adapter.namespace}.${REMINDER_STATE}`;
        await this.ensureJsonState(id, 'Reminder events');

        const arr = Array.isArray(events) ? events : [];

        // Stable snapshot signature: sorted dedupeKeys joined
        const keys = arr
            .map(e => String(e?.dedupeKey || ''))
            .filter(Boolean)
            .sort();

        const snapshotKey = keys.join(',');

        if (this._lastReminderSnapshotKey === snapshotKey) {
            return; // no change -> no write
        }

        this.ioUtil.setState(id, JSON.stringify(arr), '', '');
        this._lastReminderSnapshotKey = snapshotKey;
    }

    /* ------------------------------------------------------------------
     * Message handling
     * ------------------------------------------------------------------ */

    async processMessages(msg) {
        this.ioUtil.logdebug(`processMessages ${JSON.stringify(msg)}`);
        if (!msg) {
            return;
        }

        const { command, message, callback } = msg;

        const respond = (err, result) => {
            if (!callback) {
                return;
            }

            if (err) {
                this.adapter.sendTo(msg.from, command, { error: err ? String(err) : null }, callback);
            } else {
                this.adapter.sendTo(msg.from, command, result ? result : null, callback);
            }
        };

        try {
            switch (command) {
                case 'setMedicationList': {
                    await this.ensureJsonState(message.id, 'Medication list');
                    this.ioUtil.setState(message.id, JSON.stringify(message.value ?? []), '', '');
                    respond(null, true);
                    break;
                }

                case 'setPatientsIndex': {
                    await this.ensureJsonState(message.id, 'Patients index');
                    this.ioUtil.setState(message.id, JSON.stringify(message.value ?? []), '', '');
                    respond(null, true);
                    break;
                }

                case 'setPatientData': {
                    await this.ensureJsonState(message.id, `Patient ${message.displayName || message.key || ''}`);
                    this.ioUtil.setState(message.id, JSON.stringify(message.value ?? []), '', '');
                    respond(null, true);
                    break;
                }

                case 'deletePatientData': {
                    this.ioUtil.deleteObjectAsync(message.id, '', '');
                    respond(null, true);
                    break;
                }

                case 'getStateJson': {
                    const st = this.ioUtil.getState(message.id, false, false);
                    let parsed = null;
                    try {
                        // @ts-expect-error st.val
                        parsed = st && st.val != null ? JSON.parse(String(st.val)) : null;
                    } catch {
                        parsed = null;
                    }
                    respond(null, parsed);
                    break;
                }

                case 'setIntakeState': {
                    // message: { patientOid, date: "YYYY-MM-DD", medicationId, slot, state: 0|1|2, ts?: number }

                    const patientOid = message?.patientOid;
                    const dateKey = message?.date;
                    const medicationId = message?.medicationId;
                    const slot = message?.slot;
                    const state = message?.state;
                    const ts = message?.ts;

                    if (typeof patientOid !== 'string' || !patientOid.trim()) {
                        respond('patientOid missing', null);
                        break;
                    }
                    if (!patientOid.startsWith(`${this.adapter.namespace}.`)) {
                        respond(`patientOid not in namespace: ${this.adapter.namespace}`, null);
                        break;
                    }
                    if (!this._isValidDateKey(dateKey)) {
                        respond('date must be YYYY-MM-DD', null);
                        break;
                    }
                    if (typeof medicationId !== 'string' || !medicationId.trim()) {
                        respond('medicationId missing', null);
                        break;
                    }

                    const nState = typeof state === 'string' ? parseInt(state, 10) : state;
                    if (!(nState === 0 || nState === 1 || nState === 2)) {
                        respond('state invalid (0|1|2)', null);
                        break;
                    }

                    const nTs = ts === undefined || ts === null ? null : typeof ts === 'string' ? parseInt(ts, 10) : ts;
                    if (nTs !== null && (!Number.isFinite(nTs) || nTs <= 0)) {
                        respond('ts invalid (epoch ms)', null);
                        break;
                    }

                    await this.ensureJsonState(patientOid, 'Patient intake patch');

                    const st = await this.ioUtil.getStateAsync(patientOid, false, false);
                    if (!st || st.val === null || st.val === undefined) {
                        respond(`patient state empty: ${patientOid}`, null);
                        break;
                    }

                    let patientObj;
                    try {
                        patientObj = JSON.parse(String(st.val));
                    } catch {
                        respond(`patient JSON invalid: ${patientOid}`, null);
                        break;
                    }

                    if (!patientObj || typeof patientObj !== 'object') {
                        respond(`patient JSON not an object: ${patientOid}`, null);
                        break;
                    }

                    // ensure base trees
                    if (!patientObj.plan || typeof patientObj.plan !== 'object') {
                        patientObj.plan = {};
                    }
                    if (
                        !patientObj.plan.intake ||
                        typeof patientObj.plan.intake !== 'object' ||
                        Array.isArray(patientObj.plan.intake)
                    ) {
                        patientObj.plan.intake = {};
                    }

                    // ensure slotDefs exist (migration-light)
                    this._ensureDefaultSlotDefs(patientObj);

                    // validate slot against slotDefs (dynamic)
                    const slotDefs = this._getSlotDefs(patientObj);
                    if (!slotDefs || !slotDefs[slot]) {
                        respond('slot invalid (unknown slot key)', null);
                        break;
                    }

                    const slotDef = slotDefs[slot];
                    const isPrn = String(slotDef?.type || '') === 'prn';

                    const intake = patientObj.plan.intake;

                    if (!intake[dateKey] || typeof intake[dateKey] !== 'object' || Array.isArray(intake[dateKey])) {
                        intake[dateKey] = {};
                    }
                    if (
                        !intake[dateKey][medicationId] ||
                        typeof intake[dateKey][medicationId] !== 'object' ||
                        Array.isArray(intake[dateKey][medicationId])
                    ) {
                        intake[dateKey][medicationId] = {};
                    }

                    // --- read previous slot value (once!) ---
                    const prevVal = intake?.[dateKey]?.[medicationId]?.[slot];
                    const oldState = this._getIntakeStateValue(prevVal);

                    // Determine dose for this med+slot
                    const dose = this._getDoseForSlot(patientObj, medicationId, slot);

                    const useTs = nTs !== null ? nTs : Date.now();

                    // PRN handling: every click on state=1 increments count and consumes stock each time.
                    const prevCount = typeof prevVal?.count === 'number' && prevVal.count > 0 ? prevVal.count : 0;

                    if (isPrn) {
                        if (nState === 1) {
                            // consume every time you press "taken"
                            this._applyPackageDelta(patientObj, medicationId, -dose);

                            intake[dateKey][medicationId][slot] = {
                                state: 1,
                                ts: useTs,
                                count: prevCount + 1,
                            };
                        } else if (nState === 2) {
                            // "no need / missed" -> reset count, no auto-refund
                            intake[dateKey][medicationId][slot] = {
                                state: 2,
                                ts: useTs,
                                count: 0,
                            };
                        } else {
                            // state=0 planned/neutral for PRN: keep it explicit if you want; set count to 0
                            intake[dateKey][medicationId][slot] = {
                                state: 0,
                                ts: useTs,
                                count: 0,
                            };
                        }
                    } else {
                        // Non-PRN: transition-based stock delta (taken <-> not taken)
                        const newState = nState;
                        const delta = this._calcStockDelta(oldState, newState, dose);
                        if (delta !== 0) {
                            this._applyPackageDelta(patientObj, medicationId, delta);
                        }

                        intake[dateKey][medicationId][slot] = { state: nState, ts: useTs };
                    }

                    this.ioUtil.setState(patientOid, JSON.stringify(patientObj), '', '');
                    respond(null, true);
                    break;
                }

                case 'getMedicationList': {
                    const id = message?.id;
                    if (typeof id !== 'string' || !id.trim()) {
                        respond('id missing', null);
                        break;
                    }

                    const st = await this.ioUtil.getStateAsync(id, false, false);
                    let parsed = null;
                    try {
                        parsed = st && st.val != null ? JSON.parse(String(st.val)) : null;
                    } catch {
                        parsed = null;
                    }
                    respond(null, { value: Array.isArray(parsed) ? parsed : [] });
                    break;
                }

                case 'getPatientsIndex': {
                    const id = message?.id;
                    if (typeof id !== 'string' || !id.trim()) {
                        respond('id missing', null);
                        break;
                    }

                    const st = await this.ioUtil.getStateAsync(id, false, false);
                    let parsed = null;
                    try {
                        parsed = st && st.val != null ? JSON.parse(String(st.val)) : null;
                    } catch {
                        parsed = null;
                    }
                    respond(null, { value: Array.isArray(parsed) ? parsed : [] });
                    break;
                }

                case 'getPatientData': {
                    const id = message?.id;
                    if (typeof id !== 'string' || !id.trim()) {
                        respond('id missing', null);
                        break;
                    }

                    const st = await this.ioUtil.getStateAsync(id, false, false);
                    let parsed = null;
                    try {
                        parsed = st && st.val != null ? JSON.parse(String(st.val)) : null;
                    } catch {
                        parsed = null;
                    }
                    respond(null, { value: parsed && typeof parsed === 'object' ? parsed : null });
                    break;
                }

                default:
                    respond(`Unknown command: ${command}`, null);
                    break;
            }
        } catch (e) {
            respond(e, null);
        }
    }

    async ensureJsonState(id, name) {
        // id can be fully qualified or relative; we accept either.
        const prefix = `${this.adapter.name}.${this.adapter.instance}.`;
        const relId = id.startsWith(prefix) ? id.substring(prefix.length) : id;

        await this.ioUtil.createObjectAsync(
            {
                name: relId || name,
                type: 'string',
                role: 'json',
                read: true,
                write: true,
                def: '',
            },
            '',
            '',
        );
    }

    toPatientKey(name) {
        const s = String(name || '').trim();
        if (!s) {
            return '';
        }

        const replaced = s
            .replace(/ä/g, 'ae')
            .replace(/ö/g, 'oe')
            .replace(/ü/g, 'ue')
            .replace(/Ä/g, 'Ae')
            .replace(/Ö/g, 'Oe')
            .replace(/Ü/g, 'Ue')
            .replace(/ß/g, 'ss');

        const ascii = replaced.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const tokens = ascii
            .replace(/[^a-zA-Z0-9]+/g, ' ')
            .trim()
            .split(/\s+/)
            .filter(Boolean);

        return tokens.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join('');
    }
}

module.exports = medplanclassnew;
