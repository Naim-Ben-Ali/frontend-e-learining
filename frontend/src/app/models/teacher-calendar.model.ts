/**
 * Teacher Calendar Management Models
 * Comprehensive interfaces for e-learning teacher schedule management
 */

// ============================================================================
// EVENT TYPES
// ============================================================================

export type TeacherCalendarEventType =
  | 'LIVE_CLASS'
  | 'OFFICE_HOURS'
  | 'QUIZ'
  | 'MILESTONE'
  | 'HOMEWORK_DEADLINE'
  | 'LECTURE'
  | 'EXAM'
  | 'MEETING'
  | 'ASSIGNMENT';

export type TeacherCalendarRecurrenceType =
  | 'NONE'
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY_FIRST_WEEKDAY';

export type MeetingPlatform = 'ZOOM' | 'TEAMS' | 'GOOGLE_MEET' | 'WEBEX' | 'OTHER';

// ============================================================================
// CORE EVENT INTERFACE
// ============================================================================

/**
 * Main calendar event interface used by the custom Angular calendar.
 */
export interface CalendarEvent {
  Id: string | number;
  Subject: string;
  StartTime: Date;
  EndTime: Date;
  Description?: string;
  Location?: string;
  IsAllDay?: boolean;
  RecurrenceRule?: string;
  RecurrenceID?: string | number;
  RecurrenceException?: string;
  FollowUp?: string;
  CategoryColor?: string;
  CategoryText?: string;

  // Custom e-learning fields
  CourseId: string;
  CourseTitle: string;
  ClassId?: string;
  ClassTitle?: string;
  EventType: TeacherCalendarEventType;
  EventTypeId: string; // For color coding

  // Meeting/Session details
  IsOnline: boolean;
  MeetingPlatform?: MeetingPlatform;
  MeetingLink?: string;
  MeetingId?: string;
  MeetingPassword?: string;

  // Additional details
  Notes?: string;
  Attachments?: CalendarAttachment[];
  Color?: string;
  IconCss?: string;

  // Teacher calendar specific
  TeacherId: string;
  SourceTimezone: string;
  RecurrenceGroupId?: string;
  RecurrenceIndex?: number;
  Cancelled: boolean;
  NotifyPolicy?: 'IMMEDIATE' | '15_MIN' | '1_HOUR' | '24_HOUR';
  SoftConflictCount: number;

  // Student-facing visibility
  VisibleToStudents: boolean;
  RequiredAttendance: boolean;

  // Metadata
  CreatedDate: string;
  ModifiedDate: string;
}

// ============================================================================
// RESOURCE INTERFACES
// ============================================================================

export interface CalendarResource {
  Id: string | number;
  Name: string;
  Color?: string;
  IconCss?: string;
  Text?: string;
}

export interface CourseResource extends CalendarResource {
  CourseCode?: string;
  StudentCount?: number;
}

export interface ClassGroupResource extends CalendarResource {
  CourseId?: string;
  MaxStudents?: number;
}

export interface RoomResource extends CalendarResource {
  RoomType: 'PHYSICAL' | 'VIRTUAL' | 'HYBRID';
  Capacity?: number;
  Building?: string;
  Floor?: string;
}

export interface MeetingTypeResource extends CalendarResource {
  Category: 'INSTRUCTIONAL' | 'ASSESSMENT' | 'ADMINISTRATIVE' | 'SUPPORT';
  DefaultDuration?: number; // minutes
}

// ============================================================================
// RESOURCE COLLECTIONS
// ============================================================================

export interface CalendarResources {
  courses: CourseResource[];
  classGroups: ClassGroupResource[];
  rooms: RoomResource[];
  meetingTypes: MeetingTypeResource[];
}

// ============================================================================
// VIEW CONFIGURATION
// ============================================================================

export type CalendarViewType =
  | 'Day'
  | 'Week'
  | 'WorkWeek'
  | 'Month'
  | 'Agenda';

export interface CalendarViewConfig {
  view: CalendarViewType;
  displayName: string;
  icon?: string;
  enabled: boolean;
}

