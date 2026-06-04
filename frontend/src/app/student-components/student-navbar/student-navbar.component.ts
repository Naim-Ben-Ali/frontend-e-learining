import {
  Component, HostListener, OnDestroy, OnInit,
  ElementRef, Renderer2
} from '@angular/core';
import { NavigationEnd, Router } from "@angular/router";
import { filter, Subject, takeUntil } from "rxjs";
import { AuthService }    from "../../services/auth/auth.service";
import { StorageService } from "../../services/storage/storage.service";

@Component({
  selector: 'app-student-navbar',
  templateUrl: './student-navbar.component.html',
  styleUrls:  ['./student-navbar.component.css']
})
export class StudentNavbarComponent implements OnInit, OnDestroy {

  isScrolled      = false;
  userName        = '';
  userInitial     = '';
  userEmail       = '';
  streakDays      = 0;
  isDashboardRoute = false;
  dropdownOpen    = false;

  private destroy$    = new Subject<void>();
  private unlistenDoc?: () => void;

  constructor(
    private router:       Router,
    private authService:  AuthService,
    private storageService: StorageService,
    private el:           ElementRef,
    private renderer:     Renderer2
  ) {}

  ngOnInit(): void {
    this.loadUserInfo();
    this.updateActiveRoute(this.router.url);

    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe(e => {
      this.updateActiveRoute(e.urlAfterRedirects);
      this.closeDropdown();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.unlistenDoc) this.unlistenDoc();
  }

  @HostListener('window:scroll')
  onScroll(): void { this.isScrolled = window.scrollY > 10; }

  private loadUserInfo(): void {
    const firstName = this.storageService.getFirstName() || '';
    const lastName  = this.storageService.getLastName()  || '';
    const email     = this.storageService.getUserEmail() || '';
    this.userEmail  = email;
    this.userName   = firstName || [firstName, lastName].filter(Boolean).join(' ') || email;
    this.userInitial = (firstName || email || 'S').charAt(0).toUpperCase();
  }

  private updateActiveRoute(url: string): void {
    this.isDashboardRoute = url === '/student-dashboard';
  }

  toggleDropdown(): void {
    this.dropdownOpen ? this.closeDropdown() : this.openDropdown();
  }

  openDropdown(): void {
    this.dropdownOpen = true;
    this.unlistenDoc = this.renderer.listen('document', 'click', (evt: Event) => {
      if (!this.el.nativeElement.contains(evt.target)) {
        this.closeDropdown();
      }
    });
  }

  closeDropdown(): void {
    this.dropdownOpen = false;
    if (this.unlistenDoc) {
      this.unlistenDoc();
      this.unlistenDoc = undefined;
    }
  }

  logout(): void {
    this.closeDropdown();
    this.authService.logout();
    this.router.navigateByUrl('/home', { replaceUrl: true });
  }
}
