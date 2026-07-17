const axios = require('axios');
const FormData = require('form-data');
const logger = require('./logger');

const whatsappBaseUrl = (phoneNumberId) => `https://graph.facebook.com/v17.0/${phoneNumberId}`;

const uploadWhatsAppMedia = async ({ phoneNumberId, accessToken, buffer, filename, mimeType }) => {
  const url = `${whatsappBaseUrl(phoneNumberId)}/media`;
  const form = new FormData();
  form.append('file', buffer, { filename, contentType: mimeType });
  form.append('type', mimeType);

  const response = await axios.post(url, form, {
    headers: {
      ...form.getHeaders(),
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data.id;
};

const sendWhatsAppMessage = async ({ toPhone, message, pdfBuffer, filename }) => {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    throw new Error('WhatsApp Cloud API credentials are not configured.');
  }

  const phone = toPhone.replace(/\D/g, '');
  if (!phone) {
    throw new Error('Invalid recipient phone number for WhatsApp message.');
  }

  // If PDF invoice buffer is provided, upload the document first.
  if (pdfBuffer && filename) {
    const mediaId = await uploadWhatsAppMedia({
      phoneNumberId,
      accessToken,
      buffer: pdfBuffer,
      filename,
      mimeType: 'application/pdf',
    });

    const messagePayload = {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'document',
      document: {
        id: mediaId,
        filename,
        caption: message,
      },
    };

    const url = `${whatsappBaseUrl(phoneNumberId)}/messages`;
    const response = await axios.post(url, messagePayload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    logger.log('WhatsApp document sent:', response.data);
    return response.data;
  }

  const body = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'text',
    text: { body: message },
  };

  const url = `${whatsappBaseUrl(phoneNumberId)}/messages`;
  const response = await axios.post(url, body, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  logger.log('WhatsApp text sent:', response.data);
  return response.data;
};

module.exports = { sendWhatsAppMessage };
