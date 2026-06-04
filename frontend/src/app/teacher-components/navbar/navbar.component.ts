import { Component, HostListener, OnInit, OnDestroy, ElementRef, Renderer2 } from '@angular/core';
import { Router } from "@angular/router";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { AuthService } from "../../services/auth/auth.service";
import { StorageService } from "../../services/storage/storage.service";

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  userName: string = '';
  userInitial: string = '';
  userEmail: string = '';
  isScrolled: boolean = false;
  dropdownOpen: boolean = false;

  private destroy$ = new Subject<void>();
  private unlistenDoc?: () => void;

  constructor(
    private router: Router,
    private authService: AuthService,
    private storageService: StorageService,
    private el: ElementRef,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    const firstName = this.storageService.getFirstName() || '';
    const lastName = this.storageService.getLastName() || '';
    const email = this.storageService.getUserEmail() || '';
    this.userEmail = email;
    this.userName = firstName || [firstName, lastName].filter(Boolean).join(' ') || email;
    this.userInitial = (firstName || email || 'T')[0].toUpperCase();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.unlistenDoc) this.unlistenDoc();
  }

  @HostListener('window:scroll', [])
  onScroll(): void {
    this.isScrolled = window.scrollY > 20;
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
