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

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

import { t } from '../components/i18n';

export default function PatientPageMedicationCard({ classes, medId, entry, medName, units, slots, actions }) {
    const repeat = entry.repeat || { type: 'daily', every: 1 };
    const rhythmLabelId = `rhythm-label-${medId}`;

    const rangeInvalid = entry.startDate && entry.endDate && entry.endDate < entry.startDate;

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
                <Typography
                    variant="subtitle2"
                    sx={classes.textPrimary}
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
                                            onChange={e => actions.setDoseMode(medId, String(e.target.value))}
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

                            <Grid
                                container
                                spacing={1}
                                justifyContent="flex-start"
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
                                                    onClick={() => actions.setTimeSlot(medId, s.key, !enabled)}
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
                                                            actions.setDosePerSlot(medId, s.key, e.target.value)
                                                        }
                                                        slotProps={{
                                                            htmlInput: {
                                                                min: 0,
                                                                step: 0.25,
                                                                inputMode: 'decimal',
                                                            },
                                                        }}
                                                    />
                                                )}
                                            </Box>
                                        </Grid>
                                    );
                                })}

                                <Grid size={{ xs: 12 }}>
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
                        </>
                    );
                })()}
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
                                    onChange={e => actions.updatePackageField(medId, pkg.id, 'total', e.target.value)}
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
                                    onChange={e => actions.updatePackageField(medId, pkg.id, 'current', e.target.value)}
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
