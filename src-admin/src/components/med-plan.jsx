import React from 'react';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';

import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import { t } from '../components/i18n';

/**
 * @typedef {object} SettingsProps
 * @property {Record<string, any>} classes
 * @property {Record<string, any>} native
 * @property {(attr: string, value: any) => void} onChange
 */

const styles = theme => ({
    root: {
        display: 'flex',
        height: '100%',
        minHeight: 400,
    },
    drawer: {
        width: 280,
        flexShrink: 0,
    },
    drawerPaper: {
        width: 280,
    },
    content: {
        flexGrow: 1,
        padding: theme.spacing(3),
        overflow: 'auto',
    },
    sectionTitle: {
        padding: theme.spacing(2, 2, 1, 2),
        fontWeight: 600,
        opacity: 0.8,
        color: theme.palette.text.primary, // explicit for dark theme
    },

    // Explicit text colors for dark theme readability
    textPrimary: {
        color: theme.palette.text.primary,
    },
    textSecondary: {
        color: theme.palette.text.secondary,
    },

    formRow: {
        display: 'flex',
        gap: theme.spacing(2),
        alignItems: 'stretch',
        marginTop: theme.spacing(2),
    },

    // Buttons: same height as the TextField (outlined small ~40px)
    actionButton: {
        minWidth: 120, // unified width across all action buttons
        height: 40, // matches TextField size="small" (outlined)
        flexShrink: 0,
        whiteSpace: 'nowrap',
    },

    listItemText: {
        color: theme.palette.text.primary,
    },
});

/**
 * @param {SettingsProps} props
 */

