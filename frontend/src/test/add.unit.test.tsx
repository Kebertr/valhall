import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AddPenalty from "../pages/Add";

const { authFetch, navigate, keycloak } = vi.hoisted(() => ({
  authFetch: vi.fn(),
  navigate: vi.fn(),
  keycloak: {
    tokenParsed: { realm_access: { roles: [] as string[] } },
    logout: vi.fn(),
  },
}));
vi.mock("../auth/authFetch", () => ({ authFetch }));
vi.mock("../auth/keycloak", () => ({ getKeycloak: () => keycloak }));
vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  )),
  useNavigate: () => navigate,
}));

type Activity = {
  id: string;
  fromName: string;
  toName: string;
  amount: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "DENIED";
  acceptedByName: string | null;
  createdAt: string;
};
const member = {
  id: "member-1",
  name: "Rasmus Kebert",
  godname: "Odin",
  avatarUrl: null,
};
const activity: Activity = {
  id: "activity-1",
  fromName: "Anna",
  toName: "Odin",
  amount: 2,
  reason: "Kom sent",
  status: "PENDING",
  acceptedByName: null,
  createdAt: "2026-08-10T08:00:00Z",
};
const ok = (body: unknown, successful = true) => ({
  ok: successful,
  json: vi.fn().mockResolvedValue(body),
});
const page = (
  items: Activity[] = [],
  nextSkip = items.length,
  hasMore = false,
) => ({ returnPenalties: items, nextSkip, hasMore });

function arrange(
  members = [member],
  items: Activity[] = [],
  addResult: unknown = activity,
) {
  authFetch.mockImplementation(async (url: string) => {
    if (url === "/api/members/me")
      return ok({ name: "Test User", avatarUrl: null, status: "" });
    if (url === "/api/members/penalty-targets") return ok(members);
    if (url === "/api/add/recent") return ok(page(items));
    if (url === "/api/add") return ok(addResult);
    throw new Error(`Unexpected request : ${url}`);
  });
}
async function select(user: ReturnType<typeof userEvent.setup>) {
  const input = await screen.findByPlaceholderText("Sök efter namn...");
  await user.type(input, "Odin");
  await user.click(screen.getByRole("button", { name: "Odin, Rasmus Kebert" }));
  return input;
}
beforeEach(() => {
  vi.restoreAllMocks();
  authFetch.mockReset();
  navigate.mockReset();
  keycloak.tokenParsed.realm_access.roles = [];
});

