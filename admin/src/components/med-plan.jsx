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
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';

import LocalPharmacyIcon from '@material-ui/icons/LocalPharmacy';
import PersonAddIcon from '@material-ui/icons/PersonAdd';
import DeleteIcon from '@material-ui/icons/Delete';
import PersonIcon from '@material-ui/icons/Person';
import InfoOutlinedIcon from '@material-ui/icons/InfoOutlined';

import I18n from '@iobroker/adapter-react/i18n';

/**
 * @typedef {object} SettingsProps
 * @property {Record<string, string>} classes
 * @property {Record<string, any>} native
 * @property {(attr: string, value: any) => void} onChange
 */

/**
 * @type {(theme: import('@material-ui/core/styles').Theme) =>
 *   Record<string, import("@material-ui/core/styles/withStyles").CreateCSSProperties>}
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
 * @param {string} key
 */
const t = key => I18n.t(/** @type {any} */ (key));

/**
 * Minimal data model on native:
 * native.patients: Array<{ id: string, name: string }>
 * native.medications: Array<{ id: string, name: string }>
 */

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
                        className={classes.textPrimary}
                    >
                        {t('med-plan')}
                    </Typography>

                    <Typography
                        variant="body1"
                        gutterBottom
                        className={classes.textPrimary}
                    >
                        {t(
                            'This page lets you manage a simple medication list and create patients. Patient details and schedules will be added later.',
                        )}
                    </Typography>

                    <Box mt={2}>
                        <Typography
                            variant="subtitle1"
                            gutterBottom
                            className={classes.textPrimary}
                        >
                            {t('How to use')}
                        </Typography>

                        <Typography
                            variant="body2"
                            className={classes.textSecondary}
                        >
                            {t('1) Open “Medication” to add or remove medications.')}
                        </Typography>
                        <Typography
                            variant="body2"
                            className={classes.textSecondary}
                        >
                            {t('2) Open “New patient” to create a patient entry.')}
                        </Typography>
                        <Typography
                            variant="body2"
                            className={classes.textSecondary}
                        >
                            {t('3) Patients appear in the left menu. Click a patient to open details (coming later).')}
                        </Typography>
                        <Typography
                            variant="body2"
                            className={classes.textSecondary}
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
                        className={classes.textPrimary}
                    >
                        {t('Medication')}
                    </Typography>

                    <Typography
                        variant="body2"
                        gutterBottom
                        className={classes.textSecondary}
                    >
                        {t('Create new medications (name only for now).')}
                    </Typography>

                    <div className={classes.formRow}>
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
                            className={classes.actionButton}
                            variant="contained"
                            color="primary"
                            onClick={addMedication}
                            disabled={!newMedicationName.trim()}
                        >
                            {t('Add')}
                        </Button>
                    </div>

                    <Box mt={3}>
                        <Typography
                            variant="subtitle1"
                            gutterBottom
                            className={classes.textPrimary}
                        >
                            {t('Existing medications')}
                        </Typography>

                        {medications.length === 0 ? (
                            <Typography
                                variant="body2"
                                className={classes.textSecondary}
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
                        className={classes.textPrimary}
                    >
                        {t('New patient')}
                    </Typography>

                    <Typography
                        variant="body2"
                        gutterBottom
                        className={classes.textSecondary}
                    >
                        {t('Create a new patient (name only for now).')}
                    </Typography>

                    <div className={classes.formRow}>
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
                            className={classes.actionButton}
                            variant="contained"
                            color="primary"
                            onClick={addPatient}
                            disabled={!newPatientName.trim()}
                        >
                            {t('Add')}
                        </Button>
                    </div>

                    <Box mt={3}>
                        <Typography
                            variant="subtitle1"
                            gutterBottom
                            className={classes.textPrimary}
                        >
                            {t('Existing patients')}
                        </Typography>

                        {patients.length === 0 ? (
                            <Typography
                                variant="body2"
                                className={classes.textSecondary}
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
                        className={classes.textPrimary}
                    >
                        {patient ? patient.name : t('Patient')}
                    </Typography>

                    <Typography
                        variant="body2"
                        gutterBottom
                        className={classes.textSecondary}
                    >
                        {t('Patient details will be implemented later.')}
                    </Typography>

                    {patient ? (
                        <Box mt={2}>
                            <Typography
                                variant="body2"
                                className={classes.textPrimary}
                            >
                                <strong>{t('ID')}:</strong> {patient.id}
                            </Typography>
                        </Box>
                    ) : null}
                </Box>
            );
        }

        return <Typography className={classes.textPrimary}>{t('Select an item from the menu.')}</Typography>;
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
                    {/* Intro / Help */}
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

                    {/* Medication */}
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

                    {/* New patient */}
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
