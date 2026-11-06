import { ChangeDetectorRef, Component, EventEmitter, Output } from '@angular/core';
import { Account, InventoryService } from '../../core/services/inventory.service';

export interface AuthenticationResult {
  account: Account;
  isNewAccount: boolean;
}

@Component({
  selector: 'app-auth',
  standalone: true,
  templateUrl: './auth.component.html',
})
export class AuthComponent {
  @Output() authenticated = new EventEmitter<AuthenticationResult>();
  @Output() feedback = new EventEmitter<string>();

  authMode: 'login' | 'signup' = 'login';
  showPassword = false;
  busy = false;

  constructor(
    private readonly inventory: InventoryService,
    private readonly changeDetector: ChangeDetectorRef,
  ) {}

  async submit(event: Event): Promise<void> {
    event.preventDefault();
    this.busy = true;
    this.feedback.emit('');
    const form = new FormData(event.currentTarget as HTMLFormElement);
    const name = String(form.get('name') ?? '').trim();
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    try {
      const account = this.authMode === 'signup'
        ? await this.inventory.register(name, email, password)
        : await this.inventory.login(email, password);
      this.authenticated.emit({ account, isNewAccount: this.authMode === 'signup' });
    } catch (error) {
      this.feedback.emit(this.errorMessage(error));
    } finally {
      this.busy = false;
      this.changeDetector.markForCheck();
    }
  }

  toggleMode(): void {
    this.feedback.emit('');
    this.authMode = this.authMode === 'login' ? 'signup' : 'login';
  }

  showResetMessage(): void {
    this.feedback.emit('Tính năng đặt lại mật khẩu chưa được triển khai.');
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string' && error.trim()) return error;
    return 'Đã có lỗi xảy ra. Vui lòng thử lại.';
  }
}
