/**
 * Reservation service for database operations
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { envService } from './env-service.ts';
import { DatabaseReservation } from './airbnb-parser.ts';

export class ReservationService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = envService.get('SUPABASE_URL') || '';
    const supabaseServiceKey = envService.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  async createReservation(reservation: DatabaseReservation): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`Attempting to insert reservation: ${reservation.id}`);
      
      const { data, error } = await this.supabase
        .from('reservations')
        .insert([reservation])
        .select();

      if (error) {
        console.error('Database insert error:', error);
        return { success: false, error: error.message };
      }

      console.log(`Successfully inserted reservation: ${reservation.id}`);
      return { success: true };
    } catch (error) {
      console.error('Service error creating reservation:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async updateReservation(id: string, updates: Partial<DatabaseReservation>): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('reservations')
        .update({ ...updates, updated_at: new Date() })
        .eq('id', id)
        .select();

      if (error) {
        console.error('Database update error:', error);
        return { success: false, error: error.message };
      }

      console.log(`Successfully updated reservation: ${id}`);
      return { success: true };
    } catch (error) {
      console.error('Service error updating reservation:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getReservation(id: string): Promise<DatabaseReservation | null> {
    try {
      const { data, error } = await this.supabase
        .from('reservations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Database select error:', error);
        return null;
      }

      return data as DatabaseReservation;
    } catch (error) {
      console.error('Service error getting reservation:', error);
      return null;
    }
  }

  async reservationExists(id: string): Promise<boolean> {
    try {
      const reservation = await this.getReservation(id);
      return reservation !== null;
    } catch (error) {
      console.error('Error checking if reservation exists:', error);
      return false;
    }
  }
}