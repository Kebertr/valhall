import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Redeem from "../pages/Redeem";

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

const mockUploadFetch = vi.fn();

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

type RedemptionStatus = "PENDING" | "APPROVED" | "DENIED";

type RecentRedemptionResponse = {
  id: string;
  memberName: string;
  amount: number;
  status: RedemptionStatus;
  createdAt: string;
  videoId: string;
  acceptedByName?: string;
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

function createRedemption(
  index: number,
  overrides?: Partial<RecentRedemptionResponse>,
): RecentRedemptionResponse {
  return {
    id: `redemption-${index}`,
    memberName: `Member ${index}`,
    amount: 1,
    status: "PENDING",
    createdAt: `2026-08-10T08:${String(index).padStart(2, "0")}:00.000Z`,
    videoId: `video-${index}`,
    ...overrides,
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    resolve,
    reject,
  };
}

function mockUserRoles(userRoles: string[]) {
  mockKeycloak.tokenParsed = {
    realm_access: {
      roles: userRoles,
    },
  };
}

function getAuthFetchUrls() {
  return mockAuthFetch.mock.calls.map(([url]) => String(url));
}

function expectModerationButtonsToBeGone() {
  expect(screen.queryByRole("button", { name: "Godkänn" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Ändra" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Neka" })).not.toBeInTheDocument();
}

function mockInitialRedemptions(redemptions: RecentRedemptionResponse[]) {
  mockAuthFetch.mockImplementation(async (url: string) => {
    if (url.endsWith("/api/redemption/recent")) {
      return jsonResponse(redemptions);
    }

    if (url.includes("/api/files/") && url.endsWith("/playback-url")) {
      const videoId = url.split("/api/files/")[1].replace("/playback-url", "");

      return jsonResponse({
        videoUrl: `https://example.com/${decodeURIComponent(videoId)}.mp4`,
      });
    }

    throw new Error(`Unexpected authFetch call: ${url}`);
  });
}

function createVideoFile(name = "proof.mp4") {
  const file = new File(["video-content"], name, {
    type: "video/mp4",
  });

  Object.defineProperty(file, "size", {
    value: 1234,
  });

  return file;
}

async function uploadRequiredVideo(user: ReturnType<typeof userEvent.setup>) {
  const videoInput = screen.getByLabelText("Lägg till en video som bevis");
  const file = createVideoFile();

  await user.upload(videoInput, file);

  return file;
}

describe("Redeem", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUserRoles([]);

    mockUploadFetch.mockResolvedValue({
      ok: true,
      status: 204,
    });

    vi.stubGlobal("fetch", mockUploadFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches initial redemptions without skip query and never uses negative skip", async () => {
    mockInitialRedemptions([]);

    render(<Redeem />);

    expect(
      await screen.findByText("Ingen har velat bli av med en bong"),
    ).toBeInTheDocument();

    const urls = getAuthFetchUrls();

    expect(urls.some((url) => url.endsWith("/api/redemption/recent"))).toBe(true);
    expect(urls.some((url) => url.includes("skip=0"))).toBe(false);
    expect(urls.some((url) => url.includes("skip=-"))).toBe(false);
  });

  it("fetches and renders recent redemptions with playback urls", async () => {
    const createdAt = "2026-08-10T08:00:00.000Z";

    mockInitialRedemptions([
      createRedemption(1, {
        memberName: "Rasmus",
        amount: 2,
        status: "APPROVED",
        acceptedByName: "Bongmeister",
        createdAt,
        videoId: "video-1",
      }),
    ]);

    render(<Redeem />);

    expect(await screen.findByText("Rasmus")).toBeInTheDocument();
    expect(screen.getByText(/Vill bli av med 2 bongar/i)).toBeInTheDocument();
    expect(screen.getByText("OK av Bongmeister")).toBeInTheDocument();

    expect(
      screen.getByText(new Date(createdAt).toLocaleString("sv-SE")),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Visa video från Rasmus" }),
    ).toBeInTheDocument();

    expect(mockAuthFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/redemption/recent"),
    );

    expect(mockAuthFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/files/video-1/playback-url"),
    );
  });

  it("shows empty state when there are no recent redemptions", async () => {
    mockInitialRedemptions([]);

    render(<Redeem />);

    expect(
      await screen.findByText("Ingen har velat bli av med en bong"),
    ).toBeInTheDocument();
  });

  it("shows activity error when recent redemptions request fails", async () => {
    mockAuthFetch.mockImplementation(async (url: string) => {
      if (url.endsWith("/api/redemption/recent")) {
        return jsonResponse(null, {
          ok: false,
          status: 500,
        });
      }

      throw new Error(`Unexpected authFetch call: ${url}`);
    });

    render(<Redeem />);

    expect(
      await screen.findByText("Kunde inte hämta senaste tagna bongar"),
    ).toBeInTheDocument();
  });

  it("loads playable redemptions even when one playback url response is not ok", async () => {
    mockAuthFetch.mockImplementation(async (url: string) => {
      if (url.endsWith("/api/redemption/recent")) {
        return jsonResponse([
          createRedemption(1, {
            id: "redemption-1",
            memberName: "Works One",
            videoId: "video-ok-1",
          }),
          createRedemption(2, {
            id: "redemption-2",
            memberName: "Broken Video",
            videoId: "video-broken",
          }),
          createRedemption(3, {
            id: "redemption-3",
            memberName: "Works Two",
            videoId: "video-ok-2",
          }),
        ]);
      }

      if (url.includes("/api/files/video-ok-1/playback-url")) {
        return jsonResponse({
          videoUrl: "https://example.com/video-ok-1.mp4",
        });
      }

      if (url.includes("/api/files/video-broken/playback-url")) {
        return jsonResponse(null, {
          ok: false,
          status: 500,
        });
      }

      if (url.includes("/api/files/video-ok-2/playback-url")) {
        return jsonResponse({
          videoUrl: "https://example.com/video-ok-2.mp4",
        });
      }

      throw new Error(`Unexpected authFetch call: ${url}`);
    });

    render(<Redeem />);

    expect(await screen.findByText("Works One")).toBeInTheDocument();
    expect(screen.getByText("Works Two")).toBeInTheDocument();

    expect(screen.queryByText("Broken Video")).not.toBeInTheDocument();

    expect(
      screen.queryByText("Kunde inte hämta senaste tagna bongar."),
    ).not.toBeInTheDocument();
  });

  it("loads playable redemptions even when one playback url request rejects", async () => {
    mockAuthFetch.mockImplementation(async (url: string) => {
      if (url.endsWith("/api/redemption/recent")) {
        return jsonResponse([
          createRedemption(1, {
            memberName: "Loaded Video",
            videoId: "loaded-video",
          }),
          createRedemption(2, {
            memberName: "Rejected Video",
            videoId: "rejected-video",
          }),
        ]);
      }

      if (url.includes("/api/files/loaded-video/playback-url")) {
        return jsonResponse({
          videoUrl: "https://example.com/loaded-video.mp4",
        });
      }

      if (url.includes("/api/files/rejected-video/playback-url")) {
        throw new Error("Playback URL failed");
      }

      throw new Error(`Unexpected authFetch call: ${url}`);
    });

    render(<Redeem />);

    expect(await screen.findByText("Loaded Video")).toBeInTheDocument();
    expect(screen.queryByText("Rejected Video")).not.toBeInTheDocument();
  });

  it("skips only the redemption whose playback url returns 404", async () => {
    mockAuthFetch.mockImplementation(async (url: string) => {
      if (url.endsWith("/api/redemption/recent")) {
        return jsonResponse([
          createRedemption(1, {
            memberName: "Has Video",
            videoId: "video-ok",
          }),
          createRedemption(2, {
            memberName: "Missing Video",
            videoId: "video-missing",
          }),
        ]);
      }

      if (url.includes("/api/files/video-ok/playback-url")) {
        return jsonResponse({
          videoUrl: "https://example.com/video-ok.mp4",
        });
      }

      if (url.includes("/api/files/video-missing/playback-url")) {
        return jsonResponse(null, {
          ok: false,
          status: 404,
        });
      }

      throw new Error(`Unexpected authFetch call: ${url}`);
    });

    render(<Redeem />);

    expect(await screen.findByText("Has Video")).toBeInTheDocument();
    expect(screen.queryByText("Missing Video")).not.toBeInTheDocument();
  });

  it("renders pending, approved, and denied status texts", async () => {
    mockInitialRedemptions([
      createRedemption(1, {
        memberName: "Pending User",
        status: "PENDING",
      }),
      createRedemption(2, {
        memberName: "Approved User",
        status: "APPROVED",
        acceptedByName: "Rasmus",
      }),
      createRedemption(3, {
        memberName: "Denied User",
        status: "DENIED",
        acceptedByName: "Oskar",
      }),
    ]);

    render(<Redeem />);

    expect(await screen.findByText("Väntar")).toBeInTheDocument();
    expect(screen.getByText("OK av Rasmus")).toBeInTheDocument();
    expect(screen.getByText("Nekad av Oskar")).toBeInTheDocument();
  });

  it("opens and closes the video dialog", async () => {
    const user = userEvent.setup();

    mockInitialRedemptions([
      createRedemption(1, {
        memberName: "Rasmus",
        videoId: "video-1",
      }),
    ]);

    render(<Redeem />);

    await user.click(
      await screen.findByRole("button", { name: "Visa video från Rasmus" }),
    );

    expect(
      screen.getByRole("dialog", { name: "Video från Rasmus" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Stäng" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("shows error when submitting without video", async () => {
    const user = userEvent.setup();

    mockInitialRedemptions([]);

    render(<Redeem />);

    await screen.findByText("Ingen har velat bli av med en bong");

    await user.click(screen.getByRole("button", { name: "Skicka" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Välj en video innan du skickar",
    );

    expect(mockAuthFetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/redemption"),
      expect.objectContaining({
        method: "POST",
      }),
    );

    expect(screen.getByRole("button", { name: "Skicka" })).toBeEnabled();
  });

  it("sets submitting while redemption request is pending and resets it after failure", async () => {
    const user = userEvent.setup();
    const redemptionRequest = createDeferred<ReturnType<typeof jsonResponse>>();

    mockAuthFetch.mockImplementation(async (url: string) => {
      if (url.endsWith("/api/redemption/recent")) {
        return jsonResponse([]);
      }

      if (url.endsWith("/api/redemption")) {
        return redemptionRequest.promise;
      }

      throw new Error(`Unexpected authFetch call: ${url}`);
    });

    render(<Redeem />);

    await screen.findByText("Ingen har velat bli av med en bong");

    await uploadRequiredVideo(user);
    await user.click(screen.getByRole("button", { name: "Skicka" }));

    expect(
      await screen.findByRole("button", { name: "Laddar upp videon" }),
    ).toBeDisabled();

    redemptionRequest.resolve(
      jsonResponse(null, {
        ok: false,
        status: 500,
      }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Något gick fel");
    expect(screen.getByRole("button", { name: "Skicka" })).toBeEnabled();
  });

  it("submits redemption, uploads video, completes upload, and shows success message", async () => {
    const user = userEvent.setup();

    mockAuthFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url.endsWith("/api/redemption/recent")) {
        return jsonResponse([]);
      }

      if (url.endsWith("/api/redemption")) {
        expect(options?.method).toBe("POST");
        expect(options?.headers).toEqual({
          "Content-Type": "application/json",
        });

        expect(JSON.parse(String(options?.body))).toEqual({
          bongAmount: 3,
          filename: "proof.mp4",
          contentType: "video/mp4",
          sizeBytes: 1234,
        });

        return jsonResponse({
          redemptionId: "redemption-1",
          postUrl: "https://upload.example.com",
          formData: {
            key: "uploads/proof.mp4",
            policy: "policy-value",
          },
        });
      }

      if (url.endsWith("/api/redemption/complete-upload")) {
        expect(options?.method).toBe("POST");
        expect(options?.headers).toEqual({
          "Content-Type": "application/json",
        });

        expect(JSON.parse(String(options?.body))).toEqual({
          redemptionId: "redemption-1",
        });

        return jsonResponse({
          ok: true,
        });
      }

      throw new Error(`Unexpected authFetch call: ${url}`);
    });

    render(<Redeem />);

    await screen.findByText("Ingen har velat bli av med en bong");

    const amountInput = screen.getByLabelText("Bongar tagna");
    await user.clear(amountInput);
    await user.type(amountInput, "3");

    const videoInput = screen.getByLabelText("Lägg till en video som bevis");
    const file = createVideoFile();

    await user.upload(videoInput, file);

    await user.click(screen.getByRole("button", { name: "Skicka" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Din redemption är nu uppe och väntar på godkännande!",
    );

    expect(mockUploadFetch).toHaveBeenCalledWith(
      "https://upload.example.com",
      expect.objectContaining({
        method: "POST",
        body: expect.any(FormData),
      }),
    );

    const uploadBody = mockUploadFetch.mock.calls[0][1].body as FormData;

    expect(uploadBody.get("key")).toBe("uploads/proof.mp4");
    expect(uploadBody.get("policy")).toBe("policy-value");
    expect(uploadBody.get("file")).toBe(file);

    expect(mockAuthFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/redemption/complete-upload"),
      expect.objectContaining({
        method: "POST",
      }),
    );

    expect(screen.getByRole("button", { name: "Skicka" })).toBeEnabled();
  });

  it("shows specific error when redemption amount is too high", async () => {
    const user = userEvent.setup();

    mockAuthFetch.mockImplementation(async (url: string) => {
      if (url.endsWith("/api/redemption/recent")) {
        return jsonResponse([]);
      }

      if (url.endsWith("/api/redemption")) {
        return jsonResponse(null, {
          ok: false,
          status: 409,
        });
      }

      throw new Error(`Unexpected authFetch call: ${url}`);
    });

    render(<Redeem />);

    await screen.findByText("Ingen har velat bli av med en bong");

    await uploadRequiredVideo(user);
    await user.click(screen.getByRole("button", { name: "Skicka" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Du har inte så här många bongar",
    );

    expect(mockUploadFetch).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Skicka" })).toBeEnabled();
  });

  it("shows specific error when user has no bong balance", async () => {
    const user = userEvent.setup();

    mockAuthFetch.mockImplementation(async (url: string) => {
      if (url.endsWith("/api/redemption/recent")) {
        return jsonResponse([]);
      }

      if (url.endsWith("/api/redemption")) {
        return jsonResponse(null, {
          ok: false,
          status: 404,
        });
      }

      throw new Error(`Unexpected authFetch call: ${url}`);
    });

    render(<Redeem />);

    await screen.findByText("Ingen har velat bli av med en bong");

    await uploadRequiredVideo(user);
    await user.click(screen.getByRole("button", { name: "Skicka" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Du verkar inte ha något saldo i bongdatabasen. Ring Bongmeister",
    );

    expect(mockUploadFetch).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Skicka" })).toBeEnabled();
  });

  it("shows generic error when redemption create request response is not ok", async () => {
    const user = userEvent.setup();

    mockAuthFetch.mockImplementation(async (url: string) => {
      if (url.endsWith("/api/redemption/recent")) {
        return jsonResponse([]);
      }

      if (url.endsWith("/api/redemption")) {
        return jsonResponse(null, {
          ok: false,
          status: 500,
        });
      }

      throw new Error(`Unexpected authFetch call: ${url}`);
    });

    render(<Redeem />);

    await screen.findByText("Ingen har velat bli av med en bong");

    await uploadRequiredVideo(user);
    await user.click(screen.getByRole("button", { name: "Skicka" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Något gick fel");

    expect(mockUploadFetch).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Skicka" })).toBeEnabled();
  });

  it("shows fallback error when redemption create throws", async () => {
    const user = userEvent.setup();

    mockAuthFetch.mockImplementation(async (url: string) => {
      if (url.endsWith("/api/redemption/recent")) {
        return jsonResponse([]);
      }

      if (url.endsWith("/api/redemption")) {
        throw new Error("Network failed");
      }

      throw new Error(`Unexpected authFetch call: ${url}`);
    });

    render(<Redeem />);

    await screen.findByText("Ingen har velat bli av med en bong");

    await uploadRequiredVideo(user);
    await user.click(screen.getByRole("button", { name: "Skicka" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Network failed");

    expect(mockUploadFetch).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Skicka" })).toBeEnabled();
  });

  it("shows error when direct video upload response is not ok", async () => {
    const user = userEvent.setup();

    mockUploadFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    mockAuthFetch.mockImplementation(async (url: string) => {
      if (url.endsWith("/api/redemption/recent")) {
        return jsonResponse([]);
      }

      if (url.endsWith("/api/redemption")) {
        return jsonResponse({
          redemptionId: "redemption-1",
          postUrl: "https://upload.example.com",
          formData: {},
        });
      }

      throw new Error(`Unexpected authFetch call: ${url}`);
    });

    render(<Redeem />);

    await screen.findByText("Ingen har velat bli av med en bong");

    await uploadRequiredVideo(user);
    await user.click(screen.getByRole("button", { name: "Skicka" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Videouppladdningen misslyckades (500).",
    );

    expect(mockAuthFetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/redemption/complete-upload"),
      expect.anything(),
    );

    expect(screen.getByRole("button", { name: "Skicka" })).toBeEnabled();
  });

  it("shows error when direct video upload throws", async () => {
    const user = userEvent.setup();

    mockUploadFetch.mockRejectedValueOnce(new Error("Upload network failed"));

    mockAuthFetch.mockImplementation(async (url: string) => {
      if (url.endsWith("/api/redemption/recent")) {
        return jsonResponse([]);
      }

      if (url.endsWith("/api/redemption")) {
        return jsonResponse({
          redemptionId: "redemption-1",
          postUrl: "https://upload.example.com",
          formData: {},
        });
      }

      throw new Error(`Unexpected authFetch call: ${url}`);
    });

    render(<Redeem />);

    await screen.findByText("Ingen har velat bli av med en bong");

    await uploadRequiredVideo(user);
    await user.click(screen.getByRole("button", { name: "Skicka" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Upload network failed",
    );

    expect(screen.getByRole("button", { name: "Skicka" })).toBeEnabled();
  });

  it("shows error when complete upload response is not ok", async () => {
    const user = userEvent.setup();

    mockAuthFetch.mockImplementation(async (url: string) => {
      if (url.endsWith("/api/redemption/recent")) {
        return jsonResponse([]);
      }

      if (url.endsWith("/api/redemption")) {
        return jsonResponse({
          redemptionId: "redemption-1",
          postUrl: "https://upload.example.com",
          formData: {},
        });
      }

      if (url.endsWith("/api/redemption/complete-upload")) {
        return jsonResponse(null, {
          ok: false,
          status: 500,
        });
      }

      throw new Error(`Unexpected authFetch call: ${url}`);
    });

    render(<Redeem />);

    await screen.findByText("Ingen har velat bli av med en bong");

    await uploadRequiredVideo(user);
    await user.click(screen.getByRole("button", { name: "Skicka" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Den uppladdade videon kunde inte verifieras.",
    );

    expect(mockUploadFetch).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Skicka" })).toBeEnabled();
  });

  it("shows error when complete upload throws", async () => {
    const user = userEvent.setup();

    mockAuthFetch.mockImplementation(async (url: string) => {
      if (url.endsWith("/api/redemption/recent")) {
        return jsonResponse([]);
      }

      if (url.endsWith("/api/redemption")) {
        return jsonResponse({
          redemptionId: "redemption-1",
          postUrl: "https://upload.example.com",
          formData: {},
        });
      }

      if (url.endsWith("/api/redemption/complete-upload")) {
        throw new Error("Complete upload failed");
      }

      throw new Error(`Unexpected authFetch call: ${url}`);
    });

    render(<Redeem />);

    await screen.findByText("Ingen har velat bli av med en bong");

    await uploadRequiredVideo(user);
    await user.click(screen.getByRole("button", { name: "Skicka" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Complete upload failed",
    );

    expect(screen.getByRole("button", { name: "Skicka" })).toBeEnabled();
  });

  it("loads more redemptions with correct skip query", async () => {
    const user = userEvent.setup();

    mockAuthFetch.mockImplementation(async (url: string) => {
      if (url.endsWith("/api/redemption/recent")) {
        return jsonResponse([
          createRedemption(1, { id: "redemption-1", videoId: "video-1" }),
          createRedemption(2, { id: "redemption-2", videoId: "video-2" }),
        ]);
      }

      if (url.endsWith("/api/redemption/recent?skip=2")) {
        return jsonResponse([
          createRedemption(3, {
            id: "redemption-3",
            memberName: "Loaded More",
            videoId: "video-3",
          }),
        ]);
      }

      if (url.includes("/api/files/") && url.endsWith("/playback-url")) {
        const videoId = url.split("/api/files/")[1].replace("/playback-url", "");

        return jsonResponse({
          videoUrl: `https://example.com/${decodeURIComponent(videoId)}.mp4`,
        });
      }

      throw new Error(`Unexpected authFetch call: ${url}`);
    });

    const { container } = render(<Redeem />);

    await waitFor(() => {
      expect(container.querySelectorAll("article")).toHaveLength(2);
    });

    await user.click(screen.getByRole("button", { name: "Visa fler" }));

    await waitFor(() => {
      expect(container.querySelectorAll("article")).toHaveLength(3);
    });

    expect(mockAuthFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/redemption/recent?skip=2"),
    );

    expect(getAuthFetchUrls().some((url) => url.includes("skip=-"))).toBe(false);
    expect(screen.getByText("Loaded More")).toBeInTheDocument();
  });

  it("does not use negative skip when loading more from empty list", async () => {
    const user = userEvent.setup();
    let recentCalls = 0;

    mockAuthFetch.mockImplementation(async (url: string) => {
      if (url.endsWith("/api/redemption/recent")) {
        recentCalls += 1;

        if (recentCalls === 1) {
          return jsonResponse([]);
        }

        return jsonResponse([
          createRedemption(1, {
            memberName: "Loaded After Empty",
            videoId: "video-1",
          }),
        ]);
      }

      if (url.includes("/api/files/") && url.endsWith("/playback-url")) {
        return jsonResponse({
          videoUrl: "https://example.com/video-1.mp4",
        });
      }

      throw new Error(`Unexpected authFetch call: ${url}`);
    });

    render(<Redeem />);

    expect(
      await screen.findByText("Ingen har velat bli av med en bong"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Visa fler" }));

    expect(await screen.findByText("Loaded After Empty")).toBeInTheDocument();

    expect(getAuthFetchUrls().some((url) => url.includes("skip=-"))).toBe(false);
    expect(getAuthFetchUrls().some((url) => url.includes("skip=0"))).toBe(false);
  });

  it("shows alert when there are no more redemptions", async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => undefined);

    mockAuthFetch.mockImplementation(async (url: string) => {
      if (url.endsWith("/api/redemption/recent")) {
        return jsonResponse([
          createRedemption(1, { id: "redemption-1", videoId: "video-1" }),
        ]);
      }

      if (url.endsWith("/api/redemption/recent?skip=1")) {
        return jsonResponse([]);
      }

      if (url.includes("/api/files/") && url.endsWith("/playback-url")) {
        return jsonResponse({
          videoUrl: "https://example.com/video.mp4",
        });
      }

      throw new Error(`Unexpected authFetch call: ${url}`);
    });

    render(<Redeem />);

    await screen.findByText("Member 1");

    await user.click(screen.getByRole("button", { name: "Visa fler" }));

    expect(alertSpy).toHaveBeenCalledWith("Det finns inga fler tagna bongar");

    alertSpy.mockRestore();
  });

  it("shows load more error when loading more fails", async () => {
    const user = userEvent.setup();

    mockAuthFetch.mockImplementation(async (url: string) => {
      if (url.endsWith("/api/redemption/recent")) {
        return jsonResponse([
          createRedemption(1, { id: "redemption-1", videoId: "video-1" }),
        ]);
      }

      if (url.endsWith("/api/redemption/recent?skip=1")) {
        return jsonResponse(null, {
          ok: false,
          status: 500,
        });
      }

      if (url.includes("/api/files/") && url.endsWith("/playback-url")) {
        return jsonResponse({
          videoUrl: "https://example.com/video.mp4",
        });
      }

      throw new Error(`Unexpected authFetch call: ${url}`);
    });

    render(<Redeem />);

    await screen.findByText("Member 1");

    await user.click(screen.getByRole("button", { name: "Visa fler" }));

    expect(
      await screen.findByText("Kunde inte hämta fler tagna bongar"),
    ).toBeInTheDocument();
  });

  it("navigates to add page from footer Ge bong button", async () => {
    const user = userEvent.setup();

    mockInitialRedemptions([]);

    render(<Redeem />);

    await screen.findByText("Ingen har velat bli av med en bong");

    await user.click(screen.getByLabelText("Add shot from footer"));

    expect(mockNavigate).toHaveBeenCalledWith("/add");
  });

  describe("Bongmeister", () => {
    it("shows moderation buttons for BONGMEISTER on pending redemption", async () => {
        mockUserRoles(["BONGMEISTER"]);

        mockInitialRedemptions([
        createRedemption(1, {
            status: "PENDING",
        }),
        ]);

        render(<Redeem />);

        expect(await screen.findByText("Väntar")).toBeInTheDocument();

        expect(screen.getByRole("button", { name: "Godkänn" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Ändra" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Neka" })).toBeInTheDocument();
    });

    it("hides moderation buttons for regular user", async () => {
        mockUserRoles([]);

        mockInitialRedemptions([
        createRedemption(1, {
            status: "PENDING",
        }),
        ]);

        render(<Redeem />);

        expect(await screen.findByText("Väntar")).toBeInTheDocument();

        expectModerationButtonsToBeGone();
    });

    it("approves a pending redemption as bongmeister and hides moderation buttons", async () => {
        const user = userEvent.setup();

        mockUserRoles(["BONGMEISTER"]);

        mockAuthFetch.mockImplementation(async (url: string, options?: RequestInit) => {
        if (url.endsWith("/api/redemption/recent")) {
            return jsonResponse([
            createRedemption(1, {
                id: "redemption-1",
                status: "PENDING",
                videoId: "video-1",
            }),
            ]);
        }

        if (url.includes("/api/files/") && url.endsWith("/playback-url")) {
            return jsonResponse({
            videoUrl: "https://example.com/video-1.mp4",
            });
        }

        if (url === "/api/bongmeister/redeem/redemption-1") {
            expect(options?.method).toBe("PATCH");
            expect(options?.headers).toEqual({
            "Content-Type": "application/json",
            });
            expect(JSON.parse(String(options?.body))).toEqual({
            action: "APPROVE",
            });

            return jsonResponse({
            id: "redemption-1",
            memberName: "Member 1",
            amount: 1,
            status: "APPROVED",
            createdAt: "2026-08-10T08:01:00.000Z",
            videoId: "video-1",
            videoUrl: "https://example.com/video-1.mp4",
            acceptedByName: "Bongmeister",
            });
        }

        throw new Error(`Unexpected authFetch call: ${url}`);
        });

        render(<Redeem />);

        await screen.findByText("Väntar");

        await user.click(screen.getByRole("button", { name: "Godkänn" }));

        expect(await screen.findByText("OK")).toBeInTheDocument();

        await waitFor(() => {
        expectModerationButtonsToBeGone();
        });
    });

    it("rejects a pending redemption as bongmeister and hides moderation buttons", async () => {
        const user = userEvent.setup();

        mockUserRoles(["BONGMEISTER"]);

        mockAuthFetch.mockImplementation(async (url: string, options?: RequestInit) => {
        if (url.endsWith("/api/redemption/recent")) {
            return jsonResponse([
            createRedemption(1, {
                id: "redemption-1",
                status: "PENDING",
                videoId: "video-1",
            }),
            ]);
        }

        if (url.includes("/api/files/") && url.endsWith("/playback-url")) {
            return jsonResponse({
            videoUrl: "https://example.com/video-1.mp4",
            });
        }

        if (url === "/api/bongmeister/redeem/redemption-1") {
            expect(options?.method).toBe("PATCH");
            expect(JSON.parse(String(options?.body))).toEqual({
            action: "REJECT",
            });

            return jsonResponse({
            id: "redemption-1",
            memberName: "Member 1",
            amount: 1,
            status: "DENIED",
            createdAt: "2026-08-10T08:01:00.000Z",
            videoId: "video-1",
            videoUrl: "https://example.com/video-1.mp4",
            acceptedByName: "Bongmeister",
            });
        }

        throw new Error(`Unexpected authFetch call: ${url}`);
        });

        render(<Redeem />);

        await screen.findByText("Väntar");

        await user.click(screen.getByRole("button", { name: "Neka" }));

        expect(await screen.findByText("Nekad")).toBeInTheDocument();

        await waitFor(() => {
        expectModerationButtonsToBeGone();
        });
    });

    it("edits amount and approves a pending redemption as bongmeister", async () => {
        const user = userEvent.setup();
        const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("5");

        mockUserRoles(["BONGMEISTER"]);

        mockAuthFetch.mockImplementation(async (url: string, options?: RequestInit) => {
        if (url.endsWith("/api/redemption/recent")) {
            return jsonResponse([
            createRedemption(1, {
                id: "redemption-1",
                amount: 2,
                status: "PENDING",
                videoId: "video-1",
            }),
            ]);
        }

        if (url.includes("/api/files/") && url.endsWith("/playback-url")) {
            return jsonResponse({
            videoUrl: "https://example.com/video-1.mp4",
            });
        }

        if (url === "/api/bongmeister/redeem/redemption-1") {
            expect(options?.method).toBe("PATCH");
            expect(JSON.parse(String(options?.body))).toEqual({
            action: "APPROVE",
            amount: 5,
            });

            return jsonResponse({
            id: "redemption-1",
            memberName: "Member 1",
            amount: 5,
            status: "APPROVED",
            createdAt: "2026-08-10T08:01:00.000Z",
            videoId: "video-1",
            videoUrl: "https://example.com/video-1.mp4",
            acceptedByName: "Bongmeister",
            });
        }

        throw new Error(`Unexpected authFetch call: ${url}`);
        });

        render(<Redeem />);

        await screen.findByText("Väntar");

        await user.click(screen.getByRole("button", { name: "Ändra" }));

        expect(promptSpy).toHaveBeenCalledWith("Antal", "2");

        expect(await screen.findByText(/Vill bli av med 5 bongar/i)).toBeInTheDocument();
        expect(screen.getByText("OK")).toBeInTheDocument();

        await waitFor(() => {
        expectModerationButtonsToBeGone();
        });

        promptSpy.mockRestore();
    });

    it("does not approve edited redemption when prompt is cancelled", async () => {
        const user = userEvent.setup();
        const promptSpy = vi.spyOn(window, "prompt").mockReturnValue(null);

        mockUserRoles(["BONGMEISTER"]);

        mockInitialRedemptions([
        createRedemption(1, {
            id: "redemption-1",
            amount: 2,
            status: "PENDING",
        }),
        ]);

        render(<Redeem />);

        await screen.findByText("Väntar");

        await user.click(screen.getByRole("button", { name: "Ändra" }));

        expect(promptSpy).toHaveBeenCalledWith("Antal", "2");

        expect(mockAuthFetch).not.toHaveBeenCalledWith(
        "/api/bongmeister/redeem/redemption-1",
        expect.anything(),
        );

        promptSpy.mockRestore();
    });

    it.each(["0", "-1", "abc", "1.5"])(
        "shows alert when edited amount is invalid: %s",
        async (invalidAmount) => {
        const user = userEvent.setup();
        const promptSpy = vi.spyOn(window, "prompt").mockReturnValue(invalidAmount);
        const alertSpy = vi
            .spyOn(window, "alert")
            .mockImplementation(() => undefined);

        mockUserRoles(["BONGMEISTER"]);

        mockInitialRedemptions([
            createRedemption(1, {
            id: "redemption-1",
            amount: 2,
            status: "PENDING",
            }),
        ]);

        render(<Redeem />);

        await screen.findByText("Väntar");

        await user.click(screen.getByRole("button", { name: "Ändra" }));

        expect(promptSpy).toHaveBeenCalledWith("Antal", "2");
        expect(alertSpy).toHaveBeenCalledWith(
            "Antal måste vara ett heltal på minst 1.",
        );

        expect(mockAuthFetch).not.toHaveBeenCalledWith(
            "/api/bongmeister/redeem/redemption-1",
            expect.anything(),
        );

        promptSpy.mockRestore();
        alertSpy.mockRestore();
        },
    );

    it("shows alert when moderation request fails with backend message", async () => {
        const user = userEvent.setup();
        const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => undefined);

        mockUserRoles(["BONGMEISTER"]);

        mockAuthFetch.mockImplementation(async (url: string) => {
        if (url.endsWith("/api/redemption/recent")) {
            return jsonResponse([
            createRedemption(1, {
                id: "redemption-1",
                status: "PENDING",
                videoId: "video-1",
            }),
            ]);
        }

        if (url.includes("/api/files/") && url.endsWith("/playback-url")) {
            return jsonResponse({
            videoUrl: "https://example.com/video-1.mp4",
            });
        }

        if (url === "/api/bongmeister/redeem/redemption-1") {
            return jsonResponse(
            {
                message: "Du får inte hantera den här inlösningen.",
            },
            {
                ok: false,
                status: 403,
            },
            );
        }

        throw new Error(`Unexpected authFetch call: ${url}`);
        });

        render(<Redeem />);

        await screen.findByText("Väntar");

        await user.click(screen.getByRole("button", { name: "Godkänn" }));

        expect(alertSpy).toHaveBeenCalledWith(
        "Du får inte hantera den här inlösningen.",
        );

        alertSpy.mockRestore();
    });

    it("shows fallback alert when moderation request fails without backend message", async () => {
        const user = userEvent.setup();
        const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => undefined);

        mockUserRoles(["BONGMEISTER"]);

        mockAuthFetch.mockImplementation(async (url: string) => {
        if (url.endsWith("/api/redemption/recent")) {
            return jsonResponse([
            createRedemption(1, {
                id: "redemption-1",
                status: "PENDING",
                videoId: "video-1",
            }),
            ]);
        }

        if (url.includes("/api/files/") && url.endsWith("/playback-url")) {
            return jsonResponse({
            videoUrl: "https://example.com/video-1.mp4",
            });
        }

        if (url === "/api/bongmeister/redeem/redemption-1") {
            return jsonResponse(
            {},
            {
                ok: false,
                status: 500,
            },
            );
        }

        throw new Error(`Unexpected authFetch call: ${url}`);
        });

        render(<Redeem />);

        await screen.findByText("Väntar");

        await user.click(screen.getByRole("button", { name: "Godkänn" }));

        expect(alertSpy).toHaveBeenCalledWith("Kunde inte hantera bongen.");

        alertSpy.mockRestore();
    });
    })
});