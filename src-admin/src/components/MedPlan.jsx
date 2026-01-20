// src-admin/src/components/MedPlan.jsx
import React from 'react';
import { useTheme } from '@mui/material/styles';

import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import { t } from '../components/i18n';

import IntroPage from './IntroPage';
import MedicationPage from './MedicationPage';
import NewPatientPage from './NewPatientPage';
import PatientPage from './PatientPage';

import MedPlanDataBootstrap from './MedPlanDataBootstrap';

const styles = theme => ({
    root: { display: 'flex', height: '100%', minHeight: 400 },
    drawer: { width: 280, flexShrink: 0 },
    drawerPaper: { width: 280 },
    content: { flexGrow: 1, padding: theme.spacing(3), overflow: 'auto' },
    sectionTitle: {
        padding: theme.spacing(2, 2, 1, 2),
        fontWeight: 600,
        opacity: 0.8,
        color: theme.palette.text.primary,
    },
    sectionHeader: {
        marginBottom: '16px',
    },
    chipSlotType: {
        marginBottom: '16px',
    },
    textPrimary: { color: theme.palette.text.primary },
    textSecondary: { color: theme.palette.text.secondary },
    listItemText: { color: theme.palette.text.primary },
    actionButton: { minWidth: 120, height: 40, flexShrink: 0, whiteSpace: 'nowrap' },
    slotWrap: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '64px',
    },
    slotBtn: {
        width: '64px',
        height: '64px',
        borderRadius: '12px',
        border: '1px solid rgba(0,0,0,0.25)',
        transition: 'background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease, transform 60ms ease',
        backgroundColor: 'transparent',
        color: 'inherit',

        '&:hover': {
            backgroundColor: 'rgba(0,0,0,0.06)',
            borderColor: 'rgba(0,0,0,0.35)',
        },

        '&:active': {
            transform: 'scale(0.98)',
        },

        '&:focus': {
            outline: 'none',
        },

        '&:focus-visible': {
            boxShadow: '0 0 0 3px rgba(25, 118, 210, 0.25)',
            borderColor: 'rgba(25, 118, 210, 0.9)',
        },
    },
    slotBtnActive: {
        borderColor: 'rgba(25, 118, 210, 0.9)',
        backgroundColor: 'rgba(25, 118, 210, 0.12)',
        color: 'rgba(25, 118, 210, 1)',

        '&:hover': {
            backgroundColor: 'rgba(25, 118, 210, 0.18)',
            borderColor: 'rgba(25, 118, 210, 1)',
        },

        '&:focus-visible': {
            boxShadow: '0 0 0 3px rgba(25, 118, 210, 0.35)',
            borderColor: 'rgba(25, 118, 210, 1)',
        },
    },
    slotBtnInactive: {
        opacity: 0.55,
    },
    slotDoseField: {
        width: '120px',
        marginTop: '6px',
        '& input': {
            textAlign: 'center',
            padding: '6px 4px',
        },
    },
    slotInputFields: {
        width: '120px',
        marginTop: '6px',
        '& input': {
            textAlign: 'left',
            padding: '6px 4px',
        },
    },
});

/**
 * @param {any} props
 */
