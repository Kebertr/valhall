import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "../pages/Home";

const { mockNavigate, mockAuthFetch } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockAuthFetch: vi.fn(),
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

vi.mock("../components/Navbar", () => ({
  default: () => <nav aria-label="Huvudmeny" />,
}));

type ActivityStatus = "PENDING" | "APPROVED" | "DENIED";

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

function createAddActivity(
  index: number,
  overrides?: Partial<{
    fromName: string;
    toName: string;
    amount: number;
    reason: string;
    status: ActivityStatus;
    createdAt: string;
  }>,
) {
  return {
    type: "ADD" as const,
    fromName: `From ${index}`,
    toName: `To ${index}`,
    amount: 2,
    reason: `Reason ${index}`,
    status: "APPROVED" as ActivityStatus,
    createdAt: `2026-08-10T08:${String(index).padStart(2, "0")}:00.000Z`,
    ...overrides,
  };
}

function createRedemptionActivity(
  index: number,
  overrides?: Partial<{
    memberName: string;
    amount: number;
    videoId: string;
    videoUrl: string | null;
    status: ActivityStatus;
    createdAt: string;
  }>,
) {
  return {
    type: "REDEMPTION" as const,
    memberName: `Member ${index}`,
    amount: 1,
    videoId: `video-${index}`,
    videoUrl: null,
    status: "PENDING" as ActivityStatus,
    createdAt: `2026-08-10T09:${String(index).padStart(2, "0")}:00.000Z`,
    ...overrides,
  };
}

function mockRecentActivities(
  result: Array<
    ReturnType<typeof createAddActivity> | ReturnType<typeof createRedemptionActivity>
  >,
  oldestTimeStamp: string | null = null,
) {
  mockAuthFetch.mockResolvedValueOnce(
    jsonResponse({
      result,
      oldestTimeStamp: oldestTimeStamp ? { createdAt: oldestTimeStamp } : null,
    }),
  );
}

function getFooterRedeemButton() {
  const labelledButton = screen.queryByLabelText("Redeem shot from footer");

  if (labelledButton) {
    return labelledButton;
  }

  const redeemButtons = screen.getAllByRole("button", {
    name: "Bli av med bong",
  });

  return redeemButtons[redeemButtons.length - 1];
}

function exactParagraphText(expectedText: string) {
  return (_content: string, element: Element | null) =>
    element?.tagName.toLowerCase() === "p" &&
    element.textContent === expectedText;
}