export const AVAILABLE_VIEWS: CalendarViewConfig[] = [
  { view: 'Day', displayName: 'Day', icon: 'calendar_view_day', enabled: true },
  { view: 'Week', displayName: 'Week', icon: 'calendar_view_week', enabled: true },
  { view: 'WorkWeek', displayName: 'Work Week', icon: 'work_history', enabled: true },
  { view: 'Month', displayName: 'Month', icon: 'calendar_month', enabled: true },
  { view: 'Agenda', displayName: 'Agenda', icon: 'view_agenda', enabled: true },
];

// ============================================================================
// WORKING HOURS CONFIGURATION
// ============================================================================

export interface WorkingHoursConfig {
  startHour: string; // '08:00'
  endHour: string;   // '18:00'
  workDays: number[]; // [1, 2, 3, 4, 5] - Monday to Friday
  timezone: string;
}

export interface NonWorkingDay {
  date: Date;
  reason: string;
  isRecurring?: boolean;
}

// ============================================================================
// FILTER & SEARCH
// ============================================================================

export interface CalendarFilter {
  eventTypes: TeacherCalendarEventType[];
  courseIds: string[];
  classIds: string[];
  showOnlineOnly: boolean;
  showRequiredOnly: boolean;
}

export interface CalendarSearch {
  query: string;
  searchFields: ('Subject' | 'Description' | 'Location' | 'CourseTitle')[];
}

// ============================================================================
// ATTACHMENTS
// ============================================================================

export interface CalendarAttachment {
  id: string;
  name: string;
  url: string;
  type: 'DOCUMENT' | 'LINK' | 'IMAGE' | 'VIDEO';
  uploadedDate?: string;
  uploadedBy?: string;
}

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

export interface TeacherCalendarCreateRequest {
  CourseId: string;
  EventType: TeacherCalendarEventType;
  Subject: string;
  Description?: string;
  Location?: string;
  MeetingLink?: string;
  IsOnline: boolean;
  MeetingPlatform?: MeetingPlatform;
  SourceTimezone: string;
  StartLocalDateTime: string;
  EndLocalDateTime: string;
  RecurrenceRule?: string;
  VisibleToStudents: boolean;
  RequiredAttendance: boolean;
  NotifyPolicy?: string;
}

export interface TeacherCalendarUpdateRequest {
  Subject: string;
  Description?: string;
  Location?: string;
  MeetingLink?: string;
  EventType: TeacherCalendarEventType;
  IsOnline: boolean;
  MeetingPlatform?: MeetingPlatform;
  SourceTimezone: string;
  StartLocalDateTime: string;
  EndLocalDateTime: string;
  VisibleToStudents: boolean;
  RequiredAttendance: boolean;
  NotifyPolicy?: string;
  NotifyStudentsNow?: boolean;
  EditType: 'Single' | 'Series' | 'Occurrence';
}

export interface TeacherCalendarDeleteRequest {
  EventId: string | number;
  DeleteType: 'Single' | 'Series' | 'Occurrence';
  NotifyStudents?: boolean;
}

export interface TeacherCalendarBulkActionRequest {
  EventIds: (string | number)[];
  ActionType: 'MOVE_NEXT_WEEK' | 'UPDATE_MEETING_LINK' | 'CANCEL_AND_NOTIFY' | 'DELETE_MULTIPLE';
  MeetingLink?: string;
  NotifyPolicy?: string;
}

// ============================================================================
// EXPORT/IMPORT
// ============================================================================

export interface CalendarExportOptions {
  format: 'EXCEL' | 'CSV' | 'ICAL' | 'PDF';
  includeDetails: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  filterByCourse?: string;
}

// ============================================================================
// REALTIME MESSAGES
// ============================================================================

export interface TeacherCalendarRealtimeMessage {
  type: string;
  teacherId: string;
  courseId?: string;
  eventIds: string[];
  message: string;
  timestamp: string;
}

// ============================================================================
// EVENT TYPE CONFIGURATION (for badges and colors)
// ============================================================================

export interface EventTypeConfig {
  id: TeacherCalendarEventType;
  label: string;
  color: string;
  lightColor: string;
  icon: string;
  category: 'INSTRUCTIONAL' | 'ASSESSMENT' | 'ADMINISTRATIVE' | 'SUPPORT';
}

