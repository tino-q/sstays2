/**
 * Shared utilities for integration tests
 * Reduces boilerplate and standardizes test patterns
 */

import { createClient, SupabaseClient, User } from "@supabase/supabase-js";

// Constants
export const FUNCTION_URL = "http://localhost:54321/functions/v1";
export const SUPABASE_URL =
  process.env.SUPABASE_URL || "http://127.0.0.1:54321";
export const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

interface TestUser {
  user: User;
  token: string;
  email: string;
}

interface CreateTestUserOptions {
  testName?: string;
  role?: "admin" | "cleaner" | "unassigned";
  metadata?: Record<string, string | number | boolean>;
}

/**
 * Creates a test user with optional admin privileges
 */
export class IntegrationTestHelper {
  private _serviceRoleClient: SupabaseClient | null = null;
  private _supabaseAnonClient: SupabaseClient | null = null;
  public testUnassignedUser: User | null = null;
  public testAdminUser: User | null = null;
  public testCleanerUser: User | null = null;
  private authToken: string | null = null;
  public testListingId: string | null = null;

  public constructor() {
    this._serviceRoleClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );
    this._supabaseAnonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  /**
   * Get the service role client - guaranteed to be non-null after initialization
   */
  public get serviceRoleClient(): SupabaseClient {
    if (!this._serviceRoleClient) {
      throw new Error(
        "Service role client not initialized. Call initializeClients() first."
      );
    }
    return this._serviceRoleClient;
  }

  /**
   * Get the regular supabase client - guaranteed to be non-null after initialization
   */
  public get supabaseAnonClient(): SupabaseClient {
    if (!this._supabaseAnonClient) {
      throw new Error(
        "Supabase client not initialized. Call initializeClients() first."
      );
    }
    return this._supabaseAnonClient;
  }