describe("Home", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("navigates to add page from footer Ge bong button", async () => {
    const user = userEvent.setup();

    mockRecentActivities([]);

    render(<Home />);

    await screen.findByText("Det finns ingen aktivitet ännu.");

    await user.click(screen.getByLabelText("Add shot from footer"));

    expect(mockNavigate).toHaveBeenCalledWith("/add");
  });

  it("navigates to redeem page from footer Bli av med bong button", async () => {
    const user = userEvent.setup();

    mockRecentActivities([]);

    render(<Home />);

    await screen.findByText("Det finns ingen aktivitet ännu.");

    await user.click(getFooterRedeemButton());

    expect(mockNavigate).toHaveBeenCalledWith("/redeem");
  });

  it("renders ADD and REDEMPTION activity text with timestamps", async () => {
    const addCreatedAt = "2026-08-10T08:00:00.000Z";
    const redemptionCreatedAt = "2026-08-10T09:00:00.000Z";

    mockAuthFetch
      .mockResolvedValueOnce(
        jsonResponse({
          result: [
            createAddActivity(1, {
              fromName: "Anna",
              toName: "Bea",
              amount: 2,
              reason: "Kom sent",
              status: "APPROVED",
              createdAt: addCreatedAt,
            }),
            createRedemptionActivity(1, {
              memberName: "Rasmus",
              amount: 1,
              videoId: "redeem-video-1",
              status: "PENDING",
              createdAt: redemptionCreatedAt,
            }),
          ],
          oldestTimeStamp: null,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          videoUrl: "https://example.com/redeem-video-1.mp4",
        }),
      );

    render(<Home />);

    expect(
      await screen.findByText(exactParagraphText("Anna gav Bea 2 bongar")),
    ).toBeInTheDocument();

    expect(screen.getByText("Kom sent")).toBeInTheDocument();

    expect(
      screen.getByText(
        new Date(addCreatedAt).toLocaleString("sv-SE"),
      ),
    ).toBeInTheDocument();

    expect(
      await screen.findByText(
        exactParagraphText("Rasmus vill bli av med 1 bong"),
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        new Date(redemptionCreatedAt).toLocaleString("sv-SE"),
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Visa video från Rasmus" }),
    ).toBeInTheDocument();
  });

  it("renders correct status labels and status colors", async () => {
    mockRecentActivities([
      createAddActivity(1, {
        fromName: "Approved",
        status: "APPROVED",
      }),
      createAddActivity(2, {
        fromName: "Pending",
        status: "PENDING",
      }),
      createAddActivity(3, {
        fromName: "Denied",
        status: "DENIED",
      }),
    ]);

    render(<Home />);

    expect(await screen.findByText("Godkänd")).toHaveClass("text-green-300");
    expect(screen.getByText("Väntar")).toHaveClass("text-white");
    expect(screen.getByText("Nekad")).toHaveClass("text-red-300");
  });

  it("renders 8 activities initially and appends 8 more when loading more", async () => {
    const user = userEvent.setup();
    const oldestTimeStamp = "2026-08-10T08:07:00.000Z";

    const firstEightActivities = Array.from({ length: 8 }, (_, index) =>
      createAddActivity(index),
    );

    const nextEightActivities = Array.from({ length: 8 }, (_, index) =>
      createAddActivity(index + 8),
    );

    mockAuthFetch
      .mockResolvedValueOnce(
        jsonResponse({
          result: firstEightActivities,
          oldestTimeStamp: {
            createdAt: oldestTimeStamp,
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          result: nextEightActivities,
          oldestTimeStamp: null,
        }),
      );

    const { container } = render(<Home />);

    await waitFor(() => {
      expect(container.querySelectorAll("article")).toHaveLength(8);
    });

    await user.click(screen.getByRole("button", { name: "Visa fler" }));

    await waitFor(() => {
      expect(container.querySelectorAll("article")).toHaveLength(16);
    });

    expect(screen.getByText("From 0")).toBeInTheDocument();
    expect(screen.getByText("From 15")).toBeInTheDocument();

    expect(mockAuthFetch).toHaveBeenCalledWith(
      `/api/recent/activities?timestamp=${encodeURIComponent(oldestTimeStamp)}`,
    );
  });

  it("opens and closes the redemption video dialog when playback url exists", async () => {
    const user = userEvent.setup();

    mockAuthFetch
      .mockResolvedValueOnce(
        jsonResponse({
          result: [
            createRedemptionActivity(1, {
              memberName: "Rasmus",
              amount: 1,
              videoId: "video-1",
              status: "APPROVED",
            }),
          ],
          oldestTimeStamp: null,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          videoUrl: "https://example.com/video-1.mp4",
        }),
      );

    render(<Home />);

    const videoButton = await screen.findByRole("button", {
      name: "Visa video från Rasmus",
    });

    expect(mockAuthFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/files/video-1/playback-url"),
    );

    await user.click(videoButton);

    expect(
      screen.getByRole("dialog", { name: "Video från Rasmus" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Stäng" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("keeps redemption activity but hides video button when playback url returns 404", async () => {
    mockAuthFetch
      .mockResolvedValueOnce(
        jsonResponse({
          result: [
            createRedemptionActivity(1, {
              memberName: "Rasmus",
              amount: 2,
              videoId: "missing-video",
              status: "PENDING",
            }),
          ],
          oldestTimeStamp: null,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(null, {
          ok: false,
          status: 404,
        }),
      );

    render(<Home />);

    expect(
      await screen.findByText(
        exactParagraphText("Rasmus vill bli av med 2 bongar"),
      ),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: "Visa video från Rasmus" }),
    ).not.toBeInTheDocument();

    expect(screen.queryByText("Kunde inte hämta videon")).not.toBeInTheDocument();
  });

  it("shows error when playback url response is not ok", async () => {
    mockAuthFetch
      .mockResolvedValueOnce(
        jsonResponse({
          result: [
            createRedemptionActivity(1, {
              memberName: "Rasmus",
              videoId: "broken-video",
            }),
          ],
          oldestTimeStamp: null,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(null, {
          ok: false,
          status: 500,
        }),
      );

    render(<Home />);

    expect(
      await screen.findByText(
        exactParagraphText("Rasmus vill bli av med 1 bong"),
      ),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: "Visa video från Rasmus" }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByText("Kunde inte hämta videon"),
    ).not.toBeInTheDocument();
  });

  it("keeps acitivites that works if one fails", async () => {
    mockAuthFetch
      .mockResolvedValueOnce(
        jsonResponse({
          result: [
            createAddActivity(1, {
              fromName: "Anna",
            }),
            createRedemptionActivity(1, {
              memberName: "Rasmus",
              videoId: "rejected-video",
            }),
          ],
          oldestTimeStamp: null,
        }),
      )
      .mockRejectedValueOnce(new Error("Playback promise failed"));

    render(<Home />);

     expect(await screen.findByText("Anna")).toBeInTheDocument();
    expect(await screen.findByText("Rasmus")).toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: "Visa video från Rasmus" }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByText("Playback promise failed"),
    ).not.toBeInTheDocument();
  });

  it("shows error when initial recent activity request fails", async () => {
    mockAuthFetch.mockResolvedValueOnce(
      jsonResponse(null, {
        ok: false,
        status: 500,
      }),
    );

    render(<Home />);

    expect(
      await screen.findByText("Kunde inte hämta senaste aktivitet"),
    ).toBeInTheDocument();
  });

});