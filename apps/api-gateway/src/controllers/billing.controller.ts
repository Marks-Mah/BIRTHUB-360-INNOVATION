import { Request, Response, NextFunction } from 'express';
import { BillingService } from '../services/billing.service';

export class BillingController {
  private service: BillingService;

  constructor() {
    this.service = new BillingService();
  }

  async index(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await this.service.getBillingSummary(req.user.tenantId);
      res.json(summary);
    } catch (error) {
      next(error);
    }
  }
}
