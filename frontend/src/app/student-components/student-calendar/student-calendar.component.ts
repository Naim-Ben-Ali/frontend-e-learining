import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';
import { TeacherCalendarService } from '../../services/teacher-calendar/teacher-calendar.service';
import { StudentEventModalComponent } from './student-event-modal/student-event-modal.component';

type CalendarViewType = 'Week' | 'Day';

@Component({
  selector: 'app-student-calendar',
  templateUrl: './student-calendar.component.html',
  styleUrls: ['./student-calendar.component.css']
})
export class StudentCalendarComponent implements OnInit, OnDestroy {
  // ── View state ──
  currentView: CalendarViewType = 'Week';
  availableViews: CalendarViewType[] = ['Week', 'Day'];

  weekDays: Date[] = [];
  timeSlots: number[] = [];
  selectedDate = new Date();
  today = new Date();
  visiblePeriodLabel = '';

  // ── Event data ──
  events: any[] = [];
  filteredEvents: any[] = [];
  isLoading = true;

  // ── Filters ──
  searchQuery = '';
  showRequiredOnly = false;
  showOnlineOnly = false;

  private destroy$ = new Subject<void>();

  constructor(
    private teacherCalendarService: TeacherCalendarService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.timeSlots = this.buildTimeSlots();
    this.weekDays = this.buildWeekDays();
    this.visiblePeriodLabel = this.buildPeriodLabel();
    this.loadEvents();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Data loading ──

  loadEvents(): void {
    this.isLoading = true;
    const fromUtc = this.startOfDay(this.addDays(new Date(), -7));
    const toUtc   = this.startOfDay(this.addDays(new Date(), 90));

    this.teacherCalendarService.listStudentEvents(fromUtc, toUtc)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp: any[]) => {
          this.events = resp
            .map((e: any) => this.mapStudentCalendarEvent(e))
            .filter((e: any) => !Number.isNaN(e.StartTime.getTime()) && !Number.isNaN(e.EndTime.getTime()) && !e.cancelled);
          this.applyFilters();
          this.isLoading = false;
        },
        error: () => {
          this.events = [];
          this.filteredEvents = [];
          this.isLoading = false;
        }
      });
  }

  // ── Navigation ──

  navigateToday(): void {
    this.selectedDate = new Date();
    this.refresh();
  }

  navigatePrevious(): void {
    this.shift(-1);
  }

  navigateNext(): void {
    this.shift(1);
  }

  private shift(direction: number): void {
    const next = new Date(this.selectedDate);
    if (this.currentView === 'Day') {
      next.setDate(next.getDate() + direction);
    } else {
      next.setDate(next.getDate() + 7 * direction);
    }
    this.selectedDate = next;
    this.refresh();
  }

  switchView(view: CalendarViewType): void {
    this.currentView = view;
    this.refresh();
  }

  // ── Filters ──

  toggleRequiredFilter(): void {
    this.showRequiredOnly = !this.showRequiredOnly;
    this.applyFilters();
  }

  toggleOnlineFilter(): void {
    this.showOnlineOnly = !this.showOnlineOnly;
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.showRequiredOnly = false;
    this.showOnlineOnly = false;
    this.applyFilters();
  }

  applyFilters(): void {
    const query = this.searchQuery.trim().toLowerCase();

    this.filteredEvents = this.events
      .filter(e => e.VisibleToStudents === true)
      .filter(e => !this.showRequiredOnly || e.RequiredAttendance)
      .filter(e => !this.showOnlineOnly   || e.IsOnline)
      .filter(e => {
        if (!query) return true;
        return (
          (e.Subject || '').toLowerCase().includes(query) ||
          (e.CourseTitle || '').toLowerCase().includes(query) ||
          (e.Location || '').toLowerCase().includes(query) ||
          (e.Description || '').toLowerCase().includes(query)
        );
      });
  }

  // ── Sidebar helpers ──

  getWeekEventCount(): number {
    const start = this.startOfWeek(this.selectedDate);
    const end   = this.addDays(start, 7);
    return this.filteredEvents.filter(e => e.StartTime >= start && e.StartTime < end).length;
  }

  getWeekRequiredCount(): number {
    const start = this.startOfWeek(this.selectedDate);
    const end   = this.addDays(start, 7);
    return this.filteredEvents.filter(e => e.RequiredAttendance && e.StartTime >= start && e.StartTime < end).length;
  }

  getWeekOnlineCount(): number {
    const start = this.startOfWeek(this.selectedDate);
    const end   = this.addDays(start, 7);
    return this.filteredEvents.filter(e => e.IsOnline && e.StartTime >= start && e.StartTime < end).length;
  }

  getWeekAttendancePercent(): number {
    const total = this.getWeekEventCount();
    if (total === 0) return 0;
    return Math.min(100, Math.round((total / 10) * 100));
  }

  getUpcomingRequiredEvents(): any[] {
    const now = new Date();
    return this.filteredEvents
      .filter(e => e.RequiredAttendance && e.StartTime >= now)
      .slice(0, 4);
  }

  // ── Calendar grid helpers ──

  getEventsForDate(date: Date): any[] {
    return this.filteredEvents
      .filter(e => this.isSameDate(new Date(e.StartTime), date))
      .map(e => ({ ...e, StartTime: new Date(e.StartTime), EndTime: new Date(e.EndTime) }))
      .sort((a, b) => a.StartTime.getTime() - b.StartTime.getTime());
  }

  getAbsoluteEventStyle(event: any, day: Date): Record<string, string> {
    const ROW_HEIGHT = 52;
    const gridStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 7, 0, 0, 0);
    const eventStart = new Date(event.StartTime);
    const eventEnd   = new Date(event.EndTime);
    const topMinutes      = Math.max(0, Math.round((eventStart.getTime() - gridStart.getTime()) / 60000));
    const durationMinutes = Math.max(15,  Math.round((eventEnd.getTime() - eventStart.getTime()) / 60000));
    return {
      top:    `${(topMinutes / 30) * ROW_HEIGHT}px`,
      height: `${(durationMinutes / 30) * ROW_HEIGHT}px`,
    };
  }

  getDateTimeForSlot(date: Date, slotMinutes: number): Date {
    const d = new Date(date);
    d.setHours(Math.floor(slotMinutes / 60), slotMinutes % 60, 0, 0);
    return d;
  }

  // ── Export ──

  exportToIcs(): void {
    const body = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Student Calendar//EN',
      ...this.filteredEvents.map(e => [
        'BEGIN:VEVENT',
        `DTSTART:${e.StartTime.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z')}`,
        `DTEND:${e.EndTime.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z')}`,
        `SUMMARY:${e.Subject}`,
        'END:VEVENT',
      ]).flat(),
      'END:VCALENDAR',
    ].join('\r\n');

    const blob   = new Blob([body], { type: 'text/calendar;charset=utf-8;' });
    const url    = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href     = url;
    anchor.download = 'my-schedule.ics';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  // ── Modal ──

  openEvent(event: any): void {
    this.dialog.open(StudentEventModalComponent, {
      width: '520px',
      data: { event }
    });
  }

  // ── Private helpers ──

  private refresh(): void {
    this.weekDays         = this.buildWeekDays();
    this.visiblePeriodLabel = this.buildPeriodLabel();
    this.applyFilters();
  }

  private buildWeekDays(): Date[] {
    if (this.currentView === 'Day') {
      return [this.startOfDay(this.selectedDate)];
    }
    const start = this.startOfWeek(this.selectedDate);
    return Array.from({ length: 7 }, (_, i) => this.addDays(start, i));
  }

  private buildTimeSlots(): number[] {
    const slots: number[] = [];
    for (let m = 7 * 60; m <= 22 * 60; m += 30) slots.push(m);
    return slots;
  }

  private buildPeriodLabel(): string {
    if (this.currentView === 'Day') {
      return this.selectedDate.toLocaleDateString(undefined, {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });
    }
    const start = this.startOfWeek(this.selectedDate);
    const end   = this.addDays(start, 6);
    if (start.getMonth() === end.getMonth()) {
      return `${start.toLocaleDateString(undefined, { month: 'long' })} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`;
    }
    return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }

  private startOfWeek(date: Date): Date {
    const d   = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  private startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private mapStudentCalendarEvent(e: any): any {
    const startRaw =
      e.StartTime ??
      e.startTime ??
      e.startAtUtc ??
      e.start_at_utc ??
      e.startLocalDateTime ??
      e.start_local_date_time;
    const endRaw =
      e.EndTime ??
      e.endTime ??
      e.endAtUtc ??
      e.end_at_utc ??
      e.endLocalDateTime ??
      e.end_local_date_time;

    const subject = e.Subject ?? e.subject ?? e.title ?? 'Untitled Event';
    const courseTitle = e.CourseTitle ?? e.courseTitle ?? '';
    const meetingLink = e.MeetingLink ?? e.meetingLink ?? '';
    const isCancelled = e.cancelled ?? e.Cancelled ?? false;
    const eventType = e.eventType ?? e.EventType ?? '';

    return {
      ...e,
      Subject: subject,
      CourseTitle: courseTitle,
      Description: e.Description ?? e.description ?? '',
      Location: e.Location ?? e.location ?? '',
      MeetingLink: meetingLink,
      StartTime: new Date(startRaw),
      EndTime: new Date(endRaw),
      VisibleToStudents: e.VisibleToStudents ?? e.visibleToStudents ?? !isCancelled,
      RequiredAttendance: e.RequiredAttendance ?? e.requiredAttendance ?? (eventType === 'LIVE_CLASS' || eventType === 'EXAM'),
      IsOnline: e.IsOnline ?? e.isOnline ?? !!meetingLink,
      cancelled: isCancelled
    };
  }

  isSameDate(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth()    === b.getMonth()    &&
      a.getDate()     === b.getDate()
    );
  }
}
