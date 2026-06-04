import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './auth-components/login/login.component';
import { RegisterComponent } from './auth-components/register/register.component';
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {HTTP_INTERCEPTORS, HttpClient, HttpClientModule} from "@angular/common/http";
import { Oauth2CallbackComponent } from './auth-components/oauth2-callback/oauth2-callback.component';
import { RoleSelectionComponent } from './auth-components/role-selection/role-selection.component';
import { StudentDashboardComponent } from './student-components/student-dashboard/student-dashboard.component';
import { TeacherDashboardComponent } from './teacher-components/teacher-dashboard/teacher-dashboard.component';
import {AuthInterceptor} from "./interceptors/auth/auth.interceptor";
import {ErrorInterceptor} from "./interceptors/error/error.interceptor";
import { SubscriptionKeyComponent } from './teacher-components/subscription-key/subscription-key.component';
import { NavbarComponent } from './teacher-components/navbar/navbar.component';
import { CreateCourseModalComponent } from './teacher-components/course/create-course-modal/create-course-modal.component';
import { CoursesListComponent } from './teacher-components/course/courses-list/courses-list.component';
import { CourseDetailComponent } from './teacher-components/course/course-detail/course-detail.component';
import { HomeComponent } from './pages/home/home.component';
import {TranslateHttpLoader} from "@ngx-translate/http-loader";
import {TranslateLoader, TranslateModule} from "@ngx-translate/core";
import { CourseDiscoveryComponent } from './student-components/course-discovery/course-discovery.component';
import { CourseDetailsComponent } from './student-components/course-details/course-details.component';
import { StudentNavbarComponent } from './student-components/student-navbar/student-navbar.component';
import { MyCoursesComponent } from './student-components/my-courses/my-courses.component';
import { StudentProfileComponent } from './student-components/student-profile/student-profile.component';
import { TeacherProfileComponent } from './teacher-components/teacher-profile/teacher-profile.component';
import { SectionDetailComponent } from './teacher-components/course/section-detail/section-detail.component';
import { SubscriptionResponseComponent } from './student-components/subscription-response/subscription-response.component';
import { StudentCalendarComponent } from './student-components/student-calendar/student-calendar.component';
import { StudentEventModalComponent } from './student-components/student-calendar/student-event-modal/student-event-modal.component';
import { SubscriptionRequestsComponent } from './teacher-components/subscription-requests/subscription-requests.component';
import { StudentsManagementComponent } from './teacher-components/students-management/students-management.component';
import { TeacherCalendarComponent } from './teacher-components/teacher-calendar/teacher-calendar.component';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { CalendarEventModalComponent } from './teacher-components/teacher-calendar/calendar-event-modal/calendar-event-modal.component';
import {MatDialogModule} from "@angular/material/dialog";

export function HttpLoaderFactory(http: HttpClient): TranslateLoader {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    Oauth2CallbackComponent,
    RoleSelectionComponent,
    StudentDashboardComponent,
    TeacherDashboardComponent,
    SubscriptionKeyComponent,
    NavbarComponent,
    CreateCourseModalComponent,
    CoursesListComponent,
    CourseDetailComponent,
    HomeComponent,
    CourseDiscoveryComponent,
    CourseDetailsComponent,
    StudentNavbarComponent,
    MyCoursesComponent,
    StudentProfileComponent,
    TeacherProfileComponent,
    SectionDetailComponent,
    SubscriptionResponseComponent,
    SubscriptionRequestsComponent,
    StudentsManagementComponent,
    StudentCalendarComponent,
    StudentEventModalComponent,
    TeacherCalendarComponent,
    CalendarEventModalComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    ReactiveFormsModule,
    HttpClientModule,
    TranslateModule.forRoot({
      defaultLanguage: 'en',
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
    }),
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatIconModule,
    MatDialogModule,
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