describe("Fetch members", () => {
  it("fetches penalty targets when the page loads", async () => {
    arrange();
    render(<AddPenalty />);
    await waitFor(() =>
      expect(authFetch).toHaveBeenCalledWith("/api/members/penalty-targets"),
    );
  });
  it("shows an error and disables member search when penalty targets cannot be loaded", async () => {
    arrange();
    authFetch.mockImplementation(async (url: string) => {
      if (url === "/api/members/penalty-targets") return ok(null, false);
      if (url === "/api/add/recent") return ok(page());
      if (url === "/api/members/me")
        return ok({ name: "Test User", avatarUrl: null, status: "" });
      throw new Error(url);
    });
    render(<AddPenalty />);
    expect(
      await screen.findByText("Kunde inte hämta alla gudar som kan få straff"),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Sök efter namn...")).toBeDisabled();
  });
});

describe("Recent activity", () => {
  it("fetches recent activity when the page loads", async () => {
    arrange();
    render(<AddPenalty />);
    await waitFor(() =>
      expect(authFetch).toHaveBeenCalledWith("/api/add/recent"),
    );
  });
  it("renders activities returned by the recent activity endpoint", async () => {
    arrange(
      [member],
      [{ ...activity, status: "APPROVED", acceptedByName: "Rasmus" }],
    );
    render(<AddPenalty />);
    const card = await screen.findByRole("article");
    for (const text of ["Anna", "Odin", "Kom sent", "OK av Rasmus"])
      expect(within(card).getByText(text)).toBeInTheDocument();
    expect(within(card).getByText(/2 bongar/)).toBeInTheDocument();
  });
  it("uses bong for amount one and bongar for multiple", async () => {
    arrange(
      [member],
      [
        { ...activity, id: "1", amount: 1 },
        { ...activity, id: "2" },
      ],
    );
    render(<AddPenalty />);
    expect(await screen.findByText(/1 bong$/)).toBeInTheDocument();
    expect(screen.getByText(/2 bongar$/)).toBeInTheDocument();
  });
  it("does not render an activity reason when reason is empty", async () => {
    arrange([member], [{ ...activity, reason: "" }]);
    render(<AddPenalty />);
    const card = await screen.findByRole("article");
    expect(within(card).getByText(/2 bongar/)).toBeInTheDocument();
    expect(within(card).queryByText("Kom sent")).not.toBeInTheDocument();
  });
  it.each([
    ["PENDING", null, "Väntar"],
    ["APPROVED", null, "OK"],
    ["APPROVED", "Rasmus", "OK av Rasmus"],
    ["DENIED", "Rasmus", "Nekad av Rasmus"],
  ] as const)(
    "renders the correct %s status label",
    async (status, acceptedByName, expected) => {
      arrange([member], [{ ...activity, status, acceptedByName }]);
      render(<AddPenalty />);
      expect(await screen.findByText(expected)).toBeInTheDocument();
    },
  );
  it("shows an empty state when there are no recent activities", async () => {
    arrange();
    render(<AddPenalty />);
    expect(
      await screen.findByText("Inga bongar har delats ut ännu."),
    ).toBeInTheDocument();
  });
  it("shows an error when recent activity cannot be loaded", async () => {
    arrange();
    const original = authFetch.getMockImplementation();
    authFetch.mockImplementation(async (url: string, init?: RequestInit) =>
      url === "/api/add/recent" ? ok(null, false) : original!(url, init),
    );
    render(<AddPenalty />);
    expect(
      await screen.findByText("Kunde inte hämta senaste aktiviteterna!"),
    ).toBeInTheDocument();
  });
});

describe("Search and filter members", () => {
  it.each([
    ["name", "Rasmus", "Odin, Rasmus Kebert"],
    ["godname", "Frej", "Freja, Anna Svensson"],
    ["case-insensitively", "ODIN", "Odin, Rasmus Kebert"],
  ])(
    "shows matching members when searching by %s",
    async (_case, query, expected) => {
      const user = userEvent.setup();
      arrange([
        member,
        { id: "2", name: "Anna Svensson", godname: "Freja", avatarUrl: null },
      ]);
      render(<AddPenalty />);
      await user.type(
        await screen.findByPlaceholderText("Sök efter namn..."),
        query,
      );
      expect(
        screen.getByRole("button", { name: expected }),
      ).toBeInTheDocument();
    },
  );
  it("shows at most eight matching members", async () => {
    const user = userEvent.setup();
    arrange(
      Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        name: `Match ${i}`,
        godname: `God ${i}`,
        avatarUrl: null,
      })),
    );
    render(<AddPenalty />);
    await user.type(
      await screen.findByPlaceholderText("Sök efter namn..."),
      "Match",
    );
    expect(
      screen.getAllByRole("button", { name: /God \d, Match \d/ }),
    ).toHaveLength(8);
  });
  it("shows no matching members message when the search has no results", async () => {
    const user = userEvent.setup();
    arrange();
    render(<AddPenalty />);
    await user.type(
      await screen.findByPlaceholderText("Sök efter namn..."),
      "Nobody",
    );
    expect(screen.getByText("Inga matchande medlemmar.")).toBeInTheDocument();
  });
  it("selects a member when a search result is clicked", async () => {
    const user = userEvent.setup();
    arrange();
    render(<AddPenalty />);
    const input = await select(user);
    expect(input).toHaveValue("Odin (Rasmus Kebert)");
    expect(screen.getByRole("button", { name: "Ge bong" })).toBeEnabled();
  });
  it("clears the selected member when the member search text is changed", async () => {
    const user = userEvent.setup();
    arrange();
    render(<AddPenalty />);
    const input = await select(user);
    await user.type(input, "x");
    expect(screen.getByRole("button", { name: "Ge bong" })).toBeDisabled();
  });
});

