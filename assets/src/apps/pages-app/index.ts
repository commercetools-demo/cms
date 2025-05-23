import { LitElement, css, html } from 'lit';
import { connect, watch } from 'lit-redux-watch';
import { customElement, property, state } from 'lit/decorators.js';
import { store } from '../../store';
import { selectComponent, setSidebarVisibility } from '../../store/editor.slice';
import { fetchPages, syncPagesWithApi, updatePage, saveCurrentPage } from '../../store/pages.slice';
import { Page } from '../../types';

import '../../apps/shared/components/property-editor';
import './components/component-library';
import './components/layout-grid';
import './components/page-form';
import './components/page-list';
import './components/cms-sidebar';

// Import atomic components
import '../../components/atoms/back-button';
import '../../components/atoms/button';
import '../../components/atoms/error-message';
import '../../components/atoms/loading-spinner';
import '../../components/molecules/save-bar';

@customElement('pages-app')
export class PagesApp extends connect(store)(LitElement) {
  @property({ type: String })
  baseURL: string = '';

  @property({ type: String })
  locale: string = '';

  @property({ type: Array })
  availableLocales: string[] = [];

  @property({ type: String })
  businessUnitKey: string = '';

  @property({ type: Boolean })
  headerInWrapper: boolean = false;

  @watch('pages.pages')
  pages: Page[] = [];

  @watch('pages.currentPage')
  currentPage: Page | null = null;

  @watch('pages.loading')
  loading = false;

  @watch('pages.error')
  error: string | null = null;

  @watch('pages.unsavedChanges')
  unsavedChanges = false;

  @watch('editor.selectedComponentId')
  selectedComponentId: string | null = null;

  @watch('editor.showSidebar')
  showSidebar = false;

  @state()
  private view: 'list' | 'editor' | 'new' = 'list';

  @state()
  private _activeComponentType: string | null = null;

  // Track the interval ID for auto-refresh
  private _refreshInterval: number | null = null;

  // Auto-refresh interval in milliseconds (5 minutes)
  private _refreshIntervalTime = 5 * 60 * 1000;

  static styles = css`
    :host {
      display: var(--pages-app__host__display, block);
      height: var(--pages-app__host__height, 100%);
      font-family: var(--pages-app__host__font-family, system-ui, sans-serif);
    }

    .cms-container {
      display: var(--pages-app__cms-container__display, flex);
      flex-direction: var(--pages-app__cms-container__flex-direction, column);
      height: var(--pages-app__cms-container__height, 100%);
    }

    .cms-main {
      flex: var(--pages-app__cms-main__flex, 1);
      display: var(--pages-app__cms-main__display, flex);
      overflow: var(--pages-app__cms-main__overflow, hidden);
    }

    .cms-content {
      flex: var(--pages-app__cms-content__flex, 1);
      overflow-y: var(--pages-app__cms-content__overflow-y, auto);
      padding: var(--pages-app__cms-content__padding, 20px);
      transition: var(--pages-app__cms-content__transition, all 0.3s);
    }

    .cms-content.with-sidebar {
      width: var(--pages-app__cms-content-with-sidebar__width, calc(100% - 350px));
    }

    .cms-editor-actions {
      display: var(--pages-app__cms-editor-actions__display, flex);
      align-items: var(--pages-app__cms-editor-actions__align-items, center);
      justify-content: var(--pages-app__cms-editor-actions__justify-content, space-between);
      margin-bottom: var(--pages-app__cms-editor-actions__margin-bottom, 20px);
    }

    .cms-editor-buttons {
      display: var(--pages-app__cms-editor-buttons__display, flex);
      gap: var(--pages-app__cms-editor-buttons__gap, 10px);
      align-items: var(--pages-app__cms-editor-buttons__align-items, center);
    }

    .cms-back {
      display: var(--pages-app__cms-back__display, inline-flex);
      align-items: var(--pages-app__cms-back__align-items, center);
      gap: var(--pages-app__cms-back__gap, 5px);
      color: var(--pages-app__cms-back__color, #3498db);
      cursor: var(--pages-app__cms-back__cursor, pointer);
      font-size: var(--pages-app__cms-back__font-size, 14px);
      text-decoration: var(--pages-app__cms-back__text-decoration, none);
    }

    .icon {
      font-size: var(--pages-app__icon__font-size, 16px);
    }
  `;

