import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Contact } from '../../contacts/entities/contact.entity';
import { Account } from '../../accounts/entities/account.entity';
import { Organization } from '../../organizations/entities/organization.entity';

/**
 * Signals (Data Plane - Events)
 * Events about external contacts/accounts.
 * Always scoped to organizationId.
 */
@Entity('signals')
@Index(['organizationId'])
@Index(['source', 'eventType'])
@Index(['accountId'])
@Index(['contactId'])
@Index(['timestamp'])
export class Signal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true, default: 1 })
  organizationId: number;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column()
  source: string; // hubspot, stripe, customerio, posthog

  @Column()
  eventType: string; // contact.created, deal.closed, etc.

  @Column({ nullable: true })
  contactId: number;

  @ManyToOne(() => Contact, { nullable: true })
  @JoinColumn({ name: 'contactId' })
  contact: Contact;

  @Column({ nullable: true })
  accountId: number;

  @ManyToOne(() => Account, { nullable: true })
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @Column('jsonb', { nullable: true })
  metadata: any; // raw event data

  @CreateDateColumn()
  timestamp: Date;
}