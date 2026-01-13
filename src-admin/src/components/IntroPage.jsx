// src-admin/src/components/IntroPage.jsx
import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { I18n } from '@iobroker/adapter-react-v5';

export default function IntroPage(props) {
    const { classes } = props;

    return (
        <Box>
            <Typography
                variant="h5"
                gutterBottom
                sx={classes.textPrimary}
            >
                {I18n.t('med-plan')}
            </Typography>

            <Typography
                variant="body1"
                gutterBottom
                sx={classes.textPrimary}
            >
                {I18n.t(
                    'This page lets you manage a simple medication list and create patients. Patient details and schedules will be added later.',
                )}
            </Typography>

            <Box mt={2}>
                <Typography
                    variant="subtitle1"
                    gutterBottom
                    sx={classes.textPrimary}
                >
                    {I18n.t('How to use')}
                </Typography>

                <Typography
                    variant="body2"
                    sx={classes.textSecondary}
                >
                    {I18n.t('1) Open “Medication” to add or remove medications.')}
                </Typography>
                <Typography
                    variant="body2"
                    sx={classes.textSecondary}
                >
                    {I18n.t('2) Open “New patient” to create a patient entry.')}
                </Typography>
                <Typography
                    variant="body2"
                    sx={classes.textSecondary}
                >
                    {I18n.t('3) Patients appear in the left menu. Click a patient to open details (coming later).')}
                </Typography>
                <Typography
                    variant="body2"
                    sx={classes.textSecondary}
                >
                    {I18n.t('Tip: You can press Enter in the name fields to add an item quickly.')}
                </Typography>
            </Box>
        </Box>
    );
}
