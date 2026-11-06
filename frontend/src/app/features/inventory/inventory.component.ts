import { ChangeDetectorRef, Component, ElementRef, EventEmitter, HostListener, OnInit, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InventoryInput, InventoryItem, InventoryService } from '../../core/services/inventory.service';

interface FoodForm {
  name: string;
  quantity: string;
  unit: string;
  expiry_date: string;
}

interface ExpiryState {
  label: string;
  tone: 'muted' | 'danger' | 'warning' | 'fresh';
}

type FoodField = 'name' | 'quantity' | 'unit' | 'expiry_date';
type SortOrder = 'newest' | 'name';
interface Feedback { message: string; tone: 'error' | 'success'; }

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './inventory.component.html',
})
export class InventoryComponent implements OnInit {
  @ViewChild('foodNameInput') private foodNameInput?: ElementRef<HTMLInputElement>;
  @ViewChild('quickQuantityInput') private quickQuantityInput?: ElementRef<HTMLInputElement>;
  @Output() itemsChange = new EventEmitter<InventoryItem[]>();
  @Output() feedback = new EventEmitter<Feedback>();

  items: InventoryItem[] = [];
  loading = true;
  query = '';
  sortOrder: SortOrder = 'newest';
  dialogOpen = false;
  editing: InventoryItem | null = null;
  saving = false;
  quantityDialogItem: InventoryItem | null = null;
  quickQuantity = '';
  quickQuantityError = '';
  savingQuantity = false;
  form: FoodForm = this.blankForm();
  fieldErrors: Partial<Record<FoodField, string>> = {};
  formError = '';
  readonly units = ['món', 'g', 'kg', 'ml', 'lít', 'hộp', 'gói', 'chai', 'quả', 'bó'];

  constructor(
    private readonly inventory: InventoryService,
    private readonly changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    void this.loadItems();
  }

  get visibleItems(): InventoryItem[] {
    const query = this.query.trim().toLocaleLowerCase('vi');
    return this.items
      .filter((item) => item.name.toLocaleLowerCase('vi').includes(query))
      .sort((left, right) => this.sortOrder === 'name'
        ? left.name.localeCompare(right.name, 'vi')
        : new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
  }

  get urgentCount(): number {
    return this.items.filter((item) => {
      const { tone } = this.expiryState(item.expiry_date);
      return tone === 'warning' || tone === 'danger';
    }).length;
  }

  openCreate(): void {
    if (this.saving) return;
    this.editing = null;
    this.form = this.blankForm();
    this.clearFormErrors();
    this.dialogOpen = true;
    this.focusFoodName();
  }

  openEdit(item: InventoryItem): void {
    if (this.saving) return;
    this.editing = item;
    this.form = {
      name: item.name,
      quantity: String(item.quantity),
      unit: item.unit,
      expiry_date: item.expiry_date || '',
    };
    this.clearFormErrors();
    this.dialogOpen = true;
    this.focusFoodName();
  }

  duplicateItem(): void {
    if (!this.editing || this.saving) return;
    const { name, unit } = this.editing;
    this.editing = null;
    this.form = { name, quantity: '1', unit, expiry_date: '' };
    this.clearFormErrors();
    this.focusFoodName();
  }

  openQuantityDialog(item: InventoryItem): void {
    if (this.saving || this.savingQuantity) return;
    this.quantityDialogItem = item;
    this.quickQuantity = String(item.quantity);
    this.quickQuantityError = '';
    requestAnimationFrame(() => this.quickQuantityInput?.nativeElement.select());
  }

  closeQuantityDialog(): void {
    if (!this.savingQuantity) this.quantityDialogItem = null;
  }

  closeDialog(): void {
    if (!this.saving) this.dialogOpen = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.quantityDialogItem) this.closeQuantityDialog();
    else this.closeDialog();
  }

  focusFormControl(event: PointerEvent): void {
    const control = event.target;
    if (control instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(control.tagName)) {
      control.focus({ preventScroll: true });
    }
  }

  selectInputText(event: FocusEvent): void {
    const input = event.target;
    if (input instanceof HTMLInputElement) window.setTimeout(() => input.select(), 0);
  }

  clearFieldError(field: FoodField): void {
    if (this.fieldErrors[field]) {
      const errors = { ...this.fieldErrors };
      delete errors[field];
      this.fieldErrors = errors;
    }
    this.formError = '';
  }

