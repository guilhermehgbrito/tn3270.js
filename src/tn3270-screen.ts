import { TN3270Field } from './tn3270-field';
import {
  TerminalModel,
  TN3270ScreenOptions,
  TN3270Screen as ITN3270Screen,
  TerminalScreenSize,
  EncodedAddress,
  CodePageTranslator,
  Logger,
} from './types';

const TN3270_MODELS: Record<TerminalModel, TerminalScreenSize> = {
  '2': { rows: 24, columns: 80 },
  '3': { rows: 32, columns: 80 },
  '4': { rows: 43, columns: 80 },
  '5': { rows: 27, columns: 132 },
};

export class TN3270Screen implements ITN3270Screen {
  private logger: Logger;
  private fields: TN3270Field[] = [];
  private _bufferAddress = 0;
  private _cursorAddress = 0;
  readonly model: TerminalModel;
  readonly rows: number;
  readonly columns: number;
  public codePageTranslator: CodePageTranslator;

  constructor(options: TN3270ScreenOptions) {
    this.model = options.model;

    Object.assign(this, TN3270_MODELS[this.model]);

    this.codePageTranslator = options.codePageTranslator;
    this.logger = options.logger ?? console;
  }

  public get bufferAddress(): number {
    return this._bufferAddress;
  }

  public get cursorAddress(): number {
    return this._cursorAddress;
  }

  public get screenSize(): number {
    return this.rows * this.columns;
  }

  addField(field: TN3270Field): void {
    const lastField = this.fields[this.fields.length - 1];

    field.addressStart = this.bufferAddress;

    this.fields.push(field);

    this._bufferAddress = this.addToAddress(
      field.data.length,
      this.bufferAddress
    );

    field.addressEnd = this.bufferAddress;
  }

  addToAddress(amount: number, address: number): number {
    return (address + amount) % this.screenSize;
  }

  subtractFromAddress(amount: number, address: number): number {
    return (address - amount) % this.screenSize;
  }

  removeField(field: TN3270Field): void {
    this.fields = this.fields.filter((f) => f !== field);
  }

  getFields(): TN3270Field[] {
    return this.fields;
  }

  toString(): string {
    const screen = Buffer.alloc(this.screenSize);

    for (const field of this.fields) {
      const buffer = Buffer.from(field.data.slice(1));

      buffer.copy(screen, field.addressStart);
    }

    const rawString = this.codePageTranslator.fromEBCDIC([...screen]);

    const rows = rawString.match(new RegExp(`.{1,${this.columns}}`, 'g'));

    const { row, column } = this.addressToRowColumn(this.cursorAddress);

    rows[row] = rows[row]
      .split('')
      .map((c, i) => (i === column ? `\x1b[7;31m${c}\x1b[0m` : c))
      .join('');

    return rows.join('\n');
  }

  findField(address: number): TN3270Field {
    return this.fields.find(
      (f) => f.addressStart <= address && f.addressEnd >= address
    );
  }

  findText(text: string): TN3270Field {
    const ebcidicBytes = this.codePageTranslator.toEBCDIC(text);

    return this.fields.find((f) => {
      const fieldBytes = f.data.slice(1);

      return String.fromCharCode(...fieldBytes).includes(
        String.fromCharCode(...ebcidicBytes)
      );
    });
  }

  decodeAddress(data: EncodedAddress): number {
    const [byte1, byte2] = data;

    if ((byte1 & 0xc0) === 0) return ((byte1 & 0x3f) << 8) | byte2;

    return ((byte1 & 0x3f) << 6) | (byte2 & 0x3f);
  }

  encodeAddress(address: number): EncodedAddress {
    const byte1 = (address >> 6) & 0x3f;
    const byte2 = address & 0x3f;

    return [byte1, byte2];
  }

  addressToRowColumn(address: number): { row: number; column: number } {
    return {
      row: Math.floor(address / this.columns),
      column: address % this.columns,
    };
  }

  rowColumnToAddress(row: number, column: number): number {
    return row * this.columns + column;
  }

  setBufferAddress(address: number): void {
    this._bufferAddress = this.addToAddress(1, address);
  }

  setCursorAddress(address: number): void {
    this._cursorAddress = address;
  }

  calculateFieldOffset(field: TN3270Field, address: number): number {
    return address - field.addressStart;
  }

  writeString(text: string, row?: number, column?: number): void {
    if (row !== undefined && column !== undefined)
      this.setCursorAddress(this.rowColumnToAddress(row, column));

    const field = this.findField(this.cursorAddress);

    if (field) {
      const fieldOffset = this.calculateFieldOffset(field, this.cursorAddress);

      if (field.data.length - 1 - fieldOffset < text.length) {
        return;
      }

      this._cursorAddress = this.addToAddress(text.length, this.cursorAddress);

      const ebcidicBytes = this.codePageTranslator.toEBCDIC(text);

      field.updateData(ebcidicBytes, fieldOffset);
    }
  }

  eraseAll(): void {
    this.fields.splice(0, this.fields.length);
  }

  eraseAllUnprotected(): void {
    this.fields = this.fields.filter((f) => f.isProtected);
  }
}
