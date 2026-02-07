import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Account } from '../../accounts/entities/account.entity';
import { Signal } from '../../signals/entities/signal.entity';

/**
 * Organizations (Tenant Boundary)
 * Each GTM team/company using our platform.
 * All data is scoped to organizationId to prevent data leakage.
 */
@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: ['free', 'starter', 'pro', 'enterprise'], default: 'free' })
  plan: string;

  @OneToMany(() => User, (user) => user.organization)
  users: User[];

  @OneToMany(() => Account, (account) => account.organization)
  accounts: Account[];

  @OneToMany(() => Signal, (signal) => signal.organization)
  signals: Signal[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
