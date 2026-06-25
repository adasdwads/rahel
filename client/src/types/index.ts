export interface User {
  userID: string;
  name: string;
  email: string;
  phone?: string;
  status: 'Active' | 'Triggered' | 'Suspended' | 'Verified';
  lastHeartbeat?: string;
  missedPings?: number;
  heartbeatStreak?: number;
  uaePassID?: string;
  createdAt?: string;
  stats?: UserStats;
}

export interface UserStats {
  vaultFiles: number;
  heirs: number;
  charityFlows: number;
  pendingCapsules: number;
}

export interface VaultFile {
  fileID: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  formattedSize: string;
  accessTier: 'Financial' | 'Personal' | 'Legal' | 'Medical' | 'Restricted';
  description?: string;
  keyShardLocations: KeyShardLocation[];
  uploadedAt: string;
}

export interface KeyShardLocation {
  index: number;
  hash: string;
}

export interface KeyShard {
  shardID: string;
  shardIndex: number;
  shardHash: string;
  distributed: boolean;
  distributedAt?: string;
  recipientID?: string;
}

export interface Heir {
  recipientID: string;
  recipientName: string;
  phone: string;
  email?: string;
  relationship?: string;
  accessTier: 'Financial' | 'Personal' | 'Legal' | 'Medical' | 'All';
  verified: boolean;
  notified: boolean;
  createdAt: string;
}

export interface CharityFlow {
  flowID: string;
  charityName: string;
  charityCode: string;
  charityAPIEndpoint: string;
  recurringAmount: number;
  currency: string;
  walletBalance: number;
  frequency: 'once' | 'weekly' | 'monthly' | 'yearly';
  isActive: boolean;
  lastExecuted?: string;
  totalDisbursed: number;
  executionCount: number;
  createdAt: string;
}

export interface CharityEndpoint {
  key: string;
  name: string;
  endpoint: string;
  code: string;
}

export interface CharitySummary {
  totalFlows: number;
  activeFlows: number;
  walletBalance: number;
  totalDisbursed: number;
  currency: string;
}

export interface WalletTransaction {
  txID: string;
  flowID?: string;
  amount: number;
  currency: string;
  txType: 'deposit' | 'withdrawal' | 'charity_disbursement' | 'refund';
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  paymentMethod?: string;
  reference?: string;
  charityName?: string;
  createdAt: string;
}

export interface TimeCapsule {
  capsuleID: string;
  title: string;
  contentType: 'text' | 'voice' | 'video' | 'mixed';
  textContent?: string;
  targetReleaseDate: string;
  recipientContact: string;
  recipientName?: string;
  occasion?: string;
  delivered: boolean;
  deliveredAt?: string;
  createdAt: string;
  daysUntilRelease?: number;
  isPast?: boolean;
}

export interface SocialLegacyConfig {
  configID: string;
  platform: string;
  action: 'post_obituary' | 'deactivate' | 'memorialize' | 'delete';
  obituaryText?: string;
  donationLink?: string;
  isConfigured: boolean;
  executed: boolean;
  executedAt?: string;
  createdAt: string;
}

export interface SelfDestructItem {
  itemID: string;
  targetType: 'file' | 'account' | 'data' | 'browser_history' | 'app_data' | 'custom';
  targetPath?: string;
  description: string;
  priority: number;
  confirmed: boolean;
  executed: boolean;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  code?: string;
  message?: string;
}
