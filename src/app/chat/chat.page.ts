import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonToolbar, IonButton, IonIcon, IonFooter, IonInput, IonItem, IonTextarea, RefresherCustomEvent } from '@ionic/angular/standalone';
import { ChatService } from '../services/chat.service';
import { AuthService } from '../services/auth.service'; // Import AuthService
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { addOutline, attachOutline, createOutline, send, trashOutline } from 'ionicons/icons';
import { DoctorService } from '../services/doctor.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: true,
  imports: [IonContent, IonToolbar, CommonModule, FormsModule, IonButton, IonIcon, IonFooter, IonInput, IonItem, IonTextarea],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ChatPage implements OnInit {
  @ViewChild(IonContent) content?: IonContent;
  @ViewChild('messageInput') messageInput?: IonTextarea;
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
  currentDoctorHash = '';
  pendingHash: string | null = null;
  pendingType: '15min' | 'write' | null = null;
  pendingToUserId: number | null = null;
  pendingDoctorId: number | null = null;
  pendingTargetName = '';
  pendingTargetPhoto = '';
  shouldAutoEnhanceOnOpen = false;
  selectedTaskFiles: File[] = [];
  private readonly lastWrittenPeerKey = 'chat_last_written_peer_user_id';
  private hasInitializedChat = false;

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private doctorService: DoctorService
  ) { // Inject AuthService
    addIcons({ send, addOutline, trashOutline, attachOutline, createOutline });
  }

  ngOnInit() {
    this.route.queryParamMap.subscribe((params) => {
      this.pendingHash = params.get('hash');
      this.pendingType = this.normalizePendingType(params.get('type'));

      const qpToUserId = Number(params.get('to_user_id'));
      const qpDoctorUserId = Number(params.get('doctor_user_id'));
      const qpDoctorId = Number(params.get('doctor_id'));
      const resolvedPendingUserId = Number.isFinite(qpToUserId) && qpToUserId > 0
        ? qpToUserId
        : (Number.isFinite(qpDoctorUserId) && qpDoctorUserId > 0 ? qpDoctorUserId : null);
      this.pendingToUserId = resolvedPendingUserId;
      this.pendingDoctorId = Number.isFinite(qpDoctorId) && qpDoctorId > 0 ? qpDoctorId : null;
      this.pendingTargetName = String(params.get('target_name') ?? '').trim();
      this.pendingTargetPhoto = String(params.get('target_photo') ?? '').trim();
      this.shouldAutoEnhanceOnOpen = !!(this.pendingHash || this.pendingType || this.pendingToUserId);

      // Chat tab is cached in Ionic tabs, so ngOnInit may not rerun.
      // Re-apply pending chat target on every navigation with explicit query params.
      if (this.hasInitializedChat && this.shouldAutoEnhanceOnOpen) {
        this.initChatAndLoad();
      }
    });

    this.isLoggedIn = this.authService.isAuthenticated(); // Check login status on init
    if (this.isLoggedIn) {
      this.authService.getProfile().subscribe({
        next: (profile) => {
          this.isDoctor = !!(profile?.is_doctor === true || profile?.is_doctor === 1 || profile?.is_doctor === '1');
          if (!this.isDoctor) {
            this.activeTab = 'chat';
          }
          this.currentUserId = Number(profile?.user_id) || null;
          this.currentDoctorHash = String((profile as any)?.hash ?? '').trim();
          this.initChatAndLoad();
        },
        error: () => {
          this.isDoctor = false;
          this.activeTab = 'chat';
          this.currentUserId = null;
          this.currentDoctorHash = '';
          this.initChatAndLoad();
        }
      });
    }
  }

  private initChatAndLoad() {
    this.hasInitializedChat = true;
    if (this.pendingHash) {
      this.chatService.initChatByHash(this.pendingHash, this.pendingType ?? undefined).subscribe({
        next: (data: any) => {
          this.hydratePendingChatFromInit(data);
          if (this.pendingToUserId) {
            this.loadChats();
            return;
          }

          this.resolvePendingUserId(this.pendingHash as string, this.pendingDoctorId, () => this.loadChats());
        },
        error: () => this.loadChats()
      });
      return;
    }

    this.loadChats();
  }

  private hydratePendingChatFromInit(data: any): void {
    if (!data || typeof data !== 'object') {
      return;
    }

    const resolvedToUserId = this.extractFirstPositiveNumberByKeys(data, [
      'doctor_user_id',
      'to_user_id',
      'user_id',
      'peer_user_id'
    ]);
    const resolvedDoctorId = this.extractFirstPositiveNumberByKeys(data, ['doctor_id', 'id']);

    if (Number.isFinite(resolvedToUserId) && resolvedToUserId > 0) {
      this.pendingToUserId = resolvedToUserId;
    }
    if (Number.isFinite(resolvedDoctorId) && resolvedDoctorId > 0) {
      this.pendingDoctorId = resolvedDoctorId;
    }
  }

  private resolvePendingUserId(hash: string, doctorId: number | null, done: () => void): void {
    const safeDoctorId = Number(doctorId ?? 0);
    if (Number.isFinite(safeDoctorId) && safeDoctorId > 0) {
      this.doctorService.getDoctorProfile(safeDoctorId).subscribe({
        next: (doctor: any) => {
          const resolvedId = Number(doctor?.userId ?? doctor?.user_id ?? 0);
          if (Number.isFinite(resolvedId) && resolvedId > 0) {
            this.pendingToUserId = resolvedId;
            done();
            return;
          }
          this.resolvePendingUserIdByHash(hash, done);
        },
        error: () => this.resolvePendingUserIdByHash(hash, done)
      });
      return;
    }

    this.resolvePendingUserIdByHash(hash, done);
  }

  private resolvePendingUserIdByHash(hash: string, done: () => void): void {
    const safeHash = String(hash || '').trim();
    if (!safeHash) {
      done();
      return;
    }

    this.doctorService.getDoctorProfileByHash(safeHash).subscribe({
      next: (doctor: any) => {
        const resolvedId = Number(doctor?.userId ?? doctor?.user_id ?? doctor?.id ?? 0);
        if (Number.isFinite(resolvedId) && resolvedId > 0) {
          this.pendingToUserId = resolvedId;
        }
        done();
      },
      error: () => done()
    });
  }

  private extractFirstPositiveNumberByKeys(source: any, keys: string[]): number {
    if (!source || typeof source !== 'object' || !Array.isArray(keys) || !keys.length) {
      return 0;
    }

    const wanted = new Set(keys.map((k) => String(k).toLowerCase()));
    const queue: any[] = [source];
    const visited = new Set<any>();

    while (queue.length) {
      const current = queue.shift();
      if (!current || visited.has(current)) {
        continue;
      }
      visited.add(current);

      if (Array.isArray(current)) {
        queue.push(...current);
        continue;
      }

      if (typeof current !== 'object') {
        continue;
      }

      for (const key of Object.keys(current)) {
        const value = current[key];
        if (wanted.has(String(key).toLowerCase())) {
          const num = Number(value);
          if (Number.isFinite(num) && num > 0) {
            return num;
          }
        }
        if (value && typeof value === 'object') {
          queue.push(value);
        }
      }
    }

    return 0;
  }

  private loadChats(event?: RefresherCustomEvent) {
    this.chatService.getMyChats().subscribe({
      next: (data: any) => {
        this.chats = this.extractChatsFromResponse(data);

        if (this.chats && this.chats.length > 0) {
          const preferredChat = this.findPreferredChat();
          if (preferredChat) {
            this.selectChat(preferredChat);
          } else if (this.pendingToUserId) {
            this.selectChat(this.buildPendingChat(this.pendingToUserId));
          } else {
            this.selectChat(this.chats[0]);
          }
        } else if (this.pendingToUserId) {
          this.selectChat(this.buildPendingChat(this.pendingToUserId));
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

  private buildPendingChat(toUserId: number): any {
    return {
      from_user_id: toUserId,
      to_user_id: toUserId,
      user_id: toUserId,
      fullname: this.pendingTargetName || 'Психолог',
      photo: this.pendingTargetPhoto || 'assets/icon/favicon.png'
    };
  }

  private extractChatsFromResponse(data: any): any[] {
    const candidates: any[] = [];
    if (Array.isArray(data)) {
      candidates.push(...data);
    }

    if (data && typeof data === 'object') {
      const keys = ['chats', 'results', 'items', 'data', 'dialogs', 'users', 'list'];
      for (const key of keys) {
        const value = (data as any)[key];
        if (Array.isArray(value)) {
          candidates.push(...value);
        }
      }
      if (data.result && Array.isArray(data.result)) {
        candidates.push(...data.result);
      }
    }

    const mapped = candidates
      .filter((item) => item && typeof item === 'object')
      .map((chat: any) => ({
        ...chat,
        fullname:
          String(chat.fullname ?? chat.name ?? chat.username ?? chat.firstname ?? chat.title ?? '').trim() ||
          'Користувач',
        photo: chat.img || chat.photo || chat.avatar || chat.image || '',
        from_user_id: Number(chat.from_user_id ?? chat.user_id_from ?? chat.sender_id ?? chat.from_id ?? 0) || undefined,
        to_user_id: Number(chat.to_user_id ?? chat.user_id_to ?? chat.receiver_id ?? chat.to_id ?? 0) || undefined,
        user_id: Number(chat.user_id ?? chat.peer_user_id ?? chat.id ?? 0) || undefined
      }));

    return this.sortChatsByRecencyAndLastWritten(mapped);
  }

  private sortChatsByRecencyAndLastWritten(chats: any[]): any[] {
    const sorted = [...chats].sort((a, b) => this.getChatSortTimestamp(b) - this.getChatSortTimestamp(a));
    const lastWrittenPeerId = this.getLastWrittenPeerId();
    if (!lastWrittenPeerId) {
      return sorted;
    }

    const idx = sorted.findIndex((chat) => this.getSelectedUserId(chat) === lastWrittenPeerId);
    if (idx <= 0) {
      return sorted;
    }

    const [chat] = sorted.splice(idx, 1);
    sorted.unshift(chat);
    return sorted;
  }

  private getChatSortTimestamp(chat: any): number {
    if (!chat || typeof chat !== 'object') {
      return 0;
    }

    const values = [
      chat.last_message_datetime,
      chat.last_message_date,
      chat.last_date,
      chat.updated_at,
      chat.created_at,
      chat.date
    ];

    let maxTs = 0;
    for (const value of values) {
      const ts = this.parseAnyDateToTimestamp(value);
      if (ts > maxTs) {
        maxTs = ts;
      }
    }
    return maxTs;
  }

  private parseAnyDateToTimestamp(value: any): number {
    const raw = String(value ?? '').trim();
    if (!raw) {
      return 0;
    }

    const direct = Date.parse(raw);
    if (!Number.isNaN(direct)) {
      return direct;
    }

    const full = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
    if (full) {
      const [, dd, mm, yyyy, hh = '00', min = '00'] = full;
      const ts = Date.parse(`${yyyy}-${mm}-${dd}T${hh}:${min}:00`);
      return Number.isNaN(ts) ? 0 : ts;
    }

    const short = raw.match(/^(\d{2})\.(\d{2})(?:\s+(\d{2}):(\d{2}))?$/);
    if (short) {
      const year = new Date().getFullYear();
      const [, dd, mm, hh = '00', min = '00'] = short;
      const ts = Date.parse(`${year}-${mm}-${dd}T${hh}:${min}:00`);
      return Number.isNaN(ts) ? 0 : ts;
    }

    return 0;
  }

  private getLastWrittenPeerId(): number | null {
    const raw = localStorage.getItem(this.lastWrittenPeerKey);
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private setLastWrittenPeerId(peerId: number): void {
    if (Number.isFinite(peerId) && peerId > 0) {
      localStorage.setItem(this.lastWrittenPeerKey, String(peerId));
    }
  }

  private bumpChatToTopByPeerId(peerId: number): void {
    if (!peerId || !Array.isArray(this.chats) || this.chats.length < 2) {
      return;
    }

    const idx = this.chats.findIndex((chat: any) => this.getSelectedUserId(chat) === peerId);
    if (idx <= 0) {
      return;
    }

    const [chat] = this.chats.splice(idx, 1);
    this.chats.unshift(chat);
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

    if (this.pendingTargetName) {
      const wanted = this.normalizeName(this.pendingTargetName);
      const byName = this.chats.find((chat: any) => this.normalizeName(chat?.fullname) === wanted);
      if (byName) {
        return byName;
      }
    }

    return null;
  }

  private normalizeName(value: any): string {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
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
        if (data && this.selectedChat) {
          const resolvedHash = String(data.hash ?? data.doctor_hash ?? data.chat_hash ?? '').trim();
          if (resolvedHash) {
            this.selectedChat = { ...this.selectedChat, hash: resolvedHash };
          }

          const resolvedDoctorId = Number(data.doctor_id ?? data.id ?? 0);
          if (resolvedDoctorId > 0) {
            this.selectedChat = { ...this.selectedChat, doctor_id: resolvedDoctorId };
          }

          const resolvedDoctorUserId = Number(data.doctor_user_id ?? 0);
          if (resolvedDoctorUserId > 0) {
            this.selectedChat = { ...this.selectedChat, doctor_user_id: resolvedDoctorUserId };
          }
        }

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

  openReservePage() {
    if (!this.selectedChat) {
      return;
    }

    const peerUserId = this.getSelectedUserId(this.selectedChat);
    if (!peerUserId) {
      return;
    }

    const doctorHash = String(
      this.selectedChat?.hash ??
      this.selectedChat?.doctor_hash ??
      this.selectedChat?.chat_hash ??
      (this.isDoctor ? this.currentDoctorHash : '') ??
      this.pendingHash ??
      ''
    ).trim();

    const queryParams: Record<string, string | number> = {
      to_user_id: peerUserId,
      target_name: String(this.selectedChat?.fullname ?? '').trim(),
      target_photo: String(this.selectedChat?.photo ?? '').trim(),
      doctor_user_id: this.isDoctor
        ? Number(this.selectedChat?.doctor_user_id ?? this.currentUserId ?? 0)
        : Number(this.selectedChat?.doctor_user_id ?? peerUserId)
    };

    const doctorId = Number(this.selectedChat?.doctor_id ?? 0);
    if (doctorId > 0) {
      queryParams['doctor_id'] = doctorId;
    }

    if (doctorHash) {
      queryParams['hash'] = doctorHash;
    }

    void this.router.navigate(['/tabs/session-request'], { queryParams });
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
        this.setLastWrittenPeerId(toUserId);
        this.bumpChatToTopByPeerId(toUserId);

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
        this.setLastWrittenPeerId(toUserId);
        this.bumpChatToTopByPeerId(toUserId);

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
