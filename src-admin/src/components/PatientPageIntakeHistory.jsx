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

import { t } from '../components/i18n';

export default function PatientPageIntakeHistory({ classes, patient, medications, slots }) {
    const medNameById = React.useCallback(id => medications.find(m => m.id === id)?.name || id, [medications]);

    const slotByKey = React.useMemo(() => {
        const m = {};
        slots.forEach(s => (m[s.key] = s));
        return m;
    }, [slots]);

    const intakeStateLabel = React.useCallback(state => {
        if (state === 2) return t('Missed');
        if (state === 1) return t('Taken');
        if (state === 0) return t('Planned');
        return `${t('State')} ${state}`;
    }, []);

    const buildRows = React.useCallback(() => {
        const intakeRoot = patient?.plan?.intake || {};
        const rows = [];

        for (const ymd of Object.keys(intakeRoot)) {
            const perDay = intakeRoot[ymd] || {};
            for (const medId of Object.keys(perDay)) {
                const perMed = perDay[medId] || {};
                for (const slotKey of Object.keys(perMed)) {
                    const ev = perMed[slotKey] || {};
                    rows.push({ ymd, medId, slotKey, state: ev.state, ts: ev.ts });
                }
            }
        }

        const slotOrder = { morning: 0, noon: 1, evening: 2, night: 3 };

        // Sort: 1) date desc, 2) slot order asc, 3) medId stable, 4) ts stable
        rows.sort((a, b) => {
            if (a.ymd !== b.ymd) return a.ymd < b.ymd ? 1 : -1;

            const ao = slotOrder[a.slotKey] ?? 999;
            const bo = slotOrder[b.slotKey] ?? 999;
            if (ao !== bo) return ao - bo;

            if (a.medId !== b.medId) return a.medId.localeCompare(b.medId);

            return Number(a.ts || 0) - Number(b.ts || 0);
        });

        return rows;
    }, [patient?.plan?.intake]);

    const rows = buildRows();

    return (
        <Paper style={{ padding: 16, marginTop: 24 }}>
            <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
            >
                <Typography
                    variant="h6"
                    sx={classes.textPrimary}
                >
                    {t('Intake history')}
                </Typography>
            </Box>

            <Typography
                variant="body2"
                sx={classes.textSecondary}
                style={{ marginTop: 4 }}
            >
                {t('Recorded intakes for this patient (latest first).')}
            </Typography>

            {rows.length === 0 ? (
                <Typography
                    variant="body2"
                    sx={classes.textSecondary}
                    style={{ marginTop: 12 }}
                >
                    {t('No intake records yet.')}
                </Typography>
            ) : (
                (() => {
                    const maxRows = 200;
                    const shown = rows.slice(0, maxRows);

                    return (
                        <TableContainer style={{ marginTop: 12 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>{t('Date')}</TableCell>
                                        <TableCell>{t('Time')}</TableCell>
                                        <TableCell>{t('Medication')}</TableCell>
                                        <TableCell>{t('Slot')}</TableCell>
                                        <TableCell>{t('State')}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {shown.map((r, idx) => {
                                        const slot = slotByKey[r.slotKey];
                                        const SlotIcon = slot?.Icon;

                                        const dt = r.ts ? new Date(r.ts) : null;
                                        const timeStr = dt
                                            ? dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                            : '—';

                                        return (
                                            <TableRow key={`${r.ymd}_${r.medId}_${r.slotKey}_${r.ts || idx}`}>
                                                <TableCell>{r.ymd}</TableCell>
                                                <TableCell>{timeStr}</TableCell>
                                                <TableCell>{medNameById(r.medId)}</TableCell>
                                                <TableCell>
                                                    <Box
                                                        display="flex"
                                                        alignItems="center"
                                                        gap={1}
                                                    >
                                                        {SlotIcon ? <SlotIcon fontSize="small" /> : null}
                                                        <span>{slot?.label || r.slotKey}</span>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        size="small"
                                                        label={intakeStateLabel(r.state)}
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>

                            {rows.length > maxRows ? (
                                <Typography
                                    variant="caption"
                                    sx={classes.textSecondary}
                                    style={{ display: 'block', marginTop: 8 }}
                                >
                                    {t('Showing')} {maxRows} {t('of')} {rows.length}.
                                </Typography>
                            ) : null}
                        </TableContainer>
                    );
                })()
            )}
        </Paper>
    );
}
