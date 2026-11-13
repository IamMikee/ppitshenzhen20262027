import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';
import { google } from 'googleapis';
import { initializeApp } from 'firebase-admin/app';

initializeApp();
const db = getFirestore();

// Bump to force every form's sheet to be rewritten on the next run
const LAYOUT_VERSION = 2;

// Question types that never get an answer (and so never get a column)
const NON_ANSWERABLE = ['info', 'image', 'page'];

const getColumnQuestions = (questions = []) =>
    questions.filter(q => !NON_ANSWERABLE.includes(q.type));

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
                    questions: getColumnQuestions(formData.questions),
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

        const columnLetter = (n) => {
            let letters = '';
            while (n > 0) {
                const m = (n - 1) % 26;
                letters = String.fromCharCode(65 + m) + letters;
                n = Math.floor((n - 1) / 26);
            }
            return letters;
        };

        const getSheetHeaderWidth = async (sheetId) => {
            try {
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId: sheetId,
                    range: 'Responses!1:1',
                });
                return response.data.values?.[0]?.length || 0;
            } catch (error) {
                return 0;
            }
        };

        // Rewrites the whole Responses tab so columns always match the current questions.
        // Only our own columns are cleared; anything to the right of them is left alone.
        const writeSheet = async (sheetId, values, previousWidth) => {
            try {
                const width = Math.max(values[0].length, previousWidth);

                await sheets.spreadsheets.values.clear({
                    spreadsheetId: sheetId,
                    range: `Responses!A:${columnLetter(width)}`,
                });

                await sheets.spreadsheets.values.update({
                    spreadsheetId: sheetId,
                    range: 'Responses!A1',
                    valueInputOption: 'RAW',
                    requestBody: {
                        values,
                    },
                });

            } catch (error) {
                console.error('❌ Failed to write data:', error);
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

        const stripHtml = (html) => String(html || '')
            .replace(/<br\s*\/?>/gi, ' ')
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .trim();

        const getHeaders = (questions) => {
            const baseHeaders = [
                'Response ID',
                'User ID',
                'User Email',
                'Submitted At'
            ];

            const questionHeaders = getColumnQuestions(questions)
                .map(q => stripHtml(q.label) || q.id);

            return [...baseHeaders, ...questionHeaders];
        };

        const formatAnswer = (answer, type) => {
            // Questions the respondent never reached (conditional pages) or skipped
            if (answer === undefined || answer === null) return '-';

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

            const answerRow = getColumnQuestions(questions)
                .map(q => formatAnswer(response.answers?.[q.id], q.type));

            return [...baseRow, ...answerRow];
        };

        const syncFormToSheet = async (formId, formData, responses, previousWidth) => {
            try {
                const formRef = db.collection('forms').doc(formId);
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

                const questions = formData.questions || [];
                const headers = getHeaders(questions);
                const rows = responses.map(response => formatResponseRow(response, questions));

                const width = previousWidth ?? await getSheetHeaderWidth(sheetId);
                await writeSheet(sheetId, [headers, ...rows], width);

                console.log(`✅ Wrote ${rows.length} responses (${headers.length} columns) to sheet ${sheetId}`);

                return headers.length;

            } catch (error) {
                console.error('❌ Failed to sync sheet:', error);
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
                const formUpdatedAt = formData.updatedAt || null;

                // Forms nobody has answered yet don't get a sheet
                if (totalCount === 0 && !formData.sheetId) {
                    continue;
                }

                // Rewrite when responses come in or go, or the questions were edited
                const changed =
                    totalCount !== (metadata.totalCount || 0) ||
                    formUpdatedAt !== (metadata.formUpdatedAt || null) ||
                    metadata.layoutVersion !== LAYOUT_VERSION;

                if (!changed) {
                    console.log(`ℹ️ No changes for form ${formId}`);
                    continue;
                }

                console.log(`📊 Syncing form ${formId} (${totalCount} responses)`);

                const snapshot = await db.collection('forms')
                    .doc(formId)
                    .collection('responses')
                    .orderBy('submittedAt', 'asc')
                    .get();

                const responses = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                const columnCount = await syncFormToSheet(formId, formData, responses, metadata.columnCount);

                await metaRef.set({
                    totalCount: totalCount,
                    formUpdatedAt: formUpdatedAt,
                    layoutVersion: LAYOUT_VERSION,
                    columnCount: columnCount,
                    lastSync: new Date().toISOString(),
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