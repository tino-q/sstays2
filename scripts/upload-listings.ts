#!/usr/bin/env ts-node

/**
 * Script to upload Airbnb listings data to the database
 * Uses service role client to bypass RLS and JSONbig for handling large numbers
 * Supports both local and remote environments via command line parameter
 *
 * Usage: npm run upload-listings [local|remote]
 * Default: local
 */

import { config } from "dotenv";
config(); // Load environment variables from .env file

import { createClient } from "@supabase/supabase-js";
import JSONbig from "json-bigint";
import * as fs from "fs";
import * as path from "path";

// Configure JSONbig to store large numbers as strings
const JSONbigParser = JSONbig({
  storeAsString: true,
  useNativeBigInt: false,
});

// Get environment parameter from command line
const environment = process.argv[2] || "local";

// Validate environment parameter
if (environment !== "local" && environment !== "remote") {
  console.error("❌ Error: Invalid environment specified!");
  console.error("");
  console.error("Usage: npm run upload-listings [local|remote]");
  console.error("  local  - Use local Supabase instance (default)");
  console.error("  remote - Use remote Supabase instance");
  console.error("");
  process.exit(1);
}

// Supabase configuration based on environment parameter
let SUPABASE_URL: string;
let SUPABASE_SERVICE_ROLE_KEY: string;

if (environment === "remote") {
  SUPABASE_URL = process.env.REMOTE_SUPABASE_URL || "";
  SUPABASE_SERVICE_ROLE_KEY =
    process.env.REMOTE_SUPABASE_SERVICE_ROLE_KEY || "";
} else {
  // local environment
  SUPABASE_URL = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
  SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
}

// Create service role client (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface AirbnbListing {
  id: number;
  nickname: string;
  [key: string]: any;
}

interface UploadResult {
  success: number;
  failed: number;
  errors: string[];
}

async function uploadListings(): Promise<void> {
  console.log(
    `🚀 Starting Airbnb listings upload to ${environment} environment...`
  );
  console.log(`📡 Target: ${SUPABASE_URL}`);

  try {
    // Validate environment variables
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        `Missing required environment variables for ${environment} environment: ${
          environment === "remote"
            ? "REMOTE_SUPABASE_URL and REMOTE_SUPABASE_SERVICE_ROLE_KEY"
            : "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
        }`
      );
    }

    // Read the listings.json file
    const listingsPath = path.join(process.cwd(), "listings.json");
    console.log(`📖 Reading listings from: ${listingsPath}`);

    if (!fs.existsSync(listingsPath)) {
      throw new Error(`Listings file not found at: ${listingsPath}`);
    }

    const fileContent = fs.readFileSync(listingsPath, "utf-8");
    const data = JSONbigParser.parse(fileContent);

    // Extract listings from the nested structure
    const listings: AirbnbListing[] = data[0]?.listings || [];

    if (!listings.length) {
      throw new Error("No listings found in the JSON file");
    }

    console.log(`📊 Found ${listings.length} listings to upload`);

    // Prepare data for database insertion
    const dbListings = listings.map((listing) => ({
      id: listing.nickname, // Use nickname as primary key
      airbnb_id: listing.id.toString(), // Convert large number to string
      airbnb_payload: listing, // Store entire listing object
    }));

    console.log("🔄 Uploading listings to database...");

    // Upload in batches to avoid overwhelming the database
    const batchSize = 50;
    const result: UploadResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < dbListings.length; i += batchSize) {
      const batch = dbListings.slice(i, i + batchSize);

      console.log(
        `📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          dbListings.length / batchSize
        )} (${batch.length} listings)`
      );

      const { error } = await supabase.from("listings").upsert(batch, {
        onConflict: "id", // Update if nickname already exists
        ignoreDuplicates: false,
      });

      if (error) {
        console.error(`❌ Error uploading batch:`, error);
        result.failed += batch.length;
        result.errors.push(
          `Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`
        );
      } else {
        result.success += batch.length;
        console.log(`✅ Successfully uploaded ${batch.length} listings`);
      }
    }

    // Print summary
    console.log("\n📈 Upload Summary:");
    console.log(`✅ Successfully uploaded: ${result.success} listings`);
    console.log(`❌ Failed uploads: ${result.failed} listings`);

    if (result.errors.length > 0) {
      console.log("\n❌ Errors encountered:");
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    if (result.success > 0) {
      console.log(
        `\n🎉 Successfully uploaded ${result.success} listings to the ${environment} database!`
      );
    }
  } catch (error) {
    console.error("💥 Upload failed:", error);
    console.error(
      `💡 Make sure you have the required environment variables set for ${environment} environment:`
    );
    if (environment === "remote") {
      console.error("   - REMOTE_SUPABASE_URL");
      console.error("   - REMOTE_SUPABASE_SERVICE_ROLE_KEY");
    } else {
      console.error("   - SUPABASE_URL");
      console.error("   - SUPABASE_SERVICE_ROLE_KEY");
    }
    console.error("💡 You can find these in your Supabase project settings.");
    process.exit(1);
  }
}

// Run the upload if this script is executed directly
if (require.main === module) {
  uploadListings()
    .then(() => {
      console.log("✨ Upload script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Upload script failed:", error);
      process.exit(1);
    });
}

export { uploadListings };
