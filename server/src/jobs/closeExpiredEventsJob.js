import cron from "node-cron";
import { Event } from "../models/eventModel";

export function startCloseExpiredEventsJob() {
  return cron.schedule(
    "*/5 * * * *",
    async () => {
      try {
        await Event.closeExpiredEvents();
        console.log("Expired events processed successfully.");
      } catch (err) {
        console.error("Failed to process expired events:", err);
      }
    },
    {
      noOverlap: true,
      timezone: "UTC",
    },
  );
}
