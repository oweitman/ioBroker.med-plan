// src-admin/src/MedPlanDataBootstrap.jsx
import React from 'react';

/**
 * Kapselt Seeding-Daten und die INIT-Logik (Load aus DPs oder Seed).
 *
 * Props:
 * - seededRef: React ref boolean, um INIT nur einmal zu fahren
 * - patientsRef: Ref auf aktuelle Patienten (für Fallback/Guard)
 * - medications: aktueller medications-state (für catch-Guard)
 * - setPatients, setMedications: State-Setter aus MedPlan
 *
 * - loadMedicationsFromDp, loadPatientsIndexFromDp, loadPatientDataFromDp: Loader
 * - persistMedications, persistPatientsIndex, persistPatientData: Persister
 * - normalizePatient, makeDefaultPlan: Normalisierung / Defaults
 */
export default function MedPlanDataBootstrap(props) {
    const {
        seededRef,
        patientsRef,
        medications,
        setPatients,
        setMedications,

        loadMedicationsFromDp,
        loadPatientsIndexFromDp,
        loadPatientDataFromDp,

        persistMedications,
        persistPatientsIndex,
        persistPatientData,

        normalizePatient,
        makeDefaultPlan,
    } = props;

    React.useEffect(() => {
        if (seededRef.current) return;
        seededRef.current = true;

        const now = Date.now();
        const days = d => d * 24 * 60 * 60 * 1000;

        // ---------------------------
        // Seeding-Daten
        // ---------------------------
        const seedMedications = [
            { id: 'med_paracetamol', name: 'Paracetamol' },
            { id: 'med_ibuprofen', name: 'Ibuprofen' },
            { id: 'med_vitd3', name: 'Vitamin D3' },
            { id: 'med_metformin', name: 'Metformin' },
            { id: 'med_amoxicillin', name: 'Amoxicillin' },
            { id: 'med_ramipril', name: 'Ramipril' },
            { id: 'med_omeprazol', name: 'Omeprazol' },
        ];

        const defaultSlotDefs = {
            morning: { type: 'standard', label: 'Morning', time: '08:00', graceMin: 120 },
            noon: { type: 'standard', label: 'Noon', time: '12:30', graceMin: 120 },
            evening: { type: 'standard', label: 'Evening', time: '18:30', graceMin: 120 },
            night: { type: 'standard', label: 'Night', time: '22:30', graceMin: 120 },
            prn: { type: 'prn', label: 'As needed', time: '08:00', graceMin: 1440 },
            c1: { type: 'custom', label: 'Snack 1', time: '10:00', graceMin: 120 },
            c2: { type: 'custom', label: 'Snack 2', time: '14:00', graceMin: 120 },
        };

        const defaultReminderPolicy = {
            enabled: true,
            defaultPolicy: {
                strategy: 'hybrid',
                windowMinutes: 120,
                maxReminders: 5,
                minGapMinutes: 10,
                fixedEveryMinutes: 15,
                hybridOffsets: [0, 0.66, 0.83, 0.92, 0.96],
                bundle: true,
                severity: {
                    mode: 'byRemainingMinutes',
                    thresholds: [
                        { lte: 10, level: 'urgent' },
                        { lte: 30, level: 'warn' },
                        { lte: 60, level: 'notice' },
                        { lte: 999999, level: 'info' },
                    ],
                },
            },
        };

        const seedPatientsRaw = [
            {
                id: 'pat_donald',
                name: 'Donald Duck',
                plan: {
                    slotDefs: { ...defaultSlotDefs },
                    reminders: {
                        ...defaultReminderPolicy,
                        slotPolicy: {
                            prn: {
                                strategy: 'fixed',
                                windowMinutes: 1440,
                                fixedEveryMinutes: 240,
                                maxReminders: 3,
                                minGapMinutes: 60,
                                bundle: true,
                            },
                        },
                    },
                    meds: {
                        med_paracetamol: {
                            startDate: '2026-01-20',
                            endDate: '',
                            times: {
                                morning: true,
                                noon: true,
                                evening: true,
                                night: true,
                                prn: true,
                                c1: true,
                                c2: true,
                            },
                            repeat: { type: 'daily', every: 1 },
                            dose: {
                                mode: 'perSlot',
                                unit: 'pcs',
                                fixed: 1,
                                perSlot: { morning: 1, noon: 3, evening: 5, night: 1, prn: 1, c1: 2, c2: 4 },
                            },
                            packages: [
                                {
                                    id: 'pkg_para_1',
                                    createdTs: now - days(7),
                                    total: 20,
                                    current: 12,
                                    mark: 'Blister A',
                                },
                                { id: 'pkg_para_2', createdTs: now - days(1), total: 10, current: 9, mark: 'Reserve' },
                            ],
                            note: 'Zusätzliche Einnahme-Notiz (z.B. mit Essen einnehmen).',
                            reminderPolicyOverride: {
                                enabled: true,
                                policy: { strategy: 'decay', windowMinutes: 120, maxReminders: 4, minGapMinutes: 15 },
                            },
                        },
                    },
                },
            },
            {
                id: 'pat_max',
                name: 'Max Mustermann',
                plan: {
                    slotDefs: { ...defaultSlotDefs },
                    reminders: { ...defaultReminderPolicy },
                    meds: {
                        med_vitd3: {
                            startDate: '2026-01-01',
                            endDate: '',
                            times: {
                                morning: true,
                                noon: false,
                                evening: false,
                                night: false,
                                prn: false,
                                c1: false,
                                c2: false,
                            },
                            repeat: { type: 'everyXDays', every: 2 },
                            dose: {
                                mode: 'fixed',
                                unit: 'cap',
                                fixed: 1,
                                perSlot: { morning: 1, noon: 1, evening: 1, night: 1, prn: 1, c1: 1, c2: 1 },
                            },
                            packages: [
                                { id: 'pkg_vitd3_1', createdTs: now - days(30), total: 60, current: 41, mark: 'Dose' },
                            ],
                            note: 'Alle 2 Tage morgens.',
                        },
                        med_paracetamol: {
                            startDate: '2026-01-20',
                            endDate: '',
                            times: {
                                morning: true,
                                noon: false,
                                evening: true,
                                night: false,
                                prn: false,
                                c1: false,
                                c2: false,
                            },
                            repeat: { type: 'daily', every: 1 },
                            dose: {
                                mode: 'perSlot',
                                unit: 'tbl',
                                fixed: 1,
                                perSlot: { morning: 1, noon: 0, evening: 2, night: 0, prn: 0, c1: 0, c2: 0 },
                            },
                            packages: [
                                {
                                    id: 'pkg_para_max_1',
                                    createdTs: now - days(7),
                                    total: 20,
                                    current: 12,
                                    mark: 'Schachtel weiß',
                                },
                            ],
                            note: 'Nur morgens/abends.',
                        },
                    },
                },
            },
            {
                id: 'pat_erika',
                name: 'Erika Musterfrau',
                plan: {
                    slotDefs: { ...defaultSlotDefs },
                    reminders: {
                        ...defaultReminderPolicy,
                        defaultPolicy: {
                            ...defaultReminderPolicy.defaultPolicy,
                            strategy: 'fixed',
                            fixedEveryMinutes: 20,
                            maxReminders: 6,
                        },
                    },
                    meds: {
                        med_ibuprofen: {
                            startDate: '2026-01-10',
                            endDate: '2026-02-10',
                            times: {
                                morning: false,
                                noon: true,
                                evening: false,
                                night: false,
                                prn: false,
                                c1: false,
                                c2: false,
                            },
                            repeat: { type: 'weekly', every: 1 },
                            dose: {
                                mode: 'fixed',
                                unit: 'tbl',
                                fixed: 1,
                                perSlot: { morning: 1, noon: 1, evening: 1, night: 1, prn: 1, c1: 1, c2: 1 },
                            },
                            packages: [
                                {
                                    id: 'pkg_ibu_1',
                                    createdTs: now - days(3),
                                    total: 50,
                                    current: 45,
                                    mark: 'Schachtel rot',
                                },
                            ],
                            note: 'Wöchentlich mittags, nur bis 10.02.2026.',
                        },
                    },
                },
            },
            {
                id: 'pat_hans',
                name: 'Hans Beispiel',
                plan: {
                    slotDefs: { ...defaultSlotDefs },
                    reminders: { ...defaultReminderPolicy },
                    meds: {
                        med_amoxicillin: {
                            startDate: '2026-01-18',
                            endDate: '2026-01-25',
                            times: {
                                morning: true,
                                noon: true,
                                evening: true,
                                night: false,
                                prn: false,
                                c1: false,
                                c2: false,
                            },
                            repeat: { type: 'daily', every: 1 },
                            dose: {
                                mode: 'perSlot',
                                unit: 'cap',
                                fixed: 1,
                                perSlot: { morning: 1, noon: 1, evening: 1, night: 0, prn: 0, c1: 0, c2: 0 },
                            },
                            packages: [],
                            note: 'Antibiotikum-Kur (Testfall: keine Packages gepflegt).',
                            reminderPolicyOverride: {
                                enabled: true,
                                policy: { strategy: 'decay', windowMinutes: 90, maxReminders: 5, minGapMinutes: 10 },
                            },
                        },
                    },
                },
            },
            {
                id: 'pat_lisa',
                name: 'Lisa Beispiel',
                plan: {
                    slotDefs: {
                        ...defaultSlotDefs,
                        morning: { ...defaultSlotDefs.morning, time: '07:30' },
                        night: { ...defaultSlotDefs.night, time: '23:15', graceMin: 90 },
                    },
                    reminders: {
                        ...defaultReminderPolicy,
                        defaultPolicy: {
                            ...defaultReminderPolicy.defaultPolicy,
                            windowMinutes: 90,
                            maxReminders: 4,
                            minGapMinutes: 15,
                        },
                    },
                    meds: {
                        med_omeprazol: {
                            startDate: '2026-01-05',
                            endDate: '',
                            times: {
                                morning: false,
                                noon: false,
                                evening: false,
                                night: false,
                                prn: true,
                                c1: true,
                                c2: false,
                            },
                            repeat: { type: 'daily', every: 1 },
                            dose: {
                                mode: 'fixed',
                                unit: 'tbl',
                                fixed: 1,
                                perSlot: { morning: 1, noon: 1, evening: 1, night: 1, prn: 1, c1: 1, c2: 1 },
                            },
                            packages: [
                                { id: 'pkg_ome_1', createdTs: now - days(14), total: 14, current: 6, mark: 'PRN Pack' },
                            ],
                            note: 'PRN + Custom Slot (Snack 1) als UI-Test.',
                        },
                    },
                },
            },
            {
                id: 'pat_peter',
                name: 'Peter Langzeit',
                plan: {
                    slotDefs: { ...defaultSlotDefs },
                    reminders: {
                        ...defaultReminderPolicy,
                        defaultPolicy: {
                            ...defaultReminderPolicy.defaultPolicy,
                            strategy: 'fixed',
                            fixedEveryMinutes: 30,
                            maxReminders: 4,
                            minGapMinutes: 15,
                        },
                    },
                    meds: {
                        med_metformin: {
                            startDate: '2025-12-01',
                            endDate: '',
                            times: {
                                morning: true,
                                noon: true,
                                evening: false,
                                night: false,
                                prn: false,
                                c1: false,
                                c2: false,
                            },
                            repeat: { type: 'daily', every: 1 },
                            dose: {
                                mode: 'perSlot',
                                unit: 'tbl',
                                fixed: 1,
                                perSlot: { morning: 1, noon: 1, evening: 0, night: 0, prn: 0, c1: 0, c2: 0 },
                            },
                            packages: [
                                { id: 'pkg_met_1', createdTs: now - days(20), total: 120, current: 78, mark: 'Vorrat' },
                            ],
                            note: 'Metformin morgens + mittags.',
                        },
                        med_ramipril: {
                            startDate: '2025-11-15',
                            endDate: '',
                            times: {
                                morning: true,
                                noon: false,
                                evening: false,
                                night: false,
                                prn: false,
                                c1: false,
                                c2: false,
                            },
                            repeat: { type: 'everyXDays', every: 1 },
                            dose: {
                                mode: 'fixed',
                                unit: 'tbl',
                                fixed: 1,
                                perSlot: { morning: 1, noon: 1, evening: 1, night: 1, prn: 1, c1: 1, c2: 1 },
                            },
                            packages: [
                                {
                                    id: 'pkg_ram_1',
                                    createdTs: now - days(60),
                                    total: 100,
                                    current: 12,
                                    mark: 'Pack alt',
                                },
                                {
                                    id: 'pkg_ram_2',
                                    createdTs: now - days(5),
                                    total: 100,
                                    current: 96,
                                    mark: 'Pack neu',
                                },
                            ],
                            note: 'Zwei Packages zur Nachbestell-Logik.',
                        },
                    },
                },
            },
        ];

        const seedPatients = seedPatientsRaw.map(normalizePatient).filter(Boolean);

        // ---------------------------
        // INIT: Load -> else Seed
        // ---------------------------
        (async () => {
            try {
                const dpMeds = await loadMedicationsFromDp();
                const dpIndex = await loadPatientsIndexFromDp();

                const hasAnyDpData =
                    (Array.isArray(dpMeds) && dpMeds.length) || (Array.isArray(dpIndex) && dpIndex.length);

                if (hasAnyDpData) {
                    const loadedPatients = [];

                    if (Array.isArray(dpIndex)) {
                        for (const idx of dpIndex) {
                            const stateId = idx?.stateId;
                            const id = idx?.id;
                            const name = idx?.name;

                            if (stateId) {
                                const pObj = await loadPatientDataFromDp(stateId);
                                const normalized = normalizePatient(pObj);
                                if (normalized) loadedPatients.push(normalized);
                                continue;
                            }

                            // Fallback: nur Indexdaten -> Default-Plan
                            if (id) {
                                const basePlan = makeDefaultPlan();
                                basePlan.meds = {};
                                const minimal = normalizePatient({ id, name, plan: basePlan });
                                if (minimal) loadedPatients.push(minimal);
                            }
                        }
                    }

                    if (Array.isArray(dpMeds)) setMedications(dpMeds);

                    if (loadedPatients.length) {
                        setPatients(loadedPatients);
                    } else if (Array.isArray(dpIndex) && dpIndex.length) {
                        setPatients(
                            dpIndex
                                .map(i => {
                                    const basePlan = makeDefaultPlan();
                                    basePlan.meds = {};
                                    return normalizePatient({ id: i.id, name: i.name, plan: basePlan });
                                })
                                .filter(Boolean),
                        );
                    }

                    return;
                }

                // ---- No DP data -> seed everything ----
                setMedications(seedMedications);
                setPatients(seedPatients);

                await persistMedications(seedMedications);
                await persistPatientsIndex(seedPatients);

                for (const p of seedPatients) {
                    await persistPatientData(p);
                }
            } catch (e) {
                // Guard: wenn UI schon Daten hat, nicht "drüber-seeden"
                if (patientsRef.current.length || (Array.isArray(medications) && medications.length)) return;

                setMedications(seedMedications);
                setPatients(seedPatients);

                await persistMedications(seedMedications);
                await persistPatientsIndex(seedPatients);

                for (const p of seedPatients) {
                    await persistPatientData(p);
                }
            }
        })();
    }, [
        seededRef,
        patientsRef,
        medications,
        setPatients,
        setMedications,
        loadMedicationsFromDp,
        loadPatientsIndexFromDp,
        loadPatientDataFromDp,
        persistMedications,
        persistPatientsIndex,
        persistPatientData,
        normalizePatient,
        makeDefaultPlan,
    ]);

    return null;
}
