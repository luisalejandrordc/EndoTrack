import { describe, expect, it } from "vitest";
import { buildTasks, demoEmployees, demoSales } from "../../shared/demo/data";
import type { Sale } from "../../shared/types";
import { applySaleAction, validateSaleAction } from "./saleActions";

const input = {
  reason: "",
  cancelCategory: "customer_withdrew",
  reassigneeId: "",
};
const base = (): Sale => ({
  ...demoSales[0],
  state: "active",
  notes: "",
  tasks: buildTasks(2),
});

describe("validateSaleAction", () => {
  it("requires a reason to cancel or reopen", () => {
    expect(validateSaleAction("cancel-sale", input)?.tone).toBe("error");
    expect(validateSaleAction("reopen-sale", input)?.tone).toBe("error");
    expect(
      validateSaleAction("cancel-sale", {
        ...input,
        reason: "Cliente desistió",
      }),
    ).toBeNull();
  });

  it("requires an advisor to reassign", () => {
    expect(validateSaleAction("reassign-sale", input)).not.toBeNull();
    expect(
      validateSaleAction("reassign-sale", { ...input, reassigneeId: "x" }),
    ).toBeNull();
  });

  it("lets task transitions through without extra input", () => {
    expect(validateSaleAction("start-task", input)).toBeNull();
    expect(validateSaleAction("complete-task", input)).toBeNull();
  });
});

describe("applySaleAction", () => {
  it("starts only an eligible task", () => {
    const sale = base();
    const started = applySaleAction(sale, "start-task", 3, input, []);
    expect(started.tasks[2].status).toBe("in_progress");
    const untouched = applySaleAction(sale, "start-task", 5, input, []);
    expect(untouched.tasks[4].status).toBe("pending");
  });

  it("completing a task enables the next one", () => {
    const sale = { ...base(), tasks: buildTasks(2, 3) };
    const done = applySaleAction(sale, "complete-task", 3, input, []);
    expect(done.tasks[2].status).toBe("completed");
    expect(done.tasks[3].status).toBe("eligible");
    expect(done.state).toBe("active");
  });

  it("completing task 13 completes the sale", () => {
    const sale = { ...base(), tasks: buildTasks(12, 13) };
    expect(applySaleAction(sale, "complete-task", 13, input, []).state).toBe(
      "completed",
    );
  });

  it("cancel and reopen record the reason in the notes", () => {
    const cancelled = applySaleAction(
      base(),
      "cancel-sale",
      undefined,
      { ...input, reason: "Sin financiamiento" },
      [],
    );
    expect(cancelled.state).toBe("cancelled");
    expect(cancelled.notes).toContain("Sin financiamiento");
    const reopened = applySaleAction(
      cancelled,
      "reopen-sale",
      undefined,
      { ...input, reason: "Cliente regresó" },
      [],
    );
    expect(reopened.state).toBe("active");
    expect(reopened.notes).toContain("Cliente regresó");
  });

  it("reassigns to a known employee and ignores unknown ones", () => {
    const advisor = demoEmployees.find((e) => e.role === "sales_advisor")!;
    const moved = applySaleAction(
      base(),
      "reassign-sale",
      undefined,
      { ...input, reassigneeId: advisor.id },
      demoEmployees,
    );
    expect(moved.advisorId).toBe(advisor.id);
    const same = base();
    expect(
      applySaleAction(
        same,
        "reassign-sale",
        undefined,
        { ...input, reassigneeId: "missing" },
        demoEmployees,
      ),
    ).toEqual(same);
  });
});
