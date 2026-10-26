import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { App, ErrorNotice, Results, UploadPage } from "./App";
import { api, get, type Result } from "./api";
vi.mock("./api", () => ({
  api: { post: vi.fn(), get: vi.fn() },
  get: vi.fn(),
  message: (e: unknown) => (e instanceof Error ? e.message : "Request failed"),
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
describe("local workspace UI", () => {
  it("shows real empty state and unavailable service status", async () => {
    vi.mocked(get).mockImplementation(async (url) =>
      url === "/health"
        ? { database: false }
        : url === "/ollama/status"
          ? { modelReady: false, model: "llama3.2:1b" }
          : [],
    );
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByText("A new home for your code")).toBeTruthy();
    expect(screen.getByText("Runtime needs setup")).toBeTruthy();
    expect(screen.queryByText("Local runtime ready")).toBeNull();
  });
  it("uploads selected ZIP and navigates to returned project", async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { data: { _id: "new-project" } },
    });
    render(
      <MemoryRouter initialEntries={["/upload"]}>
        <Routes>
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/projects/:id" element={<div>Project imported</div>} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText("Project ZIP"), {
      target: {
        files: [new File(["zip"], "demo.zip", { type: "application/zip" })],
      },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Create local workspace/ }),
    );
    expect(await screen.findByText("Project imported")).toBeTruthy();
    expect(api.post).toHaveBeenCalledOnce();
  });
  it("rejects non-ZIP files and shows upload service errors", async () => {
    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText("Project ZIP"), {
      target: { files: [new File(["bad"], "bad.exe")] },
    });
    expect(screen.getByRole("alert").textContent).toContain("ZIP archive");
    vi.mocked(api.post).mockRejectedValue(new Error("MongoDB is unavailable."));
    fireEvent.change(screen.getByLabelText("Project ZIP"), {
      target: { files: [new File(["zip"], "demo.zip")] },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Create local workspace/ }),
    );
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("MongoDB"),
    );
  });
  it("renders severity and coverage without treating no matches as proof of safety", () => {
    const result: Result = {
      summary: "Review complete.",
      markdown: "",
      findings: [
        {
          title: "Dynamic evaluation",
          severity: "high",
          confidence: "medium",
          file: "index.js",
          line: 2,
          description: "Potential unsafe input.",
          recommendation: "Inspect input flow.",
        },
      ],
      metadata: {
        inspectedFiles: ["index.js"],
        totalFiles: 4,
        durationMs: 1000,
        modelMs: 500,
        rssBytes: 1000000,
        contextTruncated: true,
        toolErrors: [],
        note: "Not exhaustive.",
      },
    };
    render(<Results result={result} />);
    expect(screen.getByText("index.js:2")).toBeTruthy();
    expect(screen.getByText("1 / 4 files inspected")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Filter severity"), {
      target: { value: "low" },
    });
    expect(
      screen.getByText(
        "This does not establish that the project is free of issues.",
      ),
    ).toBeTruthy();
  });
  it("provides retry for a failed request", () => {
    const retry = vi.fn();
    render(<ErrorNotice error="Server offline" retry={retry} />);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
