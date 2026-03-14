import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { LeadService } from '../services/lead.service';
import { LeadSchema } from '@birthub/shared-types';
import { ValidationError } from '@birthub/utils/src/errors';

export class LeadController {
  private service: LeadService;

  constructor() {
    this.service = new LeadService();
  }

  async index(req: Request, res: Response, next: NextFunction) {
    try {
      const leads = await this.service.getAllLeads(req.user.tenantId);
      res.json(leads);
    } catch (error) {
      next(error);
    }
  }

  async show(req: Request, res: Response, next: NextFunction) {
    try {
      const lead = await this.service.getLeadById(req.params.id, req.user.tenantId);
      res.json(lead);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = LeadSchema.parse(req.body);
      const lead = await this.service.createLead(validatedData, req.user.tenantId);
      res.status(201).json(lead);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new ValidationError(error.errors.map(e => e.message).join(', ')));
      } else {
        next(error);
      }
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = LeadSchema.partial().parse(req.body);
      const lead = await this.service.updateLead(req.params.id, validatedData, req.user.tenantId);
      res.json(lead);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new ValidationError(error.errors.map(e => e.message).join(', ')));
      } else {
        next(error);
      }
    }
  }

  async destroy(req: Request, res: Response, next: NextFunction) {
    try {
      await this.service.deleteLead(req.params.id, req.user.tenantId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
