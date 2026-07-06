import { Component, computed, inject, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { ApiService, Product } from '../services/api.service';

const STANDARD_CATEGORIES = ['Starters', 'Main Course', 'Desserts', 'Beverages', 'Sides'];

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="categories-container">
      <div class="split-view">
        <aside class="category-sidebar">
          <div class="sidebar-header">
            <div>
              <p class="sidebar-eyebrow">Menu structure</p>
              <h3>{{ 'CATALOG.CATEGORY_LABEL' | translate }}</h3>
            </div>
            <button class="btn btn-primary btn-sm" type="button" (click)="toggleAddCategoryForm()">
              {{ showAddCategoryForm() ? ('COMMON.CANCEL' | translate) : 'Add category' }}
            </button>
          </div>

          @if (showAddCategoryForm()) {
            <div class="sidebar-form">
              <label class="form-label">New category name</label>
              <div class="input-row">
                <input
                  type="text"
                  [(ngModel)]="newCategoryName"
                  placeholder="Chef specials"
                  (keyup.enter)="addCategory()" />
                <button class="btn btn-primary" type="button" (click)="addCategory()" [disabled]="!newCategoryName.trim()">
                  {{ 'COMMON.OK' | translate }}
                </button>
              </div>
            </div>
          }

          <div class="sidebar-list">
            @for (category of mainCategories(); track category) {
              <button
                class="category-item"
                [class.active]="selectedCategory() === category"
                type="button"
                (click)="selectCategory(category)">
                <div class="category-item-copy">
                  <span>{{ getCategoryLabel(category) }}</span>
                  @if (isCustomCategory(category)) {
                    <small class="category-type">Custom</small>
                  } @else {
                    <small class="category-type">Standard</small>
                  }
                </div>
                <span class="count">{{ getSubcategoryCount(category) }}</span>
              </button>
            }
          </div>
        </aside>

        <section class="subcategory-main">
          @if (selectedCategory(); as category) {
            <div class="main-header">
              <div>
                <p class="sidebar-eyebrow">Category workspace</p>
                <h2>{{ getCategoryLabel(category) }}</h2>
                <p class="header-note">
                  Edit the top-level menu category, then manage the subcategories staff use while creating products.
                </p>
              </div>

              <div class="header-actions">
                @if (isCustomCategory(category)) {
                  <button class="btn btn-secondary btn-sm" type="button" (click)="openRenameCategory(category)">
                    Rename category
                  </button>
                  <button class="btn btn-secondary btn-sm" type="button" (click)="deleteCategory(category)">
                    Delete category
                  </button>
                }
                <button class="btn btn-primary btn-sm" type="button" (click)="showAddForm.set(true)">
                  {{ 'PRODUCTS.ADD_SUBCATEGORY' | translate }}
                </button>
              </div>
            </div>

            <div class="action-strip">
              <div class="action-strip-copy">
                <span class="summary-label">Category actions</span>
                @if (isCustomCategory(category)) {
                  <strong>Edit or remove {{ getCategoryLabel(category) }}</strong>
                  <small>This is a custom category. You can rename it or remove it when no products still use it.</small>
                } @else {
                  <strong>{{ getCategoryLabel(category) }} is a standard category</strong>
                  <small>Built-in categories stay protected. You can still add, edit, or delete the subcategories inside them.</small>
                }
              </div>

              <div class="action-strip-buttons">
                @if (isCustomCategory(category)) {
                  <button class="btn btn-secondary btn-md" type="button" (click)="openRenameCategory(category)">
                    Rename top-level category
                  </button>
                  <button class="btn btn-danger btn-md" type="button" (click)="deleteCategory(category)">
                    Delete top-level category
                  </button>
                }
                <button class="btn btn-primary btn-md" type="button" (click)="showAddForm.set(true)">
                  Add subcategory
                </button>
              </div>
            </div>

            @if (showRenameCategoryForm()) {
              <div class="form-card">
                <div class="form-group">
                  <label class="form-label">Rename category</label>
                  <div class="input-row">
                    <input
                      type="text"
                      [(ngModel)]="renameCategoryName"
                      [placeholder]="getCategoryLabel(category)"
                      (keyup.enter)="saveCategoryRename(category)" />
                    <button class="btn btn-secondary" type="button" (click)="cancelCategoryRename()">
                      {{ 'COMMON.CANCEL' | translate }}
                    </button>
                    <button class="btn btn-primary" type="button" (click)="saveCategoryRename(category)" [disabled]="!renameCategoryName.trim()">
                      Save
                    </button>
                  </div>
                </div>
              </div>
            }

            @if (showAddForm()) {
              <div class="form-card">
                <div class="form-group">
                  <label class="form-label">{{ 'PRODUCTS.SUBCATEGORY_NAME' | translate }}</label>
                  <div class="input-row">
                    <input
                      type="text"
                      [(ngModel)]="newSubcategoryName"
                      [placeholder]="'PRODUCTS.ENTER_SUBCATEGORY_NAME' | translate"
                      (keyup.enter)="addSubcategory()" />
                    <button class="btn btn-secondary" type="button" (click)="showAddForm.set(false)">
                      {{ 'COMMON.CANCEL' | translate }}
                    </button>
                    <button class="btn btn-primary" type="button" (click)="addSubcategory()" [disabled]="!newSubcategoryName.trim()">
                      {{ 'COMMON.OK' | translate }}
                    </button>
                  </div>
                </div>
              </div>
            }

            <div class="category-summary-grid">
              <article class="summary-card">
                <span class="summary-label">Subcategories</span>
                <strong>{{ currentSubcategories().length }}</strong>
                <small>Used for staff product grouping</small>
              </article>
              <article class="summary-card">
                <span class="summary-label">Products in category</span>
                <strong>{{ productCountForCategory(category) }}</strong>
                <small>Live products currently using this category</small>
              </article>
            </div>

            <div class="subcategories-grid">
              @for (subcat of currentSubcategories(); track subcat) {
                <div class="subcat-card">
                  @if (editingSubcategory() === subcat) {
                    <div class="edit-mode">
                      <input
                        type="text"
                        [(ngModel)]="editName"
                        class="edit-input"
                        (keyup.enter)="saveEdit(subcat)"
                        (keyup.escape)="editingSubcategory.set(null)" />
                      <div class="edit-actions">
                        <button class="icon-btn success" type="button" (click)="saveEdit(subcat)">
                          Save
                        </button>
                        <button class="icon-btn" type="button" (click)="editingSubcategory.set(null)">
                          {{ 'COMMON.CANCEL' | translate }}
                        </button>
                      </div>
                    </div>
                  } @else {
                    <div class="view-mode">
                      <div class="subcat-copy">
                        <span class="subcat-name">{{ subcat }}</span>
                        <small>{{ productCountForSubcategory(category, subcat) }} products</small>
                      </div>
                      <div class="subcat-actions">
                        <button class="icon-btn" type="button" (click)="startEdit(subcat)">
                          {{ 'COMMON.EDIT' | translate }}
                        </button>
                        <button class="icon-btn danger" type="button" (click)="deleteSubcategory(subcat)">
                          {{ 'COMMON.DELETE' | translate }}
                        </button>
                      </div>
                    </div>
                  }
                </div>
              } @empty {
                <div class="empty-subcategories">
                  <h3>No subcategories yet</h3>
                  <p>Keep the top-level category, or add subcategories to guide product setup.</p>
                </div>
              }
            </div>
          } @else {
            <div class="select-prompt">
              <div class="prompt-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <p>{{ 'PRODUCTS.SELECT_CATEGORY_TO_MANAGE' | translate }}</p>
            </div>
          }
        </section>
      </div>

      @if (success()) { <div class="toast success">{{ success() }}</div> }
      @if (error()) { <div class="toast error">{{ error() }}</div> }
      @if (loading()) { <div class="loading-overlay"><div class="spinner"></div></div> }
    </div>
  `,
  styles: [`
    .categories-container {
      height: calc(100vh - 250px);
      min-height: 500px;
      position: relative;
    }

    .split-view {
      display: grid;
      grid-template-columns: 320px 1fr;
      height: 100%;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .category-sidebar {
      display: flex;
      flex-direction: column;
      border-right: 1px solid var(--color-border);
      background: var(--color-bg);
    }

    .sidebar-header,
    .sidebar-form {
      padding: var(--space-4);
      border-bottom: 1px solid var(--color-border);
      background: var(--color-surface);
    }

    .sidebar-header {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .sidebar-eyebrow,
    .summary-label,
    .form-label,
    .category-type {
      margin: 0;
      font-size: 0.78rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-text-muted);
    }

    .sidebar-header h3,
    .main-header h2 {
      margin: 0;
    }

    .sidebar-list {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-2);
    }

    .category-item {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      margin-bottom: 0.35rem;
      padding: var(--space-3) var(--space-4);
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      background: transparent;
      color: var(--color-text);
      text-align: left;
      cursor: pointer;
      transition: border-color 0.15s ease, background 0.15s ease;
    }

    .category-item:hover {
      background: var(--color-surface);
      border-color: var(--color-border);
    }

    .category-item.active {
      background: color-mix(in srgb, var(--color-primary) 12%, white);
      border-color: color-mix(in srgb, var(--color-primary) 30%, var(--color-border));
    }

    .category-item-copy {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      min-width: 0;
    }

    .count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 2rem;
      height: 2rem;
      padding: 0 0.65rem;
      border-radius: 999px;
      background: var(--color-surface);
      color: var(--color-text-muted);
      font-size: 0.82rem;
      font-weight: 700;
    }

    .subcategory-main {
      overflow-y: auto;
      padding: var(--space-6);
      background: var(--color-surface);
    }

            .main-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-4);
      margin-bottom: var(--space-5);
    }

    .action-strip {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      margin-bottom: var(--space-4);
      padding: var(--space-4);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: color-mix(in srgb, var(--color-primary) 4%, white);
    }

    .action-strip-copy {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      max-width: 44rem;
    }

    .action-strip-copy strong {
      font-size: 1rem;
    }

    .action-strip-copy small {
      color: var(--color-text-muted);
      line-height: 1.4;
    }

    .action-strip-buttons {
      display: flex;
      gap: var(--space-2);
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .header-note {
      margin: 0.45rem 0 0;
      color: var(--color-text-muted);
      max-width: 52rem;
    }

    .header-actions {
      display: flex;
      gap: var(--space-2);
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .form-card {
      margin-bottom: var(--space-4);
      padding: var(--space-4);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-bg);
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .input-row {
      display: flex;
      gap: var(--space-2);
      flex-wrap: wrap;
    }

    .input-row input {
      flex: 1;
      min-width: 16rem;
      padding: 0.85rem 1rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: white;
    }

    .category-summary-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-3);
      margin-bottom: var(--space-4);
    }

    .summary-card {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      padding: var(--space-4);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-bg);
    }

    .summary-card strong {
      font-size: 1.45rem;
    }

    .summary-card small {
      color: var(--color-text-muted);
    }

    .btn-danger {
      background: var(--color-error);
      border-color: var(--color-error);
      color: white;
    }

    .btn-danger:hover {
      filter: brightness(0.96);
    }

    .subcategories-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: var(--space-4);
    }

    .subcat-card,
    .empty-subcategories {
      padding: var(--space-4);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-bg);
    }

    .view-mode,
    .edit-mode {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
    }

    .subcat-copy {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .subcat-name {
      font-weight: 700;
    }

    .subcat-copy small {
      color: var(--color-text-muted);
    }

    .subcat-actions,
    .edit-actions {
      display: flex;
      gap: var(--space-2);
      flex-wrap: wrap;
    }

    .edit-input {
      flex: 1;
      min-width: 10rem;
      padding: 0.75rem 0.9rem;
      border: 1px solid var(--color-primary);
      border-radius: var(--radius-md);
    }

    .select-prompt {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      color: var(--color-text-muted);
    }

    .prompt-icon {
      margin-bottom: var(--space-4);
      opacity: 0.35;
    }

    .toast {
      position: fixed;
      right: 2rem;
      bottom: 2rem;
      z-index: 1000;
      padding: 1rem 1.25rem;
      border-radius: var(--radius-md);
      color: white;
      box-shadow: var(--shadow-lg);
    }

    .toast.success { background: var(--color-success); }
    .toast.error { background: var(--color-error); }

    .loading-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.72);
      z-index: 10;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--color-border);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 960px) {
      .split-view {
        grid-template-columns: 1fr;
      }

      .category-sidebar {
        border-right: none;
        border-bottom: 1px solid var(--color-border);
      }

      .main-header {
        flex-direction: column;
      }

      .action-strip {
        flex-direction: column;
        align-items: stretch;
      }

      .action-strip-buttons {
        justify-content: flex-start;
      }

      .category-summary-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class CategoriesComponent implements OnInit {
  private api = inject(ApiService);
  private translate = inject(TranslateService);

  categoriesChanged = output<void>();

  products = signal<Product[]>([]);
  categoriesMap = signal<Record<string, string[]>>({});
  selectedCategory = signal<string | null>(null);
  loading = signal(false);
  error = signal('');
  success = signal('');

  showAddForm = signal(false);
  showAddCategoryForm = signal(false);
  showRenameCategoryForm = signal(false);
  newSubcategoryName = '';
  newCategoryName = '';
  renameCategoryName = '';
  editingSubcategory = signal<string | null>(null);
  editName = '';

  mainCategories = computed(() => Object.keys(this.categoriesMap()).sort((a, b) => a.localeCompare(b)));
  currentSubcategories = computed(() => {
    const cat = this.selectedCategory();
    if (!cat) return [];
    return (this.categoriesMap()[cat] || []).filter(Boolean).sort((a, b) => a.localeCompare(b));
  });

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    forkJoin({
      products: this.api.getProducts(),
      categories: this.api.getCatalogCategories(),
    }).subscribe({
      next: ({ products, categories }) => {
        this.products.set(products);
        this.categoriesMap.set(categories);

        const selected = this.selectedCategory();
        if (selected && categories[selected]) {
          this.selectedCategory.set(selected);
        } else {
          this.selectedCategory.set(Object.keys(categories)[0] || null);
        }

        this.loading.set(false);
      },
      error: () => {
        this.error.set(this.translate.instant('PRODUCTS.FAILED_TO_LOAD'));
        this.loading.set(false);
      },
    });
  }

  private applyCategoriesMap(map: Record<string, string[]>) {
    this.categoriesMap.set(map);
    this.categoriesChanged.emit();
  }

  private resolveCategoryKey(map: Record<string, string[]>, desired: string): string | null {
    const normalizedDesired = desired.trim().toLowerCase();
    const exact = Object.keys(map).find((key) => key === desired);
    if (exact) return exact;
    return (
      Object.keys(map).find((key) => key.trim().toLowerCase() === normalizedDesired) ?? null
    );
  }

  private showSuccess(message: string) {
    this.success.set(message);
    setTimeout(() => this.success.set(''), 3000);
  }

  private showError(message: string) {
    this.error.set(message);
    setTimeout(() => this.error.set(''), 4000);
  }

  private apiErrorMessage(err: { error?: { detail?: string } }, fallback: string): string {
    const detail = err?.error?.detail;
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }
    return fallback;
  }

  getCategoryLabel(category: string): string {
    const keyMap: Record<string, string> = {
      Starters: 'PRODUCTS.CATEGORY_STARTERS',
      'Main Course': 'PRODUCTS.CATEGORY_MAIN_COURSE',
      Desserts: 'PRODUCTS.CATEGORY_DESSERTS',
      Beverages: 'PRODUCTS.CATEGORY_BEVERAGES',
      Sides: 'PRODUCTS.CATEGORY_SIDES',
    };
    const key = keyMap[category];
    return key ? this.translate.instant(key) : category;
  }

  getSubcategoryCount(category: string): number {
    return (this.categoriesMap()[category] || []).length;
  }

  productCountForCategory(category: string): number {
    return this.products().filter((product) => product.category === category).length;
  }

  productCountForSubcategory(category: string, subcategory: string): number {
    return this.products().filter(
      (product) => product.category === category && product.subcategory === subcategory,
    ).length;
  }

  isCustomCategory(category: string): boolean {
    return !STANDARD_CATEGORIES.includes(category);
  }

  selectCategory(category: string) {
    this.selectedCategory.set(category);
    this.showAddForm.set(false);
    this.showRenameCategoryForm.set(false);
    this.editingSubcategory.set(null);
  }

  toggleAddCategoryForm() {
    this.showAddCategoryForm.update((value) => !value);
    if (!this.showAddCategoryForm()) {
      this.newCategoryName = '';
    }
  }

  addCategory() {
    const name = this.newCategoryName.trim();
    if (!name) return;

    this.loading.set(true);
    this.api.createTenantCategory(name).subscribe({
      next: (map) => {
        this.applyCategoriesMap(map);
        this.selectedCategory.set(this.resolveCategoryKey(map, name) || name);
        this.newCategoryName = '';
        this.showAddCategoryForm.set(false);
        this.loading.set(false);
        this.showSuccess(`Category "${name}" created.`);
      },
      error: (err) => {
        this.loading.set(false);
        this.showError(this.apiErrorMessage(err, 'Unable to create category.'));
      },
    });
  }

  openRenameCategory(category: string) {
    this.renameCategoryName = category;
    this.showRenameCategoryForm.set(true);
  }

  cancelCategoryRename() {
    this.showRenameCategoryForm.set(false);
    this.renameCategoryName = '';
  }

  saveCategoryRename(oldCategory: string) {
    const newCategory = this.renameCategoryName.trim();
    if (!newCategory || newCategory === oldCategory) {
      this.cancelCategoryRename();
      return;
    }

    const productsToUpdate = this.products().filter((product) => product.category === oldCategory);
    this.loading.set(true);

    const renameRequest = this.api.renameTenantCategory(oldCategory, newCategory);
    if (productsToUpdate.length === 0) {
      renameRequest.subscribe({
        next: (map) => {
          this.applyCategoriesMap(map);
          this.selectedCategory.set(this.resolveCategoryKey(map, newCategory) || newCategory);
          this.loading.set(false);
          this.cancelCategoryRename();
          this.showSuccess(`Category renamed to "${newCategory}".`);
        },
        error: (err) => {
          this.loading.set(false);
          this.showError(this.apiErrorMessage(err, 'Unable to rename category.'));
        },
      });
      return;
    }

    forkJoin([
      ...productsToUpdate.map((product) => this.api.updateProduct(product.id!, { category: newCategory })),
      renameRequest,
    ]).subscribe({
      next: (results) => {
        const map = results[results.length - 1] as Record<string, string[]>;
        this.applyCategoriesMap(map);
        this.products.update((list) =>
          list.map((product) =>
            product.category === oldCategory ? { ...product, category: newCategory } : product,
          ),
        );
        this.selectedCategory.set(this.resolveCategoryKey(map, newCategory) || newCategory);
        this.loading.set(false);
        this.cancelCategoryRename();
        this.showSuccess(`Category renamed to "${newCategory}".`);
      },
      error: (err) => {
        this.loading.set(false);
        this.showError(this.apiErrorMessage(err, 'Unable to rename category.'));
      },
    });
  }

  deleteCategory(category: string) {
    const productCount = this.productCountForCategory(category);
    if (productCount > 0) {
      this.showError(`Move or reassign ${productCount} product(s) before deleting this category.`);
      return;
    }

    if (!globalThis.confirm?.(`Delete category "${this.getCategoryLabel(category)}"?`)) {
      return;
    }

    this.loading.set(true);
    this.api.deleteTenantCategory(category).subscribe({
      next: (map) => {
        this.applyCategoriesMap(map);
        const nextCategory = Object.keys(map)[0] || null;
        this.selectedCategory.set(nextCategory);
        this.loading.set(false);
        this.showSuccess(`Category "${this.getCategoryLabel(category)}" deleted.`);
      },
      error: (err) => {
        this.loading.set(false);
        this.showError(this.apiErrorMessage(err, 'Unable to delete category.'));
      },
    });
  }

  addSubcategory() {
    const name = this.newSubcategoryName.trim();
    const category = this.selectedCategory();
    if (!name || !category) return;

    if (this.currentSubcategories().includes(name)) {
      this.showError(this.translate.instant('PRODUCTS.SUBCATEGORY_ALREADY_EXISTS'));
      return;
    }

    this.loading.set(true);
    this.api.createTenantSubcategory(category, name).subscribe({
      next: (map) => {
        this.applyCategoriesMap(map);
        this.newSubcategoryName = '';
        this.showAddForm.set(false);
        this.loading.set(false);
        this.showSuccess(this.translate.instant('PRODUCTS.SUBCATEGORY_ADDED'));
      },
      error: (err) => {
        this.loading.set(false);
        this.showError(this.apiErrorMessage(err, 'Unable to add subcategory.'));
      },
    });
  }

  startEdit(subcat: string) {
    this.editingSubcategory.set(subcat);
    this.editName = subcat;
  }

  saveEdit(oldName: string) {
    const newName = this.editName.trim();
    const category = this.selectedCategory();
    if (!newName || !category || newName === oldName) {
      this.editingSubcategory.set(null);
      return;
    }

    const productsToUpdate = this.products().filter(
      (product) => product.category === category && product.subcategory === oldName,
    );
    this.loading.set(true);

    const renameRequest = this.api.renameTenantSubcategory(category, oldName, newName);
    if (productsToUpdate.length === 0) {
      renameRequest.subscribe({
        next: (map) => {
          this.applyCategoriesMap(map);
          this.loading.set(false);
          this.editingSubcategory.set(null);
          this.showSuccess(this.translate.instant('PRODUCTS.SUBCATEGORY_UPDATED'));
        },
        error: (err) => {
          this.loading.set(false);
          this.showError(this.apiErrorMessage(err, 'Unable to rename subcategory.'));
        },
      });
      return;
    }

    forkJoin([
      ...productsToUpdate.map((product) => this.api.updateProduct(product.id!, { subcategory: newName })),
      renameRequest,
    ]).subscribe({
      next: (results) => {
        const map = results[results.length - 1] as Record<string, string[]>;
        this.applyCategoriesMap(map);
        this.products.update((list) =>
          list.map((product) =>
            product.category === category && product.subcategory === oldName
              ? { ...product, subcategory: newName }
              : product,
          ),
        );
        this.loading.set(false);
        this.editingSubcategory.set(null);
        this.showSuccess(this.translate.instant('PRODUCTS.SUBCATEGORY_UPDATED'));
      },
      error: (err) => {
        this.loading.set(false);
        this.showError(this.apiErrorMessage(err, 'Unable to rename subcategory.'));
      },
    });
  }

  deleteSubcategory(name: string) {
    const category = this.selectedCategory();
    if (!category) return;

    if (!globalThis.confirm?.(this.translate.instant('PRODUCTS.DELETE_SUBCATEGORY_CONFIRM', { name }))) {
      return;
    }

    const productsToUpdate = this.products().filter(
      (product) => product.category === category && product.subcategory === name,
    );
    this.loading.set(true);

    const deleteRequest = this.api.deleteTenantSubcategory(category, name);
    if (productsToUpdate.length === 0) {
      deleteRequest.subscribe({
        next: (map) => {
          this.applyCategoriesMap(map);
          this.loading.set(false);
          this.showSuccess(this.translate.instant('PRODUCTS.SUBCATEGORY_DELETED'));
        },
        error: (err) => {
          this.loading.set(false);
          this.showError(this.apiErrorMessage(err, 'Unable to delete subcategory.'));
        },
      });
      return;
    }

    forkJoin([
      ...productsToUpdate.map((product) => this.api.updateProduct(product.id!, { subcategory: null as any })),
      deleteRequest,
    ]).subscribe({
      next: (results) => {
        const map = results[results.length - 1] as Record<string, string[]>;
        this.applyCategoriesMap(map);
        this.products.update((list) =>
          list.map((product) =>
            product.category === category && product.subcategory === name
              ? { ...product, subcategory: undefined }
              : product,
          ),
        );
        this.loading.set(false);
        this.showSuccess(this.translate.instant('PRODUCTS.SUBCATEGORY_DELETED'));
      },
      error: (err) => {
        this.loading.set(false);
        this.showError(this.apiErrorMessage(err, 'Unable to delete subcategory.'));
      },
    });
  }
}
