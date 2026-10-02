import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ApiError } from "@/api/errors";
import { Button } from "./button";
import { ConfirmDialog, Dialog, DialogContent, DialogTitle, DialogTrigger } from "./dialog";
import { ErrorState } from "./error-state";
import { Pagination } from "./pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

describe("Button", () => {
  it("is busy and disabled while loading", () => {
    render(<Button loading>Place order</Button>);
    const button = screen.getByRole("button", { name: "Place order" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });
});

describe("Dialog", () => {
  it("opens, traps focus, and returns focus to the trigger on Escape", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Edit</Button>
        </DialogTrigger>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>Edit address</DialogTitle>
          <input aria-label="Street" />
        </DialogContent>
      </Dialog>,
    );
    const trigger = screen.getByRole("button", { name: "Edit" });
    await user.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Edit address" });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("confirm dialog names the action and reports the choice", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    function Harness() {
      const [open, setOpen] = useState(true);
      return <ConfirmDialog open={open} onOpenChange={setOpen} title="Remove this address?" confirmLabel="Remove address" onConfirm={onConfirm} />;
    }
    render(<Harness />);
    const dialog = await screen.findByRole("alertdialog", { name: "Remove this address?" });
    await user.click(within(dialog).getByRole("button", { name: "Remove address" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });
});

describe("Tabs", () => {
  it("switches panels with the arrow keys", async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="a">
        <TabsList aria-label="Info">
          <TabsTrigger value="a">Description</TabsTrigger>
          <TabsTrigger value="b">Details</TabsTrigger>
        </TabsList>
        <TabsContent value="a">First</TabsContent>
        <TabsContent value="b">Second</TabsContent>
      </Tabs>,
    );
    await user.click(screen.getByRole("tab", { name: "Description" }));
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Details" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Second");
  });
});

describe("Pagination", () => {
  it("renders links with the current page marked", () => {
    render(
      <MemoryRouter>
        <Pagination page={6} lastPage={12} hrefFor={(p) => `/books?page=${p}`} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Page 6" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Next page" })).toHaveAttribute("href", "/books?page=7");
    expect(screen.getByRole("link", { name: "Page 12" })).toBeInTheDocument();
  });

  it("disables Prev on the first page and calls back on click", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination page={1} lastPage={3} onPageChange={onPageChange} />);
    expect(screen.getByLabelText("Previous page")).toHaveAttribute("aria-disabled", "true");
    await user.click(screen.getByRole("button", { name: "Page 2" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("renders nothing for a single page", () => {
    const { container } = render(<Pagination page={1} lastPage={1} onPageChange={() => undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("ErrorState", () => {
  it("uses offline wording for network errors", () => {
    render(
      <MemoryRouter>
        <ErrorState error={new ApiError({ kind: "network", message: "Network Error" })} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "You're offline" })).toBeInTheDocument();
  });

  it("shows the API message and request id for server errors", async () => {
    const onRetry = vi.fn();
    render(
      <MemoryRouter>
        <ErrorState error={new ApiError({ kind: "server", status: 500, message: "The server had a problem.", requestId: "abc123" })} onRetry={onRetry} />
      </MemoryRouter>,
    );
    expect(screen.getByText("The server had a problem.")).toBeInTheDocument();
    expect(screen.getByText("Reference: abc123")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalled();
  });
});
