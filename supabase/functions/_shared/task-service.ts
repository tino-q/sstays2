/**
 * Task service for business logic operations
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { CreateTaskData } from "../tasks/types.ts";
import { DatabaseReservation } from "./airbnb-parser.ts";

export class TaskService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async createCleaningTaskForReservation(
    reservation: DatabaseReservation
  ): Promise<void> {
    // Validate required fields
    if (!reservation.check_out) {
      throw new Error(
        "Reservation must have a check-out date to create cleaning task"
      );
    }

    if (!reservation.property_id) {
      throw new Error(
        "Reservation must have a property_id to create cleaning task"
      );
    }

    // Calculate cleaning schedule: checkout day at 10 AM Alicante time
    const checkoutDate = new Date(reservation.check_out);
    // Schedule cleaning for 10 AM on checkout day (Alicante timezone)
    const scheduledTime = new Date(checkoutDate);
    scheduledTime.setHours(10, 0, 0, 0); // 10 AM on checkout day

    const cleaningTaskData: CreateTaskData = {
      listing_id: parseInt(reservation.property_id, 10),
      reservation_id: reservation.id,
      task_type: "cleaning",
      title: `Cleaning - ${reservation.property_name || "Property"}`,
      description: `Post-checkout cleaning for reservation ${
        reservation.id
      }. Guest: ${reservation.guest_name}. Party size: ${
        reservation.party_size || "Unknown"
      }`,
      scheduled_datetime: scheduledTime.toISOString(),
    };

    const { error } = await this.supabase
      .from("tasks")
      .insert([cleaningTaskData])
      .select()
      .single();

    if (error) {
      throw error;
    }
  }
}
