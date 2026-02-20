import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonToolbar, IonButton, IonIcon, IonFooter, IonInput, IonItem, RefresherCustomEvent } from '@ionic/angular/standalone';
import { ChatService } from '../services/chat.service';
import { AuthService } from '../services/auth.service'; // Import AuthService
import { ActivatedRoute } from '@angular/router';
import { addIcons } from 'ionicons';
import { addOutline, attachOutline, createOutline, send, trashOutline } from 'ionicons/icons';

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
  @ViewChild('taskFileInput') taskFileInput?: ElementRef<HTMLInputElement>;

  chats: any[] = [];
  selectedChat: any = null;
  messages: any[] = [];
  tasks: any[] = [];
  newMessage = '';
  activeTab: 'chat' | 'tasks' = 'chat';
  isSending = false;
  isLoggedIn: boolean = false; // Add property to track login status
  isDoctor = false;
  currentUserId: number | null = null;
  pendingHash: string | null = null;
  pendingType: '15min' | 'write' | null = null;
  pendingToUserId: number | null = null;
  shouldAutoEnhanceOnOpen = false;
  selectedTaskFiles: File[] = [];

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private route: ActivatedRoute
  ) { // Inject AuthService
    addIcons({ send, addOutline, trashOutline, attachOutline, createOutline });
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
      this.authService.getProfile().subscribe({
        next: (profile) => {
          this.isDoctor = !!(profile?.is_doctor === true || profile?.is_doctor === 1 || profile?.is_doctor === '1');
          this.currentUserId = Number(profile?.user_id) || null;
          this.initChatAndLoad();
        },
        error: () => {
          this.isDoctor = false;
          this.currentUserId = null;
          this.initChatAndLoad();
        }
      });
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

    this.loadTasksForSelectedChat();
  }

  setActiveTab(tab: 'chat' | 'tasks') {
    this.activeTab = tab;
    if (tab === 'tasks') {
      this.loadTasksForSelectedChat();
    }
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
      console.log('[TasksDebug] getSelectedUserId: empty chat');
      return 0;
    }

    const candidates = [
      Number(chat.from_user_id),
      Number(chat.to_user_id),
      Number(chat.user_id)
    ].filter((v) => Number.isFinite(v) && v > 0);

    if (!candidates.length) {
      console.log('[TasksDebug] getSelectedUserId: no candidates', { chat });
      return 0;
    }

    if (this.currentUserId) {
      const peer = candidates.find((id) => id !== this.currentUserId);
      if (peer) {
        console.log('[TasksDebug] getSelectedUserId: peer resolved', {
          currentUserId: this.currentUserId,
          candidates,
          selected: peer,
          chat
        });
        return peer;
      }
    }

    console.log('[TasksDebug] getSelectedUserId: fallback selected', {
      currentUserId: this.currentUserId,
      candidates,
      selected: candidates[0],
      chat
    });
    return candidates[0];
  }

  private loadTasksForSelectedChat() {
    const toUserId = this.getSelectedUserId(this.selectedChat);
    console.log('[TasksDebug] loadTasksForSelectedChat:start', {
      isDoctor: this.isDoctor,
      currentUserId: this.currentUserId,
      toUserId,
      selectedChat: this.selectedChat
    });
    if (!toUserId) {
      this.tasks = [];
      console.log('[TasksDebug] loadTasksForSelectedChat:stop no toUserId');
      return;
    }

    this.chatService.getMyTasks(toUserId).subscribe({
      next: (resp: any) => {
        this.tasks = Array.isArray(resp?.tasks) ? resp.tasks : [];
        console.log('[TasksDebug] loadTasksForSelectedChat:response', {
          toUserId,
          response: resp,
          tasksCount: this.tasks.length,
          taskIds: this.tasks.map((t: any) => t?.id)
        });
      },
      error: (error) => {
        this.tasks = [];
        console.error('[TasksDebug] loadTasksForSelectedChat:error', {
          toUserId,
          error
        });
      }
    });
  }

  sendTask() {
    const text = this.newMessage.trim();
    console.log('[TasksDebug] sendTask:start', {
      text,
      isDoctor: this.isDoctor,
      isSending: this.isSending,
      hasSelectedChat: !!this.selectedChat
    });
    if (!text || !this.selectedChat || this.isSending) {
      console.log('[TasksDebug] sendTask:blocked', {
        reason: {
          emptyText: !text,
          noSelectedChat: !this.selectedChat,
          sendingInProgress: this.isSending
        }
      });
      return;
    }

    const toUserId = this.getSelectedUserId(this.selectedChat);
    if (!toUserId) {
      console.log('[TasksDebug] sendTask:blocked no toUserId');
      return;
    }

    this.isSending = true;
    console.log('[TasksDebug] sendTask:request', {
      toUserId,
      currentUserId: this.currentUserId,
      isDoctor: this.isDoctor,
      text,
      selectedTaskFiles: this.selectedTaskFiles.map((f) => ({ name: f.name, size: f.size }))
    });

    this.uploadFilesForTask().then((uploadedFiles) => {
      this.chatService.createTask(toUserId, text, uploadedFiles).subscribe({
      next: (resp: any) => {
        console.log('[TasksDebug] sendTask:response', { toUserId, response: resp });
        if (resp?.error) {
          console.error('Create task error:', resp.error);
          this.isSending = false;
          return;
        }

        this.newMessage = '';
        this.selectedTaskFiles = [];
        if (this.taskFileInput?.nativeElement) {
          this.taskFileInput.nativeElement.value = '';
        }
        this.loadTasksForSelectedChat();
        this.isSending = false;
      },
      error: (error) => {
        console.error('Create task failed:', error);
        console.error('[TasksDebug] sendTask:error', { toUserId, error });
        this.isSending = false;
      }
    });
    }).catch((error) => {
      console.error('[TasksDebug] sendTask:upload failed', error);
      this.isSending = false;
    });
  }

  onTaskFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input?.files ?? []);
    this.selectedTaskFiles = files;
    console.log('[TasksDebug] onTaskFilesSelected', {
      filesCount: files.length,
      files: files.map((f) => ({ name: f.name, size: f.size, type: f.type }))
    });
  }

  openTaskFilePicker() {
    this.taskFileInput?.nativeElement?.click();
  }

  private async uploadFilesForTask(): Promise<Array<{ name: string; path: string }>> {
    if (!this.selectedTaskFiles.length) {
      return [];
    }

    return new Promise((resolve, reject) => {
      this.chatService.uploadTaskFiles(this.selectedTaskFiles).subscribe({
        next: (resp: any) => {
          const uploaded = Array.isArray(resp?.files)
            ? resp.files
                .filter((file: any) => file?.status === 'ok' && !!file?.path)
                .map((file: any) => ({
                  name: String(file?.filename ?? file?.name ?? ''),
                  path: String(file?.path ?? '')
                }))
            : [];

          console.log('[TasksDebug] uploadFilesForTask:parsed', {
            raw: resp,
            uploaded
          });

          if (!uploaded.length) {
            reject(new Error('Files upload failed or empty response'));
            return;
          }

          resolve(uploaded);
        },
        error: (error) => reject(error)
      });
    });
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
        this.loadTasksForSelectedChat();
      },
      error: () => {
        window.alert('Не вдалося видалити завдання');
      }
    });
  }

  editTask(task: any) {
    if (!task?.id || !this.selectedChat || this.isSending) {
      return;
    }

    const currentText = String(task?.text ?? '').trim();
    const updatedText = window.prompt('Редагувати завдання', currentText)?.trim() ?? '';

    if (!updatedText || updatedText === currentText) {
      return;
    }

    const toUserId = this.getSelectedUserId(this.selectedChat);
    if (!toUserId) {
      return;
    }

    const existingFiles = this.mapTaskFilesToUploadPayload(task?.files);
    this.isSending = true;

    this.chatService.deleteTask(task.id).subscribe({
      next: (deleteResp: any) => {
        if (deleteResp?.error) {
          console.error('[TasksDebug] editTask:delete error', deleteResp);
          this.isSending = false;
          return;
        }

        this.chatService.createTask(toUserId, updatedText, existingFiles).subscribe({
          next: (createResp: any) => {
            if (createResp?.error) {
              console.error('[TasksDebug] editTask:create error', createResp);
              this.isSending = false;
              return;
            }

            console.log('[TasksDebug] editTask:success', {
              oldTaskId: task.id,
              toUserId,
              existingFilesCount: existingFiles.length
            });
            this.loadTasksForSelectedChat();
            this.isSending = false;
          },
          error: (error) => {
            console.error('[TasksDebug] editTask:create failed', error);
            this.isSending = false;
          }
        });
      },
      error: (error) => {
        console.error('[TasksDebug] editTask:delete failed', error);
        this.isSending = false;
      }
    });
  }

  openTaskFile(url: string) {
    if (!url) {
      return;
    }

    window.open(url, '_blank');
  }

  private mapTaskFilesToUploadPayload(files: any[]): Array<{ name: string; path: string }> {
    if (!Array.isArray(files)) {
      return [];
    }

    return files
      .map((file) => {
        const name = String(file?.name ?? '').trim();
        const path = this.extractPathFromFile(file);
        if (!name || !path) {
          return null;
        }
        return { name, path };
      })
      .filter((item): item is { name: string; path: string } => !!item);
  }

  private extractPathFromFile(file: any): string {
    if (typeof file?.path === 'string' && file.path.trim()) {
      return file.path.trim();
    }

    const rawUrl = String(file?.url ?? '').trim();
    if (!rawUrl) {
      return '';
    }

    try {
      const parsed = new URL(rawUrl);
      return parsed.pathname || '';
    } catch {
      if (rawUrl.startsWith('/')) {
        return rawUrl;
      }
      return '';
    }
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
