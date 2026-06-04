import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CalendarEvent, TeacherCalendarEventType, EVENT_TYPE_CONFIGS } from '../../../models/teacher-calendar.model';
import { CourseResponse } from '../../../models/course.model';

interface CalendarEventModalData {
  courses: CourseResponse[];
  initialDate?: Date;
  endDate?: Date;
  mode?: 'create' | 'edit';
  event?: CalendarEvent;
}

@Component({
  selector: 'app-calendar-event-modal',
  templateUrl: './calendar-event-modal.component.html',
  styleUrls: ['./calendar-event-modal.component.css'],
})
export class CalendarEventModalComponent implements OnInit {
  eventForm!: FormGroup;
  eventTypes = Object.entries(EVENT_TYPE_CONFIGS).map(([key, value]) => ({
    id: key,
    label: value.label,
    color: value.color,
    icon: value.icon,
  }));

  meetingPlatforms = ['Zoom', 'Teams', 'Google Meet', 'Webex', 'Other'];
  notifyPolicies = [
    { label: 'Immediate', value: 'IMMEDIATE' },
    { label: '15 minutes before', value: '15_MIN' },
    { label: '1 hour before', value: '1_HOUR' },
    { label: '24 hours before', value: '24_HOUR' },
  ];

  isSubmitting = false;
  selectedEventTypeConfig: any = null;
  isEditMode = false;

  minAllowedStartLocal = '';

  constructor(
    public dialogRef: MatDialogRef<CalendarEventModalComponent, { action: 'create' | 'update' | 'delete'; eventData?: Partial<CalendarEvent> }>,
    @Inject(MAT_DIALOG_DATA) public data: CalendarEventModalData,
    private fb: FormBuilder
  ) {
    this.eventForm = this.initializeForm();
  }

  ngOnInit(): void {
    this.isEditMode = this.data.mode === 'edit' && !!this.data.event;

    // compute minimum allowed start (now + 2 hours) and expose for input min attribute
    const minAllowed = this.computeMinAllowedStart();
    this.minAllowedStartLocal = this.toDateTimeLocal(minAllowed);

    if (this.isEditMode && this.data.event) {
      this.patchFormForEdit(this.data.event);
    } else {
      const start = this.ensureFutureInitialDate(this.data.initialDate || minAllowed);
      const requestedEnd = this.data.endDate || new Date(start.getTime() + 60 * 60 * 1000);
      const end = requestedEnd > start ? requestedEnd : new Date(start.getTime() + 60 * 60 * 1000);
      this.eventForm.patchValue({
        startTime: this.toDateTimeLocal(start),
        endTime: this.toDateTimeLocal(end),
      });
    }

    this.onEventTypeChange(this.eventForm.get('eventType')?.value);
    this.onIsOnlineChange(this.eventForm.get('isOnline')?.value);
  }

  private initializeForm(): FormGroup {
    return this.fb.group(
      {
        subject: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
        description: ['', [Validators.maxLength(2000)]],
        eventType: ['LIVE_CLASS', Validators.required],
        courseId: ['', Validators.required],
        startTime: ['', Validators.required],
        endTime: ['', Validators.required],
        isOnline: [false],
        meetingPlatform: ['Zoom'],
        meetingLink: [''],
        location: [''],
        notes: ['', Validators.maxLength(1000)],
        visibleToStudents: [true],
        requiredAttendance: [false],
        notifyPolicy: ['IMMEDIATE'],
      },
      { validators: this.dateTimeRangeValidator.bind(this) }
    );
  }

  onEventTypeChange(eventType: string): void {
    const config = EVENT_TYPE_CONFIGS[eventType as TeacherCalendarEventType];
    this.selectedEventTypeConfig = config;

    // Auto-populate default settings based on event type
    if (eventType === 'LIVE_CLASS' || eventType === 'OFFICE_HOURS') {
      this.eventForm.patchValue({ isOnline: true });
    } else if (eventType === 'EXAM' || eventType === 'QUIZ') {
      this.eventForm.patchValue({ requiredAttendance: true });
    }
  }

  onIsOnlineChange(isOnline: boolean): void {
    const meetingLinkControl = this.eventForm.get('meetingLink');
    const locationControl = this.eventForm.get('location');

    if (isOnline) {
      meetingLinkControl?.setValidators([Validators.required]);
      locationControl?.clearValidators();
    } else {
      meetingLinkControl?.clearValidators();
      locationControl?.setValidators([Validators.required]);
    }

    meetingLinkControl?.updateValueAndValidity();
    locationControl?.updateValueAndValidity();
  }

