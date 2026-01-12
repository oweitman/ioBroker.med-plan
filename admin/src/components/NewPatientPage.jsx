// src-admin/src/components/NewPatientPage.jsx
import React from 'react';
import Box from '@material-ui/core/Box';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import AddIcon from '@material-ui/icons/Add';
import PersonIcon from '@material-ui/icons/Person';

import { t } from './i18n';

/**
 * @param {{
 *   classes: Record<string, string>,
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
                className={classes.textPrimary}
            >
                {t('New patient')}
            </Typography>

            <Typography
                variant="body2"
                gutterBottom
                className={classes.textSecondary}
            >
                {t('Create a new patient (name only for now).')}
            </Typography>
            <Grid
                container
                spacing={2}
                alignItems="flex-start"
            >
                <Grid
                    item
                    xs
                    md={6}
                >
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
                    className={classes.textPrimary}
                >
                    {t('Existing patients')}
                </Typography>

                {patients.length === 0 ? (
                    <Typography
                        variant="body2"
                        className={classes.textSecondary}
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
