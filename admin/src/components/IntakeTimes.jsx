import React from 'react';
import Box from '@material-ui/core/Box';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';
import { withStyles } from '@material-ui/core/styles';

import WbSunnyIcon from '@material-ui/icons/WbSunny';
import Brightness5Icon from '@material-ui/icons/Brightness5';
import Brightness4Icon from '@material-ui/icons/Brightness4';
import NightsStayIcon from '@material-ui/icons/NightsStay';

import { t } from './i18n';

const styles = theme => ({
    btn: {
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 10,
        marginRight: 8,
        padding: 12,
        transition: 'all 0.15s ease',
        // keep icon visible always
        color: theme.palette.text.primary,

        '& svg': {
            color: 'inherit',
        },

        '&:hover': {
            backgroundColor: theme.palette.action.hover,
            // keep icon visible on hover
            color: theme.palette.text.primary,
        },
        '&:hover svg': {
            color: 'inherit',
        },
    },
    btnActive: {
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
        border: `1px solid ${theme.palette.primary.main}`,

        '& svg': {
            color: 'inherit',
        },

        '&:hover': {
            backgroundColor: theme.palette.primary.dark,
            color: theme.palette.primary.contrastText,
        },
        '&:hover svg': {
            color: 'inherit',
        },
    },
    label: {
        marginLeft: 6,
        fontSize: 13,
        fontWeight: 700,
        lineHeight: '16px',
    },
});

/**
 * Intake time selector using IconButtons (MUI v4 compatible).
 *
 * @param {{
 *   classes: Record<string, string>,
 *   times: { morning?: boolean, noon?: boolean, evening?: boolean, night?: boolean },
 *   onChange: (nextTimes: { morning: boolean, noon: boolean, evening: boolean, night: boolean }) => void,
 * }} props
 */
function IntakeTimes(props) {
    const { classes, times, onChange } = props;

    const safeTimes = {
        morning: !!times?.morning,
        noon: !!times?.noon,
        evening: !!times?.evening,
        night: !!times?.night,
    };

    const toggle = key => onChange({ ...safeTimes, [key]: !safeTimes[key] });

    const Btn = ({ keyName, label, Icon }) => {
        const active = safeTimes[keyName];
        return (
            <Tooltip title={label}>
                <span>
                    <IconButton
                        onClick={() => toggle(keyName)}
                        className={`${classes.btn} ${active ? classes.btnActive : ''}`}
                        aria-label={label}
                    >
                        <Icon fontSize="default" />
                        <Box
                            component="span"
                            className={classes.label}
                        >
                            {label}
                        </Box>
                    </IconButton>
                </span>
            </Tooltip>
        );
    };

    return (
        <Box
            display="flex"
            alignItems="center"
            flexWrap="wrap"
        >
            <Btn
                keyName="morning"
                label={t('Morning')}
                Icon={WbSunnyIcon}
            />
            <Btn
                keyName="noon"
                label={t('Noon')}
                Icon={Brightness5Icon}
            />
            <Btn
                keyName="evening"
                label={t('Evening')}
                Icon={Brightness4Icon}
            />
            <Btn
                keyName="night"
                label={t('Night')}
                Icon={NightsStayIcon}
            />
        </Box>
    );
}

export default withStyles(styles)(IntakeTimes);