  getEventTypeIcon(eventType: string): string {
    return EVENT_TYPE_CONFIGS[eventType as TeacherCalendarEventType]?.icon || 'event';
  }

  getEventTypeColor(eventType: string): string {
    return EVENT_TYPE_CONFIGS[eventType as TeacherCalendarEventType]?.color || '#1976d2';
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onDelete(): void {
    const id = this.data.event?.Id;
    if (id === undefined || id === null) return;
    this.dialogRef.close({
      action: 'delete',
      eventData: { Id: id },
    });
  }

  onSubmit(): void {
    if (this.eventForm.invalid) {
      this.markFormGroupTouched(this.eventForm);
      return;
    }

    this.isSubmitting = true;
    const formValue = this.eventForm.value;

    const eventData: Partial<CalendarEvent> = {
      Id: this.data.event?.Id,
      Subject: formValue.subject,
      Description: formValue.description,
      EventType: formValue.eventType as TeacherCalendarEventType,
      CourseId: formValue.courseId,
      StartTime: this.fromDateTimeLocal(formValue.startTime),
      EndTime: this.fromDateTimeLocal(formValue.endTime),
      IsOnline: formValue.isOnline,
      MeetingPlatform: formValue.isOnline ? formValue.meetingPlatform : undefined,
      MeetingLink: formValue.isOnline ? formValue.meetingLink : undefined,
      Location: !formValue.isOnline ? formValue.location : undefined,
      Notes: formValue.notes,
      VisibleToStudents: formValue.visibleToStudents,
      RequiredAttendance: formValue.requiredAttendance,
      NotifyPolicy: formValue.notifyPolicy,
    };

    this.dialogRef.close({
      action: this.isEditMode ? 'update' : 'create',
      eventData,
    });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  getCourseName(courseId: string): string {
    return this.data.courses.find((c) => c.id === courseId)?.title || '';
  }

  private patchFormForEdit(event: CalendarEvent): void {
    this.eventForm.patchValue({
      subject: event.Subject,
      description: event.Description || '',
      eventType: event.EventType,
      courseId: event.CourseId,
      startTime: this.toDateTimeLocal(event.StartTime),
      endTime: this.toDateTimeLocal(event.EndTime),
      isOnline: event.IsOnline,
      meetingPlatform: event.MeetingPlatform || 'Zoom',
      meetingLink: event.MeetingLink || '',
      location: event.Location || '',
      notes: event.Notes || '',
      visibleToStudents: event.VisibleToStudents,
      requiredAttendance: event.RequiredAttendance,
      notifyPolicy: event.NotifyPolicy || 'IMMEDIATE',
    });
  }

  private toDateTimeLocal(date: Date): string {
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60 * 1000);
    return local.toISOString().slice(0, 16);
  }

  private fromDateTimeLocal(value: string): Date {
    return new Date(value);
  }

  private ensureFutureInitialDate(value: Date): Date {
    const candidate = new Date(value);
    const minimum = new Date(Date.now() + 5 * 60 * 1000);
    if (candidate > minimum) {
      return candidate;
    }
    return this.roundToNextQuarterHour(minimum);
  }

  private roundToNextQuarterHour(value: Date): Date {
    const rounded = new Date(value);
    rounded.setSeconds(0, 0);
    const minutes = rounded.getMinutes();
    const remainder = minutes % 15;
    if (remainder !== 0) {
      rounded.setMinutes(minutes + (15 - remainder));
    }
    return rounded;
  }

  private computeMinAllowedStart(): Date {
    const now = new Date();
    const min = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
    return this.roundToNextQuarterHour(min);
  }

  private startOfDay(date: Date): Date {
    const v = new Date(date);
    v.setHours(0, 0, 0, 0);
    return v;
  }

  private dateTimeRangeValidator(form: FormGroup): { [key: string]: any } | null {
    const startVal = form.get('startTime')?.value;
    const endVal = form.get('endTime')?.value;
    if (!startVal || !endVal) return null;

    const start = new Date(startVal);
    const end = new Date(endVal);
    const now = new Date();

    // Rule: no past dates
    if (start < this.startOfDay(now)) {
      return { dateInPast: true };
    }

    // Rule: minimum 2-hour buffer from now
    const minAllowed = this.computeMinAllowedStart();
    if (start < minAllowed) {
      return { startTooSoon: true, minAllowed: this.toDateTimeLocal(minAllowed) };
    }

    // Rule: end must be after start
    if (end <= start) {
      return { endBeforeStart: true };
    }

    return null;
  }
}
