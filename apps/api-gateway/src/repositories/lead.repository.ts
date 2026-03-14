import { PrismaClient, Lead } from '@prisma/client';
import { LeadInput } from '@birthub/shared-types';

const prisma = new PrismaClient();

export class LeadRepository {
  async findAll(tenantId: string): Promise<Lead[]> {
    return prisma.lead.findMany({
      where: { tenantId }
    });
  }

  async findById(id: string, tenantId: string): Promise<Lead | null> {
    return prisma.lead.findUnique({
      where: { id, tenantId }
    });
  }

  async create(data: LeadInput, tenantId: string): Promise<Lead> {
    return prisma.lead.create({
      data: {
        ...data,
        tenantId
      }
    });
  }

  async update(id: string, data: Partial<LeadInput>, tenantId: string): Promise<Lead> {
    return prisma.lead.update({
      where: { id, tenantId },
      data
    });
  }

  async delete(id: string, tenantId: string): Promise<Lead> {
    return prisma.lead.delete({
      where: { id, tenantId }
    });
  }
}
