import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { connect } from 'lit-redux-watch';
import { store } from '../../../../store';
import '../../../../components/atoms/button';
import './components/general-tab';
import './components/schema-tab';
import './components/renderer-tab';
import { ContentTypeData } from '../../../../types';
import { TabItem } from '../../../../components/molecules/tabs';
import '../../../../components/molecules/tabs';
import '../../../../components/molecules/tabs/tab-content';
import { fetchAvailableDatasourcesThunk } from '../../../../store/content-type.slice';

type TabKey = 'general' | 'schema' | 'renderer';

@customElement('content-type-form')
export default class ContentTypeForm extends connect(store)(LitElement) {
  @property({ type: Object })
  contentType: ContentTypeData = {
    metadata: {
      type: '',
      name: '',
      icon: '',
      defaultProperties: {},
      propertySchema: {},
    },
    deployedUrl: '',
  };

  @property({ type: Boolean })
  isEdit = false;

  @property({ type: String })
  baseURL = '';

  @state()
  private _selectedTab: TabKey = 'general';

  @state()
  private _originalContentType: ContentTypeData | null = null;

  private _tabs: TabItem[] = [
    { key: 'general', label: 'General' },
    { key: 'schema', label: 'Schema' },
    { key: 'renderer', label: 'Renderer' },
  ];

  static styles = css`
    .component-form {
      background-color: var(--content-type-form__component-form__background-color, white);
      border-radius: var(--content-type-form__component-form__border-radius, 4px);
      box-shadow: var(--content-type-form__component-form__box-shadow, 0 2px 10px rgba(0, 0, 0, 0.1));
      padding: var(--content-type-form__component-form__padding, 0); /* Remove padding here, add to content */
      margin: var(--content-type-form__component-form__margin, 20px);
      overflow: var(--content-type-form__component-form__overflow, hidden); /* Contain border radius */
    }

    .tab-header {
      width: var(--content-type-form__tab-header__width, 100%);
    }

    .tab-button {
      padding: var(--content-type-form__tab-button__padding, 10px 20px);
      cursor: var(--content-type-form__tab-button__cursor, pointer);
      border: var(--content-type-form__tab-button__border, none);
      background-color: var(--content-type-form__tab-button__background-color, transparent);
      font-size: var(--content-type-form__tab-button__font-size, 14px);
      font-weight: var(--content-type-form__tab-button__font-weight, 500);
      color: var(--content-type-form__tab-button__color, #555);
      border-bottom: var(--content-type-form__tab-button__border-bottom, 2px solid transparent);
      margin-bottom: var(--content-type-form__tab-button__margin-bottom, -1px); /* Overlap border */
    }

    .tab-button[active] {
      color: var(--content-type-form__tab-button-active__color, #007bff);
      border-bottom-color: var(--content-type-form__tab-button-active__border-bottom-color, #007bff);
      font-weight: var(--content-type-form__tab-button-active__font-weight, 600);
    }

    .tab-content {
      /* Padding moved from .component-form to here */
      /* The specific tab components also have padding, review if needed */
    }

    .form-buttons {
      display: var(--content-type-form__form-buttons__display, flex);
      justify-content: var(--content-type-form__form-buttons__justify-content, flex-end);
      gap: var(--content-type-form__form-buttons__gap, 10px);
      margin: var(--content-type-form__form-buttons__margin, auto 0);
      padding: var(--content-type-form__form-buttons__padding, 0 10px);
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    // Fetch available datasources for schema building
    if (this.baseURL) {
      store.dispatch(
        fetchAvailableDatasourcesThunk({
          baseURL: this.baseURL,
        })
      );
    }
  }

  firstUpdated() {
    // Store the original content type when component is first initialized
    this._originalContentType = JSON.parse(JSON.stringify(this.contentType));
  }

  render() {
    const isButtonEnabled = this._isFormValid() && this._hasContentTypeChanged();

    return html`
      <div class="component-form">
        <div class="tab-header">
          <ui-tabs
            .tabs="${this._tabs}"
            .selectedTab="${this._selectedTab}"
            @tab-change="${this._selectTab}"
            fullWidth
          >
            <div class="form-buttons" slot="actions">
              <ui-button variant="secondary" size="small" @click="${this._cancelForm}">
                Cancel
              </ui-button>
              <ui-button
                variant="primary"
                size="small"
                ?disabled="${!isButtonEnabled}"
                @click="${this._saveContentType}"
              >
                ${this.isEdit ? 'Update' : 'Add'} Content Type
              </ui-button>
            </div></ui-tabs
          >
        </div>

