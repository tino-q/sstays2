/**
 * Test cleaning task creation when reservations are created
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  IntegrationTestHelper,
} from "./test-utils";
import { ReservationService } from "../../functions/_shared/reservation-service";
import { DatabaseReservation } from "../../functions/_shared/airbnb-parser";

describe("Cleaning Task Creation Tests", () => {
  let testHelper: IntegrationTestHelper;
  let reservationService: ReservationService;
  let serviceRoleClient: SupabaseClient;

  beforeAll(async () => {
    testHelper = new IntegrationTestHelper();
    serviceRoleClient = testHelper.serviceRoleClient;
    reservationService = new ReservationService(testHelper.serviceRoleClient);
  });

  beforeEach(() => testHelper.prepareDatabase());

  test("should automatically create cleaning task when reservation is created", async () => {
    const timestamp = Date.now();
    const testReservation: DatabaseReservation = {
      id: `TEST_RESERVATION_001_${timestamp}`,
      property_id: "123",
      property_name: "Test Property",
      status: "confirmed",
      check_in: new Date("2025-08-20"),
      check_out: new Date("2025-08-22"),
      nights: 2,
      guest_name: "Test Guest",
      guest_location: "Test Location",
      party_size: 2,
      pricing_guest_total: 200,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Create reservation
    const reservation = await reservationService.createReservation(
      testReservation
    );
    expect(reservation.id).toBeTruthy();

    // Check that cleaning task was created
    const { data: tasks } = await serviceRoleClient
      .from("tasks")
      .select("*")
      .eq("reservation_id", testReservation.id);
    expect(tasks?.length).toBe(1);

    const cleaningTask = tasks![0];
    expect(cleaningTask.task_type).toBe("cleaning");
    expect(cleaningTask.title).toBe("Cleaning - Test Property");
    expect(cleaningTask.reservation_id).toBe(testReservation.id);
    expect(cleaningTask.listing_id).toBe(123);
    expect(cleaningTask.status).toBe("unassigned");

    // Check scheduled time is on checkout day at 10 AM
    const scheduledDate = new Date(cleaningTask.scheduled_datetime);
    const checkoutDate = new Date(testReservation.check_out!);
    expect(scheduledDate.getFullYear()).toBe(checkoutDate.getFullYear());
    expect(scheduledDate.getMonth()).toBe(checkoutDate.getMonth());
    expect(scheduledDate.getDate()).toBe(checkoutDate.getDate());
    expect(scheduledDate.getHours()).toBe(10); // 10 AM
    expect(scheduledDate.getMinutes()).toBe(0);
  });

  test("should create cleaning task with proper description", async () => {
    const timestamp = Date.now();
    const testReservation: DatabaseReservation = {
      id: `TEST_RESERVATION_002_${timestamp}`,
      property_id: "456",
      property_name: "Beach House",
      status: "confirmed",
      check_in: new Date("2025-08-25"),
      check_out: new Date("2025-08-27"),
      nights: 2,
      guest_name: "John Smith",
      guest_location: "New York",
      party_size: 4,
      pricing_guest_total: 400,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await reservationService.createReservation(testReservation);

    const { data: tasks } = await serviceRoleClient
      .from("tasks")
      .select("*")
      .eq("reservation_id", testReservation.id);
    const cleaningTask = tasks![0];

    expect(cleaningTask.description).toContain("Post-checkout cleaning");
    expect(cleaningTask.description).toContain(testReservation.id);
    expect(cleaningTask.description).toContain("John Smith");
    expect(cleaningTask.description).toContain("Party size: 4");
  });

  test("should handle missing property_id gracefully", async () => {
    const timestamp = Date.now();
    const testReservation: DatabaseReservation = {
      id: `TEST_RESERVATION_003_${timestamp}`,
      property_id: null,
      property_name: "Test Property",
      status: "confirmed",
      check_in: new Date("2025-08-20"),
      check_out: new Date("2025-08-22"),
      nights: 2,
      guest_name: "Test Guest",
      pricing_guest_total: 200,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Create reservation should still succeed even if cleaning task creation fails
    const reservation = await reservationService.createReservation(
      testReservation
    );
    expect(reservation.id).toBeTruthy();

    // Verify reservation was created
    expect(reservation.id).toBe(testReservation.id);

    // No cleaning task should be created due to missing property_id
    const { data: tasks } = await serviceRoleClient
      .from("tasks")
      .select("*")
      .eq("reservation_id", testReservation.id);
    expect(tasks?.length).toBe(0);
  });

  test("should handle missing check_out date gracefully", async () => {
    const timestamp = Date.now();
    const testReservation: DatabaseReservation = {
      id: `TEST_RESERVATION_004_${timestamp}`,
      property_id: "789",
      property_name: "Test Property",
      status: "confirmed",
      check_in: new Date("2025-08-20"),
      check_out: null,
      nights: 2,
      guest_name: "Test Guest",
      pricing_guest_total: 200,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Create reservation should still succeed even if cleaning task creation fails
    const reservation = await reservationService.createReservation(
      testReservation
    );

    expect(reservation.id).toBeTruthy();

    // No cleaning task should be created due to missing check_out date
    const { data: tasks } = await serviceRoleClient
      .from("tasks")
      .select("*")
      .eq("reservation_id", testReservation.id);

    expect(tasks?.length).toBe(0);
  });

  test("should create cleaning task with fallback values for optional fields", async () => {
    const timestamp = Date.now();
    const testReservation: DatabaseReservation = {
      id: `TEST_RESERVATION_005_${timestamp}`,
      property_id: "999",
      property_name: null,
      status: "confirmed",
      check_in: new Date("2025-08-20"),
      check_out: new Date("2025-08-22"),
      nights: 2,
      guest_name: "Anonymous Guest",
      party_size: null,
      pricing_guest_total: 150,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await reservationService.createReservation(testReservation);

    const { data: tasks } = await serviceRoleClient
      .from("tasks")
      .select("*")
      .eq("reservation_id", testReservation.id);
    expect(tasks?.length).toBe(1);

    const cleaningTask = tasks![0];
    expect(cleaningTask.title).toBe("Cleaning - Property"); // Fallback when property_name is null
    expect(cleaningTask.description).toContain("Party size: Unknown"); // Fallback when party_size is null
  });

  test("should allow manual cleaning task creation without reservation", async () => {
    const manualTask = {
      listing_id: 555,
      task_type: "cleaning",
      title: "Manual Cleaning Task",
      description: "Manually created cleaning task",
      scheduled_datetime: new Date("2025-08-30T15:00:00Z").toISOString(),
    };

    const { data, error } = await serviceRoleClient
      .from("tasks")
      .insert([manualTask])
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data?.title).toBe("Manual Cleaning Task");
    expect(data?.task_type).toBe("cleaning");
    expect(data?.reservation_id).toBeNull();
  });
});
