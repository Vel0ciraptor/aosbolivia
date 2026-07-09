export enum Role {
  CLIENT = 'CLIENT',
  PROVIDER = 'PROVIDER',
  WORKSHOP = 'WORKSHOP',
  TOW_SERVICE = 'TOW_SERVICE',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BANNED = 'BANNED',
}

export enum RequestCategory {
  REPUESTO = 'REPUESTO',
  TALLER = 'TALLER',
  GRUA = 'GRUA',
  CONSULTA = 'CONSULTA',
}

export enum RequestStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum QuoteStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export enum BusinessStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING_REVIEW = 'PENDING_REVIEW',
}
