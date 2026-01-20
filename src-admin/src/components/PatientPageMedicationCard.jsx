import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid2';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Divider from '@mui/material/Divider';
import Collapse from '@mui/material/Collapse';
import Chip from '@mui/material/Chip';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import ScheduleIcon from '@mui/icons-material/Schedule';
import MoreTimeIcon from '@mui/icons-material/MoreTime';

import { t } from '../components/i18n';

export default function PatientPageMedicationCard({ classes, medId, entry, medName, units, slots, slotDefs, actions }) {
    const repeat = entry.repeat || { type: 'daily', every: 1 };
    const rhythmLabelId = `rhythm-label-${medId}`;
    const rangeInvalid = entry.startDate && entry.endDate && entry.endDate < entry.startDate;

    // advanced UI toggle
    const [showAdvancedSlots, setShowAdvancedSlots] = React.useState(false);

    // add custom slot mini-form
    const [customOpen, setCustomOpen] = React.useState(false);
    const [customLabel, setCustomLabel] = React.useState('');
    const [customTime, setCustomTime] = React.useState('08:00');
    const [customGrace, setCustomGrace] = React.useState('120'); // string for input

    const hasPrnDef = !!slotDefs?.prn;
    const prnEnabledForMed = !!entry.times?.prn;

    const dose = entry.dose || {
        mode: 'fixed',
        fixed: 1,
        perSlot: { morning: 1, noon: 1, evening: 1, night: 1 },
        unit: 'pcs',
    };

    const mode = dose.mode === 'perSlot' ? 'perSlot' : 'fixed';
    const doseModeLabelId = `dose-mode-label-${medId}`;
    const doseUnitLabelId = `dose-unit-label-${medId}`;

    const getPerSlotVal = slotKey => Number(dose.perSlot?.[slotKey]) || 0;

    const getSlotDef = slotKey => (slotDefs && slotDefs[slotKey] ? slotDefs[slotKey] : null);

    const setSlotTime = (slotKey, v) => actions.setSlotDefField(slotKey, 'time', String(v || ''));

    const setSlotGrace = (slotKey, v) => {
        // accept string/number, normalize to number >= 0
        const raw = typeof v === 'string' ? v : String(v ?? '');
        const n = raw === '' ? 0 : Number(raw);
        const next = Number.isFinite(n) && n >= 0 ? n : 0;
        actions.setSlotDefField(slotKey, 'graceMin', next);
    };

    const setSlotLabel = (slotKey, v) => actions.setSlotDefField(slotKey, 'label', String(v || ''));

    const slotTypeLabel = type => {
        if (type === 'prn') return t('As needed');
        if (type === 'custom') return t('Custom');
        return t('Standard');
    };

    // one visual width for a slot column (icon + dose + advanced)
    const SLOT_W = 180;
    // helper: "HH:MM" -> minutes since 00:00 (invalid => null)
    const timeToMinutes = hhmm => {
        const m = /^(\d{2}):(\d{2})$/.exec(String(hhmm || '').trim());
        if (!m) return null;
        const h = Number(m[1]);
        const min = Number(m[2]);
        if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 23 || min < 0 || min > 59) return null;
        return h * 60 + min;
    };

    const sortedSlots = React.useMemo(() => {
        const base = Array.isArray(slots) ? [...slots] : [];

        return base.sort((a, b) => {
            const aDef = getSlotDef(a.key);
            const bDef = getSlotDef(b.key);

            const aType = String(aDef?.type || a.type || 'standard');
            const bType = String(bDef?.type || b.type || 'standard');

            // PRN optional: ans Ende (oder entferne diesen Block, wenn PRN nach Zeit sortiert werden soll)
            const aIsPrn = aType === 'prn';
            const bIsPrn = bType === 'prn';
            if (aIsPrn !== bIsPrn) return aIsPrn ? 1 : -1;

            const am = timeToMinutes(aDef?.time);
            const bm = timeToMinutes(bDef?.time);

            // valid times first
            if (am == null && bm != null) return 1;
            if (am != null && bm == null) return -1;

            // compare by time
            if (am != null && bm != null && am !== bm) return am - bm;

            // tie-breaker: standard keys if you want stable order
            const keyOrder = { morning: 0, noon: 1, evening: 2, night: 3 };
            const aw = keyOrder[a.key];
            const bw = keyOrder[b.key];
            if (aw !== undefined && bw !== undefined && aw !== bw) return aw - bw;
            if (aw !== undefined && bw === undefined) return -1;
            if (aw === undefined && bw !== undefined) return 1;

            return String(a.key).localeCompare(String(b.key));
        });
    }, [slots, slotDefs]); // slotDefs changes when times change
    // ---- Packages: enforce Current <= Total ----
    const clampNumber = (v, min, max) => {
        const n = Number(v);
        if (!Number.isFinite(n)) return min;
        if (n < min) return min;
        if (n > max) return max;
        return n;
    };

    const onPkgTotalChange = (pkg, raw) => {
        // allow empty input while typing? -> here we normalize to number >= 0
        const nextTotal = clampNumber(raw, 0, Number.POSITIVE_INFINITY);

        // persist total
        actions.updatePackageField(medId, pkg.id, 'total', nextTotal);

        // if current > new total -> clamp current down to total
        const cur = Number(pkg.current ?? 0);
        if (Number.isFinite(cur) && cur > nextTotal) {
            actions.updatePackageField(medId, pkg.id, 'current', nextTotal);
        }
    };

    const onPkgCurrentChange = (pkg, raw) => {
        const total = clampNumber(pkg.total ?? 0, 0, Number.POSITIVE_INFINITY);
        const nextCur = clampNumber(raw, 0, total);
        actions.updatePackageField(medId, pkg.id, 'current', nextCur);
    };

    return (
        <Paper style={{ padding: 16, marginBottom: 16 }}>
            <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
            >
                <Typography
                    variant="h6"
                    sx={classes.textPrimary}
                >
                    {medName}
                </Typography>
                <IconButton
                    aria-label={t('Remove from patient')}
                    onClick={() => actions.removeMedicationFromPlan(medId)}
                >
                    <DeleteIcon />
                </IconButton>
            </Box>

            {/* Plan period */}
            <Box mt={3}>
                <Typography
                    variant="subtitle2"
                    sx={classes.textPrimary}
                >
                    {t('Plan period')}
                </Typography>

                <Grid
                    container
                    spacing={2}
                    style={{ marginTop: 4 }}
                >
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            label={t('Start date (optional)')}
                            type="date"
                            size="small"
                            variant="outlined"
                            value={entry.startDate ?? ''}
                            onChange={e => actions.setMedStartDate(medId, e.target.value)}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            helperText={t('Empty = started earlier')}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            label={t('End date (optional)')}
                            type="date"
                            size="small"
                            variant="outlined"
                            value={entry.endDate ?? ''}
                            onChange={e => actions.setMedEndDate(medId, e.target.value)}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            error={rangeInvalid}
                            helperText={rangeInvalid ? t('End date must be on/after start date') : t('Empty = ongoing')}
                        />
                    </Grid>
                </Grid>
            </Box>

            {/* Intake times & dose */}
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
                        {t('Intake times & dose')}
                    </Typography>

                    <Button
                        size="small"
                        variant="text"
                        startIcon={<SettingsIcon />}
                        onClick={() => setShowAdvancedSlots(v => !v)}
                    >
                        {showAdvancedSlots ? t('Hide advanced') : t('Advanced')}
                    </Button>
                </Box>

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
                            <InputLabel id={doseModeLabelId}>{t('Mode')}</InputLabel>
                            <Select
                                variant="outlined"
                                labelId={doseModeLabelId}
                                label={t('Mode')}
                                value={mode}
                                onChange={e => {
                                    const nextMode = String(e.target.value);
                                    actions.setDoseMode(medId, nextMode);

                                    if (nextMode === 'perSlot') {
                                        // für alle aktuell aktivierten Slots missing perSlot auf 1 setzen
                                        const times = entry.times || {};
                                        Object.keys(times).forEach(k => {
                                            if (!times[k]) return;
                                            const hasVal =
                                                entry.dose?.perSlot &&
                                                entry.dose.perSlot[k] !== undefined &&
                                                entry.dose.perSlot[k] !== null;
                                            if (!hasVal) actions.setDosePerSlot(medId, k, 1);
                                        });
                                    }
                                }}
                            >
                                <MenuItem value="fixed">{t('Same dose for all times')}</MenuItem>
                                <MenuItem value="perSlot">{t('Different dose per time')}</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                        <FormControl
                            variant="outlined"
                            size="small"
                            fullWidth
                        >
                            <InputLabel id={doseUnitLabelId}>{t('Unit')}</InputLabel>
                            <Select
                                variant="outlined"
                                labelId={doseUnitLabelId}
                                label={t('Unit')}
                                value={dose.unit || 'pcs'}
                                onChange={e => actions.setDoseUnit(medId, e.target.value)}
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
                                label={t('Dose')}
                                value={dose.fixed ?? 1}
                                onChange={e => actions.setDoseFixed(medId, e.target.value)}
                                fullWidth
                                slotProps={{
                                    htmlInput: {
                                        min: 0,
                                        step: 0.25,
                                        inputMode: 'decimal',
                                        style: { textAlign: 'center', padding: '8px 6px' },
                                    },
                                }}
                            />
                        </Grid>
                    )}
                </Grid>

                {/* Slots row (IMPORTANT: this must be a Grid container) */}
                <Grid
                    container
                    spacing={1}
                    alignItems="flex-start"
                    justifyContent="flex-start"
                    sx={{ mt: 1 }}
                >
                    {sortedSlots.map(s => {
                        const enabled = !!entry.times?.[s.key];
                        const Icon = s.Icon;
                        const def = getSlotDef(s.key);
                        const type = String(def?.type || s.type || 'standard');

                        const showDosePerSlot = mode === 'perSlot';

                        return (
                            <Grid
                                key={s.key}
                                size="auto"
                                sx={{
                                    width: SLOT_W,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 0.75,
                                }}
                            >
                                {/* TOP: Slot block */}
                                <Box
                                    sx={[
                                        classes.slotWrap,
                                        {
                                            width: SLOT_W,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: 0.5,
                                        },
                                    ]}
                                >
                                    <IconButton
                                        onClick={() => {
                                            const nextEnabled = !enabled;

                                            actions.setTimeSlot(medId, s.key, nextEnabled);

                                            // Wenn perSlot aktiv ist und Slot eingeschaltet wird:
                                            // -> Dose default 1 persistent setzen, falls noch nicht vorhanden
                                            if (nextEnabled && mode === 'perSlot') {
                                                const hasVal =
                                                    entry.dose?.perSlot &&
                                                    entry.dose.perSlot[s.key] !== undefined &&
                                                    entry.dose.perSlot[s.key] !== null;
                                                if (!hasVal) {
                                                    actions.setDosePerSlot(medId, s.key, 1);
                                                }
                                            }
                                        }}
                                        sx={[
                                            classes.slotBtn,
                                            enabled ? classes.slotBtnActive : classes.slotBtnInactive,
                                        ]}
                                        aria-label={s.label}
                                    >
                                        <Icon style={{ fontSize: 28 }} />
                                    </IconButton>

                                    <Typography
                                        variant="caption"
                                        sx={classes.textSecondary}
                                    >
                                        {def?.label || s.label}
                                    </Typography>

                                    {showDosePerSlot && (
                                        <TextField
                                            sx={classes.slotDoseField}
                                            variant="outlined"
                                            size="small"
                                            type="number"
                                            disabled={!enabled}
                                            value={enabled ? getPerSlotVal(s.key) : 0}
                                            onChange={e => actions.setDosePerSlot(medId, s.key, e.target.value)}
                                            slotProps={{ htmlInput: { min: 0, step: 0.25, inputMode: 'decimal' } }}
                                        />
                                    )}
                                </Box>

                                {/* BOTTOM: Advanced block (same width, stacked fields) */}
                                <Collapse
                                    in={showAdvancedSlots}
                                    unmountOnExit
                                    sx={{ width: '75%' }}
                                >
                                    <Box
                                        sx={[
                                            {
                                                width: '100%',
                                                mt: 0.5,
                                                p: 1,
                                                borderRadius: 1,
                                                border: '1px solid',
                                                borderColor: 'divider',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 1,
                                            },
                                            classes.chipSlotType,
                                        ]}
                                    >
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                gap: 1,
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                            }}
                                        >
                                            <Chip
                                                size="small"
                                                variant="outlined"
                                                label={slotTypeLabel(type)}
                                            />

                                            {type === 'custom' ? (
                                                <IconButton
                                                    size="small"
                                                    aria-label={t('Remove custom slot')}
                                                    onClick={() => actions.removeCustomSlotDef(s.key)}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            ) : (
                                                <Box sx={{ width: 32 }} />
                                            )}
                                        </Box>

                                        <TextField
                                            label={t('Time')}
                                            type="time"
                                            size="small"
                                            value={def?.time || ''}
                                            onChange={e => setSlotTime(s.key, e.target.value)}
                                            fullWidth
                                            InputLabelProps={{ shrink: true }}
                                            sx={classes.slotInputFields}
                                        />

                                        <TextField
                                            label={t('Missed after (min)')}
                                            type="number"
                                            size="small"
                                            value={String(def?.graceMin ?? 0)}
                                            onChange={e => setSlotGrace(s.key, e.target.value)}
                                            fullWidth
                                            InputLabelProps={{ shrink: true }}
                                            slotProps={{ htmlInput: { min: 0, step: 5 } }}
                                            sx={classes.slotInputFields}
                                        />

                                        {type === 'custom' ? (
                                            <TextField
                                                label={t('Label')}
                                                size="small"
                                                value={def?.label || ''}
                                                onChange={e => setSlotLabel(s.key, e.target.value)}
                                                fullWidth
                                                sx={classes.slotInputFields}
                                            />
                                        ) : null}
                                    </Box>
                                </Collapse>
                            </Grid>
                        );
                    })}

                    {/* Note */}
                    <Grid
                        size={{ xs: 12 }}
                        sx={{ mt: 1 }}
                    >
                        <TextField
                            label={t('Note / intake instructions')}
                            placeholder={t('e.g. with food, after breakfast, do not drive, ...')}
                            variant="outlined"
                            size="small"
                            fullWidth
                            multiline
                            minRows={2}
                            value={entry.note ?? ''}
                            onChange={e => actions.setMedicationNote(medId, e.target.value)}
                        />
                    </Grid>
                </Grid>

                {/* Advanced: add custom + enable PRN */}
                <Collapse in={showAdvancedSlots}>
                    <Divider sx={{ my: 2 }} />

                    <Grid
                        container
                        spacing={2}
                        alignItems="center"
                    >
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<AddIcon />}
                                    onClick={() => setCustomOpen(v => !v)}
                                >
                                    {customOpen ? t('Cancel') : t('Add custom slot')}
                                </Button>

                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<ScheduleIcon />}
                                    onClick={() => {
                                        actions.ensurePrnSlotDef();
                                        actions.setTimeSlot(medId, 'prn', true);

                                        if (mode === 'perSlot') {
                                            const hasVal =
                                                entry.dose?.perSlot &&
                                                entry.dose.perSlot.prn !== undefined &&
                                                entry.dose.perSlot.prn !== null;
                                            if (!hasVal) actions.setDosePerSlot(medId, 'prn', 1);
                                        }
                                    }}
                                    disabled={hasPrnDef && prnEnabledForMed}
                                >
                                    {hasPrnDef && prnEnabledForMed ? t('PRN enabled') : t('Enable PRN slot')}
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>

                    <Collapse
                        in={customOpen}
                        unmountOnExit
                    >
                        <Paper
                            variant="outlined"
                            sx={{ mt: 2, p: 2 }}
                        >
                            <Typography
                                variant="subtitle2"
                                sx={classes.textPrimary}
                                gutterBottom
                            >
                                {t('New custom slot')}
                            </Typography>

                            <Grid
                                container
                                spacing={2}
                                alignItems="center"
                            >
                                <Grid size={{ xs: 12, md: 4 }}>
                                    <TextField
                                        label={t('Label')}
                                        size="small"
                                        value={customLabel}
                                        onChange={e => setCustomLabel(e.target.value)}
                                        fullWidth
                                    />
                                </Grid>

                                <Grid size={{ xs: 12, md: 3 }}>
                                    <TextField
                                        label={t('Time')}
                                        type="time"
                                        size="small"
                                        value={customTime}
                                        onChange={e => setCustomTime(e.target.value)}
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12, md: 3 }}>
                                    <TextField
                                        label={t('Missed after (min)')}
                                        type="number"
                                        size="small"
                                        value={customGrace}
                                        onChange={e => setCustomGrace(e.target.value)}
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                        slotProps={{ htmlInput: { min: 0, step: 5 } }}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12, md: 2 }}>
                                    <Button
                                        variant="contained"
                                        size="small"
                                        startIcon={<MoreTimeIcon />}
                                        onClick={() => {
                                            const n = customGrace.trim() === '' ? 120 : Number(customGrace);
                                            const graceMin = Number.isFinite(n) && n >= 0 ? n : 120;

                                            actions.addCustomSlotDef({
                                                label: customLabel || t('Custom slot'),
                                                time: customTime || '08:00',
                                                graceMin,
                                            });

                                            setCustomLabel('');
                                            setCustomTime('08:00');
                                            setCustomGrace('120');
                                            setCustomOpen(false);
                                        }}
                                        fullWidth
                                    >
                                        {t('Add')}
                                    </Button>
                                </Grid>
                            </Grid>

                            <Typography
                                variant="caption"
                                sx={classes.textSecondary}
                            >
                                {t('After adding, activate the slot for this medication by clicking its icon.')}
                            </Typography>
                        </Paper>
                    </Collapse>
                </Collapse>
            </Box>

            {/* Repeat */}
            <Box mt={3}>
                <Typography
                    variant="subtitle2"
                    sx={[classes.textPrimary, classes.sectionHeader]}
                >
                    {t('Repeat rhythm')}
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
                            <InputLabel id={rhythmLabelId}>{t('Rhythm')}</InputLabel>
                            <Select
                                variant="outlined"
                                labelId={rhythmLabelId}
                                label={t('Rhythm')}
                                value={repeat.type}
                                onChange={e => actions.setRepeatType(medId, e.target.value)}
                            >
                                <MenuItem value="daily">{t('Daily')}</MenuItem>
                                <MenuItem value="everyXDays">{t('Every X days')}</MenuItem>
                                <MenuItem value="weekly">{t('Weekly')}</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        {repeat.type === 'everyXDays' ? (
                            <TextField
                                label={t('Every (days)')}
                                type="number"
                                variant="outlined"
                                size="small"
                                value={repeat.every}
                                onChange={e => actions.setRepeatEvery(medId, e.target.value)}
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

            {/* Packages */}
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
                        {t('Packages')}
                    </Typography>

                    <Button
                        color="primary"
                        size="small"
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => actions.addPackage(medId)}
                    >
                        {t('Add package')}
                    </Button>
                </Box>

                {(entry.packages || []).length === 0 ? (
                    <Typography
                        variant="body2"
                        sx={classes.textSecondary}
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
                            <Grid size={{ xs: 12, md: 2 }}>
                                <TextField
                                    label={t('Total')}
                                    type="number"
                                    size="small"
                                    variant="outlined"
                                    value={pkg.total ?? 0}
                                    onChange={e => onPkgTotalChange(pkg, e.target.value)}
                                    slotProps={{ htmlInput: { min: 0, step: 0.25 } }}
                                    fullWidth
                                />
                            </Grid>

                            <Grid size={{ xs: 12, md: 2 }}>
                                <TextField
                                    label={t('Current')}
                                    type="number"
                                    size="small"
                                    variant="outlined"
                                    value={pkg.current ?? 0}
                                    onChange={e => onPkgCurrentChange(pkg, e.target.value)}
                                    slotProps={{ htmlInput: { min: 0, step: 0.25, max: Number(pkg.total ?? 0) } }}
                                    fullWidth
                                />
                            </Grid>

                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField
                                    label={t('Marking (optional)')}
                                    size="small"
                                    variant="outlined"
                                    value={pkg.mark ?? ''}
                                    onChange={e => actions.updatePackageField(medId, pkg.id, 'mark', e.target.value)}
                                    fullWidth
                                />
                            </Grid>

                            <Grid size={{ xs: 10, md: 1 }}>
                                <Typography
                                    variant="caption"
                                    sx={classes.textSecondary}
                                >
                                    {new Date(pkg.createdTs || Date.now()).toLocaleDateString()}
                                </Typography>
                            </Grid>

                            <Grid size={{ xs: 2, md: 1 }}>
                                <IconButton
                                    aria-label={t('Delete package')}
                                    onClick={() => actions.deletePackage(medId, pkg.id)}
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
}
