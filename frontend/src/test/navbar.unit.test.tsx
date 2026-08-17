import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Navbar from "../components/Navbar";

const { mockNavigate, mockHasAnyRole } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockHasAnyRole: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../auth/roles", () => ({
  hasAnyRole: mockHasAnyRole,
}));

vi.mock("../auth/LogoutButton", () => ({
  default: ({ className }: { className?: string }) => (
    <button className={className}>Logga ut</button>
  ),
}));

vi.mock("../components/NavbarIdentity", () => ({
  default: () => <div>Navbar identity</div>,
}));

function mockUserRoles(userRoles: string[]) {
  mockHasAnyRole.mockImplementation((allowedRoles: string[]) =>
    allowedRoles.some((role) => userRoles.includes(role)),
  );
}

function getSidebar(container: HTMLElement) {
  const sidebar = container.querySelector(".fixed.top-0.left-0.z-50");

  if (!(sidebar instanceof HTMLElement)) {
    throw new Error("Sidebar was not found");
  }

  return sidebar;
}

describe("Navbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasAnyRole.mockReturnValue(false);
  });

  it("opens and closes the sidebar", async () => {
    const user = userEvent.setup();
    const { container } = render(<Navbar />);
    const sidebar = getSidebar(container);

    expect(sidebar).toHaveClass("-translate-x-full");

    await user.click(screen.getByRole("button", { name: "Öppna meny" }));
    expect(sidebar).toHaveClass("translate-x-0");

    const overlay = container.querySelector(".fixed.inset-0.z-40");
    expect(overlay).toBeInTheDocument();
    await user.click(overlay as HTMLElement);

    expect(sidebar).toHaveClass("-translate-x-full");
  });

  it("navigates from every navigation button", async () => {
    const user = userEvent.setup();
    mockHasAnyRole.mockReturnValue(true);

    const { container } = render(<Navbar />);
    const sidebar = within(getSidebar(container));

    await user.click(sidebar.getByRole("button", { name: "Hem" }));
    await user.click(sidebar.getByLabelText("Add shot from menu"));
    await user.click(sidebar.getByRole("button", { name: "Bli av med bong" }));
    await user.click(sidebar.getByRole("button", { name: "Topplista" }));
    await user.click(sidebar.getByRole("button", { name: "Gudar" }));
    await user.click(sidebar.getByRole("button", { name: "Bongmeister" }));
    await user.click(sidebar.getByRole("button", { name: "Medlemslänkar" }));
    await user.click(sidebar.getByRole("button", { name: "Notiser" }));
    await user.click(sidebar.getByRole("button", { name: "Redigera profil" }));

    expect(mockNavigate).toHaveBeenCalledWith("/");
    expect(mockNavigate).toHaveBeenCalledWith("/add");
    expect(mockNavigate).toHaveBeenCalledWith("/redeem");
    expect(mockNavigate).toHaveBeenCalledWith("/leaderboard");
    expect(mockNavigate).toHaveBeenCalledWith("/gudar");
    expect(mockNavigate).toHaveBeenCalledWith("/bongmeister");
    expect(mockNavigate).toHaveBeenCalledWith("/member-links");
    expect(mockNavigate).toHaveBeenCalledWith("/notifications");
    expect(mockNavigate).toHaveBeenCalledWith("/profile");
  });

  it("shows only Bongmeister navigation for a Bongmeister", () => {
    mockUserRoles(["BONGMEISTER"]);
    render(<Navbar />);

    expect(screen.getByRole("button", { name: "Bongmeister" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Medlemslänkar" })).not.toBeInTheDocument();
  });

  it("shows only Medlemslänkar navigation for an Ordförande", () => {
    mockUserRoles(["ORDFORANDE"]);
    render(<Navbar />);

    expect(screen.getByRole("button", { name: "Medlemslänkar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Bongmeister" })).not.toBeInTheDocument();
  });

  it("shows both protected navigation buttons for an admin", () => {
    mockUserRoles(["ADMIN"]);
    render(<Navbar />);

    expect(screen.getByRole("button", { name: "Bongmeister" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Medlemslänkar" })).toBeInTheDocument();
  });
});
