import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';

export interface CreateOrganizationDto {
  name: string;
  plan?: string;
}

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private organizationsRepository: Repository<Organization>,
  ) {}

  async create(data: CreateOrganizationDto): Promise<Organization> {
    const organization = this.organizationsRepository.create({
      name: data.name,
      plan: data.plan || 'free',
    });

    return await this.organizationsRepository.save(organization);
  }

  async findById(id: number): Promise<Organization | null> {
    return this.organizationsRepository.findOne({
      where: { id },
      relations: ['users', 'accounts'],
    });
  }

  async findAll(): Promise<Organization[]> {
    return this.organizationsRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async updatePlan(id: number, plan: string): Promise<Organization | null> {
    await this.organizationsRepository.update(id, { plan });
    return this.findById(id);
  }
}
