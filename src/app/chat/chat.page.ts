import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonToolbar, IonButton, IonIcon, IonFooter, IonInput, IonItem, RefresherCustomEvent } from '@ionic/angular/standalone';
import { ChatService } from '../services/chat.service';
import { AuthService } from '../services/auth.service'; // Import AuthService
import { addIcons } from 'ionicons';
import { send } from 'ionicons/icons';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: true,
  imports: [IonContent, IonToolbar, CommonModule, FormsModule, IonButton, IonIcon, IonFooter, IonInput, IonItem],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ChatPage implements OnInit {
  chats: any[] = [];
  selectedChat: any = null;
  messages: any[] = [];
  newMessage = '';
  isSending = false;
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
    this.newMessage = '';
    const toUserId = this.getSelectedUserId(chat);
    if (!toUserId) {
      this.messages = [];
      return;
    }

    this.chatService.getChatMessages(toUserId).subscribe({
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

  async sendMessage() {
    const text = this.newMessage.trim();
    if (!text || !this.selectedChat || this.isSending) {
      return;
    }

    const toUserId = this.getSelectedUserId(this.selectedChat);
    if (!toUserId) {
      return;
    }

    this.isSending = true;

    // Optimistic message for instant UI feedback.
    const optimisticMessage = {
      id: `tmp-${Date.now()}`,
      text,
      date: new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }),
      side: 'right'
    };
    this.messages = [...this.messages, optimisticMessage];
    this.newMessage = '';

    try {
      const result = await this.chatService.sendChatMessage(toUserId, text);

      if (!result.ok) {
        console.error('Send message failed:', result);
        this.messages = this.messages.filter((m: any) => m.id !== optimisticMessage.id);
        this.isSending = false;
        return;
      } else {
        // If backend returns created message object, replace optimistic one immediately.
        const serverMessage = result?.response?.message;
        if (serverMessage && typeof serverMessage === 'object') {
          this.messages = this.messages.map((m: any) =>
            m.id === optimisticMessage.id
              ? {
                  ...m,
                  ...serverMessage,
                  text: serverMessage.text ?? m.text,
                  date: serverMessage.date ?? serverMessage.time ?? m.date,
                  side: 'right'
                }
              : m
          );
        }
      }

      // Refresh thread from backend as source of truth.
      this.chatService.getChatMessages(toUserId).subscribe({
        next: (data: any) => {
          const fetchedMessages = Array.isArray(data?.messages) ? data.messages : [];
          if (!fetchedMessages.length) {
            this.messages = this.messages.filter((m: any) => m.id !== optimisticMessage.id);
            this.isSending = false;
            return;
          }

          // Do not drop just-sent optimistic message if backend list is stale for a moment.
          const hasJustSentInFetched = fetchedMessages.some((m: any) => String(m?.text ?? '').trim() === text);
          this.messages = hasJustSentInFetched ? fetchedMessages : this.messages;
          this.isSending = false;
        },
        error: () => {
          this.isSending = false;
        }
      });
    } catch (error) {
      console.error('Send message error:', error);
      this.isSending = false;
    }
  }

  private getSelectedUserId(chat: any): number {
    if (!chat) {
      return 0;
    }

    const rawId = chat.from_user_id ?? chat.user_id ?? chat.to_user_id ?? chat.id;
    const parsedId = Number(rawId);
    return Number.isFinite(parsedId) && parsedId > 0 ? parsedId : 0;
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
