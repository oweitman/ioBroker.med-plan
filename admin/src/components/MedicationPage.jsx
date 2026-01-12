// src-admin/src/components/MedicationPage.jsx
import React from 'react';
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import IconButton from '@material-ui/core/IconButton';

import LocalPharmacyIcon from '@material-ui/icons/LocalPharmacy';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';

import { t } from './i18n';

/**
 * @param {{
 *   classes: Record<string, string>,
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
                className={classes.textPrimary}
            >
                {t('Medication')}
            </Typography>

            <Typography
                variant="body2"
                gutterBottom
                className={classes.textSecondary}
            >
                {t('Create new medications (name only for now).')}
            </Typography>

            <Grid
                container
                spacing={2}
                alignItems="flex-end"
            >
                <Grid
                    item
                    xs
                    md={6}
                >
                    <TextField
                        label={t('Medication name')}
                        value={newMedicationName}
                        onChange={e => setNewMedicationName(e.target.value)}
                        onKeyDown={onKeyDown}
                        variant="outlined"
                        size="small"
                        fullWidth
                    />
                </Grid>

                <Grid
                    item
                    xs="auto"
                >
                    <Button
                        className={classes.actionButton}
                        variant="contained"
                        startIcon={<AddIcon />}
                        color="primary"
                        onClick={add}
                        disabled={!newMedicationName.trim()}
                    >
                        {t('Add')}
                    </Button>
                </Grid>
            </Grid>

            <Box mt={3}>
                <Typography
                    variant="subtitle1"
                    gutterBottom
                    className={classes.textPrimary}
                >
                    {t('Existing medications')}
                </Typography>

                {medications.length === 0 ? (
                    <Typography
                        variant="body2"
                        className={classes.textSecondary}
                    >
                        {t('No medications yet.')}
                    </Typography>
                ) : (
                    <Paper
                        elevation={0}
                        style={{
                            padding: 8,
                        }}
                        className={classes.textPrimary}
                    >
                        <List dense>
                            {medications.map(m => (
                                <ListItem key={m.id}>
                                    <ListItemIcon>
                                        <LocalPharmacyIcon fontSize="small" />
                                    </ListItemIcon>

                                    <ListItemText
                                        primary={m.name}
                                        classes={{ primary: classes.listItemText }}
                                    />

                                    <ListItemSecondaryAction>
                                        <IconButton
                                            edge="end"
                                            aria-label={t('Delete medication')}
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
