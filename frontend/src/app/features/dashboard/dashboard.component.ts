import { DecimalPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { InventoryItem } from '../../core/services/inventory.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  @Input({ required: true }) items: InventoryItem[] = [];
  @Input() calorieTarget: number | null = null;
  @Input() showProfileReminder = false;
  @Output() inventoryRequested = new EventEmitter<MouseEvent>();
  @Output() profileRequested = new EventEmitter<void>();
  @Output() reminderDeferred = new EventEmitter<void>();

  get urgentCount(): number {
    return this.items.filter((item) => {
      const expiry = new Date(`${item.expiry_date}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const days = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
      return item.expiry_date !== null && days <= 3;
    }).length;
  }

  todayLabel(): string {
    return new Date().toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }
}
