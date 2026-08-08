import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const mocks = vi.hoisted(() => ({
  authFetch: vi.fn(),
  getKeycloak: vi.fn(),
}));

vi.mock("./auth/authFetch", () => ({
  authFetch: mocks.authFetch,
}));

vi.mock("./auth/keycloak", () => ({
  getKeycloak: mocks.getKeycloak,
}));

describe("Bongmeister page", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/bongmeister");
    mocks.authFetch.mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            memberId: 1,
            name: "Leo",
            godname: "Loke",
          },
        ]),
        { status: 200 },
      ),
    );
  });

  it("shows the layout and members to a Bongmeister", async () => {
    mocks.getKeycloak.mockReturnValue({
      authenticated: true,
      tokenParsed: {
        realm_access: { roles: ["BONGMEISTER"] },
      },
    });

    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Hantera bongar" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("option", { name: "Leo – Loke" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Antal")).toHaveValue(1);
  });

  it("redirects a member without the Bongmeister role", () => {
    mocks.getKeycloak.mockReturnValue({
      authenticated: true,
      tokenParsed: {
        realm_access: { roles: ["MEMBER"] },
      },
    });

    render(<App />);

    expect(
      screen.queryByRole("heading", { name: "Hantera bongar" }),
    ).not.toBeInTheDocument();
  });
});
