// src-admin/src/components/MedicationReminderOverride.jsx
import React from 'react';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Collapse from '@mui/material/Collapse';

import ReminderPolicyFields /* , { cleanPartialPatch } */ from './ReminderPolicyFields';
import { t } from '../components/i18n';

export default function MedicationReminderOverride({ classes, override, onChange }) {
    const enabled = !!override?.enabled;
    const policy = override?.policy || {};

    const patchOverride = patch => {
        const next = {
            ...(override || {}),
            ...patch,
        };
        onChange?.(next);
    };

    const patchPolicy = policyPatch => {
        // allow "unset" by sending undefined keys; upstream can delete those from override.policy
        const nextPolicy = {
            ...(policy || {}),
            ...policyPatch,
        };

        // ensure we don't keep undefined keys
        Object.keys(nextPolicy).forEach(k => {
            if (nextPolicy[k] === undefined) delete nextPolicy[k];
        });

        patchOverride({ policy: nextPolicy });
    };

    return (
        <Paper style={{ padding: 16, marginBottom: 16 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <FormControlLabel
                    control={
                        <Switch
                            checked={enabled}
                            onChange={e => patchOverride({ enabled: e.target.checked })}
                        />
                    }
                    label={enabled ? t('Override enabled') : t('Use default')}
                />
            </Box>

            <Collapse in={enabled}>
                <ReminderPolicyFields
                    classes={classes}
                    title={t('Override policy')}
                    policy={policy}
                    onPatch={p => patchPolicy(p)}
                    allowPartial={true}
                    hideSeverity={true} // bewusst: erst mal nur default severity auf Patient-Ebene
                />
            </Collapse>
        </Paper>
    );
}
