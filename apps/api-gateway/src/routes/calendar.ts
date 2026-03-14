import { Router } from "express";
import { asyncHandler } from "../errors/http-error.js";
import { CalendarService } from "../services/calendar-service.js";
import { requireAuthorization } from "../middleware/authorization.js";

const calendarRouter: Router = Router();
const calendarService = new CalendarService();

calendarRouter.post("/availability", requireAuthorization({ roles: ["ae", "sdr", "admin"] }), asyncHandler(async (req, res) => {
  const { userId, date } = req.body;
  if (!userId || !date) {
    res.status(400).json({ error: "Missing userId or date" });
    return;
  }
  const slots = await calendarService.checkAvailability(userId, date);
  res.json({ slots });
}));

calendarRouter.post("/sync", requireAuthorization({ roles: ["ae", "admin"] }), asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const result = await calendarService.syncEvents(userId);
  res.json(result);
}));

export { calendarRouter };
