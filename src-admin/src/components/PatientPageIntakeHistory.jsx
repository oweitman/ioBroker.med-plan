// src-admin/src/components/PatientPageIntakeHistory.jsx
import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';

import TableSortLabel from '@mui/material/TableSortLabel';

import DeleteIcon from '@mui/icons-material/Delete';
import ClearIcon from '@mui/icons-material/Clear';

import { t } from '../components/i18n';

const DEFAULT_MAX_ROWS = 200;

/** @typedef {'date'|'time'|'medication'|'slot'|'state'} SortBy */
/** @typedef {'asc'|'desc'} SortDir */

const DEFAULT_DIR_BY_COL = /** @type {Record<SortBy, SortDir>} */ ({
    date: 'desc',
    time: 'desc',
    medication: 'asc',
    slot: 'asc',
    state: 'asc',
});

const DIR_MUL = /** @type {Record<SortDir, 1|-1>} */ ({
    asc: 1,
    desc: -1,
});

const KEY_GETTERS = /** @type {Record<SortBy, (r:any)=>any>} */ ({
    date: r => r.ymd,
    time: r => r.ts || 0,
    medication: r => r.medName,
    slot: r => r.slotLabel,
    state: r => r.stateLabel,
});

export default function PatientPageIntakeHistory({ classes, patient, medications, slots, onUpdatePatient }) {
    const medNameById = React.useCallback(id => medications.find(m => m.id === id)?.name || id, [medications]);

    const slotByKey = React.useMemo(() => {
        const m = {};
        (Array.isArray(slots) ? slots : []).forEach(s => (m[s.key] = s));
        return m;
    }, [slots]);

    const intakeStateLabel = React.useCallback(state => {
        if (state === 2) return t('Missed');
        if (state === 1) return t('Taken');
        if (state === 0) return t('Planned');
        return `${t('State')} ${state}`;
    }, []);

    const normalizeIntake = React.useCallback(ev => {
        if (typeof ev === 'number') return { state: ev, ts: null, count: null };
        if (ev && typeof ev === 'object') {
            return {
                state: typeof ev.state === 'number' ? ev.state : null,
                ts: typeof ev.ts === 'number' ? ev.ts : null,
                count: typeof ev.count === 'number' ? ev.count : null,
            };
        }
        return { state: null, ts: null, count: null };
    }, []);

    // ---------- build raw rows ----------
    const rows = React.useMemo(() => {
        const intakeRoot = patient?.plan?.intake;
        if (!intakeRoot || typeof intakeRoot !== 'object') return [];

        const out = [];
        for (const ymd of Object.keys(intakeRoot)) {
            const perDay = intakeRoot[ymd] || {};
            for (const medId of Object.keys(perDay)) {
                const perMed = perDay[medId] || {};
                for (const slotKey of Object.keys(perMed)) {
                    const n = normalizeIntake(perMed[slotKey]);
                    const dt = n.ts ? new Date(n.ts) : null;

                    out.push({
                        ymd,
                        medId,
                        medName: medNameById(medId),
                        slotKey,
                        slotLabel: slotByKey[slotKey]?.label || slotKey,
                        state: n.state,
                        stateLabel: intakeStateLabel(n.state),
                        ts: n.ts,
                        timeStr: dt ? dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',

                        // stable row id for selection + delete
                        rowKey: `${ymd}::${medId}::${slotKey}::${n.ts || 0}`,
                    });
                }
            }
        }
        return out;
    }, [patient, normalizeIntake, medNameById, slotByKey, intakeStateLabel]);

    // ---------- filter + search UI state ----------
    const [q, setQ] = React.useState('');
    const [filterState, setFilterState] = React.useState(''); // '', '0','1','2'
    const [filterMed, setFilterMed] = React.useState(''); // medId or ''
    const [filterSlot, setFilterSlot] = React.useState(''); // slotKey or ''
    const [filterDate, setFilterDate] = React.useState(''); // YYYY-MM-DD or ''

    // ---------- sort UI state ----------
    // id: 'date'|'time'|'medication'|'slot'|'state'
    /** @type {[SortBy, React.Dispatch<React.SetStateAction<SortBy>>]} */
    const [sortBy, setSortBy] = React.useState(/** @type {SortBy} */ ('date'));

    /** @type {[SortDir, React.Dispatch<React.SetStateAction<SortDir>>]} */
    const [sortDir, setSortDir] = React.useState(/** @type {SortDir} */ ('desc'));

    /** @param {SortBy} col */
    const toggleSort = React.useCallback(
        col => {
            if (sortBy === col) {
                setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
            } else {
                setSortBy(col);
                setSortDir(DEFAULT_DIR_BY_COL[col]);
            }
        },
        [sortBy],
    );
    // ---------- selection state ----------
    const [selected, setSelected] = React.useState(() => new Set());

    // keep selection valid if rows change
    React.useEffect(() => {
        const valid = new Set(rows.map(r => r.rowKey));
        setSelected(prev => {
            const next = new Set();
            for (const k of prev) if (valid.has(k)) next.add(k);
            return next;
        });
    }, [rows]);

    const clearFilters = React.useCallback(() => {
        setQ('');
        setFilterState('');
        setFilterMed('');
        setFilterSlot('');
        setFilterDate('');
    }, []);

    // ---------- derived: available filter values ----------
    const medOptions = React.useMemo(() => {
        const map = new Map();
        for (const r of rows) map.set(r.medId, r.medName);
        return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    }, [rows]);

    const slotOptions = React.useMemo(() => {
        const map = new Map();
        for (const r of rows) map.set(r.slotKey, r.slotLabel);
        return [...map.entries()]
            .map(([key, label]) => ({ key, label }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [rows]);

    // ---------- apply filters + search ----------
    const filtered = React.useMemo(() => {
        const qq = String(q || '')
            .trim()
            .toLowerCase();

        return rows.filter(r => {
            if (filterDate && r.ymd !== filterDate) return false;
            if (filterMed && r.medId !== filterMed) return false;
            if (filterSlot && r.slotKey !== filterSlot) return false;
            if (filterState !== '') {
                const st = Number(filterState);
                if (r.state !== st) return false;
            }

            if (!qq) return true;

            // "search across all columns"
            const hay = [r.ymd, r.timeStr, r.medName, r.slotLabel, r.stateLabel, r.medId, r.slotKey]
                .join(' ')
                .toLowerCase();

            return hay.includes(qq);
        });
    }, [rows, q, filterDate, filterMed, filterSlot, filterState]);

    // ---------- sort ----------
    const sorted = React.useMemo(() => {
        const dirMul = DIR_MUL[sortDir];

        const cmpStr = (a, b) => String(a || '').localeCompare(String(b || ''), undefined, { sensitivity: 'base' });
        const cmpNum = (a, b) => Number(a || 0) - Number(b || 0);

        const isNumeric = sortBy === 'time';
        const keyFn = KEY_GETTERS[sortBy];

        return [...filtered].sort((a, b) => {
            const ka = keyFn(a);
            const kb = keyFn(b);

            const base = isNumeric ? cmpNum(ka, kb) : cmpStr(ka, kb);
            if (base !== 0) return base * dirMul;

            if (a.ymd !== b.ymd) return (a.ymd < b.ymd ? -1 : 1) * dirMul;
            return (Number(b.ts || 0) - Number(a.ts || 0)) * dirMul;
        });
    }, [filtered, sortBy, sortDir]);

    // cap for UI
    const shown = React.useMemo(() => sorted.slice(0, DEFAULT_MAX_ROWS), [sorted]);

    // ---------- selection helpers ----------
    const isAllShownSelected = React.useMemo(() => {
        if (shown.length === 0) return false;
        return shown.every(r => selected.has(r.rowKey));
    }, [shown, selected]);

    const isSomeShownSelected = React.useMemo(() => {
        if (shown.length === 0) return false;
        return shown.some(r => selected.has(r.rowKey)) && !isAllShownSelected;
    }, [shown, selected, isAllShownSelected]);

    const toggleSelectAllShown = React.useCallback(() => {
        setSelected(prev => {
            const next = new Set(prev);
            if (shown.every(r => next.has(r.rowKey))) {
                // unselect all shown
                shown.forEach(r => next.delete(r.rowKey));
            } else {
                // select all shown
                shown.forEach(r => next.add(r.rowKey));
            }
            return next;
        });
    }, [shown]);

    const toggleSelectRow = React.useCallback(rowKey => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(rowKey)) next.delete(rowKey);
            else next.add(rowKey);
            return next;
        });
    }, []);

    // ---------- delete logic (single + bulk) ----------
    const deleteRow = React.useCallback(
        row => {
            if (!patient?.id || !onUpdatePatient) return;

            onUpdatePatient(patient.id, p => {
                if (!p?.plan || typeof p.plan !== 'object') return;
                if (!p.plan.intake || typeof p.plan.intake !== 'object') return;

                const y = row.ymd;
                const m = row.medId;
                const s = row.slotKey;

                const day = p.plan.intake[y];
                if (!day || typeof day !== 'object') return;

                const perMed = day[m];
                if (!perMed || typeof perMed !== 'object') return;

                if (Object.prototype.hasOwnProperty.call(perMed, s)) {
                    // remove slot
                    const nextPerMed = { ...perMed };
                    delete nextPerMed[s];

                    if (Object.keys(nextPerMed).length === 0) {
                        // remove med node
                        const nextDay = { ...day };
                        delete nextDay[m];

                        if (Object.keys(nextDay).length === 0) {
                            // remove day node
                            const nextIntake = { ...p.plan.intake };
                            delete nextIntake[y];
                            p.plan = { ...p.plan, intake: nextIntake };
                        } else {
                            const nextIntake = { ...p.plan.intake, [y]: nextDay };
                            p.plan = { ...p.plan, intake: nextIntake };
                        }
                    } else {
                        const nextDay = { ...day, [m]: nextPerMed };
                        const nextIntake = { ...p.plan.intake, [y]: nextDay };
                        p.plan = { ...p.plan, intake: nextIntake };
                    }
                }
            });

            // also unselect it
            setSelected(prev => {
                const next = new Set(prev);
                next.delete(row.rowKey);
                return next;
            });
        },
        [patient?.id, onUpdatePatient],
    );

    const deleteSelected = React.useCallback(() => {
        if (!patient?.id || !onUpdatePatient) return;
        if (selected.size === 0) return;

        // create a lookup from rowKey to row fields
        const byKey = new Map();
        rows.forEach(r => byKey.set(r.rowKey, r));

        const keysToDelete = [...selected].filter(k => byKey.has(k));
        if (keysToDelete.length === 0) return;

        onUpdatePatient(patient.id, p => {
            if (!p?.plan || typeof p.plan !== 'object') return;
            if (!p.plan.intake || typeof p.plan.intake !== 'object') return;

            // clone intake once, then mutate local clones (still immutable at top-level)
            let intake = { ...p.plan.intake };

            for (const k of keysToDelete) {
                const r = byKey.get(k);
                if (!r) continue;

                const y = r.ymd;
                const m = r.medId;
                const s = r.slotKey;

                const day = intake[y];
                if (!day || typeof day !== 'object') continue;

                const perMed = day[m];
                if (!perMed || typeof perMed !== 'object') continue;

                const nextPerMed = { ...perMed };
                delete nextPerMed[s];

                if (Object.keys(nextPerMed).length === 0) {
                    const nextDay = { ...day };
                    delete nextDay[m];

                    if (Object.keys(nextDay).length === 0) {
                        const nextIntake = { ...intake };
                        delete nextIntake[y];
                        intake = nextIntake;
                    } else {
                        intake = { ...intake, [y]: nextDay };
                    }
                } else {
                    intake = { ...intake, [y]: { ...day, [m]: nextPerMed } };
                }
            }

            p.plan = { ...p.plan, intake };
        });

        setSelected(new Set());
    }, [patient?.id, onUpdatePatient, selected, rows]);

    // ---------- render ----------
    return (
        <Paper style={{ padding: 16, marginTop: 24 }}>
            <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                gap={2}
                flexWrap="wrap"
            >
                <Typography
                    variant="h6"
                    sx={classes.textPrimary}
                >
                    {t('Intake history')}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <TextField
                        size="small"
                        variant="outlined"
                        label={t('Search')}
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        sx={{ minWidth: 220 }}
                    />

                    <TextField
                        select
                        size="small"
                        variant="outlined"
                        label={t('Medication')}
                        value={filterMed}
                        onChange={e => setFilterMed(String(e.target.value))}
                        sx={{ minWidth: 200 }}
                    >
                        <MenuItem value="">{t('All')}</MenuItem>
                        {medOptions.map(m => (
                            <MenuItem
                                key={m.id}
                                value={m.id}
                            >
                                {m.name}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select
                        size="small"
                        variant="outlined"
                        label={t('Slot')}
                        value={filterSlot}
                        onChange={e => setFilterSlot(String(e.target.value))}
                        sx={{ minWidth: 160 }}
                    >
                        <MenuItem value="">{t('All')}</MenuItem>
                        {slotOptions.map(s => (
                            <MenuItem
                                key={s.key}
                                value={s.key}
                            >
                                {s.label}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select
                        size="small"
                        variant="outlined"
                        label={t('State')}
                        value={filterState}
                        onChange={e => setFilterState(String(e.target.value))}
                        sx={{ minWidth: 140 }}
                    >
                        <MenuItem value="">{t('All')}</MenuItem>
                        <MenuItem value="0">{t('Planned')}</MenuItem>
                        <MenuItem value="1">{t('Taken')}</MenuItem>
                        <MenuItem value="2">{t('Missed')}</MenuItem>
                    </TextField>

                    <TextField
                        size="small"
                        variant="outlined"
                        label={t('Date')}
                        placeholder="YYYY-MM-DD"
                        value={filterDate}
                        onChange={e => setFilterDate(e.target.value)}
                        sx={{ width: 150 }}
                    />

                    <Tooltip title={t('Clear filters')}>
                        <IconButton
                            aria-label={t('Clear filters')}
                            onClick={clearFilters}
                        >
                            <ClearIcon />
                        </IconButton>
                    </Tooltip>

                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<DeleteIcon />}
                        disabled={selected.size === 0}
                        onClick={deleteSelected}
                    >
                        {t('Delete')} ({selected.size})
                    </Button>
                </Box>
            </Box>

            <Typography
                variant="body2"
                sx={classes.textSecondary}
                style={{ marginTop: 4 }}
            >
                {t('Recorded intakes for this patient (latest first).')}
            </Typography>

            {sorted.length === 0 ? (
                <Typography
                    variant="body2"
                    sx={classes.textSecondary}
                    style={{ marginTop: 12 }}
                >
                    {t('No intake records yet.')}
                </Typography>
            ) : (
                <TableContainer style={{ marginTop: 12 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        checked={isAllShownSelected}
                                        indeterminate={isSomeShownSelected}
                                        onChange={toggleSelectAllShown}
                                    />
                                </TableCell>

                                <TableCell>
                                    <TableSortLabel
                                        active={sortBy === 'date'}
                                        direction={sortBy === 'date' ? sortDir : 'asc'}
                                        onClick={() => toggleSort('date')}
                                    >
                                        {t('Date')}
                                    </TableSortLabel>
                                </TableCell>

                                <TableCell>
                                    <TableSortLabel
                                        active={sortBy === 'time'}
                                        direction={sortBy === 'time' ? sortDir : 'asc'}
                                        onClick={() => toggleSort('time')}
                                    >
                                        {t('Time')}
                                    </TableSortLabel>
                                </TableCell>

                                <TableCell>
                                    <TableSortLabel
                                        active={sortBy === 'medication'}
                                        direction={sortBy === 'medication' ? sortDir : 'asc'}
                                        onClick={() => toggleSort('medication')}
                                    >
                                        {t('Medication')}
                                    </TableSortLabel>
                                </TableCell>

                                <TableCell>
                                    <TableSortLabel
                                        active={sortBy === 'slot'}
                                        direction={sortBy === 'slot' ? sortDir : 'asc'}
                                        onClick={() => toggleSort('slot')}
                                    >
                                        {t('Slot')}
                                    </TableSortLabel>
                                </TableCell>

                                <TableCell>
                                    <TableSortLabel
                                        active={sortBy === 'state'}
                                        direction={sortBy === 'state' ? sortDir : 'asc'}
                                        onClick={() => toggleSort('state')}
                                    >
                                        {t('State')}
                                    </TableSortLabel>
                                </TableCell>

                                <TableCell align="right">{t('Actions')}</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {shown.map(r => {
                                const slot = slotByKey[r.slotKey];
                                const SlotIcon = slot?.Icon;

                                return (
                                    <TableRow
                                        key={r.rowKey}
                                        hover
                                    >
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                checked={selected.has(r.rowKey)}
                                                onChange={() => toggleSelectRow(r.rowKey)}
                                            />
                                        </TableCell>

                                        <TableCell>{r.ymd}</TableCell>
                                        <TableCell>{r.timeStr}</TableCell>
                                        <TableCell>{r.medName}</TableCell>

                                        <TableCell>
                                            <Box
                                                display="flex"
                                                alignItems="center"
                                                gap={1}
                                            >
                                                {SlotIcon ? <SlotIcon fontSize="small" /> : null}
                                                <span>{r.slotLabel}</span>
                                            </Box>
                                        </TableCell>

                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={r.stateLabel}
                                                variant="outlined"
                                            />
                                        </TableCell>

                                        <TableCell align="right">
                                            <Tooltip title={t('Delete')}>
                                                <IconButton
                                                    aria-label={t('Delete')}
                                                    onClick={() => deleteRow(r)}
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>

                    {sorted.length > DEFAULT_MAX_ROWS ? (
                        <Typography
                            variant="caption"
                            sx={classes.textSecondary}
                            style={{ display: 'block', marginTop: 8 }}
                        >
                            {t('Showing')} {DEFAULT_MAX_ROWS} {t('of')} {sorted.length}.
                        </Typography>
                    ) : null}
                </TableContainer>
            )}
        </Paper>
    );
}
