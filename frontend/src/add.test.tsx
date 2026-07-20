import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AddShot from "./pages/Add";
import { authFetch } from "./auth/authFetch";

vi.mock("./auth/authFetch", () => ({
  authFetch: vi.fn(),
}));

describe("AddShot", () => {
  it("submits the add shot form", async () => {
    const user = userEvent.setup();

    const authFetchMock = vi.mocked(authFetch);

    authFetchMock.mockImplementation((input) => {
      if (input === "/api/members/shot-targets") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: "550e8400-e29b-41d4-a716-446655440000",
                name: "Rasmus",
                godname: "Odin",
                avatarUrl: null,
              },
            ]),
        } as Response);
      }

      if (input === "/api/add/recent") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        } as Response);
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ok: true, message: "Added shot" }),
      } as Response);
    });

    render(
      <MemoryRouter>
        <AddShot />
      </MemoryRouter>,
    );

    await user.type(
      await screen.findByPlaceholderText(/sök efter namn/i),
      "Rasmus",
    );
    await user.click(screen.getByRole("button", { name: /odin, rasmus/i }));
    await user.clear(screen.getByRole("spinbutton"));
    await user.type(screen.getByRole("spinbutton"), "5");
    await user.type(screen.getByPlaceholderText(/anledning/i), "Testing");

    await user.click(screen.getByRole("button", { name: /ge bong/i }));

    expect(authFetchMock).toHaveBeenCalledWith("/api/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Id: "550e8400-e29b-41d4-a716-446655440000",
        amount: 5,
        reason: "Testing",
      }),
    });

    vi.unstubAllGlobals();
  });

  it("loads the next three recent activities when requested", async () => {
    const user = userEvent.setup();
    const authFetchMock = vi.mocked(authFetch);
    const activities = Array.from({ length: 5 }, (_, index) => ({
      id: `shot-${index + 1}`,
      fromName: `Avsändare ${index + 1}`,
      toName: `Mottagare ${index + 1}`,
      amount: 1,
      reason: `Anledning ${index + 1}`,
      createdAt: new Date(2026, 0, index + 1).toISOString(),
    }));

    authFetchMock.mockImplementation((input) => {
      const page =
        input === "/api/add/recent"
          ? activities.slice(0, 3)
          : input === "/api/add/recent?skip=3"
            ? activities.slice(3)
            : [];

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(page),
      } as Response);
    });

    render(
      <MemoryRouter>
        <AddShot />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Anledning 1")).toBeInTheDocument();
    expect(screen.getByText("Anledning 3")).toBeInTheDocument();
    expect(screen.queryByText("Anledning 4")).not.toBeInTheDocument();

    const alert = vi.spyOn(window, "alert").mockImplementation(() => undefined);
    await user.click(screen.getByRole("button", { name: "Visa fler" }));

    expect(screen.getByText("Anledning 4")).toBeInTheDocument();
    expect(screen.getByText("Anledning 5")).toBeInTheDocument();
    expect(authFetchMock).toHaveBeenCalledWith("/api/add/recent?skip=3");
    expect(alert).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Visa fler" }));

    expect(authFetchMock).toHaveBeenCalledWith("/api/add/recent?skip=5");
    expect(alert).toHaveBeenCalledWith("Det finns inga fler aktiviteter.");
    expect(
      screen.getByRole("button", { name: "Visa fler" }),
    ).toBeInTheDocument();
  });
});
