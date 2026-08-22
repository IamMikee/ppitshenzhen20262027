import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';
import { google } from 'googleapis';
import { initializeApp } from 'firebase-admin/app';

initializeApp();
const db = getFirestore();

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzhxV4rykqYlrhYnmM-1jljwudwiBd4_a04Q03FhcMK0VdGT8R1qdE8mP0NYqK_CNnpCA/exec';

export const syncResponsesToSheets = onSchedule(
    {
        schedule: 'every 1 minutes',
        timeZone: 'Asia/Shanghai',
        retryCount: 3,
        timeoutSeconds: 120,
        memory: '256MiB',
        secrets: ['GOOGLE_SERVICE_ACCOUNT_KEY'],
    },
    async (event) => {
        console.log('🔄 Starting sync check...');

        // ============================================================
        // AUTHENTICATION - Service Account for updating sheets
        // ============================================================
        const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

        const auth = new google.auth.GoogleAuth({
            credentials: serviceAccount,
            scopes: [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/drive',
            ],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        const drive = google.drive({ version: 'v3', auth });

        // ============================================================
        // HELPER FUNCTIONS
        // ============================================================

        const callAppsScript = async (action, data, retries = 3) => {
            for (let i = 0; i < retries; i++) {
                try {
                    const response = await fetch(APPS_SCRIPT_URL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            action,
                            ...data
                        }),
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const result = await response.json();
                    return result;

                } catch (error) {
                    console.error(`❌ Apps Script call failed (attempt ${i + 1}/${retries}):`, error);
                    if (i === retries - 1) throw error;
                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                }
            }
        };

        const createNewSheet = async (formId, formData) => {
            try {
                const result = await callAppsScript('createSheet', {
                    formId: formId,
                    formTitle: formData.title || 'Form',
                    questions: formData.questions || [],
                    serviceAccountEmail: serviceAccount.client_email,
                });

                if (!result.success) {
                    throw new Error(result.error || 'Failed to create sheet');
                }

                const spreadsheetId = result.spreadsheetId;

                if (result.alreadyExists) {
                    console.log(`♻️ Using existing sheet: ${result.url}`);
                } else {
                    console.log(`✅ Created new sheet: ${result.url}`);
                    // Only format header if it's a new sheet
                    await formatHeaderRow(spreadsheetId);
                }

                return spreadsheetId;

            } catch (error) {
                console.error('❌ Failed to create sheet:', error);
                throw error;
            }
        };

        const checkIfSheetHasHeaders = async (sheetId) => {
            try {
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId: sheetId,
                    range: 'Responses!A1:Z1',
                });

                const rows = response.data.values;
                return rows && rows.length > 0;

            } catch (error) {
                return false;
            }
        };

        const appendToSheet = async (sheetId, headers, rows, hasHeaders) => {
            try {
                let values = [];

                if (!hasHeaders) {
                    values = [headers, ...rows];
                } else {
                    values = rows;
                }

                await sheets.spreadsheets.values.append({
                    spreadsheetId: sheetId,
                    range: 'Responses!A1',
                    valueInputOption: 'RAW',
                    requestBody: {
                        values: values,
                    },
                });

            } catch (error) {
                console.error('❌ Failed to append data:', error);
                throw error;
            }
        };

        const formatHeaderRow = async (spreadsheetId) => {
            try {
                const requests = [
                    {
                        repeatCell: {
                            range: {
                                sheetId: 0,
                                startRowIndex: 0,
                                endRowIndex: 1,
                            },
                            cell: {
                                userEnteredFormat: {
                                    backgroundColor: {
                                        red: 0.49,
                                        green: 0.05,
                                        blue: 0.05,
                                    },
                                    textFormat: {
                                        foregroundColor: {
                                            red: 1.0,
                                            green: 1.0,
                                            blue: 1.0,
                                        },
                                        bold: true,
                                        fontSize: 11,
                                    },
                                    horizontalAlignment: 'CENTER',
                                    wrapStrategy: 'WRAP',
                                },
                            },
                            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,wrapStrategy)',
                        },
                    },
                ];

                await sheets.spreadsheets.batchUpdate({
                    spreadsheetId,
                    requestBody: {
                        requests,
                    },
                });

                console.log(`✅ Header row formatted`);

            } catch (error) {
                console.error('❌ Failed to format header:', error);
            }
        };

        const getHeaders = (questions) => {
            const baseHeaders = [
                'Response ID',
                'User ID',
                'User Email',
                'Submitted At'
            ];

            const questionHeaders = questions
                .filter(q => q.type !== 'info' && q.type !== 'image')
                .map(q => q.label || q.id);

            return [...baseHeaders, ...questionHeaders];
        };

        const formatAnswer = (answer, type) => {
            if (answer === undefined || answer === null) return '';

            switch (type) {
                case 'checkbox':
                    return Array.isArray(answer) ? answer.join('; ') : String(answer);
                case 'file':
                    return typeof answer === 'object' ? answer.url || answer.name || '' : String(answer);
                case 'radio':
                case 'text':
                case 'textarea':
                default:
                    return String(answer);
            }
        };

        const formatResponseRow = (response, questions) => {
            let submittedAtStr = '';
            if (response.submittedAt) {
                // Use .toMillis() if available, otherwise try other methods
                if (typeof response.submittedAt === 'object' && response.submittedAt.toMillis) {
                    submittedAtStr = new Date(response.submittedAt.toMillis()).toLocaleString();
                } else if (typeof response.submittedAt === 'object' && response.submittedAt.seconds !== undefined) {
                    submittedAtStr = new Date(response.submittedAt.seconds * 1000).toLocaleString();
                } else {
                    submittedAtStr = new Date(response.submittedAt).toLocaleString();
                }
            }

            const baseRow = [
                response.id || '',
                response.submittedBy || '',
                response.userEmail || '',
                submittedAtStr
            ];

            if (!questions || questions.length === 0) {
                return baseRow;
            }

            const answerRow = questions
                .filter(q => q.type !== 'info' && q.type !== 'image')
                .map(q => {
                    const answer = response.answers?.[q.id];
                    return formatAnswer(answer, q.type);
                });

            return [...baseRow, ...answerRow];
        };

        const appendToGoogleSheet = async (formId, responses) => {
            try {
                const formRef = db.collection('forms').doc(formId);
                const formDoc = await formRef.get();

                if (!formDoc.exists) {
                    throw new Error(`Form ${formId} not found`);
                }

                const formData = formDoc.data();
                let sheetId = formData.sheetId;

                if (!sheetId) {
                    console.log(`📝 No sheet ID found for form ${formId}, creating new sheet...`);
                    sheetId = await createNewSheet(formId, formData);

                    await formRef.update({
                        sheetId: sheetId,
                        sheetCreatedAt: new Date().toISOString()
                    });

                    console.log(`✅ Created new sheet with ID: ${sheetId}`);
                }

                if (!responses || responses.length === 0) {
                    console.log('ℹ️ No responses to append');
                    return;
                }

                const headers = getHeaders(formData.questions || []);
                const rows = responses.map(response => formatResponseRow(response, formData.questions || []));

                const hasHeaders = await checkIfSheetHasHeaders(sheetId);

                await appendToSheet(sheetId, headers, rows, hasHeaders);

                console.log(`✅ Appended ${rows.length} responses to sheet ${sheetId}`);

                return { success: true, sheetId };

            } catch (error) {
                console.error('❌ Failed to append to sheet:', error);
                throw error;
            }
        };

        // ============================================================
        // MAIN SYNC LOGIC
        // ============================================================

        try {
            const formsSnapshot = await db.collection('forms').get();

            if (formsSnapshot.empty) {
                console.log('ℹ️ No forms found');
                return;
            }

            for (const formDoc of formsSnapshot.docs) {
                const formId = formDoc.id;
                const formData = formDoc.data();

                console.log(`📋 Checking form: ${formData.title || formId}`);

                const metaRef = db.collection('metadata').doc(`sheetSync_${formId}`);
                const metaDoc = await metaRef.get();
                const metadata = metaDoc.exists ? metaDoc.data() : { totalCount: 0 };

                const countSnap = await db.collection('forms')
                    .doc(formId)
                    .collection('responses')
                    .count()
                    .get();

                const totalCount = countSnap.data().count;
                const newCount = totalCount - (metadata.totalCount || 0);

                if (newCount === 0) {
                    console.log(`ℹ️ No new responses for form ${formId}`);
                    continue;
                }

                console.log(`📊 Found ${newCount} new responses for form ${formId}`);

                const snapshot = await db.collection('forms')
                    .doc(formId)
                    .collection('responses')
                    .orderBy('submittedAt', 'desc')
                    .limit(newCount)
                    .get();

                const responses = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                await appendToGoogleSheet(formId, responses);

                await metaRef.set({
                    totalCount: totalCount,
                    lastSync: new Date().toISOString(),
                    responsesSynced: newCount
                }, { merge: true });

                console.log(`✅ Synced ${responses.length} responses for form ${formId}`);
            }

            console.log('✅ Sync check completed');

        } catch (error) {
            console.error('❌ Sync failed:', error);
            throw error;
        }
    }
);