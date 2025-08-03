/**
 * Authentication helper for e2e tests
 */

const { createClient } = require("@supabase/supabase-js");

// Test user data with unique email
const TEST_USER = {
  email: `test-e2e-${Date.now()}@example.com`,
  password: "testpassword123",
  user_metadata: {
    role: "admin",
    name: "E2E Test User",
  },
};

let serviceRoleClient;
let supabaseClient;
let testUser;
let authToken;

export async function setupTestUser() {
  // Initialize Supabase clients
  const supabaseUrl = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
  const supabaseServiceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

  console.log("Setting up test user with:");
  console.log("- Supabase URL:", supabaseUrl);
  console.log(
    "- Service Role Key (first 20 chars):",
    supabaseServiceRoleKey.substring(0, 20) + "..."
  );
  console.log("- Test User Email:", TEST_USER.email);

  serviceRoleClient = createClient(supabaseUrl, supabaseServiceRoleKey);
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

  try {
    console.log("Attempting to create test user...");

    // Create new test user using service role
    const { data: newUser, error: createError } =
      await serviceRoleClient.auth.admin.createUser({
        email: TEST_USER.email,
        password: TEST_USER.password,
        user_metadata: TEST_USER.user_metadata,
        email_confirm: true,
      });

    if (createError) {
      console.error("=== CREATE USER ERROR DETAILS ===");
      console.error("Error object:", createError);
      console.error("Error message:", createError.message);
      console.error("Error status:", createError.status);
      console.error("Error code:", createError.code);
      console.error("Error details:", createError.details);
      console.error("Error hint:", createError.hint);
      console.error("Full error:", JSON.stringify(createError, null, 2));
      console.error("================================");
      throw createError;
    }

    testUser = newUser.user;
    console.log("User created successfully:", testUser.id);

    console.log("Attempting to sign in with test user...");

    // Sign in with the test user to get a real session
    const { data: sessionData, error: signInError } =
      await supabaseClient.auth.signInWithPassword({
        email: TEST_USER.email,
        password: TEST_USER.password,
      });

    if (signInError) {
      console.error("=== SIGN IN ERROR DETAILS ===");
      console.error("Error object:", signInError);
      console.error("Error message:", signInError.message);
      console.error("Error status:", signInError.status);
      console.error("Error code:", signInError.code);
      console.error("Full error:", JSON.stringify(signInError, null, 2));
      console.error("=============================");
      throw signInError;
    }

    authToken = sessionData.session.access_token;

    if (!authToken) {
      throw new Error("Failed to get access token from session");
    }

    console.log("E2E test user created and authenticated:", testUser.email);
    console.log("Access token length:", authToken.length);
    return {
      email: TEST_USER.email,
      password: TEST_USER.password,
      token: authToken,
      user: testUser,
    };
  } catch (error) {
    console.error("=== SETUP FAILED ===");
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    if (error.status) console.error("Error status:", error.status);
    if (error.code) console.error("Error code:", error.code);
    console.error("Full error:", JSON.stringify(error, null, 2));
    console.error("====================");
    throw error;
  }
}

export async function cleanupTestUser() {
  if (testUser) {
    try {
      await serviceRoleClient.auth.admin.deleteUser(testUser.id);
      console.log("E2E test user cleaned up");
    } catch (error) {
      console.error("Error cleaning up test user:", error);
    }
  }
}

export async function authenticateInBrowser(page, credentials) {
  // Navigate to the login page
  await page.goto("/");

  // Wait for the page to load and Supabase client to be available
  await page.waitForFunction(() => window.supabase && window.supabase.auth, {
    timeout: 10000,
  });

  // Set the real session using the Supabase client
  await page.evaluate((creds) => {
    // Create a real session object with the actual token
    const realSession = {
      access_token: creds.token,
      refresh_token: "mock-refresh-token",
      expires_in: 3600,
      token_type: "bearer",
      user: {
        id: creds.user.id,
        aud: "authenticated",
        role: "authenticated",
        email: creds.user.email,
        email_confirmed_at: new Date().toISOString(),
        phone: "",
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        app_metadata: {
          provider: "email",
          providers: ["email"],
        },
        user_metadata: creds.user.user_metadata,
        identities: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };

    // Clear any existing auth data
    localStorage.removeItem("sb-local-anon-key");
    localStorage.removeItem("supabase.auth.token");

    // Set the session in localStorage
    localStorage.setItem("sb-local-anon-key", JSON.stringify(realSession));

    // Use the Supabase client to set the session
    if (window.supabase && window.supabase.auth) {
      // Set the session directly
      window.supabase.auth.setSession(realSession);

      // Also trigger the auth state change manually
      setTimeout(() => {
        // Dispatch a custom event to trigger auth state change
        const event = new CustomEvent("supabase-auth-change", {
          detail: { event: "SIGNED_IN", session: realSession },
        });
        window.dispatchEvent(event);
      }, 100);
    }

    console.log("Session set via Supabase client:", {
      session: realSession,
      user: realSession.user,
    });
  }, credentials);

  // Wait for the auth state to be recognized
  await page.waitForTimeout(2000);

  // Reload the page to ensure the auth state is properly loaded
  await page.reload();

  // Wait for the health check content to load
  await page.waitForSelector("h1", { timeout: 15000 });

  // Additional wait to ensure auth state is properly set
  await page.waitForTimeout(2000);

  // Debug: Check the current auth state
  const authState = await page.evaluate(() => {
    return {
      localStorage: {
        "sb-local-anon-key": localStorage.getItem("sb-local-anon-key"),
        allKeys: Object.keys(localStorage),
      },
      supabaseAvailable: !!window.supabase,
      authAvailable: !!(window.supabase && window.supabase.auth),
      currentUser: window.supabase?.auth?.getUser
        ? window.supabase.auth.getUser()
        : null,
    };
  });

  console.log("Auth state after setup:", authState);
}

export async function clearAuthentication(page) {
  await page.evaluate(() => {
    localStorage.removeItem("sb-local-anon-key");
    localStorage.removeItem("supabase.auth.token");
  });
}