  async saveItem(event: Event): Promise<void> {
    event.preventDefault();
    this.clearFormErrors();

    const name = this.form.name.trim();
    const quantityText = this.form.quantity.trim();
    const quantity = Number(quantityText.replace(',', '.'));
    const unit = this.form.unit.trim();
    const errors: Partial<Record<FoodField, string>> = {};

    if (!name) errors.name = 'Nhập tên thực phẩm.';
    else if (name.length > 120) errors.name = 'Tên thực phẩm không được vượt quá 120 ký tự.';

    const quantityError = this.quantityErrorFor(quantityText, quantity);
    if (quantityError) errors.quantity = quantityError;

    if (!unit) errors.unit = 'Nhập hoặc chọn đơn vị.';
    else if (unit.length > 30) errors.unit = 'Đơn vị không được vượt quá 30 ký tự.';

    if (Object.keys(errors).length > 0) {
      this.fieldErrors = errors;
      this.formError = 'Vui lòng sửa các trường được báo lỗi bên dưới.';
      this.changeDetector.markForCheck();
      const firstInvalid = (['name', 'quantity', 'unit'] as const).find((field) => errors[field]);
      if (firstInvalid) document.querySelector<HTMLInputElement>(`[name="${firstInvalid === 'name' ? 'foodName' : firstInvalid}"]`)?.focus();
      return;
    }

    this.saving = true;
    const payload: InventoryInput = { name, quantity, unit, expiry_date: this.form.expiry_date || null };
    const editing = this.editing;

    try {
      if (editing) await this.inventory.update(editing.id, payload);
      else await this.inventory.create(payload);
      this.dialogOpen = false;
      this.changeDetector.markForCheck();
      if (await this.loadItems()) {
        this.feedback.emit({ message: editing ? 'Đã lưu thay đổi.' : 'Đã thêm thực phẩm vào kho.', tone: 'success' });
      }
    } catch (error) {
      this.formError = this.errorMessage(error);
    } finally {
      this.saving = false;
      this.changeDetector.markForCheck();
    }
  }

  async saveQuickQuantity(event: Event): Promise<void> {
    event.preventDefault();
    const item = this.quantityDialogItem;
    if (!item) return;
    const quantityText = this.quickQuantity.trim();
    const quantity = Number(quantityText.replace(',', '.'));
    const error = this.quantityErrorFor(quantityText, quantity);
    if (error) {
      this.quickQuantityError = error;
      this.changeDetector.markForCheck();
      return;
    }

    this.savingQuantity = true;
    this.quickQuantityError = '';
    try {
      const updated = await this.inventory.update(item.id, {
        name: item.name,
        quantity,
        unit: item.unit,
        expiry_date: item.expiry_date,
      });
      this.items = this.items.map((entry) => entry.id === updated.id ? updated : entry);
      this.itemsChange.emit(this.items);
      this.quantityDialogItem = null;
      this.feedback.emit({ message: `Đã cập nhật số lượng ${item.name}.`, tone: 'success' });
    } catch (error) {
      this.quickQuantityError = this.errorMessage(error);
    } finally {
      this.savingQuantity = false;
      this.changeDetector.markForCheck();
    }
  }

  async deleteItem(item: InventoryItem): Promise<void> {
    if (!window.confirm(`Xóa “${item.name}” khỏi kho?`)) return;
    try {
      await this.inventory.remove(item.id);
      this.items = this.items.filter((entry) => entry.id !== item.id);
      this.itemsChange.emit(this.items);
      this.feedback.emit({ message: `Đã xóa ${item.name} khỏi kho.`, tone: 'success' });
      this.changeDetector.markForCheck();
    } catch (error) {
      this.feedback.emit({ message: this.errorMessage(error), tone: 'error' });
    }
  }

  expiryState(value: string | null): ExpiryState {
    if (!value) return { label: 'Chưa có ngày', tone: 'muted' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(`${value}T00:00:00`);
    const days = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
    if (days < 0) return { label: 'Đã hết hạn', tone: 'danger' };
    if (days <= 3) return { label: days === 0 ? 'Hết hạn hôm nay' : `Còn ${days} ngày`, tone: 'warning' };
    return { label: `HSD ${expiry.toLocaleDateString('vi-VN')}`, tone: 'fresh' };
  }

  private async loadItems(): Promise<boolean> {
    this.loading = true;
    try {
      this.items = await this.inventory.list();
      this.itemsChange.emit(this.items);
      return true;
    } catch (error) {
      this.feedback.emit({ message: this.errorMessage(error), tone: 'error' });
      return false;
    } finally {
      this.loading = false;
      this.changeDetector.markForCheck();
    }
  }

  private focusFoodName(): void {
    requestAnimationFrame(() => this.foodNameInput?.nativeElement.focus());
  }

  private clearFormErrors(): void {
    this.fieldErrors = {};
    this.formError = '';
  }

  private blankForm(): FoodForm {
    return { name: '', quantity: '1', unit: 'món', expiry_date: '' };
  }

  private quantityErrorFor(quantityText: string, quantity: number): string | null {
    if (!quantityText) return 'Nhập số lượng.';
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(quantityText)) {
      return 'Nhập số không âm, tối đa 2 chữ số thập phân.';
    }
    if (!Number.isFinite(quantity) || quantity > 99999999) {
      return 'Số lượng không được vượt quá 99.999.999.';
    }
    return null;
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string' && error.trim()) return error;
    return 'Đã có lỗi xảy ra. Vui lòng thử lại.';
  }
}