describe("Load more activity", () => {
  function paginated(
    load: () => Promise<ReturnType<typeof ok>>,
    hasMore = true,
  ) {
    authFetch.mockImplementation(async (url: string) => {
      if (url === "/api/members/me")
        return ok({ name: "Test User", avatarUrl: null, status: "" });
      if (url === "/api/members/penalty-targets") return ok([]);
      if (url === "/api/add/recent") return ok(page([activity], 3, hasMore));
      if (url === "/api/add/recent?skip=3") return load();
      throw new Error(url);
    });
  }
  it("loads the next activity page using nextSkip", async () => {
    const user = userEvent.setup();
    paginated(async () => ok(page()));
    render(<AddPenalty />);
    await screen.findByRole("article");
    await user.click(screen.getByRole("button", { name: "Visa fler" }));
    expect(authFetch).toHaveBeenCalledWith("/api/add/recent?skip=3");
  });
  it("appends loaded activities instead of replacing existing activities", async () => {
    const user = userEvent.setup();
    paginated(async () =>
      ok(page([{ ...activity, id: "new", fromName: "New" }])),
    );
    render(<AddPenalty />);
    await screen.findByText("Anna");
    await user.click(screen.getByRole("button", { name: "Visa fler" }));
    expect(await screen.findByText("New")).toBeInTheDocument();
    expect(screen.getByText("Anna")).toBeInTheDocument();
  });
  it("disables the load more button and shows loading text while loading", async () => {
    const user = userEvent.setup();
    let resolve!: (value: ReturnType<typeof ok>) => void;
    paginated(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    render(<AddPenalty />);
    await screen.findByRole("article");
    await user.click(screen.getByRole("button", { name: "Visa fler" }));
    expect(screen.getByRole("button", { name: "Laddar..." })).toBeDisabled();
    resolve(ok(page([], 3, true)));
    expect(
      await screen.findByRole("button", { name: "Visa fler" }),
    ).toBeEnabled();
  });
  it("does not start another load more request while one is already running", async () => {
    const user = userEvent.setup();
    paginated(() => new Promise(() => undefined));
    render(<AddPenalty />);
    await screen.findByRole("article");
    await user.click(screen.getByRole("button", { name: "Visa fler" }));
    await user.click(screen.getByRole("button", { name: "Laddar..." }));
    expect(
      authFetch.mock.calls.filter(([url]) => url === "/api/add/recent?skip=3"),
    ).toHaveLength(1);
  });
  it("does not fetch more activities when hasMore is false", async () => {
    const user = userEvent.setup();
    const alert = vi.spyOn(window, "alert").mockImplementation(() => undefined);
    paginated(async () => ok(page()), false);
    render(<AddPenalty />);
    await screen.findByRole("article");
    await user.click(screen.getByRole("button", { name: "Visa fler" }));
    expect(alert).toHaveBeenCalledWith("Vi har inga fler aktiviteter");
    expect(authFetch).not.toHaveBeenCalledWith("/api/add/recent?skip=3");
  });
  it("keeps existing activities and shows an error when loading more fails", async () => {
    const user = userEvent.setup();
    paginated(async () => ok(null, false));
    render(<AddPenalty />);
    await screen.findByRole("article");
    await user.click(screen.getByRole("button", { name: "Visa fler" }));
    expect(
      await screen.findByText("Kunde inte hämta senaste aktivitet"),
    ).toBeInTheDocument();
    expect(screen.getByRole("article")).toBeInTheDocument();
  });
});

describe("Authorization and moderation", () => {
  function moderation(
    result: unknown = {
      id: "activity-1",
      status: "APPROVED",
      amount: 3,
      acceptedByName: "Bongmeister",
    },
    successful = true,
  ) {
    authFetch.mockImplementation(async (url: string) => {
      if (url === "/api/members/me")
        return ok({ name: "Test User", avatarUrl: null, status: "" });
      if (url === "/api/members/penalty-targets") return ok([]);
      if (url === "/api/add/recent") return ok(page([activity]));
      if (url === "/api/bongmeister/activity-1") return ok(result, successful);
      throw new Error(url);
    });
  }
  it("does not show moderation controls to a normal user", async () => {
    arrange([member], [activity]);
    render(<AddPenalty />);
    await screen.findByText("Väntar");
    for (const name of ["Godkänn", "Ändra", "Neka"])
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
  });
  it.each(["admin", "bongmeister"])(
    "shows moderation controls to users with the %s role",
    async (role) => {
      keycloak.tokenParsed.realm_access.roles = [role];
      arrange([member], [activity]);
      render(<AddPenalty />);
      for (const name of ["Godkänn", "Ändra", "Neka"])
        expect(await screen.findByRole("button", { name })).toBeInTheDocument();
    },
  );
  it("does not show moderation controls for a non-pending activity", async () => {
    keycloak.tokenParsed.realm_access.roles = ["ADMIN"];
    arrange([member], [{ ...activity, status: "APPROVED" }]);
    render(<AddPenalty />);
    await screen.findByText("OK");
    expect(
      screen.queryByRole("button", { name: "Godkänn" }),
    ).not.toBeInTheDocument();
  });
  it.each([
    ["Godkänn", "APPROVE"],
    ["Neka", "REJECT"],
  ] as const)("sends a %s request", async (button, action) => {
    const user = userEvent.setup();
    keycloak.tokenParsed.realm_access.roles = ["ADMIN"];
    moderation();
    render(<AddPenalty />);
    await user.click(await screen.findByRole("button", { name: button }));
    expect(authFetch).toHaveBeenCalledWith("/api/bongmeister/activity-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, amount: undefined }),
    });
  });
  it("updates an activity after successful moderation", async () => {
    const user = userEvent.setup();
    keycloak.tokenParsed.realm_access.roles = ["ADMIN"];
    moderation();
    render(<AddPenalty />);
    await user.click(await screen.findByRole("button", { name: "Godkänn" }));
    expect(await screen.findByText(/3 bongar$/)).toBeInTheDocument();
    expect(screen.getByText("OK av Bongmeister")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Godkänn" }),
    ).not.toBeInTheDocument();
  });
  it.each([
    [{ message: "Custom backend error" }, "Custom backend error"],
    [{}, "Kunde inte ändra bongarna"],
  ])("shows the moderation error", async (body, message) => {
    const user = userEvent.setup();
    const alert = vi.spyOn(window, "alert").mockImplementation(() => undefined);
    keycloak.tokenParsed.realm_access.roles = ["ADMIN"];
    moderation(body, false);
    render(<AddPenalty />);
    await user.click(await screen.findByRole("button", { name: "Godkänn" }));
    expect(alert).toHaveBeenCalledWith(message);
  });
});

