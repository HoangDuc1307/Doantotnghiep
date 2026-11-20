import { DecimalPipe } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { InventoryItem, InventoryService, Meal, SavedMealPlan, SavedMealPlanDetail, UnverifiedItem } from '../../core/services/inventory.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  @Input({ required: true }) items: InventoryItem[] = [];
  @Input() calorieTarget: number | null = null;
  @Input() showProfileReminder = false;
  @Output() inventoryRequested = new EventEmitter<MouseEvent>();
  @Output() profileRequested = new EventEmitter<void>();
  @Output() reminderDeferred = new EventEmitter<void>();
  @Output() itemsUpdated = new EventEmitter<InventoryItem[]>();
  generatingSuggestion = false;
  suggestion = '';
  suggestionError = '';
  suggestionSummary = '';
  mealSuggestions: Meal[] = [];
  unverifiedItems: UnverifiedItem[] = [];
  savingPlan = false;
  planSaveMessage = '';
  planSaveError = '';
  savedPlans: SavedMealPlan[] = [];
  loadingPlanDetail = false;
  planDetail: SavedMealPlanDetail | null = null;
  planDetailError = '';

  constructor(
    private readonly inventory: InventoryService,
    private readonly changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    void this.loadSavedPlans();
  }

  get urgentCount(): number {
    return this.items.filter((item) => {
      const expiry = new Date(`${item.expiry_date}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const days = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
      return item.expiry_date !== null && days <= 3;
    }).length;
  }

  get unverifiedNames(): string {
    return this.unverifiedItems.map((item) => item.name).join(', ');
  }

  get canSaveSuggestion(): boolean {
    return this.mealSuggestions.length > 0 && this.unverifiedItems.length === 0;
  }

  todayLabel(): string {
    return new Date().toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }

  planDateLabel(value: string): string {
    const [year, month, day] = value.split('-');
    return year && month && day ? `${day}/${month}/${year}` : value;
  }

  mealSlotLabel(value: SavedMealPlanDetail['meals'][number]['meal_slot']): string {
    return { breakfast: 'Bữa sáng', lunch: 'Bữa trưa', dinner: 'Bữa tối', snack: 'Bữa phụ' }[value];
  }

  async generateSuggestion(): Promise<void> {
    if (this.generatingSuggestion) return;
    this.generatingSuggestion = true;
    this.suggestion = '';
    this.suggestionError = '';
    this.suggestionSummary = '';
    this.mealSuggestions = [];
    this.unverifiedItems = [];
    this.planSaveMessage = '';
    this.planSaveError = '';
    this.changeDetector.markForCheck();
    try {
      const result = await this.inventory.suggestMeals();
      this.suggestion = result.suggestion;
      this.mealSuggestions = result.meals;
      this.unverifiedItems = result.unverifiedItems;
      this.suggestionSummary = result.confidence === 'estimated'
        ? `Ước tính ${result.totalKcal?.toLocaleString('vi-VN')} kcal · chênh ${result.differenceKcal?.toLocaleString('vi-VN')} kcal so với mục tiêu ${result.targetKcal.toLocaleString('vi-VN')} kcal. Máy chủ tính từ lượng g hoặc kg AI đề xuất trong giới hạn kho.`
        : result.knownKcal === null
          ? `Chưa có phần kcal nào đủ căn cứ. Còn thiếu dữ liệu cho: ${result.unverifiedItems.map((item) => item.name).join(', ')}. Không đối chiếu gợi ý này với mục tiêu kcal.`
          : `Đã tính được ${result.knownKcal.toLocaleString('vi-VN')} kcal từ nguyên liệu có dữ liệu; còn thiếu: ${result.unverifiedItems.map((item) => item.name).join(', ')}. Không đối chiếu gợi ý này với mục tiêu kcal.`;
    } catch (error) {
      this.suggestionError = error instanceof Error ? error.message : 'Chưa thể tạo gợi ý.';
    } finally {
      this.generatingSuggestion = false;
      this.changeDetector.markForCheck();
    }
  }

  async saveSuggestion(): Promise<void> {
    if (this.savingPlan || !this.canSaveSuggestion) return;
    this.savingPlan = true;
    this.planSaveMessage = '';
    this.planSaveError = '';
    this.changeDetector.markForCheck();
    try {
      const saved = await this.inventory.saveMealPlan(this.todayIsoDate(), this.mealSuggestions);
      this.savedPlans = [saved, ...this.savedPlans.filter((plan) => plan.id !== saved.id)];
      this.planSaveMessage = 'Đã lưu thực đơn. Kho thực phẩm không tự bị trừ.';
    } catch (error) {
      this.planSaveError = error instanceof Error ? error.message : 'Chưa thể lưu thực đơn.';
    } finally {
      this.savingPlan = false;
      this.changeDetector.markForCheck();
    }
  }

  async openPlanDetail(id: string): Promise<void> {
    if (this.loadingPlanDetail) return;
    this.loadingPlanDetail = true;
    this.planDetail = null;
    this.planDetailError = '';
    this.changeDetector.markForCheck();
    try {
      this.planDetail = await this.inventory.readMealPlan(id);
    } catch (error) {
      this.planDetailError = error instanceof Error ? error.message : 'Chưa thể mở thực đơn.';
    } finally {
      this.loadingPlanDetail = false;
      this.changeDetector.markForCheck();
    }
  }

  closePlanDetail(): void {
    this.planDetail = null;
    this.planDetailError = '';
  }

  private async loadSavedPlans(): Promise<void> {
    try {
      this.savedPlans = await this.inventory.listMealPlans();
      this.changeDetector.markForCheck();
    } catch {
      // The suggestion flow remains available when the saved-plan list cannot load.
    }
  }

  private todayIsoDate(): string {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${today.getFullYear()}-${month}-${day}`;
  }
}
