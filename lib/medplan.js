const { ioUtil } = require('./ioUtil');

class medplanclassnew {
    constructor(adapter) {
        this.adapter = adapter;
        this.ioUtil = new ioUtil(adapter);
    }

    init() {
        this.ioUtil.logdebug('mytime init');
    }
    async processMessages(msg) {
        this.ioUtil.logdebug(`processMessages ${JSON.stringify(msg)}`);
        if (!msg) {
            return;
        }
        const { command, message, callback } = msg;
        const respond = (err, result) => {
            if (callback) {
                if (err) {
                    this.adapter.sendTo(
                        msg.from,
                        command,
                        {
                            error: err ? String(err) : null,
                        },
                        callback,
                    );
                } else {
                    this.adapter.sendTo(msg.from, command, result ? result : null, callback);
                }
            }
        };
        try {
            switch (command) {
                case 'setMedicationList': {
                    // message: { id: 'med-plan.0.medication', value: [...] }
                    await this.ensureJsonState(message.id, 'Medication list');
                    this.ioUtil.setState(message.id, JSON.stringify(message.value ?? []), '', '');
                    respond(null, true);
                    break;
                }

                case 'setPatientsIndex': {
                    // message: { id: 'med-plan.0.patients', value: [...] }
                    await this.ensureJsonState(message.id, 'Patients index');
                    this.ioUtil.setState(message.id, JSON.stringify(message.value ?? []), '', '');
                    respond(null, true);
                    break;
                }

                case 'setPatientData': {
                    // message: { id: 'med-plan.0.patient-MaxMueller', displayName, key, value: {...} }
                    await this.ensureJsonState(message.id, `Patient ${message.displayName || message.key || ''}`);
                    this.ioUtil.setState(message.id, JSON.stringify(message.value ?? []), '', '');
                    respond(null, true);
                    break;
                }

                case 'deletePatientData': {
                    // message: { id: 'med-plan.0.patient-MaxMueller' }
                    // delObjectAsync deletes object and state
                    this.ioUtil.deleteObjectAsync(message.id, '', '');
                    respond(null, true);
                    break;
                }
                case 'getStateJson': {
                    const st = this.ioUtil.getState(message.id, false, false);
                    let parsed = null;
                    try {
                        // @ts-expect-error st.val
                        parsed = st && st.val != null ? JSON.parse(String(st.val)) : null;
                    } catch {
                        parsed = null;
                    }

                    respond(null, parsed);
                    break;
                }
                case 'setIntakeState': {
                    // message: { patientOid, date: "YYYY-MM-DD", medicationId, slot, state: 0|1|2 }

                    const patientOid = message?.patientOid;
                    const dateKey = message?.date;
                    const medicationId = message?.medicationId;
                    const slot = message?.slot;
                    const state = message?.state;

                    // --- validate patientOid ---
                    if (typeof patientOid !== 'string' || !patientOid.trim()) {
                        respond('patientOid missing', null);
                        break;
                    }

                    // Ensure this adapter instance is responsible
                    // this.adapter.namespace is "med-plan.0"
                    if (!patientOid.startsWith(`${this.adapter.namespace}.`)) {
                        respond(`patientOid not in namespace: ${this.adapter.namespace}`, null);
                        break;
                    }

                    // --- validate date ---
                    if (typeof dateKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
                        respond('date must be YYYY-MM-DD', null);
                        break;
                    }

                    // --- validate medicationId ---
                    if (typeof medicationId !== 'string' || !medicationId.trim()) {
                        respond('medicationId missing', null);
                        break;
                    }

                    // --- validate slot ---
                    const validSlots = new Set(['morning', 'noon', 'evening', 'night']);
                    if (typeof slot !== 'string' || !validSlots.has(slot)) {
                        respond('slot invalid (morning|noon|evening|night)', null);
                        break;
                    }

                    // --- validate state ---
                    const nState = typeof state === 'string' ? parseInt(state, 10) : state;
                    if (!(nState === 0 || nState === 1 || nState === 2)) {
                        respond('state invalid (0|1|2)', null);
                        break;
                    }

                    // Ensure patient state exists as JSON state
                    await this.ensureJsonState(patientOid, `Patient intake patch`);

                    // Read current patient JSON
                    const st = await this.ioUtil.getStateAsync(patientOid, false, false);
                    if (!st || st.val === null || st.val === undefined) {
                        respond(`patient state empty: ${patientOid}`, null);
                        break;
                    }

                    let patientObj;
                    try {
                        patientObj = JSON.parse(String(st.val));
                    } catch /* (e) */ {
                        respond(`patient JSON invalid: ${patientOid}`, null);
                        break;
                    }

                    if (!patientObj || typeof patientObj !== 'object') {
                        respond(`patient JSON not an object: ${patientOid}`, null);
                        break;
                    }

                    // --- patch plan.intake tree ---
                    if (!patientObj.plan || typeof patientObj.plan !== 'object') {
                        patientObj.plan = {};
                    }
                    if (
                        !patientObj.plan.intake ||
                        typeof patientObj.plan.intake !== 'object' ||
                        Array.isArray(patientObj.plan.intake)
                    ) {
                        patientObj.plan.intake = {};
                    }

                    const intake = patientObj.plan.intake;

                    if (!intake[dateKey] || typeof intake[dateKey] !== 'object' || Array.isArray(intake[dateKey])) {
                        intake[dateKey] = {};
                    }
                    if (
                        !intake[dateKey][medicationId] ||
                        typeof intake[dateKey][medicationId] !== 'object' ||
                        Array.isArray(intake[dateKey][medicationId])
                    ) {
                        intake[dateKey][medicationId] = {};
                    }

                    if (nState === 0) {
                        // neutral => remove entry
                        delete intake[dateKey][medicationId][slot];

                        // cleanup medication object if empty
                        if (Object.keys(intake[dateKey][medicationId]).length === 0) {
                            delete intake[dateKey][medicationId];
                        }
                        // cleanup day object if empty
                        if (Object.keys(intake[dateKey]).length === 0) {
                            delete intake[dateKey];
                        }
                    } else {
                        // taken/missed
                        intake[dateKey][medicationId][slot] = nState;
                    }

                    // Write back
                    this.ioUtil.setState(patientOid, JSON.stringify(patientObj), '', '');

                    respond(null, true);
                    break;
                }
                case 'getMedicationList': {
                    // message: { id: 'med-plan.0._medication' }
                    const id = message?.id;
                    if (typeof id !== 'string' || !id.trim()) {
                        respond('id missing', null);
                        break;
                    }

                    const st = await this.ioUtil.getStateAsync(id, false, false);
                    let parsed = null;

                    try {
                        parsed = st && st.val != null ? JSON.parse(String(st.val)) : null;
                    } catch {
                        parsed = null;
                    }

                    // Always return an array for lists
                    respond(null, { value: Array.isArray(parsed) ? parsed : [] });
                    break;
                }

                case 'getPatientsIndex': {
                    // message: { id: 'med-plan.0._patients' }
                    const id = message?.id;
                    if (typeof id !== 'string' || !id.trim()) {
                        respond('id missing', null);
                        break;
                    }

                    const st = await this.ioUtil.getStateAsync(id, false, false);
                    let parsed = null;

                    try {
                        parsed = st && st.val != null ? JSON.parse(String(st.val)) : null;
                    } catch {
                        parsed = null;
                    }

                    // Always return an array for lists
                    respond(null, { value: Array.isArray(parsed) ? parsed : [] });
                    break;
                }

                case 'getPatientData': {
                    // message: { id: 'med-plan.0.patient-MaxMueller' }
                    const id = message?.id;
                    if (typeof id !== 'string' || !id.trim()) {
                        respond('id missing', null);
                        break;
                    }

                    const st = await this.ioUtil.getStateAsync(id, false, false);
                    let parsed = null;

                    try {
                        parsed = st && st.val != null ? JSON.parse(String(st.val)) : null;
                    } catch {
                        parsed = null;
                    }

                    // Patient object or null
                    respond(null, { value: parsed && typeof parsed === 'object' ? parsed : null });
                    break;
                }
                default:
                    respond(`Unknown command: ${command}`, null);
                    break;
            }
        } catch (e) {
            respond(e, null);
        }
    }
    async ensureJsonState(id, name) {
        // id can be fully qualified or relative; we accept either.
        // If fully qualified includes adapter+instance, strip prefix for setObjectNotExistsAsync
        const prefix = `${this.adapter.name}.${this.adapter.instance}.`;
        const relId = id.startsWith(prefix) ? id.substring(prefix.length) : id;

        await this.ioUtil.createObjectAsync(
            {
                name: relId || name,
                type: 'string',
                role: 'json',
                read: true,
                write: true,
                def: '',
            },
            '',
            '',
        );
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
    closeConnections() {
        this.ioUtil.closeConnections();
    }
}

module.exports = medplanclassnew;
