/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import { withStyles } from '@material-ui/core/styles';

import GenericApp from '@iobroker/adapter-react/GenericApp';
import MedPlan from './components/MedPlan';
/**
 * @type {(_theme) => import("@material-ui/styles").StyleRules}
 */
const styles = _theme => ({
    root: {},
});

class TabApp extends GenericApp {
    constructor(props) {
        const extendedProps = {
            ...props,
            bottomButtons: false,
            encryptedFields: [],
            translations: {
                en: require('./i18n/en.json'),
                de: require('./i18n/de.json'),
                ru: require('./i18n/ru.json'),
                pt: require('./i18n/pt.json'),
                nl: require('./i18n/nl.json'),
                fr: require('./i18n/fr.json'),
                it: require('./i18n/it.json'),
                es: require('./i18n/es.json'),
                pl: require('./i18n/pl.json'),
                //uk: require('./i18n/uk.json'),
                'zh-cn': require('./i18n/zh-cn.json'),
            },
        };
        super(props, extendedProps);
    }

    onConnectionReady() {
        // executed when connection is ready
    }

    render() {
        if (!this.state.loaded) {
            return super.render();
        }

        return (
            <div className="App">
                <MedPlan
                    native={this.state.native}
                    onChange={(attr, value) => this.updateNativeValue(attr, value)}
                    adapterinfo={{
                        name: this.adapterName,
                        instance: this.instance,
                    }}
                    socket={this.socket}
                />
                {this.renderError()}
                {this.renderToast()}
            </div>
        );
    }
}

export default withStyles(styles)(TabApp);
