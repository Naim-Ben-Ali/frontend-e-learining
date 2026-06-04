import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { StorageService } from '../../services/storage/storage.service';
import {
  AVAILABLE_VIEWS,
  CalendarEvent,
  CalendarFilter,
  CalendarViewType,
  EVENT_TYPE_CONFIGS,
  legacyToCalendarEvent,
  TeacherCalendarCreateRequest,
  TeacherCalendarEvent,
  TeacherCalendarEventType,
  TeacherCalendarUpdateRequest,
  WorkingHoursConfig,
} from '../../models/teacher-calendar.model';
import { CourseService } from '../../services/course/course.service';
import { CourseResponse } from '../../models/course.model';
import { CalendarEventModalComponent } from './calendar-event-modal/calendar-event-modal.component';
import { TeacherCalendarService } from '../../services/teacher-calendar/teacher-calendar.service';

interface CalendarDayCell {
  date: Date;
  events: CalendarEvent[];
  isToday: boolean;
  isSelected: boolean;
  isCurrentMonth: boolean;
}

interface CalendarModalResult {
  action: 'create' | 'update' | 'delete';
  eventData?: Partial<CalendarEvent>;
}

@Component({
  selector: 'app-teacher-calendar',
  templateUrl: './teacher-calendar.component.html',
  styleUrls: ['./teacher-calendar.component.css'],
})
export class TeacherCalendarComponent implements OnInit, OnDestroy {
  currentView: CalendarViewType = 'Week';
  selectedDate = new Date();
  today = new Date(); // reference for template [class.is-today] binding
  visiblePeriodLabel = '';
  monthCells: CalendarDayCell[] = [];
  weekDays: Date[] = [];
  agendaEvents: CalendarEvent[] = [];
  timeSlots: number[] = [];

  events: CalendarEvent[] = [];
  filteredEvents: CalendarEvent[] = [];
  isLoading = true;
  isReadOnly = false;

  courses: CourseResponse[] = [];
  currentTeacherId = '';
  currentTimezone = 'UTC';

  filter: CalendarFilter = {
    eventTypes: [],
    courseIds: [],
    classIds: [],
    showOnlineOnly: false,
    showRequiredOnly: false,
  };
  searchQuery = '';
  workingHoursConfig: WorkingHoursConfig = {
    startHour: '07:00',
    endHour: '22:00',
    workDays: [1, 2, 3, 4, 5],
    timezone: 'UTC',
  };

  availableEventTypes = Object.values(EVENT_TYPE_CONFIGS);
  eventTypeOptions = Object.entries(EVENT_TYPE_CONFIGS).map(([value, config]) => ({
    value: value as TeacherCalendarEventType,
    text: config.label,
  }));
  availableViews = AVAILABLE_VIEWS.filter((v) => v.enabled);
  weekDayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  private draggedEventId?: string | number;
  private readonly resizeStepMinutes = 30;
  private readonly resizePixelsPerStep = 14;
  private resizingEventId?: string | number;
  private resizeDirection?: 'start' | 'end';
  private resizeOriginY = 0;
  private resizeOriginalStart?: Date;
  private resizeOriginalEnd?: Date;
  private suppressEventOpen = false;

  private destroy$ = new Subject<void>();

