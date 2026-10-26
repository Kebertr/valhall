import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RegisteredMemberRoute } from "../auth/registeredMemberRoute";

const { mockAuthFetch } = vi.hoisted(() => ({
  mockAuthFetch: vi.fn(),
}));

vi.mock("../auth/authFetch", () => ({
  authFetch: mockAuthFetch,
}));

function renderRoutes() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/link-member" element={<p>Link member account</p>} />
        <Route element={<RegisteredMemberRoute />}>
          <Route path="/" element={<p>Valhall home</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("RegisteredMemberRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Valhall for a linked member", async () => {
    mockAuthFetch.mockResolvedValueOnce({ ok: true, status: 200 });

    renderRoutes();

    expect(await screen.findByText("Valhall home")).toBeInTheDocument();
    expect(mockAuthFetch).toHaveBeenCalledWith("/api/members/me");
  });

  it("redirects an unlinked Keycloak user to member linking", async () => {
    mockAuthFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    renderRoutes();

    expect(await screen.findByText("Link member account")).toBeInTheDocument();
  });
});
