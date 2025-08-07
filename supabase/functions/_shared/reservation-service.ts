/**
 * Reservation service for database operations
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { DatabaseReservation } from "./airbnb-parser.ts";
export class ReservationService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async createReservation(
    reservation: DatabaseReservation
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`Attempting to insert reservation: ${reservation.id}`);

      const { data, error } = await this.supabase
        .from("reservations")
        .insert([reservation])
        .select();

      if (error) {
        console.error("Database insert error:", error);
        return { success: false, error: error.message };
      }

      console.log(`Successfully inserted reservation: ${reservation.id}`);
      return { success: true };
    } catch (error) {
      console.error("Service error creating reservation:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async updateReservation(
    id: string,
    updates: Partial<DatabaseReservation>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from("reservations")
        .update({ ...updates, updated_at: new Date() })
        .eq("id", id)
        .select();

      if (error) {
        console.error("Database update error:", error);
        return { success: false, error: error.message };
      }

      console.log(`Successfully updated reservation: ${id}`);
      return { success: true };
    } catch (error) {
      console.error("Service error updating reservation:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getReservation(id: string): Promise<DatabaseReservation | null> {
    try {
      const { data, error } = await this.supabase
        .from("reservations")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Database select error:", error);
        return null;
      }

      return data as DatabaseReservation;
    } catch (error) {
      console.error("Service error getting reservation:", error);
      return null;
    }
  }

  async reservationExists(id: string): Promise<boolean> {
    try {
      const reservation = await this.getReservation(id);
      console.log("Reservation exists:", reservation);
      return reservation !== null;
    } catch (error) {
      console.error("Error checking if reservation exists:", error);
      return false;
    }
  }

  async upsertReservation(reservation: DatabaseReservation): Promise<boolean> {
    try {
      console.log(`Attempting to upsert reservation: ${reservation.id}`);

      const { data, error } = await this.supabase
        .from("reservations")
        .upsert([reservation], { onConflict: "id" })
        .select();

      if (error) {
        console.error("Database upsert error:", error);
        return false;
      }

      console.log(`Successfully upserted reservation: ${reservation.id}`);
      return true;
    } catch (error) {
      console.error("Service error upserting reservation:", error);
      return false;
    }
  }

  async getAllReservationsSortedByCheckout(): Promise<DatabaseReservation[]> {
    try {
      const { data, error } = await this.supabase
        .from("reservations")
        .select("*")
        .order("check_out", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Database select error:", error);
        return [];
      }

      return data as DatabaseReservation[];
    } catch (error) {
      console.error("Service error getting reservations:", error);
      return [];
    }
  }
}
