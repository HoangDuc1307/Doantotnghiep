import { ChangeDetectorRef, Component, EventEmitter, HostListener, Input, OnChanges, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Account, InventoryService, ProfileInput } from '../../core/services/inventory.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnChanges {
  @Input({ required: true }) account: Account | null = null;
  @Input() canSkip = false;
  @Output() profileUpdated = new EventEmitter<Account>();
  @Output() dismissed = new EventEmitter<void>();

  heightCm = '';
  weightKg = '';
  dailyCalorieTarget = '';
  formError = '';
  saving = false;

  constructor(
    private readonly inventory: InventoryService,
    private readonly changeDetector: ChangeDetectorRef,
  ) {}

  ngOnChanges(): void {
    this.heightCm = this.account?.height_cm == null ? '' : String(this.account.height_cm);
    this.weightKg = this.account?.weight_kg == null ? '' : String(this.account.weight_kg);
    this.dailyCalorieTarget = this.account?.daily_calorie_target == null ? '' : String(this.account.daily_calorie_target);
    this.formError = '';
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.dismiss();
  }

  dismiss(): void {
    if (!this.saving) this.dismissed.emit();
  }

  async save(event: Event): Promise<void> {
    event.preventDefault();
    this.formError = '';
    const dailyCalorieTarget = Number(this.dailyCalorieTarget.trim());
    const heightCm = this.optionalNumber(this.heightCm);
    const weightKg = this.optionalNumber(this.weightKg);

    if (!Number.isInteger(dailyCalorieTarget) || dailyCalorieTarget <= 0 || dailyCalorieTarget > 10000) {
      this.formError = 'Nhập mục tiêu năng lượng là số nguyên từ 1 đến 10.000 kcal.';
      return;
    }
    if (heightCm === undefined || weightKg === undefined) {
      this.formError = 'Chiều cao và cân nặng phải là số lớn hơn 0.';
      return;
    }

    this.saving = true;
    try {
      const profile: ProfileInput = { height_cm: heightCm, weight_kg: weightKg, daily_calorie_target: dailyCalorieTarget };
      this.profileUpdated.emit(await this.inventory.updateProfile(profile));
    } catch (error) {
      this.formError = error instanceof Error ? error.message : 'Không thể lưu hồ sơ lúc này.';
    } finally {
      this.saving = false;
      this.changeDetector.markForCheck();
    }
  }

  private optionalNumber(value: string): number | null | undefined {
    if (!value.trim()) return null;
    const number = Number(value.replace(',', '.'));
    return Number.isFinite(number) && number > 0 ? number : undefined;
  }
}
