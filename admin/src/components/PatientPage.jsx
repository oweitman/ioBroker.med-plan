import React from 'react';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import Divider from '@material-ui/core/Divider';
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import IconButton from '@material-ui/core/IconButton';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import Chip from '@material-ui/core/Chip';

import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import LocalPharmacyIcon from '@material-ui/icons/LocalPharmacy';

import WbSunnyIcon from '@material-ui/icons/WbSunny';
import Brightness5Icon from '@material-ui/icons/Brightness5';
import Brightness2Icon from '@material-ui/icons/Brightness2';
import NightsStayIcon from '@material-ui/icons/NightsStay';

import IntakeTimes from './IntakeTimes';
import { t } from './i18n';

/**
 * @param {{
 *   classes: Record<string, string>,
 *   patient: {id: string, name: string, plan?: any} | undefined,
 *   medications: Array<{id: string, name: string}>,
 *   onUpdatePatient: (patientId: string, updater: (p: any) => void) => void,
 * }} props
 */
export default function PatientPage(props) {
    const { classes, patient, medications, onUpdatePatient } = props;

    const [addMedId, setAddMedId] = React.useState('');

    const makeId = React.useCallback(() => `id_${Date.now()}_${Math.round(Math.random() * 1e6)}`, []);

    // units for packages
    const units = React.useMemo(
        () => [
            { value: 'pcs', label: t('pcs') }, // Stück
            { value: 'tbl', label: t('tablets') }, // Tabletten
            { value: 'cap', label: t('capsules') }, // Kapseln
            { value: 'sachet', label: t('sachets') }, // Beutel/Sachets
            { value: 'mg', label: 'mg' },
            { value: 'g', label: 'g' },
            { value: 'µg', label: 'µg' },
            { value: 'ml', label: 'ml' },
            { value: 'l', label: 'l' },
            { value: 'drops', label: t('drops') }, // Tropfen
            { value: 'puffs', label: t('puffs') }, // Hübe
            { value: 'iu', label: 'IU' }, // Internationale Einheiten
            { value: 'dose', label: t('doses') }, // Dosen
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
    // ---------- immutable helpers ----------
    const clonePlanRoot = p => {
        const plan = p.plan ? { ...p.plan } : {};
        plan.meds = plan.meds ? { ...plan.meds } : {};
        p.plan = plan;
        return plan;
    };

    const cloneMedEntry = (plan, medId) => {
        const prev = plan.meds[medId] || {};

        const prevDose = prev.dose || {};
        const next = {
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
                unit: String(prevDose.unit || 'pcs'), // <-- neu
            },
            packages: Array.isArray(prev.packages) ? [...prev.packages] : [],
            ...prev,
        };

        plan.meds[medId] = next;
        return next;
    };

    if (!patient) {
        return (
            <Box>
                <Typography
                    variant="h6"
                    className={classes.textPrimary}
                >
                    {t('Patient')}
                </Typography>
                <Typography
                    variant="body2"
                    className={classes.textSecondary}
                >
                    {t('No patient selected.')}
                </Typography>
            </Box>
        );
    }

    const patientPlanMeds = patient.plan?.meds || {};
    const selectedMedIds = Object.keys(patientPlanMeds);
    const medNameById = id => medications.find(m => m.id === id)?.name || id;

    // ---------- actions ----------
    const addMedicationToPlan = () => {
        if (!addMedId) return;
        onUpdatePatient(patient.id, p => {
            const plan = clonePlanRoot(p);
            if (!plan.meds[addMedId]) {
                plan.meds[addMedId] = {
                    times: { morning: true, noon: false, evening: false, night: false },
                    repeat: { type: 'daily', every: 1 },
                    dose: {
                        mode: 'fixed',
                        fixed: 1,
                        perSlot: { morning: 1, noon: 1, evening: 1, night: 1 },
                        unit: 'pcs', // <-- Einheit jetzt hier
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

            // pick a reasonable base value
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
            e.dose = { ...(e.dose || {}), fixed: n || 1 };
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
        const n = Math.max(0, Number(value ?? 1));
        onUpdatePatient(patient.id, p => {
            const plan = clonePlanRoot(p);
            const e = cloneMedEntry(plan, medId);
            const perSlot = { ...(e.dose?.perSlot || {}) };
            perSlot[slot] = n || 1;
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
                perSlot[slotKey] = 0; // deaktiviert => 0
            } else {
                const cur = Number(perSlot[slotKey] ?? 0);
                if (!cur) perSlot[slotKey] = 1; // re-aktiviert => default 1
            }

            e.dose.perSlot = perSlot;
        });
    };

    return (
        <Box>
            <Typography
                variant="h6"
                className={classes.textPrimary}
            >
                {patient.name}
            </Typography>

            <Divider style={{ margin: '12px 0 16px' }} />

            {/* add medication */}
            <Paper style={{ padding: 16, marginBottom: 16 }}>
                <Grid
                    container
                    spacing={2}
                >
                    <Grid
                        item
                        xs
                        md={6}
                    >
                        <FormControl
                            variant="outlined"
                            size="small"
                            fullWidth
                        >
                            <InputLabel>{t('Add medication')}</InputLabel>
                            <Select
                                label={t('Add medication')}
                                value={addMedId}
                                onChange={e => setAddMedId(String(e.target.value))}
                            >
                                {medications
                                    .filter(m => !selectedMedIds.includes(m.id))
                                    .map(m => (
                                        <MenuItem
                                            key={m.id}
                                            value={m.id}
                                        >
                                            {m.name}
                                        </MenuItem>
                                    ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid
                        item
                        xs="auto"
                    >
                        <Button
                            className={classes.actionButton}
                            color="primary"
                            variant="contained"
                            startIcon={<AddIcon />}
                            disabled={!addMedId}
                            onClick={addMedicationToPlan}
                        >
                            {t('Add')}
                        </Button>
                    </Grid>

                    {selectedMedIds.length > 0 && (
                        <Grid
                            item
                            xs={12}
                        >
                            <Box
                                display="flex"
                                flexWrap="wrap"
                                gridGap={8}
                            >
                                {selectedMedIds.map(id => (
                                    <Chip
                                        key={id}
                                        icon={<LocalPharmacyIcon />}
                                        label={medNameById(id)}
                                        onDelete={() => removeMedicationFromPlan(id)}
                                    />
                                ))}
                            </Box>
                        </Grid>
                    )}
                </Grid>
            </Paper>

            {/* medication entries */}
            {selectedMedIds.map(medId => {
                const entry = patientPlanMeds[medId];
                const repeat = entry.repeat || { type: 'daily', every: 1 };

                // for select label ids (MUI v4 outlined can be picky)
                const rhythmLabelId = `rhythm-label-${medId}`;
                const unitLabelId = pkgId => `unit-label-${medId}-${pkgId}`;

                return (
                    <Paper
                        key={medId}
                        style={{ padding: 16, marginBottom: 16 }}
                    >
                        <Box
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                        >
                            <Typography
                                variant="h6"
                                className={classes.textPrimary}
                            >
                                {medNameById(medId)}
                            </Typography>
                            <IconButton
                                aria-label={t('Remove from patient')}
                                onClick={() => removeMedicationFromPlan(medId)}
                            >
                                <DeleteIcon />
                            </IconButton>
                        </Box>
                        <Box mt={3}>
                            <Typography
                                variant="subtitle2"
                                className={classes.textPrimary}
                            >
                                {t('Intake times & dose')}
                            </Typography>

                            {(() => {
                                const dose = entry.dose || {
                                    mode: 'fixed',
                                    fixed: 1,
                                    perSlot: { morning: 1, noon: 1, evening: 1, night: 1 },
                                    unit: 'pcs',
                                };

                                const mode = dose.mode === 'perSlot' ? 'perSlot' : 'fixed';
                                const doseModeLabelId = `dose-mode-label-${medId}`;
                                const doseUnitLabelId = `dose-unit-label-${medId}`;

                                const getPerSlotVal = slotKey => Number(dose.perSlot?.[slotKey] ?? 1) || 0;

                                return (
                                    <>
                                        {/* Mode + Unit + (fixed dose input only when fixed) */}
                                        <Grid
                                            container
                                            spacing={2}
                                            alignItems="center"
                                            style={{ marginTop: 4 }}
                                        >
                                            <Grid
                                                item
                                                xs={12}
                                                md={4}
                                            >
                                                <FormControl
                                                    variant="outlined"
                                                    size="small"
                                                    fullWidth
                                                >
                                                    <InputLabel id={doseModeLabelId}>{t('Mode')}</InputLabel>
                                                    <Select
                                                        labelId={doseModeLabelId}
                                                        label={t('Mode')}
                                                        value={mode}
                                                        onChange={e => setDoseMode(medId, String(e.target.value))}
                                                    >
                                                        <MenuItem value="fixed">
                                                            {t('Same dose for all times')}
                                                        </MenuItem>
                                                        <MenuItem value="perSlot">
                                                            {t('Different dose per time')}
                                                        </MenuItem>
                                                    </Select>
                                                </FormControl>
                                            </Grid>

                                            <Grid
                                                item
                                                xs={12}
                                                md={4}
                                            >
                                                <FormControl
                                                    variant="outlined"
                                                    size="small"
                                                    fullWidth
                                                >
                                                    <InputLabel id={doseUnitLabelId}>{t('Unit')}</InputLabel>
                                                    <Select
                                                        labelId={doseUnitLabelId}
                                                        label={t('Unit')}
                                                        value={dose.unit || 'pcs'}
                                                        onChange={e => setDoseUnit(medId, e.target.value)}
                                                    >
                                                        {units.map(u => (
                                                            <MenuItem
                                                                key={u.value}
                                                                value={u.value}
                                                            >
                                                                {u.label}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            </Grid>

                                            {mode === 'fixed' && (
                                                <Grid
                                                    item
                                                    xs={12}
                                                    md={4}
                                                >
                                                    <TextField
                                                        variant="outlined"
                                                        size="small"
                                                        type="number"
                                                        inputProps={{
                                                            min: 0,
                                                            step: 1,
                                                            style: { textAlign: 'center', padding: '8px 6px' },
                                                        }}
                                                        label={t('Dose')}
                                                        value={dose.fixed ?? 1}
                                                        onChange={e => setDoseFixed(medId, e.target.value)}
                                                        fullWidth
                                                    />
                                                </Grid>
                                            )}
                                        </Grid>

                                        {/* Slots row: keep icon buttons; show per-slot dose inputs only when perSlot */}
                                        <Grid
                                            container
                                            spacing={1} // enger zusammen
                                            justifyContent="flex-start" // links ausrichten
                                            alignItems="flex-start"
                                            style={{ marginTop: 8 }}
                                        >
                                            {slots.map(s => {
                                                const enabled = !!entry.times?.[s.key];
                                                const Icon = s.Icon;

                                                return (
                                                    <Grid
                                                        item
                                                        key={s.key}
                                                    >
                                                        <Box className={classes.slotWrap}>
                                                            <IconButton
                                                                onClick={() => setTimeSlot(medId, s.key, !enabled)}
                                                                className={[
                                                                    classes.slotBtn,
                                                                    enabled
                                                                        ? classes.slotBtnActive
                                                                        : classes.slotBtnInactive,
                                                                ].join(' ')}
                                                                aria-label={s.label}
                                                            >
                                                                <Icon style={{ fontSize: 26 }} />
                                                            </IconButton>

                                                            <Typography
                                                                variant="caption"
                                                                className={classes.textSecondary}
                                                                style={{ marginTop: 2 }}
                                                            >
                                                                {s.label}
                                                            </Typography>

                                                            {mode === 'perSlot' && (
                                                                <TextField
                                                                    className={classes.slotDoseField}
                                                                    variant="outlined"
                                                                    size="small"
                                                                    type="number"
                                                                    disabled={!enabled}
                                                                    value={enabled ? getPerSlotVal(s.key) : 0}
                                                                    onChange={e =>
                                                                        setDosePerSlot(medId, s.key, e.target.value)
                                                                    }
                                                                    inputProps={{ min: 0, step: 1 }}
                                                                />
                                                            )}
                                                        </Box>
                                                    </Grid>
                                                );
                                            })}
                                        </Grid>
                                    </>
                                );
                            })()}
                        </Box>

                        <Box mt={3}>
                            <Typography
                                variant="subtitle2"
                                className={`${classes.textPrimary} ${classes.sectionHeader}`}
                            >
                                {t('Repeat rhythm')}
                            </Typography>
                            <Grid
                                container
                                spacing={2}
                            >
                                <Grid
                                    item
                                    xs={12}
                                    md={6}
                                >
                                    <FormControl
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                    >
                                        <InputLabel id={rhythmLabelId}>{t('Rhythm')}</InputLabel>
                                        <Select
                                            labelId={rhythmLabelId}
                                            label={t('Rhythm')}
                                            value={repeat.type}
                                            onChange={e => setRepeatType(medId, e.target.value)}
                                        >
                                            <MenuItem value="daily">{t('Daily')}</MenuItem>
                                            <MenuItem value="everyXDays">{t('Every X days')}</MenuItem>
                                            <MenuItem value="weekly">{t('Weekly')}</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid
                                    item
                                    xs={12}
                                    md={6}
                                >
                                    {repeat.type === 'everyXDays' ? (
                                        <TextField
                                            label={t('Every (days)')}
                                            type="number"
                                            variant="outlined"
                                            size="small"
                                            value={repeat.every}
                                            onChange={e => setRepeatEvery(medId, e.target.value)}
                                            fullWidth
                                        />
                                    ) : (
                                        <TextField
                                            disabled
                                            variant="outlined"
                                            size="small"
                                            value={repeat.type === 'daily' ? t('Every day') : t('Weekly')}
                                            fullWidth
                                        />
                                    )}
                                </Grid>
                            </Grid>
                        </Box>

                        <Box mt={3}>
                            <Box
                                display="flex"
                                justifyContent="space-between"
                                alignItems="center"
                            >
                                <Typography
                                    variant="subtitle2"
                                    className={classes.textPrimary}
                                >
                                    {t('Packages')}
                                </Typography>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<AddIcon />}
                                    onClick={() => addPackage(medId)}
                                >
                                    {t('Add package')}
                                </Button>
                            </Box>

                            {(entry.packages || []).length === 0 ? (
                                <Typography
                                    variant="body2"
                                    className={classes.textSecondary}
                                    style={{ marginTop: 8 }}
                                >
                                    {t('No packages yet.')}
                                </Typography>
                            ) : null}

                            {(entry.packages || []).map(pkg => (
                                <Paper
                                    key={pkg.id}
                                    style={{ padding: 12, marginTop: 10 }}
                                >
                                    <Grid
                                        container
                                        spacing={2}
                                        alignItems="center"
                                    >
                                        {/* Total */}
                                        <Grid
                                            item
                                            xs={12}
                                            md={2}
                                        >
                                            <TextField
                                                label={t('Total')}
                                                type="number"
                                                size="small"
                                                variant="outlined"
                                                value={pkg.total ?? 0}
                                                onChange={e =>
                                                    updatePackageField(medId, pkg.id, 'total', e.target.value)
                                                }
                                                fullWidth
                                            />
                                        </Grid>

                                        {/* Current */}
                                        <Grid
                                            item
                                            xs={12}
                                            md={2}
                                        >
                                            <TextField
                                                label={t('Current')}
                                                type="number"
                                                size="small"
                                                variant="outlined"
                                                value={pkg.current ?? 0}
                                                onChange={e =>
                                                    updatePackageField(medId, pkg.id, 'current', e.target.value)
                                                }
                                                fullWidth
                                            />
                                        </Grid>

                                        {/* Marking */}
                                        <Grid
                                            item
                                            xs={12}
                                            md={4}
                                        >
                                            <TextField
                                                label={t('Marking (optional)')}
                                                size="small"
                                                variant="outlined"
                                                value={pkg.mark ?? ''}
                                                onChange={e =>
                                                    updatePackageField(medId, pkg.id, 'mark', e.target.value)
                                                }
                                                fullWidth
                                            />
                                        </Grid>

                                        {/* Created date */}
                                        <Grid
                                            item
                                            xs={10}
                                            md={1}
                                        >
                                            <Typography
                                                variant="caption"
                                                className={classes.textSecondary}
                                            >
                                                {new Date(pkg.createdTs || Date.now()).toLocaleDateString()}
                                            </Typography>
                                        </Grid>

                                        {/* Delete */}
                                        <Grid
                                            item
                                            xs={2}
                                            md={1}
                                        >
                                            <IconButton
                                                aria-label={t('Delete package')}
                                                onClick={() => deletePackage(medId, pkg.id)}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </Grid>
                                    </Grid>
                                </Paper>
                            ))}
                        </Box>
                    </Paper>
                );
            })}
        </Box>
    );
}
