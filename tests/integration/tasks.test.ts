import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { publicEnquirySchema } from "@/lib/validation/enquiry";
import { createTaskSchema, taskListParamsSchema, updateTaskSchema } from "@/lib/validation/tasks";
import { db } from "@/server/db";
import { createTask, getTaskSummary, listEnquiryTasks, listTasks, setTaskStatus, updateTask } from "@/server/services/admin/tasks";
import { createPublicEnquiry } from "@/server/services/public/enquiries";
import { resetDatabase, seedMinimalCatalogue } from "../support/db";
import { actorFor, ctx, seedSystemRoles } from "../support/auth";

const params = (raw: Record<string, string> = {}) => taskListParamsSchema.parse(raw);
const NOW = new Date("2026-11-23T06:30:00Z"); // 12:00 IST

describe("admin tasks", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedMinimalCatalogue();
    await seedSystemRoles();
  });
  afterAll(() => db.$disconnect());

  it("creates, assigns (with a notification) and lists tasks by due bucket", async () => {
    const manager = await actorFor("MANAGER");
    const staff = await actorFor("STAFF");
    await createTask(manager, createTaskSchema.parse({ title: "Call venue", assigneeId: staff.userId, dueAt: "2026-11-22T18:00" }));
    await createTask(manager, createTaskSchema.parse({ title: "Send rider", assigneeId: staff.userId, dueAt: "2026-11-23T17:00" }));
    await createTask(manager, createTaskSchema.parse({ title: "Book travel", dueAt: "2026-11-27T10:00" }));
    await createTask(manager, createTaskSchema.parse({ title: "Someday" }));

    const note = await db.notification.findFirstOrThrow({ where: { recipientId: staff.userId } });
    expect(note).toMatchObject({ type: "task.assigned", body: "Call venue" });

    const all = await listTasks(staff, params(), NOW);
    expect(all.items.map((t) => [t.title, t.dueState])).toEqual([
      ["Call venue", "overdue"],
      ["Send rider", "today"],
      ["Book travel", "upcoming"],
      ["Someday", "none"],
    ]);
    expect((await listTasks(staff, params({ assignee: "me" }), NOW)).total).toBe(2);
    expect((await listTasks(staff, params({ assignee: "unassigned" }), NOW)).total).toBe(2);
    expect((await listTasks(staff, params({ due: "overdue" }), NOW)).items.map((t) => t.title)).toEqual(["Call venue"]);
    expect((await listTasks(staff, params({ due: "today" }), NOW)).items.map((t) => t.title)).toEqual(["Send rider"]);
    expect((await listTasks(staff, params({ due: "week" }), NOW)).total).toBe(3);

    const summary = await getTaskSummary(staff, NOW);
    expect(summary).toMatchObject({ mineOverdue: 1, mineDueToday: 1, mineOpen: 2, unassignedOpen: 2 });
  });

  it("refuses assignees who can't work tasks", async () => {
    const manager = await actorFor("MANAGER");
    const other = await actorFor("STAFF");
    await db.user.update({ where: { id: other.userId }, data: { status: "DISABLED" } });
    await expect(createTask(manager, createTaskSchema.parse({ title: "Nope", assigneeId: other.userId }))).rejects.toMatchObject({ code: "invalid_assignee" });
  });

  it("completes and re-opens with optimistic concurrency", async () => {
    const staff = await actorFor("STAFF");
    const { id } = await createTask(staff, createTaskSchema.parse({ title: "Confirm sound check" }));
    await setTaskStatus(staff, { taskId: id, from: "OPEN", to: "DONE" }, NOW);
    expect((await db.task.findUniqueOrThrow({ where: { id } })).completedAt).toEqual(NOW);
    await expect(setTaskStatus(staff, { taskId: id, from: "OPEN", to: "IN_PROGRESS" })).rejects.toMatchObject({ code: "conflict" });
    await expect(setTaskStatus(staff, { taskId: id, from: "DONE", to: "IN_PROGRESS" })).rejects.toMatchObject({ code: "invalid_transition" });
    expect((await listTasks(staff, params(), NOW)).total).toBe(0);
    expect((await listTasks(staff, params({ state: "done" }), NOW)).total).toBe(1);
    await setTaskStatus(staff, { taskId: id, from: "DONE", to: "OPEN" });
    expect((await db.task.findUniqueOrThrow({ where: { id } })).completedAt).toBeNull();
  });

  it("links tasks to enquiries and notifies on reassignment only", async () => {
    const staff = await actorFor("STAFF");
    const manager = await actorFor("MANAGER");
    const input = publicEnquirySchema("2026-01-01").parse({
      eventType: "WEDDING",
      eventDate: "2027-02-14",
      eventCity: "Jaipur",
      name: "Kabir Rao",
      email: "kabir@example.invalid",
      phoneCountryCode: "+91",
      phone: "9876512345",
      consent: true,
      formToken: "unused",
      source: "BOOKING_FORM",
    });
    const { reference } = await createPublicEnquiry(input, ctx);
    const enquiry = await db.enquiry.findUniqueOrThrow({ where: { reference } });
    const { id } = await createTask(staff, createTaskSchema.parse({ title: "Share shortlist", enquiryId: enquiry.id }));
    expect((await listEnquiryTasks(staff, enquiry.id)).map((t) => t.id)).toEqual([id]);

    const before = await db.notification.count({ where: { recipientId: manager.userId } });
    await updateTask(staff, updateTaskSchema.parse({ taskId: id, title: "Share shortlist", assigneeId: manager.userId }));
    await updateTask(staff, updateTaskSchema.parse({ taskId: id, title: "Share shortlist v2", assigneeId: manager.userId }));
    expect(await db.notification.count({ where: { recipientId: manager.userId } })).toBe(before + 1);
    const n = await db.notification.findFirstOrThrow({ where: { recipientId: manager.userId, type: "task.assigned" } });
    expect(n.href).toBe(`/admin/enquiries/${enquiry.id}`);
  });
});
