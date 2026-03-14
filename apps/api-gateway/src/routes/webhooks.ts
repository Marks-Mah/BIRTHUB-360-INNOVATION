import express from "express";

export const webhooksRouter = express.Router();

webhooksRouter.post("/stripe", express.raw({ type: "application/json" }), (req, res) => {
  const sig = req.headers["stripe-signature"];
  // Verify signature
  console.log("Received Stripe webhook");
  res.json({ received: true });
});

webhooksRouter.post("/crm", (req, res) => {
  console.log("Received CRM webhook", req.body);
  res.json({ received: true });
});
