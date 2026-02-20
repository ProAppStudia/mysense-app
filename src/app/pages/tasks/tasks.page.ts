import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.page.html',
  styleUrls: ['./tasks.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, CommonModule]
})
export class TasksPage implements OnInit {
  isLoggedIn = false;
  currentUserId: number | null = null;
  chats: any[] = [];
  selectedChat: any = null;
  tasks: any[] = [];

  constructor(private chatService: ChatService, private authService: AuthService) {}

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isAuthenticated();
    if (!this.isLoggedIn) {
      return;
    }

    this.authService.getProfile().subscribe({
      next: (profile) => {
        this.currentUserId = Number(profile?.user_id) || null;
        this.loadChats();
      },
      error: () => {
        this.currentUserId = null;
        this.loadChats();
      }
    });
  }

  private loadChats() {
    this.chatService.getMyChats().subscribe({
      next: (data: any) => {
        if (Array.isArray(data)) {
          this.chats = data;
        } else if (Array.isArray(data?.chats)) {
          this.chats = data.chats;
        } else {
          this.chats = [];
        }

        if (this.chats.length > 0) {
          this.selectChat(this.chats[0]);
        }
      },
      error: () => {
        this.chats = [];
      }
    });
  }

  selectChat(chat: any) {
    this.selectedChat = chat;
    const toUserId = this.getChatUserId(chat);
    if (!toUserId) {
      this.tasks = [];
      return;
    }

    this.chatService.getMyTasks(toUserId).subscribe({
      next: (resp: any) => {
        this.tasks = Array.isArray(resp?.tasks) ? resp.tasks : [];
      },
      error: () => {
        this.tasks = [];
      }
    });
  }

  private getChatUserId(chat: any): number {
    const candidates = [
      Number(chat?.from_user_id),
      Number(chat?.to_user_id),
      Number(chat?.user_id)
    ].filter((v) => Number.isFinite(v) && v > 0);

    if (!candidates.length) {
      return 0;
    }

    if (this.currentUserId) {
      const peer = candidates.find((id) => id !== this.currentUserId);
      if (peer) {
        return peer;
      }
    }

    return candidates[0];
  }

  deleteTask(taskId: number) {
    if (!taskId) {
      return;
    }

    const ok = window.confirm('Видалити це завдання?');
    if (!ok) {
      return;
    }

    this.chatService.deleteTask(taskId).subscribe({
      next: (resp: any) => {
        if (resp?.error) {
          window.alert(resp.error);
          return;
        }
        if (this.selectedChat) {
          this.selectChat(this.selectedChat);
        } else {
          this.tasks = [];
        }
      },
      error: () => {
        window.alert('Не вдалося видалити завдання');
      }
    });
  }

  openTaskFile(url: string) {
    if (!url) {
      return;
    }

    window.open(url, '_blank');
  }
}
