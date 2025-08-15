#!/usr/bin/env node

/**
 * Script to create reservations using the service role client
 * Usage: npm run create-reservation [count]
 * Example: npm run create-reservation 5
 */
import { config } from "dotenv";
config();
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { DatabaseReservation } from "../supabase/functions/_shared/airbnb-parser";

interface CreateTaskData {
  listing_id: number;
  reservation_id: string;
  task_type: string;
  title: string;
  description: string;
  scheduled_datetime: string;
}

// Sample data for randomization
const GUEST_NAMES = [
  "John Doe",
  "Jane Smith",
  "Mike Johnson",
  "Sarah Wilson",
  "David Brown",
  "Emily Davis",
  "Chris Miller",
  "Jessica Garcia",
  "Ryan Martinez",
  "Ashley Anderson",
  "Michael Taylor",
  "Amanda Thomas",
  "James Jackson",
  "Lauren White",
  "Daniel Harris",
];

const GUEST_LOCATIONS = [
  "New York, NY",
  "Los Angeles, CA",
  "Chicago, IL",
  "Houston, TX",
  "Phoenix, AZ",
  "Philadelphia, PA",
  "San Antonio, TX",
  "San Diego, CA",
  "Dallas, TX",
  "San Jose, CA",
  "Austin, TX",
  "Jacksonville, FL",
  "Fort Worth, TX",
  "Columbus, OH",
  "Charlotte, NC",
  "London, UK",
  "Paris, France",
  "Berlin, Germany",
  "Madrid, Spain",
  "Rome, Italy",
  "Tokyo, Japan",
  "Sydney, Australia",
  "Toronto, Canada",
  "Amsterdam, Netherlands",
];

const GUEST_MESSAGES = [
  "Looking forward to the stay!",
  "Can't wait to explore the area!",
  "Thank you for hosting us.",
  "Excited for our vacation!",
  "This will be our first time visiting.",
  "We're celebrating our anniversary.",
  "Business trip - appreciate the accommodation.",
  "Family reunion weekend.",
  "Honeymoon trip!",
  "Solo traveler looking for a peaceful stay.",
  null,
  null,
  null, // Some guests don't leave messages
];

const PROPERTY_NAMES = [
  "Cozy Downtown Apartment",
  "Beachfront Villa",
  "Mountain Cabin Retreat",
  "Modern City Loft",
  "Historic Townhouse",
  "Seaside Cottage",
  "Urban Studio",
  "Luxury Penthouse",
  "Garden View Suite",
  "Rustic Farmhouse",
  "Lake House",
  "Designer Apartment",
  "Charming Bungalow",
  "Skyline View Condo",
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomPrice(base: number, variance: number): number {
  const factor = 1 + (Math.random() - 0.5) * variance;
  return Math.round(base * factor * 100) / 100;
}

function getRandomDate(daysFromNow: number, rangeDays: number): Date {
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + daysFromNow);
  const randomOffset = Math.floor(Math.random() * rangeDays);
  baseDate.setDate(baseDate.getDate() + randomOffset);
  return baseDate;
}

function generateRandomReservation(index: number): DatabaseReservation {
  const checkIn = getRandomDate(1, 60); // 1-60 days from now
  const nights = getRandomNumber(1, 14);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + nights);

  const partySize = getRandomNumber(1, 6);
  const nightlyRate = getRandomPrice(80, 0.8); // $80 base with 80% variance
  const subtotal = nightlyRate * nights;
  const cleaningFee = getRandomPrice(25, 0.6);
  const serviceFee = subtotal * 0.08; // 8% service fee
  const total = subtotal + cleaningFee + serviceFee;

  return {
    id: `TEST-${Date.now()}-${index}`,
    property_id: getRandomNumber(100, 999).toString(),
    property_name: getRandomElement(PROPERTY_NAMES),
    status: "confirmed",
    check_in: checkIn,
    check_out: checkOut,
    nights,
    guest_name: getRandomElement(GUEST_NAMES),
    guest_location: getRandomElement(GUEST_LOCATIONS),
    guest_message: getRandomElement(GUEST_MESSAGES),
    party_size: partySize,
    pricing_nightly_rate: nightlyRate,
    pricing_subtotal: subtotal,
    pricing_cleaning_fee: cleaningFee,
    pricing_guest_service_fee: serviceFee,
    pricing_guest_total: total,
    pricing_host_service_fee: serviceFee * 0.3, // Host pays 30% of service fee
    pricing_host_payout: total - serviceFee * 0.7,
    thread_id: null,
    ai_notes: null,
    created_at: new Date(),
    updated_at: new Date(),
  };
}

