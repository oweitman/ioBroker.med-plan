// src-admin/src/components/IntroPage.jsx
import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { t } from '../components/i18n';

export default function IntroPage(props) {
    const { classes } = props;

    return (
        <Box>
            <Typography
                variant="h5"
                gutterBottom
                sx={classes.textPrimary}
            >
                {t('Medication Plan Administration')}
            </Typography>

            <Typography
                variant="body1"
                gutterBottom
                sx={classes.textPrimary}
            >
                {t(
                    'This page lets you manage a simple medication list and create patients. Patient details and schedules will be added later.',
                )}
            </Typography>

            <Box mt={2}>
                <Typography
                    variant="subtitle1"
                    gutterBottom
                    sx={classes.textPrimary}
                >
                    {t('How to use')}
                </Typography>

                <Typography
                    variant="body2"
                    sx={classes.textSecondary}
                >
                    {t('1) Open “Medication” to add or remove medications.')}
                </Typography>
                <Typography
                    variant="body2"
                    sx={classes.textSecondary}
                >
                    {t('2) Open “New patient” to create a patient entry.')}
                </Typography>
                <Typography
                    variant="body2"
                    sx={classes.textSecondary}
                >
                    {t('3) Patients appear in the left menu. Click a patient to open details (coming later).')}
                </Typography>
                <Typography
                    variant="body2"
                    sx={classes.textSecondary}
                >
                    {t('Tip: You can press Enter in the name fields to add an item quickly.')}
                </Typography>
            </Box>
        </Box>
    );
}
