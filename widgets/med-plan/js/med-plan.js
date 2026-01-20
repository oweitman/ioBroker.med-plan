/*
    ioBroker.vis med-plan Widget-Set
    version: "0.0.1"
    Copyright 2026 oweitman
*/
'use strict';

import { version as pkgVersion } from '../../../package.json';
import translations from '../i18n/translations.json';
$.extend(true, systemDictionary, translations);

vis.binds['med-plan'] = {
    version: pkgVersion,

    // ---------------------------
    // Public / entry points
    // ---------------------------
    showVersion: function () {
        if (vis.binds['med-plan'].version) {
            console.log(`Version med-plan: ${vis.binds['med-plan'].version}`);
            vis.binds['med-plan'].version = null;
        }
    },

    createWidget: function (widgetID, view, data, style) {
        var $div = $(`#${widgetID}`);
        if (!$div.length) {
            return setTimeout(function () {
                vis.binds['med-plan'].createWidget(widgetID, view, data, style);
            }, 100);
        }

        var text = '';
        text += `OID: ${data.oid || ''}<br>`;
        text += `OID value: <span class="med-plan-value">${data.oid ? vis.states[`${data.oid}.val`] : ''}</span><br>`;
        $div.html(text);
    },

    createDayPlanWidget: function (widgetID, view, data, style) {
        vis.binds['med-plan']._createPlanWidgetCommon(widgetID, view, data, style, { mode: 'day' });
    },

    createMultiDayPlanWidget: function (widgetID, view, data, style) {
        vis.binds['med-plan']._createPlanWidgetCommon(widgetID, view, data, style, { mode: 'multiday' });
    },

    // ---------------------------
    // Shared widget engine
    // ---------------------------
    _createPlanWidgetCommon: function (widgetID, view, data, style, opts) {
        var $div = $(`#${widgetID}`);
        if (!$div.length) {
            return setTimeout(function () {
                vis.binds['med-plan']._createPlanWidgetCommon(widgetID, view, data, style, opts);
            }, 100);
        }
        $div.css({
            overflowY: 'auto',
            overflowX: 'hidden',
        });
        var mode = opts && opts.mode ? opts.mode : 'day';

        // Required inputs
        var patientOid = data.oidpatientOid;
        var medListOid = data.oidmedListOid || 'med-plan.0.medication';

        var showPatientName = data.showPatientName !== undefined ? !!data.showPatientName : true;

        // Defaults for multiday per requirement: past 1, future 7
        var daysPast = 1;
        var daysFuture = 7;
        if (mode === 'multiday') {
            var dp = parseInt(data.daysPast, 10);
            var df = parseInt(data.daysFuture, 10);
            if (!isNaN(dp)) {
                daysPast = dp;
            }
            if (!isNaN(df)) {
                daysFuture = df;
            }
        }

        function rerender() {
            if (!patientOid) {
                $div.html('<div class="med-plan-error">patientOid fehlt.</div>');
                return;
            }

            var patientRaw = vis.binds['med-plan']._getStateVal(patientOid);
            var medsRaw = vis.binds['med-plan']._getStateVal(medListOid);

            var patientObj = vis.binds['med-plan']._safeJsonParse(patientRaw, {});
            var medArr = vis.binds['med-plan']._safeJsonParse(medsRaw, []);

            var medLookup = vis.binds['med-plan']._buildMedicationLookup(medArr);
            var patientVM = vis.binds['med-plan']._normalizePatientModel(patientObj, medLookup);

            var slots = vis.binds['med-plan']._getSlotsForPatientSorted(patientObj);

            if (!patientVM.id) {
                $div.html('<div class="med-plan-error">Patientendaten fehlen oder sind ungültig.</div>');
                return;
            }

            var now = new Date();
            var base = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // today 00:00 local

            if (mode === 'day') {
                var ymdKey = vis.binds['med-plan']._formatDateLocalYYYYMMDD(base);
                var ymdLabel = vis.binds['med-plan']._formatDateLocalized(base);

                var inner = vis.binds['med-plan']._renderDayTable(
                    patientVM,
                    patientObj,
                    base,
                    ymdKey,
                    ymdLabel,
                    showPatientName,
                    slots,
                );

                $div.html(`<div class="med-plan-root">${vis.binds['med-plan']._wrapDayCard(inner)}</div>`);
            } else {
                var html = '<div class="med-plan-root med-plan-root--multiday">';

                // Optional patient name once at top
                if (showPatientName && patientVM.name) {
                    html += `<div class="med-plan-header"><div class="med-plan-title">
                        ${vis.binds['med-plan']._mpMiniIcons.patient}
                        ${vis.binds['med-plan']._escapeHtml(patientVM.name)}
                    </div></div>`;
                }

                for (var d = -daysPast; d <= daysFuture; d++) {
                    var day = new Date(base);
                    day.setDate(base.getDate() + d);

                    var ymdKey2 = vis.binds['med-plan']._formatDateLocalYYYYMMDD(day);
                    var ymdLabel2 = vis.binds['med-plan']._formatDateLocalized(day);

                    var inner2 = vis.binds['med-plan']._renderDayTable(
                        patientVM,
                        patientObj,
                        day,
                        ymdKey2,
                        ymdLabel2,
                        false, // avoid repeating patient name per day if already shown above
                        slots,
                    );

                    html += vis.binds['med-plan']._wrapDayCard(inner2);
                }

                html += '</div>';
                $div.html(html);
            }
        }

        rerender();

        // Click handler -> sendTo adapter
        $div.off('click.medplan').on('click.medplan', 'button.mp-btn', async function () {
            var $btn = $(this);

            var ymdKey = $btn.data('date'); // "YYYY-MM-DD"
            var medicationId = $btn.data('med'); // "med_paracetamol"
            var slotKey = $btn.data('slot'); // "morning"

            var current = parseInt($btn.attr('data-state'), 10);
            if (isNaN(current)) {
                current = 0;
            }

            var next = (current + 1) % 3;

            // optimistic UI
            $btn.attr('data-state', next);
            $btn.removeClass('mp-state-0 mp-state-1 mp-state-2').addClass(`mp-state-${next}`);
            $btn.prop('disabled', true).addClass('mp-btn--busy');

            try {
                var instance = vis.binds['med-plan']._getInstanceFromOid(patientOid);
                if (!instance) {
                    throw new Error(`Cannot derive instance from patientOid: ${patientOid}`);
                }

                var payload = {
                    patientOid: patientOid,
                    date: ymdKey,
                    medicationId: medicationId,
                    slot: slotKey,
                    state: next,
                };

                // only store timestamp when there is an actual decision (1 taken / 2 missed)
                if (next === 1 || next === 2) {
                    payload.ts = Date.now();
                }

                var resp = await vis.binds['med-plan']._sendToAsync(instance, 'setIntakeState', payload);
                if (resp && resp.error) {
                    throw new Error(resp.error);
                }
            } catch (e) {
                // rollback
                $btn.attr('data-state', current);
                $btn.removeClass('mp-state-0 mp-state-1 mp-state-2').addClass(`mp-state-${current}`);
                console.error('setIntakeState failed', e);
                vis.binds['med-plan']._flashError($div, 'Speichern fehlgeschlagen');
            } finally {
                $btn.prop('disabled', false).removeClass('mp-btn--busy');
            }
        });

        // Subscribe to state updates
        function onAnyChange() {
            rerender();
        }

        var bound = [];
        if (patientOid) {
            vis.states.bind(`${patientOid}.val`, onAnyChange);
            bound.push(`${patientOid}.val`);
        }
        if (medListOid) {
            vis.states.bind(`${medListOid}.val`, onAnyChange);
            bound.push(`${medListOid}.val`);
        }

        $div.data('bound', bound);
        $div.data('bindHandler', onAnyChange);

        // Midnight rollover
        vis.binds['med-plan']._bindMidnightRerender($div, widgetID, rerender);
    },

    // ---------------------------
    // Day Card wrapper
    // ---------------------------
    _wrapDayCard: function (innerHtml) {
        return `<div class="mp-day-card">${innerHtml}</div>`;
    },

    // ---------------------------
    // Helpers
    // ---------------------------
    _timeToMinutes: function (hhmm) {
        var m = /^(\d{2}):(\d{2})$/.exec(String(hhmm || '').trim());
        if (!m) return null;
        var h = Number(m[1]);
        var min = Number(m[2]);
        if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 23 || min < 0 || min > 59) return null;
        return h * 60 + min;
    },

    _getSlotDef: function (patientObj, slotKey) {
        var slotDefs = patientObj && patientObj.plan && patientObj.plan.slotDefs ? patientObj.plan.slotDefs : null;
        return slotDefs && slotDefs[slotKey] ? slotDefs[slotKey] : null;
    },

    _getSlotsForPatientSorted: function (patientObj) {
        var slotDefs = patientObj && patientObj.plan && patientObj.plan.slotDefs ? patientObj.plan.slotDefs : null;

        // fallback: bisherige Standard-Slots
        if (!slotDefs || typeof slotDefs !== 'object') {
            return [
                { key: 'morning', label: 'Morning', icon: 'morning', type: 'standard' },
                { key: 'noon', label: 'Noon', icon: 'noon', type: 'standard' },
                { key: 'evening', label: 'Evening', icon: 'evening', type: 'standard' },
                { key: 'night', label: 'Night', icon: 'night', type: 'standard' },
            ];
        }

        // normalize to array
        var keys = Object.keys(slotDefs);
        var base = keys.map(function (k) {
            var d = slotDefs[k] || {};
            return {
                key: k,
                type: String(d.type || 'custom'),
                label: d.label || k,
                icon: d.icon || k,
                time: d.time || '',
            };
        });

        var timeToMinutes = vis.binds['med-plan']._timeToMinutes;

        // stable key order for standard slots
        var keyOrder = { morning: 0, noon: 1, evening: 2, night: 3 };

        // sort like Admin:
        // 1) PRN to the end
        // 2) valid times first
        // 3) sort by time
        // 4) tie-breaker: standard order (if both in it)
        // 5) standard before non-standard (as in admin)
        // 6) final: key localeCompare
        base.sort(function (a, b) {
            var aType = String(a.type || 'standard');
            var bType = String(b.type || 'standard');

            var aIsPrn = aType === 'prn';
            var bIsPrn = bType === 'prn';
            if (aIsPrn !== bIsPrn) return aIsPrn ? 1 : -1;

            var am = timeToMinutes(a.time);
            var bm = timeToMinutes(b.time);

            if (am == null && bm != null) return 1;
            if (am != null && bm == null) return -1;

            if (am != null && bm != null && am !== bm) return am - bm;

            var aw = keyOrder[a.key];
            var bw = keyOrder[b.key];

            if (aw !== undefined && bw !== undefined && aw !== bw) return aw - bw;
            if (aw !== undefined && bw === undefined) return -1;
            if (aw === undefined && bw !== undefined) return 1;

            return String(a.key).localeCompare(String(b.key));
        });

        return base;
    },
    _getDoseValueForSlot: function (doseCfg, slotKey) {
        doseCfg = doseCfg && typeof doseCfg === 'object' ? doseCfg : null;
        if (!doseCfg) return null;

        var mode = String(doseCfg.mode || 'fixed');

        if (mode === 'perSlot') {
            var ps = doseCfg.perSlot && typeof doseCfg.perSlot === 'object' ? doseCfg.perSlot : null;
            if (!ps || !(slotKey in ps)) return null;

            var n = Number(ps[slotKey]);
            return Number.isFinite(n) && n >= 0 ? n : null;
        }

        // fixed mode
        var f = Number(doseCfg.fixed);
        return Number.isFinite(f) && f >= 0 ? f : null;
    },


    _safeJsonParse: function (str, fallback) {
        if (str === null || str === undefined || str === '') {
            return fallback;
        }
        try {
            return JSON.parse(str);
        } catch /* (e) */ {
            return fallback;
        }
    },

    _formatDateLocalYYYYMMDD: function (d) {
        var y = d.getFullYear();
        var m = String(d.getMonth() + 1).padStart(2, '0');
        var day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    },

    _formatDateLocalized: function (d, options) {
        try {
            var locale = (vis && vis.language) || (navigator && navigator.language) || 'en-US';

            return new Intl.DateTimeFormat(
                locale,
                options || {
                    weekday: 'short',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                },
            ).format(d);
        } catch /* (e) */ {
            return d.toLocaleDateString();
        }
    },

    _msUntilNextLocalMidnight: function () {
        var now = new Date();
        var next = new Date(now);
        next.setHours(24, 0, 0, 0);
        return next.getTime() - now.getTime();
    },

    _bindMidnightRerender: function ($div, widgetID, rerenderFn) {
        var oldTimer = $div.data('midnightTimer');
        if (oldTimer) {
            clearTimeout(oldTimer);
            $div.removeData('midnightTimer');
        }

        var t = setTimeout(function () {
            rerenderFn();
            vis.binds['med-plan']._bindMidnightRerender($div, widgetID, rerenderFn);
        }, vis.binds['med-plan']._msUntilNextLocalMidnight() + 50);

        $div.data('midnightTimer', t);
    },

    _getStateVal: function (oid) {
        return vis.states[`${oid}.val`];
    },

    _buildMedicationLookup: function (medListArr) {
        var map = {};
        if (!Array.isArray(medListArr)) {
            return map;
        }
        for (var i = 0; i < medListArr.length; i++) {
            var m = medListArr[i];
            if (m && m.id) {
                map[m.id] = m;
            }
        }
        return map;
    },

    _normalizePatientModel: function (patientObj, medLookup) {
        var res = {
            id: patientObj && patientObj.id ? patientObj.id : '',
            name: patientObj && patientObj.name ? patientObj.name : '',
            medications: [],
        };

        if (!res.medications.length) {
            var medsMap = patientObj && patientObj.plan && patientObj.plan.meds ? patientObj.plan.meds : null;

            if (medsMap && typeof medsMap === 'object' && !Array.isArray(medsMap)) {
                Object.keys(medsMap).forEach(function (medicationId) {
                    var entry = medsMap[medicationId] || {};
                    var meta = medLookup[medicationId] || {};

                    var pkgs = Array.isArray(entry.packages) ? entry.packages : [];
                    var normPkgs = pkgs.map(function (p) {
                        p = p || {};
                        var createdAt =
                            typeof p.createdTs === 'number'
                                ? new Date(p.createdTs).toISOString()
                                : p.createdAt || undefined;

                        return {
                            id: p.id,
                            createdTs: p.createdTs,
                            createdAt: createdAt,
                            total: p.total,
                            current: p.current,
                            unit: p.unit,
                            mark: p.mark,
                            marker: p.marker,
                        };
                    });

                    res.medications.push({
                        medicationId: medicationId,
                        medicationName: meta.name || medicationId || '—',
                        medicationNote: entry.note || '',
                        intakeTimes: entry.times || entry.intakeTimes || {},
                        repeat: entry.repeat || {},
                        packages: normPkgs,
                    });
                });
            }
        }

        res.medications.sort(function (a, b) {
            var an = (a.medicationName || '').toLowerCase();
            var bn = (b.medicationName || '').toLowerCase();
            if (an < bn) {
                return -1;
            }
            if (an > bn) {
                return 1;
            }
            return (a.medicationId || '').localeCompare(b.medicationId || '');
        });

        return res;
    },

    _renderDayTable: function (patientVM, patientObj, dt, ymdKey, ymdLabel, showPatientName, slots) {
        var html = '';

        slots = Array.isArray(slots) ? slots : vis.binds['med-plan']._getSlotsForPatientSorted(patientObj);

        if (showPatientName && patientVM.name) {
            html += '<div class="med-plan-header">';
            html += `<div class="med-plan-title">
                ${vis.binds['med-plan']._mpMiniIcons.patient}
                ${vis.binds['med-plan']._escapeHtml(patientVM.name)}
            </div>`;

            html += `<div class="med-plan-subtitle">
                ${vis.binds['med-plan']._mpMiniIcons.date}
                ${ymdLabel}
            </div>`;
            html += '</div>';
        } else {
            html += '<div class="med-plan-header med-plan-header--compact">';
            html += `<div class="med-plan-subtitle">
                ${vis.binds['med-plan']._mpMiniIcons.date}
                ${ymdLabel}
            </div>`;
            html += '</div>';
        }

        html += '<table class="med-plan-table">';
        html += '<tbody>';

        for (var i = 0; i < patientVM.medications.length; i++) {
            var med = patientVM.medications[i];

            // Determine package marking: oldest package (by createdTs) with current > 0
            var pkgMark = '';
            try {
                var pkgs = Array.isArray(med.packages) ? med.packages : [];
                var best = null;

                for (var p = 0; p < pkgs.length; p++) {
                    var pkg = pkgs[p] || {};
                    var cur = typeof pkg.current === 'number' ? pkg.current : parseFloat(pkg.current);
                    var created = typeof pkg.createdTs === 'number' ? pkg.createdTs : parseFloat(pkg.createdTs);

                    if (!Number.isFinite(cur) || cur <= 0) continue;
                    if (!Number.isFinite(created)) created = Number.POSITIVE_INFINITY;

                    if (!best || created < best.createdTs) {
                        best = {
                            createdTs: created,
                            mark: (pkg.mark || pkg.marker || '').toString(),
                        };
                    }
                }

                if (best && best.mark) {
                    pkgMark = best.mark;
                }
            } catch /* (e) */ {
                pkgMark = '';
            }

            html += '<tr class="med-plan-row">';

            // Medication name cell now includes optional package marking directly underneath
            html += '<td class="med-plan-med-name">';
            html += `
                <span class="med-plan-med-name-main">
                    ${vis.binds['med-plan']._mpMiniIcons.medication}
                    ${vis.binds['med-plan']._escapeHtml(med.medicationName)}
                </span>
            `;
            if (pkgMark) {
                html += `<div class="med-plan-med-packmark">
                    ${vis.binds['med-plan']._mpMiniIcons.package}
                    ${vis.binds['med-plan']._escapeHtml(pkgMark)}
                </div>`;
            }

            html += '</td>';

            for (var j = 0; j < slots.length; j++) {
                var slot = slots[j];
                var enabled = !!(med.intakeTimes && med.intakeTimes[slot.key]);

                if (!enabled) {
                    html += '<td class="med-plan-cell med-plan-cell--disabled">';
                    html += `<button type="button" class="mp-btn mp-btn--disabled" disabled aria-label="${vis.binds['med-plan']._escapeAttr(slot.label || slot.key)}">`;
                    html += '</button>';
                    html += '</td>';
                    continue;
                }

                var state = vis.binds['med-plan']._getIntakeStateFromPatient(
                    patientObj,
                    ymdKey,
                    med.medicationId,
                    slot.key,
                );
                var doseText = '';
                try {
                    var medCfg =
                        patientObj && patientObj.plan && patientObj.plan.meds
                            ? patientObj.plan.meds[med.medicationId]
                            : null;

                    var doseCfg = medCfg && medCfg.dose ? medCfg.dose : null;

                    var unit = doseCfg && doseCfg.unit ? _(String(doseCfg.unit)) : '';

                    var val = vis.binds['med-plan']._getDoseValueForSlot(doseCfg, slot.key);

                    // show only if > 0; if you want "0 unit" then remove this condition
                    if (val !== null && val > 0) {
                        doseText = `${val}${unit ? ' ' + unit : ''}`;
                    }
                } catch /* (e) */ {
                    doseText = '';
                }
                html += '<td class="med-plan-cell">';
                html +=
                    `<button type="button" class="mp-btn mp-state-${state}"` +
                    ` data-date="${vis.binds['med-plan']._escapeAttr(ymdKey)}"` +
                    ` data-med="${vis.binds['med-plan']._escapeAttr(med.medicationId)}"` +
                    ` data-slot="${vis.binds['med-plan']._escapeAttr(slot.key)}"` +
                    ` data-state="${state}"` +
                    ` aria-label="${slot.key}">`;
                var iconKey = slot.icon || slot.key;
                html += vis.binds['med-plan']._icons[iconKey] || vis.binds['med-plan']._escapeHtml(slot.label || slot.key);

                html += '</button>';
                // Dose under the button (per slot)
                html += `<div class="mp-dose">${vis.binds['med-plan']._escapeHtml(doseText)}</div>`;
                html += '</td>';
            }

            html += '</tr>';

            // Optional medication note row (full width)
            if (med.medicationNote) {
                const colSpan = 1 + slots.length;

                html += '<tr class="med-plan-row med-plan-row--note">';
                html += `<td class="med-plan-note-cell" colspan="${colSpan}">`;
                html += `<div class="med-plan-note">`;
                html += vis.binds['med-plan']._escapeHtml(med.medicationNote);
                html += `</div>`;
                html += `</td>`;
                html += '</tr>';
            }
        }

        html += '</tbody>';
        html += '</table>';

        return html;
    },


    _escapeHtml: function (s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    _escapeAttr: function (s) {
        return vis.binds['med-plan']._escapeHtml(s).replace(/`/g, '&#096;');
    },

    _getInstanceFromOid: function (oid) {
        var parts = (oid || '').trim().split('.');
        if (parts.length < 2) {
            return null;
        }
        return `${parts[0]}.${parts[1]}`;
    },

    _sendToAsync: function (instance, command, sendData) {
        return new Promise(function (resolve, reject) {
            try {
                vis.conn.sendTo(instance, command, sendData, function (receiveData) {
                    resolve(receiveData);
                });
            } catch (e) {
                reject(e);
            }
        });
    },

    _flashError: function ($root, msg) {
        var $old = $root.find('.mp-inline-error');
        if ($old.length) {
            $old.remove();
        }

        var $e = $('<div class="mp-inline-error"></div>').text(msg);
        $root.prepend($e);

        setTimeout(function () {
            $e.fadeOut(200, function () {
                $e.remove();
            });
        }, 2000);
    },

    _getIntakeStateFromPatient: function (patientObj, ymdKey, medicationId, slotKey) {
        var intake = patientObj && patientObj.plan && patientObj.plan.intake;
        var dayObj = intake && intake[ymdKey];
        var medObj = dayObj && dayObj[medicationId];
        var v = medObj ? medObj[slotKey] : 0;

        // Backward compatibility: boolean/number/object
        if (v === true) return 1;
        if (v === false) return 0;

        // New format: { state: 1|2, ts: number }
        if (v && typeof v === 'object' && !Array.isArray(v)) {
            var s = v.state;
            if (s === 0 || s === 1 || s === 2) return s;
            return 0;
        }

        if (v === 0 || v === 1 || v === 2) return v;

        return 0;
    },
    _getSlotsForPatient: function (patientObj) {
        var slotDefs = patientObj && patientObj.plan && patientObj.plan.slotDefs ? patientObj.plan.slotDefs : null;

        // Fallback: bisherige Standard-Slots
        if (!slotDefs || typeof slotDefs !== 'object') {
            return [
                { key: 'morning', label: 'M', icon: 'morning', type: 'standard' },
                { key: 'noon', label: 'Mi', icon: 'noon', type: 'standard' },
                { key: 'evening', label: 'A', icon: 'evening', type: 'standard' },
                { key: 'night', label: 'N', icon: 'night', type: 'standard' },
            ];
        }

        // 1) gewünschte Basis-Reihenfolge
        var baseOrder = ['morning', 'noon', 'evening', 'night'];

        // 2) Defs in Slot-Array normalisieren
        function toSlot(key, def) {
            def = def || {};
            return {
                key: key,
                type: def.type || 'custom',
                // label aus slotDefs, sonst key
                label: def.label || key,
                // icon aus slotDefs (morning/noon/evening/night/custom/...)
                icon: def.icon || key,
                // optional: time zum Sortieren (wird nicht angezeigt)
                time: def.time || '',
            };
        }

        var keys = Object.keys(slotDefs);

        // 3) Standard zuerst in fixer Reihenfolge (wenn vorhanden)
        var slots = [];
        for (var i = 0; i < baseOrder.length; i++) {
            var k = baseOrder[i];
            if (slotDefs[k]) {
                slots.push(toSlot(k, slotDefs[k]));
            }
        }

        // 4) alle übrigen Slots (custom etc.) – prn zuletzt
        var rest = keys
            .filter(function (k) { return baseOrder.indexOf(k) === -1; })
            .map(function (k) { return toSlot(k, slotDefs[k]); });

        // prn ans Ende schieben (falls vorhanden)
        var prn = rest.filter(function (s) { return s.key === 'prn' || s.type === 'prn'; });
        rest = rest.filter(function (s) { return !(s.key === 'prn' || s.type === 'prn'); });

        // optional: rest nach time, dann label sortieren (Anzeige egal, aber stabil)
        rest.sort(function (a, b) {
            var at = a.time || '';
            var bt = b.time || '';
            if (at < bt) return -1;
            if (at > bt) return 1;
            return (a.label || '').localeCompare(b.label || '');
        });

        // zusammenbauen
        return slots.concat(rest).concat(prn);
    },
    _icons: {
        morning:
            '<svg class="mp-ic" focusable="false" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z"></path></svg>',
        noon: '<svg class="mp-ic" focusable="false" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.31L23.31 12 20 8.69V4h-4.69L12 .69 8.69 4H4v4.69L.69 12 4 15.31V20h4.69L12 23.31 15.31 20H20v-4.69zM12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"></path></svg>',
        evening:
            '<svg class="mp-ic" focusable="false" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 8.69V4h-4.69L12 .69 8.69 4H4v4.69L.69 12 4 15.31V20h4.69L12 23.31 15.31 20H20v-4.69L23.31 12 20 8.69zM12 18c-.89 0-1.74-.2-2.5-.55C11.56 16.5 13 14.42 13 12s-1.44-4.5-3.5-5.45C10.26 6.2 11.11 6 12 6c3.31 0 6 2.69 6 6s-2.69 6-6 6z"></path></svg>',
        night: '<svg class="mp-ic" focusable="false" viewBox="0 0 24 24" aria-hidden="true"><path d="M11.1 12.08c-2.33-4.51-.5-8.48.53-10.07C6.27 2.2 1.98 6.59 1.98 12c0 .14.02.28.02.42.62-.27 1.29-.42 2-.42 1.66 0 3.18.83 4.1 2.15 1.67.48 2.9 2.02 2.9 3.85 0 1.52-.87 2.83-2.12 3.51.98.32 2.03.5 3.11.5 3.5 0 6.58-1.8 8.37-4.52-2.36.23-6.98-.97-9.26-5.41z"></path><path d="M7 16h-.18C6.4 14.84 5.3 14 4 14c-1.66 0-3 1.34-3 3s1.34 3 3 3h3c1.1 0 2-.9 2-2s-.9-2-2-2z"></path></svg>',
        custom1: '<svg class="mp-ic" focusable="false" viewBox="0 0 24 24" aria-hidden="true"><path d="M11 18h2v-2h-2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8m0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4"></path></svg>',
        custom: '<svg class="mp-ic" focusable="false" viewBox="0 0 128 128" aria-hidden="true"><g><path d="m32.293 83.019q-9.826 0-16.673-6.8469-6.8469-6.8469-6.8469-16.673 0-4.704 1.777-8.9898t5.1221-7.6309l28.224-28.224q3.345-3.345 7.6309-5.1221 4.2858-1.777 8.9898-1.777 9.826 0 16.673 6.8469 6.8469 6.8469 6.8469 16.673 0 4.704-1.777 8.9898t-5.1221 7.6309l-28.224 28.224q-3.345 3.345-7.6309 5.1221-4.2858 1.777-8.9898 1.777z"/><path d="m32.293 74.657q3.0314 0 5.8538-1.1498 2.8224-1.1499 4.913-3.2405l11.08-11.185-21.429-21.429-11.185 11.08q-2.0906 2.0906-3.2405 4.913t-1.1499 5.8538q0 6.2719 4.4426 10.715 4.4426 4.4426 10.715 4.4426z" /><path d="m60.099 53.123 11.185-11.08q2.0906-2.0906 3.2405-4.913t1.1499-5.8538q0-6.2719-4.4426-10.715-4.4426-4.4426-10.715-4.4426-3.0314 0-5.8538 1.1498-2.8224 1.1499-4.913 3.2405l-11.08 11.185z"/></g><path d="m84.068 120.75h-3.5521l3.5521-24.865h-12.432c-2.0602 0-2.0247-1.1367-1.3498-2.3444s0.17761-0.28417 0.24865-0.42625c4.5822-8.0988 11.473-20.176 20.638-36.303h3.5521l-3.5521 24.865h12.432c1.7405 0 1.9892 1.1722 1.6695 1.8116l-0.24865 0.53282c-13.995 24.474-20.957 36.729-20.957 36.729"/></svg>',
    },
    _mpMiniIcons: {
        patient:
            '<svg class="mp-mini-ic" viewBox="0 0 24 24" aria-hidden="true">' +
            '<path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z"/>' +
            '</svg>',

        date:
            '<svg class="mp-mini-ic" viewBox="0 0 24 24" aria-hidden="true">' +
            '<path d="M7 2v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-2V2h-2v2H9V2H7zm12 18H5V9h14v11z"/>' +
            '</svg>',

        medication:
            '<svg class="mp-mini-ic" viewBox="0 0 24 24" aria-hidden="true">' +
            '<path d="M4.22 11.29l8.49-8.49a3 3 0 014.24 4.24l-8.49 8.49a3 3 0 01-4.24-4.24zm1.41 1.41a1 1 0 001.41 1.41l8.49-8.49a1 1 0 10-1.41-1.41l-8.49 8.49z"/>' +
            '</svg>',

        package:
            '<svg class="mp-mini-ic" viewBox="0 0 24 24" aria-hidden="true">' +
            '<path d="M21 7l-9-5-9 5v10l9 5 9-5V7zm-9-3.18L18.47 7 12 10.18 5.53 7 12 3.82zM5 9.24l6 3.33v6.19l-6-3.33V9.24zm8 9.52v-6.19l6-3.33v6.19l-6 3.33z"/>' +
            '</svg>',
    },

};

vis.binds['med-plan'].showVersion();