  /**
   * Create a test user with authentication token
   */
  public async createTestUser(
    options: CreateTestUserOptions = {}
  ): Promise<TestUser> {
    // Using getters ensures clients are initialized
    const serviceClient = this.serviceRoleClient;
    const regularClient = this.supabaseAnonClient;

    const {
      testName = "test",
      role = "unassigned",
      metadata = { role: "user", name: "Test User" },
    } = options;

    const testUser = {
      email: `${testName}-${Date.now()}@example.com`,
      password: "testpassword123",
      user_metadata: metadata,
    };

    // Create user
    const { data: newUser, error: createError } =
      await serviceClient.auth.admin.createUser({
        email: testUser.email,
        password: testUser.password,
        user_metadata: testUser.user_metadata,
        email_confirm: true,
      });

    if (createError) throw createError;
    if (!newUser.user) throw new Error("User creation failed");

    // Update role if different from default "unassigned"
    // Note: User automatically gets "unassigned" role via trigger, so we update if needed
    if (role !== "unassigned") {
      const { error: roleError } = await serviceClient
        .from("roles")
        .update({ role })
        .eq("user_id", newUser.user.id);
      if (roleError) throw roleError;
    }

    // Ensure user profile exists (the trigger might not fire for admin-created users)
    const { data: existingProfile } = await serviceClient
      .from("user_profiles")
      .select("id")
      .eq("id", newUser.user.id)
      .single();

    if (!existingProfile) {
      const { error: profileError } = await serviceClient
        .from("user_profiles")
        .insert({
          id: newUser.user.id,
          email: newUser.user.email,
          name: metadata.name || testUser.email.split("@")[0],
        });
      if (profileError) throw profileError;
    }

    // Sign in to get auth token
    const { data: sessionData, error: signInError } =
      await regularClient.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password,
      });

    if (signInError) throw signInError;
    if (!sessionData.session) throw new Error("Sign in failed");

    this.authToken = sessionData.session.access_token;

    return {
      user: newUser.user,
      token: this.authToken,
      email: testUser.email,
    };
  }

  /**
   * Make an authenticated request to an endpoint
   */
  public async authenticatedRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    if (!this.authToken) {
      throw new Error("No auth token available. Create a test user first.");
    }

    const { headers = {}, ...otherOptions } = options;

    return fetch(`${FUNCTION_URL}${endpoint}`, {
      ...otherOptions,
      headers: {
        Authorization: `Bearer ${this.authToken}`,
        ...headers,
      },
    });
  }

  /**
   * Make an unauthenticated request to an endpoint
   */
  public async unauthenticatedRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    return fetch(`${FUNCTION_URL}${endpoint}`, options);
  }

  /**
   * Clean all application tables in dependency order
   */
  private async cleanAllTables(protectedUsers: User[]): Promise<void> {
    await this.serviceRoleClient.from("tasks").delete().not("id", "is", null);

    await this.serviceRoleClient
      .from("reservations")
      .delete()
      .not("id", "is", null);

    await this.serviceRoleClient
      .from("listings")
      .delete()
      .not("id", "is", null);

    await this.serviceRoleClient
      .from("user_profiles")
      .delete()
      .not(
        "user_id",
        "in",
        protectedUsers.map((user) => user.id)
      );

    await this.serviceRoleClient
      .from("roles")
      .delete()
      .not(
        "user_id",
        "in",
        protectedUsers.map((user) => user.id)
      );
  }

  private async getAllAuthUsers(): Promise<User[]> {
    const allUsers: User[] = [];
    let page = 1;

    while (true) {
      const { data, error } = await this.serviceRoleClient.auth.admin.listUsers(
        {
          page,
          perPage: 1000,
        }
      );
      if (error) throw error;
      if (!data.users.length) break;

      allUsers.push(...data.users);
      page++;
    }

    return allUsers;
  }

  private async deleteAuthUsers(users: User[]): Promise<number> {
    let deletedCount = 0;

    for (const user of users) {
      try {
        const { error: delErr } =
          await this.serviceRoleClient.auth.admin.deleteUser(user.id);
        if (delErr) {
          console.warn(
            `Failed to delete user ${user.email}: ${delErr.message}`
          );
          continue;
        }
        deletedCount++;
      } catch (error) {
        console.warn(`Error deleting user ${user.email}:`, error);
        continue;
      }
    }

    return deletedCount;
  }

  /**
   * Clean up all test data from the database before each test
   * Ensures complete database emptying for isolation between tests
   */
  public async prepareDatabase(): Promise<{
    listingId: string;
    adminUser: User;
    unassignedUser: User;
    cleanerUser: User;
  }> {
    await this.emptyDatabase();

    // Recreate test users for tests that expect them
    const { user: testAdminUser } = await this.createTestUser({
      role: "admin",
    });
    this.testAdminUser = testAdminUser;
    const { user: testUser } = await this.createTestUser({
      role: "unassigned",
    });
    const { user: cleanerUser } = await this.createTestUser({
      role: "cleaner",
    });
    this.testUnassignedUser = testUser;
    this.testCleanerUser = cleanerUser;

    const { id } = await this.createTestListing();
    this.testListingId = id;

    return {
      listingId: this.testListingId,
      adminUser: this.testAdminUser,
      unassignedUser: this.testUnassignedUser,
      cleanerUser: this.testCleanerUser,
    };
  }

  /**
   * Clean up all test data after each test (more thorough cleanup)
   * Ensures no data leaks between tests
   */
  public async emptyDatabase(): Promise<void> {
    const users = await this.getAllAuthUsers();

    const martin = users.find((user) => user.email === "tinqueija@gmail.com");
    const sonsoles = users.find(
      (user) => user.email === "sonsolesrkt@gmail.com"
    );

    // Clean all application tables first
    await this.cleanAllTables([martin, sonsoles].filter(Boolean) as User[]);

    // Then clean all auth users (this will cascade delete any remaining related records)

    // Filter out protected users
    const usersToDelete = users.filter(
      (user) =>
        !["tinqueija@gmail.com", "sonsolesrkt@gmail.com"].includes(
          user.email || ""
        )
    );

    await this.deleteAuthUsers(usersToDelete);

    // Reset internal state
    this.testUnassignedUser = null;
    this.testAdminUser = null;
    this.authToken = null;
  }

  /**
   * Create a test listing for use in tests
   */
  public async createTestListing(): Promise<{ id: string; airbnb_id: string }> {
    const testListing = {
      id: `TEST-PROPERTY-${Date.now()}`,
      airbnb_id: `ABCD-${Date.now()}`,
      airbnb_payload: {
        amenities: [
          "tv",
          "wireless_internet",
          "kitchen",
          "allows_pets",
          "street_parking",
          "heating",
          "washer",
          "smoke_detector",
          "fire_extinguisher",
          "essentials",
          "shampoo",
          "hangers",
          "hair_dryer",
          "iron",
          "self_checkin",
          "lockbox",
          "pack_n_play_travel_crib",
          "room_darkening_shades",
          "hot_water",
          "bed_linens",
          "microwave",
          "coffee_maker",
          "refrigerator",
          "dishwasher",
          "dishes_and_silverware",
          "cooking_basics",
          "oven",
          "long_term_stays_allowed",
          "cleaning_before_checkout",
        ],
        bathroomType: "private",
        country: "ES",
        hostUserId: 464431353,
        rooms: [
          {
            roomNumber: 1000001,
            id: 220996129,
            listingId: "805641989903909958",
            isPrivate: true,
            roomType: "KITCHEN",
          },
          {
            roomNumber: 1000005,
            id: 220996133,
            listingId: "805641989903909958",
            isPrivate: true,
            roomType: "EXTERIOR",
          },
          {
            roomNumber: 1000003,
            id: 220996135,
            listingId: "805641989903909958",
            isPrivate: true,
            roomType: "PATIO",
          },
          {
            roomNumber: 1000000,
            id: 220996136,
            listingId: "805641989903909958",
            isPrivate: true,
            roomType: "FULL_BATHROOM",
          },
          {
            amenities: ["DOUBLE_BED"],
            roomNumber: 1,
            id: 696965303,
            listingId: "805641989903909958",
            isPrivate: true,
            roomType: "BEDROOM",
          },
        ],
        availableByDefault: true,
        petsAllowed: true,
        city: "Alicante",
        precision: "address",
        infantsAllowed: false,
        streetNative: "Comunidad Valenciana",
        language: "en",
        userDefinedLocation: true,
        photos: [
          {
            name: "6e44d214-fcb7-4410-8f37-c9df0971fee4.jpeg",
            fileType: "UNDEFINED",
            createdAt: 1745249552.0,
          },
          {
            name: "0d4f997b-9916-40c1-8833-32c8b46c9c63.jpeg",
            fileType: "UNDEFINED",
            createdAt: 1745249553.0,
          },
          {
            name: "2f634efa-4961-4f18-8434-b153e4c6e298.png",
            fileType: "PNG",
            createdAt: 1745249555.0,
          },
          {
            name: "66f70ed5-0c1d-4db0-9e42-b0ae2cea4794.jpeg",
            fileType: "UNDEFINED",
            createdAt: 1745249557.0,
          },
          {
            name: "051e8054-a3dd-45e0-a8bb-8e6022187b68.png",
            fileType: "PNG",
            createdAt: 1678125426.0,
          },
          {
            name: "9f2dad8f-2aa7-4fe9-9dab-534c8d71652f.jpeg",
            fileType: "UNDEFINED",
            createdAt: 1673876981.0,
          },
          {
            name: "4cdb86ce-1e34-4362-8ead-6d82b61c33b2.jpeg",
            fileType: "UNDEFINED",
            createdAt: 1745249560.0,
          },
          {
            name: "1218d362-7597-4ee8-b92f-39c1ac80f088.jpeg",
            fileType: "UNDEFINED",
            createdAt: 1745249561.0,
          },
          {
            name: "35289926-1361-4cf0-8f8a-bf9e580bf826.jpeg",
            fileType: "UNDEFINED",
            createdAt: 1745249563.0,
          },
          {
            name: "1c507970-90a0-4ca0-93d9-6bc0d2a519aa.jpeg",
            fileType: "UNDEFINED",
            createdAt: 1745249564.0,
          },
          {
            name: "87d92d27-f0d8-4f27-81ec-4ef52d333f46.jpeg",
            fileType: "UNDEFINED",
            createdAt: 1745249566.0,
          },
          {
            name: "17d598e2-2a47-4c46-8025-2943d36e2a4d.jpeg",
            fileType: "UNDEFINED",
            createdAt: 1745249567.0,
          },
          {
            name: "0f381b39-ba21-47e1-a090-4b6a4f65fd35.png",
            fileType: "PNG",
            createdAt: 1678125426.0,
          },
          {
            name: "0cc6a963-77e2-4861-b973-cf7ac010b45e.png",
            fileType: "PNG",
            createdAt: 1678125424.0,
          },
          {
            name: "508151e1-ca67-4ba9-94b7-26b1a866c10b.jpeg",
            fileType: "UNDEFINED",
            createdAt: 1698314286.0,
          },
          {
            name: "b02f3abd-3bdc-41d0-9c2c-139a0d469e6a.png",
            fileType: "PNG",
            createdAt: 1678125434.0,
          },
          {
            name: "03328cd4-0ce2-4d67-80e3-9d5e3376df9b.png",
            fileType: "PNG",
            createdAt: 1678125420.0,
          },
          {
            name: "946446f5-0858-454b-acbd-b0393137638c.png",
            fileType: "PNG",
            createdAt: 1678125427.0,
          },
          {
            name: "26f618b5-3732-4051-8672-5b7161deca8d.png",
            fileType: "PNG",
            createdAt: 1678125444.0,
          },
          {
            name: "3e193d36-b0d3-46b7-9b4d-fbf957eb5d5b.png",
            fileType: "PNG",
            createdAt: 1678125426.0,
          },
          {
            name: "4397c2ae-f061-4a8a-8e04-fa70e764e895.png",
            fileType: "PNG",
            createdAt: 1745249576.0,
          },
          {
            name: "6a263d94-ccb9-4fc5-bb68-deb193206073.png",
            fileType: "PNG",
            createdAt: 1745249578.0,
          },
          {
            name: "c210ac64-ca7b-4f19-98df-b936d9612878.png",
            fileType: "PNG",
            createdAt: 1678125419.0,
          },
          {
            name: "46f3a276-5efc-472b-a40f-b19350d021ef.jpeg",
            fileType: "UNDEFINED",
            createdAt: 1673876989.0,
          },
          {
            name: "4098d0e8-e843-4c50-876c-79d83a300a15.jpeg",
            fileType: "UNDEFINED",
            createdAt: 1745249581.0,
          },
          {
            name: "dddc488c-9bc4-4eb7-b40d-52b06765efc9.png",
            fileType: "PNG",
            createdAt: 1745249583.0,
          },
          {
            name: "920f17da-b2ea-4d72-885d-d47535ad5417.png",
            fileType: "PNG",
            createdAt: 1745249584.0,
          },
        ],
        personCapacity: 4,
        childrenAlloewd: false,
        smokingAllowed: false,
        formattedAddress:
          "Calle Bernardo López García, 18, 03013, Alicante, Comunidad Valenciana, Spain",
        street: "Calle Bernardo López García, 18",
        propertyType: "Apartment",
        nickname: "BIS",
        cityNative: "Alicante (Alacant)",
        id: "805641989903909958",
        state: "Comunidad Valenciana",
        lat: 38.35280112418923,
        roomType: "Entire home/apt",
        eventsAllowed: false,
        lng: -0.4797469452023506,
        bathrooms: 1.0,
        bedrooms: 1,
        zipcode: "03013",
        license: "VT-494988-A",
        directions: "",
        instantBookLeadTimeHours: 15,
        displayExactLocation: false,
        childrenNotAllowedDetails: "",
        beds: 1,
        listingDescriptions: [
          {
            summary:
              "Sonsoles Stays Alicante offers this cozy and spacious ground-level one-bedroom apartment is great for anyone looking for a minimal and comfortable spot. Equipped for a comfy stay; a couple get-away, group travel, or a busy work trip .*Fans available, no AC available\n\nWe hope you enjoy the design for our first complete remodeling project! We envisioned a simple yet practical and comfortable space ready for what visitors would enjoy.",
            notes:
              "It is a priority for us to make sure our guests know exactly what to expect! \r\n\r\nIf you see plants in the images please bear in mind that they might not be there upon arrival since we love plants but they require continuous care that sometimes is not possible in rental apartments.\r\n\r\nFor longer stays exceeding 28 nights, we\u0027re happy to cover your water and WiFi expenses. As for electricity, we\u0027ve got it covered as well, with a cap of €90. We\u0027ve set this limit to encourage responsible electricity consumption :)",
            tier: "MARKETPLACE",
            neighborhoodOverview:
              "You can enjoy the tranquility of this residential neighborhood at the foot of the Santa Barbara castle where you will find restaurants, stores, and entertainment. Located 15\u0027 away walking from Playa Postiguet and 10\u0027 from the Old Town.",
            name: "Cozy and comfortable for work or vacations!",
            interaction:
              "We\u0027re here to make your stay as comfortable and enjoyable as possible. Let us take care of the details for you! \n\nIf you need private transportation, a supermarket delivery on the day of your arrival, or cleaning services during your stay, just let us know and we\u0027ll arrange it. We can even help you plan day trips or unique experiences to make the most of your time here. Just ask!  Don\u0027t hesitate to reach out if there\u0027s anything we can do to make your stay even better!\n\nWe have golf equipment available for rent and we can arrange your appointment at the club if you want to play. \n\nWe are available during your whole stay to stay in touch through Airbnb, calls, or WhtsApp. :)\nEven after 8:00 PM and before 8:00 AM, you can reach me by phone call, as messages may not be seen immediately during those hours.\n\n\nThe rate includes a bed linen change service periodically during your stay. Our team will take care of keeping your bed fresh and cozy, so you can enjoy optimal rest during your visit.\n\nYou won\u0027t have to worry about washing and changing the sheets and pillowcases yourself. We will take care of this on a regular basis, so you can relax and enjoy your stay to the fullest without having to take care of the housework.",
            description:
              "Sonsoles Stays Alicante offers this cozy and spacious ground-level one-bedroom apartment is great for anyone looking for a minimal and comfortable spot. Equipped for a comfy stay; a couple get-away, group travel, or a busy work trip .*Fans available, no AC available\n\nWe hope you enjoy the design for our first complete remodeling project! We envisioned a simple yet practical and comfortable space ready for what visitors would enjoy.\n\nThe apartment is accessed by climbing 3 steps from the street. It is distributed in a living room with a kitchenette which is equipped with everything you need for your stay, from microwave to dishwasher. The living room has a big and comfortable sofa bed that accommodates two adults perfectly and is easy to open and close. \r\n\r\nThe apartment has a double bedroom with a bed with spacious drawers and a bathroom with a shower and washing machine. \r\n\r\nYou will find a fan in the living room as well as another fan in the bedroom. No Air Conditioning available.\r\n\r\nThe patio is private and is separated from the neighbor\u0027s patio by a lattice. So, although it is private, in case the neighbors use the patio at the same time you could make new friends :)\n\nWe\u0027re here to make your stay as comfortable and enjoyable as possible. Let us take care of the details for you! \n\nIf you need private transportation, a supermarket delivery on the day of your arrival, or cleaning services during your stay, just let us know and we\u0027ll arrange it. We can even help you plan day trips or unique experiences to make the most of your time here. Just ask!  Don\u0027t hesitate to reach out if there\u0027s anything we can do to make your stay even better!\n\nWe have golf equipment available for rent and we can arrange your appointment at the club if you want to play. \n\nWe are available during your whole stay to stay in touch through Airbnb, calls, or WhtsApp. :)\nEven after 8:00 PM and before 8:00 AM, you can reach me by phone call, as messages may not be seen immediately during those hours.\n\n\nThe rate includes a bed linen change service periodically during your stay. Our team will take care of keeping your bed fresh and cozy, so you can enjoy optimal rest during your visit.\n\nYou won\u0027t have to worry about washing and changing the sheets and pillowcases yourself. We will take care of this on a regular basis, so you can relax and enjoy your stay to the fullest without having to take care of the housework.\n\nYou can enjoy the tranquility of this residential neighborhood at the foot of the Santa Barbara castle where you will find restaurants, stores, and entertainment. Located 15\u0027 away walking from Playa Postiguet and 10\u0027 from the Old Town.\n\nIt is a priority for us to make sure our guests know exactly what to expect! \r\n\r\nIf you see plants in the images please bear in mind that they might not be there upon arrival since we love plants but they require continuous care that sometimes is not possible in rental apartments.\r\n\r\nFor longer stays exceeding 28 nights, we\u0027re happy to cover your water and WiFi expenses. As for electricity, we\u0027ve got it covered as well, with a cap of €90. We\u0027ve set this limit to encourage responsible electricity consumption :)",
            language: "en",
            houseRules:
              "If something breaks or is not working correctly, you must contact us before attempting to fix it.\nSmoking is prohibited. No open flames or candles are allowed.\nA deep cleaning fee of €40 will be charged if the sofa/s or carpet is stained.\nYou agree not to disturb the peaceful coexistence of the other neighbours in the community.\nUsing common areas for personal purposes is not allowed.\nParties or events are not permitted.\nFor stays longer than 28 nights, we cover electricity costs up to €90.\nThe guest accepts and confirms complete responsibility for the correct use of all available facilities and services. Necessary precautions must be taken to ensure your safety and security.\nPlease understand that the house is not responsible for theft or damage during your stay.\nRead all the rules in the provided link/pdf.",
            space:
              "The apartment is accessed by climbing 3 steps from the street. It is distributed in a living room with a kitchenette which is equipped with everything you need for your stay, from microwave to dishwasher. The living room has a big and comfortable sofa bed that accommodates two adults perfectly and is easy to open and close. \r\n\r\nThe apartment has a double bedroom with a bed with spacious drawers and a bathroom with a shower and washing machine. \r\n\r\nYou will find a fan in the living room as well as another fan in the bedroom. No Air Conditioning available.\r\n\r\nThe patio is private and is separated from the neighbor\u0027s patio by a lattice. So, although it is private, in case the neighbors use the patio at the same time you could make new friends :)",
          },
          {
            summary:
              "Sonsoles Stays Alicante ofrece este acogedor y espacioso apartamento de un dormitorio en planta baja es ideal para personas que busquen un espacio minimalista y cómodo. Equipado para su estancia; ya sea una escapada en pareja, con amigos o un viaje de trabajo. *Ventiladores disponibles, no hay Aire Acondicionado\n\nEsperamos que disfrutes del diseño que elegimos para nuestro primer proyecto de remodelación completa! Imaginamos un espacio sencillo pero práctico y cómodo.",
            notes:
              "¡Para nosotros es una prioridad asegurarnos de que nuestros huéspedes sepan exactamente qué esperar!\r\n\r\nSi ves plantas en las imágenes, ten en cuenta que es posible que no estén allí a tu llegada, ya que nos encantan las plantas pero requieren cuidados continuos que a veces no son posibles en apartamentos de alquiler.\r\n\r\nPara estancias más largas que superen los 28 días, estaremos encantados de cubrir tus gastos de agua y WiFi. En cuanto a la electricidad, también la tenemos cubierta, con un límite de 90 €. Hemos establecido este límite para fomentar el consumo responsable de electricidad :)",
            tier: "MARKETPLACE",
            neighborhoodOverview:
              "Puedes disfrutar de la tranquilidad de este barrio residencial al pie del castillo de Santa Bárbara, donde encontrarás restaurantes, tiendas y entretenimiento. Está ubicado a 15 minutos a pie de la Playa del Postiguet y a 10 minutos del Casco Antiguo.",
            name: "Acogedor y comfortable para trabajar o vacacionar!",
            interaction:
              "Estamos aquí para hacer que tu estancia sea lo más cómoda y agradable posible. ¡Déjanos ocuparnos de los detalles por ti!\n\nSi necesitas transporte privado, una entrega de supermercado el día de tu llegada o servicios de limpieza durante tu estancia, solo avísanos y lo organizaremos. Incluso podemos ayudarte a planificar excursiones de un día o experiencias únicas para aprovechar al máximo tu tiempo aquí. ¡Solo pregunta! No dudes en comunicarte si hay algo que podamos hacer para que tu estancia sea aún mejor.\n\nTenemos equipos de golf disponibles para alquilar y podemos coordinar tu cita en el club si deseas jugar.\n\nEstamos disponibles durante toda tu estancia para estar en contacto a través de Airbnb, llamadas o WhtsApp. :)\nIncluso después de las 20:00hs y antes del as 8:00hs puede contactarme por llamada telefónica, ya que es posible que los mensajes no sean vistos inmediatamente en ese rango horario.\n\nLa tarifa incluye un servicio de cambio de ropa de cama periódico durante tu estancia. Nuestro equipo se encargará de mantener tu cama fresca y acogedora, para que puedas disfrutar de un descanso óptimo durante tu visita.\n\nNo tendrás que preocuparte por lavar y cambiar las sábanas y fundas de almohada tú mismo. Nosotros nos encargaremos de esto de manera regular, para que puedas relajarte y disfrutar al máximo de tu estancia sin tener que ocuparte de las tareas domésticas.",
            description:
              "Sonsoles Stays Alicante ofrece este acogedor y espacioso apartamento de un dormitorio en planta baja es ideal para personas que busquen un espacio minimalista y cómodo. Equipado para su estancia; ya sea una escapada en pareja, con amigos o un viaje de trabajo. *Ventiladores disponibles, no hay Aire Acondicionado\n\nEsperamos que disfrutes del diseño que elegimos para nuestro primer proyecto de remodelación completa! Imaginamos un espacio sencillo pero práctico y cómodo.\n\nEl apartamento se accede subiendo 3 escalones desde la calle. Está distribuido en una sala de estar con una cocina equipada con todo lo necesario para tu estancia, desde microondas hasta lavavajillas. La sala de estar cuenta con un sofá cama grande y cómodo que puede alojar perfectamente a dos adultos y es muy fácil de abrir y cerrar. \r\n\r\nEl apartamento tiene un dormitorio doble con una cama con cajones espaciosos y un baño con ducha y lavadora. \r\n\r\nUsted encontrará un ventilador en la sala de estar, así como otro ventilador en el dormitorio. No contamos con aire acondicionado.\r\n\r\nEl patio es privado y está separado del patio del vecino por una celosía. Entonces, aunque es privado, ¡en caso de que los vecinos utilicen el patio al mismo tiempo, podrías hacer nuevos amigos :)\n\nEstamos aquí para hacer que tu estancia sea lo más cómoda y agradable posible. ¡Déjanos ocuparnos de los detalles por ti!\n\nSi necesitas transporte privado, una entrega de supermercado el día de tu llegada o servicios de limpieza durante tu estancia, solo avísanos y lo organizaremos. Incluso podemos ayudarte a planificar excursiones de un día o experiencias únicas para aprovechar al máximo tu tiempo aquí. ¡Solo pregunta! No dudes en comunicarte si hay algo que podamos hacer para que tu estancia sea aún mejor.\n\nTenemos equipos de golf disponibles para alquilar y podemos coordinar tu cita en el club si deseas jugar.\n\nEstamos disponibles durante toda tu estancia para estar en contacto a través de Airbnb, llamadas o WhtsApp. :)\nIncluso después de las 20:00hs y antes del as 8:00hs puede contactarme por llamada telefónica, ya que es posible que los mensajes no sean vistos inmediatamente en ese rango horario.\n\nLa tarifa incluye un servicio de cambio de ropa de cama periódico durante tu estancia. Nuestro equipo se encargará de mantener tu cama fresca y acogedora, para que puedas disfrutar de un descanso óptimo durante tu visita.\n\nNo tendrás que preocuparte por lavar y cambiar las sábanas y fundas de almohada tú mismo. Nosotros nos encargaremos de esto de manera regular, para que puedas relajarte y disfrutar al máximo de tu estancia sin tener que ocuparte de las tareas domésticas.\n\nPuedes disfrutar de la tranquilidad de este barrio residencial al pie del castillo de Santa Bárbara, donde encontrarás restaurantes, tiendas y entretenimiento. Está ubicado a 15 minutos a pie de la Playa del Postiguet y a 10 minutos del Casco Antiguo.\n\n¡Para nosotros es una prioridad asegurarnos de que nuestros huéspedes sepan exactamente qué esperar!\r\n\r\nSi ves plantas en las imágenes, ten en cuenta que es posible que no estén allí a tu llegada, ya que nos encantan las plantas pero requieren cuidados continuos que a veces no son posibles en apartamentos de alquiler.\r\n\r\nPara estancias más largas que superen los 28 días, estaremos encantados de cubrir tus gastos de agua y WiFi. En cuanto a la electricidad, también la tenemos cubierta, con un límite de 90 €. Hemos establecido este límite para fomentar el consumo responsable de electricidad :)",
            language: "es",
            houseRules:
              "Si algo se rompe o no funciona correctamente, debes enviarnos un mensaje antes de intentar arreglarlo.\nProhibido fumar. No se permiten llamas abiertas ni velas.\nSe cobrará una tasa de limpieza profunda de €40 si se manchan el /los sofá/s o la alfombra.\nTe comprometes a no perturbar la pacífica convivencia del resto de vecinos de la comunidad.\nNo está permitido utilizar los espacios comunes para fines personales.\nNo se permiten fiestas ni eventos.\nPara estancias superiores a 28 noches, cubrimos el gasto de electricidad con un tope de 90 €.\nEl huesped acepta y confirma su completa responsabilidad en relación con el uso adecuado de todas las instalaciones y servicios disponibles. Debe tomar las precauciones necesarias para asegurar su integridad y seguridad.\nSepa entender que la casa no se responsabiliza por robos o daños durante su estadía. \nLeer todas las normas en link/pdf.",
            space:
              "El apartamento se accede subiendo 3 escalones desde la calle. Está distribuido en una sala de estar con una cocina equipada con todo lo necesario para tu estancia, desde microondas hasta lavavajillas. La sala de estar cuenta con un sofá cama grande y cómodo que puede alojar perfectamente a dos adultos y es muy fácil de abrir y cerrar. \r\n\r\nEl apartamento tiene un dormitorio doble con una cama con cajones espaciosos y un baño con ducha y lavadora. \r\n\r\nUsted encontrará un ventilador en la sala de estar, así como otro ventilador en el dormitorio. No contamos con aire acondicionado.\r\n\r\nEl patio es privado y está separado del patio del vecino por una celosía. Entonces, aunque es privado, ¡en caso de que los vecinos utilicen el patio al mismo tiempo, podrías hacer nuevos amigos :)",
          },
        ],
        apartment: "bis",
        bedType: "Real Bed",
        formattedAddressNative:
          "C. Bernardo López García, 18, 03013 Alicante (Alacant), Alicante, España",
        stateNative: "Comunidad Valenciana",
        instantBook: false,
      },
    };

    const { error, data } = await this.serviceRoleClient
      .from("listings")
      .insert(testListing)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create test listing: ${error.message}`);
    }

    return data;
  }

  /**
   * Create a Supabase client authenticated with a specific user's token
   */
  public clientForUser(testUser: TestUser): SupabaseClient {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
      },
    });
  }
}
