import React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PrintIcon from '@mui/icons-material/Print';

import { t } from '../components/i18n';

/**
 * @param {{
 *   classes: any,
 *   patient: any,
 *   medications: Array<{id: string, name: string}>,
 * }} props
 */
export default function PillOrganizerSection(props) {
    const { classes, patient, medications } = props;

    const [weeks, setWeeks] = React.useState(2); // 1..4
    const [pillboxMode, setPillboxMode] = React.useState(true); // fixed 4 slots + extras row

    const medNameById = React.useCallback(id => medications.find(m => m.id === id)?.name || id, [medications]);

    // -------- Date helpers --------
    const pad2 = n => String(n).padStart(2, '0');
    const toYmd = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

    const parseYmd = s => {
        const ss = String(s || '').trim();
        if (!ss) return null;
        const m = ss.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return null;
        const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        d.setHours(0, 0, 0, 0);
        return d;
    };

    const addDays = (date, days) => {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        return d;
    };

    const startOfWeekMonday = React.useCallback(date => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        const day = d.getDay(); // Sun=0
        const diff = day === 0 ? -6 : 1 - day;
        d.setDate(d.getDate() + diff);
        return d;
    }, []);

    // -------- scheduling logic --------
    const isInDateRange = (ymd, startDate, endDate) => {
        const d = parseYmd(ymd);
        if (!d) return true;

        const s = parseYmd(startDate);
        const e = parseYmd(endDate);

        if (s && d < s) return false;
        if (e && d > e) return false;
        return true;
    };

    // Supports:
    // - daily / everyXDays via repeat.every
    // - weekly via repeat.daysOfWeek (Mon=0..Sun=6)
    const isRepeatMatch = (ymd, repeat, startDate) => {
        const r = repeat && typeof repeat === 'object' ? repeat : { type: 'daily', every: 1 };
        const d = parseYmd(ymd);
        if (!d) return true;

        const base = parseYmd(startDate) || d;
        const daysSince = Math.floor((d.getTime() - base.getTime()) / (24 * 3600 * 1000));

        if (r.type === 'weekly') {
            const jsDay = d.getDay(); // Sun=0
            const dow = jsDay === 0 ? 6 : jsDay - 1; // Mon=0..Sun=6
            const list = Array.isArray(r.daysOfWeek) ? r.daysOfWeek : [];
            return list.includes(dow);
        }

        const every = Math.max(1, Number(r.every || 1));
        if (r.type === 'everyXDays' || r.type === 'daily') {
            if (daysSince < 0) return false;
            return daysSince % every === 0;
        }

        if (daysSince < 0) return false;
        return daysSince % every === 0;
    };

    // -------- week/day grid --------
    const weekStart = React.useMemo(() => startOfWeekMonday(new Date()), [startOfWeekMonday]);

    const dayNames = React.useMemo(
        () => [t('Monday'), t('Tuesday'), t('Wednesday'), t('Thursday'), t('Friday'), t('Saturday'), t('Sunday')],
        [],
    );

    const days = React.useMemo(() => {
        const w = Math.min(4, Math.max(1, Number(weeks || 1)));
        const out = [];
        for (let i = 0; i < w * 7; i++) {
            const date = addDays(weekStart, i);
            out.push({ date, ymd: toYmd(date), dow: i % 7, weekIndex: Math.floor(i / 7) });
        }
        return out;
    }, [weeks, weekStart]);

    // -------- slot sorting (by time) --------
    const slotDefs = patient?.plan?.slotDefs || {};

    const timeToMinutes = tstr => {
        const s = String(tstr || '').trim();
        const m = s.match(/^(\d{2}):(\d{2})$/);
        if (!m) return 24 * 60 + 999; // unknown -> last
        return Number(m[1]) * 60 + Number(m[2]);
    };

    const slotMeta = React.useMemo(() => {
        const keys = Object.keys(slotDefs || {});
        return keys.map(k => ({
            key: k,
            type: slotDefs[k]?.type || 'standard',
            label: slotDefs[k]?.label || k,
            time: slotDefs[k]?.time || '',
            timeMin: timeToMinutes(slotDefs[k]?.time),
        }));
    }, [slotDefs]);

    const slotLabel = React.useCallback(k => slotDefs?.[k]?.label || k, [slotDefs]);
    const slotTime = React.useCallback(k => slotDefs?.[k]?.time || '', [slotDefs]);

    // Default: exclude PRN from pill organizer
    const includeSlotDefault = k => k !== 'prn';

    // Two modes:
    // - pillboxMode=true: fixed 4 rows + optional "Extra" row
    // - pillboxMode=false: all slots (sorted by time)
    const fixedSlots = ['morning', 'noon', 'evening', 'night'];

    const rowsConfig = React.useMemo(() => {
        if (!pillboxMode) {
            const all = slotMeta
                .filter(s => includeSlotDefault(s.key))
                .sort((a, b) => a.timeMin - b.timeMin || String(a.label).localeCompare(String(b.label)));
            return all.map(s => ({
                kind: 'slot',
                slotKey: s.key,
                title: `${s.time ? `${s.time} – ` : ''}${s.label}`,
            }));
        }

        // pillbox mode
        const presentFixed = fixedSlots
            .filter(k => slotDefs?.[k] && includeSlotDefault(k))
            .map(k => ({
                kind: 'slot',
                slotKey: k,
                title: `${slotTime(k) ? `${slotTime(k)} – ` : ''}${slotLabel(k)}`,
                timeMin: timeToMinutes(slotTime(k)),
            }))
            .sort((a, b) => (a.timeMin ?? 0) - (b.timeMin ?? 0));

        const extras = slotMeta
            .filter(s => includeSlotDefault(s.key))
            .filter(s => !fixedSlots.includes(s.key))
            .sort((a, b) => a.timeMin - b.timeMin || String(a.label).localeCompare(String(b.label)));

        const out = [...presentFixed];

        if (extras.length) {
            out.push({
                kind: 'extras',
                // @ts-ignore
                slotKeys: extras.map(x => x.key),
                title: t('Extra slots'),
            });
        }

        return out;
    }, [pillboxMode, slotMeta, slotDefs, slotLabel, slotTime]);

    // -------- compute "fill" for a day --------
    // returns map: slotKey -> array of lines
    // extras aggregation: caller merges those slotKeys
    const computeDayFill = React.useCallback(
        ymd => {
            const planMeds = patient?.plan?.meds || {};
            const out = {}; // slotKey -> lines[]

            for (const [medId, cfg] of Object.entries(planMeds)) {
                if (!cfg || typeof cfg !== 'object') continue;

                if (!isInDateRange(ymd, cfg.startDate, cfg.endDate)) continue;
                if (!isRepeatMatch(ymd, cfg.repeat, cfg.startDate)) continue;

                const times = cfg.times && typeof cfg.times === 'object' ? cfg.times : {};
                const dose = cfg.dose && typeof cfg.dose === 'object' ? cfg.dose : {};

                for (const s of Object.keys(slotDefs || {})) {
                    if (!includeSlotDefault(s)) continue;
                    if (!times[s]) continue;

                    let amount = null;
                    if (dose.mode === 'perSlot') amount = dose?.perSlot?.[s];
                    else amount = dose.fixed;

                    const n = Number(amount || 0);
                    if (!n) continue;

                    const unit = dose.unit || 'pcs';
                    const line = `${medNameById(medId)}: ${n} ${t(unit)}`;

                    if (!out[s]) out[s] = [];
                    out[s].push(line);
                }
            }

            // sort lines within a cell for stable output
            for (const k of Object.keys(out)) {
                out[k] = out[k].slice().sort((a, b) => a.localeCompare(b));
            }

            return out;
        },
        [patient, slotDefs, medNameById],
    );

    // organizer per week: array of weeks, each week is 7 day objects with fill map
    const organizer = React.useMemo(() => {
        const w = Math.min(4, Math.max(1, Number(weeks || 1)));
        const out = [];
        for (let wi = 0; wi < w; wi++) {
            const weekDays = [];
            for (let di = 0; di < 7; di++) {
                const day = days[wi * 7 + di];
                weekDays.push({ ...day, fill: computeDayFill(day.ymd) });
            }
            out.push(weekDays);
        }
        return out;
    }, [weeks, days, computeDayFill]);

    // -------- Printing --------
    const openPrint = React.useCallback(() => {
        const title = `${t('Pill organizer')} - ${patient?.name || ''}`;
        const html = document.getElementById('mp-pill-organizer-print')?.innerHTML || '';

        const w = window.open('about:blank', '_blank');

        if (!w) {
            alert('Popup blocked');
            return;
        }

        w.document.open();
        w.document.write(`
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 10mm;
    }
    body { font-family: Arial, sans-serif; margin: 16px; }
    h1 { font-size: 18px; margin: 0 0 10px 0; }
    .meta { color: #444; font-size: 12px; margin-bottom: 12px; }

    .weekTitle { font-weight: 700; margin: 14px 0 6px 0; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 2px solid #444; vertical-align: top; padding: 6px; }
    th { background: #f2f2f2; font-size: 12px; }

    .slotHead { width: 150px; background: #fafafa; font-weight: 700; font-size: 11px; }
    .cell { min-height: 46px; font-size: 11px; }
    .cell ul { margin: 0; padding-left: 16px; }
    .cell li { margin: 0 0 2px 0; }
    .muted { color: #666; }

    @media print {
      body { margin: 8mm; }
      .weekTitle { page-break-after: avoid; }
      table { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  ${html}
  <script>
    window.onload = () => { window.print(); };
  </script>
</body>
</html>
        `);
        w.document.close();
    }, [patient, t]);

    if (!patient) return null;

    // ---- UI styling for "pillbox look" (screen) ----
    // ---- UI styling for "pillbox look" (screen) ----
    const slotColPx = 120; // schmaler, anpassen nach Bedarf (z.B. 110..140)

    const sxBoxTable = {
        tableLayout: 'fixed',
        width: '100%',

        '& th, & td': {
            border: '2.5px solid',
            borderColor: 'color-mix(in srgb, currentColor 55%, transparent)',
        },
        '& th': {
            backgroundColor: 'rgba(0,0,0,0.05)',
        },
    };

    const sxSlotHead = {
        width: slotColPx,
        minWidth: slotColPx,
        maxWidth: slotColPx,
        backgroundColor: 'rgba(0,0,0,0.02)',
        fontWeight: 700,
        fontSize: 12,
        verticalAlign: 'middle',
        padding: '6px 8px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    };

    const sxDayHead = {
        width: `calc((100% - ${slotColPx}px) / 7)`,
        fontWeight: 700,
        fontSize: 12,
        padding: '6px 8px',
    };

    const sxCell = {
        verticalAlign: 'top',
        padding: '8px',
        width: `calc((100% - ${slotColPx}px) / 7)`,
    };

    const renderCellLines = payload => {
        if (!payload) {
            return (
                <Typography
                    variant="caption"
                    sx={classes.textSecondary}
                >
                    —
                </Typography>
            );
        }

        // ---- GROUPED (Extras row) ----
        if (payload.kind === 'groups') {
            const groups = payload.groups || [];
            if (!groups.length) {
                return (
                    <Typography
                        variant="caption"
                        sx={classes.textSecondary}
                    >
                        —
                    </Typography>
                );
            }

            return (
                <List
                    dense
                    disablePadding
                    sx={{
                        paddingLeft: 0,
                    }}
                >
                    {groups.map((g, gi) => (
                        <ListItem
                            key={gi}
                            disableGutters
                            sx={{
                                display: 'block',
                                padding: 0,
                                marginBottom: 0.5,
                            }}
                        >
                            {/* Slot title (Snack 1 / Snack 2) */}
                            <Typography
                                variant="caption"
                                sx={{ fontWeight: 700 }}
                            >
                                {g.title}:
                            </Typography>

                            {/* Medications under this slot */}
                            <List
                                dense
                                disablePadding
                                sx={{
                                    paddingLeft: 1.5, // Einrückung
                                }}
                            >
                                {(g.lines || []).map((x, i) => (
                                    <ListItem
                                        key={i}
                                        disableGutters
                                        sx={{ padding: 0 }}
                                    >
                                        <ListItemText
                                            primary={x}
                                            primaryTypographyProps={{
                                                variant: 'caption',
                                                sx: { lineHeight: 1.25 },
                                            }}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </ListItem>
                    ))}
                </List>
            );
        }

        // ---- FLAT (normal slots) ----
        const lines = payload.lines || [];
        if (!lines.length) {
            return (
                <Typography
                    variant="caption"
                    sx={classes.textSecondary}
                >
                    —
                </Typography>
            );
        }

        return (
            <List
                dense
                disablePadding
            >
                {lines.map((x, i) => (
                    <ListItem
                        key={i}
                        disableGutters
                        sx={{ padding: 0 }}
                    >
                        <ListItemText
                            primary={x}
                            primaryTypographyProps={{
                                variant: 'caption',
                                sx: { lineHeight: 1.25 },
                            }}
                        />
                    </ListItem>
                ))}
            </List>
        );
    };

    const getLinesForRow = (dayFill, row) => {
        if (row.kind === 'slot') {
            return { kind: 'flat', lines: dayFill?.[row.slotKey] || [] };
        }

        if (row.kind === 'extras') {
            // groups: [{ title: 'Snack 1', lines: [...] }, ...]
            const groups = [];

            for (const k of row.slotKeys || []) {
                const lines = dayFill?.[k] || [];
                if (!lines.length) continue;

                groups.push({
                    title: slotLabel(k),
                    lines, // already "Med: Dose Unit"
                });
            }

            return { kind: 'groups', groups };
        }

        return { kind: 'flat', lines: [] };
    };

    return (
        <>
            <Accordion defaultExpanded={false}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box>
                        <Typography
                            variant="h6"
                            sx={classes.textPrimary}
                        >
                            {t('Pill organizer')}
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={classes.textSecondary}
                        >
                            {t('Preview the pillbox fill for upcoming weeks (Mon–Sun).')}
                        </Typography>
                    </Box>
                </AccordionSummary>

                <AccordionDetails>
                    <Paper style={{ padding: 16 }}>
                        {/* Controls */}
                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={pillboxMode}
                                        onChange={e => setPillboxMode(Boolean(e.target.checked))}
                                    />
                                }
                                label={t('Pillbox mode')}
                            />

                            <TextField
                                select
                                size="small"
                                variant="outlined"
                                label={t('Weeks')}
                                value={weeks}
                                onChange={e => setWeeks(Number(e.target.value))}
                                sx={{ width: 140 }}
                            >
                                <MenuItem value={1}>1</MenuItem>
                                <MenuItem value={2}>2</MenuItem>
                                <MenuItem value={3}>3</MenuItem>
                                <MenuItem value={4}>4</MenuItem>
                            </TextField>

                            <Button
                                variant="contained"
                                startIcon={<PrintIcon />}
                                onClick={openPrint}
                            >
                                {t('Print')}
                            </Button>
                        </Box>

                        <Divider style={{ margin: '12px 0' }} />

                        {/* Screen preview: per week a separate pillbox-grid */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {organizer.map((weekDays, wi) => {
                                const weekLabel = `${t('Week')} ${wi + 1} • ${weekDays[0]?.ymd} – ${weekDays[6]?.ymd}`;
                                return (
                                    <Box key={wi}>
                                        <Typography
                                            variant="subtitle2"
                                            sx={classes.textPrimary}
                                            style={{ marginBottom: 6, fontWeight: 700 }}
                                        >
                                            {weekLabel}
                                        </Typography>

                                        <TableContainer>
                                            <Table
                                                size="small"
                                                sx={sxBoxTable}
                                            >
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell sx={sxSlotHead}>{t('Slot')}</TableCell>
                                                        {weekDays.map((day, idx) => (
                                                            <TableCell
                                                                key={idx}
                                                                sx={sxDayHead}
                                                            >
                                                                <div style={{ fontWeight: 700 }}>{dayNames[idx]}</div>
                                                                <div style={{ fontSize: 11, opacity: 0.8 }}>
                                                                    {day.ymd}
                                                                </div>
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                </TableHead>

                                                <TableBody>
                                                    {rowsConfig.map((row, ri) => (
                                                        <TableRow key={ri}>
                                                            <TableCell sx={sxSlotHead}>{row.title}</TableCell>

                                                            {weekDays.map(day => {
                                                                const payload = getLinesForRow(day.fill, row);
                                                                return (
                                                                    <TableCell
                                                                        key={day.ymd}
                                                                        sx={sxCell}
                                                                    >
                                                                        {renderCellLines(payload)}
                                                                    </TableCell>
                                                                );
                                                            })}
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Box>
                                );
                            })}
                        </Box>
                    </Paper>
                </AccordionDetails>
            </Accordion>
            {/* Print markup (hidden) */}
            <div style={{ display: 'none' }}>
                <div id="mp-pill-organizer-print">
                    <h1>
                        {t('Pill organizer')} – {patient?.name || ''}
                    </h1>
                    <div className="meta">
                        {t('Weeks')}: {weeks} • {t('Start')}: {toYmd(weekStart)} • {t('Pillbox mode')}:{' '}
                        {pillboxMode ? t('On') : t('Off')}
                    </div>

                    {organizer.map((weekDays, wi) => {
                        const weekLabel = `${t('Week')} ${wi + 1} • ${weekDays[0]?.ymd} – ${weekDays[6]?.ymd}`;
                        return (
                            <div key={wi}>
                                <div className="weekTitle">{weekLabel}</div>

                                <table>
                                    <thead>
                                        <tr>
                                            <th className="slotHead">{t('Slot')}</th>
                                            {weekDays.map((day, idx) => (
                                                <th key={idx}>
                                                    <div style={{ fontWeight: 700 }}>{dayNames[idx]}</div>
                                                    <div style={{ fontSize: 11, opacity: 0.8 }}>{day.ymd}</div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {rowsConfig.map((row, ri) => (
                                            <tr key={ri}>
                                                <td className="slotHead">{row.title}</td>

                                                {weekDays.map(day => {
                                                    const payload = getLinesForRow(day.fill, row);
                                                    return (
                                                        <td key={day.ymd}>
                                                            <div className="cell">{renderCellLines(payload)}</div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
