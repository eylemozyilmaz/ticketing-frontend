// src/types/ticket.types.ts
// Ticketing sistemi temel tip tanımları

export interface TicketStatus {
  id: string;
  name: string;
  color: string;
  isInitial: boolean;
  isClosed: boolean;
  sortOrder: number;
}

export interface Customer {
  id: string;
  email: string;
  name: string;
  phone?: string;
  isVip: boolean;
  erpCustomerId?: string;
  isErpMatched?: boolean;
  emails?: { email: string; isPrimary: boolean }[];
}

export interface Agent {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  availability: string;
}

export interface Department {
  id: string;
  name: string;
  slug?: string;
  type: string;
  notificationEmail?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ResolutionType {
  id: string;
  name: string;
  description?: string;
  requiresAmount: boolean;
  sortOrder: number;
  isActive: boolean;
}

export interface TicketResolution {
  id: string;
  ticketId: string;
  resolutionTypeId: string;
  resolutionType?: ResolutionType;
  description: string;
  compensationTl?: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  author?: Agent;
  direction: 'INBOUND' | 'OUTBOUND';
  isInternal: boolean;
  bodyText?: string;
  bodyHtml?: string;
  sentAt: string;
  createdAt?: string;
  status?: string;
}

export interface TicketAttachment {
  id: string;
  ticketId: string;
  filename: string;
  mimeType?: string;
  contentType?: string;
  sizeBytes?: number;
  size_bytes?: number;
  storagePath: string;
  uploadedById: string;
}

export interface TicketCategory {
  categoryId: string;
  category?: { id: string; name: string };
}

export interface Category {
  id: string;
  name: string;
  parentId?: string;
  children?: Category[];
  sortOrder: number;
  isActive: boolean;
}

export interface ApprovalRequest {
  id: string;
  ticketId: string;
  resolutionId?: string;
  requestType: string;
  requestedById: string;
  actorId?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  note?: string;
  resolvedAt?: string;
  approverName?: string;
  approver?: Agent;
  level?: string;
  comment?: string;
  decision?: string;
}

export interface TicketTransfer {
  id: string;
  ticketId: string;
  transferType: 'FORWARD' | 'RECALL' | 'SPLIT' | 'MERGE' | 'TRANSFER';
  toProjectId?: string;
  toDeptId?: string;
  mergedTicketId?: string;
  note?: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  projectId: string;
  parentTicketId?: string;
  parentTicket?: { id: string; ticketNo: string };
  ticketNo: string;
  customerId: string;
  customer?: Customer;
  ownerId?: string;
  owner?: Agent;
  ownerDeptId?: string;
  assigneeId?: string;
  assignee?: Agent;
  departmentId?: string;
  department?: Department;
  statusId: string;
  status?: TicketStatus;
  slaRuleId?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  source: 'EMAIL' | 'PHONE' | 'MANUAL' | 'API';
  subject: string;
  closureOutcome?: string;
  isVip: boolean;
  isForwarded: boolean;
  is_forwarded?: boolean;
  isChild?: boolean;
  is_child?: boolean;
  viewedAt?: string;
  firstResponseAt?: string;
  slaDeadlineAt?: string;
  slaBreachedAt?: string;
  closedAt?: string;
  closedById?: string;
  createdAt: string;
  childTickets?: Ticket[];
  transfers?: TicketTransfer[];
}

export interface SlaInfo {
  resolutionDeadline?: string;
  resolution_deadline?: string;
  slaDeadlineAt?: string;
  isPaused?: boolean;
  is_paused?: boolean;
  isResolutionBreached?: boolean;
  is_resolution_breached?: boolean;
}

export interface CustomField {
  id: string;
  fieldKey: string;
  displayName: string;
  fieldType: 'TEXT' | 'DATE' | 'DATETIME' | 'AMOUNT' | 'SELECT';
  options?: string[];
  isRequired: boolean;
  sortOrder: number;
  isActive: boolean;
}

export interface CustomValue {
  fieldId: string;
  value: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  role?: string;
  isActive: boolean;
}
