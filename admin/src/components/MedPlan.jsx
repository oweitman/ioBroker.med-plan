// src-admin/src/MedPlan.jsx
import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import Drawer from '@material-ui/core/Drawer';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import Divider from '@material-ui/core/Divider';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';

import LocalPharmacyIcon from '@material-ui/icons/LocalPharmacy';
import PersonAddIcon from '@material-ui/icons/PersonAdd';
import DeleteIcon from '@material-ui/icons/Delete';
import PersonIcon from '@material-ui/icons/Person';
import InfoOutlinedIcon from '@material-ui/icons/InfoOutlined';

import { t } from './i18n';
import IntroPage from './IntroPage';
import MedicationPage from './MedicationPage';
import NewPatientPage from './NewPatientPage';
import PatientPage from './PatientPage';

/**
 * @type {(theme: import('@material-ui/core/styles').Theme) =>
 *   Record<string, import("@material-ui/core/styles/withStyles").CreateCSSProperties>}
 */
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
        marginBottom: 8, // oder theme.spacing(1)
    },
    textPrimary: { color: theme.palette.text.primary },
    textSecondary: { color: theme.palette.text.secondary },
    listItemText: { color: theme.palette.text.primary },
    actionButton: { minWidth: 120, height: 40, flexShrink: 0, whiteSpace: 'nowrap' },
    slotWrap: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    slotBtn: {
        width: 52,
        height: 52,
        borderRadius: 12,
        border: '1px solid rgba(0,0,0,0.25)',
        transition: 'background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease, transform 60ms ease',
        backgroundColor: 'transparent',
        color: 'inherit',

        '&:hover': {
            backgroundColor: 'rgba(0,0,0,0.06)', // ToggleButton-like hover
            borderColor: 'rgba(0,0,0,0.35)',
        },

        '&:active': {
            transform: 'scale(0.98)',
        },

        '&:focus': {
            outline: 'none',
        },

        '&:focus-visible': {
            boxShadow: '0 0 0 3px rgba(25, 118, 210, 0.25)', // primary-ish focus ring (MUI default blue)
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
        width: 52,
        marginTop: 4,
        '& input': {
            textAlign: 'center',
            padding: '8px 6px',
        },
    },
});

/**
 * @param {any} props
 */
