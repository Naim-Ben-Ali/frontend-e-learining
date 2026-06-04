import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './auth-components/login/login.component';
import { RegisterComponent } from './auth-components/register/register.component';
import { RoleSelectionComponent } from './auth-components/role-selection/role-selection.component';
import { StudentDashboardComponent } from './student-components/student-dashboard/student-dashboard.component';
import { TeacherDashboardComponent } from './teacher-components/teacher-dashboard/teacher-dashboard.component';
import { PublicGuardService } from './guards/public/public.guard';
import { AuthGuardService } from './guards/auth/auth.guard';
import {SubscriptionKeyComponent} from "./teacher-components/subscription-key/subscription-key.component";
import {CourseDetailComponent} from "./teacher-components/course/course-detail/course-detail.component";
import {CoursesListComponent} from "./teacher-components/course/courses-list/courses-list.component";
import {HomeComponent} from "./pages/home/home.component";
import {Oauth2CallbackComponent} from "./auth-components/oauth2-callback/oauth2-callback.component";
import {CourseDiscoveryComponent} from "./student-components/course-discovery/course-discovery.component";
import {CourseDetailsComponent} from "./student-components/course-details/course-details.component";
import {MyCoursesComponent} from "./student-components/my-courses/my-courses.component";
import {StudentProfileComponent} from "./student-components/student-profile/student-profile.component";
import {StudentCalendarComponent} from "./student-components/student-calendar/student-calendar.component";
import {TeacherProfileComponent} from "./teacher-components/teacher-profile/teacher-profile.component";

import {SectionDetailComponent} from "./teacher-components/course/section-detail/section-detail.component";
import {SubscriptionResponseComponent} from "./student-components/subscription-response/subscription-response.component";
import {SubscriptionRequestsComponent} from "./teacher-components/subscription-requests/subscription-requests.component";
import {StudentsManagementComponent} from "./teacher-components/students-management/students-management.component";
import {TeacherCalendarComponent} from "./teacher-components/teacher-calendar/teacher-calendar.component";

const routes: Routes = [
  {
    path: '',
    redirectTo: '/home',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    redirectTo: '/home',  // Default redirect - will be handled by guards
    pathMatch: 'full'
  },
  {
    path:"home",
    component:HomeComponent,
    canActivate:[PublicGuardService]
  },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [PublicGuardService]
  },
  {
    path: 'register',
    component: RegisterComponent,
    canActivate: [PublicGuardService]
  },
  {
    path: 'oauth2/callback',
    component: Oauth2CallbackComponent
    // No guard - OAuth callback needs to process tokens first
  },
  {
    path: 'role-selection',
    component: RoleSelectionComponent,
    canActivate: [AuthGuardService]
  },
  {
    path: 'teacher-dashboard',
    canActivate: [AuthGuardService],
    children:[
      {
        path:'',
        component:TeacherDashboardComponent
      },
      {
        path:"subscription",
        component:SubscriptionKeyComponent
      },
      {
        path: 'courses/:courseId',
        component:CourseDetailComponent
      },
      {
        path: 'courses/:courseId/sections/:sectionId',
        component: SectionDetailComponent
      },
      {
        path:"courses",
        component:CoursesListComponent
      },
      {
        path: 'profile',
        component: TeacherProfileComponent
      },
      {
        path: 'subscription-requests',
        component: SubscriptionRequestsComponent
      },
      {
        path: 'students',
        component: StudentsManagementComponent
      },
      {
        path: 'calendar',
        component: TeacherCalendarComponent
      },
    ]

  },
  {
    path: 'teacher/students',
    redirectTo: 'teacher-dashboard/students',
    pathMatch: 'full'
  },
  {
    path: 'student-dashboard',
    component: StudentDashboardComponent,
    canActivate: [AuthGuardService]
  },
  {
    path: 'student',
    canActivate: [AuthGuardService],
    children: [
      {
        path: 'courses',
        component: CourseDiscoveryComponent
      },
      {
        path: 'courses/:courseId',
        component: CourseDetailsComponent
      },

      {
        path: "my-courses",
        component: MyCoursesComponent
      },
      {
        path: 'my-courses/:courseId',
        component: CourseDetailsComponent
      },
      {
        path: 'profile',
        component: StudentProfileComponent
      },
      {
        path: 'subscription-response',
        component: SubscriptionResponseComponent
      },
      {
        path: 'calendar',
        component: StudentCalendarComponent
      }
    ]
  },

  {
    path: '**',
    redirectTo: '/home'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
