import { TN3270Field as ITN3270Field, TN3270FieldOptions } from './types';

export const BFA_PROTECTED_MASK = 0x20;
export const BFA_NUMERIC_MASK = 0x10;
export const BFA_MODIFIED_MASK = 0x01;

export const INT_NORMAL_NOT_LPD = 0x00;
export const INT_NORMAL_LPD = 0x04;
export const INT_INTENSIFIED_LPD = 0x08;
export const INT_NON_DISPLAY_NOT_LPD = 0x0c;

export class TN3270Field implements ITN3270Field {
  readonly data: number[] = [];
  private dataBackup: number[] = [];
  public protectedField = false;
  public numeric = false;
  public modified = false;
  public addressStart: number;
  public addressEnd: number;
  public screen: number;

  constructor({ data, ...options }: TN3270FieldOptions) {
    this.data.push(...data);

    Object.assign(this, options);

    const attributesNames = ['protectedField', 'numeric', 'modified'];

    const isNotSettingAttribute = attributesNames.some(
      (attribute) => !Object.keys(options).includes(attribute)
    );

    if (isNotSettingAttribute) this.applyAttributes(this.data[0]);
  }

  public applyAttributes(attributes: number): void {
    if (!attributes) return;

    this.protectedField = (attributes & BFA_PROTECTED_MASK) !== 0;
    this.numeric = (attributes & BFA_NUMERIC_MASK) !== 0;
    this.modified = (attributes & BFA_MODIFIED_MASK) !== 0;
  }

  public isNumeric(): boolean {
    return this.numeric;
  }

  public isProtected(): boolean {
    return this.protectedField;
  }

  public isModified(): boolean {
    return this.modified;
  }

  public skip(): boolean {
    return this.isProtected() && this.isNumeric();
  }

  public appendData(...data: number[]): void {
    this.data.push(...data);

    this.applyAttributes(this.data[0]);
  }

  public markAsModified(): void {
    this.modified = true;
    this.data[0] |= BFA_MODIFIED_MASK;
  }

  public markAsUnmodified(): void {
    this.modified = false;
    this.data[0] &= ~BFA_MODIFIED_MASK;
  }

  public updateData(data: number[], offset = 0): void {
    this.dataBackup = [...this.data];

    this.data.splice(offset, data.length, ...data);

    this.markAsModified();

    if (offset === 0) this.applyAttributes(this.data[0]);
  }

  public resetData(): void {
    this.data.splice(0, this.data.length, ...this.dataBackup);

    this.applyAttributes(this.data[0]);
    this.markAsUnmodified();
  }
}
