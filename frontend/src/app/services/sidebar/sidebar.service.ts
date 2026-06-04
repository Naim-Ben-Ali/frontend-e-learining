import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private isExpandedSubject = new BehaviorSubject<boolean>(true);
  public isExpanded$: Observable<boolean> = this.isExpandedSubject.asObservable();

  constructor() {
    // Load saved state from localStorage
    const saved = localStorage.getItem('sidebar-expanded');
    if (saved !== null) {
      this.isExpandedSubject.next(saved === 'true');
    }
  }

}
