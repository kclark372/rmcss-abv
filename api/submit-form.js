// api/submit-form.js
// Vercel serverless function to submit form data to FileMaker

const https = require('https');

// Helper function to make HTTPS requests
function makeRequest(method, hostname, path, auth, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: hostname,
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(auth).toString('base64')
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// Generate UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token,X-Requested-With,Accept,Accept-Version,Content-Length,Content-MD5,Content-Type,Date,X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { formType, data } = req.body;

    if (!formType) {
      return res.status(400).json({ error: 'formType is required' });
    }

    const fmServer = process.env.FM_SERVER_URL;
    const fmDatabase = process.env.FM_DATABASE;
    const fmUsername = process.env.FM_API_USERNAME;
    const fmPassword = process.env.FM_API_PASSWORD;

    if (!fmServer || !fmDatabase || !fmUsername || !fmPassword) {
      return res.status(500).json({ error: 'Missing FileMaker configuration' });
    }

    const hostname = fmServer.replace('https://', '').replace('http://', '');
    const auth = `${fmUsername}:${fmPassword}`;
    const uuid = generateUUID();

    if (formType === 'rsa') {
      const rsaPayload = {
        fieldData: {
          __UUID: uuid,
          ...data
        }
      };

      const response = await makeRequest(
        'POST',
        hostname,
        `/fmi/data/v1/databases/${fmDatabase}/layouts/RSA_abv/records`,
        auth,
        rsaPayload
      );

      if (response.status === 201 || response.status === 200) {
        return res.status(200).json({
          success: true,
          message: 'RSA assessment submitted successfully',
          uuid: uuid,
          recordId: response.data.response?.recordId
        });
      } else {
        return res.status(response.status).json({
          success: false,
          error: response.data.messages?.[0]?.message || 'Failed to create RSA record'
        });
      }
    }
    else if (formType === 'rmc') {
      const rmcPayload = {
        fieldData: {
          __UUID: uuid,
          _UUID_RSA: data._UUID_RSA,
          ...data
        }
      };

      const response = await makeRequest(
        'POST',
        hostname,
        `/fmi/data/v1/databases/${fmDatabase}/layouts/RMC_abv/records`,
        auth,
        rmcPayload
      );

      if (response.status === 201 || response.status === 200) {
        if (data.wantReferral === 'yes') {
          const treatmentPayload = {
            fieldData: {
              __UUID: generateUUID(),
              _UUID_RMC: uuid,
              ...Object.keys(data)
                .filter(key => key.startsWith('ref_') || key.startsWith('agency') || key.startsWith('intake_') || key.startsWith('transport'))
                .reduce((acc, key) => ({ ...acc, [key]: data[key] }), {})
            }
          };

          await makeRequest(
            'POST',
            hostname,
            `/fmi/data/v1/databases/${fmDatabase}/layouts/Treatment/records`,
            auth,
            treatmentPayload
          );
        }

        return res.status(200).json({
          success: true,
          message: 'RMC meeting recorded successfully',
          uuid: uuid,
          recordId: response.data.response?.recordId,
          treatmentCreated: data.wantReferral === 'yes'
        });
      } else {
        return res.status(response.status).json({
          success: false,
          error: response.data.messages?.[0]?.message || 'Failed to create RMC record'
        });
      }
    }
    else {
      return res.status(400).json({ error: 'Invalid formType' });
    }

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