async function createReservations(count: number = 1): Promise<void> {
  try {
    // Validate environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error(
        "Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
      );
    }

    console.log("🔧 Connecting to Supabase with service role...");

    // Create service role client
    const supabase: SupabaseClient = createClient(
      supabaseUrl,
      supabaseServiceRoleKey
    );

    console.log(`📝 Creating ${count} reservation${count > 1 ? "s" : ""}...`);

    const createdReservations: DatabaseReservation[] = [];
    const createdTasks: number[] = [];

    for (let i = 0; i < count; i++) {
      // Generate random reservation data
      const reservationData = generateRandomReservation(i);

      // Add small delay to ensure unique timestamps
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      console.log(`\n📋 [${i + 1}/${count}] Creating reservation:`, {
        id: reservationData.id,
        listing_id: reservationData.listing_id,
        guest_name: reservationData.guest_name,
        check_in: reservationData.check_in?.toLocaleDateString(),
        check_out: reservationData.check_out?.toLocaleDateString(),
        nights: reservationData.nights,
        total: `$${reservationData.pricing_guest_total?.toFixed(2)}`,
      });

      // Create the reservation directly using Supabase client
      const { data: createdReservation, error: insertError } = await supabase
        .from("reservations")
        .upsert([reservationData], { onConflict: "id" })
        .select()
        .single<DatabaseReservation>();

      if (insertError) {
        console.error(
          `❌ Failed to create reservation ${i + 1}:`,
          insertError.message
        );
        continue;
      }

      createdReservations.push(createdReservation);
      console.log(`✅ Reservation ${i + 1} created successfully!`);

      // Create cleaning task
      if (reservationData.check_out && reservationData.listing_id) {
        const checkoutDate = new Date(reservationData.check_out);
        const scheduledTime = new Date(checkoutDate);
        scheduledTime.setHours(10, 0, 0, 0); // 10 AM on checkout day

        const cleaningTaskData: CreateTaskData = {
          listing_id: parseInt(reservationData.listing_id, 10),
          reservation_id: reservationData.id,
          task_type: "cleaning",
          title: `Cleaning - ${reservationData.listing_id || "Property"}`,
          description: `Post-checkout cleaning for reservation ${
            reservationData.id
          }. Guest: ${reservationData.guest_name}. Party size: ${
            reservationData.party_size || "Unknown"
          }`,
          scheduled_datetime: scheduledTime.toISOString(),
        };

        const { error: taskError } = await supabase
          .from("tasks")
          .insert([cleaningTaskData])
          .select()
          .single();

        if (taskError) {
          console.warn(
            `⚠️ Warning: Could not create cleaning task for reservation ${
              i + 1
            }:`,
            taskError.message
          );
        } else {
          createdTasks.push(i + 1);
          console.log(`🧹 Cleaning task ${i + 1} created successfully!`);
        }
      }
    }

    // Summary
    console.log("\n🎉 Process completed!");
    console.log(`📊 Summary:`);
    console.log(
      `   ✅ Reservations created: ${createdReservations.length}/${count}`
    );
    console.log(
      `   🧹 Cleaning tasks created: ${createdTasks.length}/${count}`
    );

    if (createdReservations.length > 0) {
      const totalValue = createdReservations.reduce(
        (sum, res) => sum + (res.pricing_guest_total || 0),
        0
      );
      console.log(`   💰 Total booking value: $${totalValue.toFixed(2)}`);
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Error creating reservation:", errorMessage);
    console.error(
      "💡 Make sure you have the required environment variables set:"
    );
    console.error("   - SUPABASE_URL");
    console.error("   - SUPABASE_SERVICE_ROLE_KEY");
    console.error("💡 You can find these in your Supabase project settings.");
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const countArg = args[0];

  let count = 1; // Default to 1 if no parameter provided

  if (countArg) {
    const parsedCount = parseInt(countArg, 10);
    if (isNaN(parsedCount) || parsedCount < 1) {
      console.error(
        "❌ Invalid count parameter. Please provide a positive number."
      );
      console.error("Usage: npm run create-reservation [count]");
      console.error("Example: npm run create-reservation 5");
      process.exit(1);
    }
    count = parsedCount;
  }

  console.log(
    `🚀 Starting reservation creation process (count: ${count})...\n`
  );
  createReservations(count);
}

export { createReservations };
