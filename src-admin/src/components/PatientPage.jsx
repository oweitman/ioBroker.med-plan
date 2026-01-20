// src-admin/src/components/PatientPage.jsx
import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import WbSunnyIcon from '@mui/icons-material/WbSunny';
import Brightness5Icon from '@mui/icons-material/Brightness5';
import Brightness2Icon from '@mui/icons-material/Brightness2';
import NightsStayIcon from '@mui/icons-material/NightsStay';
import MoreTimeIcon from '@mui/icons-material/MoreTime';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

import { t } from '../components/i18n';

import PatientPageHeader from './PatientPageHeader';
import PatientPageAddMedication from './PatientPageAddMedication';
import PatientPageMedicationCard from './PatientPageMedicationCard';
import PatientPageIntakeHistory from './PatientPageIntakeHistory';
import PatientRemindersCard from './PatientRemindersCard';

/**
 * props:
 *   classes
 *   patient: {id: string, name: string, plan?: any} | undefined
 *   medications: Array<{id: string, name: string}>
 *   onUpdatePatient: (patientId: string, updater: (p: any) => void) => void
 */
export default function PatientPage(props) {
    const { classes, patient, medications, onUpdatePatient } = props;

    const [addMedId, setAddMedId] = React.useState('');

    const makeId = React.useCallback(() => `id_${Date.now()}_${Math.round(Math.random() * 1e6)}`, []);

    const todayIso = React.useCallback(() => {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }, []);

    const units = React.useMemo(
        () => [
            { value: 'pcs', label: t('pcs') },
            { value: 'tbl', label: t('tablets') },
            { value: 'cap', label: t('capsules') },
            { value: 'sachet', label: t('sachets') },
            { value: 'mg', label: 'mg' },
            { value: 'g', label: 'g' },
            { value: 'µg', label: 'µg' },
            { value: 'ml', label: 'ml' },
            { value: 'l', label: 'l' },
            { value: 'drops', label: t('drops') },
            { value: 'puffs', label: t('puffs') },
            { value: 'iu', label: 'IU' },
            { value: 'dose', label: t('doses') },
        ],
        [],
    );

    // ---------- slotDefs defaults + helpers ----------
    const DEFAULT_SLOT_DEFS = React.useMemo(
        () => ({
            morning: { type: 'standard', label: t('Morning'), time: '08:00', graceMin: 120 },
            noon: { type: 'standard', label: t('Noon'), time: '12:30', graceMin: 120 },
            evening: { type: 'standard', label: t('Evening'), time: '18:30', graceMin: 120 },
            night: { type: 'standard', label: t('Night'), time: '22:30', graceMin: 120 },
        }),
        [],
    );
    const DEFAULT_REMINDERS = React.useMemo(
        () => ({
            enabled: true,
            defaultPolicy: {
                strategy: 'hybrid',
                windowMinutes: 120,
                maxReminders: 5,
                minGapMinutes: 10,
                fixedEveryMinutes: 15,
                hybridOffsets: [0, 0.66, 0.83, 0.92, 0.96],
                bundle: true,
                severity: {
                    mode: 'byRemainingMinutes',
                    thresholds: [
                        { lte: 10, level: 'urgent' },
                        { lte: 30, level: 'warn' },
                        { lte: 60, level: 'notice' },
                        { lte: 999999, level: 'info' },
                    ],
                },
            },
        }),
        [],
    );

    const ensureReminders = React.useCallback(
        plan => {
            plan.reminders = plan.reminders && typeof plan.reminders === 'object' ? { ...plan.reminders } : {};
            const cur = plan.reminders;

            // enabled default
            if (cur.enabled === undefined) cur.enabled = DEFAULT_REMINDERS.enabled;

            // defaultPolicy merge
            const dp = cur.defaultPolicy && typeof cur.defaultPolicy === 'object' ? { ...cur.defaultPolicy } : {};
            cur.defaultPolicy = { ...DEFAULT_REMINDERS.defaultPolicy, ...dp };

            // ensure severity merge
            const sev =
                cur.defaultPolicy.severity && typeof cur.defaultPolicy.severity === 'object'
                    ? cur.defaultPolicy.severity
                    : {};
            const defSev = DEFAULT_REMINDERS.defaultPolicy.severity;
            cur.defaultPolicy.severity = { ...defSev, ...sev };
            cur.defaultPolicy.severity.thresholds = Array.isArray(sev.thresholds) ? sev.thresholds : defSev.thresholds;

            plan.reminders = cur;
        },
        [DEFAULT_REMINDERS],
    );

    const ICON_BY_KEY = React.useMemo(
        () => ({
            morning: WbSunnyIcon,
            noon: Brightness5Icon,
            evening: Brightness2Icon,
            night: NightsStayIcon,
        }),
        [],
    );

    const ensureSlotDefs = React.useCallback(
        plan => {
            plan.slotDefs = plan.slotDefs && typeof plan.slotDefs === 'object' ? { ...plan.slotDefs } : {};
            for (const k of Object.keys(DEFAULT_SLOT_DEFS)) {
                if (!plan.slotDefs[k]) plan.slotDefs[k] = { ...DEFAULT_SLOT_DEFS[k] };
                else plan.slotDefs[k] = { ...DEFAULT_SLOT_DEFS[k], ...plan.slotDefs[k] };
            }
        },
        [DEFAULT_SLOT_DEFS],
    );

    const buildSlotsFromDefs = React.useCallback(
        defs => {
            const out = [];

            for (const key of Object.keys(defs || {})) {
                const def = defs[key] || {};
                const type = String(def.type || 'standard');

                let Icon = ICON_BY_KEY[key] || MoreTimeIcon; // unified icon for custom
                if (type === 'prn') Icon = HelpOutlineIcon;

                out.push({
                    key,
                    label: def.label || key,
                    Icon,
                    type,
                });
            }

            // order standard first, then custom, prn at end
            const keyOrder = { morning: 0, noon: 1, evening: 2, night: 3 };
            const weight = s => {
                if (keyOrder[s.key] !== undefined) return keyOrder[s.key];
                if (s.type === 'prn') return 9999;
                return 1000; // custom after standard
            };

            out.sort((a, b) => weight(a) - weight(b) || a.key.localeCompare(b.key));
            return out;
        },
        [ICON_BY_KEY],
    );

    // ---------- immutable helpers ----------
    const clonePlanRoot = React.useCallback(p => {
        const plan = p.plan ? { ...p.plan } : {};
        plan.meds = plan.meds ? { ...plan.meds } : {};
        p.plan = plan;
        return plan;
    }, []);

    const cloneMedEntry = React.useCallback((plan, medId) => {
        const prev = plan.meds[medId] || {};
        const prevDose = prev.dose || {};

        const next = {
            startDate: typeof prev.startDate === 'string' ? prev.startDate : '',
            endDate: typeof prev.endDate === 'string' ? prev.endDate : '',
            times: { morning: false, noon: false, evening: false, night: false, ...(prev.times || {}) },
            repeat: { type: 'daily', every: 1, ...(prev.repeat || {}) },
            dose: {
                mode: prevDose.mode === 'perSlot' ? 'perSlot' : 'fixed',
                fixed: Number(prevDose.fixed ?? 1) || 1,
                perSlot: {
                    morning: Number(prevDose.perSlot?.morning ?? 1) || 1,
                    noon: Number(prevDose.perSlot?.noon ?? 1) || 1,
                    evening: Number(prevDose.perSlot?.evening ?? 1) || 1,
                    night: Number(prevDose.perSlot?.night ?? 1) || 1,
                },
                unit: String(prevDose.unit || 'pcs'),
            },
            packages: Array.isArray(prev.packages) ? [...prev.packages] : [],
            ...prev,
        };

        plan.meds[medId] = next;
        return next;
    }, []);

    const medNameById = React.useCallback(id => medications.find(m => m.id === id)?.name || id, [medications]);

    // ---------- early return ----------
    if (!patient) {
        return (
            <Box>
                <Typography
                    variant="h6"
                    sx={classes.textPrimary}
                >
                    {t('Patient')}
                </Typography>
                <Typography
                    variant="body2"
                    sx={classes.textSecondary}
                >
                    {t('No patient selected.')}
                </Typography>
            </Box>
        );
    }

    // ---------- derive slotDefs + slots AFTER patient exists ----------
    const slotDefs = patient?.plan?.slotDefs || {};
    const slots = React.useMemo(() => buildSlotsFromDefs(slotDefs), [buildSlotsFromDefs, slotDefs]);

    const patientPlanMeds = patient.plan?.meds || {};
    const selectedMedIds = Object.keys(patientPlanMeds);

    const actions = React.useMemo(() => {
        const addMedicationToPlan = () => {
            if (!addMedId) return;

            onUpdatePatient(patient.id, p => {
                const plan = clonePlanRoot(p);
                ensureSlotDefs(plan); // defaults sichern

                if (!plan.meds[addMedId]) {
                    plan.meds[addMedId] = {
                        startDate: todayIso(),
                        endDate: '',
                        times: { morning: true, noon: false, evening: false, night: false },
                        repeat: { type: 'daily', every: 1 },
                        dose: {
                            mode: 'fixed',
                            fixed: 1,
                            perSlot: { morning: 1, noon: 1, evening: 1, night: 1 },
                            unit: 'pcs',
                        },
                        packages: [],
                    };
                }
            });

            setAddMedId('');
        };

        // --- slotDefs actions ---
        const setSlotDefField = (slotKey, field, value) => {
            onUpdatePatient(patient.id, p => {
                const plan = clonePlanRoot(p);
                ensureSlotDefs(plan);

                const cur = plan.slotDefs[slotKey] || {
                    type: 'custom',
                    label: slotKey,
                    time: '08:00',
                    graceMin: 120,
                };
                plan.slotDefs[slotKey] = { ...cur, [field]: value };
            });
        };

        const addCustomSlotDef = ({ label, time, graceMin }) => {
            const makeSlotKey = defs => {
                for (let i = 1; i < 1000; i++) {
                    const k = `c${i}`;
                    if (!defs[k]) return k;
                }
                return `c${Date.now()}`;
            };

            onUpdatePatient(patient.id, p => {
                const plan = clonePlanRoot(p);
                ensureSlotDefs(plan);

                const key = makeSlotKey(plan.slotDefs);
                plan.slotDefs[key] = {
                    type: 'custom',
                    label: label || t('Custom slot'),
                    time: time || '08:00',
                    graceMin: Number.isFinite(Number(graceMin)) ? Number(graceMin) : 120,
                };
            });
        };

        const removeCustomSlotDef = slotKey => {
            onUpdatePatient(patient.id, p => {
                const plan = clonePlanRoot(p);
                ensureSlotDefs(plan);

                const def = plan.slotDefs[slotKey];
                if (!def || def.type !== 'custom') return;

                delete plan.slotDefs[slotKey];

                // bei allen meds times aufräumen
                for (const mid of Object.keys(plan.meds || {})) {
                    const me = plan.meds[mid];
                    if (me?.times && Object.prototype.hasOwnProperty.call(me.times, slotKey)) {
                        const t2 = { ...me.times };
                        delete t2[slotKey];
                        me.times = t2;
                    }
                }
            });
        };

        const ensurePrnSlotDef = () => {
            onUpdatePatient(patient.id, p => {
                const plan = clonePlanRoot(p);
                ensureSlotDefs(plan);
                if (!plan.slotDefs.prn) {
                    plan.slotDefs.prn = {
                        type: 'prn',
                        label: t('As needed'),
                        time: '08:00',
                        graceMin: 1440,
                    };
                }
            });
        };

        // --- existing actions ---
        const removeMedicationFromPlan = medId => {
            onUpdatePatient(patient.id, p => {
                const plan = clonePlanRoot(p);
                const { [medId]: _removed, ...rest } = plan.meds;
                plan.meds = rest;
            });
        };

        const setRepeatType = (medId, type) => {
            onUpdatePatient(patient.id, p => {
                const plan = clonePlanRoot(p);
                const e = cloneMedEntry(plan, medId);
                e.repeat = { ...(e.repeat || {}), type, every: type === 'everyXDays' ? e.repeat.every : 1 };
            });
        };

        const setRepeatEvery = (medId, every) => {
            const n = Math.max(1, Number(every || 1));
            onUpdatePatient(patient.id, p => {
                const plan = clonePlanRoot(p);
                const e = cloneMedEntry(plan, medId);
                e.repeat = { ...(e.repeat || {}), every: n };
            });
        };

        const setMedStartDate = (medId, value) => {
            const v = String(value || '');
            onUpdatePatient(patient.id, p => {
                const plan = clonePlanRoot(p);
                const e = cloneMedEntry(plan, medId);
                e.startDate = v;
            });
        };

        const setMedEndDate = (medId, value) => {
            const v = String(value || '');
            onUpdatePatient(patient.id, p => {
                const plan = clonePlanRoot(p);
                const e = cloneMedEntry(plan, medId);
                e.endDate = v;
            });
        };

        const addPackage = medId => {
            onUpdatePatient(patient.id, p => {
                const plan = clonePlanRoot(p);
                const e = cloneMedEntry(plan, medId);

                const pkg = {
                    id: makeId(),
                    createdTs: Date.now(),
                    total: 0,
                    current: 0,
                    mark: '',
                };

                e.packages = [...(e.packages || []), pkg];
            });
        };

        const deletePackage = (medId, pkgId) => {
            onUpdatePatient(patient.id, p => {
                const plan = clonePlanRoot(p);
                const e = cloneMedEntry(plan, medId);
                e.packages = (e.packages || []).filter(x => x.id !== pkgId);
            });
        };

        const updatePackageField = (medId, pkgId, field, value) => {
            onUpdatePatient(patient.id, p => {
                const plan = clonePlanRoot(p);
                const e = cloneMedEntry(plan, medId);

                const pkgs = [...(e.packages || [])];
                const idx = pkgs.findIndex(x => x.id === pkgId);
                if (idx === -1) return;

                const pkg = { ...pkgs[idx] };

                if (field === 'total' || field === 'current') pkg[field] = Number(value) || 0;
                if (field === 'mark') pkg.mark = String(value || '');

                pkgs[idx] = pkg;
                e.packages = pkgs;
            });
        };

        const setDoseMode = (medId, mode) => {
            const m = mode === 'perSlot' ? 'perSlot' : 'fixed';

            onUpdatePatient(patient.id, p => {
                const plan = clonePlanRoot(p);
                const e = cloneMedEntry(plan, medId);

                const prevDose = e.dose || {};
                const prevMode = prevDose.mode === 'perSlot' ? 'perSlot' : 'fixed';
                const prevPerSlot = { ...(prevDose.perSlot || {}) };
                const times = { ...(e.times || {}) };

                const activeSlots = Object.keys(times).filter(k => !!times[k]);

                // Determine a sensible fixed value (what user entered in fixed mode should dominate)
                const fixedVal = Number(prevDose.fixed ?? 1);
                const fixedBase = Number.isFinite(fixedVal) && fixedVal >= 0 ? fixedVal : 1;

                if (m === 'perSlot') {
                    // fixed -> perSlot: copy fixed dose into ALL active slots (overwrite)
                    // perSlot -> perSlot: keep values, but prune inactive
                    const perSlotNext = {};

                    if (prevMode === 'fixed') {
                        activeSlots.forEach(k => {
                            perSlotNext[k] = fixedBase;
                        });
                    } else {
                        activeSlots.forEach(k => {
                            const n = Number(prevPerSlot[k]);
                            perSlotNext[k] = Number.isFinite(n) && n >= 0 ? n : fixedBase;
                        });
                    }

                    e.dose = {
                        mode: 'perSlot',
                        unit: String(prevDose.unit || 'pcs'),
                        fixed: fixedBase, // keep for later switching back / defaults
                        perSlot: perSlotNext,
                    };

                    return;
                }

                // m === 'fixed'
                // perSlot -> fixed: choose fixed from first active perSlot (if available), otherwise keep existing fixed
                let nextFixed = fixedBase;
                for (let i = 0; i < activeSlots.length; i++) {
                    const k = activeSlots[i];
                    const n = Number(prevPerSlot[k]);
                    if (Number.isFinite(n) && n >= 0) {
                        nextFixed = n;
                        break;
                    }
                }

                // In fixed mode we still prune inactive slot values (and optional: keep active perSlot values or drop all)
                // To match "inactive not saved" and keep future perSlot values, we keep only active ones:
                const perSlotPruned = {};
                activeSlots.forEach(k => {
                    const n = Number(prevPerSlot[k]);
                    if (Number.isFinite(n) && n >= 0) perSlotPruned[k] = n;
                });

                e.dose = {
                    mode: 'fixed',
                    unit: String(prevDose.unit || 'pcs'),
                    fixed: nextFixed,
                    perSlot: perSlotPruned,
                };
            });
        };

        const setDoseFixed = (medId, value) => {
            const n = Math.max(0, Number(value ?? 1));
            onUpdatePatient(patient.id, p => {
                const plan = clonePlanRoot(p);
                const e = cloneMedEntry(plan, medId);
                e.dose = { ...(e.dose || {}), fixed: Number.isFinite(n) && n >= 0 ? n : 1 };
            });
        };

        const setDoseUnit = (medId, unit) => {
            const u = String(unit || 'pcs');
            onUpdatePatient(patient.id, p => {
                const plan = clonePlanRoot(p);
                const e = cloneMedEntry(plan, medId);
                e.dose = { ...(e.dose || {}), unit: u };
            });
        };

        const setDosePerSlot = (medId, slot, value) => {
            const n = Number(value);

            onUpdatePatient(patient.id, p => {
                const plan = clonePlanRoot(p);
                const e = cloneMedEntry(plan, medId);

                const times = e.times || {};
                const perSlot = { ...(e.dose?.perSlot || {}) };

                if (!times[slot]) {
                    // inactive: do not store
                    delete perSlot[slot];
                } else {
                    perSlot[slot] = Number.isFinite(n) && n >= 0 ? n : 0;
                }

                e.dose = { ...(e.dose || {}), perSlot };
            });
        };

        const setTimeSlot = (medId, slotKey, enabled) => {
            onUpdatePatient(patient.id, p => {
                const plan = clonePlanRoot(p);
                const e = cloneMedEntry(plan, medId);

                const nextTimes = { ...(e.times || {}) };
                nextTimes[slotKey] = !!enabled;
                e.times = nextTimes;

                e.dose = e.dose || { mode: 'fixed', fixed: 1, perSlot: {}, unit: 'pcs' };
                const perSlot = { ...(e.dose.perSlot || {}) };

                if (!enabled) {
                    // IMPORTANT: inactive slots must not be stored
                    delete perSlot[slotKey];
                } else {
                    // If we are already in perSlot mode, ensure an initial value exists
                    if (e.dose.mode === 'perSlot') {
                        const cur = Number(perSlot[slotKey]);
                        const base = Number(e.dose.fixed ?? 1) || 1; // fallback
                        if (!Number.isFinite(cur) || cur < 0) {
                            perSlot[slotKey] = base;
                        } else if (cur === 0) {
                            // optional: if 0 should not happen as "dose", normalize to base
                            perSlot[slotKey] = base;
                        }
                    }
                }

                e.dose.perSlot = perSlot;
            });
        };

        const setMedicationNote = (medId, value) => {
            const note = String(value ?? ''); //.trim();
            onUpdatePatient(patient.id, p => {
                const plan = clonePlanRoot(p);
                const e = cloneMedEntry(plan, medId);
                e.note = note;
            });
        };

        const renamePatient = nextName => {
            onUpdatePatient(patient.id, p => {
                p.name = nextName;
            });
        };
        const patchPatientReminders = patch => {
            onUpdatePatient(patient.id, p => {
                const plan = clonePlanRoot(p);
                ensureSlotDefs(plan);
                ensureReminders(plan);

                const cur = plan.reminders || {};
                const next = { ...cur, ...patch };

                // deep-merge defaultPolicy if provided
                if (patch && patch.defaultPolicy) {
                    next.defaultPolicy = { ...(cur.defaultPolicy || {}), ...(patch.defaultPolicy || {}) };

                    if (patch.defaultPolicy.severity) {
                        next.defaultPolicy.severity = {
                            ...((cur.defaultPolicy || {}).severity || {}),
                            ...patch.defaultPolicy.severity,
                        };
                    }
                }

                plan.reminders = next;
            });
        };

        const setMedicationReminderOverride = (medId, nextOverride) => {
            onUpdatePatient(patient.id, p => {
                const plan = clonePlanRoot(p);
                ensureSlotDefs(plan);
                ensureReminders(plan);

                const e = cloneMedEntry(plan, medId);

                // If disabled -> remove override entirely to keep data clean
                if (!nextOverride || !nextOverride.enabled) {
                    delete e.reminderPolicyOverride;
                    return;
                }

                // sanitize policy: remove undefined keys
                const policy =
                    nextOverride.policy && typeof nextOverride.policy === 'object' ? { ...nextOverride.policy } : {};
                Object.keys(policy).forEach(k => {
                    if (policy[k] === undefined) delete policy[k];
                });

                e.reminderPolicyOverride = {
                    enabled: true,
                    policy,
                };
            });
        };

        return {
            addMedicationToPlan,
            removeMedicationFromPlan,
            renamePatient,
            // reminders (patient + medication override)
            patchPatientReminders,
            setMedicationReminderOverride,
            // slotDefs
            setSlotDefField,
            addCustomSlotDef,
            removeCustomSlotDef,
            ensurePrnSlotDef,

            // meds
            setRepeatType,
            setRepeatEvery,
            setMedStartDate,
            setMedEndDate,
            addPackage,
            deletePackage,
            updatePackageField,
            setDoseMode,
            setDoseFixed,
            setDoseUnit,
            setDosePerSlot,
            setTimeSlot,
            setMedicationNote,
        };
    }, [
        addMedId,
        patient.id,
        onUpdatePatient,
        clonePlanRoot,
        cloneMedEntry,
        ensureSlotDefs,
        ensureReminders,
        makeId,
        todayIso,
    ]);

    return (
        <Box>
            <PatientPageHeader
                classes={classes}
                name={patient.name}
                onRename={actions.renamePatient}
            />
            <PatientRemindersCard
                classes={classes}
                reminders={patient.plan?.reminders}
                onPatchReminders={actions.patchPatientReminders}
            />
            <PatientPageAddMedication
                classes={classes}
                medications={medications}
                selectedMedIds={selectedMedIds}
                addMedId={addMedId}
                onChangeAddMedId={setAddMedId}
                onAddMedicationToPlan={actions.addMedicationToPlan}
                onRemoveMedicationFromPlan={actions.removeMedicationFromPlan}
                medNameById={medNameById}
            />

            {selectedMedIds.map(mid => (
                <PatientPageMedicationCard
                    key={mid}
                    classes={classes}
                    medId={mid}
                    entry={patientPlanMeds[mid]}
                    medName={medNameById(mid)}
                    units={units}
                    slots={slots}
                    slotDefs={slotDefs}
                    actions={actions}
                />
            ))}

            <PatientPageIntakeHistory
                classes={classes}
                patient={patient}
                medications={medications}
                slots={slots}
            />
        </Box>
    );
}
