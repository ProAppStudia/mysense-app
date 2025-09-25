import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, IonIcon, IonList, IonItem, IonAvatar, IonLabel, IonFooter, IonInput } from '@ionic/angular/standalone';
import { ChatService } from '../services/chat.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonButtons, IonButton, IonIcon, IonList, IonItem, IonAvatar, IonLabel, IonFooter, IonInput]
})
export class ChatPage implements OnInit {
  chats: any[] = [];
  selectedChat: any = null;
  messages: any[] = [];

  constructor(private chatService: ChatService) { }

  ngOnInit() {
    this.chatService.getMyChats().subscribe({
      next: (data: any) => {
        if (Array.isArray(data)) {
          this.chats = data;
        } else if (data && data.chats) {
          this.chats = data.chats;
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

  selectChat(chat: any) {
    this.selectedChat = chat;
    this.chatService.getChatMessages(chat.chat_id).subscribe({
      next: (data: any) => {
        if (Array.isArray(data)) {
          this.messages = data;
        } else if (data && data.messages) {
          this.messages = data.messages;
        }
      },
      error: (error) => {
        // Handle error appropriately in a real app
      }
    });
  }

}