        <div class="tab-content">${this._renderTabContent()}</div>
      </div>
    `;
  }

  private _renderTabContent() {
    return html`
      <ui-tab-content ?active="${this._selectedTab === 'general'}">
        <general-tab
          .type="${this.contentType.metadata.type}"
          .name="${this.contentType.metadata.name}"
          .icon="${this.contentType.metadata.icon}"
          ?isEdit="${this.isEdit}"
          @general-change="${this._handleGeneralChange}"
        ></general-tab>
      </ui-tab-content>

      <ui-tab-content ?active="${this._selectedTab === 'schema'}">
        <schema-tab
          .propertySchema="${this.contentType.metadata.propertySchema}"
          .defaultProperties="${this.contentType.metadata.defaultProperties}"
          @schema-change="${this._handleSchemaChange}"
        ></schema-tab>
      </ui-tab-content>

      <ui-tab-content ?active="${this._selectedTab === 'renderer'}">
        <renderer-tab
          .contentTypeData="${this.contentType}"
          .baseURL="${this.baseURL}"
          @renderer-change="${this._handleRendererChange}"
        ></renderer-tab>
      </ui-tab-content>
    `;
  }

  private _selectTab(e: CustomEvent) {
    const { selectedTab } = e.detail;
    this._selectedTab = selectedTab as TabKey;
  }

  private _handleGeneralChange(e: CustomEvent) {
    const { field, value } = e.detail;
    const updatedMetadata = { ...this.contentType.metadata, [field]: value };
    this._dispatchContentTypeChange({ ...this.contentType, metadata: updatedMetadata });
  }

  private _handleSchemaChange(e: CustomEvent) {
    const { field, value } = e.detail;
    const updatedMetadata = { ...this.contentType.metadata, [field]: value };
    this._dispatchContentTypeChange({ ...this.contentType, metadata: updatedMetadata });
  }

  private _handleRendererChange(e: CustomEvent) {
    const { value } = e.detail;
    this._dispatchContentTypeChange({ ...this.contentType, deployedUrl: value });
  }

  private _dispatchContentTypeChange(contentType: ContentTypeData) {
    // Update internal state first
    this.contentType = contentType;

    // Then dispatch the event
    this.dispatchEvent(
      new CustomEvent('content-type-change', {
        detail: { contentType },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _isFormValid(): boolean {
    // Basic validation: type and name are required
    // We could add JSON validation state here later
    return !!this.contentType.metadata.type && !!this.contentType.metadata.name;
  }

  private _hasContentTypeChanged(): boolean {
    if (!this._originalContentType) return true;

    // Convert both objects to strings for deep comparison
    const currentStr = JSON.stringify(this.contentType);
    const originalStr = JSON.stringify(this._originalContentType);

    return currentStr !== originalStr;
  }

  private _cancelForm() {
    this.dispatchEvent(
      new CustomEvent('cancel', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private _saveContentType() {
    if (!this._isFormValid()) {
      // This check might be redundant if button is disabled, but good practice
      alert('Type and name are required fields');
      return;
    }

    this.dispatchEvent(
      new CustomEvent('save', {
        detail: { contentType: this.contentType },
        bubbles: true,
        composed: true,
      })
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'content-type-form': ContentTypeForm;
  }
}
