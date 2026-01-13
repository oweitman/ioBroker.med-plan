// src-admin/src/components/MedicationPage.jsx
import React from 'react';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid2';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';

import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

import { I18n } from '@iobroker/adapter-react-v5';

/**
 * @param {{
 *   classes: any,
 *   medications: Array<{id: string, name: string}>,
 *   onAdd: (name: string) => void,
 *   onDelete: (medId: string) => void,
 * }} props
 */
export default function MedicationPage(props) {
    const { classes, medications, onAdd, onDelete } = props;
    const [newMedicationName, setNewMedicationName] = React.useState('');

    const add = React.useCallback(() => {
        const name = newMedicationName.trim();
        if (!name) return;
        onAdd(name);
        setNewMedicationName('');
    }, [newMedicationName, onAdd]);

    const onKeyDown = React.useCallback(
        e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (newMedicationName.trim()) add();
            }
        },
        [newMedicationName, add],
    );

    return (
        <Box>
            <Typography
                variant="h6"
                gutterBottom
                sx={classes.textPrimary}
            >
                {I18n.t('Medication')}
            </Typography>

            <Typography
                variant="body2"
                gutterBottom
                sx={classes.textSecondary}
            >
                {I18n.t('Create new medications (name only for now).')}
            </Typography>

            <Grid
                container
                spacing={2}
                alignItems="flex-end"
            >
                <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                        label={I18n.t('Medication name')}
                        value={newMedicationName}
                        onChange={e => setNewMedicationName(e.target.value)}
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
                        disabled={!newMedicationName.trim()}
                    >
                        {I18n.t('Add')}
                    </Button>
                </Grid>
            </Grid>

            <Box mt={3}>
                <Typography
                    variant="subtitle1"
                    gutterBottom
                    sx={classes.textPrimary}
                >
                    {I18n.t('Existing medications')}
                </Typography>

                {medications.length === 0 ? (
                    <Typography
                        variant="body2"
                        sx={classes.textSecondary}
                    >
                        {I18n.t('No medications yet.')}
                    </Typography>
                ) : (
                    <Paper
                        elevation={0}
                        style={{
                            padding: 8,
                        }}
                        sx={classes.textPrimary}
                    >
                        <List dense>
                            {medications.map(m => (
                                <ListItem key={m.id}>
                                    <ListItemIcon>
                                        <LocalPharmacyIcon fontSize="small" />
                                    </ListItemIcon>

                                    <ListItemText
                                        primary={m.name}
                                        sx={{ primary: classes.listItemText }}
                                    />

                                    <ListItemSecondaryAction>
                                        <IconButton
                                            edge="end"
                                            aria-label={I18n.t('Delete medication')}
                                            onClick={() => onDelete(m.id)}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                )}
            </Box>
        </Box>
    );
}
