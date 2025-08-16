/**
 * Integration test for task reassignment trigger
 * Tests that the database trigger sets status to 'assigned' when reassigning between cleaners
 */

import { describe, test, expect, beforeAll, afterAll } from "@jest/globals";
import { IntegrationTestHelper } from "./test-utils";

describe("Task Reassignment Trigger", () => {
  let testHelper: IntegrationTestHelper;
  let cleaner1Id: string;
  let cleaner2Id: string;
  let testTaskId: string;
  let testListingId: string;

  beforeAll(async () => {
    testHelper = new IntegrationTestHelper();
  });

  beforeEach(async () => {
    const { listingId } = await testHelper.prepareDatabase();
    testListingId = listingId;

    // Create two test cleaners
    const { user: cleaner1 } = await testHelper.createTestUser({
      testName: "cleaner1",
      role: "cleaner",
    });
    cleaner1Id = cleaner1.id;

    const { user: cleaner2 } = await testHelper.createTestUser({
      testName: "cleaner2",
      role: "cleaner",
    });
    cleaner2Id = cleaner2.id;

    // Create a test task
    const { data: task, error: taskError } = await testHelper.serviceRoleClient
      .from("tasks")
      .insert({
        listing_id: testListingId,
        task_type: "cleaning",
        title: "Test Reassignment Task",
        description: "Test task for reassignment trigger",
        scheduled_datetime: new Date().toISOString(),
        status: "unassigned",
      })
      .select()
      .single();

    if (taskError) throw taskError;
    testTaskId = task.id;
  });

  afterAll(async () => {
    await testHelper.emptyDatabase();
  });

  test('reassigning task between cleaners resets status to "assigned"', async () => {
    // Step 1: Assign to cleaner1
    await testHelper.serviceRoleClient
      .from("tasks")
      .update({
        assigned_to: cleaner1Id,
        assigned_at: new Date().toISOString(),
      })
      .eq("id", testTaskId);

    // Verify it's assigned
    let { data: task } = await testHelper.serviceRoleClient
      .from("tasks")
      .select("status, assigned_to")
      .eq("id", testTaskId)
      .single();
    expect(task).not.toBeNull();
    expect(task!.status).toBe("assigned");
    expect(task!.assigned_to).toBe(cleaner1Id);

    // Step 2: Cleaner1 accepts the task
    await testHelper.serviceRoleClient
      .from("tasks")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", testTaskId);

    // Verify status is accepted
    ({ data: task } = await testHelper.serviceRoleClient
      .from("tasks")
      .select("status, assigned_to")
      .eq("id", testTaskId)
      .single());
    expect(task!.status).toBe("accepted");

    // Step 3: Reassign to cleaner2 (this should reset status to 'assigned')
    await testHelper.serviceRoleClient
      .from("tasks")
      .update({
        assigned_to: cleaner2Id,
        assigned_at: new Date().toISOString(),
      })
      .eq("id", testTaskId);

    // Verify status was reset to 'assigned' by the trigger
    ({ data: task } = await testHelper.serviceRoleClient
      .from("tasks")
      .select("status, assigned_to")
      .eq("id", testTaskId)
      .single());

    expect(task).not.toBeNull();
    expect(task!.status).toBe("assigned"); // Should be reset from 'accepted' to 'assigned'
    expect(task!.assigned_to).toBe(cleaner2Id);
  });

  test("trigger still works for assignment from unassigned", async () => {
    // Reset task to unassigned
    await testHelper.serviceRoleClient
      .from("tasks")
      .update({
        assigned_to: null,
        assigned_at: null,
      })
      .eq("id", testTaskId);

    // Verify it's unassigned
    let { data: task } = await testHelper.serviceRoleClient
      .from("tasks")
      .select("status, assigned_to")
      .eq("id", testTaskId)
      .single();
    expect(task!.status).toBe("unassigned");
    expect(task!.assigned_to).toBeNull();

    // Assign to cleaner1
    await testHelper.serviceRoleClient
      .from("tasks")
      .update({
        assigned_to: cleaner1Id,
        assigned_at: new Date().toISOString(),
      })
      .eq("id", testTaskId);

    // Verify trigger set status to 'assigned'
    ({ data: task } = await testHelper.serviceRoleClient
      .from("tasks")
      .select("status, assigned_to")
      .eq("id", testTaskId)
      .single());

    expect(task!.status).toBe("assigned");
    expect(task!.assigned_to).toBe(cleaner1Id);
  });

  test("trigger still works for unassignment", async () => {
    // Ensure task is assigned first
    await testHelper.serviceRoleClient
      .from("tasks")
      .update({
        assigned_to: cleaner1Id,
        assigned_at: new Date().toISOString(),
      })
      .eq("id", testTaskId);

    // Unassign the task
    await testHelper.serviceRoleClient
      .from("tasks")
      .update({
        assigned_to: null,
        assigned_at: null,
      })
      .eq("id", testTaskId);

    // Verify trigger set status to 'unassigned'
    const { data: task } = await testHelper.serviceRoleClient
      .from("tasks")
      .select("status, assigned_to")
      .eq("id", testTaskId)
      .single();

    expect(task!.status).toBe("unassigned");
    expect(task!.assigned_to).toBeNull();
  });
});
