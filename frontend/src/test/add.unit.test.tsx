import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AddShot from "../pages/Add";

const { mockNavigate, mockAuthFetch, mockKeycloak } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockAuthFetch: vi.fn(),
  mockKeycloak: {
    tokenParsed: {
      realm_access: {
        roles: [] as string[],
      },
    },
  },
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

vi.mock("../auth/authFetch", () => ({
  authFetch: mockAuthFetch,
}));

vi.mock("../auth/keycloak", () => ({
  getKeycloak: () => mockKeycloak,
}));

vi.mock("../components/Navbar", () => ({
  default: () => <div data-testid="navbar">Navbar</div>,
}));

type Member = {
  id: string;
  name: string;
  godname: string;
  avatarUrl: string | null;
};

type RecentActivity = {
  id: string;
  fromName: string;
  toName: string;
  amount: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "DENIED";
  acceptedByName: string | null;
  createdAt: string;
};

function jsonResponse(
  body: unknown,
  options?: {
    ok?: boolean;
    status?: number;
  },
) {
  return {
    ok: options?.ok ?? true,
    status: options?.status ?? 200,
    json: vi.fn().mockResolvedValue(body),
  };
}

function createMember(index: number, overrides?: Partial<Member>): Member {
  return {
    id: `member-${index}`,
    name: `Member ${index}`,
    godname: `God ${index}`,
    avatarUrl: null,
    ...overrides,
  };
}

function createActivity(
  index: number,
  overrides?: Partial<RecentActivity>,
): RecentActivity {
  return {
    id: `activity-${index}`,
    fromName: `From ${index}`,
    toName: `To ${index}`,
    amount: 2,
    reason: `Reason ${index}`,
    status: "APPROVED",
    acceptedByName: "Bongmeister",
    createdAt: `2026-08-10T08:${String(index).padStart(2, "0")}:00.000Z`,
    ...overrides,
  };
}

function exactParagraphText(expectedText: string) {
  return (_content: string, element: Element | null) =>
    element?.tagName.toLowerCase() === "p" &&
    element.textContent === expectedText;
}

function mockUserRoles(userRoles: string[]) {
  mockKeycloak.tokenParsed = {
    realm_access: {
      roles: userRoles,
    },
  };
}

function mockInitialRequests(options?: {
  members?: Member[];
  activities?: RecentActivity[];
}) {
  const members = options?.members ?? [];
  const activities = options?.activities ?? [];

  mockAuthFetch.mockImplementation(async (url: string) => {
    if (url === "/api/members/shot-targets") {
      return jsonResponse(members);
    }

    if (url === "/api/add/recent") {
      return jsonResponse(activities);
    }

    throw new Error(`Unexpected authFetch call: ${url}`);
  });
}

