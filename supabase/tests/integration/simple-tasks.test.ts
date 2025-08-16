import { IntegrationTestHelper } from "./test-utils";

interface Task {
  id: string;
  listing_id: string;
  reservation_id?: string | null;
  task_type: string;
  title: string;
  description?: string | null;
  scheduled_datetime: string;
  status: "unassigned" | "assigned" | "accepted" | "completed" | "cancelled";
  assigned_to?: string | null;
  assigned_by?: string | null;
  assigned_at?: string | null;
  accepted_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateTaskData {
  listing_id: string;
  reservation_id?: string;
  task_type: string;
  title: string;
  description?: string;
  scheduled_datetime: string;
  status?: Task["status"];
}

describe("Simple Tasks Test - Service Role", () => {
  let testHelper: IntegrationTestHelper;
  let testListingId: string;

  beforeAll(async () => {
    testHelper = new IntegrationTestHelper();
  });

  beforeEach(async () => {
    const { listingId } = await testHelper.prepareDatabase();
    testListingId = listingId;
  });

  test("should create a task using service role", async () => {
    const testTask: CreateTaskData = {
      listing_id: testListingId,
      task_type: "cleaning",
      title: "Test Task - Service Role",
      description: "Test task created with service role",
      scheduled_datetime: new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ).toISOString(),
    };

    const { data: task, error } = (await testHelper.serviceRoleClient
      .from("tasks")
      .insert([testTask])
      .select()
      .single()) as { data: Task | null; error: any };

    expect(error).toBeNull();
    expect(task).toBeDefined();
    expect(task?.id).toBeDefined();
    expect(task?.title).toBe(testTask.title);
    expect(task?.status).toBe("unassigned");
    expect(task?.created_at).toBeDefined();
    expect(task?.updated_at).toBeDefined();
  });

  test("should read all tasks", async () => {
    // Create a test task first
    const testTask: CreateTaskData = {
      listing_id: testListingId,
      task_type: "cleaning",
      title: "Test Task - Read All",
      description: "Test task for reading",
      scheduled_datetime: new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ).toISOString(),
    };

    await testHelper.serviceRoleClient.from("tasks").insert([testTask]);

    // Read all tasks
    const { data: tasks, error } = (await testHelper.serviceRoleClient
      .from("tasks")
      .select("*")
      .like("title", "Test Task%")) as { data: Task[] | null; error: any };

    expect(error).toBeNull();
    expect(tasks).toBeDefined();
    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks?.length).toBeGreaterThan(0);
  });

  test("should update a task", async () => {
    // Create a test task first
    const testTask = {
      listing_id: testListingId,
      task_type: "cleaning",
      title: "Test Task - Update",
      description: "Test task for updating",
      scheduled_datetime: new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ).toISOString(),
    };

    const { data: createdTask } = (await testHelper.serviceRoleClient
      .from("tasks")
      .insert([testTask])
      .select()
      .single()) as { data: Task };

    // Update the task
    const { data: updatedTask, error } = (await testHelper.serviceRoleClient
      .from("tasks")
      .update({
        title: "Updated Test Task",
        status: "completed" as const,
        completed_at: new Date().toISOString(),
      })
      .eq("id", createdTask.id)
      .select()
      .single()) as { data: Task | null; error: any };

    expect(error).toBeNull();
    expect(updatedTask?.title).toBe("Updated Test Task");
    expect(updatedTask?.status).toBe("completed");
    expect(updatedTask?.completed_at).toBeDefined();
  });

  test("should delete a task", async () => {
    // Create a test task first
    const testTask: CreateTaskData = {
      listing_id: testListingId,
      task_type: "cleaning",
      title: "Test Task - Delete",
      description: "Test task for deletion",
      scheduled_datetime: new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ).toISOString(),
    };

    const { data: createdTask } = (await testHelper.serviceRoleClient
      .from("tasks")
      .insert([testTask])
      .select()
      .single()) as { data: Task };

    // Delete the task
    const { error } = await testHelper.serviceRoleClient
      .from("tasks")
      .delete()
      .eq("id", createdTask.id);

    expect(error).toBeNull();

    // Verify task is deleted
    const { data: deletedTask } = (await testHelper.serviceRoleClient
      .from("tasks")
      .select("*")
      .eq("id", createdTask.id)
      .single()) as { data: Task | null };

    expect(deletedTask).toBeNull();
  });

  test("should filter tasks by status", async () => {
    const tasks: CreateTaskData[] = [
      {
        listing_id: testListingId,
        task_type: "cleaning",
        title: "Test Task - Unassigned",
        status: "unassigned",
        scheduled_datetime: new Date(
          Date.now() + 24 * 60 * 60 * 1000
        ).toISOString(),
      },
      {
        listing_id: testListingId,
        task_type: "cleaning",
        title: "Test Task - Completed",
        status: "completed",
        scheduled_datetime: new Date(
          Date.now() + 24 * 60 * 60 * 1000
        ).toISOString(),
      },
    ];

    await testHelper.serviceRoleClient.from("tasks").insert(tasks);

    // Filter by status
    const { data: unassignedTasks, error } = (await testHelper.serviceRoleClient
      .from("tasks")
      .select("*")
      .eq("status", "unassigned")
      .like("title", "Test Task%")) as { data: Task[] | null; error: any };

    expect(error).toBeNull();
    expect(unassignedTasks).toBeDefined();
    expect(Array.isArray(unassignedTasks)).toBe(true);
    expect(unassignedTasks?.length).toBe(1);
    expect(unassignedTasks?.[0].status).toBe("unassigned");
  });
});
