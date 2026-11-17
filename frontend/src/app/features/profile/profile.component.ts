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
  ageYears = '';
  sexForEquation: 'male' | 'female' | '' = '';
  activityFactor = '';
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
    this.ageYears = this.account?.age_years == null ? '' : String(this.account.age_years);
    this.sexForEquation = this.account?.sex_for_equation ?? '';
    this.activityFactor = this.account?.activity_factor == null ? '' : String(this.account.activity_factor);
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
    const ageYears = this.optionalInteger(this.ageYears, 18, 120);
    const activityFactor = this.optionalNumber(this.activityFactor);

    if (!Number.isInteger(dailyCalorieTarget) || dailyCalorieTarget <= 0 || dailyCalorieTarget > 10000) {
      this.formError = 'Nhập mục tiêu năng lượng là số nguyên từ 1 đến 10.000 kcal.';
      return;
    }
    if (heightCm === undefined || weightKg === undefined || ageYears === undefined || activityFactor === undefined) {
      this.formError = 'Chiều cao, cân nặng, tuổi và hệ số vận động phải là số hợp lệ.';
      return;
    }

    this.saving = true;
    try {
      const profile: ProfileInput = {
        height_cm: heightCm, weight_kg: weightKg, daily_calorie_target: dailyCalorieTarget,
        age_years: ageYears, sex_for_equation: this.sexForEquation || null, activity_factor: activityFactor,
      };
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

  private optionalInteger(value: string, minimum: number, maximum: number): number | null | undefined {
    if (!value.trim()) return null;
    const number = Number(value);
    return Number.isInteger(number) && number >= minimum && number <= maximum ? number : undefined;
  }
}