function MedPlan(props) {
    const { classes, native, onChange } = props;

    const patients = Array.isArray(native?.patients) ? native.patients : [];
    const medications = Array.isArray(native?.medications) ? native.medications : [];

    // selected.type: 'intro' | 'medication' | 'newPatient' | 'patient'
    const [selected, setSelected] = React.useState({ type: 'intro', patientId: '' });
    const [newPatientName, setNewPatientName] = React.useState('');
    const [newMedicationName, setNewMedicationName] = React.useState('');

    const persist = React.useCallback((attr, value) => onChange(attr, value), [onChange]);

    const makeId = React.useCallback(() => {
        // stable enough for admin usage; you can switch to uuid later
        return `id_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
    }, []);

    const addPatient = React.useCallback(() => {
        const name = newPatientName.trim();
        if (!name) return;

        const next = [...patients, { id: makeId(), name }];
        persist('patients', next);
        setNewPatientName('');
    }, [newPatientName, patients, persist, makeId]);

    const deletePatient = React.useCallback(
        patientId => {
            const next = patients.filter(p => p.id !== patientId);
            persist('patients', next);

            if (selected.type === 'patient' && selected.patientId === patientId) {
                setSelected({ type: 'intro', patientId: '' });
            }
        },
        [patients, persist, selected],
    );

    const addMedication = React.useCallback(() => {
        const name = newMedicationName.trim();
        if (!name) return;

        const next = [...medications, { id: makeId(), name }];
        persist('medications', next);
        setNewMedicationName('');
    }, [newMedicationName, medications, persist, makeId]);

    const deleteMedication = React.useCallback(
        medId => {
            const next = medications.filter(m => m.id !== medId);
            persist('medications', next);

            // Placeholder: later we must remove this medication from all patient plans.
            // TODO: iterate all patients and remove references to medId in their plans.
        },
        [medications, persist],
    );

    const onMedicationKeyDown = React.useCallback(
        e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (newMedicationName.trim()) {
                    addMedication();
                }
            }
        },
        [newMedicationName, addMedication],
    );

    const onPatientKeyDown = React.useCallback(
        e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (newPatientName.trim()) {
                    addPatient();
                }
            }
        },
        [newPatientName, addPatient],
    );

    const renderDetail = () => {
        if (selected.type === 'intro') {
            return (
                <Box>
                    <Typography
                        variant="h5"
                        gutterBottom
                        sx={classes.textPrimary}
                    >
                        {t('med-plan')}
                    </Typography>

                    <Typography
                        variant="body1"
                        gutterBottom
                        sx={classes.textPrimary}
                    >
                        {t(
                            'This page lets you manage a simple medication list and create patients. Patient details and schedules will be added later.',
                        )}
                    </Typography>

                    <Box mt={2}>
                        <Typography
                            variant="subtitle1"
                            gutterBottom
                            sx={classes.textPrimary}
                        >
                            {t('How to use')}
                        </Typography>

                        <Typography
                            variant="body2"
                            sx={classes.textSecondary}
                        >
                            {t('1) Open “Medication” to add or remove medications.')}
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={classes.textSecondary}
                        >
                            {t('2) Open “New patient” to create a patient entry.')}
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={classes.textSecondary}
                        >
                            {t('3) Patients appear in the left menu. Click a patient to open details (coming later).')}
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={classes.textSecondary}
                        >
                            {t('Tip: You can press Enter in the name fields to add an item quickly.')}
                        </Typography>
                    </Box>
                </Box>
            );
        }

        if (selected.type === 'medication') {
            return (
                <Box>
                    <Typography
                        variant="h6"
                        gutterBottom
                        sx={classes.textPrimary}
                    >
                        {t('Medication')}
                    </Typography>

                    <Typography
                        variant="body2"
                        gutterBottom
                        sx={classes.textSecondary}
                    >
                        {t('Create new medications (name only for now).')}
                    </Typography>

                    <Box sx={classes.formRow}>
                        <TextField
                            label={t('Medication name')}
                            value={newMedicationName}
                            onChange={e => setNewMedicationName(e.target.value)}
                            onKeyDown={onMedicationKeyDown}
                            variant="outlined"
                            size="small"
                            fullWidth
                        />
                        <Button
                            sx={classes.actionButton}
                            variant="contained"
                            color="primary"
                            onClick={addMedication}
                            disabled={!newMedicationName.trim()}
                        >
                            {t('Add')}
                        </Button>
                    </Box>

                    <Box mt={3}>
                        <Typography
                            variant="subtitle1"
                            gutterBottom
                            sx={classes.textPrimary}
                        >
                            {t('Existing medications')}
                        </Typography>

                        {medications.length === 0 ? (
                            <Typography
                                variant="body2"
                                sx={classes.textSecondary}
                            >
                                {t('No medications yet.')}
                            </Typography>
                        ) : (
                            <List dense>
                                {medications.map(m => (
                                    <ListItem key={m.id}>
                                        <ListItemIcon>
                                            <LocalPharmacyIcon fontSize="small" />
                                        </ListItemIcon>

                                        <ListItemText
                                            primary={m.name}
                                            classes={{ primary: classes.listItemText }}
                                        />

                                        <ListItemSecondaryAction>
                                            <IconButton
                                                edge="end"
                                                aria-label={t('Delete medication')}
                                                onClick={() => deleteMedication(m.id)}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                ))}
                            </List>
                        )}
                    </Box>
                </Box>
            );
        }

        if (selected.type === 'newPatient') {
            return (
                <Box>
                    <Typography
                        variant="h6"
                        gutterBottom
                        sx={classes.textPrimary}
                    >
                        {t('New patient')}
                    </Typography>

                    <Typography
                        variant="body2"
                        gutterBottom
                        sx={classes.textSecondary}
                    >
                        {t('Create a new patient (name only for now).')}
                    </Typography>

                    <Box sx={classes.formRow}>
                        <TextField
                            label={t('Patient name')}
                            value={newPatientName}
                            onChange={e => setNewPatientName(e.target.value)}
                            onKeyDown={onPatientKeyDown}
                            variant="outlined"
                            size="small"
                            fullWidth
                        />
                        <Button
                            sx={classes.actionButton}
                            variant="contained"
                            color="primary"
                            onClick={addPatient}
                            disabled={!newPatientName.trim()}
                        >
                            {t('Add')}
                        </Button>
                    </Box>

                    <Box mt={3}>
                        <Typography
                            variant="subtitle1"
                            gutterBottom
                            sx={classes.textPrimary}
                        >
                            {t('Existing patients')}
                        </Typography>

                        {patients.length === 0 ? (
                            <Typography
                                variant="body2"
                                sx={classes.textSecondary}
                            >
                                {t('No patients yet.')}
                            </Typography>
                        ) : (
                            <List dense>
                                {patients.map(p => (
                                    <ListItem key={p.id}>
                                        <ListItemIcon>
                                            <PersonIcon fontSize="small" />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={p.name}
                                            secondary={p.id}
                                            classes={{ primary: classes.listItemText }}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        )}
                    </Box>
                </Box>
            );
        }

        // Patient details will be implemented later
        if (selected.type === 'patient') {
            const patient = patients.find(p => p.id === selected.patientId);
            return (
                <Box>
                    <Typography
                        variant="h6"
                        gutterBottom
                        sx={classes.textPrimary}
                    >
                        {patient ? patient.name : t('Patient')}
                    </Typography>

                    <Typography
                        variant="body2"
                        gutterBottom
                        sx={classes.textSecondary}
                    >
                        {t('Patient details will be implemented later.')}
                    </Typography>

                    {patient ? (
                        <Box mt={2}>
                            <Typography
                                variant="body2"
                                sx={classes.textPrimary}
                            >
                                <strong>{t('ID')}:</strong> {patient.id}
                            </Typography>
                        </Box>
                    ) : null}
                </Box>
            );
        }

        return <Typography sx={classes.textPrimary}>{t('Select an item from the menu.')}</Typography>;
    };

    return (
        <Box sx={classes.root}>
            <Drawer
                sx={classes.drawer}
                variant="permanent"
                anchor="left"
            >
                <Typography
                    sx={classes.sectionTitle}
                    variant="subtitle2"
                >
                    {t('Medication Plan')}
                </Typography>

                <List>
                    {/* Intro / Help */}
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
                                sx={{ primary: classes.listItemText }}
                            />
                        </ListItemButton>
                    </ListItem>

                    {/* Medication */}
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
                                sx={{ primary: classes.listItemText }}
                            />
                        </ListItemButton>
                    </ListItem>

                    {/* New patient */}
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
                                sx={{ primary: classes.listItemText }}
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
                                sx={{ primary: classes.listItemText }}
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

            <Box
                component="main"
                sx={classes.content}
            >
                {renderDetail()}
            </Box>
        </Box>
    );
}

export default MedPlan;
