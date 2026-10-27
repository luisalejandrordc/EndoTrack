import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import App from "./App";

async function openFirstSale() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(
    screen.getAllByRole("button", { name: /modo demostración/i })[0],
  );
  await user.click(screen.getAllByText(/EF-2026-/)[0]);
  return user;
}

test("demo login lands on the sales workspace", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(
    screen.getAllByRole("button", { name: /modo demostración/i })[0],
  );
  expect(screen.getAllByText(/EF-2026-/).length).toBeGreaterThan(0);
});

test("starting a task from the sale detail updates its status", async () => {
  const user = await openFirstSale();
  await user.click(screen.getByRole("tab", { name: /Tareas/ }));
  await user.click(
    screen.getAllByRole("button", { name: /Iniciar tarea/i })[0],
  );
  const dialog = screen.getByRole("dialog");
  await user.click(
    screen
      .getAllByRole("button")
      .filter((b) => dialog.contains(b))
      .find((b) => /Iniciar/i.test(b.textContent || ""))!,
  );
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getAllByText(/Acción en curso/).length).toBeGreaterThan(0);
});

test("a notes draft survives switching tabs", async () => {
  const user = await openFirstSale();
  await user.click(screen.getByRole("tab", { name: /Notas/ }));
  const box = screen.getAllByRole("textbox")[0];
  await user.clear(box);
  await user.type(box, "borrador");
  await user.click(screen.getByRole("tab", { name: /Resumen/ }));
  await user.click(screen.getByRole("tab", { name: /Notas/ }));
  expect(screen.getAllByRole("textbox")[0]).toHaveValue("borrador");
});
