import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Signal } from './entities/signal.entity';
import { CreateSignalDto } from './dto/create-signa.dto';

@Injectable()
export class SignalsService {
  private readonly logger = new Logger(SignalsService.name);

  constructor(
    @InjectRepository(Signal)
    private signalsRepository: Repository<Signal>,
  ) {}

  async createSignal(data: CreateSignalDto): Promise<Signal> {
    const signal = this.signalsRepository.create(data);
    return await this.signalsRepository.save(signal);
  }

  async findByAccount(accountId: number): Promise<Signal[]> {
    return this.signalsRepository.find({
      where: { accountId },
      order: { timestamp: 'DESC' },
    });
  }

  async findBySource(source: string, limit: number = 50): Promise<Signal[]> {
    return this.signalsRepository.find({
      where: { source },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  async findRecent(limit: number = 50): Promise<Signal[]> {
    return this.signalsRepository.find({
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  async findUnknownEvents(limit: number = 50): Promise<Signal[]> {
    return this.signalsRepository.find({
      where: { eventType: 'unknown' },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  async getStats() {
    const total = await this.signalsRepository.count();
    const unknownCount = await this.signalsRepository.count({
      where: { eventType: 'unknown' },
    });

    const bySource = await this.signalsRepository
      .createQueryBuilder('signal')
      .select('signal.source', 'source')
      .addSelect('COUNT(*)', 'count')
      .groupBy('signal.source')
      .getRawMany();

    const byEventType = await this.signalsRepository
      .createQueryBuilder('signal')
      .select('signal.eventType', 'eventType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('signal.eventType')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      total,
      unknownCount,
      bySource,
      topEventTypes: byEventType,
    };
  }
}
