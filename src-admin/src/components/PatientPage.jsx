import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import WbSunnyIcon from '@mui/icons-material/WbSunny';
import Brightness5Icon from '@mui/icons-material/Brightness5';
import Brightness2Icon from '@mui/icons-material/Brightness2';
import NightsStayIcon from '@mui/icons-material/NightsStay';

import { t } from '../components/i18n';

import PatientPageHeader from './PatientPageHeader';
import PatientPageAddMedication from './PatientPageAddMedication';
import PatientPageMedicationCard from './PatientPageMedicationCard';
import PatientPageIntakeHistory from './PatientPageIntakeHistory';

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

    const slots = React.useMemo(
        () => [
            { key: 'morning', label: t('Morning'), Icon: WbSunnyIcon },
            { key: 'noon', label: t('Noon'), Icon: Brightness5Icon },
            { key: 'evening', label: t('Evening'), Icon: Brightness2Icon },
            { key: 'night', label: t('Night'), Icon: NightsStayIcon },
        ],
        [],
    );

    const todayIso = React.useCallback(() => {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }, []);

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

    const patientPlanMeds = patient.plan?.meds || {};
    const selectedMedIds = Object.keys(patientPlanMeds);

    const medNameById = React.useCallback(id => medications.find(m => m.id === id)?.name || id, [medications]);

    // ---------- actions ----------
    const actions = React.useMemo(() => {
        const addMedicationToPlan = () => {
            if (!addMedId) return;

            onUpdatePatient(patient.id, p => {
                const plan = clonePlanRoot(p);

                if (!plan.meds[addMedId]) {
                    plan.meds[addMedId] = {
                        startDate: todayIso(), // default
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
                const perSlot = { ...(prevDose.perSlot || {}) };

                const firstActiveSlot =
                    (e.times?.morning && 'morning') ||
                    (e.times?.noon && 'noon') ||
                    (e.times?.evening && 'evening') ||
                    (e.times?.night && 'night') ||
                    'morning';

                const baseFromSlot = Number(perSlot[firstActiveSlot] ?? prevDose.fixed ?? 1) || 1;

                e.dose = {
                    mode: m,
                    unit: String(prevDose.unit || 'pcs'),
                    fixed: Number(prevDose.fixed ?? baseFromSlot) || 1,
                    perSlot: {
                        morning: Number(perSlot.morning ?? baseFromSlot) || 1,
                        noon: Number(perSlot.noon ?? baseFromSlot) || 1,
                        evening: Number(perSlot.evening ?? baseFromSlot) || 1,
                        night: Number(perSlot.night ?? baseFromSlot) || 1,
                    },
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
                const perSlot = { ...(e.dose?.perSlot || {}) };

                perSlot[slot] = Number.isFinite(n) && n >= 0 ? n : 0;
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
                    perSlot[slotKey] = 0;
                } else {
                    const cur = Number(perSlot[slotKey] ?? 0);
                    if (!cur) perSlot[slotKey] = 1;
                }

                e.dose.perSlot = perSlot;
            });
        };

        const setMedicationNote = (medId, value) => {
            const note = String(value ?? '').trim();
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

        return {
            addMedicationToPlan,
            removeMedicationFromPlan,
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
            renamePatient,
        };
    }, [addMedId, patient.id, onUpdatePatient, clonePlanRoot, cloneMedEntry, makeId, todayIso]);

    return (
        <Box>
            <PatientPageHeader
                classes={classes}
                name={patient.name}
                onRename={actions.renamePatient}
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

            {selectedMedIds.map(medId => (
                <PatientPageMedicationCard
                    key={medId}
                    classes={classes}
                    medId={medId}
                    entry={patientPlanMeds[medId]}
                    medName={medNameById(medId)}
                    units={units}
                    slots={slots}
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
