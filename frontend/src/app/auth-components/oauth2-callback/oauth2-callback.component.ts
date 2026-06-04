import {Component, OnInit} from '@angular/core';
import {Oauth2Service} from "../../services/oauth2/oauth2.service";

@Component({
  selector: 'app-oauth2-callback',
  templateUrl: './oauth2-callback.component.html',
  styleUrls: ['./oauth2-callback.component.css']
})
export class Oauth2CallbackComponent implements OnInit {
  constructor(private oauth2Service: Oauth2Service) {}

  ngOnInit(): void {
    // Handle the OAuth2 callback
    this.oauth2Service.handleOAuth2Callback();
  }
}
