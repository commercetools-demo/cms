import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { connect } from 'lit-redux-watch';
import { store } from '../../../store';
import { GridRow, ContentItem } from '../../../types';
import { addRow, removeRow } from '../../../store/pages.slice';
import { selectComponent, setSidebarVisibility } from '../../../store/editor.slice';
import { createContentItem } from '../../../utils/content-type-utility';
import './grid-row';

@customElement('cms-layout-grid')
export class LayoutGrid extends connect(store)(LitElement) {
  @property({ type: String })
  baseURL: string = '';

  @property({ type: String })
  businessUnitKey: string = '';

  @property({ type: Array })
  rows: GridRow[] = [];

  @property({ type: Array })
  components: ContentItem[] = [];

  @property({ type: String })
  locale: string = '';

  @property({ type: Array })
  availableLocales: string[] = [];

  @property({ type: Object })
  selectedCell: { rowId: string; cellId: string } | null = null;

  @property({ type: Object })
  activeComponentType: any | null = null;

  @property({ type: Boolean })
  readonly = false;

  static styles = css`
    .layout-grid {
      margin-bottom: 30px;
    }

    .grid-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }

    .grid-header-left {
      display: flex;
      align-items: center;
    }

    .grid-header h2 {
      font-size: 1.2rem;
      margin: 0;
      margin-right: 15px;
    }

    .grid-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .add-row-btn {
      background-color: #3498db;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 8px 15px;
      font-size: 14px;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .add-row-btn:hover {
      background-color: #2980b9;
    }

    .grid-info {
      margin-bottom: 15px;
      font-size: 14px;
      color: #666;
    }
  `;

  render() {
    return html`
      <div class="layout-grid">
        ${!this.readonly
          ? html`
              <div class="grid-header">
                <div class="grid-header-left">
                  <h2>Layout Grid</h2>
                </div>
                <button class="add-row-btn" @click="${this._handleAddRow}">+ Add Row</button>
              </div>

              <div class="grid-info">
                Drag components from the component library to place them on the grid. Click on a
                component to edit its properties.
              </div>
            `
          : ''}

        <div class="grid-container">
          ${this.rows.map(
            (row, index) => html`
              <cms-grid-row
                .row="${row}"
                .rowIndex="${index}"
                .components="${this.components}"
                .selectedCell="${this.selectedCell}"
                .activeComponentType="${this.activeComponentType}"
                .readonly="${this.readonly}"
                @cell-selected="${this._handleCellSelected}"
                @remove-row="${this._handleRemoveRowEvent}"
                @component-dropped="${this._handleComponentDropped}"
              ></cms-grid-row>
            `
          )}
        </div>
      </div>
    `;
  }
  private _handleAddRow() {
    if (this.readonly) return;
    store.dispatch(addRow());
  }

  private _handleCellSelected(e: CustomEvent) {
    if (this.readonly) return;

    const { rowId, cellId, componentId } = e.detail;
    this.selectedCell = { rowId, cellId };

    // If the cell has a component, select it for editing
    if (componentId) {
      store.dispatch(selectComponent(componentId));
      // Open the sidebar when a component is selected
      store.dispatch(setSidebarVisibility(true));
    } else {
      store.dispatch(selectComponent(null));
    }
  }

  private _handleRemoveRowEvent(e: CustomEvent) {
    if (this.readonly) return;

    const { rowId } = e.detail;
    if (this.rows.length <= 1) return; // Don't remove the last row
    store.dispatch(removeRow(rowId));
  }

  private async _handleComponentDropped(e: CustomEvent) {
    if (this.readonly) return;

    const { rowId, cellId, componentType } = e.detail;

    if (componentType) {
      try {
        // Create a new component from the component type
        const newComponent = await createContentItem({
          baseURL: this.baseURL,
          type: componentType,
          businessUnitKey: this.businessUnitKey,
        });

        // Dispatch action to add the component
        store.dispatch({
          type: 'pages/addComponent',
          payload: {
            component: newComponent,
            rowId,
            cellId,
          },
        });

        // Select the new component
        this.selectedCell = { rowId, cellId };
        store.dispatch(selectComponent(newComponent.id));

        // Open the sidebar when a new component is added
        store.dispatch(setSidebarVisibility(true));

        // Reset the active component type in the parent by dispatching a custom event
        this.dispatchEvent(
          new CustomEvent('component-dropped', {
            bubbles: true,
            composed: true,
          })
        );
      } catch (error) {
        console.error('Failed to create component:', error);
      }
    }
  }
}
