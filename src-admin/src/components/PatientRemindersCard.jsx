// src-admin/src/components/PatientRemindersCard.jsx
import React from 'react';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';

import ReminderPolicyFields from './ReminderPolicyFields';
import { t } from '../components/i18n';

export default function PatientRemindersCard({ classes, reminders, onPatchReminders }) {
    const enabled = reminders?.enabled !== false;
    const defaultPolicy = reminders?.defaultPolicy || {};

    return (
        <Paper style={{ padding: 16, marginBottom: 16 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography
                    variant="h6"
                    sx={classes.textPrimary}
                >
                    {t('Reminders')}
                </Typography>

                <FormControlLabel
                    control={
                        <Switch
                            checked={!!enabled}
                            onChange={e => onPatchReminders?.({ enabled: e.target.checked })}
                        />
                    }
                    label={enabled ? t('Enabled') : t('Disabled')}
                />
            </Box>

            <Typography
                variant="body2"
                sx={classes.textSecondary}
                style={{ marginTop: 4 }}
            >
                {t('Creates reminder events as JSON datapoints. No direct notifications.')}
            </Typography>

            <Collapse in={!!enabled}>
                <Divider sx={{ my: 2 }} />

                <ReminderPolicyFields
                    classes={classes}
                    title={t('Default reminder policy')}
                    policy={defaultPolicy}
                    onPatch={p => onPatchReminders?.({ defaultPolicy: { ...defaultPolicy, ...p } })}
                    allowPartial={false}
                    hideSeverity={false}
                />
            </Collapse>
        </Paper>
    );
}