  connectedCallback() {
    super.connectedCallback();

    // First load pages from session storage for immediate display
    store.dispatch(
      fetchPages({
        baseUrl: `${this.baseURL}/${this.businessUnitKey}`,
        businessUnitKey: this.businessUnitKey,
      })
    );

    // Then fetch pages from API in the background and sync with session storage
    setTimeout(() => {
      this._syncPagesWithApi();
    }, 100); // Small delay to ensure UI renders first

    // Set up auto-refresh for pages
    this._refreshInterval = window.setInterval(() => {
      // Only sync if there are no unsaved changes
      if (!this.unsavedChanges) {
        this._syncPagesWithApi();
      }
    }, this._refreshIntervalTime);
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    // Clear the auto-refresh interval when the component is disconnected
    if (this._refreshInterval !== null) {
      window.clearInterval(this._refreshInterval);
      this._refreshInterval = null;
    }
  }

  // Helper method to sync pages with API
  private _syncPagesWithApi() {
    store.dispatch(
      syncPagesWithApi({
        baseUrl: `${this.baseURL}/${this.businessUnitKey}`,
      })
    );
  }

  updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

    // Notify wrapper when view changes
    if (changedProperties.has('view') && this.headerInWrapper) {
      this.dispatchEvent(
        new CustomEvent('view-changed', {
          detail: { view: this.view },
          bubbles: true,
          composed: true,
        })
      );
    }

