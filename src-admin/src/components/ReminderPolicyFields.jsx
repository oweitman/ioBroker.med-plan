// src-admin/src/components/ReminderPolicyFields.jsx
import React from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid2';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

import { t } from '../components/i18n';

const LEVELS = ['urgent', 'warn', 'notice', 'info'];

// --- utils ---
function parseOffsets(raw) {
    const s = String(raw ?? '').trim();
    if (!s) return null;

    // JSON array
    if (s.startsWith('[')) {
        try {
            const arr = JSON.parse(s);
            if (Array.isArray(arr)) {
                return arr.map(Number).filter(n => Number.isFinite(n));
            }
        } catch (e) {
            // ignore -> try CSV below
        }
    }

    // CSV / whitespace separated
    return s
        .split(/[,\s]+/)
        .map(Number)
        .filter(n => Number.isFinite(n));
}

function cleanPartialPatch(patch) {
    // remove keys with value === undefined (so we can "unset" override fields cleanly upstream)
    const out = {};
    Object.entries(patch || {}).forEach(([k, v]) => {
        if (v !== undefined) out[k] = v;
    });
    return out;
}

/**
 * Props:
 * - classes
 * - title?: string
 * - policy: object
 * - onPatch: (patchObj) => void   // patch is shallow for policy root; nested for severity
 * - allowPartial: boolean         // if true: empty inputs -> emit undefined to allow "unset"
 * - hideSeverity: boolean
 */
