'use strict';

/*
 * Created with @iobroker/create-adapter v3.1.2
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');

// Load your modules here, e.g.:
// const fs = require('fs');

const medplanclassNew = require(`${__dirname}/lib/medplan.js`);
let medplanserver;
class MedPlan extends utils.Adapter {
    /**
     * @param {Partial<utils.AdapterOptions>} [options] - Adapter options
     */
    constructor(options) {
        super({
            ...options,
            name: 'med-plan',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        // this.on('objectChange', this.onObjectChange.bind(this));
        this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        this.log.debug('main onReady start');

        // Initialize your adapter here
        if (!medplanserver) {
            this.log.debug('main onReady open medplan');
            medplanserver = new medplanclassNew(this);
            medplanserver.init();
        }
        // in this template all states changes inside the adapters namespace are subscribed
        this.subscribeStates('*');
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     *
     * @param {() => void} callback - Callback function
     */
    onUnload(callback) {
        try {
            this.log.debug('main onUnload try');

            medplanserver.closeConnections();
            this.log.info('cleaned everything up...');
            callback();
        } catch {
            this.log.debug('main onUnload error');
            callback();
        }
    }

    /**
     * Is called if a subscribed state changes
     *
     * @param {string} id - State ID
     * @param {ioBroker.State | null | undefined} state - State object
     */
    onStateChange(id, state) {
        if (state) {
            // The state was changed
            this.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
            if (medplanserver) {
                //medplanserver.doStateChange(id, state);
            }
        } else {
            // The state was deleted
            this.log.debug(`state ${id} deleted`);
        }
    }

    /**
     * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
     * Using this method requires "common.messagebox" property to be set to true in io-package.json
     *
     * @param {ioBroker.Message} obj message object
     */
    async onMessage(obj) {
        this.log.debug(`onMessage ${obj}`);
        medplanserver.processMessages(obj);
    }
    async ensureJsonState(id, name) {
        // id can be fully qualified or relative; we accept either.
        // If fully qualified includes adapter+instance, strip prefix for setObjectNotExistsAsync
        const prefix = `${this.name}.${this.instance}.`;
        const relId = id.startsWith(prefix) ? id.substring(prefix.length) : id;

        await this.setObjectNotExistsAsync(relId, {
            type: 'state',
            common: {
                name: name || relId,
                type: 'string',
                role: 'json',
                read: true,
                write: true,
                def: '',
            },
            native: {},
        });
    }
    toPatientKey(name) {
        const s = String(name || '').trim();
        if (!s) {
            return '';
        }
        const replaced = s
            .replace(/ä/g, 'ae')
            .replace(/ö/g, 'oe')
            .replace(/ü/g, 'ue')
            .replace(/Ä/g, 'Ae')
            .replace(/Ö/g, 'Oe')
            .replace(/Ü/g, 'Ue')
            .replace(/ß/g, 'ss');

        const ascii = replaced.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const tokens = ascii
            .replace(/[^a-zA-Z0-9]+/g, ' ')
            .trim()
            .split(/\s+/)
            .filter(Boolean);
        return tokens.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join('');
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<utils.AdapterOptions>} [options] - Adapter options
     */
    module.exports = options => new MedPlan(options);
} else {
    // otherwise start the instance directly
    new MedPlan();
}