    // Notify wrapper when sidebar visibility changes
    if (changedProperties.has('showSidebar') && this.headerInWrapper) {
      this.dispatchEvent(
        new CustomEvent('sidebar-toggled', {
          detail: { visible: this.showSidebar },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  render() {
    return html`
      <div class="cms-container">
        <div class="cms-main">
          <div
            class="cms-content ${this.showSidebar && this.view === 'editor' ? 'with-sidebar' : ''}"
          >
            ${this.error ? html`<ui-error-message message="${this.error}"></ui-error-message>` : ''}
            ${this.loading && !this.pages.length
              ? html`
                  <ui-loading-spinner
                    size="large"
                    label="Loading..."
                    centered
                  ></ui-loading-spinner>
                `
              : this._renderCurrentView()}
          </div>

          ${this.view === 'editor'
            ? html`
                <cms-sidebar
                  .currentPage="${this.currentPage}"
                  .selectedComponentId="${this.selectedComponentId}"
                  .showSidebar="${this.showSidebar}"
                  .baseURL="${this.baseURL}"
                  .businessUnitKey="${this.businessUnitKey}"
                  @component-updated="${this._handleComponentUpdated}"
                  @page-updated="${this._handlePageUpdated}"
                  @close-sidebar="${this._handleCloseSidebar}"
                  @component-drag-start="${this._handleComponentDragStart}"
                ></cms-sidebar>
              `
            : ''}
        </div>

        <ui-save-bar .visible="${this.unsavedChanges}">
          <span slot="message">You have unsaved changes</span>
          <div slot="actions">
            <ui-button variant="outline" @click="${this._handleDiscardChanges}">Discard</ui-button>
            <ui-button variant="success" @click="${this._handleSaveChanges}"
              >Save Changes</ui-button
            >
          </div>
        </ui-save-bar>
      </div>
    `;
  }

  private _renderCurrentView() {
    switch (this.view) {
      case 'list':
        return html`
          <cms-page-list
            .pages="${this.pages}"
            .selectedPageKey="${this.currentPage?.key || null}"
            .baseURL="${this.baseURL}"
            .businessUnitKey="${this.businessUnitKey}"
            @create-page="${() => this.setView('new')}"
            @select-page="${() => this.setView('editor')}"
          ></cms-page-list>
        `;

      case 'editor':
        if (!this.currentPage) {
          return html`<div>No page selected</div>`;
        }

        return html`
          <div class="cms-editor-actions">
            <ui-back-button @click="${() => this.setView('list')}"></ui-back-button>
            <div class="cms-editor-buttons">
              <ui-button
                variant="secondary"
                @click="${this._openComponentLibrary}"
                title="Component Library"
              >
                <span class="icon">📦</span> Components
              </ui-button>
              <ui-button variant="icon" @click="${this._openPageSettings}" title="Page Settings"
                >⚙️</ui-button
              >
            </div>
          </div>

          <cms-layout-grid
            .baseURL="${this.baseURL}"
            .businessUnitKey="${this.businessUnitKey}"
            .rows="${this.currentPage.layout.rows}"
            .components="${this.currentPage.components}"
            .availableLocales="${this.availableLocales}"
            .locale="${this.locale}"
            .activeComponentType="${this._activeComponentType}"
            @component-dropped="${this._handleComponentDropped}"
          ></cms-layout-grid>
        `;

      case 'new':
        return html`
          <ui-back-button
            text="Back to Pages"
            @click="${() => this.setView('list')}"
          ></ui-back-button>

          <cms-page-form
            .baseURL="${this.baseURL}"
            .businessUnitKey="${this.businessUnitKey}"
            .locale="${this.locale}"
            @page-created="${() => this.setView('editor')}"
          ></cms-page-form>
        `;

      default:
        return html`<div>Unknown view</div>`;
    }
  }

  setView(view: 'list' | 'editor' | 'new') {
    this.view = view;

    if (view !== 'editor') {
      store.dispatch(selectComponent(null));
    } else {
      store.dispatch(setSidebarVisibility(false));
    }
  }

  toggleSidebar(visible: boolean) {
    store.dispatch(setSidebarVisibility(visible));
  }

  private _handleComponentUpdated() {
    this.requestUpdate();
  }

  private _handlePageUpdated() {
    this.requestUpdate();
  }

  private async _handleSaveChanges() {
    if (this.currentPage) {
      try {
        await store.dispatch(
          updatePage({
            baseUrl: `${this.baseURL}/${this.businessUnitKey}`,
            page: this.currentPage,
          })
        );
      } catch (error) {
        console.error('Failed to save changes:', error);
      }
    }
  }

  private _handleDiscardChanges() {
    // Fetch the latest data from API to replace current state
    this._syncPagesWithApi();

    // Explicitly set unsavedChanges to false in the store
    store.dispatch(saveCurrentPage());
  }

  private _handleComponentDragStart(e: CustomEvent) {
    this._activeComponentType = e.detail.componentType;

    // Add a global dragend listener to reset activeComponentType when drag ends without a drop
    const handleDragEnd = () => {
      this._activeComponentType = null;
      document.removeEventListener('dragend', handleDragEnd);
    };

    document.addEventListener('dragend', handleDragEnd);
  }

  private _handleComponentDropped() {
    this._activeComponentType = null;
  }

  private _openPageSettings() {
    // Ensure we're in editor view
    if (this.view === 'editor' && this.currentPage) {
      // Clear selected component to show page settings in sidebar
      store.dispatch(selectComponent(null));

      // Open the sidebar with the page settings view
      const sidebarEl = this.shadowRoot?.querySelector('cms-sidebar') as any;
      if (sidebarEl) {
        // Use the public method to switch views
        if (typeof sidebarEl.switchView === 'function') {
          sidebarEl.switchView('page-settings');
        }
      }

      // Show the sidebar
      store.dispatch(setSidebarVisibility(true));
    }
  }

  private _handleCloseSidebar() {
    store.dispatch(setSidebarVisibility(false));
  }

  private _openComponentLibrary() {
    // Ensure we're in editor view
    if (this.view === 'editor' && this.currentPage) {
      // Open the sidebar with the component library view
      const sidebarEl = this.shadowRoot?.querySelector('cms-sidebar') as any;
      if (sidebarEl) {
        // Use the public method to switch views
        if (typeof sidebarEl.switchView === 'function') {
          sidebarEl.switchView('component-library');
        }
      }
      // Show the sidebar
      store.dispatch(setSidebarVisibility(true));
    }
  }
}