describe("Edit and approve", () => {
  beforeEach(() => {
    keycloak.tokenParsed.realm_access.roles = ["BONGMEISTER"];
  });
  it("opens the edit prompt with the current activity amount", async () => {
    const user = userEvent.setup();
    const prompt = vi.spyOn(window, "prompt").mockReturnValue(null);
    arrange([member], [{ ...activity, amount: 3 }]);
    render(<AddPenalty />);
    await user.click(await screen.findByRole("button", { name: "Ändra" }));
    expect(prompt).toHaveBeenCalledWith("Antal", "3");
  });
  it("does not moderate the activity when the edit prompt is cancelled", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "prompt").mockReturnValue(null);
    arrange([member], [activity]);
    render(<AddPenalty />);
    await user.click(await screen.findByRole("button", { name: "Ändra" }));
    expect(
      authFetch.mock.calls.some(([url]) =>
        String(url).startsWith("/api/bongmeister/"),
      ),
    ).toBe(false);
  });
  it.each(["0", "-1", "1.5"])(
    "rejects invalid edited amount %s",
    async (amount) => {
      const user = userEvent.setup();
      vi.spyOn(window, "prompt").mockReturnValue(amount);
      const alert = vi
        .spyOn(window, "alert")
        .mockImplementation(() => undefined);
      arrange([member], [activity]);
      render(<AddPenalty />);
      await user.click(await screen.findByRole("button", { name: "Ändra" }));
      expect(alert).toHaveBeenCalledWith(
        "Antal måste vara ett heltal på minst 1.",
      );
      expect(
        authFetch.mock.calls.some(([url]) =>
          String(url).startsWith("/api/bongmeister/"),
        ),
      ).toBe(false);
    },
  );
  it("approves an activity with the edited amount", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "prompt").mockReturnValue("4");
    arrange([member], [activity]);
    const original = authFetch.getMockImplementation();
    authFetch.mockImplementation(async (url: string, init?: RequestInit) =>
      url === "/api/bongmeister/activity-1"
        ? ok({
            id: "activity-1",
            status: "APPROVED",
            amount: 4,
            acceptedByName: "Boss",
          })
        : original!(url, init),
    );
    render(<AddPenalty />);
    await user.click(await screen.findByRole("button", { name: "Ändra" }));
    expect(authFetch).toHaveBeenCalledWith(
      "/api/bongmeister/activity-1",
      expect.objectContaining({
        body: JSON.stringify({ action: "APPROVE", amount: 4 }),
      }),
    );
  });
});

