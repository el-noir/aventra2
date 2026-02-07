import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Contact } from '../../contacts/entities/contact.entity';
import { Organization } from '../../organizations/entities/organization.entity';

export enum LifecycleStage {
  VISITOR = 'visitor',
  TRIAL_STARTED = 'trial_started',
  ACTIVATED = 'activated',
  ENGAGED = 'engaged',
  AT_RISK = 'at_risk',
  EXPANSION_READY = 'expansion_ready',
  CHURN_RISK = 'churn_risk',
  CHURNED = 'churned',
}

/**
 * Accounts (Data Plane - External Companies)
 * Companies from HubSpot, CRM, etc.
 * They ARE the data, not platform users.
 */
@Entity('accounts')
@Index(['organizationId'])
@Index(['domain'])
@Index(['currentStage'])
export class Account {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  organizationId: number;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column()
  name: string;

  @Column({ nullable: true })
  domain: string;

  @Column('jsonb', { nullable: true })
  externalIds: {
    hubspot_company_id?: string | undefined;
    stripe_customer_id?: string | undefined;
    [key: string]: string | undefined;
  };

  @Column({
    type: 'enum',
    enum: LifecycleStage,
    default: LifecycleStage.VISITOR,
  })
  currentStage: LifecycleStage;

  @Column({ nullable: true })
  stageUpdatedAt: Date;

  @OneToMany(() => Contact, (contact) => contact.account)
  contacts: Contact[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
