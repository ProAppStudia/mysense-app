import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonIcon, IonAvatar, IonLabel, IonFooter, IonInput, IonItem, RefresherCustomEvent } from '@ionic/angular/standalone';
import { ChatService } from '../services/chat.service';
import { AuthService } from '../services/auth.service'; // Import AuthService
import { addIcons } from 'ionicons';
import { send } from 'ionicons/icons';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonButton, IonIcon, IonAvatar, IonLabel, IonFooter, IonInput, IonItem],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ChatPage implements OnInit {
  chats: any[] = [];
  selectedChat: any = null;
  messages: any[] = [];
  isLoggedIn: boolean = false; // Add property to track login status

  constructor(private chatService: ChatService, private authService: AuthService) { // Inject AuthService
    addIcons({ send });
  }

  ngOnInit() {
    this.isLoggedIn = this.authService.isAuthenticated(); // Check login status on init
    if (this.isLoggedIn) {
      this.chatService.getMyChats().subscribe({
        next: (data: any) => {
          if (Array.isArray(data)) {
            this.chats = data.map((chat: any) => ({
              ...chat,
              photo: chat.img || chat.photo // Use img if available, otherwise use existing photo
            }));
          } else if (data && data.chats) {
            this.chats = data.chats.map((chat: any) => ({
              ...chat,
              photo: chat.img || chat.photo // Use img if available, otherwise use existing photo
            }));
          }
          if (this.chats && this.chats.length > 0) {
            this.selectChat(this.chats[0]);
          }
        },
        error: (error) => {
          // Handle error appropriately in a real app
        }
      });
    }
  }

  selectChat(chat: any) {
    this.selectedChat = chat;
    this.chatService.getChatMessages(chat.from_user_id).subscribe({
      next: (data: any) => {
        if (data && data.messages) {
          this.messages = data.messages;
        } else {
          this.messages = [];
        }
      },
      error: (error) => {
        // Handle error appropriately in a real app
      }
    });
  }

  handleRefresh(event: RefresherCustomEvent) {
    this.chatService.getMyChats().subscribe({
      next: (data: any) => {
        if (Array.isArray(data)) {
          this.chats = data.map((chat: any) => ({
            ...chat,
            photo: chat.img || chat.photo
          }));
        } else if (data && data.chats) {
          this.chats = data.chats.map((chat: any) => ({
            ...chat,
            photo: chat.img || chat.photo
          }));
        }
        if (this.chats && this.chats.length > 0) {
          this.selectChat(this.chats[0]);
        } else {
          this.selectedChat = null;
          this.messages = [];
        }
        event.detail.complete();
      },
      error: (error) => {
        console.error('Error refreshing chats:', error);
        event.detail.complete();
      }
    });
  }
}
