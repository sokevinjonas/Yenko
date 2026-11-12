export type PlanType = 'ride' | 'study' | 'activity';
export type PlanStatus = 'open' | 'full' | 'cancelled' | 'done';
export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'removed' | 'expired';
export type Gender = 'male' | 'female';
export type ActivityCategory = 'football' | 'basketball' | 'outing' | 'party' | 'gym' | 'other';
export type ReportReason = 'wrong_number' | 'harassment' | 'no_show' | 'scam' | 'other';
export type ParticipationBlocker = 'not_verified' | 'profile_incomplete' | 'suspended';

export interface Hall {
  id: number;
  name: string;
}

export interface Destination {
  id: number;
  name: string;
  zone: 'campus' | 'off_campus';
}

export interface CardVerification {
  id: number;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface Me {
  id: number;
  student_id: string | null;
  name: string;
  email: string;
  hall: Hall | null;
  whatsapp: string | null;
  gender: Gender | null;
  bio: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  verification_method: 'email' | 'card' | null;
  email_verified: boolean;
  card_verification: CardVerification | null;
  is_suspended: boolean;
  suspension_reason: string | null;
  profile_complete: boolean;
  can_participate: boolean;
  participation_blocker: ParticipationBlocker | null;
  created_at: string;
}

export interface PublicUser {
  id: number;
  name: string;
  avatar_url: string | null;
  hall: string | null;
  is_verified: boolean;
}

export interface Member extends PublicUser {
  whatsapp: string | null;
}

export interface Plan {
  id: number;
  type: PlanType;
  title: string;
  description: string | null;
  destination: Destination | null;
  course: string | null;
  category: ActivityCategory | null;
  meeting_point: string;
  starts_at: string;
  seats_total: number;
  accepted_count: number;
  seats_left: number;
  price_per_person: number | null;
  women_only: boolean;
  auto_accept: boolean;
  status: PlanStatus;
  is_boosted: boolean;
  created_at: string;
  creator: PublicUser;
  viewer: {
    is_creator: boolean;
    request_id: number | null;
    request_status: RequestStatus | null;
    can_join: boolean;
    join_blocker: string | null;
    join_blocker_message: string | null;
  };
  pending_requests_count?: number;
  contacts?: {
    creator_whatsapp: string | null;
    whatsapp_group_link: string | null;
    members: Member[];
  };
}

export interface PlanRequest {
  id: number;
  status: RequestStatus;
  message: string | null;
  created_at: string;
  responded_at: string | null;
  user: PublicUser & { gender: Gender | null; whatsapp: string | null };
}

export interface AppNotification {
  id: string;
  type: string | null;
  title: string;
  body: string;
  plan_id: number | null;
  read_at: string | null;
  created_at: string;
}

export interface Paginated<T> {
  data: T[];
  meta: { current_page: number; last_page: number; total: number };
}

export interface AuthResponse {
  token: string;
  user: Me;
}

export interface PlanPayload {
  type?: PlanType;
  title: string;
  description: string | null;
  meeting_point: string;
  starts_at: string;
  seats_total: number;
  women_only: boolean;
  auto_accept: boolean;
  whatsapp_group_link: string | null;
  destination_id: number | null;
  price_per_person: number | null;
  course: string | null;
  category: ActivityCategory | null;
}
