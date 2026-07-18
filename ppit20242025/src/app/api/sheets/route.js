import { google } from "googleapis";

export async function POST(req) {
    try {
        const { formId, responses, questions } = await req.json();

        const oAuth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            "https://developers.google.com/oauthplayground" // redirect URI
        );

        oAuth2Client.setCredentials({
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        });

        const sheets = google.sheets({
            version: "v4",
            auth: oAuth2Client,
        });
        const drive = google.drive({
            version: "v3",
            auth: oAuth2Client,
        });
        
        const fileRes = await drive.files.create({
            requestBody: {
                name: `Form Responses - ${new Date().toISOString()}`,
                mimeType: "application/vnd.google-apps.spreadsheet",
                parents: ["18uii9lh4qWWzmuVMEI-9yZ_f6KJLHjGW"],
            },
            fields: "id",
        });

        const spreadsheetId = fileRes.data.id;

        const headers = new Set();
        const header_id = new Set();

        questions.forEach((q) => {
            headers.add(q.label);
            header_id.add(q.id);
        });

        const headerArray = [...Array.from(headers)];
        const headerIdArray = [...Array.from(header_id)];

        const rows = [];

        responses.forEach((res) => {
            const ans = res.answers || {};
            const values = [];

            headerIdArray.forEach((id) => {
                let val = ans?.[id] ?? "—";

                if (Array.isArray(val)) {
                    val = val.join(", ");
                }

                values.push(val);
            });

            rows.push(values);
        });

        sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "A1",
        valueInputOption: "RAW",
        requestBody: {
            values: [headerArray, ...rows],
        },
        });

        drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: {
            role: "writer",
            type: "anyone",
        },
        });


        return Response.json({
        url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
        });

    } catch (err) {
        console.error(err);
        return Response.json({ error: "Failed" }, { status: 500 });
    }
}