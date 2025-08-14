/**
 * Reservation service for database operations
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { DatabaseReservation } from "./airbnb-parser.ts";
import { TaskService } from "./task-service.ts";
export class ReservationService {
  private supabase: SupabaseClient;
  private taskService: TaskService;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.taskService = new TaskService(supabase);
  }

  async createReservation(
    reservation: DatabaseReservation
  ): Promise<DatabaseReservation> {
    // Upsert to make webhook idempotent. If row exists, return existing row.
    const { data: inserted, error } = await this.supabase
      .from("reservations")
      .upsert([reservation], { onConflict: "id" })
      .select()
      .single<DatabaseReservation>();

    if (error) {
      throw error;
    }

    try {
      await this.taskService.createCleaningTaskForReservation(reservation);
    } catch (error) {
      console.error("Error creating cleaning task for reservation:", error);
    }

    return inserted;
  }

  async reservationExists(id: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("reservations")
      .select("*")
      .eq("id", id)
      .maybeSingle<DatabaseReservation>();

    if (error) {
      throw error;
    }

    return data !== null;
  }
}
