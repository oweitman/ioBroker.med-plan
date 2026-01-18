import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';

import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

import { t } from '../components/i18n';

export default function PatientPageHeader({ classes, name, onRename }) {
    const [isEditing, setIsEditing] = React.useState(false);
    const [draft, setDraft] = React.useState('');

    React.useEffect(() => {
        setDraft(name || '');
        setIsEditing(false);
    }, [name]);

    const normalize = s =>
        String(s ?? '')
            .trim()
            .replace(/\s+/g, ' ');

    const begin = () => {
        setDraft(name || '');
        setIsEditing(true);
    };

    const cancel = () => {
        setDraft(name || '');
        setIsEditing(false);
    };

    const save = () => {
        const next = normalize(draft);
        const cur = normalize(name);

        setIsEditing(false);

        if (!next) {
            cancel();
            return;
        }

        if (next !== cur) {
            onRename(next);
        }
    };

    return (
        <>
            {!isEditing ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                        variant="h6"
                        sx={classes.textPrimary}
                        onClick={begin}
                        style={{ cursor: 'text' }}
                        title={t('Click to edit')}
                    >
                        {name}
                    </Typography>
                    <IconButton
                        size="small"
                        onClick={begin}
                        aria-label={t('Edit')}
                    >
                        <EditIcon fontSize="small" />
                    </IconButton>
                </Box>
            ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TextField
                        size="small"
                        autoFocus
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') save();
                            if (e.key === 'Escape') cancel();
                        }}
                        onBlur={save}
                        inputProps={{ maxLength: 80 }}
                    />
                    <IconButton
                        size="small"
                        onClick={save}
                        aria-label={t('Save')}
                    >
                        <CheckIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={cancel}
                        aria-label={t('Cancel')}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>
            )}

            <Divider style={{ margin: '12px 0 16px' }} />
        </>
    );
}
