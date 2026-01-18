import React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid2';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Chip from '@mui/material/Chip';

import AddIcon from '@mui/icons-material/Add';
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';

import { t } from '../components/i18n';

export default function PatientPageAddMedication({
    classes,
    medications,
    selectedMedIds,
    addMedId,
    onChangeAddMedId,
    onAddMedicationToPlan,
    onRemoveMedicationFromPlan,
    medNameById,
}) {
    return (
        <Paper style={{ padding: 16, marginBottom: 16 }}>
            <Grid
                container
                spacing={2}
            >
                <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl
                        variant="outlined"
                        size="small"
                        fullWidth
                    >
                        <InputLabel>{t('Add medication')}</InputLabel>
                        <Select
                            variant="outlined"
                            label={t('Add medication')}
                            value={addMedId}
                            onChange={e => onChangeAddMedId(String(e.target.value))}
                        >
                            {medications
                                .filter(m => !selectedMedIds.includes(m.id))
                                .map(m => (
                                    <MenuItem
                                        key={m.id}
                                        value={m.id}
                                    >
                                        {m.name}
                                    </MenuItem>
                                ))}
                        </Select>
                    </FormControl>
                </Grid>

                <Grid sx={{ flex: '0 0 auto' }}>
                    <Button
                        sx={classes.actionButton}
                        color="primary"
                        variant="contained"
                        startIcon={<AddIcon />}
                        disabled={!addMedId}
                        onClick={onAddMedicationToPlan}
                    >
                        {t('Add')}
                    </Button>
                </Grid>

                {selectedMedIds.length > 0 && (
                    <Grid size={{ xs: 12 }}>
                        <Box
                            display="flex"
                            flexWrap="wrap"
                            gap={1}
                        >
                            {selectedMedIds.map(id => (
                                <Chip
                                    key={id}
                                    icon={<LocalPharmacyIcon />}
                                    label={medNameById(id)}
                                    onDelete={() => onRemoveMedicationFromPlan(id)}
                                />
                            ))}
                        </Box>
                    </Grid>
                )}
            </Grid>
        </Paper>
    );
}
