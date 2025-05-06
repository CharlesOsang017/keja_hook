import axios from "axios";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const generateMpesaPassword = (shortcode, passkey, timestamp) => {
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString(
    "base64"
  );
  return password;
};

export const getMpesaAccessToken = async () => {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString(
    "base64"
  );

  try {
    const response = await axios.get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error(
      "Error getting M-Pesa access token:",
      error.response ? error.response.data : error.message
    );
    throw error;
  }
};

export const lipaNaMpesaOnline = async (
  phone,
  amount,
  accountReference,
  transactionDesc,
  callbackUrl
) => {
  const accessToken = await getMpesaAccessToken();
  const timestamp = new Date()
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, -3);
  const password = generateMpesaPassword(
    process.env.MPESA_BUSINESS_SHORT_CODE,
    process.env.MPESA_PASS_KEY,
    timestamp
  );

  const requestData = {
    BusinessShortCode: process.env.MPESA_BUSINESS_SHORT_CODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: amount,
    PartyA: phone,
    PartyB: process.env.MPESA_BUSINESS_SHORT_CODE,
    PhoneNumber: phone,
    CallBackURL: process.env.MPESA_CALLBACK_URL,
    AccountReference: accountReference,
    TransactionDesc: transactionDesc,
  };

  try {
    const response = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      requestData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error initiating M-Pesa payment:",
      error.response ? error.response.data : error.message
    );
    throw error;
  }
};

export const verifyMpesaPayment = async (checkoutRequestID) => {
  const accessToken = await getMpesaAccessToken();
  const timestamp = new Date()
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, -3);
  const password = generateMpesaPassword(
    process.env.MPESA_BUSINESS_SHORT_CODE,
    process.env.MPESA_PASS_KEY,
    timestamp
  );

  try {
    const response = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query",
      {
        BusinessShortCode: process.env.MPESA_BUSINESS_SHORT_CODE,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestID,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error verifying M-Pesa payment:",
      error.response ? error.response.data : error.message
    );
    throw error;
  }
};
