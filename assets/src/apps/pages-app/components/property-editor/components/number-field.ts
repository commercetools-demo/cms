import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '../../../../../components/atoms/labeled-input';

@customElement('cms-number-field')
export class NumberField extends LitElement {
  @property({ type: String })
  label: string = '';

  @property({ type: Number })
  value: number = 0;

  @property({ type: Boolean })
  required: boolean = false;

  @property({ type: String })
  fieldKey: string = '';

  static styles = css`
    :host {
      display: block;
    }
  `;

  render() {
    return html`
      <ui-labeled-input
        label="${this.label}"
        .value="${String(this.value)}"
        ?required="${this.required}"
        type="number"
        @input-change="${this.handleInput}"
      ></ui-labeled-input>
    `;
  }

  private handleInput(e: CustomEvent) {
    this.dispatchEvent(
      new CustomEvent('field-change', {
        detail: {
          key: this.fieldKey,
          value: Number(e.detail.value),
        },
        bubbles: true,
        composed: true,
      })
    );
  }
}
