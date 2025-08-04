/**
 * Mailgun Webhook Handler for Airbnb Reservation Processing
 * Receives POST requests from Mailgun, extracts reservation data, and stores in database
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AirbnbReservationParser } from '../_shared/airbnb-parser.ts';
import { ReservationService } from '../_shared/reservation-service.ts';
import { envService } from '../_shared/env-service.ts';

interface MailgunWebhookPayload {
  'body-plain'?: string;
  'body-html'?: string;
  subject?: string;
  from?: string;
  to?: string;
  timestamp?: string;
  [key: string]: any;
}

serve(async (req: Request) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('Received Mailgun webhook request');
    
    // Parse the form data from Mailgun
    const formData = await req.formData();
    const webhookData: MailgunWebhookPayload = {};
    
    // Convert FormData to object
    for (const [key, value] of formData.entries()) {
      webhookData[key] = value.toString();
    }

    console.log('Webhook data keys:', Object.keys(webhookData));
    console.log('Subject:', webhookData.subject);
    console.log('From:', webhookData.from);

    // Extract email content - prefer plain text
    const emailContent = webhookData['body-plain'] || webhookData['body-html'] || '';
    
    if (!emailContent) {
      console.log('No email content found in webhook');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No email content found',
          received_keys: Object.keys(webhookData)
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing email content (length:', emailContent.length, ')');

    // Initialize parser and service
    const parser = new AirbnbReservationParser();
    const reservationService = new ReservationService();

    // Parse the reservation data
    const reservationData = await parser.parseReservation(emailContent);
    
    if (!reservationData) {
      console.log('Failed to parse reservation data or not an Airbnb confirmation');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Could not parse reservation data from email content',
          subject: webhookData.subject,
          from: webhookData.from
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully parsed reservation:', reservationData.id);

    // Check if reservation already exists
    const exists = await reservationService.reservationExists(reservationData.id);
    if (exists) {
      console.log('Reservation already exists:', reservationData.id);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Reservation already exists',
          reservation_id: reservationData.id
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Save to database
    const result = await reservationService.createReservation(reservationData);
    
    if (!result.success) {
      console.error('Failed to save reservation:', result.error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Failed to save reservation to database',
          error: result.error,
          reservation_id: reservationData.id
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully processed and saved reservation:', reservationData.id);

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Reservation processed successfully',
        reservation_id: reservationData.id,
        guest_name: reservationData.guest_name,
        check_in: reservationData.check_in,
        check_out: reservationData.check_out,
        property_name: reservationData.property_name
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Internal server error processing webhook',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});