  constructor(
    private courseService: CourseService,
    private teacherCalendarService: TeacherCalendarService,
    private storageService: StorageService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.currentTeacherId = this.storageService.getUserId() || '';
    this.currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    this.workingHoursConfig.timezone = this.currentTimezone;
    this.timeSlots = this.buildTimeSlots();

    this.loadCourses();
    this.loadCalendarEvents();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load all teacher courses for resource selection
   */
  loadCourses(): void {
    this.courseService
      .getAllTeacherCourses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (courses) => {
          this.courses = courses;
          this.refreshDerivedData();
        },
        error: (err) => {
          console.error('[v0] Error loading courses:', err);
        },
      });
  }

  loadCalendarEvents(): void {
    this.isLoading = true;
    const fromUtc = this.startOfDay(this.addDays(new Date(), -90));
    const toUtc = this.startOfDay(this.addDays(new Date(), 180));

    this.teacherCalendarService
      .listEvents(fromUtc, toUtc)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.events = response
            .map((item) => this.mapApiEvent(item))
            .sort((a, b) => a.StartTime.getTime() - b.StartTime.getTime());
          this.refreshDerivedData();
          this.isLoading = false;
        },
        error: (err) => {
          this.events = [];
          this.refreshDerivedData();
          this.isLoading = false;
          console.error('[calendar] Failed to load events', err);
          this.snackBar.open('Unable to load calendar events', 'Close', { duration: 3200 });
        },
      });
  }

  openCreateEventModal(selectedDate?: Date): void {
    if (this.isReadOnly) return;

    // ── 2-hour buffer rule ──────────────────────────────────────────────────
    // The earliest a teacher may schedule is NOW + 2 hours, rounded up to the
    // next 30-minute slot so it aligns neatly with the calendar grid.
    const now = new Date();
    const bufferMs = 2 * 60 * 60 * 1000; // 2 hours in ms
    const earliestAllowed = new Date(now.getTime() + bufferMs);
    // Round up to the next 30-min boundary
    const minuteRemainder = earliestAllowed.getMinutes() % 30;
    if (minuteRemainder !== 0) {
      earliestAllowed.setMinutes(earliestAllowed.getMinutes() + (30 - minuteRemainder), 0, 0);
    } else {
      earliestAllowed.setSeconds(0, 0);
    }

    // If the clicked/selected date is before the earliest allowed moment,
    // snap the start forward so the form opens with a valid pre-filled time.
    let initialDate = selectedDate ? new Date(selectedDate) : new Date(this.selectedDate);
    if (initialDate < earliestAllowed) {
      initialDate = new Date(earliestAllowed);
    }

    const endDate = new Date(initialDate);
    endDate.setHours(endDate.getHours() + 1);

    // minDate = today (no past-date selection in the datepicker)
    const minDate = this.startOfDay(now);

    const dialogRef = this.dialog.open(CalendarEventModalComponent, {
      width: '90%',
      maxWidth: '700px',
      disableClose: false,
      data: {
        courses: this.courses,
        initialDate,
        endDate,
        mode: 'create',
        // Validation constraints passed to the modal
        minDate,
        earliestAllowedTime: earliestAllowed,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      this.handleDialogResult(result);
    });
  }

  openEditEventModal(event: CalendarEvent): void {
    if (this.isReadOnly) return;

    const dialogRef = this.dialog.open(CalendarEventModalComponent, {
      width: '90%',
      maxWidth: '700px',
      disableClose: false,
      data: {
        courses: this.courses,
        initialDate: event.StartTime,
        endDate: event.EndTime,
        mode: 'edit',
        event,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      this.handleDialogResult(result);
    });
  }

  private handleDialogResult(result?: CalendarModalResult): void {
    if (!result) return;

    if (result.action === 'delete' && result.eventData?.Id !== undefined) {
      this.deleteEvent(result.eventData.Id);
      return;
    }

    if (!result.eventData) return;
    if (result.action === 'create') {
      this.createEvent(result.eventData);
    } else {
      this.updateEvent(result.eventData);
    }
  }

  private createEvent(eventData: Partial<CalendarEvent>): void {
    const eventType = (eventData.EventType || 'MEETING') as TeacherCalendarEventType;
    const config = EVENT_TYPE_CONFIGS[eventType];
    const course = this.courses.find((c) => c.id === eventData.CourseId);
    const now = new Date().toISOString();

    const created: CalendarEvent = {
      Id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      Subject: eventData.Subject?.trim() || 'Untitled Event',
      StartTime: new Date(eventData.StartTime || this.selectedDate),
      EndTime: new Date(eventData.EndTime || this.selectedDate),
      Description: eventData.Description,
      Location: eventData.Location,
      IsAllDay: eventData.IsAllDay || false,
      CourseId: eventData.CourseId || '',
      CourseTitle: course?.title || 'General',
      ClassId: eventData.ClassId,
      ClassTitle: eventData.ClassTitle,
      EventType: eventType,
      EventTypeId: eventType,
      IsOnline: !!eventData.IsOnline,
      MeetingPlatform: eventData.MeetingPlatform,
      MeetingLink: eventData.MeetingLink,
      Notes: eventData.Notes,
      TeacherId: this.currentTeacherId,
      SourceTimezone: this.currentTimezone,
      Cancelled: false,
      NotifyPolicy: eventData.NotifyPolicy || '15_MIN',
      SoftConflictCount: 0,
      VisibleToStudents: eventData.VisibleToStudents ?? true,
      RequiredAttendance: eventData.RequiredAttendance ?? false,
      CategoryColor: config.color,
      CategoryText: config.label,
      IconCss: config.icon,
      Color: config.color,
      CreatedDate: now,
      ModifiedDate: now,
    };

    if (created.EndTime <= created.StartTime) {
      this.snackBar.open('End time must be later than start time.', 'Close', { duration: 3500 });
      return;
    }

    // Enforce minimum 2-hour buffer from now
    const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
    if (created.StartTime < twoHoursFromNow) {
      this.snackBar.open(
        `Events must be scheduled at least 2 hours in advance. Earliest allowed: ${twoHoursFromNow.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
        'Close',
        { duration: 4500 }
      );
      return;
    }

    const request: TeacherCalendarCreateRequest = {
      CourseId: created.CourseId,
      EventType: created.EventType,
      Subject: created.Subject,
      Description: created.Description,
      Location: created.Location,
      MeetingLink: created.MeetingLink,
      IsOnline: created.IsOnline,
      MeetingPlatform: created.MeetingPlatform,
      SourceTimezone: this.currentTimezone,
      StartLocalDateTime: created.StartTime.toISOString(),
      EndLocalDateTime: created.EndTime.toISOString(),
      VisibleToStudents: created.VisibleToStudents,
      RequiredAttendance: created.RequiredAttendance,
      NotifyPolicy: created.NotifyPolicy,
    };

    this.teacherCalendarService
      .createEvent(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Event created', 'Close', { duration: 2400 });
          this.loadCalendarEvents();
        },
        error: (err) => {
          console.error('[calendar] Failed to create event', {
            request,
            error: err,
          });
          this.snackBar.open(err?.message || 'Failed to create event', 'Close', { duration: 4000 });
        },
      });
  }

  private updateEvent(eventData: Partial<CalendarEvent>): void {
    const eventId = eventData.Id;
    if (eventId === undefined || eventId === null) return;

    const target = this.events.find((e) => e.Id === eventId);
    if (!target) return;

    const next: CalendarEvent = {
      ...target,
      ...eventData,
      StartTime: new Date(eventData.StartTime || target.StartTime),
      EndTime: new Date(eventData.EndTime || target.EndTime),
      ModifiedDate: new Date().toISOString(),
    };

    if (next.EndTime <= next.StartTime) {
      this.snackBar.open('End time must be later than start time', 'Close', { duration: 3000 });
      return;
    }

    this.persistEventUpdate(next, 'Event updated');
  }

  private deleteEvent(eventId: string | number): void {
    this.teacherCalendarService
      .deleteEvent(String(eventId))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.events = this.events.filter((event) => event.Id !== eventId);
          this.refreshDerivedData();
          this.snackBar.open('Event deleted', 'Close', { duration: 2200 });
        },
        error: (err) => {
          console.error('[calendar] Failed to delete event', err);
          this.snackBar.open('Failed to delete event', 'Close', { duration: 3000 });
        },
      });
  }

  switchView(view: CalendarViewType): void {
    this.currentView = view;
    this.refreshDerivedData();
  }

  navigateToday(): void {
    this.selectedDate = new Date();
    this.refreshDerivedData();
  }

  navigatePrevious(): void {
    this.shiftVisibleRange(-1);
  }

  navigateNext(): void {
    this.shiftVisibleRange(1);
  }

  private shiftVisibleRange(direction: number): void {
    const next = new Date(this.selectedDate);
    if (this.currentView === 'Month') {
      next.setMonth(next.getMonth() + direction);
    } else if (this.currentView === 'Day') {
      next.setDate(next.getDate() + direction);
    } else {
      next.setDate(next.getDate() + 7 * direction);
    }

    this.selectedDate = next;
    this.refreshDerivedData();
  }

  applyFilter(): void {
    this.refreshDerivedData();
  }

  searchEvents(): void {
    this.refreshDerivedData();
  }

  clearFilters(): void {
    this.filter = {
      eventTypes: [],
      courseIds: [],
      classIds: [],
      showOnlineOnly: false,
      showRequiredOnly: false,
    };
    this.searchQuery = '';
    this.refreshDerivedData();
  }

  exportToExcel(): void {
    const header = [
      'Title',
      'Type',
      'Course',
      'Start',
      'End',
      'Online',
      'Location',
      'Meeting Link',
      'Required Attendance',
      'Visible To Students',
    ];
    const rows = this.filteredEvents.map((event) => [
      event.Subject,
      event.EventType,
      event.CourseTitle,
      event.StartTime.toISOString(),
      event.EndTime.toISOString(),
      String(event.IsOnline),
      event.Location || '',
      event.MeetingLink || '',
      String(event.RequiredAttendance),
      String(event.VisibleToStudents),
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    this.downloadFile('teacher-calendar.csv', 'text/csv;charset=utf-8;', csv);
    this.snackBar.open('CSV exported', 'Close', { duration: 2200 });
  }

  exportToIcs(): void {
    const body = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Teacher Calendar//EN',
      ...this.filteredEvents.map((event) => this.eventToIcs(event)).flat(),
      'END:VCALENDAR',
    ].join('\r\n');

    this.downloadFile('teacher-calendar.ics', 'text/calendar;charset=utf-8;', body);
    this.snackBar.open('ICS exported', 'Close', { duration: 2200 });
  }

  printCalendar(): void {
    window.print();
  }

  toggleReadOnly(): void {
    this.isReadOnly = !this.isReadOnly;
  }

  getEventTypeConfig(eventType: TeacherCalendarEventType) {
    return EVENT_TYPE_CONFIGS[eventType];
  }

  getEventColor(eventType: TeacherCalendarEventType): string {
    return EVENT_TYPE_CONFIGS[eventType]?.color || '#666';
  }

  goBackToDashboard(): void {
    this.router.navigate(['/teacher-dashboard']);
  }

  getMonthCellEvents(cell: CalendarDayCell): CalendarEvent[] {
    return cell.events.slice(0, 3);
  }

  getHiddenMonthCount(cell: CalendarDayCell): number {
    return Math.max(0, cell.events.length - 3);
  }

  getEventsForDayAndHour(date: Date, hour: number): CalendarEvent[] {
    return this.filteredEvents
      .filter((event) => {
        if (!this.isSameDate(event.StartTime, date)) return false;
        const eventSlot = event.StartTime.getHours() * 60 + Math.floor(event.StartTime.getMinutes() / 30) * 30;
        return eventSlot === hour;
      })
      .sort((a, b) => a.StartTime.getTime() - b.StartTime.getTime());
  }

  getTimeEventStyle(event: CalendarEvent): Record<string, string> {
    const durationMinutes = Math.max(15, Math.round((event.EndTime.getTime() - event.StartTime.getTime()) / 60000));
    const heightPx = Math.max(30, Math.round((durationMinutes / 60) * 40));
    return {
      minHeight: `${heightPx}px`,
    };
  }

  /**
   * Returns true when any event occupies the given 30-minute slot on the specified date.
   * Used to visually reserve the slot across the entire day column when an event spans it.
   */
  isSlotOccupied(date: Date, slotStartMinute: number): boolean {
    const slotStart = this.getDateTimeForSlot(date, slotStartMinute);
    const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);
    return this.filteredEvents.some((event) =>
      this.isSameDate(event.StartTime, date) && this.isOverlapping(event.StartTime, event.EndTime, slotStart, slotEnd)
    );
  }

  getDateTimeForSlot(date: Date, hour: number): Date {
    const value = new Date(date);
    const slotHour = Math.floor(hour / 60);
    const slotMinute = hour % 60;
    value.setHours(slotHour, slotMinute, 0, 0);
    return value;
  }

  /**
   * Calculate absolute positioning and sizing for an event inside its day-column.
   * ROW_HEIGHT must stay in sync with --row-height CSS variable (52px).
   * Formula mirrors Syncfusion scheduler:
   *   top    = (minutesFromGridStart / 30) * ROW_HEIGHT
   *   height = (durationMinutes      / 30) * ROW_HEIGHT
   */
  getAbsoluteEventStyle(event: CalendarEvent, day: Date): Record<string, string> {
    const ROW_HEIGHT = 52; // px — keep in sync with CSS --row-height: 52px

    const [gridStartHour, gridStartMinute] = this.workingHoursConfig.startHour.split(':').map(Number);
    const gridStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), gridStartHour, gridStartMinute, 0, 0);

    const eventStart = new Date(event.StartTime);
    const eventEnd   = new Date(event.EndTime);

    // Minutes from grid start → top offset
    const topMinutes = Math.max(0, (eventStart.getTime() - gridStart.getTime()) / 60000);
    // Duration in minutes → height (minimum 30 min = 1 slot)
    const durationMinutes = Math.max(30, (eventEnd.getTime() - eventStart.getTime()) / 60000);

    const topPx    = (topMinutes    / 30) * ROW_HEIGHT;
    const heightPx = (durationMinutes / 30) * ROW_HEIGHT;

    return {
      top:    `${topPx}px`,
      height: `${heightPx}px`,
    };
  }

  onSelectDate(date: Date): void {
    this.selectedDate = new Date(date);
    this.refreshDerivedData();
  }

  // ── Validation helpers (used by modal via injected data or called directly) ──

  /**
   * The absolute earliest date a teacher can schedule an event (today, no past dates).
   */
  get minSelectableDate(): Date {
    return this.startOfDay(new Date());
  }

  /**
   * The absolute earliest datetime a teacher can schedule (now + 2 h, snapped to
   * the next 30-minute grid slot).
   */
  get earliestAllowedDateTime(): Date {
    const now = new Date();
    const candidate = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const rem = candidate.getMinutes() % 30;
    if (rem !== 0) {
      candidate.setMinutes(candidate.getMinutes() + (30 - rem), 0, 0);
    } else {
      candidate.setSeconds(0, 0);
    }
    return candidate;
  }

  /**
   * Returns true when a date cell should be disabled in the datepicker
   * (i.e. the date is strictly before today).
   */
  isDateDisabled = (date: Date | null): boolean => {
    if (!date) return true;
    const today = this.startOfDay(new Date());
    return date < today;
  };

  onDragStart(nativeEvent: DragEvent, event: CalendarEvent): void {
    if (this.isReadOnly || !nativeEvent.dataTransfer) return;
    this.draggedEventId = event.Id;
    nativeEvent.dataTransfer.setData('text/plain', String(event.Id));
    nativeEvent.dataTransfer.effectAllowed = 'move';
  }

  onDragEnd(): void {
    this.draggedEventId = undefined;
  }

  onTimeEventClick(event: CalendarEvent, nativeEvent: MouseEvent): void {
    if (this.suppressEventOpen) {
      nativeEvent.stopPropagation();
      this.suppressEventOpen = false;
      return;
    }
    this.openEditEventModal(event);
  }

  onResizeStart(nativeEvent: MouseEvent, event: CalendarEvent, direction: 'start' | 'end'): void {
    if (this.isReadOnly) return;
    nativeEvent.preventDefault();
    nativeEvent.stopPropagation();
    this.suppressEventOpen = false;
    this.resizingEventId = event.Id;
    this.resizeDirection = direction;
    this.resizeOriginY = nativeEvent.clientY;
    this.resizeOriginalStart = new Date(event.StartTime);
    this.resizeOriginalEnd = new Date(event.EndTime);
  }

  @HostListener('document:mousemove', ['$event'])
  onResizeMove(nativeEvent: MouseEvent): void {
    if (this.resizingEventId === undefined || !this.resizeDirection || !this.resizeOriginalStart || !this.resizeOriginalEnd) {
      return;
    }

    const deltaY = nativeEvent.clientY - this.resizeOriginY;
    const stepCount = Math.round(deltaY / this.resizePixelsPerStep);
    if (stepCount === 0) return;
    const deltaMinutes = stepCount * this.resizeStepMinutes;

    const resized = this.events.find((e) => String(e.Id) === String(this.resizingEventId));
    if (!resized) return;

    let nextStart = new Date(this.resizeOriginalStart);
    let nextEnd = new Date(this.resizeOriginalEnd);

    if (this.resizeDirection === 'start') {
      nextStart = new Date(this.resizeOriginalStart.getTime() + deltaMinutes * 60 * 1000);
      if (nextStart >= nextEnd) {
        nextStart = new Date(nextEnd.getTime() - this.resizeStepMinutes * 60 * 1000);
      }
    } else {
      nextEnd = new Date(this.resizeOriginalEnd.getTime() + deltaMinutes * 60 * 1000);
      if (nextEnd <= nextStart) {
        nextEnd = new Date(nextStart.getTime() + this.resizeStepMinutes * 60 * 1000);
      }
    }

    this.events = this.events.map((candidate) =>
      String(candidate.Id) === String(resized.Id)
        ? { ...candidate, StartTime: nextStart, EndTime: nextEnd }
        : candidate
    );
    this.refreshDerivedData();
  }

  @HostListener('document:mouseup')
  onResizeEnd(): void {
    if (this.resizingEventId === undefined || !this.resizeOriginalStart || !this.resizeOriginalEnd) {
      this.clearResizeState();
      return;
    }

    const resized = this.events.find((e) => String(e.Id) === String(this.resizingEventId));
    if (!resized) {
      this.clearResizeState();
      return;
    }

    const hasChanged =
      resized.StartTime.getTime() !== this.resizeOriginalStart.getTime() ||
      resized.EndTime.getTime() !== this.resizeOriginalEnd.getTime();

    if (!hasChanged) {
      this.clearResizeState();
      return;
    }

    const previousState = { ...resized, StartTime: new Date(this.resizeOriginalStart), EndTime: new Date(this.resizeOriginalEnd) };
    this.persistEventUpdate(
      resized,
      'Event time updated',
      () => {
        this.events = this.events.map((candidate) =>
          String(candidate.Id) === String(previousState.Id) ? previousState : candidate
        );
        this.refreshDerivedData();
      }
    );
    this.suppressEventOpen = true;
    setTimeout(() => {
      this.suppressEventOpen = false;
    }, 0);
    this.clearResizeState();
  }

  allowDrop(nativeEvent: DragEvent): void {
    if (this.isReadOnly) return;
    nativeEvent.preventDefault();
  }

  onDropToMonthCell(nativeEvent: DragEvent, targetDate: Date): void {
    nativeEvent.preventDefault();
    if (this.isReadOnly) return;

    const eventId = this.readDraggedEventId(nativeEvent);
    if (eventId === undefined) return;
    const target = this.events.find((event) => String(event.Id) === String(eventId));
    if (!target) return;

    const durationMs = target.EndTime.getTime() - target.StartTime.getTime();
    const nextStart = new Date(targetDate);
    nextStart.setHours(target.StartTime.getHours(), target.StartTime.getMinutes(), 0, 0);
    const nextEnd = new Date(nextStart.getTime() + durationMs);
    this.persistEventUpdate({ ...target, StartTime: nextStart, EndTime: nextEnd }, 'Event moved');
    this.draggedEventId = undefined;
  }

  onDropToTimeCell(nativeEvent: DragEvent, day: Date, hour: number): void {
    nativeEvent.preventDefault();
    if (this.isReadOnly) return;

    const eventId = this.readDraggedEventId(nativeEvent);
    if (eventId === undefined) return;
    const target = this.events.find((event) => String(event.Id) === String(eventId));
    if (!target) return;

    const durationMs = target.EndTime.getTime() - target.StartTime.getTime();
    const nextStart = new Date(day);
    const slotHour = Math.floor(hour / 60);
    const slotMinute = hour % 60;
    nextStart.setHours(slotHour, slotMinute, 0, 0);
    const nextEnd = new Date(nextStart.getTime() + durationMs);
    this.persistEventUpdate({ ...target, StartTime: nextStart, EndTime: nextEnd }, 'Event moved');
    this.draggedEventId = undefined;
  }

  private refreshDerivedData(): void {
    this.filteredEvents = this.events
      .filter((event) => this.matchesFilter(event))
      .filter((event) => this.matchesSearch(event))
      .sort((a, b) => a.StartTime.getTime() - b.StartTime.getTime());

    this.visiblePeriodLabel = this.buildPeriodLabel();
    this.monthCells = this.buildMonthCells();
    this.weekDays = this.buildWeekDays();
    this.agendaEvents = this.filteredEvents.filter(
      (event) => event.EndTime >= this.startOfDay(this.selectedDate)
    );
  }

  private matchesFilter(event: CalendarEvent): boolean {
    if (this.filter.eventTypes.length > 0 && !this.filter.eventTypes.includes(event.EventType)) {
      return false;
    }
    if (this.filter.courseIds.length > 0 && !this.filter.courseIds.includes(event.CourseId)) {
      return false;
    }
    if (this.filter.showOnlineOnly && !event.IsOnline) {
      return false;
    }
    if (this.filter.showRequiredOnly && !event.RequiredAttendance) {
      return false;
    }
    return true;
  }

  private matchesSearch(event: CalendarEvent): boolean {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      event.Subject.toLowerCase().includes(query) ||
      (event.Description || '').toLowerCase().includes(query) ||
      (event.CourseTitle || '').toLowerCase().includes(query) ||
      (event.Location || '').toLowerCase().includes(query)
    );
  }

  private buildMonthCells(): CalendarDayCell[] {
    if (this.currentView !== 'Month') return [];

    const start = this.startOfWeek(this.startOfMonth(this.selectedDate));
    const cells: CalendarDayCell[] = [];
    for (let i = 0; i < 42; i++) {
      const date = this.addDays(start, i);
      cells.push({
        date,
        events: this.getEventsForDate(date),
        isToday: this.isSameDate(date, new Date()),
        isSelected: this.isSameDate(date, this.selectedDate),
        isCurrentMonth: date.getMonth() === this.selectedDate.getMonth(),
      });
    }
    return cells;
  }

  private buildWeekDays(): Date[] {
    if (this.currentView === 'Month' || this.currentView === 'Agenda') return [];
    if (this.currentView === 'Day') return [this.startOfDay(this.selectedDate)];

    const start = this.startOfWeek(this.selectedDate);
    const days = Array.from({ length: 7 }, (_, idx) => this.addDays(start, idx));
    if (this.currentView === 'WorkWeek') {
      return days.filter((day) => {
        const dayNumber = day.getDay();
        return dayNumber >= 1 && dayNumber <= 5;
      });
    }
    return days;
  }

  private buildTimeSlots(): number[] {
    const [startHour, startMinute] = this.workingHoursConfig.startHour.split(':').map(Number);
    const [endHour, endMinute] = this.workingHoursConfig.endHour.split(':').map(Number);
    const startTotal = startHour * 60 + (startMinute || 0);
    const endTotal = endHour * 60 + (endMinute || 0);
    const safeEnd = Math.max(startTotal, endTotal);
    const slots: number[] = [];
    for (let cursor = startTotal; cursor <= safeEnd; cursor += 30) {
      slots.push(cursor);
    }
    return slots;
  }

  getEventsForDate(date: Date): CalendarEvent[] {
    return this.filteredEvents
      .filter((event) => this.isSameDate(event.StartTime, date))
      .sort((a, b) => a.StartTime.getTime() - b.StartTime.getTime());
  }

  private computeSoftConflictCount(candidate: CalendarEvent, ignoreId?: string | number): number {
    return this.events.filter((event) => {
      if (ignoreId !== undefined && event.Id === ignoreId) return false;
      if (event.Id === candidate.Id) return false;
      return this.isOverlapping(event.StartTime, event.EndTime, candidate.StartTime, candidate.EndTime);
    }).length;
  }

  private isOverlapping(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
    return aStart < bEnd && bStart < aEnd;
  }

  private clearResizeState(): void {
    this.resizingEventId = undefined;
    this.resizeDirection = undefined;
    this.resizeOriginalStart = undefined;
    this.resizeOriginalEnd = undefined;
  }

  private persistEventUpdate(next: CalendarEvent, successMessage: string, onError?: () => void): void {
    const request: TeacherCalendarUpdateRequest = {
      Subject: next.Subject,
      Description: next.Description,
      Location: next.Location,
      MeetingLink: next.MeetingLink,
      EventType: next.EventType,
      IsOnline: next.IsOnline,
      MeetingPlatform: next.MeetingPlatform,
      SourceTimezone: this.currentTimezone,
      StartLocalDateTime: next.StartTime.toISOString(),
      EndLocalDateTime: next.EndTime.toISOString(),
      VisibleToStudents: next.VisibleToStudents,
      RequiredAttendance: next.RequiredAttendance,
      NotifyPolicy: next.NotifyPolicy,
      NotifyStudentsNow: false,
      EditType: 'Single',
    };

    this.teacherCalendarService
      .updateEvent(String(next.Id), request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const updated = this.mapApiEvent(response);
          updated.SoftConflictCount = this.computeSoftConflictCount(updated, updated.Id);
          this.events = this.events.map((event) => (String(event.Id) === String(updated.Id) ? updated : event));
          this.refreshDerivedData();
          this.snackBar.open(successMessage, 'Close', { duration: 2200 });
        },
        error: (err) => {
          console.error('[calendar] Failed to update event', err);
          this.snackBar.open('Failed to update event', 'Close', { duration: 3000 });
          onError?.();
        },
      });
  }

  private readDraggedEventId(nativeEvent: DragEvent): string | number | undefined {
    const transferId = nativeEvent.dataTransfer?.getData('text/plain');
    if (transferId) return transferId;
    return this.draggedEventId;
  }

  private mapApiEvent(item: TeacherCalendarEvent): CalendarEvent {
    const legacyMapped = legacyToCalendarEvent(item);
    const course = this.courses.find((c) => c.id === legacyMapped.CourseId);
    return {
      ...legacyMapped,
      CourseTitle: legacyMapped.CourseTitle || course?.title || 'General',
      StartTime: new Date(legacyMapped.StartTime),
      EndTime: new Date(legacyMapped.EndTime),
      SourceTimezone: legacyMapped.SourceTimezone || this.currentTimezone,
      TeacherId: legacyMapped.TeacherId || this.currentTeacherId,
      NotifyPolicy: legacyMapped.NotifyPolicy || '15_MIN',
      CreatedDate: legacyMapped.CreatedDate || new Date().toISOString(),
      ModifiedDate: legacyMapped.ModifiedDate || new Date().toISOString(),
    };
  }

  private eventToIcs(event: CalendarEvent): string[] {
    const uid = `${event.Id}@teacher-calendar`;
    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${this.toIcsDate(new Date())}`,
      `DTSTART:${this.toIcsDate(event.StartTime)}`,
      `DTEND:${this.toIcsDate(event.EndTime)}`,
      `SUMMARY:${this.escapeIcs(event.Subject)}`,
      `DESCRIPTION:${this.escapeIcs(event.Description || '')}`,
      `LOCATION:${this.escapeIcs(event.Location || event.MeetingLink || '')}`,
      'END:VEVENT',
    ];
  }

  private toIcsDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  }

  private escapeIcs(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  }

  private downloadFile(fileName: string, mimeType: string, content: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private buildPeriodLabel(): string {
    if (this.currentView === 'Month') {
      return this.selectedDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    }
    if (this.currentView === 'Day') {
      return this.selectedDate.toLocaleDateString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }

    const weekStart = this.startOfWeek(this.selectedDate);
    const weekEnd = this.addDays(weekStart, this.currentView === 'WorkWeek' ? 4 : 6);
    const sameMonth = weekStart.getMonth() === weekEnd.getMonth();

    if (sameMonth) {
      return `${weekStart.toLocaleDateString(undefined, { month: 'long' })} ${weekStart.getDate()} - ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
    }

    return `${weekStart.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })} - ${weekEnd.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`;
  }

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private startOfWeek(date: Date): Date {
    const value = this.startOfDay(date);
    const day = value.getDay();
    const offset = day === 0 ? -6 : 1 - day;
    return this.addDays(value, offset);
  }

  startOfDay(date: Date): Date {
    const value = new Date(date);
    value.setHours(0, 0, 0, 0);
    return value;
  }

  private addDays(date: Date, days: number): Date {
    const value = new Date(date);
    value.setDate(value.getDate() + days);
    return value;
  }

  isSameDate(left: Date, right: Date): boolean {
    return (
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate()
    );
  }
}