export const EVENT_TYPE_CONFIGS: Record<TeacherCalendarEventType, EventTypeConfig> = {
  LIVE_CLASS: {
    id: 'LIVE_CLASS',
    label: 'Live Class',
    color: '#4285F4',
    lightColor: '#E8F0FE',
    icon: 'e-icon-video',
    category: 'INSTRUCTIONAL'
  },
  LECTURE: {
    id: 'LECTURE',
    label: 'Lecture',
    color: '#0B7A6E',
    lightColor: '#D4EDDF',
    icon: 'e-icon-book',
    category: 'INSTRUCTIONAL'
  },
  OFFICE_HOURS: {
    id: 'OFFICE_HOURS',
    label: 'Office Hours',
    color: '#F4B400',
    lightColor: '#FEF7E0',
    icon: 'e-icon-chat',
    category: 'SUPPORT'
  },
  QUIZ: {
    id: 'QUIZ',
    label: 'Quiz',
    color: '#EA4335',
    lightColor: '#FCE8E6',
    icon: 'e-icon-clipboard',
    category: 'ASSESSMENT'
  },
  EXAM: {
    id: 'EXAM',
    label: 'Exam',
    color: '#D93025',
    lightColor: '#F9EBE9',
    icon: 'e-icon-document',
    category: 'ASSESSMENT'
  },
  MILESTONE: {
    id: 'MILESTONE',
    label: 'Milestone',
    color: '#9334E6',
    lightColor: '#F3E8FF',
    icon: 'e-icon-flag',
    category: 'INSTRUCTIONAL'
  },
  HOMEWORK_DEADLINE: {
    id: 'HOMEWORK_DEADLINE',
    label: 'Homework Deadline',
    color: '#FBBC04',
    lightColor: '#FEF7E0',
    icon: 'e-icon-time',
    category: 'INSTRUCTIONAL'
  },
  ASSIGNMENT: {
    id: 'ASSIGNMENT',
    label: 'Assignment',
    color: '#1A73E8',
    lightColor: '#E8F0FE',
    icon: 'e-icon-file',
    category: 'INSTRUCTIONAL'
  },
  MEETING: {
    id: 'MEETING',
    label: 'Meeting',
    color: '#5F6368',
    lightColor: '#F1F3F4',
    icon: 'e-icon-people',
    category: 'ADMINISTRATIVE'
  }
};

// ============================================================================
// LEGACY COMPATIBILITY (for existing code)
// ============================================================================

export interface TeacherCalendarEvent {
  id: string;
  courseId: string;
  courseTitle: string;
  teacherId: string;
  eventType: TeacherCalendarEventType;
  title: string;
  description?: string;
  meetingLink?: string;
  startAtUtc: string;
  endAtUtc: string;
  sourceTimezone: string;
  recurrenceGroupId?: string;
  recurrenceIndex?: number;
  cancelled: boolean;
  notifyPolicy?: string;
  softConflictCount: number;
}

// Utility function to convert legacy to new format
export function legacyToCalendarEvent(legacy: TeacherCalendarEvent): CalendarEvent {
  const eventTypeConfig = EVENT_TYPE_CONFIGS[legacy.eventType];
  return {
    Id: legacy.id,
    Subject: legacy.title,
    StartTime: new Date(legacy.startAtUtc),
    EndTime: new Date(legacy.endAtUtc),
    Description: legacy.description,
    Location: legacy.meetingLink,
    CourseId: legacy.courseId,
    CourseTitle: legacy.courseTitle,
    EventType: legacy.eventType,
    EventTypeId: legacy.eventType,
    IsOnline: !!legacy.meetingLink,
    MeetingLink: legacy.meetingLink,
    TeacherId: legacy.teacherId,
    SourceTimezone: legacy.sourceTimezone,
    RecurrenceGroupId: legacy.recurrenceGroupId,
    RecurrenceIndex: legacy.recurrenceIndex,
    Cancelled: legacy.cancelled,
    NotifyPolicy: legacy.notifyPolicy as any,
    SoftConflictCount: legacy.softConflictCount,
    CategoryColor: eventTypeConfig?.color,
    CategoryText: eventTypeConfig?.label,
    IconCss: eventTypeConfig?.icon,
    Color: eventTypeConfig?.color,
    VisibleToStudents: !legacy.cancelled,
    RequiredAttendance: legacy.eventType === 'LIVE_CLASS' || legacy.eventType === 'EXAM',
    CreatedDate: new Date().toISOString(),
    ModifiedDate: new Date().toISOString()
  };
}
