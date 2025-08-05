/**
 * Test script for Mailgun webhook endpoint
 * Loads sample data and posts it to the webhook in the expected format
 */

const fs = require("fs");
const path = require("path");

async function testWebhook() {
  try {
    // Load sample data
    const samplePath = path.join(__dirname, "sample-body-plain.json");
    const sampleData = JSON.parse(fs.readFileSync(samplePath, "utf8"));

    // Create form data for Mailgun webhook format
    const formData = new URLSearchParams();
    formData.append("body-plain", sampleData.bodyplain);
    formData.append(
      "subject",
      "Reservation confirmed - Roxana Edit Mejía Mejía arrives 4 Aug"
    );
    formData.append("from", "automated@airbnb.com");
    formData.append("to", "madelainebaklayan@gmail.com");
    formData.append("timestamp", Math.floor(Date.now() / 1000).toString());

    console.log("Testing webhook endpoint...");
    console.log("URL: http://localhost:54321/functions/v1/mailgun-webhook");

    // Send POST request
    const response = await fetch(
      "http://localhost:54321/functions/v1/mailgun-webhook",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization:
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
        },
        body: formData,
      }
    );

    const result = await response.text();

    console.log("Response Status:", response.status);
    console.log("Response Body:", result);

    if (response.ok) {
      console.log("✅ Webhook test successful!");
    } else {
      console.log("❌ Webhook test failed");
    }
  } catch (error) {
    console.error("Error testing webhook:", error);
  }
}

testWebhook();
