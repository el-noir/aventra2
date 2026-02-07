import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';

@Entity('signals')
@Index(['source', 'eventType'])
@Index(['accountId'])
@Index(['userId'])
@Index(['timestamp'])
export class Signal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  source: string; // hubspot, stripe, customerio, posthog

  @Column()
  eventType: string; // contact.created, deal.closed, etc.

  @Column({ nullable: true })
  accountId: string;

  @Column({ nullable: true })
  userId: string;

  @Column('jsonb', { nullable: true })
  metadata: any; // raw event data

  @CreateDateColumn()
  timestamp: Date;
}