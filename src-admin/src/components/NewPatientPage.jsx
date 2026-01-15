// src-admin/src/components/NewPatientPage.jsx
import React from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid2';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import AddIcon from '@mui/icons-material/Add';
import PersonIcon from '@mui/icons-material/Person';

import { t } from '../components/i18n';

/**
 * @param {{
 *   classes: any,
 *   patients: Array<{id: string, name: string}>,
 *   onAdd: (name: string) => void,
 * }} props
 */
export default function NewPatientPage(props) {
    const { classes, patients, onAdd } = props;
    const [newPatientName, setNewPatientName] = React.useState('');

    const add = React.useCallback(() => {
        const name = newPatientName.trim();
        if (!name) return;
        onAdd(name);
        setNewPatientName('');
    }, [newPatientName, onAdd]);

    const onKeyDown = React.useCallback(
        e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (newPatientName.trim()) add();
            }
        },
        [newPatientName, add],
    );

    return (
        <Box>
            <Typography
                variant="h6"
                gutterBottom
                sx={classes.textPrimary}
            >
                {t('New patient')}
            </Typography>

            <Typography
                variant="body2"
                gutterBottom
                sx={classes.textSecondary}
            >
                {t('Create a new patient (name only for now).')}
            </Typography>
            <Grid
                container
                spacing={2}
                alignItems="flex-start"
            >
                <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                        label={t('Patient name')}
                        value={newPatientName}
                        onChange={e => setNewPatientName(e.target.value)}
                        onKeyDown={onKeyDown}
                        variant="outlined"
                        size="small"
                        fullWidth
                    />
                </Grid>
                <Grid sx={{ flex: '0 0 auto' }}>
                    <Button
                        sx={classes.actionButton}
                        variant="contained"
                        startIcon={<AddIcon />}
                        color="primary"
                        onClick={add}
                        disabled={!newPatientName.trim()}
                    >
                        {t('Add')}
                    </Button>
                </Grid>
            </Grid>

            <Box mt={3}>
                <Typography
                    variant="subtitle1"
                    gutterBottom
                    sx={classes.textPrimary}
                >
                    {t('Existing patients')}
                </Typography>

                {patients.length === 0 ? (
                    <Typography
                        variant="body2"
                        sx={classes.textSecondary}
                    >
                        {t('No patients yet.')}
                    </Typography>
                ) : (
                    <List dense>
                        {patients.map(p => (
                            <ListItem key={p.id}>
                                <ListItemIcon>
                                    <PersonIcon fontSize="small" />
                                </ListItemIcon>
                                <ListItemText
                                    primary={p.name}
                                    secondary={p.id}
                                    classes={{ primary: classes.listItemText }}
                                />
                            </ListItem>
                        ))}
                    </List>
                )}
            </Box>
        </Box>
    );
}
