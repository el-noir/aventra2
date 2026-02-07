import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Account } from '../../accounts/entities/account.entity';
import { Organization } from '../../organizations/entities/organization.entity';

export enum ContactLifecycleStage {
  LEAD = 'lead',
  MQL = 'mql',
  SQL = 'sql',
  OPPORTUNITY = 'opportunity',
  CUSTOMER = 'customer',
  EVANGELIST = 'evangelist',
  CHURNED = 'churned',
}

/**
 * Contacts (Data Plane - External Customers)
 * People from HubSpot, product analytics, support tools.
 * They ARE the data, not platform users.
 * They never log in to our system.
 */
@Entity('contacts')
@Index(['organizationId'])
@Index(['accountId'])
@Index(['email'])
export class Contact {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  organizationId: number;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ nullable: true })
  accountId: number;

  @ManyToOne(() => Account, (account) => account.contacts, { nullable: true })
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  name: string;

  @Column('jsonb', { nullable: true })
  externalIds: {
    hubspot_contact_id?: string | undefined;
    stripe_customer_id?: string | undefined;
    customerio_id?: string | undefined;
    product_user_id?: string | undefined;
    [key: string]: string | undefined;
  };

  @Column({
    type: 'enum',
    enum: ContactLifecycleStage,
    default: ContactLifecycleStage.LEAD,
  })
  lifecycleStage: ContactLifecycleStage;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
