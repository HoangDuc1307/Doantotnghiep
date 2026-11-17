import { DecimalPipe } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { InventoryItem, InventoryService, Meal, SavedMealPlan, UnverifiedItem } from '../../core/services/inventory.service';

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
  nutritionPreparation = '';
  savingPlan = false;
  planSaveMessage = '';
  planSaveError = '';
  savedPlans: SavedMealPlan[] = [];

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

  async generateSuggestion(): Promise<void> {
    if (this.generatingSuggestion) return;
    this.generatingSuggestion = true;
    this.suggestion = '';
    this.suggestionError = '';
    this.suggestionSummary = '';
    this.nutritionPreparation = '';
    this.mealSuggestions = [];
    this.unverifiedItems = [];
    this.planSaveMessage = '';
    this.planSaveError = '';
    this.changeDetector.markForCheck();
    try {
      const mappedCount = await this.autoMapFoodsForEstimate();
      if (mappedCount) this.nutritionPreparation = `Đã tự ghép khớp chính xác ${mappedCount} thực phẩm với dữ liệu dinh dưỡng Việt Nam.`;
      const result = await this.inventory.suggestMeals();
      this.suggestion = result.suggestion;
      this.mealSuggestions = result.meals;
      this.unverifiedItems = result.unverifiedItems;
      this.suggestionSummary = result.confidence === 'estimated'
        ? `Ước tính ${result.totalKcal?.toLocaleString('vi-VN')} kcal · chênh ${result.differenceKcal?.toLocaleString('vi-VN')} kcal so với mục tiêu ${result.targetKcal.toLocaleString('vi-VN')} kcal. Máy chủ tính từ lượng g hoặc kg AI đề xuất trong giới hạn kho.`
        : `Chưa đủ dữ liệu để ước tính kcal cho: ${result.unverifiedItems.map((item) => item.name).join(', ')}.`;
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

  private async autoMapFoodsForEstimate(): Promise<number> {
    let mappedCount = 0;
    // shortcut: map only three new foods per suggestion to respect DLPL free-tier rate limits; expand when quota-aware batching exists.
    for (const item of this.items.filter((candidate) => !candidate.food_id).slice(0, 3)) {
      try {
        const matches = (await this.inventory.searchFoods(item.name)).filter((food) =>
          food.description.trim().normalize('NFC').toLocaleLowerCase('vi') === item.name.trim().normalize('NFC').toLocaleLowerCase('vi'),
        );
        if (matches.length !== 1) continue;
        const selectedFood = await this.inventory.selectFood(matches[0].id);
        const updated = await this.inventory.update(item.id, { ...item, food_id: selectedFood.id });
        const nextItems = this.items.map((candidate) => candidate.id === updated.id ? { ...candidate, ...updated, food_description: selectedFood.description } : candidate);
        this.items = nextItems;
        this.itemsUpdated.emit(nextItems);
        mappedCount += 1;
      } catch {
        // A missing nutrition match only lowers confidence; it must not prevent a meal suggestion.
      }
    }
    return mappedCount;
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
