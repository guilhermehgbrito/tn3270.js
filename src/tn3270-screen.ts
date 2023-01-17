import { TN3270Orders } from './common/enums';
import { Logger } from './logger';
import { TN3270Field } from './tn3270-field';
import type {
  TerminalModel,
  TN3270ScreenOptions,
  TN3270Screen as ITN3270Screen,
  TerminalScreenSize,
  EncodedAddress,
  CodePageTranslator,
  Logger as ILogger,
} from './types';

const TN3270_MODELS: Record<TerminalModel, TerminalScreenSize> = {
  '2': { rows: 24, columns: 80 },
  '3': { rows: 32, columns: 80 },
  '4': { rows: 43, columns: 80 },
  '5': { rows: 27, columns: 132 },
};

const ADDRESS_CODE_TABLE = [
  0x40, 0xc1, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9, 0x4a, 0x4b, 0x4c,
  0x4d, 0x4e, 0x4f, 0x50, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9,
  0x5a, 0x5b, 0x5c, 0x5d, 0x5e, 0x5f, 0x60, 0x61, 0xe2, 0xe3, 0xe4, 0xe5, 0xe6,
  0xe7, 0xe8, 0xe9, 0x6a, 0x6b, 0x6c, 0x6d, 0x6e, 0x6f, 0xf0, 0xf1, 0xf2, 0xf3,
  0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0x7a, 0x7b, 0x7c, 0x7d, 0x7e, 0x7f,
];

