import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-student-event-modal',
  templateUrl: './student-event-modal.component.html',
  styleUrls: ['./student-event-modal.component.css']
})
export class StudentEventModalComponent {
  event: any;
  constructor(public dialogRef: MatDialogRef<StudentEventModalComponent>, @Inject(MAT_DIALOG_DATA) public data: any) {
    this.event = data?.event;
  }

  close(): void {
    this.dialogRef.close();
  }
}