describe("AddShot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRoles([]);
  });

  it("fetches members and recent activity when page loads", async () => {
    const createdAt = "2026-08-10T08:00:00.000Z";

    mockInitialRequests({
      members: [
        createMember(1, {
          name: "Rasmus",
          godname: "Odin",
        }),
      ],
      activities: [
        createActivity(1, {
          fromName: "Anna",
          toName: "Bea",
          amount: 2,
          reason: "Kom sent",
          status: "APPROVED",
          acceptedByName: "Rasmus",
          createdAt,
        }),
      ],
    });

    render(<AddShot />);

    expect(screen.getByTestId("navbar")).toBeInTheDocument();

    expect(await screen.findByPlaceholderText("Sök efter namn...")).toBeEnabled();

    expect(
      await screen.findByText(exactParagraphText("Anna gav Bea 2 bongar")),
    ).toBeInTheDocument();

    expect(screen.getByText("Kom sent")).toBeInTheDocument();
    expect(screen.getByText("OK av Rasmus")).toBeInTheDocument();

    expect(
      screen.getByText(new Date(createdAt).toLocaleString("sv-SE")),
    ).toBeInTheDocument();

    expect(mockAuthFetch).toHaveBeenCalledWith("/api/members/shot-targets");
    expect(mockAuthFetch).toHaveBeenCalledWith("/api/add/recent");
  });

  it("shows empty recent activity text when there are no activities", async () => {
    mockInitialRequests({
      members: [],
      activities: [],
    });

    render(<AddShot />);

    expect(
      await screen.findByText("Inga bongar har delats ut ännu."),
    ).toBeInTheDocument();
  });

  it("shows member fetch error and disables member input", async () => {
    mockAuthFetch.mockImplementation(async (url: string) => {
      if (url === "/api/members/shot-targets") {
        return jsonResponse(null, {
          ok: false,
          status: 500,
        });
      }

      if (url === "/api/add/recent") {
        return jsonResponse([]);
      }

      throw new Error(`Unexpected authFetch call: ${url}`);
    });

    render(<AddShot />);

    expect(await screen.findByText("Failed to fetch members")).toBeInTheDocument();

    expect(screen.getByPlaceholderText("Sök efter namn...")).toBeDisabled();
  });

  it("shows recent activity fetch error", async () => {
    mockAuthFetch.mockImplementation(async (url: string) => {
      if (url === "/api/members/shot-targets") {
        return jsonResponse([]);
      }

      if (url === "/api/add/recent") {
        return jsonResponse(null, {
          ok: false,
          status: 500,
        });
      }

      throw new Error(`Unexpected authFetch call: ${url}`);
    });

    render(<AddShot />);

    expect(
      await screen.findByText("Failed to fetch recent activity"),
    ).toBeInTheDocument();
  });

  it("filters member suggestions and selects a member", async () => {
    const user = userEvent.setup();

    mockInitialRequests({
      members: [
        createMember(1, {
          name: "Oskar",
          godname: "Odin",
        }),
        createMember(2, {
          name: "Thorsten",
          godname: "Thor",
        }),
      ],
      activities: [],
    });

    render(<AddShot />);

    const memberInput = await screen.findByPlaceholderText("Sök efter namn...");

    await user.type(memberInput, "odi");

    const memberOption = screen.getByRole("button", {
      name: "Odin, Oskar",
    });

    await user.click(memberOption);

    expect(memberInput).toHaveValue("Odin (Oskar)");
    expect(
      screen.queryByRole("button", { name: "Thor, Thorsten" }),
    ).not.toBeInTheDocument();
  });

  it("shows no matching members text when search has no result", async () => {
    const user = userEvent.setup();

    mockInitialRequests({
      members: [
        createMember(1, {
          name: "Oskar",
          godname: "Odin",
        }),
      ],
      activities: [],
    });

    render(<AddShot />);

    await user.type(await screen.findByPlaceholderText("Sök efter namn..."), "zzz");

    expect(screen.getByText("Inga matchande medlemmar.")).toBeInTheDocument();
  });

  it("limits member suggestions to 8 matches", async () => {
    const user = userEvent.setup();

    mockInitialRequests({
      members: Array.from({ length: 10 }, (_, index) =>
        createMember(index, {
          name: `Match Name ${index}`,
          godname: `Match God ${index}`,
        }),
      ),
      activities: [],
    });

    render(<AddShot />);

    await user.type(await screen.findByPlaceholderText("Sök efter namn..."), "match");

    const suggestions = screen.getAllByRole("button", {
      name: /Match God/i,
    });

    expect(suggestions).toHaveLength(8);
  });

  it("disables submit button until a member is selected and amount is valid", async () => {
    const user = userEvent.setup();

    mockInitialRequests({
      members: [
        createMember(1, {
          name: "Oskar",
          godname: "Odin",
        }),
      ],
      activities: [],
    });

    render(<AddShot />);

    const submitButton = screen.getByRole("button", { name: "Ge bong" });

    expect(submitButton).toBeDisabled();

    await user.type(await screen.findByPlaceholderText("Sök efter namn..."), "odin");
    await user.click(screen.getByRole("button", { name: "Odin, Oskar" }));

    expect(submitButton).toBeEnabled();

    const amountInput = screen.getByRole("spinbutton");

    await user.clear(amountInput);
    await user.type(amountInput, "0");

    expect(submitButton).toBeDisabled();
  });

  it("submits a new shot and refreshes recent activity", async () => {
    const user = userEvent.setup();

    const members = [
      createMember(1, {
        id: "member-1",
        name: "Oskar",
        godname: "Odin",
      }),
    ];

    let recentCallCount = 0;

    mockAuthFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url === "/api/members/shot-targets") {
        return jsonResponse(members);
      }

      if (url === "/api/add/recent") {
        recentCallCount += 1;

        if (recentCallCount === 1) {
          return jsonResponse([]);
        }

        return jsonResponse([
          createActivity(1, {
            fromName: "Rasmus",
            toName: "Odin",
            amount: 3,
            reason: "Test reason",
            status: "PENDING",
            acceptedByName: null,
          }),
        ]);
      }

      if (url === "/api/add") {
        expect(options?.method).toBe("POST");
        expect(options?.headers).toEqual({
          "Content-Type": "application/json",
        });
        expect(JSON.parse(String(options?.body))).toEqual({
          Id: "member-1",
          amount: 3,
          reason: "Test reason",
        });

        return jsonResponse({
          id: "created-shot",
        });
      }

      throw new Error(`Unexpected authFetch call: ${url}`);
    });

    render(<AddShot />);

    await user.type(await screen.findByPlaceholderText("Sök efter namn..."), "odin");
    await user.click(screen.getByRole("button", { name: "Odin, Oskar" }));

    const amountInput = screen.getByRole("spinbutton");
    await user.clear(amountInput);
    await user.type(amountInput, "3");

    await user.type(screen.getByPlaceholderText("Anledning..."), "Test reason");

    await user.click(screen.getByRole("button", { name: "Ge bong" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Shot added.");

    expect(
      await screen.findByText(exactParagraphText("Rasmus gav Odin 3 bongar")),
    ).toBeInTheDocument();

    expect(mockAuthFetch).toHaveBeenCalledWith(
      "/api/add",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("shows submit error when add shot request fails", async () => {
    const user = userEvent.setup();

    mockAuthFetch.mockImplementation(async (url: string) => {
      if (url === "/api/members/shot-targets") {
        return jsonResponse([
          createMember(1, {
            id: "member-1",
            name: "Oskar",
            godname: "Odin",
          }),
        ]);
      }

      if (url === "/api/add/recent") {
        return jsonResponse([]);
      }

      if (url === "/api/add") {
        return jsonResponse(
          {
            message: "Du får inte ge bong till den medlemmen.",
          },
          {
            ok: false,
            status: 400,
          },
        );
      }

      throw new Error(`Unexpected authFetch call: ${url}`);
    });

    render(<AddShot />);

    await user.type(await screen.findByPlaceholderText("Sök efter namn..."), "odin");
    await user.click(screen.getByRole("button", { name: "Odin, Oskar" }));
    await user.click(screen.getByRole("button", { name: "Ge bong" }));

    expect(
      await screen.findByText("Du får inte ge bong till den medlemmen."),
    ).toBeInTheDocument();
  });

  it("renders status text for pending, approved, and denied activities", async () => {
    mockInitialRequests({
      activities: [
        createActivity(1, {
          status: "PENDING",
          acceptedByName: null,
        }),
        createActivity(2, {
          status: "APPROVED",
          acceptedByName: "Rasmus",
        }),
        createActivity(3, {
          status: "DENIED",
          acceptedByName: "Oskar",
        }),
      ],
    });

    render(<AddShot />);

    expect(await screen.findByText("Väntar")).toBeInTheDocument();
    expect(screen.getByText("OK av Rasmus")).toBeInTheDocument();
    expect(screen.getByText("Nekad av Oskar")).toBeInTheDocument();
  });

  it("loads more recent activity with skip equal to current activity count", async () => {
    const user = userEvent.setup();

    mockAuthFetch.mockImplementation(async (url: string) => {
      if (url === "/api/members/shot-targets") {
        return jsonResponse([]);
      }

      if (url === "/api/add/recent") {
        return jsonResponse([
          createActivity(1, { id: "activity-1" }),
          createActivity(2, { id: "activity-2" }),
        ]);
      }

      if (url === "/api/add/recent?skip=2") {
        return jsonResponse([createActivity(3, { id: "activity-3" })]);
      }

      throw new Error(`Unexpected authFetch call: ${url}`);
    });

    const { container } = render(<AddShot />);

    await waitFor(() => {
      expect(container.querySelectorAll("article")).toHaveLength(2);
    });

    await user.click(screen.getByRole("button", { name: "Visa fler" }));

    await waitFor(() => {
      expect(container.querySelectorAll("article")).toHaveLength(3);
    });

    expect(mockAuthFetch).toHaveBeenCalledWith("/api/add/recent?skip=2");
  });

  it("shows alert when there are no more activities to load", async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => undefined);

    mockAuthFetch.mockImplementation(async (url: string) => {
      if (url === "/api/members/shot-targets") {
        return jsonResponse([]);
      }

      if (url === "/api/add/recent") {
        return jsonResponse([createActivity(1)]);
      }

      if (url === "/api/add/recent?skip=1") {
        return jsonResponse([]);
      }

      throw new Error(`Unexpected authFetch call: ${url}`);
    });

    render(<AddShot />);

    await screen.findByText("From 1");

    await user.click(screen.getByRole("button", { name: "Visa fler" }));

    expect(alertSpy).toHaveBeenCalledWith("Det finns inga fler aktiviteter.");

    alertSpy.mockRestore();
  });

  it("shows load more error when loading more activities fails", async () => {
    const user = userEvent.setup();

    mockAuthFetch.mockImplementation(async (url: string) => {
      if (url === "/api/members/shot-targets") {
        return jsonResponse([]);
      }

      if (url === "/api/add/recent") {
        return jsonResponse([createActivity(1)]);
      }

      if (url === "/api/add/recent?skip=1") {
        return jsonResponse(null, {
          ok: false,
          status: 500,
        });
      }

      throw new Error(`Unexpected authFetch call: ${url}`);
    });

    render(<AddShot />);

    await screen.findByText("From 1");

    await user.click(screen.getByRole("button", { name: "Visa fler" }));

    expect(
      await screen.findByText("Failed to fetch recent activity"),
    ).toBeInTheDocument();
  });

  it("shows moderation buttons for BONGMEISTER on pending activity", async () => {
    mockUserRoles(["BONGMEISTER"]);

    mockInitialRequests({
      activities: [
        createActivity(1, {
          status: "PENDING",
          acceptedByName: null,
        }),
      ],
    });

    render(<AddShot />);

    expect(await screen.findByText("Väntar")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Godkänn" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ändra" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Neka" })).toBeInTheDocument();
  });

  it("hides moderation buttons for regular user", async () => {
    mockUserRoles([]);

    mockInitialRequests({
      activities: [
        createActivity(1, {
          status: "PENDING",
          acceptedByName: null,
        }),
      ],
    });

    render(<AddShot />);

    expect(await screen.findByText("Väntar")).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: "Godkänn" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ändra" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Neka" })).not.toBeInTheDocument();
  });

  it("approves a pending activity as bongmeister", async () => {
    const user = userEvent.setup();

    mockUserRoles(["BONGMEISTER"]);

    mockAuthFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url === "/api/members/shot-targets") {
        return jsonResponse([]);
      }

      if (url === "/api/add/recent") {
        return jsonResponse([
          createActivity(1, {
            id: "activity-1",
            amount: 2,
            reason: "Old reason",
            status: "PENDING",
            acceptedByName: null,
          }),
        ]);
      }

      if (url === "/api/bongmeister/activity-1") {
        expect(options?.method).toBe("PATCH");
        expect(options?.headers).toEqual({
          "Content-Type": "application/json",
        });
        expect(JSON.parse(String(options?.body))).toEqual({
          action: "APPROVE",
        });

        return jsonResponse(
          createActivity(1, {
            id: "activity-1",
            amount: 2,
            reason: "Old reason",
            status: "APPROVED",
            acceptedByName: "Bongmeister",
          }),
        );
      }

      throw new Error(`Unexpected authFetch call: ${url}`);
    });

    render(<AddShot />);

    await screen.findByText("Väntar");

    await user.click(screen.getByRole("button", { name: "Godkänn" }));

    expect(await screen.findByText("OK")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Godkänn" })).not.toBeInTheDocument();
    });
  });

  it("edits amount and approves a pending activity as bongmeister", async () => {
    const user = userEvent.setup();
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("5");

    mockUserRoles(["BONGMEISTER"]);

    mockAuthFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url === "/api/members/shot-targets") {
        return jsonResponse([]);
      }

      if (url === "/api/add/recent") {
        return jsonResponse([
          createActivity(1, {
            id: "activity-1",
            amount: 2,
            reason: "Old reason",
            status: "PENDING",
            acceptedByName: null,
          }),
        ]);
      }

      if (url === "/api/bongmeister/activity-1") {
        expect(options?.method).toBe("PATCH");
        expect(JSON.parse(String(options?.body))).toEqual({
          action: "APPROVE",
          amount: 5,
        });

        return jsonResponse(
          createActivity(1, {
            id: "activity-1",
            amount: 5,
            reason: "Old reason",
            status: "APPROVED",
            acceptedByName: "Bongmeister",
          }),
        );
      }

      throw new Error(`Unexpected authFetch call: ${url}`);
    });

    render(<AddShot />);

    await screen.findByText("Väntar");

    await user.click(screen.getByRole("button", { name: "Ändra" }));

    expect(promptSpy).toHaveBeenCalledWith("Antal", "2");

    expect(
      await screen.findByText(exactParagraphText("From 1 gav To 1 5 bongar")),
    ).toBeInTheDocument();

    promptSpy.mockRestore();
  });

  it("does not approve edited activity when prompt is cancelled", async () => {
    const user = userEvent.setup();
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue(null);

    mockUserRoles(["BONGMEISTER"]);

    mockInitialRequests({
      activities: [
        createActivity(1, {
          id: "activity-1",
          amount: 2,
          status: "PENDING",
          acceptedByName: null,
        }),
      ],
    });

    render(<AddShot />);

    await screen.findByText("Väntar");

    await user.click(screen.getByRole("button", { name: "Ändra" }));

    expect(promptSpy).toHaveBeenCalledWith("Antal", "2");

    expect(mockAuthFetch).not.toHaveBeenCalledWith(
      "/api/bongmeister/activity-1",
      expect.anything(),
    );

    promptSpy.mockRestore();
  });

  it("shows alert when edited amount is invalid", async () => {
    const user = userEvent.setup();
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("0");
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => undefined);

    mockUserRoles(["BONGMEISTER"]);

    mockInitialRequests({
      activities: [
        createActivity(1, {
          id: "activity-1",
          amount: 2,
          status: "PENDING",
          acceptedByName: null,
        }),
      ],
    });

    render(<AddShot />);

    await screen.findByText("Väntar");

    await user.click(screen.getByRole("button", { name: "Ändra" }));

    expect(alertSpy).toHaveBeenCalledWith("Antal måste vara ett heltal på minst 1.");

    expect(mockAuthFetch).not.toHaveBeenCalledWith(
      "/api/bongmeister/activity-1",
      expect.anything(),
    );

    promptSpy.mockRestore();
    alertSpy.mockRestore();
  });

  it("rejects a pending activity as bongmeister", async () => {
    const user = userEvent.setup();

    mockUserRoles(["BONGMEISTER"]);

    mockAuthFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url === "/api/members/shot-targets") {
        return jsonResponse([]);
      }

      if (url === "/api/add/recent") {
        return jsonResponse([
          createActivity(1, {
            id: "activity-1",
            status: "PENDING",
            acceptedByName: null,
          }),
        ]);
      }

      if (url === "/api/bongmeister/activity-1") {
        expect(options?.method).toBe("PATCH");
        expect(JSON.parse(String(options?.body))).toEqual({
          action: "REJECT",
        });

        return jsonResponse(
          createActivity(1, {
            id: "activity-1",
            status: "DENIED",
            acceptedByName: "Bongmeister",
          }),
        );
      }

      throw new Error(`Unexpected authFetch call: ${url}`);
    });

    render(<AddShot />);

    await screen.findByText("Väntar");

    await user.click(screen.getByRole("button", { name: "Neka" }));

    expect(await screen.findByText("Nekad")).toBeInTheDocument();
  });

  it("shows alert when moderation request fails", async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => undefined);

    mockUserRoles(["BONGMEISTER"]);

    mockAuthFetch.mockImplementation(async (url: string) => {
      if (url === "/api/members/shot-targets") {
        return jsonResponse([]);
      }

      if (url === "/api/add/recent") {
        return jsonResponse([
          createActivity(1, {
            id: "activity-1",
            status: "PENDING",
            acceptedByName: null,
          }),
        ]);
      }

      if (url === "/api/bongmeister/activity-1") {
        return jsonResponse(
          {
            message: "Du får inte hantera den här bongen.",
          },
          {
            ok: false,
            status: 403,
          },
        );
      }

      throw new Error(`Unexpected authFetch call: ${url}`);
    });

    render(<AddShot />);

    await screen.findByText("Väntar");

    await user.click(screen.getByRole("button", { name: "Godkänn" }));

    expect(alertSpy).toHaveBeenCalledWith("Du får inte hantera den här bongen.");

    alertSpy.mockRestore();
  });
});