export class TN3270Screen implements ITN3270Screen {
  private screenCount = 0;
  private logger: ILogger;
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
    this.logger = options.logger ?? new Logger(TN3270Screen.name);
  }

  public newScreen(): void {
    this.screenCount += 1;
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

  public stripUselessFields(): void {
    if (this.fields.length === 0) return;

    let lastField = this.fields[this.fields.length - 1];

    while (this.isUselessField(lastField)) lastField = this.fields.pop();
  }

  public distanceInBytes(addressStart: number, addressEnd: number): number {
    return addressStart > addressEnd
      ? this.screenSize - addressStart + addressEnd
      : addressEnd - addressStart;
  }

  public isUselessField(field: TN3270Field): boolean {
    return (
      field?.skip() &&
      (this.distanceInBytes(field.addressStart, field.addressEnd) === 1 ||
        field.data.length === 1)
    );
  }

  public addField(field: TN3270Field): void {
    const lastField = this.fields[this.fields.length - 1];

    lastField && (lastField.addressEnd = this.bufferAddress);

    if (this.isUselessField(lastField)) {
      this.removeField(lastField);
      this._bufferAddress = this.addToAddress(1, this.bufferAddress);
    }

    field.addressStart = this.bufferAddress;
    field.screen = this.screenCount;

    this.fields.push(field);

    this._bufferAddress = this.addToAddress(
      field.data.length,
      this.bufferAddress
    );

    field.addressEnd = this.bufferAddress;

    const missingFieldBytes =
      this.distanceInBytes(field.addressStart, field.addressEnd) -
      (field.data.length - 1);

    this.logger.debug(
      `Field ${field.addressStart} - ${field.addressEnd} is missing ${missingFieldBytes} bytes`
    );

    if (missingFieldBytes > 0) {
      field.appendData(...Array(missingFieldBytes).fill(0x00));
    }
  }

  public addToAddress(amount: number, address: number): number {
    return (address + amount) % this.screenSize;
  }

  public subtractFromAddress(amount: number, address: number): number {
    return (address - amount) % this.screenSize;
  }

  public removeField(field: TN3270Field): void {
    this.fields = this.fields.filter((f) => f !== field);
  }

  public getFields(): TN3270Field[] {
    return this.fields;
  }

  public toString(): string {
    const screen = Buffer.alloc(this.screenSize);

    this.stripUselessFields();

    for (const field of this.fields) {
      const buffer = Buffer.from(field.data.slice(1));

      for (let i = 0; i < buffer.length; i++) {
        screen[this.addToAddress(i, field.addressStart)] = buffer[i];
      }
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

  public findField(address: number): TN3270Field {
    return this.fields.find(
      (f) => f.addressStart <= address && f.addressEnd > address
    );
  }

  public findLastField(address: number): TN3270Field {
    return this.fields
      .slice()
      .reverse()
      .find((f) => f.addressStart <= address && f.addressEnd > address);
  }

  public findText(text: string): TN3270Field {
    const ebcidicBytes = this.codePageTranslator.toEBCDIC(text);

    return this.fields.find((f) => {
      const fieldBytes = f.data.slice(1);

      return String.fromCharCode(...fieldBytes).includes(
        String.fromCharCode(...ebcidicBytes)
      );
    });
  }

  public decodeAddress(data: EncodedAddress): number {
    const [byte1, byte2] = data;

    if ((byte1 & 0xc0) === 0) return ((byte1 & 0x3f) << 8) | byte2;

    return ((byte1 & 0x3f) << 6) | (byte2 & 0x3f);
  }

  public encodeAddress(address: number): EncodedAddress {
    const byte1 = (address >> 6) & 0x3f;
    const byte2 = address & 0x3f;

    return [ADDRESS_CODE_TABLE[byte1], ADDRESS_CODE_TABLE[byte2]];
  }

  public addressToRowColumn(address: number): { row: number; column: number } {
    return {
      row: Math.floor(address / this.columns),
      column: address % this.columns,
    };
  }

  public rowColumnToAddress(row: number, column: number): number {
    return row * this.columns + column - 1;
  }

  public setBufferAddress(address: number): void {
    this._bufferAddress = address % this.screenSize;
  }

  public setCursorAddress(address: number): void {
    this._cursorAddress = address % this.screenSize;
  }

  public calculateFieldOffset(field: TN3270Field, address: number): number {
    return address - field.addressStart;
  }

  public writeString(text: string, row?: number, column?: number): void {
    if (row !== undefined && column !== undefined)
      this.setCursorAddress(this.rowColumnToAddress(row, column));

    let field = this.findLastField(this.cursorAddress);

    while (field?.skip()) {
      this.setCursorAddress(field.addressEnd);
      field = this.findLastField(this.cursorAddress);
    }

    if (field) {
      if (field.isProtected()) {
        this.logger.warn('Cannot write to protected field');
        return;
      }

      const fieldOffset = this.calculateFieldOffset(field, this.cursorAddress);

      this.logger.debug(
        `Writing to field at ${field.addressStart} with offset ${fieldOffset}`
      );

      if (field.addressEnd - 1 - fieldOffset < text.length) {
        this.logger.warn('Not enough space in field to write to');
        return;
      }

      this._cursorAddress = this.addToAddress(text.length, this.cursorAddress);

      const ebcidicBytes = this.codePageTranslator.toEBCDIC(text);

      field.updateData(ebcidicBytes, fieldOffset);
    } else {
      this.logger.warn('No field found to write to');
    }
  }

  public getCurrentScreenFields(): TN3270Field[] {
    return this.fields.filter((f) => f.screen === this.screenCount);
  }

  public eraseAll(): void {
    this.fields.splice(0, this.fields.length);
  }

  public eraseAllUnprotected(): void {
    this.fields = this.fields.filter((f) => f.isProtected);
  }

  public readBuffer(): number[] {
    return this.getCurrentScreenFields().flatMap((f) => [
      TN3270Orders.SBA,
      ...this.encodeAddress(f.addressStart),
      TN3270Orders.SF,
      ...f.data,
    ]);
  }

  public readModified(): number[] {
    return this.getCurrentScreenFields()
      .filter((f) => f.isModified())
      .flatMap((f) => [
        TN3270Orders.SBA,
        ...this.encodeAddress(f.addressStart),
        ...f.data.slice(1),
      ]);
  }

  public readAllUnprotected(): number[] {
    return this.getCurrentScreenFields()
      .filter((f) => !f.isProtected())
      .flatMap((f) => [
        TN3270Orders.SBA,
        ...this.encodeAddress(f.addressStart),
        ...f.data.slice(1),
      ]);
  }

  public readAllModified(): number[] {
    return this.getCurrentScreenFields()
      .filter((f) => f.isModified())
      .flatMap((f) => [
        TN3270Orders.SBA,
        ...this.encodeAddress(f.addressStart),
        ...f.data.slice(1),
      ]);
  }

  public resetModified(): void {
    for (const field of this.fields.filter(
      (f) => !f.isProtected() && f.isModified()
    ))
      field.resetData();
  }

  public down(): this {
    this.setCursorAddress(this.addToAddress(this.columns, this.cursorAddress));

    return this;
  }

  public up(): this {
    this.setCursorAddress(this.addToAddress(-this.columns, this.cursorAddress));

    return this;
  }

  public left(): this {
    this.setCursorAddress(this.addToAddress(-1, this.cursorAddress));

    return this;
  }

  public right(): this {
    this.setCursorAddress(this.addToAddress(1, this.cursorAddress));

    return this;
  }
}
