import { afterEach, describe, expect, it } from "bun:test";
import { startScheduler, stopScheduler } from "./scheduler";

const hourIn = (date: Date, timeZone: string) =>
  Number(new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hour12: false }).format(date));

afterEach(async () => {
  await stopScheduler();
});

describe("startScheduler", () => {
  it("domyślnie planuje na 03:00 czasu polskiego niezależnie od strefy kontenera", () => {
    const task = startScheduler();
    const next = task.getNextRun()!;

    expect(hourIn(next, "Europe/Warsaw")).toBe(3);
    expect(next.getMinutes()).toBe(0);
  });

  it("respektuje inną strefę i wyrażenie", () => {
    const task = startScheduler({ expression: "30 5 * * *", timezone: "America/New_York" });
    const next = task.getNextRun()!;

    expect(hourIn(next, "America/New_York")).toBe(5);
    expect(next.getMinutes()).toBe(30);
  });

  it("wykonuje zadanie w terminie", async () => {
    let runs = 0;
    startScheduler({
      expression: "* * * * * *", // co sekundę
      run: async () => {
        runs++;
      },
    });

    await Bun.sleep(2300);

    expect(runs).toBeGreaterThanOrEqual(1);
  });

  it("ponowny start zastępuje poprzedni harmonogram zamiast go dublować (bun --hot)", async () => {
    let first = 0;
    let second = 0;
    startScheduler({ expression: "* * * * * *", run: async () => void first++ });
    startScheduler({ expression: "* * * * * *", run: async () => void second++ });

    await Bun.sleep(2300);

    expect(first).toBe(0);
    expect(second).toBeGreaterThanOrEqual(1);
  });

  it("nie nakłada uruchomień, gdy poprzednie jeszcze trwa", async () => {
    let running = 0;
    let maxParallel = 0;
    startScheduler({
      expression: "* * * * * *",
      run: async () => {
        running++;
        maxParallel = Math.max(maxParallel, running);
        await Bun.sleep(1500);
        running--;
      },
    });

    await Bun.sleep(3300);

    expect(maxParallel).toBe(1);
  });
});
