import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonToolbar, IonButton, IonIcon, IonFooter, IonInput, IonItem, RefresherCustomEvent } from '@ionic/angular/standalone';
import { ChatService } from '../services/chat.service';
import { AuthService } from '../services/auth.service'; // Import AuthService
import { ActivatedRoute } from '@angular/router';
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
  @ViewChild(IonContent) content?: IonContent;
  @ViewChild('messageInput') messageInput?: IonInput;

  chats: any[] = [];
  selectedChat: any = null;
  messages: any[] = [];
  newMessage = '';
  isSending = false;
  isLoggedIn: boolean = false; // Add property to track login status
  pendingHash: string | null = null;
  pendingType: '15min' | 'write' | null = null;
  pendingToUserId: number | null = null;
  shouldAutoEnhanceOnOpen = false;

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private route: ActivatedRoute
  ) { // Inject AuthService
    addIcons({ send });
  }

  ngOnInit() {
    this.route.queryParamMap.subscribe((params) => {
      this.pendingHash = params.get('hash');
      this.pendingType = this.normalizePendingType(params.get('type'));

      const qpToUserId = Number(params.get('to_user_id'));
      this.pendingToUserId = Number.isFinite(qpToUserId) && qpToUserId > 0 ? qpToUserId : null;
      this.shouldAutoEnhanceOnOpen = !!(this.pendingHash || this.pendingType || this.pendingToUserId);
    });

    this.isLoggedIn = this.authService.isAuthenticated(); // Check login status on init
    if (this.isLoggedIn) {
      this.initChatAndLoad();
    }
  }

  private initChatAndLoad() {
    if (this.pendingHash) {
      this.chatService.initChatByHash(this.pendingHash, this.pendingType ?? undefined).subscribe({
        next: () => this.loadChats(),
        error: () => this.loadChats()
      });
      return;
    }

    this.loadChats();
  }

  private loadChats(event?: RefresherCustomEvent) {
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
        } else {
          this.chats = [];
        }

        if (this.chats && this.chats.length > 0) {
          const preferredChat = this.findPreferredChat();
          this.selectChat(preferredChat ?? this.chats[0]);
        } else if (this.pendingToUserId) {
          this.selectedChat = {
            from_user_id: this.pendingToUserId,
            to_user_id: this.pendingToUserId,
            user_id: this.pendingToUserId,
            fullname: 'Психолог'
          };
          this.messages = [];
        } else {
          this.selectedChat = null;
          this.messages = [];
        }

        event?.detail.complete();
      },
      error: () => {
        event?.detail.complete();
      }
    });
  }

  private findPreferredChat(): any | null {
    if (this.pendingHash) {
      const byHash = this.chats.find((chat: any) =>
        String(chat.hash ?? chat.chat_hash ?? chat.doctor_hash ?? '').trim() === this.pendingHash
      );
      if (byHash) {
        return byHash;
      }
    }

    if (this.pendingToUserId) {
      const byUserId = this.chats.find((chat: any) => this.getSelectedUserId(chat) === this.pendingToUserId);
      if (byUserId) {
        return byUserId;
      }
    }

    return null;
  }

  selectChat(chat: any) {
    this.selectedChat = chat;
    this.newMessage = '';
    const toUserId = this.getSelectedUserId(chat);
    if (!toUserId) {
      this.messages = [];
      return;
    }

    this.chatService.getChatMessages(
      toUserId,
      this.pendingHash ? { hash: this.pendingHash, type: this.pendingType ?? undefined } : undefined
    ).subscribe({
      next: (data: any) => {
        if (data && data.messages) {
          this.messages = data.messages;
        } else {
          this.messages = [];
        }
        this.applyEntryUxOnce();
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
      const firstMessageType =
        this.pendingType === '15min' ? 1 : this.pendingType === 'write' ? 0 : undefined;

      const result = await this.chatService.sendChatMessage(toUserId, text, {
        hash: this.pendingHash ?? undefined,
        type: this.pendingType ?? undefined,
        firstMessageType
      });

      if (!result.ok) {
        console.error('Send message failed:', result);
        this.messages = this.messages.filter((m: any) => m.id !== optimisticMessage.id);
        this.isSending = false;
        return;
      } else {
        this.pendingType = null;

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
          this.scrollToBottom();
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
    this.loadChats(event);
  }

  private normalizePendingType(typeRaw: string | null): '15min' | 'write' | null {
    if (!typeRaw) {
      return null;
    }

    const normalized = typeRaw.trim().toLowerCase();
    if (normalized === '15min' || normalized === '15') {
      return '15min';
    }
    if (normalized === 'write' || normalized === 'chat' || normalized === 'message') {
      return 'write';
    }

    return null;
  }

  private applyEntryUxOnce() {
    if (!this.shouldAutoEnhanceOnOpen) {
      return;
    }

    this.shouldAutoEnhanceOnOpen = false;

    // Wait for DOM render before scrolling/focusing.
    setTimeout(async () => {
      this.scrollToBottom();
      try {
        await this.messageInput?.setFocus();
      } catch {
        // noop
      }
    }, 120);
  }

  private scrollToBottom() {
    void this.content?.scrollToBottom(220);
  }
}
