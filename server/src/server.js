import "dotenv/config";
import { app } from "./app.js";
import { startCloseExpiredEventsJob } from "./jobs/closeExpiredEventsJob.js";

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  startCloseExpiredEventsJob();
});
