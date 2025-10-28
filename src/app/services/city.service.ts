import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CityService {
  private apiUrl = 'https://mysense.care/app/connector.php';

  constructor(private http: HttpClient) { }

  getCities(): Observable<any> {
    return this.http.get(`${this.apiUrl}?action=get_psychologists`);
  }
}