function MedPlan(props) {
    const { classes, native, adapterinfo, socket } = props;

    // selected.type: 'intro' | 'medication' | 'newPatient' | 'patient'
    const [selected, setSelected] = React.useState({ type: 'intro', patientId: '' });

    // Local UI state (source of truth in UI)
    const [patients, setPatients] = React.useState(
        Array.isArray(native?.medplan?.patients) ? native.medplan.patients : [],
    );
    const [medications, setMedications] = React.useState(
        Array.isArray(native?.medplan?.medications) ? native.medplan.medications : [],
    );

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
            return socket.sendTo(`${adapterinfo.name}.${adapterinfo.instance}`, command, message);
        },
        [socket, adapterinfo?.name, adapterinfo?.instance],
    );

    const idMedication = `${adapterinfo.name}.${adapterinfo.instance}._medication`;
    const idPatients = `${adapterinfo.name}.${adapterinfo.instance}._patients`;

    const patientStateIdByName = React.useCallback(
        name => `${adapterinfo.name}.${adapterinfo.instance}.patient-${toPatientKey(name)}`,
        [adapterinfo?.name, adapterinfo?.instance, toPatientKey],
    );

    // ---------- Load methods (sendTo only) ----------
    const loadMedicationsFromDp = React.useCallback(async () => {
        // erwartet: { value: [...] } oder direkt [...]
        const res = await sendToAdapter('getMedicationList', { id: idMedication });
        const value = res?.value ?? res;
        return Array.isArray(value) ? value : [];
    }, [sendToAdapter, idMedication]);

    const loadPatientsIndexFromDp = React.useCallback(async () => {
        // erwartet: { value: [...] } oder direkt [...]
        const res = await sendToAdapter('getPatientsIndex', { id: idPatients });
        const value = res?.value ?? res;
        return Array.isArray(value) ? value : [];
    }, [sendToAdapter, idPatients]);

    const loadPatientDataFromDp = React.useCallback(
        async stateId => {
            // erwartet: { value: {...} } oder direkt {...}
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

    // ---------- UI actions ----------
    const addPatient = React.useCallback(
        async name => {
            const n = String(name || '').trim();
            if (!n) return;

            const newPatient = { id: makeId(), name: n, plan: { meds: {} } };
            const nextPatients = [...patients, newPatient];

            // update UI immediately
            setPatients(nextPatients);

            // persist index + patient datapoint
            await persistPatientsIndex(nextPatients);
            await persistPatientData(newPatient);
        },
        [patients, makeId, persistPatientsIndex, persistPatientData],
    );

    const deletePatient = React.useCallback(
        async patientId => {
            const p = patients.find(x => x.id === patientId);
            const nextPatients = patients.filter(x => x.id !== patientId);

            setPatients(nextPatients);

            if (p?.name) {
                await deletePatientData(p.name);
            }
            await persistPatientsIndex(nextPatients);

            if (selected.type === 'patient' && selected.patientId === patientId) {
                setSelected({ type: 'intro', patientId: '' });
            }
        },
        [patients, persistPatientsIndex, deletePatientData, selected],
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

            // Placeholder: later remove this medId from all patient plans + persist affected patients
            // TODO: iterate patients, remove medId from p.plan.meds, persistPatientData(p)
        },
        [medications, persistMedications],
    );

    const updatePatient = React.useCallback(
        async (patientId, updater) => {
            const current = patients.find(p => p.id === patientId);
            if (!current) return;

            // immutable update
            const updatedPatient = { ...current };
            updater(updatedPatient);

            const nextPatients = patients.map(p => (p.id === patientId ? updatedPatient : p));

            // update UI immediately
            setPatients(nextPatients);

            // persist patient datapoint + index (index keeps name->key mapping)
            await persistPatientData(updatedPatient);
            await persistPatientsIndex(nextPatients);
        },
        [patients, persistPatientData, persistPatientsIndex],
    );

    const selectedPatient = selected.type === 'patient' ? patients.find(p => p.id === selected.patientId) : undefined;

    // --- INIT: load datapoints first, seed only if empty ---
    React.useEffect(() => {
        if (seededRef.current) return;
        seededRef.current = true;

        const seedMedications = [
            { id: 'med_paracetamol', name: 'Paracetamol' },
            { id: 'med_ibuprofen', name: 'Ibuprofen' },
            { id: 'med_vitd3', name: 'Vitamin D3' },
            { id: 'med_metformin', name: 'Metformin' },
            { id: 'med_amoxicillin', name: 'Amoxicillin' },
        ];

        const seedPatients = [
            {
                id: 'pat_max',
                name: 'Max Mustermann',
                plan: {
                    meds: {
                        med_paracetamol: {
                            times: { morning: true, noon: false, evening: true, night: false },
                            repeat: { type: 'daily', every: 1 },
                            dose: {
                                mode: 'perSlot',
                                unit: 'tbl',
                                fixed: 1,
                                perSlot: { morning: 1, noon: 1, evening: 2, night: 1 },
                            },
                            packages: [
                                {
                                    id: 'pkg_para_1',
                                    createdTs: Date.now() - 7 * 24 * 3600 * 1000,
                                    total: 20,
                                    current: 12,
                                    mark: 'Blister A',
                                },
                            ],
                        },
                        med_vitd3: {
                            times: { morning: true, noon: false, evening: false, night: false },
                            repeat: { type: 'everyXDays', every: 2 },
                            dose: {
                                mode: 'fixed',
                                unit: 'cap',
                                fixed: 1,
                                perSlot: { morning: 1, noon: 1, evening: 1, night: 1 },
                            },
                            packages: [
                                {
                                    id: 'pkg_vitd3_1',
                                    createdTs: Date.now() - 30 * 24 * 3600 * 1000,
                                    total: 60,
                                    current: 41,
                                    mark: 'Dose',
                                },
                            ],
                        },
                    },
                },
            },
            {
                id: 'pat_erika',
                name: 'Erika Musterfrau',
                plan: {
                    meds: {
                        med_ibuprofen: {
                            times: { morning: false, noon: true, evening: false, night: false },
                            repeat: { type: 'weekly', every: 1 },
                            dose: {
                                mode: 'fixed',
                                unit: 'tbl',
                                fixed: 1,
                                perSlot: { morning: 1, noon: 1, evening: 1, night: 1 },
                            },
                            packages: [
                                {
                                    id: 'pkg_ibu_1',
                                    createdTs: Date.now() - 3 * 24 * 3600 * 1000,
                                    total: 50,
                                    current: 45,
                                    mark: 'Schachtel rot',
                                },
                            ],
                        },
                    },
                },
            },
        ];

        (async () => {
            try {
                // 1) Load medication list + patients index from datapoints
                const dpMeds = await loadMedicationsFromDp();
                const dpIndex = await loadPatientsIndexFromDp();

                // 2) If at least one of them has content, treat as "data exists"
                const hasAnyDpData = (dpMeds && dpMeds.length) || (dpIndex && dpIndex.length);

                if (hasAnyDpData) {
                    // Load patient objects (best-effort)
                    const loadedPatients = [];
                    if (Array.isArray(dpIndex)) {
                        for (const idx of dpIndex) {
                            const stateId = idx?.stateId;
                            if (!stateId) continue;

                            const pObj = await loadPatientDataFromDp(stateId);
                            if (pObj) loadedPatients.push(pObj);
                        }
                    }

                    // Update UI with what we have
                    if (Array.isArray(dpMeds)) setMedications(dpMeds);
                    if (loadedPatients.length) {
                        setPatients(loadedPatients);
                    } else if (Array.isArray(dpIndex) && dpIndex.length) {
                        // Fallback: show index as minimal patient list if patient datapoints missing/corrupt
                        setPatients(dpIndex.map(i => ({ id: i.id, name: i.name, plan: { meds: {} } })));
                    }

                    return; // do NOT seed
                }

                // 3) No datapoint data -> seed demo data and persist
                setMedications(seedMedications);
                setPatients(seedPatients);

                await persistMedications(seedMedications);
                await persistPatientsIndex(seedPatients);
                await persistPatientData(seedPatients[0]);
                await persistPatientData(seedPatients[1]);
            } catch (e) {
                // Safety net: if loading fails for any reason, do not overwrite existing native config blindly.
                // Seed only if local UI is empty to avoid accidental overwrite.
                if (patients.length || medications.length) return;

                setMedications(seedMedications);
                setPatients(seedPatients);

                await persistMedications(seedMedications);
                await persistPatientsIndex(seedPatients);
                await persistPatientData(seedPatients[0]);
                await persistPatientData(seedPatients[1]);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    // --- /INIT ---

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
        <div className={classes.root}>
            <Drawer
                className={classes.drawer}
                variant="permanent"
                classes={{ paper: classes.drawerPaper }}
                anchor="left"
            >
                <Typography
                    className={classes.sectionTitle}
                    variant="subtitle2"
                >
                    {t('Medication Plan')}
                </Typography>

                <List>
                    <ListItem
                        button
                        selected={selected.type === 'intro'}
                        onClick={() => setSelected({ type: 'intro', patientId: '' })}
                    >
                        <ListItemIcon>
                            <InfoOutlinedIcon />
                        </ListItemIcon>
                        <ListItemText
                            primary={t('med-plan')}
                            classes={{ primary: classes.listItemText }}
                        />
                    </ListItem>

                    <ListItem
                        button
                        selected={selected.type === 'medication'}
                        onClick={() => setSelected({ type: 'medication', patientId: '' })}
                    >
                        <ListItemIcon>
                            <LocalPharmacyIcon />
                        </ListItemIcon>
                        <ListItemText
                            primary={t('Medication')}
                            classes={{ primary: classes.listItemText }}
                        />
                    </ListItem>

                    <ListItem
                        button
                        selected={selected.type === 'newPatient'}
                        onClick={() => setSelected({ type: 'newPatient', patientId: '' })}
                    >
                        <ListItemIcon>
                            <PersonAddIcon />
                        </ListItemIcon>
                        <ListItemText
                            primary={t('New patient')}
                            classes={{ primary: classes.listItemText }}
                        />
                    </ListItem>
                </List>

                <Divider />

                <Typography
                    className={classes.sectionTitle}
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
                                classes={{ primary: classes.listItemText }}
                            />
                        </ListItem>
                    ) : (
                        patients.map(p => (
                            <ListItem
                                button
                                key={p.id}
                                selected={selected.type === 'patient' && selected.patientId === p.id}
                                onClick={() => setSelected({ type: 'patient', patientId: p.id })}
                            >
                                <ListItemIcon>
                                    <PersonIcon />
                                </ListItemIcon>

                                <ListItemText
                                    primary={p.name}
                                    classes={{ primary: classes.listItemText }}
                                />

                                <ListItemSecondaryAction>
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
                                </ListItemSecondaryAction>
                            </ListItem>
                        ))
                    )}
                </List>
            </Drawer>

            <main className={classes.content}>{renderDetail()}</main>
        </div>
    );
}

export default withStyles(styles)(MedPlan);