describe("Add penalty form", () => {
  it("starts with amount 1 and an empty reason", () => {
    arrange();
    render(<AddPenalty />);
    expect(screen.getByRole("spinbutton")).toHaveValue(1);
    expect(screen.getByPlaceholderText("Anledning...")).toHaveValue("");
  });
  it("disables the add button when no member is selected", () => {
    arrange();
    render(<AddPenalty />);
    expect(screen.getByRole("button", { name: "Ge bong" })).toBeDisabled();
  });
  it("disables the add button when amount is less than one", async () => {
    const user = userEvent.setup();
    arrange();
    render(<AddPenalty />);
    await select(user);
    await user.clear(screen.getByRole("spinbutton"));
    await user.type(screen.getByRole("spinbutton"), "0");
    expect(screen.getByRole("button", { name: "Ge bong" })).toBeDisabled();
  });
  it.each([
    [3, "Kom sent"],
    [1, ""],
  ])("submits amount %s and reason '%s'", async (amount, reason) => {
    const user = userEvent.setup();
    arrange();
    render(<AddPenalty />);
    await select(user);
    if (amount !== 1) {
      await user.clear(screen.getByRole("spinbutton"));
      await user.type(screen.getByRole("spinbutton"), String(amount));
    }
    if (reason)
      await user.type(screen.getByPlaceholderText("Anledning..."), reason);
    await user.click(screen.getByRole("button", { name: "Ge bong" }));
    expect(authFetch).toHaveBeenCalledWith("/api/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Id: "member-1", amount, reason }),
    });
  });
  it("resets the form and shows success after adding a penalty", async () => {
    const user = userEvent.setup();
    arrange();
    render(<AddPenalty />);
    await select(user);
    await user.type(screen.getByPlaceholderText("Anledning..."), "Reason");
    await user.click(screen.getByRole("button", { name: "Ge bong" }));
    expect(await screen.findByText("Har lagt till en")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Sök efter namn...")).toHaveValue("");
    expect(screen.getByRole("spinbutton")).toHaveValue(1);
    expect(screen.getByPlaceholderText("Anledning...")).toHaveValue("");
  });
  it("adds the newly created penalty to the top of recent activity", async () => {
    const user = userEvent.setup();
    const old = { ...activity, id: "old", fromName: "Old sender" };
    const created = { ...activity, id: "new", fromName: "New sender" };
    arrange([member], [old], created);
    render(<AddPenalty />);
    await screen.findByText("Old sender");
    await select(user);
    await user.click(screen.getByRole("button", { name: "Ge bong" }));
    const cards = await screen.findAllByRole("article");
    expect(within(cards[0]).getByText("New sender")).toBeInTheDocument();
    expect(within(cards[1]).getByText("Old sender")).toBeInTheDocument();
  });
  it("does not treat a non-ok add response as a successful submission", async () => {
    const user = userEvent.setup();
    arrange();
    const original = authFetch.getMockImplementation();
    authFetch.mockImplementation(async (url: string, init?: RequestInit) =>
      url === "/api/add"
        ? ok({ ...activity, id: "failed" }, false)
        : original!(url, init),
    );
    render(<AddPenalty />);
    const input = await select(user);
    await user.click(screen.getByRole("button", { name: "Ge bong" }));
    await waitFor(() =>
      expect(authFetch).toHaveBeenCalledWith("/api/add", expect.anything()),
    );
    expect(screen.queryByText("Har lagt till en")).not.toBeInTheDocument();
    expect(input).toHaveValue("Odin (Rasmus Kebert)");
    expect(screen.queryByText("failed")).not.toBeInTheDocument();
  });
  it("shows an error when the add request throws", async () => {
    const user = userEvent.setup();
    arrange();
    const original = authFetch.getMockImplementation();
    authFetch.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "/api/add") throw new Error();
      return original!(url, init);
    });
    render(<AddPenalty />);
    await select(user);
    await user.click(screen.getByRole("button", { name: "Ge bong" }));
    expect(
      await screen.findByText("Kunde inte addera straffet"),
    ).toBeInTheDocument();
  });
});

describe("Navigation", () => {
  it("navigates to redeem when Bli av med bong is clicked", async () => {
    const user = userEvent.setup();
    arrange();
    render(<AddPenalty />);
    const buttons = screen.getAllByRole("button", { name: "Bli av med bong" });
    await user.click(buttons.at(-1)!);
    expect(navigate).toHaveBeenCalledWith("/redeem");
  });
});