export default function ReminderPolicyFields({
    classes,
    title,
    policy,
    onPatch,
    allowPartial = false,
    hideSeverity = false,
}) {
    const strategyLabelId = React.useId();

    const strategy = allowPartial ? (policy?.strategy ?? '') : (policy?.strategy ?? 'hybrid');

    const setNum = (key, v) => {
        const raw = String(v ?? '');
        if (allowPartial && raw.trim() === '') {
            onPatch({ [key]: undefined });
            return;
        }
        const n = Number(raw);
        onPatch({ [key]: Number.isFinite(n) ? n : 0 });
    };

    const setStr = (key, v) => {
        const s = String(v ?? '');
        if (allowPartial && s.trim() === '') {
            onPatch({ [key]: undefined });
            return;
        }
        onPatch({ [key]: s });
    };

    const severity = policy?.severity || {};
    const thresholds = Array.isArray(severity.thresholds) ? severity.thresholds : [];

    const patchThreshold = (idx, patch) => {
        const next = thresholds.map((x, i) => (i === idx ? { ...x, ...patch } : x));
        onPatch({ severity: { ...severity, thresholds: next } });
    };

    const addThreshold = () => {
        const next = [...thresholds, { lte: 999999, level: 'info' }];
        onPatch({ severity: { ...severity, thresholds: next } });
    };

    const deleteThreshold = idx => {
        const next = thresholds.filter((_, i) => i !== idx);
        onPatch({ severity: { ...severity, thresholds: next } });
    };

    return (
        <Box>
            {title ? (
                <Typography
                    variant="subtitle2"
                    sx={classes.textPrimary}
                >
                    {title}
                </Typography>
            ) : null}

            <Grid
                container
                spacing={2}
                sx={{ mt: 0.5 }}
            >
                <Grid size={{ xs: 12, md: 4 }}>
                    <FormControl
                        variant="outlined"
                        size="small"
                        fullWidth
                    >
                        <InputLabel id={strategyLabelId}>{t('Strategy')}</InputLabel>
                        <Select
                            variant="outlined"
                            labelId={strategyLabelId}
                            label={t('Strategy')}
                            value={strategy}
                            onChange={e => setStr('strategy', e.target.value)}
                        >
                            {allowPartial ? (
                                <MenuItem value="">
                                    <em>{t('Use default')}</em>
                                </MenuItem>
                            ) : null}
                            <MenuItem value="hybrid">{t('Hybrid')}</MenuItem>
                            <MenuItem value="decay">{t('Decay')}</MenuItem>
                            <MenuItem value="fixed">{t('Fixed')}</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                        label={t('Window (minutes)')}
                        type="number"
                        size="small"
                        variant="outlined"
                        value={policy?.windowMinutes ?? (allowPartial ? '' : 120)}
                        onChange={e => setNum('windowMinutes', e.target.value)}
                        fullWidth
                        slotProps={{ htmlInput: { min: 0, step: 5 } }}
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                        label={t('Max reminders')}
                        type="number"
                        size="small"
                        variant="outlined"
                        value={policy?.maxReminders ?? (allowPartial ? '' : 5)}
                        onChange={e => setNum('maxReminders', e.target.value)}
                        fullWidth
                        slotProps={{ htmlInput: { min: 0, step: 1 } }}
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                        label={t('Min gap (minutes)')}
                        type="number"
                        size="small"
                        variant="outlined"
                        value={policy?.minGapMinutes ?? (allowPartial ? '' : 10)}
                        onChange={e => setNum('minGapMinutes', e.target.value)}
                        fullWidth
                        slotProps={{ htmlInput: { min: 0, step: 1 } }}
                    />
                </Grid>

                {strategy === 'fixed' ? (
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            label={t('Every (minutes)')}
                            type="number"
                            size="small"
                            variant="outlined"
                            value={policy?.fixedEveryMinutes ?? (allowPartial ? '' : 15)}
                            onChange={e => setNum('fixedEveryMinutes', e.target.value)}
                            fullWidth
                            slotProps={{ htmlInput: { min: 1, step: 1 } }}
                        />
                    </Grid>
                ) : null}

                {strategy === 'hybrid' ? (
                    <Grid size={{ xs: 12, md: 8 }}>
                        <TextField
                            label={t('Hybrid offsets')}
                            helperText={t('Comma-separated or JSON array, e.g. 0, 0.66, 0.83')}
                            size="small"
                            variant="outlined"
                            value={
                                Array.isArray(policy?.hybridOffsets)
                                    ? JSON.stringify(policy.hybridOffsets)
                                    : allowPartial
                                      ? ''
                                      : JSON.stringify([0, 0.66, 0.83, 0.92, 0.96])
                            }
                            onChange={e => {
                                const raw = String(e.target.value ?? '');
                                if (allowPartial && raw.trim() === '') {
                                    onPatch({ hybridOffsets: undefined });
                                    return;
                                }
                                const parsed = parseOffsets(raw);
                                onPatch({ hybridOffsets: parsed || [] });
                            }}
                            fullWidth
                        />
                    </Grid>
                ) : null}
            </Grid>

            {!hideSeverity ? (
                <>
                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Typography
                                variant="subtitle2"
                                sx={classes.textPrimary}
                            >
                                {t('Severity')}
                            </Typography>
                            <Chip
                                size="small"
                                variant="outlined"
                                label={t('byRemainingMinutes')}
                            />
                        </Box>

                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={addThreshold}
                        >
                            {t('Add threshold')}
                        </Button>
                    </Box>

                    <Grid
                        container
                        spacing={1}
                    >
                        {thresholds.map((th, idx) => (
                            <React.Fragment key={idx}>
                                <Grid size={{ xs: 5, md: 3 }}>
                                    <TextField
                                        label={t('lte (minutes)')}
                                        type="number"
                                        size="small"
                                        variant="outlined"
                                        value={th.lte ?? 0}
                                        onChange={e => {
                                            const n = Number(e.target.value);
                                            patchThreshold(idx, { lte: Number.isFinite(n) ? n : 0 });
                                        }}
                                        fullWidth
                                    />
                                </Grid>

                                <Grid size={{ xs: 5, md: 3 }}>
                                    <TextField
                                        select
                                        label={t('Level')}
                                        size="small"
                                        variant="outlined"
                                        value={th.level || 'info'}
                                        onChange={e => patchThreshold(idx, { level: String(e.target.value) })}
                                        fullWidth
                                    >
                                        {LEVELS.map(l => (
                                            <MenuItem
                                                key={l}
                                                value={l}
                                            >
                                                {l}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>

                                <Grid
                                    size={{ xs: 2, md: 1 }}
                                    sx={{ display: 'flex', alignItems: 'center' }}
                                >
                                    <IconButton
                                        aria-label={t('Delete')}
                                        onClick={() => deleteThreshold(idx)}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </Grid>

                                <Grid size={{ xs: 12 }} />
                            </React.Fragment>
                        ))}
                    </Grid>
                </>
            ) : null}
        </Box>
    );
}

export { cleanPartialPatch };
