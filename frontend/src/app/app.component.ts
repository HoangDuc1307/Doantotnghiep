import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Account, InventoryItem, InventoryService } from './core/services/inventory.service';
import { AuthComponent, AuthenticationResult } from './features/auth/auth.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { InventoryComponent } from './features/inventory/inventory.component';
import { ProfileComponent } from './features/profile/profile.component';

type AppPath = '/' | '/inventory';
type FeedbackTone = 'error' | 'success';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AuthComponent, DashboardComponent, InventoryComponent, ProfileComponent],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit, OnDestroy {
  currentPath: AppPath = this.pathFor(window.location.pathname);
  authenticated = false;
  account: Account | null = null;
  items: InventoryItem[] = [];
  feedbackMessage = '';
  feedbackTone: FeedbackTone = 'error';
  profileDialogOpen = false;

  private readonly onUnhandledRejection = (event: PromiseRejectionEvent): void => this.showError(event.reason);
  private readonly onWindowError = (event: ErrorEvent): void => this.showError(event.message || 'Đã xảy ra lỗi trong giao diện.');
  private readonly onPopState = (): void => {
    this.currentPath = this.pathFor(window.location.pathname);
    this.scrollToPath('smooth');
    this.changeDetector.markForCheck();
  };

  constructor(
    private readonly inventory: InventoryService,
    private readonly changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    window.addEventListener('unhandledrejection', this.onUnhandledRejection);
    window.addEventListener('error', this.onWindowError);
    window.addEventListener('popstate', this.onPopState);
    if (window.location.pathname !== this.currentPath) window.history.replaceState({}, '', this.currentPath);
    if (this.inventory.getToken()) void this.restoreSession();
  }

  ngOnDestroy(): void {
    window.removeEventListener('unhandledrejection', this.onUnhandledRejection);
    window.removeEventListener('error', this.onWindowError);
    window.removeEventListener('popstate', this.onPopState);
  }

  navigate(event: MouseEvent, path: AppPath): void {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (window.location.pathname !== path) window.history.pushState({}, '', path);
    this.currentPath = path;
    this.scrollToPath('smooth');
  }

  get showProfileReminder(): boolean {
    return this.account !== null && this.account.daily_calorie_target === null && !this.profileDialogOpen
      && Date.now() >= Number(localStorage.getItem(this.profileReminderKey()) || 0);
  }

  completeAuthentication(result: AuthenticationResult): void {
    this.account = result.account;
    this.authenticated = true;
    this.profileDialogOpen = result.isNewAccount && result.account.daily_calorie_target === null;
    this.changeDetector.markForCheck();
    this.scrollToPath('auto');
  }

  logout(): void {
    this.inventory.logout();
    this.authenticated = false;
    this.account = null;
    this.items = [];
    this.feedbackMessage = '';
    this.profileDialogOpen = false;
  }

  handleAuthFeedback(message: string): void {
    this.feedbackTone = 'error';
    this.feedbackMessage = message;
  }

  handleInventoryFeedback(feedback: { message: string; tone: FeedbackTone }): void {
    this.feedbackTone = feedback.tone;
    this.feedbackMessage = feedback.message;
  }

  openProfile(): void { this.profileDialogOpen = true; }

  deferProfileReminder(): void {
    if (this.account) localStorage.setItem(this.profileReminderKey(), String(Date.now() + 86400000));
    this.changeDetector.markForCheck();
  }

  completeProfile(account: Account): void {
    this.account = account;
    this.profileDialogOpen = false;
    localStorage.removeItem(this.profileReminderKey());
    this.changeDetector.markForCheck();
  }

  closeProfile(): void {
    this.profileDialogOpen = false;
    if (this.account?.daily_calorie_target === null) this.deferProfileReminder();
  }

  private async restoreSession(): Promise<void> {
    try {
      this.account = await this.inventory.me();
      this.authenticated = true;
      this.changeDetector.markForCheck();
      this.scrollToPath('auto');
    } catch (error) {
      this.inventory.logout();
      this.authenticated = false;
      this.showError(error);
    }
  }

  private pathFor(pathname: string): AppPath {
    return pathname.replace(/\/$/, '') === '/inventory' ? '/inventory' : '/';
  }

  private profileReminderKey(): string {
    return `pantry_profile_reminder_until_${this.account?.id ?? ''}`;
  }

  private scrollToPath(behavior: ScrollBehavior): void {
    requestAnimationFrame(() => {
      if (this.currentPath === '/inventory') document.getElementById('inventory')?.scrollIntoView({ behavior, block: 'start' });
      else window.scrollTo({ top: 0, behavior });
    });
  }

  private showError(error: unknown): void {
    this.feedbackTone = 'error';
    this.feedbackMessage = error instanceof Error ? error.message : typeof error === 'string' && error.trim() ? error : 'Đã có lỗi xảy ra. Vui lòng thử lại.';
    this.changeDetector.markForCheck();
  }
}