function MedPlan(props) {
    const { native, adapterName, instance, socket } = props;

    const theme = useTheme();
    const classes = React.useMemo(() => styles(theme), [theme]);

    // selected.type: 'intro' | 'medication' | 'newPatient' | 'patient'
    const [selected, setSelected] = React.useState({ type: 'intro', patientId: '' });

    // Local UI state (source of truth in UI)
    const [patients, setPatients] = React.useState(
        Array.isArray(native?.medplan?.patients) ? native.medplan.patients : [],
    );
    const [medications, setMedications] = React.useState(
        Array.isArray(native?.medplan?.medications) ? native.medplan.medications : [],
    );

    // Keep latest patients in a ref to avoid stale closures in debounced flush
    const patientsRef = React.useRef(patients);
    React.useEffect(() => {
        patientsRef.current = patients;
    }, [patients]);

    // Avoid re-seeding
    const seededRef = React.useRef(false);

    const makeId = React.useCallback(() => `id_${Date.now()}_${Math.round(Math.random() * 1e6)}`, []);

    /**
     * "Max Müller" -> "MaxMueller" (CamelCase, ASCII)
     * @param {string} name
     */
    const toPatientKey = React.useCallback(name => {
        const s = String(name || '').trim();
        if (!s) return '';

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

        return tokens.map(tok => tok.charAt(0).toUpperCase() + tok.slice(1)).join('');
    }, []);

    const sendToAdapter = React.useCallback(
        (command, message) => {
            if (!socket?.sendTo) {
                return Promise.reject(new Error('socket.sendTo not available'));
            }
            return socket.sendTo(`${adapterName}.${instance}`, command, message);
        },
        [socket, adapterName, instance],
    );

    const idMedication = `${adapterName}.${instance}._medication`;
    const idPatients = `${adapterName}.${instance}._patients`;

    const patientStateIdByName = React.useCallback(
        name => `${adapterName}.${instance}.patient-${toPatientKey(name)}`,
        [adapterName, instance, toPatientKey],
    );

    // ---------- Load methods (sendTo only) ----------
    const loadMedicationsFromDp = React.useCallback(async () => {
        const res = await sendToAdapter('getMedicationList', { id: idMedication });
        const value = res?.value ?? res;
        return Array.isArray(value) ? value : [];
    }, [sendToAdapter, idMedication]);

    const loadPatientsIndexFromDp = React.useCallback(async () => {
        const res = await sendToAdapter('getPatientsIndex', { id: idPatients });
        const value = res?.value ?? res;
        return Array.isArray(value) ? value : [];
    }, [sendToAdapter, idPatients]);

    const loadPatientDataFromDp = React.useCallback(
        async stateId => {
            const res = await sendToAdapter('getPatientData', { id: stateId });
            const value = res?.value ?? res;
            return value && typeof value === 'object' ? value : null;
        },
        [sendToAdapter],
    );

    // ---------- Persist methods (sendTo only) ----------
    const persistMedications = React.useCallback(
        async meds => {
            await sendToAdapter('setMedicationList', { id: idMedication, value: meds });
        },
        [sendToAdapter, idMedication],
    );

    const persistPatientsIndex = React.useCallback(
        async pts => {
            const index = pts.map(p => ({
                id: p.id,
                name: p.name,
                key: toPatientKey(p.name),
                stateId: patientStateIdByName(p.name),
            }));
            await sendToAdapter('setPatientsIndex', { id: idPatients, value: index });
        },
        [sendToAdapter, idPatients, toPatientKey, patientStateIdByName],
    );

    const persistPatientData = React.useCallback(
        async patient => {
            const stateId = patientStateIdByName(patient.name);
            await sendToAdapter('setPatientData', {
                id: stateId,
                displayName: patient.name,
                key: toPatientKey(patient.name),
                value: patient,
            });
            return stateId;
        },
        [sendToAdapter, patientStateIdByName, toPatientKey],
    );

    const deletePatientData = React.useCallback(
        async patientName => {
            const stateId = patientStateIdByName(patientName);
            await sendToAdapter('deletePatientData', { id: stateId });
        },
        [sendToAdapter, patientStateIdByName],
    );

    // ---- Debounced persist queue for patient updates ----
    /** @type {React.MutableRefObject<ReturnType<typeof setTimeout> | null>} */
    const persistTimerRef = React.useRef(null);
    const pendingPatientsRef = React.useRef(new Map()); // Map<patientId, patientObject>
    const pendingIndexDirtyRef = React.useRef(false);

    const PATIENT_PERSIST_DEBOUNCE_MS = 350;

    const flushPatientPersists = React.useCallback(async () => {
        if (persistTimerRef.current) {
            clearTimeout(persistTimerRef.current);
            persistTimerRef.current = null;
        }

        const pendingMap = pendingPatientsRef.current;
        const needsIndex = pendingIndexDirtyRef.current;

        if (!pendingMap.size && !needsIndex) return;

        // snapshot + reset early to allow new edits while persisting
        const patientsToPersist = Array.from(pendingMap.values());
        pendingMap.clear();
        pendingIndexDirtyRef.current = false;

        try {
            // Persist patient objects first (individual states)
            for (const p of patientsToPersist) {
                await persistPatientData(p);
            }

            // Persist index if needed (use latest patients, not closure)
            if (needsIndex) {
                await persistPatientsIndex(patientsRef.current);
            }
        } catch (e) {
            console.error('Debounced persist failed', e);
        }
    }, [persistPatientData, persistPatientsIndex]);

    const schedulePatientPersists = React.useCallback(() => {
        if (persistTimerRef.current) {
            clearTimeout(persistTimerRef.current);
        }
        persistTimerRef.current = setTimeout(() => {
            flushPatientPersists();
        }, PATIENT_PERSIST_DEBOUNCE_MS);
    }, [flushPatientPersists]);

    // Flush on unmount (avoid losing last keystrokes)
    React.useEffect(() => {
        return () => {
            if (persistTimerRef.current) {
                clearTimeout(persistTimerRef.current);
            }
            // best-effort flush; cannot await in cleanup
            flushPatientPersists();
        };
    }, [flushPatientPersists]);

    // ---------- Plan defaults + normalization (for migrations & seeds) ----------
    const makeDefaultPlan = React.useCallback(() => {
        return {
            slotDefs: {
                morning: { type: 'standard', label: 'Morning', time: '08:00', graceMin: 120 },
                noon: { type: 'standard', label: 'Noon', time: '12:30', graceMin: 120 },
                evening: { type: 'standard', label: 'Evening', time: '18:30', graceMin: 120 },
                night: { type: 'standard', label: 'Night', time: '22:30', graceMin: 120 },
                prn: { type: 'prn', label: 'As needed', time: '08:00', graceMin: 1440 },
                c1: { type: 'custom', label: 'Snack 1', time: '10:00', graceMin: 120 },
                c2: { type: 'custom', label: 'Snack 2', time: '14:00', graceMin: 120 },
            },
            reminders: {
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
            },
            meds: {},
        };
    }, []);

    const normalizePatient = React.useCallback(
        p => {
            if (!p || typeof p !== 'object') return null;

            const plan = p.plan && typeof p.plan === 'object' ? p.plan : {};
            const defPlan = makeDefaultPlan();

            const slotDefs = plan.slotDefs && typeof plan.slotDefs === 'object' ? plan.slotDefs : defPlan.slotDefs;
            const reminders = plan.reminders && typeof plan.reminders === 'object' ? plan.reminders : defPlan.reminders;
            const meds = plan.meds && typeof plan.meds === 'object' ? plan.meds : defPlan.meds;

            const normalizedMeds = {};
            const intake = plan.intake && typeof plan.intake === 'object' ? plan.intake : {};
            for (const [medId, m] of Object.entries(meds)) {
                const mm = m && typeof m === 'object' ? m : {};

                const times =
                    mm.times && typeof mm.times === 'object'
                        ? mm.times
                        : {
                              morning: false,
                              noon: false,
                              evening: false,
                              night: false,
                              prn: false,
                              c1: false,
                              c2: false,
                          };

                const dose = mm.dose && typeof mm.dose === 'object' ? mm.dose : {};
                const perSlot = dose.perSlot && typeof dose.perSlot === 'object' ? dose.perSlot : {};

                const perSlotFull = {
                    morning: perSlot.morning ?? 0,
                    noon: perSlot.noon ?? 0,
                    evening: perSlot.evening ?? 0,
                    night: perSlot.night ?? 0,
                    prn: perSlot.prn ?? 0,
                    c1: perSlot.c1 ?? 0,
                    c2: perSlot.c2 ?? 0,
                };

                normalizedMeds[medId] = {
                    startDate: mm.startDate ?? '',
                    endDate: mm.endDate ?? '',
                    times: {
                        morning: !!times.morning,
                        noon: !!times.noon,
                        evening: !!times.evening,
                        night: !!times.night,
                        prn: !!times.prn,
                        c1: !!times.c1,
                        c2: !!times.c2,
                    },
                    repeat: mm.repeat ?? { type: 'daily', every: 1 },
                    dose: {
                        mode: dose.mode ?? 'fixed',
                        unit: dose.unit ?? 'pcs',
                        fixed: dose.fixed ?? 1,
                        perSlot: perSlotFull,
                    },
                    packages: Array.isArray(mm.packages) ? mm.packages : [],
                    note: mm.note ?? '',
                    reminderPolicyOverride: mm.reminderPolicyOverride ?? undefined,
                };
            }

            return {
                id: p.id ?? '',
                name: p.name ?? '',
                stateId: p.stateId,
                plan: {
                    slotDefs,
                    reminders,
                    meds: normalizedMeds,
                    intake,
                },
            };
        },
        [makeDefaultPlan],
    );

    // ---------- UI actions ----------
    const addPatient = React.useCallback(
        async name => {
            const n = String(name || '').trim();
            if (!n) return;

            // ensure pending writes are flushed before structural changes
            await flushPatientPersists();

            const basePlan = makeDefaultPlan();
            basePlan.meds = {};

            const newPatient = normalizePatient({ id: makeId(), name: n, plan: basePlan }) || {
                id: makeId(),
                name: n,
                plan: basePlan,
            };

            const nextPatients = [...patientsRef.current, newPatient];
            setPatients(nextPatients);

            await persistPatientsIndex(nextPatients);
            await persistPatientData(newPatient);
        },
        [makeId, flushPatientPersists, makeDefaultPlan, normalizePatient, persistPatientsIndex, persistPatientData],
    );

    const deletePatient = React.useCallback(
        async patientId => {
            // ensure pending writes don't overwrite after delete
            await flushPatientPersists();

            const currentPatients = patientsRef.current;
            const p = currentPatients.find(x => x.id === patientId);
            const nextPatients = currentPatients.filter(x => x.id !== patientId);

            setPatients(nextPatients);

            if (p?.name) {
                await deletePatientData(p.name);
            }
            await persistPatientsIndex(nextPatients);

            if (selected.type === 'patient' && selected.patientId === patientId) {
                setSelected({ type: 'intro', patientId: '' });
            }
        },
        [flushPatientPersists, deletePatientData, persistPatientsIndex, selected],
    );

    const addMedication = React.useCallback(
        async name => {
            const n = String(name || '').trim();
            if (!n) return;

            const next = [...medications, { id: makeId(), name: n }];
            setMedications(next);
            await persistMedications(next);
        },
        [medications, makeId, persistMedications],
    );

    const deleteMedication = React.useCallback(
        async medId => {
            const next = medications.filter(m => m.id !== medId);
            setMedications(next);
            await persistMedications(next);
        },
        [medications, persistMedications],
    );

    const updatePatient = React.useCallback(
        (patientId, updater) => {
            setPatients(prev => {
                const current = prev.find(p => p.id === patientId);
                if (!current) return prev;

                const updatedPatient = { ...current };
                updater(updatedPatient);

                // normalize to avoid partial edits creating invalid structures
                const normalized = normalizePatient(updatedPatient) || updatedPatient;

                const next = prev.map(p => (p.id === patientId ? normalized : p));

                // queue for persistence
                pendingPatientsRef.current.set(patientId, normalized);

                // mark index dirty only if name changed
                const nameChanged = String(normalized.name || '') !== String(current.name || '');
                if (nameChanged) pendingIndexDirtyRef.current = true;

                return next;
            });

            schedulePatientPersists();
        },
        [normalizePatient, schedulePatientPersists],
    );

    const selectedPatient = selected.type === 'patient' ? patients.find(p => p.id === selected.patientId) : undefined;

    // ---- INIT/SEED ausgelagert ----
    // Diese Komponente führt den früheren useEffect-Block aus und rendert nichts.
    // Sie braucht Zugriff auf Loader/Persister/Normalizer + State-Setter.
    // --------------------------------
    const renderDetail = () => {
        switch (selected.type) {
            case 'intro':
                return <IntroPage classes={classes} />;
            case 'medication':
                return (
                    <MedicationPage
                        classes={classes}
                        medications={medications}
                        onAdd={addMedication}
                        onDelete={deleteMedication}
                    />
                );
            case 'newPatient':
                return (
                    <NewPatientPage
                        classes={classes}
                        patients={patients}
                        onAdd={addPatient}
                    />
                );
            case 'patient':
                return (
                    <PatientPage
                        classes={classes}
                        patient={selectedPatient}
                        medications={medications}
                        onUpdatePatient={updatePatient}
                    />
                );
            default:
                return <IntroPage classes={classes} />;
        }
    };

    return (
        <div style={classes.root}>
            <MedPlanDataBootstrap
                seededRef={seededRef}
                patientsRef={patientsRef}
                medications={medications}
                setPatients={setPatients}
                setMedications={setMedications}
                loadMedicationsFromDp={loadMedicationsFromDp}
                loadPatientsIndexFromDp={loadPatientsIndexFromDp}
                loadPatientDataFromDp={loadPatientDataFromDp}
                persistMedications={persistMedications}
                persistPatientsIndex={persistPatientsIndex}
                persistPatientData={persistPatientData}
                normalizePatient={normalizePatient}
                makeDefaultPlan={makeDefaultPlan}
            />

            <Drawer
                variant="permanent"
                anchor="left"
                sx={classes.drawer}
                slotProps={{
                    paper: { sx: classes.drawerPaper },
                }}
            >
                <Typography
                    sx={classes.sectionTitle}
                    variant="subtitle2"
                >
                    {t('Medication Plan')}
                </Typography>

                <List>
                    <ListItem disablePadding>
                        <ListItemButton
                            selected={selected.type === 'intro'}
                            onClick={() => setSelected({ type: 'intro', patientId: '' })}
                        >
                            <ListItemIcon>
                                <InfoOutlinedIcon />
                            </ListItemIcon>
                            <ListItemText
                                primary={t('med-plan')}
                                primaryTypographyProps={{ sx: classes.listItemText }}
                            />
                        </ListItemButton>
                    </ListItem>

                    <ListItem disablePadding>
                        <ListItemButton
                            selected={selected.type === 'medication'}
                            onClick={() => setSelected({ type: 'medication', patientId: '' })}
                        >
                            <ListItemIcon>
                                <LocalPharmacyIcon />
                            </ListItemIcon>
                            <ListItemText
                                primary={t('Medication')}
                                primaryTypographyProps={{ sx: classes.listItemText }}
                            />
                        </ListItemButton>
                    </ListItem>

                    <ListItem disablePadding>
                        <ListItemButton
                            selected={selected.type === 'newPatient'}
                            onClick={() => setSelected({ type: 'newPatient', patientId: '' })}
                        >
                            <ListItemIcon>
                                <PersonAddIcon />
                            </ListItemIcon>
                            <ListItemText
                                primary={t('New patient')}
                                primaryTypographyProps={{ sx: classes.listItemText }}
                            />
                        </ListItemButton>
                    </ListItem>
                </List>

                <Divider />

                <Typography
                    sx={classes.sectionTitle}
                    variant="subtitle2"
                >
                    {t('Patients')}
                </Typography>

                <List>
                    {patients.length === 0 ? (
                        <ListItem>
                            <ListItemText
                                primary={t('No patients')}
                                secondary={t('Create a patient first.')}
                                primaryTypographyProps={{ sx: classes.listItemText }}
                            />
                        </ListItem>
                    ) : (
                        patients.map(p => (
                            <ListItem
                                key={p.id}
                                disablePadding
                                secondaryAction={
                                    <IconButton
                                        edge="end"
                                        aria-label={t('Delete patient')}
                                        onClick={e => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            deletePatient(p.id);
                                        }}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                }
                            >
                                <ListItemButton
                                    selected={selected.type === 'patient' && selected.patientId === p.id}
                                    onClick={() => setSelected({ type: 'patient', patientId: p.id })}
                                >
                                    <ListItemIcon>
                                        <PersonIcon />
                                    </ListItemIcon>

                                    <ListItemText
                                        primary={p.name}
                                        primaryTypographyProps={{ sx: classes.listItemText }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))
                    )}
                </List>
            </Drawer>

            <main style={classes.content}>{renderDetail()}</main>
        </div>
    );
}

export default MedPlan;
