/**
 * Integration tests for task management system
 * Tests task status movements, cleaner/admin interactions, and permissions
 */

import { IntegrationTestHelper } from "./test-utils";

describe("Task Management - Integration Tests", () => {
  let testHelper: IntegrationTestHelper;
  let testListingId: string;
  let adminUser: any;
  let cleanerUser1: any;
  let cleanerUser2: any;
  let testTaskId: string;

  beforeAll(async () => {
    testHelper = new IntegrationTestHelper();
  });

  beforeEach(async () => {
    const { listingId } = await testHelper.prepareDatabase();
    testListingId = listingId;

    // Create test users
    const adminTestUser = await testHelper.createTestUser({
      testName: "admin",
      role: "admin",
      metadata: { name: "Test Admin" },
    });
    adminUser = adminTestUser;

    const cleanerTestUser1 = await testHelper.createTestUser({
      testName: "cleaner1",
      role: "cleaner",
      metadata: { name: "Test Cleaner 1" },
    });
    cleanerUser1 = cleanerTestUser1;

    const cleanerTestUser2 = await testHelper.createTestUser({
      testName: "cleaner2",
      role: "cleaner",
      metadata: { name: "Test Cleaner 2" },
    });
    cleanerUser2 = cleanerTestUser2;

    // Create a test task as admin
    const { data: task } = await testHelper.serviceRoleClient
      .from("tasks")
      .insert({
        listing_id: testListingId,
        task_type: "cleaning",
        title: "Test Cleaning Task",
        description: "Integration test task",
        scheduled_datetime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      })
      .select()
      .single();

    testTaskId = task.id;
  });

  afterEach(async () => {
    await testHelper.emptyDatabase();
  });

  describe("Admin Task Management", () => {
    test("admin can create tasks", async () => {
      const { data: tasks } = await testHelper.serviceRoleClient
        .from("tasks")
        .select("*")
        .eq("listing_id", testListingId);

      expect(tasks).toHaveLength(1);
      expect(tasks![0]).toMatchObject({
        listing_id: testListingId,
        task_type: "cleaning",
        title: "Test Cleaning Task",
        status: "unassigned",
      });
    });

    test("admin can assign tasks to cleaners", async () => {
      // Admin assigns task to cleaner1
      const { error } = await testHelper.serviceRoleClient
        .from("tasks")
        .update({
          assigned_to: cleanerUser1.user.id,
          assigned_by: adminUser.user.id,
          assigned_at: new Date().toISOString(),
        })
        .eq("id", testTaskId);

      expect(error).toBeNull();

      // Verify task status changed to assigned
      const { data: task } = await testHelper.serviceRoleClient
        .from("tasks")
        .select("*")
        .eq("id", testTaskId)
        .single();

      expect(task).toMatchObject({
        status: "assigned",
        assigned_to: cleanerUser1.user.id,
        assigned_by: adminUser.user.id,
      });
      expect(task.assigned_at).toBeTruthy();
    });

    test("admin can reassign tasks between cleaners", async () => {
      // First assign to cleaner1
      await testHelper.serviceRoleClient
        .from("tasks")
        .update({
          assigned_to: cleanerUser1.user.id,
          assigned_by: adminUser.user.id,
          assigned_at: new Date().toISOString(),
        })
        .eq("id", testTaskId);

      // Then reassign to cleaner2
      const { error } = await testHelper.serviceRoleClient
        .from("tasks")
        .update({
          assigned_to: cleanerUser2.user.id,
          assigned_by: adminUser.user.id,
          assigned_at: new Date().toISOString(),
        })
        .eq("id", testTaskId);

      expect(error).toBeNull();

      const { data: task } = await testHelper.serviceRoleClient
        .from("tasks")
        .select("*")
        .eq("id", testTaskId)
        .single();

      expect(task).toMatchObject({
        status: "assigned",
        assigned_to: cleanerUser2.user.id,
      });
    });

    test("admin can unassign tasks", async () => {
      // First assign task
      await testHelper.serviceRoleClient
        .from("tasks")
        .update({
          assigned_to: cleanerUser1.user.id,
          assigned_by: adminUser.user.id,
          assigned_at: new Date().toISOString(),
        })
        .eq("id", testTaskId);

      // Then unassign
      const { error } = await testHelper.serviceRoleClient
        .from("tasks")
        .update({
          assigned_to: null,
        })
        .eq("id", testTaskId);

      expect(error).toBeNull();

      const { data: task } = await testHelper.serviceRoleClient
        .from("tasks")
        .select("*")
        .eq("id", testTaskId)
        .single();

      expect(task).toMatchObject({
        status: "unassigned",
        assigned_to: null,
      });
    });

    test("admin can modify all task fields", async () => {
      const { error } = await testHelper.serviceRoleClient
        .from("tasks")
        .update({
          title: "Updated Title",
          description: "Updated Description",
          task_type: "maintenance",
          scheduled_datetime: new Date(Date.now() + 7200000).toISOString(),
        })
        .eq("id", testTaskId);

      expect(error).toBeNull();

      const { data: task } = await testHelper.serviceRoleClient
        .from("tasks")
        .select("*")
        .eq("id", testTaskId)
        .single();

      expect(task).toMatchObject({
        title: "Updated Title",
        description: "Updated Description",
        task_type: "maintenance",
      });
    });
  });

  describe("Cleaner Task Interactions", () => {
    beforeEach(async () => {
      // Assign test task to cleaner1 for these tests
      await testHelper.serviceRoleClient
        .from("tasks")
        .update({
          assigned_to: cleanerUser1.user.id,
          assigned_by: adminUser.user.id,
          assigned_at: new Date().toISOString(),
        })
        .eq("id", testTaskId);
    });

    test("cleaner can view their assigned tasks", async () => {
      // Use cleaner1's client to query tasks
      const cleanerClient = testHelper.supabaseAnonClient;
      await cleanerClient.auth.setSession({
        access_token: cleanerUser1.token,
        refresh_token: "dummy",
      });

      const { data: tasks, error } = await cleanerClient
        .from("tasks")
        .select("*");

      expect(error).toBeNull();
      expect(tasks).toHaveLength(1);
      expect(tasks![0].id).toBe(testTaskId);
    });

    test("cleaner cannot view tasks assigned to others", async () => {
      // Use cleaner2's client (task is assigned to cleaner1)
      const cleanerClient = testHelper.supabaseAnonClient;
      await cleanerClient.auth.setSession({
        access_token: cleanerUser2.token,
        refresh_token: "dummy",
      });

      const { data: tasks, error } = await cleanerClient
        .from("tasks")
        .select("*");

      expect(error).toBeNull();
      expect(tasks).toHaveLength(0);
    });

    test("cleaner can accept assigned task", async () => {
      const cleanerClient = testHelper.supabaseAnonClient;
      await cleanerClient.auth.setSession({
        access_token: cleanerUser1.token,
        refresh_token: "dummy",
      });

      const { error } = await cleanerClient
        .from("tasks")
        .update({ status: "accepted" })
        .eq("id", testTaskId);

      expect(error).toBeNull();

      // Verify status change and timestamp
      const { data: task } = await testHelper.serviceRoleClient
        .from("tasks")
        .select("*")
        .eq("id", testTaskId)
        .single();

      expect(task.status).toBe("accepted");
      expect(task.accepted_at).toBeTruthy();
    });

    test("cleaner can start task (set started_at) after accepting", async () => {
      const cleanerClient = testHelper.supabaseAnonClient;
      await cleanerClient.auth.setSession({
        access_token: cleanerUser1.token,
        refresh_token: "dummy",
      });

      // First accept the task
      await cleanerClient
        .from("tasks")
        .update({ status: "accepted" })
        .eq("id", testTaskId);

      const startTime = new Date().toISOString();
      const { error } = await cleanerClient
        .from("tasks")
        .update({ started_at: startTime })
        .eq("id", testTaskId);

      expect(error).toBeNull();

      // Verify status automatically changed to in_progress
      const { data: task } = await testHelper.serviceRoleClient
        .from("tasks")
        .select("*")
        .eq("id", testTaskId)
        .single();

      expect(task.status).toBe("in_progress");
      expect(new Date(task.started_at).toISOString()).toBe(startTime);
    });

    test("cleaner can complete task (set finished_at)", async () => {
      const cleanerClient = testHelper.supabaseAnonClient;
      await cleanerClient.auth.setSession({
        access_token: cleanerUser1.token,
        refresh_token: "dummy",
      });

      // First accept the task
      await cleanerClient
        .from("tasks")
        .update({ status: "accepted" })
        .eq("id", testTaskId);

      // Then start the task
      const startTime = new Date().toISOString();
      await cleanerClient
        .from("tasks")
        .update({ started_at: startTime })
        .eq("id", testTaskId);

      // Then finish it
      const finishTime = new Date(Date.now() + 3600000).toISOString(); // 1 hour later
      const { error } = await cleanerClient
        .from("tasks")
        .update({ finished_at: finishTime })
        .eq("id", testTaskId);

      expect(error).toBeNull();

      // Verify status automatically changed to completed
      const { data: task } = await testHelper.serviceRoleClient
        .from("tasks")
        .select("*")
        .eq("id", testTaskId)
        .single();

      expect(task.status).toBe("completed");
      expect(new Date(task.finished_at).toISOString()).toBe(finishTime);
      expect(task.completed_at).toBeTruthy();
    });

    test("cleaner can cancel accepted task", async () => {
      const cleanerClient = testHelper.supabaseAnonClient;
      await cleanerClient.auth.setSession({
        access_token: cleanerUser1.token,
        refresh_token: "dummy",
      });

      // First accept the task
      await cleanerClient
        .from("tasks")
        .update({ status: "accepted" })
        .eq("id", testTaskId);

      // Then cancel it
      const { error } = await cleanerClient
        .from("tasks")
        .update({ status: "assigned" })
        .eq("id", testTaskId);

      expect(error).toBeNull();

      // Verify status changed back and accepted_at cleared
      const { data: task } = await testHelper.serviceRoleClient
        .from("tasks")
        .select("*")
        .eq("id", testTaskId)
        .single();

      expect(task.status).toBe("assigned");
      expect(task.accepted_at).toBeNull();
    });
  });

  describe("Permission Validation", () => {
    beforeEach(async () => {
      // Assign test task to cleaner1
      await testHelper.serviceRoleClient
        .from("tasks")
        .update({
          assigned_to: cleanerUser1.user.id,
          assigned_by: adminUser.user.id,
          assigned_at: new Date().toISOString(),
        })
        .eq("id", testTaskId);
    });

    test("cleaner cannot update tasks assigned to others", async () => {
      const cleanerClient = testHelper.supabaseAnonClient;
      await cleanerClient.auth.setSession({
        access_token: cleanerUser2.token, // cleaner2 trying to update cleaner1's task
        refresh_token: "dummy",
      });

      const { error } = await cleanerClient
        .from("tasks")
        .update({ status: "accepted" })
        .eq("id", testTaskId);

      // RLS blocks access - update succeeds but affects no rows
      expect(error).toBeNull();

      // Verify task was not actually updated (this is the real test)
      const { data: task } = await testHelper.serviceRoleClient
        .from("tasks")
        .select("*")
        .eq("id", testTaskId)
        .single();

      expect(task.status).toBe("assigned"); // Should still be assigned, not accepted
    });

    test("cleaner cannot modify restricted fields", async () => {
      const cleanerClient = testHelper.supabaseAnonClient;
      await cleanerClient.auth.setSession({
        access_token: cleanerUser1.token,
        refresh_token: "dummy",
      });

      // Try to modify title (restricted field)
      const { error: titleError } = await cleanerClient
        .from("tasks")
        .update({ title: "Hacked Title" })
        .eq("id", testTaskId);

      expect(titleError).toBeTruthy();
      expect(titleError!.message).toContain(
        "Only admins may modify task fields"
      );

      // Try to reassign task (restricted field)
      const { error: assignError } = await cleanerClient
        .from("tasks")
        .update({ assigned_to: cleanerUser2.user.id })
        .eq("id", testTaskId);

      expect(assignError).toBeTruthy();
      expect(assignError!.message).toContain(
        "Only admins may modify task fields"
      );
    });

    test("cleaner can only modify allowed fields", async () => {
      const cleanerClient = testHelper.supabaseAnonClient;
      await cleanerClient.auth.setSession({
        access_token: cleanerUser1.token,
        refresh_token: "dummy",
      });

      // Status change should succeed
      const { error: statusError } = await cleanerClient
        .from("tasks")
        .update({ status: "accepted" })
        .eq("id", testTaskId);

      expect(statusError).toBeNull();

      // Reset status for next test and accept it
      await cleanerClient
        .from("tasks")
        .update({ status: "accepted" })
        .eq("id", testTaskId);

      // started_at change should succeed (triggers status change to in_progress)
      const { error: startError } = await cleanerClient
        .from("tasks")
        .update({ started_at: new Date().toISOString() })
        .eq("id", testTaskId);

      expect(startError).toBeNull();
    });
  });

  describe("Invalid Status Transitions", () => {
    beforeEach(async () => {
      // Assign test task to cleaner1
      await testHelper.serviceRoleClient
        .from("tasks")
        .update({
          assigned_to: cleanerUser1.user.id,
          assigned_by: adminUser.user.id,
          assigned_at: new Date().toISOString(),
        })
        .eq("id", testTaskId);
    });

    test("cleaner cannot skip workflow steps", async () => {
      const cleanerClient = testHelper.supabaseAnonClient;
      await cleanerClient.auth.setSession({
        access_token: cleanerUser1.token,
        refresh_token: "dummy",
      });

      // Try to go directly from assigned to completed
      const { error } = await cleanerClient
        .from("tasks")
        .update({ status: "completed" })
        .eq("id", testTaskId);

      expect(error).toBeTruthy();
      expect(error!.message).toContain(
        "Invalid status transition from assigned to completed"
      );
    });

    test("cannot set started_at on assigned task (must be accepted first)", async () => {
      const cleanerClient = testHelper.supabaseAnonClient;
      await cleanerClient.auth.setSession({
        access_token: cleanerUser1.token,
        refresh_token: "dummy",
      });

      // Try to set started_at on assigned task (should only work on accepted)
      const { error } = await cleanerClient
        .from("tasks")
        .update({ started_at: new Date().toISOString() })
        .eq("id", testTaskId);

      expect(error).toBeTruthy();
      expect(error!.message).toContain(
        "started_at can only be set when task status is accepted"
      );
    });

    test("can set started_at after accepting task", async () => {
      const cleanerClient = testHelper.supabaseAnonClient;
      await cleanerClient.auth.setSession({
        access_token: cleanerUser1.token,
        refresh_token: "dummy",
      });

      // First accept the task
      await cleanerClient
        .from("tasks")
        .update({ status: "accepted" })
        .eq("id", testTaskId);

      // Then start the task (should work)
      const startTime = new Date().toISOString();
      const { error } = await cleanerClient
        .from("tasks")
        .update({ started_at: startTime })
        .eq("id", testTaskId);

      expect(error).toBeNull();

      // Verify status automatically changed to in_progress
      const { data: task } = await testHelper.serviceRoleClient
        .from("tasks")
        .select("*")
        .eq("id", testTaskId)
        .single();

      expect(task.status).toBe("in_progress");
      expect(new Date(task.started_at).toISOString()).toBe(startTime);
    });

    test("cannot set finished_at without started_at", async () => {
      const cleanerClient = testHelper.supabaseAnonClient;
      await cleanerClient.auth.setSession({
        access_token: cleanerUser1.token,
        refresh_token: "dummy",
      });

      // Try to set finished_at without started_at
      const { error } = await cleanerClient
        .from("tasks")
        .update({ finished_at: new Date().toISOString() })
        .eq("id", testTaskId);

      expect(error).toBeTruthy();
      expect(error!.message).toContain(
        "finished_at can only be set when task is in_progress"
      );
    });

    test("finished_at must be later than started_at", async () => {
      const cleanerClient = testHelper.supabaseAnonClient;
      await cleanerClient.auth.setSession({
        access_token: cleanerUser1.token,
        refresh_token: "dummy",
      });

      // accept the task
      const { error: acceptError } = await cleanerClient
        .from("tasks")
        .update({ status: "accepted" })
        .eq("id", testTaskId);

      expect(acceptError).toBeNull();

      // get the task by id
      const { data: task1 } = await cleanerClient
        .from("tasks")
        .select("*")
        .eq("id", testTaskId)
        .single();

      expect(task1.status).toBe("accepted");

      // Start the task
      const startedAt = new Date().toISOString();
      const { error: startError } = await cleanerClient
        .from("tasks")
        .update({ started_at: startedAt })
        .eq("id", testTaskId);

      expect(startError).toBeNull();

      // Try to finish before start time
      const finishedAt = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
      const { error: finishError } = await cleanerClient
        .from("tasks")
        .update({ finished_at: finishedAt })
        .eq("id", testTaskId);

      expect(finishError).toBeTruthy();
      expect(finishError!.message).toContain(
        "finished_at must be later than started_at"
      );
    });
  });

  describe("Trigger Behavior", () => {
    beforeEach(async () => {
      // Assign test task to cleaner1
      await testHelper.serviceRoleClient
        .from("tasks")
        .update({
          assigned_to: cleanerUser1.user.id,
          assigned_by: adminUser.user.id,
          assigned_at: new Date().toISOString(),
        })
        .eq("id", testTaskId);
    });

    test("removing started_at resets status and clears finished_at", async () => {
      // Start and finish the task
      await testHelper.serviceRoleClient
        .from("tasks")
        .update({
          started_at: new Date().toISOString(),
        })
        .eq("id", testTaskId);

      await testHelper.serviceRoleClient
        .from("tasks")
        .update({
          finished_at: new Date(Date.now() + 3600000).toISOString(),
        })
        .eq("id", testTaskId);

      // Remove started_at
      const { error } = await testHelper.serviceRoleClient
        .from("tasks")
        .update({ started_at: null })
        .eq("id", testTaskId);

      expect(error).toBeNull();

      // Verify status reset and finished_at cleared
      const { data: task } = await testHelper.serviceRoleClient
        .from("tasks")
        .select("*")
        .eq("id", testTaskId)
        .single();

      expect(task.status).toBe("assigned");
      expect(task.started_at).toBeNull();
      expect(task.finished_at).toBeNull();
    });

    test("task reassignment resets status", async () => {
      // Accept and start the task
      await testHelper.serviceRoleClient
        .from("tasks")
        .update({
          status: "accepted",
        })
        .eq("id", testTaskId);

      // Reassign to different cleaner
      const { error } = await testHelper.serviceRoleClient
        .from("tasks")
        .update({
          assigned_to: cleanerUser2.user.id,
        })
        .eq("id", testTaskId);

      expect(error).toBeNull();

      // Verify status reset to assigned
      const { data: task } = await testHelper.serviceRoleClient
        .from("tasks")
        .select("*")
        .eq("id", testTaskId)
        .single();

      expect(task.status).toBe("assigned");
      expect(task.assigned_to).toBe(cleanerUser2.user.id);
    });
  });

  describe("Complete Workflow Integration", () => {
    test("end-to-end cleaner workflow", async () => {
      // Admin assigns task
      await testHelper.serviceRoleClient
        .from("tasks")
        .update({
          assigned_to: cleanerUser1.user.id,
          assigned_by: adminUser.user.id,
          assigned_at: new Date().toISOString(),
        })
        .eq("id", testTaskId);

      const cleanerClient = testHelper.supabaseAnonClient;
      await cleanerClient.auth.setSession({
        access_token: cleanerUser1.token,
        refresh_token: "dummy",
      });

      // Cleaner accepts task
      await cleanerClient
        .from("tasks")
        .update({ status: "accepted" })
        .eq("id", testTaskId);

      // Cleaner reconsiders and cancels
      await cleanerClient
        .from("tasks")
        .update({ status: "assigned" })
        .eq("id", testTaskId);

      // Cleaner accepts task again
      await cleanerClient
        .from("tasks")
        .update({ status: "accepted" })
        .eq("id", testTaskId);

      // Cleaner starts task
      const startTime = new Date().toISOString();
      await cleanerClient
        .from("tasks")
        .update({ started_at: startTime })
        .eq("id", testTaskId);

      // Cleaner finishes task
      const finishTime = new Date(Date.now() + 3600000).toISOString();
      const { error } = await cleanerClient
        .from("tasks")
        .update({ finished_at: finishTime })
        .eq("id", testTaskId);

      expect(error).toBeNull();

      // Verify final state
      const { data: task } = await testHelper.serviceRoleClient
        .from("tasks")
        .select("*")
        .eq("id", testTaskId)
        .single();

      expect(task).toMatchObject({
        status: "completed",
        assigned_to: cleanerUser1.user.id,
      });
      expect(new Date(task.started_at).toISOString()).toBe(startTime);
      expect(new Date(task.finished_at).toISOString()).toBe(finishTime);
      expect(task.completed_at).toBeTruthy();
    });
  });
});
