import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid2';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Chip from '@mui/material/Chip';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';

import WbSunnyIcon from '@mui/icons-material/WbSunny';
import Brightness5Icon from '@mui/icons-material/Brightness5';
import Brightness2Icon from '@mui/icons-material/Brightness2';
import NightsStayIcon from '@mui/icons-material/NightsStay';

import { I18n } from '@iobroker/adapter-react-v5';

/**
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
            { value: 'pcs', label: I18n.t('pcs') }, // Stück
            { value: 'tbl', label: I18n.t('tablets') }, // Tabletten
            { value: 'cap', label: I18n.t('capsules') }, // Kapseln
            { value: 'sachet', label: I18n.t('sachets') }, // Beutel/Sachets
            { value: 'mg', label: 'mg' },
            { value: 'g', label: 'g' },
            { value: 'µg', label: 'µg' },
            { value: 'ml', label: 'ml' },
            { value: 'l', label: 'l' },
            { value: 'drops', label: I18n.t('drops') }, // Tropfen
            { value: 'puffs', label: I18n.t('puffs') }, // Hübe
            { value: 'iu', label: 'IU' }, // Internationale Einheiten
            { value: 'dose', label: I18n.t('doses') }, // Dosen
        ],
        [],
    );
    const slots = React.useMemo(
        () => [
            { key: 'morning', label: I18n.t('Morning'), Icon: WbSunnyIcon },
            { key: 'noon', label: I18n.t('Noon'), Icon: Brightness5Icon },
            { key: 'evening', label: I18n.t('Evening'), Icon: Brightness2Icon },
            { key: 'night', label: I18n.t('Night'), Icon: NightsStayIcon },
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
                    sx={classes.textPrimary}
                >
                    {I18n.t('Patient')}
                </Typography>
                <Typography
                    variant="body2"
                    sx={classes.textSecondary}
                >
                    {I18n.t('No patient selected.')}
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
                sx={classes.textPrimary}
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
                    <Grid size={{ xs: 12, md: 6 }}>
                        <FormControl
                            variant="outlined"
                            size="small"
                            fullWidth
                        >
                            <InputLabel>{I18n.t('Add medication')}</InputLabel>
                            <Select
                                variant="outlined"
                                label={I18n.t('Add medication')}
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
                    <Grid sx={{ flex: '0 0 auto' }}>
                        <Button
                            sx={classes.actionButton}
                            color="primary"
                            variant="contained"
                            startIcon={<AddIcon />}
                            disabled={!addMedId}
                            onClick={addMedicationToPlan}
                        >
                            {I18n.t('Add')}
                        </Button>
                    </Grid>

                    {selectedMedIds.length > 0 && (
                        <Grid size={{ xs: 12 }}>
                            <Box
                                display="flex"
                                flexWrap="wrap"
                                gap={1}
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
                                sx={classes.textPrimary}
                            >
                                {medNameById(medId)}
                            </Typography>
                            <IconButton
                                aria-label={I18n.t('Remove from patient')}
                                onClick={() => removeMedicationFromPlan(medId)}
                            >
                                <DeleteIcon />
                            </IconButton>
                        </Box>
                        <Box mt={3}>
                            <Typography
                                variant="subtitle2"
                                sx={classes.textPrimary}
                            >
                                {I18n.t('Intake times & dose')}
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
                                            <Grid size={{ xs: 12, md: 4 }}>
                                                <FormControl
                                                    variant="outlined"
                                                    size="small"
                                                    fullWidth
                                                >
                                                    <InputLabel id={doseModeLabelId}>{I18n.t('Mode')}</InputLabel>
                                                    <Select
                                                        variant="outlined"
                                                        labelId={doseModeLabelId}
                                                        label={I18n.t('Mode')}
                                                        value={mode}
                                                        onChange={e => setDoseMode(medId, String(e.target.value))}
                                                    >
                                                        <MenuItem value="fixed">
                                                            {I18n.t('Same dose for all times')}
                                                        </MenuItem>
                                                        <MenuItem value="perSlot">
                                                            {I18n.t('Different dose per time')}
                                                        </MenuItem>
                                                    </Select>
                                                </FormControl>
                                            </Grid>

                                            <Grid size={{ xs: 12, md: 4 }}>
                                                <FormControl
                                                    variant="outlined"
                                                    size="small"
                                                    fullWidth
                                                >
                                                    <InputLabel id={doseUnitLabelId}>{I18n.t('Unit')}</InputLabel>
                                                    <Select
                                                        variant="outlined"
                                                        labelId={doseUnitLabelId}
                                                        label={I18n.t('Unit')}
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
                                                <Grid size={{ xs: 12, md: 4 }}>
                                                    <TextField
                                                        variant="outlined"
                                                        size="small"
                                                        type="number"
                                                        label={I18n.t('Dose')}
                                                        value={dose.fixed ?? 1}
                                                        onChange={e => setDoseFixed(medId, e.target.value)}
                                                        fullWidth
                                                        slotProps={{
                                                            htmlInput: {
                                                                min: 0,
                                                                step: 0.25, // oder 0.1
                                                                inputMode: 'decimal',
                                                                style: { textAlign: 'center', padding: '8px 6px' },
                                                            },
                                                        }}
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
                                                    <Grid key={s.key}>
                                                        <Box sx={classes.slotWrap}>
                                                            <IconButton
                                                                onClick={() => setTimeSlot(medId, s.key, !enabled)}
                                                                sx={[
                                                                    classes.slotBtn,
                                                                    enabled
                                                                        ? classes.slotBtnActive
                                                                        : classes.slotBtnInactive,
                                                                ]}
                                                                aria-label={s.label}
                                                            >
                                                                <Icon style={{ fontSize: 28 }} />
                                                            </IconButton>

                                                            <Typography
                                                                variant="caption"
                                                                sx={classes.textSecondary}
                                                                style={{ marginTop: 2 }}
                                                            >
                                                                {s.label}
                                                            </Typography>

                                                            {mode === 'perSlot' && (
                                                                <TextField
                                                                    sx={classes.slotDoseField}
                                                                    variant="outlined"
                                                                    size="small"
                                                                    type="number"
                                                                    disabled={!enabled}
                                                                    value={enabled ? getPerSlotVal(s.key) : 0}
                                                                    onChange={e =>
                                                                        setDosePerSlot(medId, s.key, e.target.value)
                                                                    }
                                                                    slotProps={{
                                                                        htmlInput: {
                                                                            min: 0,
                                                                            step: 0.25, // oder 0.1
                                                                            inputMode: 'decimal',
                                                                        },
                                                                    }}
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
                                sx={[classes.textPrimary, classes.sectionHeader]}
                            >
                                {I18n.t('Repeat rhythm')}
                            </Typography>
                            <Grid
                                container
                                spacing={2}
                            >
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <FormControl
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                    >
                                        <InputLabel id={rhythmLabelId}>{I18n.t('Rhythm')}</InputLabel>
                                        <Select
                                            variant="outlined"
                                            labelId={rhythmLabelId}
                                            label={I18n.t('Rhythm')}
                                            value={repeat.type}
                                            onChange={e => setRepeatType(medId, e.target.value)}
                                        >
                                            <MenuItem value="daily">{I18n.t('Daily')}</MenuItem>
                                            <MenuItem value="everyXDays">{I18n.t('Every X days')}</MenuItem>
                                            <MenuItem value="weekly">{I18n.t('Weekly')}</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    {repeat.type === 'everyXDays' ? (
                                        <TextField
                                            label={I18n.t('Every (days)')}
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
                                            value={repeat.type === 'daily' ? I18n.t('Every day') : I18n.t('Weekly')}
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
                                    sx={classes.textPrimary}
                                >
                                    {I18n.t('Packages')}
                                </Typography>
                                <Button
                                    color="primary"
                                    size="small"
                                    variant="outlined"
                                    startIcon={<AddIcon />}
                                    onClick={() => addPackage(medId)}
                                >
                                    {I18n.t('Add package')}
                                </Button>
                            </Box>

                            {(entry.packages || []).length === 0 ? (
                                <Typography
                                    variant="body2"
                                    sx={classes.textSecondary}
                                    style={{ marginTop: 8 }}
                                >
                                    {I18n.t('No packages yet.')}
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
                                        <Grid size={{ xs: 12, md: 2 }}>
                                            <TextField
                                                label={I18n.t('Total')}
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
                                        <Grid size={{ xs: 12, md: 2 }}>
                                            <TextField
                                                label={I18n.t('Current')}
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
                                        <Grid size={{ xs: 12, md: 4 }}>
                                            <TextField
                                                label={I18n.t('Marking (optional)')}
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
                                        <Grid size={{ xs: 10, md: 1 }}>
                                            <Typography
                                                variant="caption"
                                                sx={classes.textSecondary}
                                            >
                                                {new Date(pkg.createdTs || Date.now()).toLocaleDateString()}
                                            </Typography>
                                        </Grid>

                                        {/* Delete */}
                                        <Grid size={{ xs: 2, md: 1 }}>
                                            <IconButton
                                                aria-label={I18n.t('Delete package')}
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
